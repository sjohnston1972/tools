// Server-side admin gate for screenshot management. The PIN is never trusted
// from the client alone: every upload/delete validates it here against the
// ADMIN_PIN secret, with KV-backed brute-force protection.

import { TOOLS } from "../data/tools";

const VALID_SLUGS = new Set(TOOLS.map((t) => t.slug));

export const MAX_SHOTS_PER_TOOL = 20;
export const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
export const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const ATTEMPT_LIMIT = 10; // PIN attempts ...
const ATTEMPT_WINDOW = 600; // ... per 10 minutes per IP

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && VALID_SLUGS.has(slug as never);
}

// Constant-time string comparison to avoid leaking the PIN via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export type PinResult =
  | { ok: true }
  | { ok: false; status: 401 | 429 | 500; message: string };

// Validate a PIN attempt. Rate-limits per IP through RATE_KV when available.
export async function checkAdminPin(
  env: Env,
  pin: unknown,
  ip: string,
): Promise<PinResult> {
  if (!env.ADMIN_PIN) {
    return { ok: false, status: 500, message: "Admin mode is not configured." };
  }

  if (env.RATE_KV) {
    const key = `pin_attempts:${ip}`;
    const current = parseInt((await env.RATE_KV.get(key)) || "0", 10);
    if (current >= ATTEMPT_LIMIT) {
      return {
        ok: false,
        status: 429,
        message: "Too many attempts. Try again later.",
      };
    }
  }

  // Trim both sides: secrets set via shell pipes can pick up a trailing
  // newline, and whitespace is meaningless in a PIN.
  if (typeof pin !== "string" || !timingSafeEqual(pin.trim(), env.ADMIN_PIN.trim())) {
    // Count the failed attempt.
    if (env.RATE_KV) {
      const key = `pin_attempts:${ip}`;
      const current = parseInt((await env.RATE_KV.get(key)) || "0", 10);
      await env.RATE_KV.put(key, String(current + 1), {
        expirationTtl: ATTEMPT_WINDOW,
      });
    }
    return { ok: false, status: 401, message: "Incorrect PIN." };
  }

  return { ok: true };
}

export function clientIp(request: Request, fallback?: string): string {
  return request.headers.get("cf-connecting-ip") || fallback || "unknown";
}

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

// Read the admin-defined display order for a tool: an array of filenames stored
// in KV under `order:<slug>`. Returns [] when unset or unavailable so callers
// fall back to chronological order.
export async function getOrder(env: Env, slug: string): Promise<string[]> {
  if (!env.RATE_KV) return [];
  try {
    const raw = await env.RATE_KV.get(`order:${slug}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === "string") : [];
  } catch {
    return [];
  }
}

// Persist the admin-defined display order. The submitted order is intersected
// with the files actually present in R2 (dropping stale/unknown entries and
// deduping) so the manifest never drifts from real storage.
export async function setOrder(
  env: Env,
  slug: string,
  order: string[],
): Promise<void> {
  if (!env.RATE_KV) return;
  const listed = await env.SCREENSHOTS.list({ prefix: `${slug}/` });
  const existing = new Set(
    listed.objects.map((o) => o.key.slice(slug.length + 1)).filter(Boolean),
  );
  const seen = new Set<string>();
  const clean = order.filter(
    (f) => typeof f === "string" && !f.includes("/") && existing.has(f) && !seen.has(f) && seen.add(f),
  );
  await env.RATE_KV.put(`order:${slug}`, JSON.stringify(clean));
}

// List object keys for a tool. Keys are timestamp-prefixed, so the raw sort is
// chronological; the KV order manifest (if any) then takes precedence: files
// named in the manifest come first in manifest order, and any not yet in it
// (e.g. fresh uploads) are appended after in chronological order. Returns the
// public serving URLs.
export async function listShots(
  env: Env,
  slug: string,
): Promise<{ file: string; url: string }[]> {
  const listed = await env.SCREENSHOTS.list({ prefix: `${slug}/` });
  const files = listed.objects
    .map((o) => o.key.slice(slug.length + 1))
    .filter(Boolean)
    .sort();

  const order = await getOrder(env, slug);
  if (order.length) {
    const rank = new Map(order.map((f, i) => [f, i]));
    files.sort((a, b) => {
      const ra = rank.has(a) ? rank.get(a)! : Infinity;
      const rb = rank.has(b) ? rank.get(b)! : Infinity;
      // Both unranked: keep chronological (already sorted, so stable tie).
      return ra === rb ? 0 : ra - rb;
    });
  }

  return files.map((file) => ({ file, url: `/api/img/${slug}/${file}` }));
}
