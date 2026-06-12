// Single source of truth for the eight tools — used by landing tiles, detail
// pages, and the chat system prompt.

export type Tool = {
  slug:
    | "gladius"
    | "shellmate"
    | "cisco-api-navigator"
    | "parity"
    | "archie"
    | "cloudforge"
    | "dockermate"
    | "webex-migrate";
  n: string;            // brutalist № display
  name: string;         // upper-cased name
  tag: string;          // short category line
  year: string;         // displayed year
  blurb: string;        // homepage tile copy
  color: string;        // accent hex
  client: string;       // meta strip
  duration: string;
  role: string;
  status: string;
  problem: string;
  approach: string[];
  outcome: [string, string, string?][];
  quote: string;         // design note shown on the detail page, not a testimonial
  stack: string[];
  github?: string;      // intentionally unset for now — rendered as a placeholder
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
    client: "Personal project",
    duration: "Ongoing",
    role: "Sole designer / engineer",
    status: "In active use",
    problem:
      "Network security audits are slow, inconsistent, and gated on the senior engineer who knows where the gotchas live. The good ones take days. The bad ones miss CVEs that have been public for months. Either way, nobody runs them often enough.",
    approach: [
      "Built an MCP server that gives Claude direct, controlled access to a Cisco device: SSH, show commands, even config push. The audit runs a strict three-phase, max-three-loop structure so every run is cheap and predictable.",
      "Loaded NIST 800-53 controls and the CIS IOS XE Benchmark (about 2,400 vectors) into ChromaDB, so every finding cites the exact control it violates. Added live NVD CVE lookup, Cisco PSIRT advisories, and EOX end-of-support dates per hardware PID.",
      "Added a separate PenTest agent with its own 20-tool MCP server (nmap, masscan, sslyze, nikto, hydra and more) gated by a GO ACTIVE operator approval. Active tools are blocked server-side until a human says yes, even if the model asks nicely.",
      "Wrapped it all in a FastAPI dashboard with templated HTML reports, SSE streaming, a Slack audit bot, a Slack 'overseer' agent that can read code and restart containers, and Cisco's Foundation-Sec-8B running locally on Ollama for scope-aware security chat.",
    ],
    outcome: [
      ["Audit run", "3 phases", "capped at 3 model loops"],
      ["Frameworks", "NIST 800-53 + CIS", "with citations"],
      ["PenTest tools", "20", "behind a GO ACTIVE gate"],
    ],
    quote:
      "Built so it could be handed to a junior on day one: every finding comes with the control it breaks and the command to fix it.",
    stack: [
      "Claude Sonnet 4.6",
      "MCP",
      "FastAPI",
      "ChromaDB",
      "Foundation-Sec-8B",
      "pyATS",
      "Docker",
      "Slack",
      "Python",
    ],
    longDescription:
      "Gladius is an AI-powered Cisco network security auditor. Architecture: a FastAPI app runs a Claude agent (Sonnet 4.6) that talks to a custom MCP server over stdio. The agent SSHes into Cisco IOS/IOS-XE devices, runs show commands, and cross-references findings against a ChromaDB vector store loaded with NIST 800-53 controls and the CIS Cisco IOS XE Benchmark (about 2,400 vectors). It queries the NIST NVD live for CVEs on the detected IOS version, Cisco PSIRT openVuln for advisories, and Cisco EOX for end-of-sale/support per hardware PID. Audits follow a strict 3-phase, max-3-loop structure to stay cheap and predictable, streaming everything over SSE. Findings get compliance scores (Overall/NIST/CIS) bucketed CRITICAL to PASS, rendered as standalone HTML reports with a remediation plan, copyable CLI fixes, and email delivery. A separate PenTest agent drives a second MCP server with 20 tools (nmap, masscan, smbclient, snmpwalk, sslyze, nikto, gobuster, hydra and others) through six phases with a GO ACTIVE operator gate; active tools are blocked server-side via an allow-list until a human approves. Engagements end with kill chains, attack paths, and MITRE ATT&CK technique mapping. Also on board: Cisco's Foundation-Sec-8B (security-tuned Llama) on local Ollama for scope-aware security chat, an NMAP scanner UI, a Scapy packet forge, a pyATS Factory for LLM-driven script generation, two Slack apps (an audit bot plus an AI overseer that can read code, restart containers, and commit from Slack), and 9 colour themes named after Roman gladius variants. Runs as an 8-container Docker stack.",
  },
  {
    slug: "shellmate",
    n: "02",
    name: "SHELLMATE",
    tag: "Terminal + AI Copilot",
    year: "2026",
    blurb:
      "A split-screen, multi-tab web terminal for network engineers, SSH and serial, with an AI copilot that watches your live session and suggests the right command before you Alt-Tab to ChatGPT. Five backends, cloud or local.",
    color: "#3a4eff",
    client: "Personal project",
    duration: "12 weeks",
    role: "Sole designer / engineer",
    status: "In active use",
    problem:
      "Engineers Alt-Tab to ChatGPT a hundred times a day to ask 'what was the flag for…' or 'why is this neighbour stuck in INIT?', pasting context out and answers back. The terminal already has the context. The AI should live next to it, not in another window.",
    approach: [
      "Multi-tab terminal first: simultaneous SSH (paramiko) and serial (pyserial) sessions, each with its own buffer and WebSocket, rendered in xterm.js. Drag-reorder tabs, Ctrl+1-9, seven colour schemes.",
      "The copilot sees your live terminal output and answers questions about what's on screen. A Tshoot/Learn toggle flips its persona between terse fix-it-now and patient mentor. Session-aware /context commands pull other tabs into the conversation.",
      "Five streaming backends (Claude, OpenAI, xAI Grok, DeepSeek, local Ollama) with a per-message model dropdown. An optional ChromaDB knowledge base silently augments prompts with your own design guidelines.",
      "Suggest-and-approve, always: the AI proposes CLI commands you run with one click, and dangerous commands get a confirmation prompt. Nothing executes silently. A Conclude button bundles transcripts plus chat into a Jira ticket.",
    ],
    outcome: [
      ["Backends", "5", "Claude, OpenAI, xAI, DeepSeek, Ollama"],
      ["Transports", "SSH + serial", "multi-tab, per-tab WebSocket"],
      ["Execution", "Approve-first", "nothing runs silently"],
    ],
    quote:
      "The design goal was surviving past the novelty week: the AI lives where the work already is, not in another window.",
    stack: [
      "Python",
      "FastAPI",
      "xterm.js",
      "paramiko",
      "Claude",
      "OpenAI",
      "xAI Grok",
      "DeepSeek",
      "Ollama",
      "ChromaDB",
      "Jira API",
    ],
    longDescription:
      "ShellMate is a split-screen, multi-tab web terminal built for network engineers working with Cisco switches, routers, and firewalls. Multiple simultaneous SSH (paramiko) or serial-console (pyserial) sessions, each in its own tab with an independent session, buffer, and WebSocket, rendered via xterm.js. The right-hand AI copilot (Claude, OpenAI, xAI Grok, DeepSeek, or local Ollama, switchable per message) sees the live terminal output and answers questions about what's on screen. A Tshoot/Learn mode toggle flips the persona between Troubleshoot (terse, fix-it-now) and Learn (a patient mentor that explains the why). Command suggestions are suggest-and-approve: one click runs them in the active tab, dangerous commands get a confirmation prompt. Optional ChromaDB knowledge-base augmentation auto-retrieves matching design-guideline snippets into every prompt. Session-aware context commands (/context all, /context 2) pull other tabs into the conversation. A Conclude button bundles session transcripts plus the chat into a Jira ticket via a one-shot summary. Saved connection profiles store no passwords; you are always re-prompted, and passwords are dropped from memory once the SSH session opens. Seven terminal colour schemes (Deep Space, Solarized Dark, Nord, One Dark, Gruvbox, Dracula, Monokai), light/dark UI, smart copy/paste, optional per-session file logging. FastAPI plus vanilla JS, ships as Docker, designed to sit behind an access proxy. It's an open shell, treat it like one.",
  },
  {
    slug: "cisco-api-navigator",
    n: "03",
    name: "CISCO API NAVIGATOR",
    tag: "Cisco DevNet API Chat",
    year: "2026",
    blurb:
      "A streaming chat UI for Cisco's DevNet Content Search MCP. Ask anything about Meraki or Catalyst Center APIs and get a token-streamed answer with real operation IDs and doc URLs. Hosted on a single Worker.",
    color: "#1d8a4a",
    client: "Personal project",
    duration: "1 weekend",
    role: "Sole designer / engineer",
    status: "Live",
    problem:
      "Cisco's API documentation is enormous. Finding the exact endpoint, operation ID, or YANG path for the thing you want to do takes more time than writing the script. The official search isn't great. Could a small AI fronting the official MCP server fix that for a weekend's work?",
    approach: [
      "Wrote a Cloudflare Worker that talks to Cisco's hosted DevNet MCP server over the streamable-HTTP transport. No SDK, just inline initialise → notifications/initialized → tools/call.",
      "On every user message, fired both Meraki-API-Doc-Search and CatalystCenter-API-Doc-Search in parallel and stuffed the results in as structured context.",
      "Used Workers AI (llama-3.3-70b-instruct-fp8-fast) with streaming on, piping the tokens straight to the browser as Server-Sent Events.",
      "Hand-rolled the frontend: vanilla JS, marked, highlight.js, and DOMPurify, all from CDN. No bundler. Meraki-flavoured dark theme with bouncing router and switch icons as the typing indicator.",
    ],
    outcome: [
      ["Build time", "One weekend"],
      ["Cost", "Workers AI free tier"],
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
    longDescription:
      "Cisco API Navigator is a chat UI for Cisco's hosted DevNet Content Search MCP server, running entirely on Cloudflare Workers plus Workers AI. Architecture: each user message triggers parallel calls to Meraki-API-Doc-Search and CatalystCenter-API-Doc-Search; results are stuffed into the prompt as structured context; a Workers AI text model (llama-3.3-70b-instruct-fp8-fast by default) writes the conversational reply citing operation IDs and doc URLs; tokens stream to the browser over SSE. Frontend is vanilla JS with marked for markdown, highlight.js for syntax highlighting, and DOMPurify for safety. Code blocks have copy buttons; chat exports as Markdown; clear-with-confirm; conversation persists in localStorage; smart auto-scroll sticks while streaming and yields when you scroll up. The MCP transport handshake (initialize, notifications/initialized, tools/call) is implemented inline against the streamable-HTTP transport with no SDK. All in a single src/index.ts and a public/ directory.",
  },
  {
    slug: "parity",
    n: "04",
    name: "PARITY",
    tag: "Network Digital Twin",
    year: "2026",
    blurb:
      "A digital twin of your network built from live pyATS snapshots, analysed by a tiered swarm of AI agents (Ollama → Haiku → Sonnet → Opus on escalation). Fixes are proposed, human-approved, executed via pyATS, then verified closed-loop.",
    color: "#8b3aff",
    client: "Personal project",
    duration: "Ongoing",
    role: "Sole architect / engineer",
    status: "Active build",
    problem:
      "Per-device audits (like Gladius) tell you a single device is broken. They don't tell you the network is broken. Cross-device reasoning, historical change tracking, and 'should we shut this interface or re-route the traffic?' need a different shape: a digital twin that watches the whole estate continuously.",
    approach: [
      "Pulled inventory straight from the Grafana API. Single source of truth, no separate inventory to maintain. Parity generates the pyATS testbed on the fly and learns full operational state (interfaces, routing, BGP, OSPF, VLANs, STP) into PostgreSQL JSONB snapshots.",
      "A LangGraph state machine runs a cost-tiered pipeline: Ollama normalises for free, Haiku classifies findings with severity and confidence, Sonnet drafts remediation with CLI, risk, and rollback, and Opus is called only when Haiku confidence on a critical finding drops below 0.7. Cheapest model that can do the job wins.",
      "Every recommendation lands in an approval queue, web UI or Slack interactive buttons, and auto-creates a Jira ticket with finding, commands, rollback, and risk. States sync both ways. Nothing touches the network until a human says yes.",
      "Approved commands execute via pyATS with pre-staged rollback, then a fresh snapshot and closed-loop verification: the originating finding is re-evaluated as confirmed fixed, still present, or new collateral damage.",
    ],
    outcome: [
      ["Snapshot scope", "Whole network", "via pyATS"],
      ["Model tiers", "4", "Ollama → Haiku → Sonnet → Opus"],
      ["Approval paths", "3", "web UI, Slack, Jira"],
    ],
    quote:
      "Gladius tells you a device has vulnerabilities. Parity tells you the network has problems, which fix to ship first, and checks its own work after the change.",
    stack: [
      "Python",
      "FastAPI",
      "pyATS",
      "LangGraph",
      "PostgreSQL",
      "ChromaDB",
      "Claude Haiku/Sonnet/Opus",
      "Ollama",
      "React",
      "Slack",
      "Jira",
      "Docker",
    ],
    longDescription:
      "Parity is a network digital twin with human-in-the-loop remediation. Architecture: Grafana is the inventory source of truth; Parity queries its API and generates pyATS testbed YAML on the fly. pyATS/Genie connects over SSH and learns full operational state (interfaces, routing, ARP, BGP, OSPF, VLANs, STP, platform), storing normalised JSONB snapshots in PostgreSQL, with recursive snapshot diffing ('what changed since last night?'). A LangGraph state machine runs a cost-tiered pipeline: Tier 0 Ollama (local, free) normalises snapshots; Tier 1 Claude Haiku classifies findings with severity and confidence; Tier 2 Sonnet drafts remediation with CLI commands, risk, and rollback; Tier 3 Opus escalates only when Haiku confidence on a critical finding is below 0.7. Escalation is one-way up, with per-tier token and cost tracking. Cross-device findings are correlated into single incidents. Every recommendation enters an approval state machine (PENDING, APPROVED, EXECUTED, SUCCESS/FAILED, plus DENIED/EXPIRED with a 24h TTL) surfaced through three channels: web UI, Slack Block Kit buttons, and an auto-created Jira ticket that syncs states both ways. Approved commands execute via pyATS with pre-staged rollback, a fresh post-change snapshot (BGP/OSPF given convergence time), and closed-loop verification where findings are re-evaluated as confirmed fixed, still present, or new collateral damage. ChromaDB collections answer 'have we seen this before?' and detect drift. Also: agentic in-app chat with multi-turn tool use over snapshots, findings, and topology, scheduled snapshots via APScheduler, 21 REST endpoints plus WebSocket. Parity does day-2 operations and remediation; Gladius does posture and audit.",
  },
  {
    slug: "archie",
    n: "05",
    name: "ARCHIE",
    tag: "AI Network Design Studio",
    year: "2026",
    blurb:
      "Upload a customer brief, even a photo of the whiteboard, and designer/critic agent pairs argue their way to a cited network design. A build agent then turns it into Containerlab, GNS3, and draw.io artifacts.",
    color: "#d99a06",
    client: "Personal project",
    duration: "Ongoing",
    role: "Sole designer / engineer",
    status: "In active use",
    problem:
      "After a customer meeting, turning scribbled requirements into a defensible design doc takes days. The LLM shortcut produces confident designs with invented best practices. If a design decision can't cite a real guideline, you need to know that before the customer asks.",
    approach: [
      "Multimodal intake: typed PDF, Word, or Markdown, pasted notes, or a photo of the whiteboard via a vision LLM. No separate OCR service. An extractor splits the brief into LAN, WAN, EDGE, CLOUD, and QOS sections.",
      "An orchestrator derives a shared baseline (routing family, AS numbers, IP plan, QoS classes, security posture), then spawns one designer/critic loop per section, running in parallel. The designer must cite a ChromaDB corpus of design guidelines. Unsourceable decisions are flagged, never fabricated.",
      "The critic independently re-queries ChromaDB to verify each citation in code, so the LLM doesn't grade its own homework, then hunts for design flaws. Strictness is user-controlled 1-5. A coherence pass catches cross-section conflicts and forces revision.",
      "Approved sections feed a conversational build agent that decides per-turn whether to ask or build, emitting a topology spec, deterministic Cisco IOS / FRR configs, and exports as draw.io XML, Containerlab YAML, and GNS3 skeletons. Push to gear is lab-inventory-gated with a dry-run then confirm flow.",
    ],
    outcome: [
      ["Citation checking", "In code", "the LLM doesn't grade its own homework"],
      ["LLM providers", "5", "Anthropic, OpenAI, xAI, DeepSeek, Ollama"],
      ["Export targets", "3", "Containerlab, GNS3, draw.io"],
    ],
    quote:
      "Archie is the colleague who reads the whole design guide, argues with you about it, and then builds the lab to prove the point.",
    stack: [
      "Python",
      "FastAPI",
      "ChromaDB",
      "Claude",
      "React 19",
      "Cytoscape",
      "Mermaid",
      "netmiko",
      "Slack",
      "Docker",
    ],
    longDescription:
      "Archie is a self-hosted network design accomplice. You upload customer requirements after a meeting: typed PDF/Word/Markdown, pasted notes, or a photo of a whiteboard (images go through a vision LLM, no separate OCR service). An extractor pulls the customer ID and splits the brief into LAN/WAN/EDGE/CLOUD/QOS sections. An orchestrator derives a shared architectural baseline (routing family, AS numbers, IP plan, QoS classes, security posture, cloud connectivity), then spawns one designer/critic loop per populated section running in parallel. The designer queries a ChromaDB corpus of design guidelines and proposes a design with mandatory citations; unsourceable decisions are flagged 'unsourced', never fabricated. Rationale is written as markdown with an embedded mermaid topology diagram. The critic independently re-queries ChromaDB to verify each citation in code (the LLM doesn't grade its own homework), then hunts for design flaws; strictness is user-controlled 1-5, hard-capped at 5 iterations per section. A coherence pass flags cross-section conflicts (for example LAN voice CoS versus the QoS class map) and forces revision. Approved sections feed a conversational build agent that decides per-turn whether to ASK or BUILD, producing a topology spec, deterministic Cisco IOS / FRR configs, and exports as draw.io XML, Containerlab YAML, and GNS3 project skeletons. Push to real gear is gated by a lab-inventory file and an explicit dry-run then confirm flow, journaled in SQLite. Multi-provider LLM router (Anthropic, OpenAI, xAI, DeepSeek, Ollama) with per-agent model selection. Slack sends lifecycle DMs and answers questions about completed designs. Interactive Cytoscape topology graph, HTML/DOCX export via pandoc, installable PWA shell. FastAPI, SQLite, and React 19, in Docker.",
  },
  {
    slug: "cloudforge",
    n: "06",
    name: "CLOUDFORGE",
    tag: "Chat-to-Azure IaC",
    year: "2026",
    blurb:
      "Design Azure architecture in chat. Claude draws the topology on a live canvas, writes the Bicep, and pushes it with one click, then tears it down on a schedule so the lab never bills overnight.",
    color: "#0078d4",
    client: "Personal project · homelab",
    duration: "Ongoing",
    role: "Sole designer / engineer",
    status: "In active use",
    problem:
      "Microsoft's official Azure MCP Server exposes 60+ tools, but none to deploy a raw Bicep template, and no resource-group delete. So you can chat about Azure all day and still end up in the portal clicking. And lab resources left running overnight are the most expensive kind.",
    approach: [
      "Filled the gap with two tightly-scoped custom tools, deploy_bicep and destroy_azure, which spawn Microsoft's official azure-cli container as a Docker sidecar with a service principal and run az deployment / az group delete.",
      "An agentic chat loop combines Microsoft's MCP tools (spawned over stdio) with the custom ones, with prompt caching across a 320-tool registry. Five lifecycle stages (build, view, push, teardown, free) gate which tools Claude reaches for without invalidating the cached prefix.",
      "Claude emits structured <topology> and <bicep> markers parsed mid-stream: the topology renders on a React Flow canvas with dagre auto-layout, the Bicep lands in a side drawer with save-as-template.",
      "Every resource is dual-tagged and tag-enforced post-deploy, so Destroy finds exactly what was created. A cron scheduler does daily lab spin-up and nightly tear-down. Same chat loop, streamed for users, headless for schedules.",
    ],
    outcome: [
      ["Tool registry", "320 tools", "prompt-cached"],
      ["Custom tools", "2", "deploy_bicep · destroy_azure"],
      ["Teardown", "Tag-precise", "cron spin-up / tear-down"],
    ],
    quote:
      "Describe the hub-and-spoke. Watch it appear on the canvas. Push it. Schedule the teardown. Never open the portal.",
    stack: [
      "React 19",
      "React Flow",
      "Fastify",
      "Claude Opus",
      "MCP",
      "Bicep",
      "Azure CLI",
      "PostgreSQL",
      "node-cron",
      "Docker",
    ],
    longDescription:
      "CloudForge is a single-user web tool that turns natural-language conversation with Claude into deployed Azure infrastructure. You describe what you want, say 'a hub-and-spoke network with two spokes', and Claude proposes the architecture, emitting a structured <topology> marker that a React Flow canvas renders (auto-laid-out via dagre) and a <bicep> template viewable in a side drawer. Push to Azure triggers a custom deploy_bicep tool that spawns Microsoft's official azure-cli container as a Docker sidecar with the project's service principal and runs az deployment sub create. Destroy finds resources by tag and cascade-deletes via az group delete. Schedule does either on a cron (daily lab spin-up, nightly tear-down). It exists because Microsoft's official Azure MCP Server exposes 60+ tools but has no 'deploy this raw Bicep' and no resource-group delete; CloudForge fills the gap with two tightly-scoped custom tools. The backend runs an agentic chat loop combining Microsoft's MCP tools (spawned via stdio) with the custom ones, with prompt caching across a 320-tool registry. Five lifecycle stages (build/view/push/teardown/free) gate which tools Claude reaches for, communicated per-request so stage changes don't invalidate the cached prefix. Resources are dual-tagged (mcp-project plus mcp-topology-id) and enforced post-deploy via az tag update, so cleanup is precise. Topologies move draft to live to destroyed/failed. Optional GitHub sync writes a per-project repo with README and Bicep. React 19 + Vite + Tailwind frontend, Node 22 + Fastify backend, Postgres 16, streaming Claude responses with a live agent-activity row.",
  },
  {
    slug: "dockermate",
    n: "07",
    name: "DOCKERMATE",
    tag: "Docker Dashboard + AI Ops",
    year: "2026",
    blurb:
      "A self-hosted Docker dashboard with a chatbot that can actually do things: list, inspect, pull, restart, exec. Tiles pulse when a registry digest says an image is stale. Compose-aware upgrades keep your env, volumes, and networks.",
    color: "#0d9488",
    client: "Personal project · homelab",
    duration: "Side project",
    role: "Sole designer / engineer",
    status: "In daily use",
    problem:
      "Knowing whether a container is out of date means docker-pull roulette or handing the keys to a blind auto-updater. And every 'quick check' on the Docker host means SSHing in and typing the same five commands. The dashboard should know, and the chatbot should do.",
    approach: [
      "A tile grid shows every container (image, tag, state, uptime, restarts, ports, health) with a soft pulse on any tile whose registry digest differs from the local image. A one-glance 'this needs upgrading' signal.",
      "Update detection reads the local digest from docker inspect, then HEADs the registry's manifest endpoint. Docker Hub and GHCR out of the box, generic OCI fallback. No image is pulled during the check.",
      "The chatbot drives 11 tools via OpenAI tool-calling: list, inspect, logs, update-check, pull, start/stop/restart, compose pull/up, and exec into running containers.",
      "Compose-aware upgrades: when a container has compose labels, the bot recreates it via its original compose file rather than a bare docker run, preserving env, volumes, and network config. An access proxy is the only gate. Treat the URL like SSH.",
    ],
    outcome: [
      ["Chatbot tools", "11", "full container control"],
      ["Update checks", "HEAD only", "no image pulls"],
      ["Upgrades", "Compose-aware", "env / volumes / networks kept"],
    ],
    quote:
      "There is no app-level auth. Whoever can chat can effectively root the host, so treat the URL like SSH. That honesty is the security model.",
    stack: [
      "Node.js",
      "Express",
      "dockerode",
      "OpenAI GPT-4o-mini",
      "Tailwind",
      "Docker",
    ],
    longDescription:
      "DockerMate is a self-hosted dashboard plus chatbot for the Docker host it runs on. The tile grid shows every container (image, version tag, state, uptime, restarts, ports, health) with a 'soft pulse' on any tile whose registry digest differs from the local image: a one-glance 'this needs upgrading' signal. Image-update detection reads the local digest from docker inspect RepoDigests, then HEADs the registry's /v2/<repo>/manifests/<tag> endpoint (Docker Hub and GHCR out of the box, generic OCI token-endpoint fallback), so no image is ever pulled during the check. The chatbot uses OpenAI tool-calling (gpt-4o-mini by default) with full container control across 11 tools: list_containers, inspect_container, get_logs, check_image_update, pull_image, start/stop/restart_container, compose_pull_service, compose_up_service, and exec_in_container. Compose-aware upgrades: when a container has compose labels, the bot recreates it via its original compose file (found via the com.docker.compose.project.config_files label, with host-path rewriting) rather than a bare docker run, preserving env, volumes, and network config. It talks to Docker via a mounted /var/run/docker.sock plus a bind-mount of the compose tree, and ships as a single image with the docker CLI and compose plugin baked in. There is no app-level auth; the URL sits behind an access proxy and is treated like SSH. Node.js 20, Express, dockerode, static HTML/vanilla JS frontend with Tailwind.",
  },
  {
    slug: "webex-migrate",
    n: "08",
    name: "WEBEX MIGRATE",
    tag: "CUCM → Webex Calling",
    year: "2026",
    blurb:
      "Pulls telephony config out of on-prem CUCM, live over AXL or from BAT/Unity CSVs, dry-runs every object against the target Webex org, then pushes in dependency order. Rollback deletes exactly what it created, in reverse.",
    color: "#d6336c",
    client: "Personal project",
    duration: "Ongoing",
    role: "Sole designer / engineer",
    status: "Active build",
    problem:
      "CUCM-to-Webex Calling migrations live in spreadsheets: export BAT files, eyeball thousands of rows, hand-build users and hunt groups in Control Hub, and pray nothing half-applies. When something fails mid-push, 'undo' means remembering what you created.",
    approach: [
      "Pull straight from CUCM via the AXL API (users, phones, lines, hunt pilots/lists/line groups, pickup groups) or upload BAT/Unity CSV exports, with raw rows kept for audit.",
      "A mapping engine builds a Webex payload per object (people, hunt groups, call pickup) with traffic-light readiness and notes, so you review and choose exactly what migrates, mapped to target Webex locations.",
      "OAuth against the target org with admin scopes; tokens AES-256-GCM encrypted and auto-refreshed. Every batch dry-runs first: person exists? number in inventory? location exists? licence available?",
      "Push runs through a queue in dependency order, people before groups, idempotent on re-run, with rollback that deletes exactly what the batch created, in reverse order. Readiness, dry-run, and post-push CSV reports at every stage.",
    ],
    outcome: [
      ["Pipeline", "5 stages", "source → review → webex → push → report"],
      ["Rollback", "Exact reverse", "deletes only what the batch created"],
      ["Runtime", "Serverless", "Workers, D1, R2, Queues"],
    ],
    quote:
      "The migration tool I wanted on every cutover weekend: dry-run everything, push in order, and an undo button that actually means it.",
    stack: [
      "TypeScript",
      "Hono",
      "React",
      "Cloudflare Workers",
      "D1",
      "R2",
      "Queues",
      "CUCM AXL",
      "Webex APIs",
      "Vitest",
    ],
    longDescription:
      "Webex Migrate is a CUCM to Webex Calling migration tool: pull, review, dry-run, push, with full rollback. It pulls telephony configuration from on-prem Cisco CUCM, live via the AXL API or via BAT/Unity CSV uploads, lets you review and choose what to migrate, dry-runs every object against the target Webex org, then pushes in dependency order. Runs entirely on Cloudflare: a Hono API plus React dashboard on Workers and Static Assets, D1 for projects/parsed config/mappings/batches, R2 for uploaded export files, and Cloudflare Queues for ordered, retried push jobs. The flow is five stages. Source: configure AXL and pull users, phones, lines, hunt pilots/lists/line groups, and pickup groups straight from CUCM, or upload BAT/Unity CSVs (raw rows kept for audit). Review and select: a mapping engine builds a Webex payload per object (people, hunt groups, call pickup) with traffic-light readiness and notes. Webex: OAuth with admin scopes against the target org, tokens AES-256-GCM encrypted in D1 and auto-refreshed. Validate and push: batch, dry-run (person exists? number in inventory? location exists? licence available?), then push, people before groups, idempotent re-runs, with rollback that deletes exactly what the batch created in reverse order. Reports: readiness, dry-run, and post-push CSVs. Since Workers only make outbound requests on 80/443 and CUCM serves AXL on :8443, AXL is reached through a tunnel. Vitest tests run inside the Workers runtime with emulated D1/R2.",
  },
];

export const TOOL_BY_SLUG = Object.fromEntries(
  TOOLS.map((t) => [t.slug, t]),
) as Record<Tool["slug"], Tool>;
