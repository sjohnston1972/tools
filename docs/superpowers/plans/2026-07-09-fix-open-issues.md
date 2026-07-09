# Fix All 13 Open GitHub Issues — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 13 open issues: honest + bounded + pseudonymized chat logging, correct widget error handling, reproducible local dev (D1 schema + docs), README accuracy, and a CI safety net (typecheck, build, vitest unit tests).

**Architecture:** Extract pure chat-log helpers into `src/lib/chatLog.ts` (transcript append/trim, IP pseudonymization, retention cutoff) so they're unit-testable; `logChat` in `src/pages/api/chat.ts` becomes a read-modify-write against D1 using those helpers. Widget errors route to the existing error banner instead of the message list. Docs/schema/CI are additive files.

**Tech Stack:** Astro 5 + @astrojs/cloudflare, React 18, Cloudflare Workers (KV/D1/R2), vitest, @astrojs/check, GitHub Actions.

## Global Constraints

- The production `chat-logs` D1 DB is **shared across the owner's sites** — never add a wrangler `migrations/` directory; schema file is local-only with a loud header warning.
- Retention deletes must be scoped to `site = <this hostname>`.
- No deploy step in CI; deploys stay manual.
- Transcript cap: last **100** messages. Retention window: **90** days. IP hash: SHA-256(salt + ip) truncated to **16 hex chars**; salt from `LOG_SALT` secret with a static fallback.
- Keep `cta` sticky-flag behavior intact.
- Issue mapping: T1→#9, T2→#7+#8 (closes #1 with T4), T3→#2, T4→#6, T5→#3, T6→#10+#4, T7→#13, T8→#11, T9→#12 (closes #5).

---

### Task 1: D1 schema file for chat_logs

**Files:**
- Create: `schema/chat_logs.sql`

**Interfaces:**
- Produces: table `chat_logs(site, ip, created_at, updated_at, request_count, transcript)` with `UNIQUE(site, ip)` — required by `ON CONFLICT(site, ip)` in chat.ts.

- [ ] **Step 1: Write the schema file**

```sql
-- LOCAL DEVELOPMENT ONLY.
-- The production `chat-logs` D1 database is SHARED across several of the
-- owner's sites and already has this table. Never run this (or any migration)
-- against the remote database. Apply locally with:
--   npx wrangler d1 execute chat-logs --local --file schema/chat_logs.sql
CREATE TABLE IF NOT EXISTS chat_logs (
  site          TEXT    NOT NULL,
  ip            TEXT    NOT NULL,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  transcript    TEXT    NOT NULL,
  UNIQUE(site, ip)
);
```

- [ ] **Step 2: Verify it applies locally and seed runs**

Run: `npx wrangler d1 execute chat-logs --local --file schema/chat_logs.sql` then `npx wrangler d1 execute chat-logs --local --file seed-chatlogs.sql` then `npx wrangler d1 execute chat-logs --local --command "SELECT site, ip, request_count FROM chat_logs"`.
Expected: schema + seed succeed; SELECT returns 5 rows.

- [ ] **Step 3: Commit**

`git commit -m "feat: add local-only chat_logs D1 schema (fixes #9)"`

### Task 2: Bounded, pseudonymized, retained chat logging

**Files:**
- Create: `src/lib/chatLog.ts`, `tests/chatLog.test.ts`
- Modify: `src/pages/api/chat.ts` (logChat + call site), `src/env.d.ts` (LOG_SALT), `wrangler_instructions.txt` (sample helper), `package.json` (vitest + test script)

**Interfaces:**
- Produces: `appendTurn(raw: string | null, userMessage: string, reply: string, cta?: boolean, maxMessages?: number): { messages: {role:string;content:string}[]; cta: boolean }`; `pseudonymizeIp(ip: string, salt?: string): Promise<string>`; `retentionCutoff(now: Date, days?: number): string`; constants `MAX_LOGGED_MESSAGES = 100`, `RETENTION_DAYS = 90`.

- [ ] **Step 1: Install vitest, add `"test": "vitest run"` script**
- [ ] **Step 2: Write failing tests** covering: append to empty/null transcript; append preserves prior messages; trim to last N; corrupted JSON starts fresh; cta sticky (prev true stays true; new true sets true); pseudonymizeIp returns 16 lowercase hex chars, deterministic for same salt+ip, different for different salt or ip; retentionCutoff returns ISO string exactly N days before `now`.
- [ ] **Step 3: Run tests, confirm fail** (`npm test`)
- [ ] **Step 4: Implement `src/lib/chatLog.ts`**

