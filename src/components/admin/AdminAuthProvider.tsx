/**
 * Session + admin-authorisation state for the whole admin area.
 *
 * Source of truth is `is_admin()` in Postgres. The UI never decides access by
 * comparing emails — it asks the database, and until the answer arrives it
 * shows "checking", not content.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  getSession,
  isAdminSession,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  subscribeToAuth,
} from "@/data/auth";
import { DataError, toDataError } from "@/data/errors";
import {
  IDLE_THROTTLE,
  checkThrottle,
  registerFailure,
  resetThrottle,
  type ThrottleState,
} from "@/lib/login-throttle";
import {
  AdminContext,
  type AdminContextValue,
  type AdminStatus,
} from "@/components/admin/admin-context";

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AdminStatus>("checking");
  const [session, setSession] = useState<Session | null>(null);
  const [throttle, setThrottle] = useState<ThrottleState>(IDLE_THROTTLE);

  const resolve = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession) {
      setStatus("anonymous");
      return;
    }
    setStatus("checking");
    try {
      setStatus((await isAdminSession(nextSession)) ? "ready" : "forbidden");
    } catch {
      // A network/config failure must never look like "no access" forever:
      // fall back to anonymous so the login form can retry.
      setStatus("anonymous");
    }
  }, []);

  const recheck = useCallback(async () => {
    setStatus("checking");
    try {
      const current = (await getSession()) ?? session;
      await resolve(current);
    } catch {
      setStatus(session ? "forbidden" : "anonymous");
    }
  }, [resolve, session]);

  useEffect(() => {
    let cancelled = false;

    void getSession()
      .then((current) => {
        if (!cancelled) void resolve(current);
      })
      .catch(() => {
        if (!cancelled) setStatus("anonymous");
      });

    const unsubscribe = subscribeToAuth(({ session: next }) => {
      if (!cancelled) void resolve(next);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [resolve]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const now = Date.now();
      const decision = checkThrottle(throttle, now);
      if (!decision.allowed) {
        throw new DataError("session", `throttled for ${decision.waitMs}ms`, undefined, null, {
          s: Math.ceil(decision.waitMs / 1000),
        });
      }

      try {
        const result = await supabaseSignIn(email, password);
        setThrottle(resetThrottle());
        await resolve(result.session);
      } catch (error) {
        setThrottle(registerFailure(throttle, now));
        throw toDataError(error);
      }
    },
    [resolve, throttle],
  );

  const signOut = useCallback(async () => {
    try {
      await supabaseSignOut();
    } finally {
      setThrottle(resetThrottle());
      await resolve(null);
    }
  }, [resolve]);

  const value = useMemo<AdminContextValue>(
    () => ({
      status,
      session,
      email: session?.user.email ?? null,
      throttle,
      signIn,
      signOut,
      recheck,
    }),
    [status, session, throttle, signIn, signOut, recheck],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
