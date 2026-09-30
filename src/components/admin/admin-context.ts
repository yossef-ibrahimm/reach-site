/**
 * Context object + `useAdmin()` for the admin area.
 *
 * Lives in a `.ts` file (same convention as `src/lib/prefs-context.ts`) so the
 * provider module exports nothing but a component and fast-refresh keeps
 * working while you edit the panels.
 */
import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

import type { ThrottleState } from "@/lib/login-throttle";

export type AdminStatus = "checking" | "anonymous" | "forbidden" | "ready";

export type AdminContextValue = {
  status: AdminStatus;
  session: Session | null;
  email: string | null;
  /** Throttle state backing the login form. */
  throttle: ThrottleState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-runs `is_admin()` — used by the "check again" button on the 403 screen. */
  recheck: () => Promise<void>;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used inside <AdminAuthProvider>");
  return value;
}
