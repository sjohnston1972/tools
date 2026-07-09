-- LOCAL DEVELOPMENT ONLY.
-- The production `chat-logs` D1 database is SHARED across several of the
-- owner's sites and already has this table. Never run this (or any migration)
-- against the remote database. Apply locally with:
--   npx wrangler d1 execute chat-logs --local --file schema/chat_logs.sql
CREATE TABLE IF NOT EXISTS chat_logs (
  site          TEXT    NOT NULL,
  ip            TEXT    NOT NULL,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  transcript    TEXT    NOT NULL,
  UNIQUE(site, ip)
);
