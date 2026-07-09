import { describe, expect, it } from "vitest";
import {
  appendTurn,
  MAX_LOGGED_MESSAGES,
  pseudonymizeIp,
  RETENTION_DAYS,
  retentionCutoff,
} from "../src/lib/chatLog";

describe("appendTurn", () => {
  it("starts a fresh transcript when there is no stored row", () => {
    const t = appendTurn(null, "hi", "hello");
    expect(t).toEqual({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
      cta: false,
    });
  });

  it("appends the new turn after existing messages", () => {
    const raw = JSON.stringify({
      messages: [
        { role: "user", content: "first" },
        { role: "assistant", content: "reply" },
      ],
      cta: false,
    });
    const t = appendTurn(raw, "second", "another reply");
    expect(t.messages).toHaveLength(4);
    expect(t.messages[0].content).toBe("first");
    expect(t.messages[3]).toEqual({ role: "assistant", content: "another reply" });
  });

  it("trims the messages array to the last maxMessages entries", () => {
    let raw: string | null = null;
    for (let i = 0; i < 60; i++) {
      raw = JSON.stringify(appendTurn(raw, `q${i}`, `a${i}`, false, 100));
    }
    const t = appendTurn(raw, "final q", "final a", false, 100);
    expect(t.messages).toHaveLength(100);
    expect(t.messages[t.messages.length - 1]).toEqual({
      role: "assistant",
      content: "final a",
    });
    // Oldest messages fell off the front.
    expect(t.messages[0].content).not.toBe("q0");
  });

  it("defaults the cap to MAX_LOGGED_MESSAGES", () => {
    expect(MAX_LOGGED_MESSAGES).toBe(100);
    const many = Array.from({ length: 150 }, (_, i) => ({
      role: "user",
      content: `m${i}`,
    }));
    const raw = JSON.stringify({ messages: many, cta: false });
    const t = appendTurn(raw, "q", "a");
    expect(t.messages).toHaveLength(MAX_LOGGED_MESSAGES);
  });

  it("starts fresh on a corrupted transcript instead of throwing", () => {
    const t = appendTurn("{not json", "q", "a");
    expect(t.messages).toHaveLength(2);
  });

  it("keeps cta sticky once set on the stored transcript", () => {
    const raw = JSON.stringify({ messages: [], cta: true });
    const t = appendTurn(raw, "q", "a", false);
    expect(t.cta).toBe(true);
  });

  it("sets cta when the new turn fires it", () => {
    const t = appendTurn(null, "q", "a", true);
    expect(t.cta).toBe(true);
  });
});

describe("pseudonymizeIp", () => {
  it("returns 16 lowercase hex chars", async () => {
    const key = await pseudonymizeIp("203.0.113.10", "salt");
    expect(key).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic for the same salt + ip", async () => {
    const a = await pseudonymizeIp("203.0.113.10", "salt");
    const b = await pseudonymizeIp("203.0.113.10", "salt");
    expect(a).toBe(b);
  });

  it("differs for a different ip or a different salt", async () => {
    const base = await pseudonymizeIp("203.0.113.10", "salt");
    expect(await pseudonymizeIp("203.0.113.11", "salt")).not.toBe(base);
    expect(await pseudonymizeIp("203.0.113.10", "other")).not.toBe(base);
  });

  it("falls back to a built-in salt when none is provided", async () => {
    const key = await pseudonymizeIp("203.0.113.10");
    expect(key).toMatch(/^[0-9a-f]{16}$/);
    expect(key).not.toBe(await pseudonymizeIp("203.0.113.10", "salt"));
  });
});

describe("retentionCutoff", () => {
  it("returns an ISO string exactly N days before now", () => {
    const now = new Date("2026-07-09T12:00:00.000Z");
    expect(retentionCutoff(now, 90)).toBe("2026-04-10T12:00:00.000Z");
  });

  it("defaults to RETENTION_DAYS", () => {
    expect(RETENTION_DAYS).toBe(90);
    const now = new Date("2026-07-09T12:00:00.000Z");
    expect(retentionCutoff(now)).toBe(retentionCutoff(now, RETENTION_DAYS));
  });
});
