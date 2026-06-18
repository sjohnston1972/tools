-- Test seed data for the shared chat-logs D1 database.
-- Uses RFC-5737 documentation IP ranges (203.0.113.x / 198.51.100.x / 192.0.2.x)
-- so these rows are unmistakably synthetic test entries.
-- Transcript schema matches what logChat() writes: {"messages":[...],"cta":bool}

INSERT INTO chat_logs (site, ip, created_at, updated_at, request_count, transcript) VALUES
('tools.clydeford.net', '203.0.113.10', '2026-06-18T15:43:53.000Z', '2026-06-18T15:43:53.000Z', 1,
 json('{"messages":[{"role":"user","content":"What is GLADIUS?"},{"role":"assistant","content":"GLADIUS is an AI-powered Cisco network security auditor. It SSHes into IOS/IOS-XE devices, runs show commands, and scores compliance against NIST 800-53 and the CIS benchmark."}],"cta":false}'))
ON CONFLICT(site, ip) DO UPDATE SET updated_at=excluded.updated_at, transcript=excluded.transcript;

INSERT INTO chat_logs (site, ip, created_at, updated_at, request_count, transcript) VALUES
('tools.clydeford.net', '203.0.113.22', '2026-06-18T16:43:53.000Z', '2026-06-18T16:43:53.000Z', 1,
 json('{"messages":[{"role":"user","content":"Tell me about SHELLMATE."},{"role":"assistant","content":"ShellMate is a split-screen web terminal with an AI copilot for network engineers. It runs multiple SSH/serial sessions with suggest-and-approve command execution."}],"cta":false}'))
ON CONFLICT(site, ip) DO UPDATE SET updated_at=excluded.updated_at, transcript=excluded.transcript;

INSERT INTO chat_logs (site, ip, created_at, updated_at, request_count, transcript) VALUES
('demo.clydeford.net', '198.51.100.5', '2026-06-18T17:43:53.000Z', '2026-06-18T17:43:53.000Z', 3,
 json('{"messages":[{"role":"user","content":"Who is Steven Johnston?"},{"role":"assistant","content":"Steven is an engineer skilled in infrastructure, security, cloud/hybrid, collaboration, datacentre, automation, and AI."},{"role":"user","content":"What can he build?"},{"role":"assistant","content":"He builds AI-driven tooling like GLADIUS, SHELLMATE, ARCHIE, and more — full Docker stacks with LLM integration."},{"role":"user","content":"How do I contact him?"},{"role":"assistant","content":"You can reach out via the contact details on the site. Want me to point you to a specific tool first?"}],"cta":true}'))
ON CONFLICT(site, ip) DO UPDATE SET updated_at=excluded.updated_at, transcript=excluded.transcript;

INSERT INTO chat_logs (site, ip, created_at, updated_at, request_count, transcript) VALUES
('apps.clydeford.net', '192.0.2.44', '2026-06-18T18:43:53.000Z', '2026-06-18T18:43:53.000Z', 1,
 json('{"messages":[{"role":"user","content":"Is any of this open source?"},{"role":"assistant","content":"These are portfolio tools showcasing Steven''s work. Reach out if you''d like a demo or to discuss access."}],"cta":false}'))
ON CONFLICT(site, ip) DO UPDATE SET updated_at=excluded.updated_at, transcript=excluded.transcript;

INSERT INTO chat_logs (site, ip, created_at, updated_at, request_count, transcript) VALUES
('tools.clydeford.net', '198.51.100.77', '2026-06-18T19:43:53.000Z', '2026-06-18T19:43:53.000Z', 2,
 json('{"messages":[{"role":"user","content":"What does ARCHIE do?"},{"role":"assistant","content":"ARCHIE is an AI assistant for architecture and design workflows."},{"role":"user","content":"Can I try it?"},{"role":"assistant","content":"Absolutely — let me know your use case and I can walk you through it."}],"cta":true}'))
ON CONFLICT(site, ip) DO UPDATE SET updated_at=excluded.updated_at, transcript=excluded.transcript;
