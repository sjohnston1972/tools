// In-memory stand-ins for the Cloudflare bindings used by src/lib. TTLs are
// tracked against Date.now() so vi.setSystemTime works for window-rollover
// tests. Only the surface the library code touches is implemented.

export type FakeKV = KVNamespace & {
  store: Map<string, { value: string; expiresAt: number | null }>;
};

export function fakeKV(): FakeKV {
  const store = new Map<string, { value: string; expiresAt: number | null }>();
  const kv = {
    store,
    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }) {
      store.set(key, {
        value,
        expiresAt: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null,
      });
    },
  };
  return kv as unknown as FakeKV;
}

export function fakeR2(keys: string[]): R2Bucket {
  const bucket = {
    async list({ prefix }: { prefix: string }) {
      return {
        objects: keys
          .filter((k) => k.startsWith(prefix))
          .map((key) => ({ key })),
      };
    },
  };
  return bucket as unknown as R2Bucket;
}
