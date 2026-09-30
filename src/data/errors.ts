/**
 * One error type for the whole data layer, with a bilingual message.
 *
 * UI never inspects `error.message` — it switches on `kind` and calls
 * `errorMessage(kind, lang)` so wording stays consistent across the app.
 */
import { translate, type Lang, type TKey } from "@/lib/i18n";

export type DataErrorKind =
  /** No network / request never reached the server. */
  | "network"
  /** Session expired, token invalid, or signed out. */
  | "session"
  /** Signed in, but RLS said no (`is_admin()` = false). */
  | "forbidden"
  /** Client-side or constraint validation failure. */
  | "validation"
  /** Supabase rejected the e-mail/password combination. */
  | "credentials"
  /** Primary key already exists (duplicate inventory number). */
  | "conflict"
  /** A category/brand is still referenced by N products. */
  | "inuse"
  /** Row or storage object does not exist. */
  | "notfound"
  /** Project URL / key missing or malformed. */
  | "config"
  /** Anything we could not classify. */
  | "unknown";

export class DataError extends Error {
  readonly kind: DataErrorKind;
  /** The underlying Supabase/Postgres code, kept for debugging. */
  readonly code: string | null;
  /** Interpolation values for the translated message (e.g. `{n}` usage count). */
  readonly params: Readonly<Record<string, string | number>> | null;

  constructor(
    kind: DataErrorKind,
    message: string,
    cause?: unknown,
    code?: string | null,
    params?: Readonly<Record<string, string | number>>,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "DataError";
    this.kind = kind;
    this.code = code ?? null;
    this.params = params ?? null;
  }
}

/** Map a PostgREST / Supabase error object onto a `DataErrorKind`. */
export function classifySupabaseError(error: {
  code?: string | null;
  message?: string | null;
  status?: number | number | undefined;
}): DataErrorKind {
  const code = (error.code ?? "").toUpperCase();
  const message = (error.message ?? "").toLowerCase();

  if (code === "23505") return "conflict";
  if (code.startsWith("23")) return "validation";
  if (code === "42501" || message.includes("row-level security")) return "forbidden";
  if (code === "PGRST301" || code === "401" || error.status === 401) return "session";
  if (code === "403" || error.status === 403) return "forbidden";
  if (code === "PGRST116" || code === "404" || error.status === 404) return "notfound";
  if (code === "22P02") return "validation";
  return "unknown";
}

/** Wrap any thrown value into a `DataError`. */
export function toDataError(error: unknown): DataError {
  if (error instanceof DataError) return error;

  if (error instanceof TypeError) {
    // `fetch` rejects with TypeError when the request never completes.
    return new DataError("network", error.message, error);
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const candidate = error as { code?: string | null; message?: string | null; status?: number };
    const kind = classifySupabaseError(candidate);
    return new DataError(kind, candidate.message ?? String(error), error, candidate.code ?? null);
  }

  if (error instanceof Error) {
    if (/session|jwt|refresh token|not authenticated/i.test(error.message)) {
      return new DataError("session", error.message, error);
    }
    return new DataError("unknown", error.message, error);
  }

  return new DataError("unknown", String(error), error);
}

/** Human-readable, bilingual copy for each failure kind. */
const MESSAGES: Record<DataErrorKind, TKey> = {
  network: "error.network",
  session: "error.session",
  forbidden: "error.forbidden",
  validation: "error.validation",
  credentials: "error.credentials",
  conflict: "error.conflict",
  inuse: "error.inUse",
  notfound: "error.notfound",
  config: "error.config",
  unknown: "error.unknown",
};

export function errorMessageKey(kind: DataErrorKind): TKey {
  return MESSAGES[kind];
}

export function errorMessage(
  kind: DataErrorKind,
  lang: Lang,
  params?: Readonly<Record<string, string | number>>,
): string {
  return translate(lang, MESSAGES[kind], params);
}
