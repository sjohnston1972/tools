import { useEffect, useState } from "react";

type Shot = { file: string; url: string };
interface Props {
  slug: string;
  name: string;
  accent: string;
  children?: React.ReactNode;
}

// Detail-page hero preview. Shows the tool's first (hero) screenshot once it
// loads, falling back to the stylised ToolMock (passed as children) when there
// are no uploads. Initial render is the mock so SSR and first client render
// agree; the screenshot swaps in after the fetch resolves.
export default function HeroPreview({ slug, name, accent, children }: Props) {
  const [hero, setHero] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/screenshots?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d: { images?: Shot[] }) => {
        if (active && d.images && d.images.length > 0) setHero(d.images[0].url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <>
      <div className="overflow-hidden border border-line bg-cream-2">
        <div className="h-[3px]" style={{ background: accent }}></div>
        <div className="relative aspect-[16/9]">
          {hero ? (
            <img
              src={hero}
              alt={`${name} interface`}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-5 overflow-hidden border border-line md:inset-8">
              {children}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
        {hero ? `Fig. 01 · ${name}` : "Fig. 01 · stylised interface preview"}
      </div>
    </>
  );
}
