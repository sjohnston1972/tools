import type { APIRoute } from "astro";
import { buildSystemPrompt } from "../../lib/systemPrompt";
import { streamDeepseek, type ChatMsg } from "../../lib/deepseek";
import {
  checkPerIp,
  checkDailyBudget,
  recordTokenUsage,
} from "../../lib/rateLimit";
import { appendTurn, pseudonymizeIp, retentionCutoff } from "../../lib/chatLog";

export const prerender = false;

const ALLOWED_ROLES = new Set(["user", "assistant"]);
const MAX_USER_MSG_CHARS = 1500;
const MAX_HISTORY = 16;

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = locals.runtime.env;

  // Body validation
  let body: { messages?: ChatMsg[] };
  try {
    body = await request.json();
  } catch {
    return json({ message: "Invalid JSON body" }, 400);
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const cleaned: ChatMsg[] = [];
  for (const m of incoming.slice(-MAX_HISTORY)) {
    if (!m || typeof m !== "object") continue;
    if (!ALLOWED_ROLES.has(m.role)) continue;
    if (typeof m.content !== "string") continue;
    cleaned.push({ role: m.role, content: m.content.slice(0, MAX_USER_MSG_CHARS) });
  }
  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== "user") {
    return json({ message: "Last message must be from the user" }, 400);
  }

  // Rate limits
  const ip =
    request.headers.get("cf-connecting-ip") ||
    clientAddress ||
    "unknown";
  const limit = parseInt(env.RATE_LIMIT_PER_WINDOW || "15", 10);
  const window = parseInt(env.RATE_LIMIT_WINDOW_SECONDS || "600", 10);
  const dailyBudget = parseInt(env.DAILY_TOKEN_BUDGET || "300000", 10);

  if (env.RATE_KV) {
    const ipCheck = await checkPerIp(env.RATE_KV, ip, limit, window);
    if (!ipCheck.ok) {
      return json(
        { message: ipCheck.message },
        ipCheck.status,
        { "Retry-After": String(ipCheck.retryAfterSeconds) },
      );
    }
    const budgetCheck = await checkDailyBudget(env.RATE_KV, dailyBudget);
    if (!budgetCheck.ok) {
      return json(
        { message: budgetCheck.message },
        budgetCheck.status,
        { "Retry-After": String(budgetCheck.retryAfterSeconds) },
      );
    }
  }

  if (!env.DEEPSEEK_API_KEY) {
    return json({ message: "Chat is not configured (missing API key)." }, 500);
  }

  // Compose
  const system: ChatMsg = { role: "system", content: buildSystemPrompt() };
  const messages: ChatMsg[] = [system, ...cleaned];

  let result;
  try {
    result = await streamDeepseek(env.DEEPSEEK_API_KEY, messages);
  } catch (err) {
    return json(
      { message: `Chat upstream failed: ${(err as Error).message}` },
      502,
    );
  }

  // Record token usage in the background after the stream finishes
  const ctx = locals.runtime.ctx;
  ctx.waitUntil(
    result.totalTokens.then((tokens) => {
      if (env.RATE_KV && tokens > 0) {
        return recordTokenUsage(env.RATE_KV, tokens);
      }
    }),
  );

  // Append this turn to the shared chat-logs D1 database in the background,
  // once the full reply has streamed. The row is keyed by a salted hash of the
  // visitor IP, never the raw address. Never blocks the response.
  if (env.DB) {
    const site = new URL(request.url).hostname;
    const userMessage = cleaned[cleaned.length - 1].content;
    ctx.waitUntil(
      result.fullText
        .then(async (reply) => {
          const ipKey = await pseudonymizeIp(ip, env.LOG_SALT);
          await logChat(env, site, ipKey, userMessage, reply);
        })
        .catch((e) => console.error("chat_log_error", String(e))),
    );
  }

  return new Response(result.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
};

/**
 * Append this turn to the shared `chat-logs` D1 database. One row per
 * (site, ipKey), where `ipKey` is a salted hash of the visitor IP — raw
 * addresses are never stored. Pass ONLY the latest turn; the stored transcript
 * is trimmed to the last MAX_LOGGED_MESSAGES entries so a row can never grow
 * unbounded. A read-modify-write race between two concurrent turns from the
 * same visitor is acceptable for this site.
 */
async function logChat(
  env: Env,
  site: string,
  ipKey: string,
  userMessage: string,
  reply: string,
  cta = false,
): Promise<void> {
  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    `SELECT transcript FROM chat_logs WHERE site = ?1 AND ip = ?2`,
  )
    .bind(site, ipKey)
    .first<{ transcript: string }>();
  const transcript = JSON.stringify(
    appendTurn(row?.transcript ?? null, userMessage, reply, cta),
  );

  await env.DB.prepare(
    `INSERT INTO chat_logs (site, ip, created_at, updated_at, request_count, transcript)
     VALUES (?1, ?2, ?3, ?3, 1, ?4)
     ON CONFLICT(site, ip) DO UPDATE SET
       updated_at    = ?3,
       request_count = request_count + 1,
       transcript    = excluded.transcript`,
  )
    .bind(site, ipKey, now, transcript)
    .run();

  // Opportunistic retention sweep (~1 in 50 turns): the shared DB has no TTL,
  // so normal traffic prunes this site's rows past the retention window.
  if (Math.random() < 0.02) {
    await env.DB.prepare(
      `DELETE FROM chat_logs WHERE site = ?1 AND updated_at < ?2`,
    )
      .bind(site, retentionCutoff(new Date()))
      .run();
  }
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}
