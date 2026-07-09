# tools.clydeford.net

A small public showcase of eight AI-built tools by [Steven Johnston](https://clydeford.net), with a chat widget that answers questions about the tools and the man behind them.

> Live: **https://tools.clydeford.net**

## What's on the site

| Tool | What it is |
|---|---|
| **GLADIUS** | AI-powered Cisco network security auditor — Claude + a custom MCP server that SSHes into devices, cross-references findings against NIST 800-53 and CIS, queries live CVEs, and generates compliance reports. Plus a gated PenTest agent. |
| **SHELLMATE** | Split-screen, multi-tab SSH/serial web terminal with an AI copilot that sees your live session. Multi-backend (Claude / OpenAI / DeepSeek / xAI Grok / Ollama), suggest-and-approve commands. |
| **CISCO API NAVIGATOR** | A streaming chat UI for Cisco's hosted DevNet Content Search MCP server, running entirely on Cloudflare Workers + Workers AI. One weekend's work, one Worker. |
| **PARITY** | Network digital twin. Snapshots whole-network state via pyATS, runs tiered AI agents over it (Ollama → Haiku → Sonnet → Opus on escalation), proposes fixes, executes only after a human approves them, then verifies closed-loop. |
| **ARCHIE** | AI network design studio. Designer/critic agent loops produce cited designs from a customer brief (or a whiteboard photo); a build agent emits Containerlab / GNS3 / draw.io artifacts. |
| **CLOUDFORGE** | Chat-to-Azure IaC. Claude draws the topology on a React Flow canvas, writes the Bicep, pushes it via custom deploy/destroy MCP tools, and tears it down on a cron. |
| **DOCKERMATE** | Self-hosted Docker dashboard + chatbot with full container control. Registry-digest update pulses, compose-aware upgrades. |
| **WEBEX MIGRATE** | CUCM → Webex Calling migration: pull over AXL or BAT/Unity CSVs, dry-run, push in dependency order, exact-reverse rollback. 100% Cloudflare (Workers, D1, R2, Queues). |

Repo links are intentionally not published yet — each detail page shows a "GitHub — coming soon" placeholder.

## Screenshots & admin mode

Screenshots are uploaded through the browser and stored in Cloudflare R2 (the
`SCREENSHOTS` bucket binding, `tools-clydeford-screenshots`). **Visitors** see
them in two places: the hero panel on each tool's detail page (`HeroPreview`,
which shows the first-ordered screenshot and falls back to the stylised mock
when a tool has none) and the homepage tool tiles (`TileThumb`). There is no
public thumbnail strip.

**Admin mode** is the gated management UI:

- A discreet **Admin** button sits bottom-left on every page. Click it, enter the
  PIN, and admin mode persists for the browser session (PIN held in
  `sessionStorage` only). Click **Admin · exit** to leave.
- In admin mode each detail page gains a **Screenshots** management strip
  (`ScreenshotGallery` — it renders nothing for non-admins): an "Add or paste"
  tile (click, or Ctrl/⌘V an image from the clipboard), a delete (✕) on each
  thumbnail, a click-to-enlarge lightbox, and **drag-to-reorder** — the first
  screenshot is the hero image shown to visitors. Order is persisted as a KV
  manifest via `/api/admin/reorder`. Up to 20 per tool; PNG / JPEG / WebP /
  GIF / AVIF, 6 MB max.
- The PIN is the `ADMIN_PIN` Worker secret. It is **re-validated server-side on
  every upload, delete, and reorder** — the browser-side admin flag is only UX,
  not security. PIN attempts are rate-limited per IP via `RATE_KV`.

Set or change the PIN:

```bash
npx wrangler secret put ADMIN_PIN
```

API routes (all in `src/pages/api/`):

| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | streaming DeepSeek chat endpoint (SSE) |
| `/api/screenshots?slug=<slug>` | GET | public list of a tool's screenshots |
| `/api/img/<slug>/<file>` | GET | stream an image from R2 |
| `/api/admin/auth` | POST | validate a PIN (UX only) |
| `/api/admin/upload` | POST | upload (multipart; `x-admin-pin` header) |
| `/api/admin/delete` | POST | delete (`x-admin-pin` header) |
| `/api/admin/reorder` | POST | save screenshot display order (index 0 = hero) |

## Stack

| Layer | Tech |
| --- | --- |
| Runtime | Cloudflare Workers (Astro 5 server output via `@astrojs/cloudflare`) |
| Frontend | Astro + a single React island for the chat widget |
| Styling | Tailwind CSS, hand-rolled brutalist tokens (Space Grotesk, hard 2px borders, hard `8px 8px 0` shadows) |
| Chat backend | DeepSeek `deepseek-chat`, streamed via SSE — a single system prompt seeded with the bio + the eight tool descriptions |
| Rate limiting | Cloudflare KV — per-IP token bucket + global daily token cap |
| Hosting | `tools.clydeford.net` custom domain on Cloudflare |

