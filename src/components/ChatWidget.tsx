import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's the difference between Gladius and Parity?",
  "How does Archie verify its design citations?",
  "What can CloudForge do that Azure's own MCP can't?",
  "What's Steven's day job?",
];

const STORAGE_KEY = "tcl_chat_v1";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // Persist on change (best-effort)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // ignore
    }
  }, [messages]);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // last 8 turns, model gets system prompt server-side
          messages: next.slice(-16),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        // Errors are transient UI state, never conversation turns: they must
        // not persist to localStorage or replay to the model as history.
        const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        setError(body.message ?? `Error: HTTP ${res.status}`);
        return;
      }
      if (!res.body) {
        setError("No response body");
        return;
      }

      // Open an empty assistant message and stream into it
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          let event = "message";
          let data = "";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            if (line.startsWith("data: ")) data = line.slice(6);
          }
          if (event === "done") continue;
          if (event === "error") {
            try {
              const j = JSON.parse(data);
              setError(j.message ?? "stream error");
            } catch {
              setError("stream error");
            }
            continue;
          }
          try {
            const j = JSON.parse(data);
            if (j.t) {
              setMessages((m) => {
                const copy = m.slice();
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: last.content + j.t };
                }
                return copy;
              });
            }
          } catch {
            // ignore malformed
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
    } finally {
      setStreaming(false);
      abortRef.current = null;
      // Drop an assistant bubble that never received a token (failed stream)
      // so it doesn't linger as an eternal "…" placeholder.
      setMessages((m) => {
        const last = m[m.length - 1];
        return last && last.role === "assistant" && last.content === ""
          ? m.slice(0, -1)
          : m;
      });
    }
  }

  function clear() {
    if (streaming) abortRef.current?.abort();
    setMessages([]);
    setError(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  return (
    <>
      {/* launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-[#c2410c] px-4 py-3 text-xs font-semibold tracking-[0.08em] text-cream shadow-soft transition-colors hover:bg-[#f2670f] md:bottom-8 md:right-8 ${open ? "hidden" : ""}`}
        aria-label="Open chat"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-cream"></span>
        Ask the bot
      </button>

      {/* panel */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-ink/20 p-2 sm:p-5 md:items-end md:p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="flex h-[88vh] w-full max-w-[440px] flex-col border border-line bg-cream shadow-soft sm:h-[80vh] md:h-[640px]"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent"></span>
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted">
                  Ask about the tools
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clear}
                  className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-ink"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-ink"
                  aria-label="Close chat"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-[13.5px] leading-relaxed text-muted">
                    Powered by DeepSeek. Strictly on topic: Steven and his eight tools.
                    Chats may be logged server-side (pseudonymously, no raw IPs) to
                    improve the site.
                  </p>
                  <div className="space-y-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="block w-full border border-line px-3 py-2 text-left text-[13px] font-medium transition-colors hover:border-ink"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`mb-3 ${m.role === "user" ? "text-right" : ""}`}>
                  <div
                    className={`inline-block max-w-[88%] whitespace-pre-wrap px-3 py-2 text-[13.5px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-ink text-cream"
                        : "border border-line bg-cream-2"
                    }`}
                  >
                    {m.content || (
                      <span className="inline-block animate-pulse text-ink/40">…</span>
                    )}
                  </div>
                </div>
              ))}

              {error && (
                <div className="mt-2 border border-accent/40 bg-accent/5 px-3 py-2 text-[12px] text-ink">
                  {error}
                </div>
              )}
            </div>

            {/* input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2 border-t border-line p-3"
            >
              <textarea
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about Gladius, Parity, Archie, CloudForge or Steven…"
                className="min-h-[64px] flex-1 resize-none border border-line bg-cream px-3 py-2 text-[13.5px] leading-snug outline-none transition-colors focus:border-ink"
                disabled={streaming}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="bg-ink px-4 py-2 text-xs font-semibold tracking-[0.06em] text-cream transition-colors hover:bg-accent disabled:opacity-40"
              >
                {streaming ? "…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
