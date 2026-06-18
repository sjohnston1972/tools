import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminPin, onAdminChange } from "../lib/adminClient";

type Shot = { file: string; url: string };
interface Props {
  slug: string;
  name: string;
  accent: string;
}

export default function ScreenshotGallery({ slug, name, accent }: Props) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [admin, setAdmin] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Set when a drag completes so the trailing click doesn't open the lightbox.
  const justDragged = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/screenshots?slug=${encodeURIComponent(slug)}`);
      const data = (await res.json()) as { images?: Shot[] };
      setShots(data.images || []);
    } catch {
      setShots([]);
    }
  }, [slug]);

  // This gallery is an admin-only management surface; the public sees
  // screenshots through the hero panel instead. Only fetch when in admin mode.
  useEffect(() => {
    if (admin) load();
  }, [admin, load]);

  useEffect(() => {
    const sync = () => setAdmin(!!getAdminPin());
    sync();
    return onAdminChange(sync);
  }, []);

  // Lightbox keyboard navigation.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % shots.length));
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? i : (i - 1 + shots.length) % shots.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, shots.length]);

  // Paste-to-upload: in admin mode, pasting image(s) from the clipboard uploads
  // them, respecting the per-tool cap.
  useEffect(() => {
    if (!admin) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length === 0) return;
      e.preventDefault();
      if (busy) return;
      const room = 10 - shots.length;
      if (room <= 0) {
        setMsg("Limit reached (10 screenshots per tool). Delete one first.");
        return;
      }
      upload(files.slice(0, room));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [admin, busy, shots.length]);

  async function upload(files: FileList | File[]) {
    const pin = getAdminPin();
    if (!pin) return;
    setBusy(true);
    setMsg(null);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("slug", slug);
      form.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "x-admin-pin": pin },
          body: form,
        });
        const data = (await res.json()) as { images?: Shot[]; message?: string };
        if (!res.ok) {
          setMsg(data.message || "Upload failed.");
          break;
        }
        if (data.images) setShots(data.images);
      } catch {
        setMsg("Network error during upload.");
        break;
      }
    }
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function remove(file: string) {
    const pin = getAdminPin();
    if (!pin) return;
    if (!window.confirm("Delete this screenshot?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify({ slug, file }),
      });
      const data = (await res.json()) as { images?: Shot[]; message?: string };
      if (!res.ok) {
        setMsg(data.message || "Delete failed.");
      } else if (data.images) {
        setShots(data.images);
      }
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  // Persist the current order to the server. Optimistic: `next` is already
  // shown; on failure we surface a message and reload to revert.
  async function persistOrder(next: Shot[]) {
    const pin = getAdminPin();
    if (!pin) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify({ slug, order: next.map((s) => s.file) }),
      });
      const data = (await res.json()) as { images?: Shot[]; message?: string };
      if (!res.ok) {
        setMsg(data.message || "Could not save order.");
        load();
      } else if (data.images) {
        setShots(data.images);
      }
    } catch {
      setMsg("Network error.");
      load();
    } finally {
      setBusy(false);
    }
  }

  function onDrop(target: number) {
    setOverIndex(null);
    const from = dragIndex;
    setDragIndex(null);
    if (from === null || from === target) return;
    justDragged.current = true;
    const next = [...shots];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    setShots(next);
    persistOrder(next);
  }

  // Admin-only: the public never sees this management strip (screenshots show
  // in the hero panel instead).
  if (!admin) return null;

  return (
    <section className="border-t border-line px-5 py-14 md:px-10 md:py-16">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Screenshots</h2>
        {shots.length > 0 && (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            {shots.length} · click to enlarge
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {shots.map((s, i) => (
          <div
            key={s.file}
            className={`group relative ${admin ? "cursor-move" : ""} ${
              dragIndex === i ? "opacity-40" : ""
            }`}
            draggable={admin && !busy}
            onDragStart={() => admin && setDragIndex(i)}
            onDragEnter={() => admin && dragIndex !== null && setOverIndex(i)}
            onDragOver={(e) => admin && dragIndex !== null && e.preventDefault()}
            onDrop={() => admin && onDrop(i)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
          >
            <button
              type="button"
              onClick={() => {
                // Suppress the click that fires at the end of a drag.
                if (justDragged.current) {
                  justDragged.current = false;
                  return;
                }
                setLightbox(i);
              }}
              className={`block h-24 w-40 overflow-hidden border bg-cream-2 transition-colors hover:border-ink ${
                overIndex === i && dragIndex !== i ? "border-accent" : "border-line"
              }`}
              style={overIndex === i && dragIndex !== i ? { borderColor: accent } : undefined}
              aria-label={`Enlarge screenshot ${i + 1}`}
            >
              <img
                src={s.url}
                alt={`${name} screenshot ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover object-top"
              />
            </button>
            {admin && i === 0 && (
              <span
                className="pointer-events-none absolute left-1 top-1 bg-ink/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cream"
                style={{ background: accent }}
              >
                Hero
              </span>
            )}
            {admin && (
              <button
                type="button"
                onClick={() => remove(s.file)}
                disabled={busy}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center bg-ink/80 text-[11px] text-cream opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                aria-label="Delete screenshot"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {admin && shots.length < 10 && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="flex h-24 w-40 flex-col items-center justify-center gap-1 border border-dashed border-line text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
            style={{ borderColor: busy ? undefined : undefined }}
          >
            <span className="text-2xl leading-none" style={{ color: accent }}>+</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
              {busy ? "Uploading…" : "Add or paste"}
            </span>
          </button>
        )}
      </div>

      {admin && (
        <p className="mt-3 font-mono text-[10.5px] text-muted">
          Admin mode · {shots.length}/10 used · drag to reorder (first = hero) ·
          click + or paste (Ctrl/⌘V) to add · PNG / JPEG / WebP / GIF / AVIF, max 6 MB
        </p>
      )}
      {msg && <p className="mt-2 text-[12px] text-accent">{msg}</p>}

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        multiple
        hidden
        onChange={(e) => e.target.files && e.target.files.length > 0 && upload(e.target.files)}
      />

      {/* lightbox slideshow */}
      {lightbox !== null && shots[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightbox(null);
          }}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center text-cream/70 transition-colors hover:text-cream"
            aria-label="Close"
          >
            ✕
          </button>

          {shots.length > 1 && (
            <button
              type="button"
              onClick={() => setLightbox((i) => (i === null ? i : (i - 1 + shots.length) % shots.length))}
              className="absolute left-3 flex h-12 w-12 items-center justify-center text-2xl text-cream/70 transition-colors hover:text-cream md:left-6"
              aria-label="Previous"
            >
              ‹
            </button>
          )}

          <figure className="max-h-[88vh] max-w-[92vw]">
            <img
              src={shots[lightbox].url}
              alt={`${name} screenshot ${lightbox + 1}`}
              className="max-h-[82vh] max-w-[92vw] border border-cream/15 object-contain"
            />
            <figcaption className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-cream/55">
              {name} · {lightbox + 1} / {shots.length}
            </figcaption>
          </figure>

          {shots.length > 1 && (
            <button
              type="button"
              onClick={() => setLightbox((i) => (i === null ? i : (i + 1) % shots.length))}
              className="absolute right-3 flex h-12 w-12 items-center justify-center text-2xl text-cream/70 transition-colors hover:text-cream md:right-6"
              aria-label="Next"
            >
              ›
            </button>
          )}
        </div>
      )}
    </section>
  );
}