## How the chat is grounded

The bot is not a general-purpose assistant. The system prompt (see `src/lib/systemPrompt.ts`) makes it strictly on-topic — Steven, his career, and the eight tools. Anything else gets a one-sentence deflection. There is no RAG; the bio (`src/data/bio.ts`) and the eight tool descriptions (`src/data/tools.ts`) are stuffed into the system prompt at request time.

If someone hammers the chat:
- **Per-IP**: 15 messages per 10 minutes, then a witty cooldown ("somebody is battering the cr@p out of Steven's API credits…").
- **Global**: 300,000 DeepSeek tokens per UTC day, then everyone gets a cooldown until midnight UTC.

Conversations **are** logged server-side: after each reply streams, the Worker appends the turn (user message + assistant reply) to a `chat_logs` table in a shared Cloudflare D1 database (`DB` binding) via `ctx.waitUntil`, so logging never blocks the response. Rows are keyed by site + a salted SHA-256 hash of the visitor IP (truncated to 16 hex chars — the raw address is never stored; salt is the optional `LOG_SALT` secret). Each row's transcript is capped at the last 100 messages, and rows older than ~90 days are pruned opportunistically by normal traffic. The browser separately keeps the last 30 turns in `localStorage`.

## Project layout

```
.
├── astro.config.mjs       # Astro 5 + Cloudflare adapter + React + Tailwind
├── wrangler.jsonc         # Worker config + custom domain + KV / D1 / R2 bindings
├── tailwind.config.mjs    # brutalist design tokens
├── schema/
│   └── chat_logs.sql      # local-only D1 schema (production table already exists)
├── seed-chatlogs.sql      # synthetic test rows for the chat_logs table
├── wrangler_instructions.txt  # how other sites plug into the shared chat-logs DB
├── src/
│   ├── pages/
│   │   ├── index.astro            # landing page (hero, tool tiles, process, stack, footer)
│   │   ├── tools/[slug].astro     # one detail page per tool, prerendered
│   │   └── api/
│   │       ├── chat.ts            # streaming DeepSeek endpoint + D1 chat logging
│   │       ├── screenshots.ts     # public screenshot list
│   │       ├── img/[slug]/[file].ts   # stream an image from R2
│   │       └── admin/             # auth.ts, upload.ts, delete.ts, reorder.ts
│   ├── components/
│   │   ├── BrutalNav.astro
│   │   ├── BrutalFooter.astro
│   │   ├── Marquee.astro
│   │   ├── ToolTile.astro
│   │   ├── ToolMock.astro         # stylised fake-screenshot mocks per tool
│   │   ├── AdminBar.tsx           # bottom-left PIN entry / admin toggle
│   │   ├── HeroPreview.tsx        # hero screenshot panel (public)
│   │   ├── TileThumb.tsx          # homepage tile thumbnails (public)
│   │   ├── ScreenshotGallery.tsx  # admin-only management strip (upload/reorder/delete)
│   │   ├── ChatLauncher.astro     # mounts the React island
│   │   └── ChatWidget.tsx         # React chat widget (SSE consumer + suggestions)
│   ├── data/
│   │   ├── tools.ts               # single source of truth for the eight tools
│   │   └── bio.ts                 # Steven's bio, fed to the system prompt
│   ├── lib/
│   │   ├── systemPrompt.ts        # assembles the strict on-topic prompt
│   │   ├── deepseek.ts            # OpenAI-compatible streaming wrapper
│   │   ├── rateLimit.ts           # KV-backed per-IP + daily-budget checks
│   │   ├── chatLog.ts             # transcript append/trim, IP hashing, retention
│   │   ├── admin.ts               # server-side PIN gate + screenshot order manifest
│   │   └── adminClient.ts         # browser-side admin session state
│   ├── layouts/Base.astro
│   ├── styles/global.css
│   └── env.d.ts           # Env interface (secrets + bindings)
├── tests/                 # vitest unit tests (chatLog, rateLimit, admin)
├── public/                # robots.txt and any future static assets
├── design templates/      # the original Claude Design HTML exports — design source of truth
└── README.md
```

## Local development

```bash
npm install
echo "DEEPSEEK_API_KEY=sk-..." > .dev.vars
npm run dev          # Astro dev server on localhost:4321
```

Or to run inside the actual Workers runtime (KV bindings, secrets, the lot):

```bash
npm run preview      # builds + wrangler dev
```

## Deployment

```bash
# one-time
npx wrangler kv namespace create RATE_KV    # paste the id into wrangler.jsonc
echo "<deepseek-key>" | npx wrangler secret put DEEPSEEK_API_KEY

# every deploy
npm run deploy       # runs astro build + wrangler deploy
```

The custom domain `tools.clydeford.net` is declared in `wrangler.jsonc`; Wrangler attaches it on first deploy as long as `clydeford.net` lives on the same Cloudflare account.

## License

MIT.
