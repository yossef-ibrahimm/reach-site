/**
 * Route-level access control for the admin area.
 *
 * Renders children only when `status === "ready"`. There is no "hidden until
 * you click" step: a visitor who reaches /manage-x7k2 sees the login form, a
 * signed-in non-admin sees an explicit 403, and nobody sees data.
 */
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { translate, type Lang } from "@/lib/i18n";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminLogin } from "@/components/admin/AdminLogin";

type Props = {
  lang: Lang;
  children: React.ReactNode;
};

export function AdminGuard({ lang, children }: Props) {
  const { status, recheck, signOut, email } = useAdmin();

  if (status === "checking") {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4" role="status" aria-live="polite">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-signal" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">{translate(lang, "admin.loading")}</p>
        </div>
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 py-10">
        <AdminLogin lang={lang} />
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-xl font-extrabold leading-8">
            {translate(lang, "admin.noAccess.title")}
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {translate(lang, "admin.noAccess.body")}
          </p>
          {email && (
            <p dir="ltr" className="mt-2 truncate text-xs text-muted-foreground">
              {translate(lang, "admin.signedInAs", { email })}
            </p>
          )}
          <p className="mt-3 rounded-md bg-surface px-3 py-2 text-xs leading-6 text-muted-foreground">
            {translate(lang, "admin.noAccess.hint")}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => void recheck()}>
              {translate(lang, "admin.noAccess.retry")}
            </Button>
            <Button variant="outline" onClick={() => void signOut()}>
              {translate(lang, "admin.signOut")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <span className="sr-only">
        <ShieldCheck aria-hidden="true" /> {translate(lang, "admin.subtitle")}
      </span>
      {children}
    </>
  );
}
