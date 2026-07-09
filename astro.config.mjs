// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: { enabled: true },
    // Astro sessions are never used on this site, so the default SESSION KV
    // binding is intentionally absent from wrangler.jsonc.
  }),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  site: "https://tools.clydeford.net",
  vite: {
    ssr: {
      external: ["node:async_hooks"],
    },
  },
});
