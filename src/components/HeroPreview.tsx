import { useCallback, useEffect, useState } from "react";

type Shot = { file: string; url: string };
interface Props {
  slug: string;
  name: string;
  accent: string;
  children?: React.ReactNode;
}

// Detail-page hero preview. Shows the tool's uploaded screenshots (first =
// hero) with prev/next navigation and a click-to-enlarge lightbox, falling back
// to the stylised ToolMock (passed as children) when there are no uploads.
// Images use object-contain so the full capture is visible — never cropped.
// Initial render is the mock so SSR and first client render agree before the
// fetch resolves.
export default function HeroPreview({ slug, name, accent, children }: Props) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/screenshots?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json() as Promise<{ images?: Shot[] }>)
      .then((d) => {
        if (active && d.images) setShots(d.images);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug]);

  const has = shots.length > 0;
  const idx = has ? ((i % shots.length) + shots.length) % shots.length : 0;
  const go = useCallback((delta: number) => setI((n) => n + delta), []);

  // Lightbox keyboard navigation.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <div>
      <div className="overflow-hidden border border-line bg-cream-2">
        <div className="h-[3px]" style={{ background: accent }}></div>
        <div className="relative aspect-[16/9]">
          {has ? (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="absolute inset-0 block cursor-zoom-in"
                aria-label="Enlarge screenshot"
              >
                <img
                  key={shots[idx].file}
                  src={shots[idx].url}
                  alt={`${name} screenshot ${idx + 1}`}
                  className="h-full w-full object-contain"
                />
              </button>
              {shots.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Previous screenshot"
                    className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-ink/70 text-xl text-cream transition-colors hover:bg-ink md:left-3"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Next screenshot"
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-ink/70 text-xl text-cream transition-colors hover:bg-ink md:right-3"
                  >
                    ›
                  </button>
                  <div className="pointer-events-none absolute bottom-2 right-2 bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-cream">
                    {idx + 1} / {shots.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-5 overflow-hidden border border-line md:inset-8">
              {children}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
        {has ? `Fig. 01 · ${name} · click to enlarge` : "Fig. 01 · stylised interface preview"}
      </div>

      {/* lightbox slideshow */}
      {open && has && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center text-cream/70 transition-colors hover:text-cream"
            aria-label="Close"
          >
            ✕
          </button>

          {shots.length > 1 && (
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 flex h-12 w-12 items-center justify-center text-2xl text-cream/70 transition-colors hover:text-cream md:left-6"
              aria-label="Previous"
            >
              ‹
            </button>
          )}

          <figure className="max-h-[88vh] max-w-[92vw]">
            <img
              src={shots[idx].url}
              alt={`${name} screenshot ${idx + 1}`}
              className="max-h-[82vh] max-w-[92vw] border border-cream/15 object-contain"
            />
            <figcaption className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-cream/55">
              {name} · {idx + 1} / {shots.length}
            </figcaption>
          </figure>

          {shots.length > 1 && (
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 flex h-12 w-12 items-center justify-center text-2xl text-cream/70 transition-colors hover:text-cream md:right-6"
              aria-label="Next"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
