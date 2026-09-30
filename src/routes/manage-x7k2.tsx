import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { useLang } from "@/lib/prefs-context";
import { translate } from "@/lib/i18n";
import { AdminAuthProvider } from "@/components/admin/AdminAuthProvider";
import { AdminGuard } from "@/components/admin/AdminGuard";

/**
 * The whole admin workspace is lazy-loaded. `AdminAuthProvider` and
 * `AdminGuard` stay here so the login/403 screens render in one tick while the
 * panels, forms and Supabase data layer are still downloading.
 */
const AdminApp = lazy(() => import("@/components/admin/AdminApp"));

export const Route = createFileRoute("/manage-x7k2")({
  head: () => ({
    meta: [
      { title: "إدارة المحتوى | شركة التوكل" },
      { name: "description", content: "واجهة إدارة محتوى منتجات شركة التوكل." },
      { property: "og:title", content: "إدارة محتوى التوكل" },
      { property: "og:description", content: "واجهة إدارة خاصة بمالك الموقع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      // Belt and braces: robots.txt already disallows this path.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const { lang, t } = useLang();

  return (
    <AdminAuthProvider>
      <AdminGuard lang={lang}>
        <Suspense
          fallback={
            <div className="grid min-h-[60vh] place-items-center" role="status" aria-live="polite">
              <div className="text-center">
                <Loader2 className="mx-auto size-8 animate-spin text-signal" aria-hidden="true" />
                <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  {t("admin.title")}
                </p>
                <span className="sr-only">{translate(lang, "admin.loading")}</span>
              </div>
            </div>
          }
        >
          <AdminApp lang={lang} />
        </Suspense>
      </AdminGuard>
    </AdminAuthProvider>
  );
}
