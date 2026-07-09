// Pure helpers for the shared `chat-logs` D1 database. Kept free of D1/Env
// so they can be unit-tested; src/pages/api/chat.ts wires them to the DB.

export const MAX_LOGGED_MESSAGES = 100;
export const RETENTION_DAYS = 90;
// Used when the LOG_SALT secret is unset: rows are still pseudonymized, just
// with a salt an attacker with repo access could reproduce.
const DEFAULT_LOG_SALT = "tools-clydeford-chatlog";

export type LoggedMsg = { role: string; content: string };
export type Transcript = { messages: LoggedMsg[]; cta: boolean };

// Append one turn (user message + assistant reply) to a stored transcript,
// keeping only the most recent `maxMessages` entries so a row can never grow
// past D1's ~2 MB string limit. `cta` is sticky: once true it stays true.
export function appendTurn(
  raw: string | null,
  userMessage: string,
  reply: string,
  cta = false,
  maxMessages = MAX_LOGGED_MESSAGES,
): Transcript {
  let prev: Transcript = { messages: [], cta: false };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.messages)) {
        prev = { messages: parsed.messages, cta: parsed.cta === true };
      }
    } catch {
      // Corrupted row: start fresh rather than fail every future log write.
    }
  }
  const messages = [
    ...prev.messages,
    { role: "user", content: userMessage },
    { role: "assistant", content: reply },
  ].slice(-maxMessages);
  return { messages, cta: prev.cta || cta };
}

// Salted hash of the visitor IP, truncated to 16 hex chars. The row key only
// needs to group turns from the same visitor — it never needs reversing.
export async function pseudonymizeIp(ip: string, salt?: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt || DEFAULT_LOG_SALT}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

// ISO-8601 timestamp `days` before `now`; updated_at is ISO too, so rows older
// than the cutoff compare lexicographically smaller.
export function retentionCutoff(now: Date, days = RETENTION_DAYS): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}