```ts
export const MAX_LOGGED_MESSAGES = 100;
export const RETENTION_DAYS = 90;
const DEFAULT_LOG_SALT = "tools-clydeford-chatlog";

export type LoggedMsg = { role: string; content: string };
export type Transcript = { messages: LoggedMsg[]; cta: boolean };

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
      // corrupted row: start fresh rather than fail the log write
    }
  }
  const messages = [
    ...prev.messages,
    { role: "user", content: userMessage },
    { role: "assistant", content: reply },
  ].slice(-maxMessages);
  return { messages, cta: prev.cta || cta };
}

export async function pseudonymizeIp(ip: string, salt?: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt || DEFAULT_LOG_SALT}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export function retentionCutoff(now: Date, days = RETENTION_DAYS): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}
```

- [ ] **Step 5: Rewrite `logChat` in chat.ts** as read-modify-write (SELECT transcript → appendTurn → INSERT ON CONFLICT with `excluded.transcript`), pseudonymize the ip at the call site, and add an opportunistic 1-in-50 `DELETE FROM chat_logs WHERE site = ?1 AND updated_at < cutoff`. Add `LOG_SALT?: string` to Env.
- [ ] **Step 6: Tests green, build green** (`npm test`, `npm run build`)
- [ ] **Step 7: Update `wrangler_instructions.txt`** sample helper to the new implementation.
- [ ] **Step 8: Local verify** — schema applied, `npm run preview`, chat once, `SELECT ip, json_array_length(transcript,'$.messages') FROM chat_logs` shows hashed ip; loop >100 turns via script and confirm cap. (Requires DEEPSEEK_API_KEY; if absent, verify via unit tests + a direct local D1 exercise of the SQL.)
- [ ] **Step 9: Commit** — `git commit -m "feat: cap transcripts, pseudonymize IPs, add retention to chat logging (fixes #7, fixes #8)"`

### Task 3: ChatWidget error handling

**Files:**
- Modify: `src/components/ChatWidget.tsx:82-89` and the `finally` block of `send()`

- [ ] **Step 1: On `!res.ok`, setError instead of appending an assistant message**

```ts
if (!res.ok) {
  const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
  setError(body.message ?? `Error: HTTP ${res.status}`);
  return;
}
```

- [ ] **Step 2: In `finally`, drop a trailing zero-token assistant bubble**

```ts
setMessages((m) => {
  const last = m[m.length - 1];
  return last && last.role === "assistant" && last.content === ""
    ? m.slice(0, -1)
    : m;
});
```

- [ ] **Step 3: Build green; manual check** (429 shows in banner, not as bubble; not in localStorage; not in next POST body)
- [ ] **Step 4: Commit** — `git commit -m "fix: show chat API errors in the banner, never as assistant messages (fixes #2)"`

### Task 4: Honest logging copy (widget + README chat section)

**Files:**
- Modify: `src/components/ChatWidget.tsx:212-215`, `README.md:68-76`

- [ ] **Step 1: Widget empty-state text** → "Powered by DeepSeek. Strictly on topic: Steven and his eight tools. Chats may be logged server-side (pseudonymously) to improve the site."
- [ ] **Step 2: README** — replace the "Conversations are anonymous..." paragraph with an accurate description: turns appended to a shared `chat_logs` D1 table via `ctx.waitUntil`, keyed by site + salted-hashed IP, capped at 100 messages, ~90-day retention; browser keeps last 30 turns in localStorage.
- [ ] **Step 3: Build green; commit** — `git commit -m "docs: truthfully disclose server-side chat logging (fixes #6, fixes #1)"`

### Task 5: README drift + gallery cap constant

**Files:**
- Modify: `README.md` (screenshots section, route table, layout tree), `src/components/ScreenshotGallery.tsx` (single `MAX_SHOTS_PER_TOOL = 20` client constant replacing three literal 20s)

