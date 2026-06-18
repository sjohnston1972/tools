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

  // Append this turn to the shared chat-logs D1 database in the background,
  // once the full reply has streamed. The helper appends to the stored
  // transcript, so pass only the latest user message. Never blocks the response.
  if (env.DB) {
    const site = new URL(request.url).hostname;
    const userMessage = cleaned[cleaned.length - 1].content;
    ctx.waitUntil(
      result.fullText.then((reply) =>
        logChat(env, site, ip, userMessage, reply).catch((e) =>
          console.error("chat_log_error", String(e)),
        ),
      ),
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
 * (site, ip): `site` is the request hostname, so no per-site config is needed.
 *
 * IMPORTANT: pass ONLY the latest turn (the user's message + the assistant's
 * reply). The helper APPENDS them to whatever is already stored, so the full
 * conversation history accumulates server-side regardless of what the app
 * keeps in memory.
 */
async function logChat(
  env: Env,
  site: string,
  ip: string,
  userMessage: string,
  reply: string,
  cta = false,
): Promise<void> {
  const now = new Date().toISOString();
  const userMsg = JSON.stringify({ role: "user", content: userMessage });
  const botMsg = JSON.stringify({ role: "assistant", content: reply });
  const initial = JSON.stringify({
    messages: [
      { role: "user", content: userMessage },
      { role: "assistant", content: reply },
    ],
    cta,
  });

  await env.DB.prepare(
    `INSERT INTO chat_logs (site, ip, created_at, updated_at, request_count, transcript)
     VALUES (?1, ?2, ?3, ?3, 1, ?4)
     ON CONFLICT(site, ip) DO UPDATE SET
       updated_at    = ?3,
       request_count = request_count + 1,
       transcript    = json_set(
                         json_insert(
                           json_insert(transcript, '$.messages[#]', json(?5)),
                           '$.messages[#]', json(?6)
                         ),
                         -- keep CTA "sticky": once it fires for a visitor it stays true
                         '$.cta', json(CASE WHEN json_extract(transcript, '$.cta') = 1 THEN 'true' ELSE ?7 END)
                       )`,
  )
    .bind(site, ip, now, initial, userMsg, botMsg, cta ? "true" : "false")
    .run();
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}
