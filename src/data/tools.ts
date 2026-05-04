// Single source of truth for the four tools — used by landing tiles, detail
// pages, and the chat system prompt.

export type Tool = {
  slug: "gladius" | "shellmate" | "devnet-mcp" | "kopis";
  n: string;            // brutalist № display
  name: string;         // upper-cased name
  tag: string;          // short category line
  year: string;         // displayed year
  blurb: string;        // homepage tile copy
  color: string;        // accent hex
  client: string;       // meta strip — "Self-funded R&D" etc.
  duration: string;
  role: string;
  status: string;
  problem: string;
  approach: string[];
  outcome: [string, string, string?][];
  quote: string;
  stack: string[];
  github: string;
  liveUrl?: string;
  longDescription: string; // for chatbot grounding
};

export const TOOLS: Tool[] = [
  {
    slug: "gladius",
    n: "01",
    name: "GLADIUS",
    tag: "AI Network Auditor",
    year: "2026",
    blurb:
      "An autonomous Cisco security auditor. Tell it an IP. It SSHes in, runs hardening checks, cross-references NIST 800-53 and CIS, looks up live CVEs, and produces the report. No checklists, no scripts.",
    color: "#ff5b1f",
    client: "Self-funded R&D",
    duration: "Ongoing",
    role: "Sole designer / engineer",
    status: "In active use",
    problem:
      "Network security audits are slow, inconsistent, and gated on the senior engineer who knows where the gotchas live. The good ones take days. The bad ones miss CVEs that have been public for months. Either way, nobody runs them often enough.",
    approach: [
      "Built an MCP server that gives Claude direct, controlled access to a Cisco device — SSH, show commands, even config push.",
      "Loaded NIST 800-53 controls and the CIS IOS XE Benchmark into a ChromaDB vector store, so every finding can cite the exact control it violates.",
      "Wired live CVE lookup against the NIST NVD — the moment Gladius detects an IOS version, it pulls every known CVE with CVSS scores.",
      "Wrapped the whole thing in a FastAPI dashboard with templated HTML reports, an SSE stream, a Slack audit bot, and a separate Slack 'overseer' agent that can read code, restart containers, and commit changes.",
    ],
    outcome: [
      ["Audit time", "Days → minutes", "−98%"],
      ["Frameworks", "NIST 800-53 + CIS", "with citations"],
      ["MCP tools", "11", "live SSH, KB, NVD, email"],
    ],
    quote:
      "Gladius is the tool I've always wanted to hand to a junior on day one — every finding comes with the control it breaks and the command to fix it.",
    stack: [
      "Claude Sonnet 4.6",
      "MCP",
      "FastAPI",
      "ChromaDB",
      "Docker",
      "Slack Bolt",
      "Python",
    ],
    github: "https://github.com/sjohnston1972/gladius",
    longDescription:
      "Gladius is an AI-powered Cisco network security auditor. Architecture: a FastAPI app runs a Claude agent (Sonnet 4.6) that talks to a custom MCP server over stdio. The MCP server exposes 11 tools — connect_to_device, run_show_command, push_config, query_knowledge_base (semantic search over NIST 800-53 + CIS IOS XE Benchmark in ChromaDB), query_nvd (live CVE lookup against NIST NVD), save_audit_results, send_email, run_nmap_scan, run_scapy, and more. Findings are scored against NIST and CIS, bucketed by severity (CRITICAL/HIGH/MEDIUM/LOW/PASS), and rendered as standalone HTML reports with a remediation plan and pre-deployment checklist. Two Slack apps: an audit bot (chat with Gladius from Slack, get formatted score cards inline) and an AI overseer (separate Claude agent with access to project files, Docker, and git — read code, restart containers, commit, all from Slack). Includes a pyATS Factory for LLM-driven script generation, a Scapy packet-forge tool, and 9 colour themes named after Roman gladius variants. Runs as a Docker stack: web-projects (nginx), gladius-api, network-audit-mcp, chroma-db, gladius-pyats, gladius-snmp, gladius-slack, gladius-overseer.",
  },
  {
    slug: "shellmate",
    n: "02",
    name: "SHELLMATE",
    tag: "SSH Terminal + AI Buddy",
    year: "2026",
    blurb:
      "A multi-tab SSH terminal with an AI sidekick that watches your session and suggests the right command before you Alt-Tab to ChatGPT. Cloud or local model — your call.",
    color: "#3a4eff",
    client: "Self-funded R&D",
    duration: "12 weeks",
    role: "Sole designer / engineer",
    status: "Beta",
    problem:
      "Engineers Alt-Tab to ChatGPT a hundred times a day to ask 'what was the flag for…' or 'why is this pod crashing?' — pasting context out, pasting answers back. The terminal already has the context. The AI should live next to it, not in another window.",
    approach: [
      "Multi-tab SSH terminal first: profiles, themed tabs, copy/paste, light/dark, tab flash on AI command inject. Treat the terminal as a first-class app, not a wrapper.",
      "Side pane runs a chat with the model of your choice — Claude, OpenAI, DeepSeek, xAI Grok, or local Ollama. Unified dropdown so you can switch mid-session.",
      "Suggested commands are previewed inline; one keystroke runs them in the active tab. Nothing executes silently — ever.",
      "Jira integration so a ticket → terminal → AI loop happens without leaving the app. Token meter so you can see exactly what the context is costing.",
    ],
    outcome: [
      ["Backends", "5", "Claude, OpenAI, DeepSeek, xAI, Ollama"],
      ["Latency", "p95 < 250ms", "for cloud models"],
      ["Context window", "Live token meter", "no surprise bills"],
    ],
    quote:
      "Shellmate is the AI tool I actually kept using past the novelty week — because the AI is where my work already is.",
    stack: [
      "Electron",
      "TypeScript",
      "xterm.js",
      "Claude",
      "OpenAI",
      "DeepSeek",
      "xAI Grok",
      "Ollama",
      "Jira API",
    ],
    github: "https://github.com/sjohnston1972/shellmate",
    liveUrl: "https://github.com/sjohnston1972/shellmate",
    longDescription:
      "Shellmate is a multi-tab SSH terminal with a built-in AI chat panel. Phase 1 shipped multi-tab SSH with profiles and a settings UI; Phase 2 added AI chat, command suggestions, copy/paste, light/dark theming. Subsequent releases added: rename to ShellMate, logo, larger UI text, tab flash on AI command inject, Claude as default backend, then xAI Grok / OpenAI / DeepSeek backends, then a unified model dropdown grouping cloud + local (Ollama) models, Jira integration with pill buttons, accurate double-click copy, an accurate context token meter, and a 'New' button. The model-agnostic backend means you can use a hosted frontier model when speed and quality matter, then switch to local Ollama for sensitive sessions — same UI, same suggestion flow.",
  },
  {
    slug: "devnet-mcp",
    n: "03",
    name: "DEVNET MCP",
    tag: "Cisco DevNet API Chat",
    year: "2026",
    blurb:
      "A streaming chat UI for Cisco's DevNet Content Search MCP. Ask anything about Meraki or Catalyst Center APIs and get a token-streamed answer with real operation IDs and doc URLs. Hosted on a single Worker.",
    color: "#1d8a4a",
    client: "Self-funded R&D · public",
    duration: "1 weekend",
    role: "Sole designer / engineer",
    status: "Live · devnet-mcp.clydeford.net",
    problem:
      "Cisco's API documentation is enormous. Finding the exact endpoint, operation ID, or YANG path for the thing you want to do takes more time than writing the script. The official search isn't great. Could a small AI fronting the official MCP server fix that for a weekend's work?",
    approach: [
      "Wrote a Cloudflare Worker that talks to Cisco's hosted DevNet MCP server over the streamable-HTTP transport — no SDK, just inline initialise → notifications/initialized → tools/call.",
      "On every user message, fired both Meraki-API-Doc-Search and CatalystCenter-API-Doc-Search in parallel and stuffed the results as structured context.",
      "Used Workers AI (llama-3.3-70b-instruct-fp8-fast) with streaming on, piping the tokens straight to the browser as Server-Sent Events.",
      "Hand-rolled the frontend — vanilla JS + marked + highlight.js + DOMPurify, all from CDN. No bundler. Meraki-flavoured dark theme with bouncing router/switch icons as the typing indicator.",
    ],
    outcome: [
      ["Build time", "One weekend", "—"],
      ["Cost", "Workers AI on the free tier", "—"],
      ["Sources", "Live MCP queries", "every reply"],
    ],
    quote:
      "Proof that you can ship a useful MCP-grounded chat tool in a weekend, on the Workers free tier, with zero bundler ceremony.",
    stack: [
      "Cloudflare Workers",
      "Workers AI",
      "Llama 3.3 70B",
      "MCP",
      "Vanilla JS",
      "SSE",
    ],
    github: "https://github.com/sjohnston1972/devnet-mcp",
    liveUrl: "https://devnet-mcp.clydeford.net",
    longDescription:
      "DevNet MCP is a chat UI for Cisco's hosted DevNet Content Search MCP server, running entirely on Cloudflare Workers + Workers AI. Architecture: each user message triggers parallel calls to Meraki-API-Doc-Search and CatalystCenter-API-Doc-Search; results are stuffed into the prompt as structured context; a Workers AI text model (llama-3.3-70b-instruct-fp8-fast by default) writes the conversational reply citing operation IDs and doc URLs; tokens stream to the browser over SSE. Frontend is vanilla JS — marked for markdown, highlight.js for syntax highlighting, DOMPurify for safety. Code blocks have copy buttons; chat exports as Markdown; clear-with-confirm; conversation persists in localStorage. The MCP transport handshake (initialize → notifications/initialized → tools/call) is implemented inline against the streamable-HTTP transport — no SDK. Custom domain on Cloudflare. All in a single src/index.ts and a public/ directory.",
  },
  {
    slug: "kopis",
    n: "04",
    name: "KOPIS",
    tag: "Network Digital Twin",
    year: "2026",
    blurb:
      "A continuous-model platform: snapshots the whole network with pyATS, runs tiered AI agents over it (Ollama → Haiku → Sonnet → Opus on escalation), proposes fixes, executes only after a human approves them.",
    color: "#8b3aff",
    client: "Self-funded R&D",
    duration: "Ongoing",
    role: "Sole architect / engineer",
    status: "Active build",
    problem:
      "Per-device audits (like Gladius) tell you a single device is broken. They don't tell you the network is broken. Cross-device reasoning, historical change tracking, and 'should we shut this interface or re-route the traffic?' need a different shape: a digital twin that watches the whole estate continuously.",
    approach: [
      "Pulled inventory from Grafana — single source of truth, no manual lists. Kopis generates the pyATS testbed file from whatever's monitored.",
      "Snapshots flow through a LangGraph state machine: each node is an agent, the state is shared, and conditional edges route based on what the previous agent found.",
      "Tiered models by job: Ollama for normalisation (free, mechanical), Haiku for triage and classification (fast, cheap, the workhorse), Sonnet for remediation reasoning, Opus only when topology agent confidence is below 70% — the 'phone a friend' tier.",
      "Recommendations land in an approval queue. Web UI or Slack — same record. After execution, Kopis automatically takes a fresh snapshot to verify the change worked.",
    ],
    outcome: [
      ["Snapshot scope", "Whole network", "via pyATS"],
      ["Model tiers", "4", "Ollama → Haiku → Sonnet → Opus"],
      ["Per-run cost", "$0.10-$0.25", "5 devices, typical"],
    ],
    quote:
      "Gladius tells you a device has vulnerabilities. Kopis tells you the network has problems and which fix to ship first.",
    stack: [
      "Python",
      "FastAPI",
      "pyATS",
      "LangGraph",
      "PostgreSQL",
      "ChromaDB",
      "Claude Haiku/Sonnet/Opus",
      "Ollama",
      "Slack Bolt",
      "Docker",
    ],
    github: "https://github.com/sjohnston1972/kopis",
    longDescription:
      "Kopis is a network digital twin / continuous monitoring platform. Architecture: Grafana is the inventory source of truth — Kopis queries it for what devices exist. pyATS connects to each device over SSH and 'learns' its full state into structured Python objects, then dumps to PostgreSQL JSONB. A LangGraph state machine processes each snapshot through tiered agents — Ollama normaliser (free, mechanical: extract facts, normalise formats, flag obvious threshold breaches); Haiku topology agent (smart enough for network concepts, fast and cheap to run often, classifies findings by severity with a confidence score); Sonnet remediation agent (decides what to do — 'shut interface or re-route?' needs deeper reasoning); Opus escalation node (called only when topology confidence < 70%, target <20% of analyses, keeps cost under control). Recommendations enter an approval queue surfaced both as a web UI cards view and as Slack messages with Approve/Deny buttons; either path updates the same DB record. After execution (via pyATS or Netmiko), Kopis automatically takes a fresh snapshot to verify the fix. Shares Docker host, Cloudflare tunnel, and Ollama with Gladius but runs its own PostgreSQL, ChromaDB, FastAPI, and frontend. Estimated cost: ~$12-30/month at 4 snapshots/day across 5 devices.",
  },
];

export const TOOL_BY_SLUG = Object.fromEntries(
  TOOLS.map((t) => [t.slug, t]),
) as Record<Tool["slug"], Tool>;
