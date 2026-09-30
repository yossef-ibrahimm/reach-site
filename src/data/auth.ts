/**
 * All Supabase Auth calls. The public site never calls this module; only the
 * admin area does, so `@supabase/auth-js` extra surface stays out of the
 * visitor bundle (auth lives behind the lazy admin route).
 */
import type { Session, User } from "@supabase/supabase-js";

import { getSupabase } from "@/data/client";
import { DataError, toDataError } from "@/data/errors";

export type AuthState = {
  session: Session | null;
  user: User | null;
};

export async function signIn(email: string, password: string): Promise<AuthState> {
  const trimmed = email.trim();
  if (!trimmed || !password) {
    throw new DataError("validation", "email and password are required");
  }
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    if (error) {
      // Supabase deliberately returns the same message for "unknown user" and
      // "wrong password" — keep it that way, never leak which one it was.
      const kind =
        error.status === 400 || error.status === 401 || /invalid login/i.test(error.message)
          ? "credentials"
          : "session";
      throw new DataError(kind, error.message, error, error.status ? String(error.status) : null);
    }
    return { session: data.session, user: data.user };
  } catch (error) {
    throw toDataError(error);
  }
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw new DataError("session", error.message, error, error.code ?? null);
  } catch (error) {
    throw toDataError(error);
  }
}

export async function getSession(): Promise<Session | null> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new DataError("session", error.message, error, error.code ?? null);
    return data.session;
  } catch (error) {
    throw toDataError(error);
  }
}

/**
 * The single source of truth for "may this session touch the database".
 * Talks to `is_admin()` (SECURITY DEFINER) in schema.sql, which is the ONLY
 * thing that decides — never a client-side email allowlist.
 */
export async function isAdminSession(session: Session | null): Promise<boolean> {
  if (!session) return false;
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("is_admin");
    if (error) throw toDataError(error);
    return data === true;
  } catch (error) {
    const dataError = toDataError(error);
    if (dataError.kind === "session") return false;
    throw dataError;
  }
}

/** Throws `forbidden` when the signed-in user is not an admin. */
export async function assertAdmin(session: Session | null): Promise<void> {
  if (!session) throw new DataError("session", "not signed in");
  if (!(await isAdminSession(session))) throw new DataError("forbidden", "not an admin");
}

export function subscribeToAuth(callback: (state: AuthState) => void): () => void {
  let active = true;
  let unsubscribe: (() => void) | undefined;

  void getSupabase()
    .then((supabase) => {
      if (!active) return;
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback({ session, user: session?.user ?? null });
      });
      unsubscribe = () => data.subscription.unsubscribe();
    })
    .catch(() => {
      /* config errors are surfaced by isAdminSession, not here */
    });

  return () => {
    active = false;
    unsubscribe?.();
  };
}
