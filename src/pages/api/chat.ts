import type { APIRoute } from "astro";
import { buildSystemPrompt } from "../../lib/systemPrompt";
import { streamDeepseek, type ChatMsg } from "../../lib/deepseek";
import {
  checkPerIp,
  checkDailyBudget,
  recordTokenUsage,
} from "../../lib/rateLimit";

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

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}
