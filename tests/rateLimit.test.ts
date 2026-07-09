import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkDailyBudget,
  checkPerIp,
  recordTokenUsage,
} from "../src/lib/rateLimit";
import { fakeKV } from "./fakes";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkPerIp", () => {
  it("passes and increments while under the limit", async () => {
    const kv = fakeKV();
    for (let i = 0; i < 3; i++) {
      expect(await checkPerIp(kv, "1.2.3.4", 3, 600)).toEqual({ ok: true });
    }
    const bucket = Math.floor(Date.now() / 1000 / 600);
    expect(kv.store.get(`ip:1.2.3.4:${bucket}`)?.value).toBe("3");
  });

  it("returns 429 with a positive retryAfterSeconds at the limit", async () => {
    const kv = fakeKV();
    for (let i = 0; i < 2; i++) await checkPerIp(kv, "1.2.3.4", 2, 600);
    const check = await checkPerIp(kv, "1.2.3.4", 2, 600);
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.status).toBe(429);
      expect(check.retryAfterSeconds).toBeGreaterThan(0);
      expect(check.retryAfterSeconds).toBeLessThanOrEqual(600);
    }
  });

  it("resets the count when the window rolls over", async () => {
    const kv = fakeKV();
    for (let i = 0; i < 2; i++) await checkPerIp(kv, "1.2.3.4", 2, 600);
    expect((await checkPerIp(kv, "1.2.3.4", 2, 600)).ok).toBe(false);

    vi.setSystemTime(new Date("2026-07-09T12:10:00.000Z")); // next 600s bucket
    expect(await checkPerIp(kv, "1.2.3.4", 2, 600)).toEqual({ ok: true });
  });

  it("tracks each ip independently", async () => {
    const kv = fakeKV();
    await checkPerIp(kv, "1.2.3.4", 1, 600);
    expect((await checkPerIp(kv, "1.2.3.4", 1, 600)).ok).toBe(false);
    expect(await checkPerIp(kv, "5.6.7.8", 1, 600)).toEqual({ ok: true });
  });
});

describe("checkDailyBudget", () => {
  it("passes while under budget", async () => {
    const kv = fakeKV();
    await recordTokenUsage(kv, 100);
    expect(await checkDailyBudget(kv, 200)).toEqual({ ok: true });
  });

  it("blocks with retry-until-UTC-midnight when used >= budget", async () => {
    const kv = fakeKV();
    await recordTokenUsage(kv, 300);
    const check = await checkDailyBudget(kv, 300);
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.status).toBe(429);
      // 12:00 UTC -> midnight UTC is 12 hours.
      expect(check.retryAfterSeconds).toBe(12 * 3600);
    }
  });

  it("uses a fresh budget on the next UTC day", async () => {
    const kv = fakeKV();
    await recordTokenUsage(kv, 300);
    expect((await checkDailyBudget(kv, 300)).ok).toBe(false);
    vi.setSystemTime(new Date("2026-07-10T00:00:01.000Z"));
    expect(await checkDailyBudget(kv, 300)).toEqual({ ok: true });
  });
});

describe("recordTokenUsage", () => {
  it("accumulates usage across calls", async () => {
    const kv = fakeKV();
    await recordTokenUsage(kv, 100);
    await recordTokenUsage(kv, 250);
    expect(kv.store.get("budget:2026-07-09")?.value).toBe("350");
  });

  it("ignores zero and negative token counts", async () => {
    const kv = fakeKV();
    await recordTokenUsage(kv, 0);
    await recordTokenUsage(kv, -50);
    expect(kv.store.has("budget:2026-07-09")).toBe(false);
  });
});
