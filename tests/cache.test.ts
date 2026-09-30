import { describe, expect, it } from "vitest";

import {
  CACHE_VERSION,
  DEFAULT_STALE_MS,
  readCache,
  writeCache,
  clearCache,
  type WritableStorage,
} from "@/data/cache";

function memoryStorage(initial?: Record<string, string>): WritableStorage & {
  dump(): Record<string, string>;
} {
  const store: Record<string, string> = { ...initial };
  return {
    getItem: (key) => (key in store ? (store[key] as string) : null),
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    dump: () => store,
  };
}

describe("cache", () => {
  it("round-trips a payload", () => {
    const storage = memoryStorage();
    const rows = [{ id: 1 }, { id: 2 }];

    writeCache(storage, "k", rows, 1_000);
    const hit = readCache<typeof rows>(storage, "k", DEFAULT_STALE_MS, 1_000);

    expect(hit?.data).toEqual(rows);
    expect(hit?.at).toBe(1_000);
    expect(hit?.stale).toBe(false);
  });

  it("marks an entry stale once it is older than the TTL", () => {
    const storage = memoryStorage();
    writeCache(storage, "k", [1, 2, 3], 0);

    expect(readCache(storage, "k", 1_000, 999)?.stale).toBe(false);
    expect(readCache(storage, "k", 1_000, 1_001)?.stale).toBe(true);
  });

  it("discards entries written by an older cache version", () => {
    const storage = memoryStorage({
      k: JSON.stringify({ v: CACHE_VERSION - 1, at: 0, data: "old" }),
    });
    expect(readCache(storage, "k")).toBeNull();
  });

  it("survives corrupt JSON instead of throwing", () => {
    const storage = memoryStorage({ k: "{not json" });
    expect(readCache(storage, "k")).toBeNull();
  });

  it("survives a non-object payload", () => {
    const storage = memoryStorage({ k: JSON.stringify("a string") });
    expect(readCache(storage, "k")).toBeNull();
  });

  it("returns null for a missing key or a null storage", () => {
    expect(readCache(memoryStorage(), "nope")).toBeNull();
    expect(readCache(null, "nope")).toBeNull();
  });

  it("clears an entry", () => {
    const storage = memoryStorage();
    writeCache(storage, "k", 1, 0);
    clearCache(storage, "k");
    expect(readCache(storage, "k")).toBeNull();
  });

  it("never throws when setItem rejects (quota exceeded)", () => {
    const storage: WritableStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("nope");
      },
    };
    expect(() => writeCache(storage, "k", 1)).not.toThrow();
    expect(() => clearCache(storage, "k")).not.toThrow();
  });
});
