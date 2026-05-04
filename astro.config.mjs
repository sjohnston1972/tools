// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: { enabled: true },
    // We don't use Astro sessions on this site, so don't auto-bind a SESSION KV.
    sessionKVBindingName: false,
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
