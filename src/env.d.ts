/// <reference path="../.astro/types.d.ts" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}

interface Env {
  DEEPSEEK_API_KEY: string;
  RATE_LIMIT_PER_WINDOW: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  DAILY_TOKEN_BUDGET: string;
  RATE_KV: KVNamespace;
  ASSETS: Fetcher;
  SCREENSHOTS: R2Bucket;
  ADMIN_PIN: string;
}
