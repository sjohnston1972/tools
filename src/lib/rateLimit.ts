// KV-backed rate limiter. Two layers:
//   1. Per-IP fixed window: N messages per W seconds.
//   2. Global daily token budget: total LLM tokens per UTC day.
// Both stored in the same KV namespace; keys are namespaced by prefix.

const witty = (seconds: number) => {
  const mins = Math.max(1, Math.ceil(seconds / 60));
  return `Somebody is battering the cr@p out of Steven's API credits — cooldown in effect for ${mins} minute${mins === 1 ? "" : "s"}. Try again shortly, or read about [Gladius](/tools/gladius) while you wait.`;
};

const wittyDaily = () =>
  `The chat has hit its daily token budget — Steven's wallet is wheezing. Come back tomorrow, or browse the four tools above in the meantime.`;

export type RateCheck =
  | { ok: true }
  | { ok: false; status: 429; message: string; retryAfterSeconds: number };

export async function checkPerIp(
  kv: KVNamespace,
  ip: string,
  limit: number,
  windowSeconds: number,
): Promise<RateCheck> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const key = `ip:${ip}:${bucket}`;
  const raw = await kv.get(key);
  const used = raw ? parseInt(raw, 10) : 0;
  if (used >= limit) {
    const resetAt = (bucket + 1) * windowSeconds;
    const retry = Math.max(1, resetAt - now);
    return {
      ok: false,
      status: 429,
      message: witty(retry),
      retryAfterSeconds: retry,
    };
  }
  // Best-effort increment. KV is eventually consistent — under burst load a
  // user might briefly exceed the limit. Acceptable for this use case.
  await kv.put(key, String(used + 1), {
    expirationTtl: windowSeconds + 60,
  });
  return { ok: true };
}

export async function checkDailyBudget(
  kv: KVNamespace,
  budgetTokens: number,
): Promise<RateCheck> {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const key = `budget:${day}`;
  const raw = await kv.get(key);
  const used = raw ? parseInt(raw, 10) : 0;
  if (used >= budgetTokens) {
    const now = Math.floor(Date.now() / 1000);
    const tomorrow = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate() + 1,
    ) / 1000;
    const retry = Math.max(60, Math.floor(tomorrow - now));
    return {
      ok: false,
      status: 429,
      message: wittyDaily(),
      retryAfterSeconds: retry,
    };
  }
  return { ok: true };
}

export async function recordTokenUsage(
  kv: KVNamespace,
  tokens: number,
): Promise<void> {
  if (tokens <= 0) return;
  const day = new Date().toISOString().slice(0, 10);
  const key = `budget:${day}`;
  const raw = await kv.get(key);
  const used = raw ? parseInt(raw, 10) : 0;
  await kv.put(key, String(used + tokens), {
    // Expire two days later — gives us a grace window for late writes.
    expirationTtl: 60 * 60 * 24 * 2,
  });
}
