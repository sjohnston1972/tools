// Server-side admin gate for screenshot management. The PIN is never trusted
// from the client alone: every upload/delete validates it here against the
// ADMIN_PIN secret, with KV-backed brute-force protection.

import { TOOLS } from "../data/tools";

const VALID_SLUGS = new Set(TOOLS.map((t) => t.slug));

export const MAX_SHOTS_PER_TOOL = 10;
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

// List object keys for a tool, sorted (keys are timestamp-prefixed so this is
// chronological). Returns the public serving URLs.
export async function listShots(
  env: Env,
  slug: string,
): Promise<{ file: string; url: string }[]> {
  const listed = await env.SCREENSHOTS.list({ prefix: `${slug}/` });
  return listed.objects
    .map((o) => o.key.slice(slug.length + 1))
    .filter(Boolean)
    .sort()
    .map((file) => ({ file, url: `/api/img/${slug}/${file}` }));
}
