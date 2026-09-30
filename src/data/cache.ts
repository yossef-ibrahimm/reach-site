/**
 * Stale-while-revalidate cache on top of localStorage.
 *
 * Pure functions over a `Storage`-shaped object so they can be unit-tested
 * without a browser. The contract:
 *
 *   readCache()  -> returns the payload immediately, plus whether it is stale.
 *                   The caller renders it right away and revalidates in the
 *                   background (classic SWR).
 *   writeCache() -> stores a versioned envelope so old shapes are discarded
 *                   instead of crashing the reader.
 */

/** Bump when the cached row shape changes. */
export const CACHE_VERSION = 2;

/** How long a cached list is considered fresh. */
export const DEFAULT_STALE_MS = 5 * 60 * 1000;

export const PRODUCTS_CACHE_KEY = "eltawkol.cache.products.v2";
export const TAXONOMY_CACHE_KEY = "eltawkol.cache.taxonomy.v2";

export type CacheEnvelope<T> = {
  v: number;
  at: number;
  data: T;
};

/** Minimal slice of the Storage API — lets tests pass a plain object. */
export type ReadableStorage = {
  getItem(key: string): string | null;
};

export type WritableStorage = ReadableStorage & {
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type CacheHit<T> = {
  data: T;
  /** `true` when the entry is older than `staleMs` and should be revalidated. */
  stale: boolean;
  /** Epoch milliseconds the entry was written, or `null` if unknown. */
  at: number | null;
};

export function readCache<T>(
  storage: ReadableStorage | null,
  key: string,
  staleMs: number = DEFAULT_STALE_MS,
  now: number = Date.now(),
): CacheHit<T> | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const envelope = parsed as Partial<CacheEnvelope<T>>;
  if (envelope.v !== CACHE_VERSION) return null;
  if (typeof envelope.at !== "number" || !("data" in envelope)) return null;

  return {
    data: envelope.data as T,
    stale: now - envelope.at > staleMs,
    at: envelope.at,
  };
}

export function writeCache<T>(
  storage: WritableStorage | null,
  key: string,
  data: T,
  now: number = Date.now(),
): void {
  if (!storage) return;
  const envelope: CacheEnvelope<T> = { v: CACHE_VERSION, at: now, data };
  try {
    storage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* quota exceeded / private mode — the in-memory value still works */
  }
}

export function clearCache(storage: WritableStorage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

/** `localStorage` when it is actually usable, otherwise `null`. */
export function browserStorage(): WritableStorage | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = "__eltawkol_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