- [ ] **Step 1: ScreenshotGallery constant** — `const MAX_SHOTS_PER_TOOL = 20; // keep in sync with src/lib/admin.ts` used at lines 74-76, 258, 276.
- [ ] **Step 2: README screenshots/admin section** — 20 per tool; admin-only management strip (drag-to-reorder, first = hero, paste-to-upload); public display via HeroPreview + TileThumb.
- [ ] **Step 3: Route table** — all 7 routes: `/api/chat`, `/api/screenshots`, `/api/img/<slug>/<file>`, `/api/admin/auth`, `/api/admin/upload`, `/api/admin/delete`, `/api/admin/reorder`.
- [ ] **Step 4: Layout tree** — match actual `src/` (AdminBar/HeroPreview/ScreenshotGallery/TileThumb, adminClient/admin/chatLog libs, api subtree, schema/, seed-chatlogs.sql, wrangler_instructions.txt; wrangler.jsonc described with KV+D1+R2).
- [ ] **Step 5: Fix GitHub repo description** via `gh repo edit --description "..."` (eight tools, no Kopis).
- [ ] **Step 6: Build green; commit** — `git commit -m "docs: sync README with code; single client cap constant (fixes #3)"`

### Task 6: Complete local-dev + deployment docs

**Files:**
- Modify: `README.md` Local development + Deployment sections

- [ ] **Step 1: Local dev** — `.dev.vars` example with `DEEPSEEK_API_KEY` and `ADMIN_PIN` (and optional `LOG_SALT`); D1 init commands with do-not-run-remotely warning; note KV/R2/D1 local emulations start empty.
- [ ] **Step 2: Deployment** — one-time provisioning: KV namespace, R2 bucket (`npx wrangler r2 bucket create tools-clydeford-screenshots`), shared D1 note, secrets `DEEPSEEK_API_KEY`, `ADMIN_PIN`, `LOG_SALT`.
- [ ] **Step 3: Commit** — `git commit -m "docs: complete local dev and deployment setup (fixes #10, fixes #4)"`

### Task 7: Vitest unit tests for rateLimit.ts and admin.ts

**Files:**
- Create: `tests/fakes.ts` (in-memory KVNamespace + R2Bucket fakes), `tests/rateLimit.test.ts`, `tests/admin.test.ts`

- [ ] **Step 1: Fakes** — KV `get/put` with TTL bookkeeping against `Date.now()`; R2 `list({prefix})` → `{objects:[{key}]}`.
- [ ] **Step 2: rateLimit tests** — under-limit passes and increments; at-limit → `ok:false, status:429, retryAfterSeconds > 0`; window rollover via `vi.setSystemTime` resets; `checkDailyBudget` blocks at budget with retry-until-UTC-midnight; `recordTokenUsage` accumulates and ignores `tokens <= 0`.
- [ ] **Step 3: admin tests** — correct PIN ok; trailing-newline secret still matches; wrong PIN → 401 and increments counter; 10th+ attempt → 429 even with correct PIN; missing ADMIN_PIN → 500; `isValidSlug` accepts the eight slugs (gladius, shellmate, cisco-api-navigator, parity, archie, cloudforge, dockermate, webex-migrate) and rejects others; `setOrder` drops non-R2/dup/`/`-containing names; `listShots` ranks manifest first, appends unranked chronologically.
- [ ] **Step 4: `npm test` green; commit** — `git commit -m "test: vitest unit tests for rateLimit and admin with KV/R2 fakes (fixes #13)"`

### Task 8: astro check typecheck script

**Files:**
- Modify: `package.json` (add `@astrojs/check` + `typescript` dev deps, `"check": "astro check"`), plus any files it flags (expect `src/env.d.ts` / tsconfig `types` issues — `@cloudflare/workers-types` is referenced in tsconfig but not a direct dep; add it if missing).

- [ ] **Step 1: Install deps, add script, run `npx astro sync` then `npm run check`**
- [ ] **Step 2: Fix every surfaced error** (no blanket `@ts-ignore`/`any`)
- [ ] **Step 3: `npm run check` exits 0; `npm run build` green; commit** — `git commit -m "feat: add astro check typecheck script and fix type errors (fixes #11)"`

### Task 9: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Workflow**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: Verify locally that build needs no secrets** (build in a shell without DEEPSEEK_API_KEY/ADMIN_PIN)
- [ ] **Step 3: Commit** — `git commit -m "ci: typecheck, tests, and build on push/PR (fixes #12, fixes #5)"`

### Final: push, verify CI passes, confirm issues auto-closed.
