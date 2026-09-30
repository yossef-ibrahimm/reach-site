import { Link, useNavigate } from "@tanstack/react-router";
import { Languages, Mail, MapPin, Menu, MessageCircle, Moon, Phone, Sun } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLang, useTheme } from "@/lib/prefs-context";
import { hasContactDetails, contactSummary, siteConfig } from "@/lib/siteConfig";

/** Number of logo taps and the window in which they must happen. */
const EASTER_EGG_TAPS = 5;
const EASTER_EGG_WINDOW_MS = 1800;

export function SiteShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLang();
  const { resolvedTheme, setTheme } = useTheme();
  const taps = useRef<number[]>([]);

  const registerLogoTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((tap) => now - tap < EASTER_EGG_WINDOW_MS), now];
    if (taps.current.length >= EASTER_EGG_TAPS) {
      taps.current = [];
      void navigate({ to: "/manage-x7k2" });
    }
  };

  const contact = hasContactDetails(siteConfig);
  const summary = contactSummary(siteConfig);

  const nav = (
    <>
      <Link to="/" activeProps={{ className: "text-signal" }}>
        {t("nav.about")}
      </Link>
      <Link to="/products" activeProps={{ className: "text-signal" }}>
        {t("nav.products")}
      </Link>
      <Link to="/" hash="categories">
        {t("nav.systems")}
      </Link>
      <Link to="/" hash="contact">
        {t("nav.contact")}
      </Link>
    </>
  );

  const nextLang = lang === "ar" ? "English" : "العربية";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main" className="skip-link">
        {t("a11y.skipToContent")}
      </a>
      <div className="border-b border-utility-border bg-utility text-utility-foreground">
        <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-between gap-4 px-4 text-xs sm:px-6">
          <span>{t("topbar.company")}</span>
          <span className="hidden items-center gap-2 sm:flex">
            <Phone className="size-3.5" />
            {summary ?? t("topbar.pendingContact")}
          </span>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label={t("a11y.home")}>
            <span className="grid size-11 place-items-center rounded-md bg-foreground font-display text-xl font-extrabold text-background">
              {siteConfig.mark}
            </span>
            <span>
              <strong className="block font-display text-lg leading-none">
                {lang === "ar" ? siteConfig.nameAr : siteConfig.nameEn}
              </strong>
              <small className="mt-1 block text-[11px] text-muted-foreground">
                {t("site.tagline")}
              </small>
            </span>
          </Link>
          <nav
            className="hidden items-center gap-8 text-sm font-semibold lg:flex"
            aria-label={t("nav.primary")}
          >
            {nav}
          </nav>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              aria-label={`${t("a11y.toggleLang")}: ${nextLang}`}
              title={nextLang}
              lang={lang === "ar" ? "en" : "ar"}
            >
              <Languages aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label={t("a11y.toggleTheme")}
              title={t("a11y.toggleTheme")}
            >
              {resolvedTheme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label={t("a11y.openMenu")}
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="end" className="w-[86%] bg-background pt-16 text-foreground">
                <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
                <nav className="flex flex-col gap-6 text-lg font-semibold">{nav}</nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer id="contact" className="bg-utility text-utility-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <button
              type="button"
              onClick={registerLogoTap}
              className="flex min-h-11 items-center gap-3 text-start"
              aria-label={t("a11y.brandMark")}
            >
              <span className="grid size-10 place-items-center rounded-md bg-signal font-display text-lg font-bold text-signal-foreground">
                {siteConfig.mark}
              </span>
              <span>
                <strong className="block font-display text-lg">{siteConfig.nameAr}</strong>
                <small className="text-utility-muted">{t("site.tagline")}</small>
              </span>
            </button>
          </div>
          <div>
            <h2 className="mb-3 font-display font-bold">{t("footer.quickLinks")}</h2>
            <div className="flex flex-col gap-2 text-sm text-utility-muted">
              <Link to="/products">{t("nav.products")}</Link>
              <Link to="/">{t("footer.about")}</Link>
            </div>
          </div>
          <div>
            <h2 className="mb-3 font-display font-bold">{t("footer.contact")}</h2>
            {contact ? (
              <ul className="flex flex-col gap-2 text-sm text-utility-muted">
                {siteConfig.phone ? (
                  <li>
                    <a
                      className="inline-flex min-h-11 items-center gap-2 hover:text-utility-foreground"
                      href={siteConfig.phone.href}
                    >
                      <Phone className="size-4" aria-hidden="true" />
                      {siteConfig.phone.display}
                    </a>
                  </li>
                ) : null}
                {siteConfig.whatsapp ? (
                  <li>
                    <a
                      className="inline-flex min-h-11 items-center gap-2 hover:text-utility-foreground"
                      href={siteConfig.whatsapp.href}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                      {siteConfig.whatsapp.display}
                    </a>
                  </li>
                ) : null}
                {siteConfig.email ? (
                  <li>
                    <a
                      className="inline-flex min-h-11 items-center gap-2 hover:text-utility-foreground"
                      href={`mailto:${siteConfig.email}`}
                    >
                      <Mail className="size-4" aria-hidden="true" />
                      {siteConfig.email}
                    </a>
                  </li>
                ) : null}
                {siteConfig.address ? (
                  <li className="inline-flex min-h-11 items-center gap-2">
                    <MapPin className="size-4" aria-hidden="true" />
                    {siteConfig.address}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm leading-7 text-utility-muted">{t("footer.contactMissing")}</p>
            )}
          </div>
        </div>
        <div className="border-t border-utility-border px-4 py-5 text-center text-xs text-utility-muted">
          {t("footer.copyright")}
        </div>
      </footer>
    </div>
  );
}
