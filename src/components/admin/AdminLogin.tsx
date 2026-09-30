/**
 * Login screen: Supabase password sign-in, throttled client-side, with the
 * failure copy derived from `DataError.kind` so it stays consistent with the
 * rest of the data layer. Never reveals whether the account exists.
 */
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataError, errorMessageKey } from "@/data/errors";
import { translate, type Lang, type TKey } from "@/lib/i18n";
import { checkThrottle, waitSeconds } from "@/lib/login-throttle";
import { useAdmin } from "@/components/admin/admin-context";

type Props = { lang: Lang };

export function AdminLogin({ lang }: Props) {
  const { signIn, throttle } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TKey | null>(null);
  const [errorParams, setErrorParams] = useState<Readonly<Record<string, string | number>> | null>(
    null,
  );
  const [retryIn, setRetryIn] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const decision = checkThrottle(throttle, Date.now());
    if (!decision.allowed) {
      setRetryIn(waitSeconds(decision.waitMs));
      setErrorKey("error.throttled");
      return;
    }

    setBusy(true);
    setErrorKey(null);
    setErrorParams(null);
    try {
      await signIn(email, password);
      // Parent flips to the panel; keep the form from flashing a blank error.
    } catch (error) {
      const dataError = error instanceof DataError ? error : null;
      const lockedFor = dataError?.params?.["s"];
      if (lockedFor !== undefined) setRetryIn(Number(lockedFor));
      else setRetryIn(0);
      setErrorKey(errorKeyFor(dataError));
      setErrorParams(dataError?.params ?? null);
      // Bad credentials: clear only the password so a typo'd e-mail survives.
      if (dataError?.kind === "credentials") setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-background p-7 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-lg bg-foreground text-background">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold leading-9">
            {translate(lang, "admin.loginTitle")}
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {translate(lang, "admin.loginBody")}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="admin-email">{translate(lang, "admin.email")}</Label>
          <Input
            id="admin-email"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            dir="ltr"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@eltawkol.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password">{translate(lang, "admin.password")}</Label>
          <div className="relative">
            <Input
              id="admin-password"
              type={visible ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              dir="ltr"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pe-11"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setVisible((value) => !value)}
              aria-label={translate(lang, visible ? "admin.hidePassword" : "admin.showPassword")}
              aria-pressed={visible}
              className="absolute end-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {errorKey !== null && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
          >
            {translate(lang, errorKey, errorParams ?? undefined)}
            {retryIn > 0 ? ` (${retryIn})` : ""}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {busy ? translate(lang, "admin.signingIn") : translate(lang, "admin.login")}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs leading-6 text-muted-foreground">
        {translate(lang, "admin.loginHint")}
      </p>
    </div>
  );
}

function errorKeyFor(error: DataError | null): TKey {
  if (!error) return "error.unknown";
  // The provider signals a rate-limit lock with an `{s}` wait param, not with
  // an auth failure — "session expired" would be the wrong thing to tell them.
  if (error.params?.["s"] !== undefined) return "error.throttled";
  return errorMessageKey(error.kind);
}
