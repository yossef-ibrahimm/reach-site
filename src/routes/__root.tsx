import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { PrefsProvider } from "@/components/PrefsProvider";
import { Toaster } from "@/components/ui/sonner";
import { BOOT_SCRIPT } from "@/lib/boot-script";
import { useLang } from "@/lib/prefs-context";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  const { t } = useLang();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center" dir="auto">
        <p className="text-7xl font-bold text-signal">404</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">{t("404.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("404.body")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("404.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useLang();
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center" role="alert" dir="auto">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("error.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("error.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("error.retry")}
          </button>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("404.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "شركة التوكل" },
      { name: "description", content: "أنظمة إنذار ومكافحة الحريق" },
      { name: "author", content: "Eltawkol Fire" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "شركة التوكل" },
      { property: "og:description", content: "أنظمة إنذار ومكافحة الحريق" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap",
      },
    ],
    scripts: [{ children: BOOT_SCRIPT }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // lang/dir are corrected pre-paint by BOOT_SCRIPT, then kept in sync by
    // PrefsProvider. suppressHydrationWarning stops React from warning that the
    // server's default (ar/rtl) differs from the visitor's stored choice.
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <PrefsProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster richColors closeButton position="top-center" />
      </PrefsProvider>
    </QueryClientProvider>
  );
}
