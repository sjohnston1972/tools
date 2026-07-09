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
  DB: D1Database;
  ASSETS: Fetcher;
  SCREENSHOTS: R2Bucket;
  ADMIN_PIN: string;
  // Optional secret salting the chat-log IP hash; a static fallback is used
  // when unset. Set with: npx wrangler secret put LOG_SALT
  LOG_SALT?: string;
}
