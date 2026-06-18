import { useEffect, useState } from "react";

type Shot = { file: string; url: string };
interface Props {
  slug: string;
  name: string;
  children?: React.ReactNode;
}

// Homepage tile thumbnail. Shows the tool's first (hero) screenshot when one
// exists, else the stylised ToolMock (passed as children). Must live inside a
// `relative` box: both states are positioned absolute inset-0 so they fill the
// frame regardless of the astro-island wrapper. Initial render is the mock so
// SSR and first client render agree before the fetch resolves.
export default function TileThumb({ slug, name, children }: Props) {
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

  if (hero) {
    return (
      <img
        src={hero}
        alt={`${name} preview`}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
    );
  }
  return <div className="absolute inset-0">{children}</div>;
}
