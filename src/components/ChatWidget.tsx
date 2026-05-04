import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's the difference between Gladius and Kopis?",
  "How does Shellmate decide which model to use?",
  "Why MCP for Cisco DevNet?",
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
        const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        setMessages((m) => [
          ...m,
          { role: "assistant", content: body.message ?? `Error: HTTP ${res.status}` },
        ]);
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
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 border-2 border-ink bg-accent px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-ink shadow-brutal-sm transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal md:bottom-8 md:right-8 ${open ? "hidden" : ""}`}
        aria-label="Open chat"
      >
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink"></span>
        Ask the bot
      </button>

      {/* panel */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-ink/30 p-2 sm:p-5 md:items-end md:p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="flex h-[88vh] w-full max-w-[440px] flex-col border-2 border-ink bg-cream shadow-brutal sm:h-[80vh] md:h-[640px]"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b-2 border-ink bg-ink px-4 py-3 text-cream">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 bg-accent"></span>
                <span className="text-xs font-extrabold uppercase tracking-[0.15em]">
                  Ask about the tools
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clear}
                  className="border border-cream/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider hover:bg-cream hover:text-ink"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="border border-cream/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider hover:bg-cream hover:text-ink"
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
                  <p className="text-sm leading-relaxed">
                    Powered by DeepSeek. Strictly on-topic — Steven and his four tools.
                    Conversations are not stored on the server.
                  </p>
                  <div className="space-y-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="block w-full border-2 border-ink bg-cream px-3 py-2 text-left text-[13px] font-medium hover:bg-accent"
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
                    className={`inline-block max-w-[88%] whitespace-pre-wrap border-2 border-ink px-3 py-2 text-[13.5px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-ink text-cream"
                        : "bg-cream"
                    }`}
                  >
                    {m.content || (
                      <span className="inline-block animate-pulse text-ink/40">…</span>
                    )}
                  </div>
                </div>
              ))}

              {error && (
                <div className="mt-2 border-2 border-ink bg-accent/30 px-3 py-2 text-[12px]">
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
              className="flex gap-2 border-t-2 border-ink p-3"
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
                placeholder="Ask about Gladius, Shellmate, DevNet MCP, Kopis or Steven…"
                className="min-h-[64px] flex-1 resize-none border-2 border-ink bg-cream px-3 py-2 text-[13.5px] leading-snug outline-none focus:bg-white"
                disabled={streaming}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="border-2 border-ink bg-accent px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-ink disabled:opacity-40"
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
