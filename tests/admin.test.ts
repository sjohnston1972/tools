import { describe, expect, it } from "vitest";
import {
  checkAdminPin,
  getOrder,
  isValidSlug,
  listShots,
  setOrder,
} from "../src/lib/admin";
import { TOOLS } from "../src/data/tools";
import { fakeKV, fakeR2 } from "./fakes";

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    ADMIN_PIN: "1234",
    RATE_KV: fakeKV(),
    ...overrides,
  } as Env;
}

describe("checkAdminPin", () => {
  it("accepts the correct PIN", async () => {
    expect(await checkAdminPin(makeEnv(), "1234", "1.2.3.4")).toEqual({ ok: true });
  });

  it("accepts when the secret has a trailing newline (shell pipe artifact)", async () => {
    const env = makeEnv({ ADMIN_PIN: "1234\n" });
    expect(await checkAdminPin(env, "1234", "1.2.3.4")).toEqual({ ok: true });
  });

  it("rejects a wrong PIN with 401 and counts the attempt", async () => {
    const env = makeEnv();
    const result = await checkAdminPin(env, "9999", "1.2.3.4");
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect((env.RATE_KV as ReturnType<typeof fakeKV>).store.get("pin_attempts:1.2.3.4")?.value).toBe("1");
  });

  it("locks out after 10 failed attempts, even with the correct PIN", async () => {
    const env = makeEnv();
    for (let i = 0; i < 10; i++) {
      await checkAdminPin(env, "9999", "1.2.3.4");
    }
    const result = await checkAdminPin(env, "1234", "1.2.3.4");
    expect(result).toMatchObject({ ok: false, status: 429 });
  });

  it("does not lock out a different ip", async () => {
    const env = makeEnv();
    for (let i = 0; i < 10; i++) {
      await checkAdminPin(env, "9999", "1.2.3.4");
    }
    expect(await checkAdminPin(env, "1234", "5.6.7.8")).toEqual({ ok: true });
  });

  it("returns 500 when ADMIN_PIN is not configured", async () => {
    const env = makeEnv({ ADMIN_PIN: undefined as unknown as string });
    const result = await checkAdminPin(env, "1234", "1.2.3.4");
    expect(result).toMatchObject({ ok: false, status: 500 });
  });

  it("rejects non-string pins", async () => {
    const result = await checkAdminPin(makeEnv(), 1234, "1.2.3.4");
    expect(result).toMatchObject({ ok: false, status: 401 });
  });
});

describe("isValidSlug", () => {
  it("accepts all eight known tool slugs", () => {
    expect(TOOLS).toHaveLength(8);
    for (const tool of TOOLS) {
      expect(isValidSlug(tool.slug)).toBe(true);
    }
  });

  it("rejects unknown or non-string values", () => {
    expect(isValidSlug("kopis")).toBe(false);
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug(undefined)).toBe(false);
    expect(isValidSlug(42)).toBe(false);
  });
});

describe("setOrder / getOrder", () => {
  it("drops filenames not present in R2, dedupes, and strips path-y entries", async () => {
    const env = makeEnv({
      SCREENSHOTS: fakeR2(["gladius/a.png", "gladius/b.png"]),
    });
    await setOrder(env, "gladius", [
      "b.png",
      "b.png", // duplicate
      "stale.png", // not in R2
      "../evil.png", // contains a slash
      "a.png",
    ]);
    expect(await getOrder(env, "gladius")).toEqual(["b.png", "a.png"]);
  });

  it("returns [] when no order manifest exists", async () => {
    const env = makeEnv({ SCREENSHOTS: fakeR2([]) });
    expect(await getOrder(env, "gladius")).toEqual([]);
  });
});

describe("listShots", () => {
  it("lists chronologically (key sort) when no manifest exists", async () => {
    const env = makeEnv({
      SCREENSHOTS: fakeR2(["gladius/002-b.png", "gladius/001-a.png"]),
    });
    const shots = await listShots(env, "gladius");
    expect(shots.map((s) => s.file)).toEqual(["001-a.png", "002-b.png"]);
    expect(shots[0].url).toBe("/api/img/gladius/001-a.png");
  });

  it("puts manifest-ranked files first, then unranked chronologically", async () => {
    const env = makeEnv({
      SCREENSHOTS: fakeR2([
        "gladius/001-a.png",
        "gladius/002-b.png",
        "gladius/003-c.png",
      ]),
    });
    await setOrder(env, "gladius", ["003-c.png", "001-a.png"]);
    const shots = await listShots(env, "gladius");
    expect(shots.map((s) => s.file)).toEqual([
      "003-c.png", // rank 0
      "001-a.png", // rank 1
      "002-b.png", // unranked, appended chronologically
    ]);
  });

  it("ignores stale manifest entries for deleted files", async () => {
    const env = makeEnv({ SCREENSHOTS: fakeR2(["gladius/001-a.png"]) });
    // Manifest written while b existed, b since deleted from R2.
    await (env.RATE_KV as ReturnType<typeof fakeKV>).put(
      "order:gladius",
      JSON.stringify(["002-b.png", "001-a.png"]),
    );
    const shots = await listShots(env, "gladius");
    expect(shots.map((s) => s.file)).toEqual(["001-a.png"]);
  });
});
