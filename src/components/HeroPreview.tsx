import { useEffect, useState } from "react";

type Shot = { file: string; url: string };
interface Props {
  slug: string;
  name: string;
  accent: string;
  children?: React.ReactNode;
}

// Detail-page hero preview. Shows the tool's uploaded screenshots (first =
// hero) with prev/next navigation, falling back to the stylised ToolMock
// (passed as children) when there are no uploads. Images use object-contain so
// the full capture is visible — never cropped left/right. Initial render is the
// mock so SSR and first client render agree before the fetch resolves.
export default function HeroPreview({ slug, name, accent, children }: Props) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/screenshots?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d: { images?: Shot[] }) => {
        if (active && d.images) setShots(d.images);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug]);

  const has = shots.length > 0;
  const idx = has ? ((i % shots.length) + shots.length) % shots.length : 0;
  const go = (delta: number) => setI((n) => n + delta);

  return (
    <>
      <div className="overflow-hidden border border-line bg-cream-2">
        <div className="h-[3px]" style={{ background: accent }}></div>
        <div className="relative aspect-[16/9]">
          {has ? (
            <>
              <img
                key={shots[idx].file}
                src={shots[idx].url}
                alt={`${name} screenshot ${idx + 1}`}
                className="absolute inset-0 h-full w-full object-contain"
              />
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
                  <div className="absolute bottom-2 right-2 bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-cream">
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
        {has ? `Fig. 01 · ${name}` : "Fig. 01 · stylised interface preview"}
      </div>
    </>
  );
}
