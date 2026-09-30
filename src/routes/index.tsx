import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Headphones, ShieldCheck, Wrench } from "lucide-react";
import { useMemo } from "react";

import firePanel from "@/assets/fire-panel.jpg";
import fireProducts from "@/assets/fire-products.jpg";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useProductsQuery, useTaxonomyQuery } from "@/data/hooks";
import { EMPTY_TAXONOMY } from "@/data/taxonomy";
import { translate, type TKey } from "@/lib/i18n";
import { productsLabel } from "@/lib/search";
import { toCategoryTiles, toProductCard } from "@/lib/product-view";
import { useLang } from "@/lib/prefs-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "شركة التوكل | أنظمة إنذار ومكافحة الحريق" },
      {
        name: "description",
        content: "تعرّف على أنظمة ومنتجات شركة التوكل لإنذار ومكافحة الحريق.",
      },
      { property: "og:title", content: "شركة التوكل لأنظمة الحريق" },
      {
        property: "og:description",
        content: "حلول ومنتجات إنذار ومكافحة الحريق للمشروعات والمنشآت.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

/* Shared utility strings: one place to change the look of every card / link */
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const sectionPad = "mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20";

const FEATURES = [
  { icon: ShieldCheck, titleKey: "home.why1", textKey: "home.why1Text" },
  { icon: Wrench, titleKey: "home.why2", textKey: "home.why2Text" },
  { icon: Headphones, titleKey: "home.why3", textKey: "home.why3Text" },
] as const;

const SCOPE: readonly TKey[] = ["home.scope1", "home.scope2", "home.scope3"];

function HomePage() {
  const { lang, t } = useLang();
  const productsQuery = useProductsQuery();
  const taxonomyQuery = useTaxonomyQuery();

  const taxonomy = taxonomyQuery.data ?? EMPTY_TAXONOMY;
  const rows = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const cards = useMemo(
    () => rows.map((row) => toProductCard(row, taxonomy, lang)),
    [rows, taxonomy, lang],
  );
  const featured = cards[0];
  const shown = cards.slice(1, 7);

  const countsByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
    return counts;
  }, [rows]);

  const tiles = useMemo(
    () =>
      toCategoryTiles(taxonomy, lang).map((tile) => ({
        ...tile,
        count: countsByCategory.get(tile.id) ?? 0,
      })),
    [taxonomy, lang, countsByCategory],
  );

  const loading = productsQuery.isLoading || taxonomyQuery.isLoading;

  return (
    <SiteShell>
      {/* ───────── Hero ───────── */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:py-20">
          <div className="lg:col-span-5">
            <p className="text-sm font-bold uppercase tracking-wide text-signal">
              {t("home.kicker")}
            </p>
            <h1 className="mt-3 max-w-xl font-display text-4xl font-extrabold leading-[1.4] text-balance sm:text-5xl sm:leading-[1.35]">
              {t("home.heroTitle")} <span className="text-signal">{t("home.heroAccent")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-muted-foreground">
              {t("home.heroBody")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="ink" className={focusRing}>
                <Link to="/products">
                  {t("home.ctaProducts")} <ArrowLeft />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className={focusRing}>
                <a href="#categories">{t("home.ctaSystems")}</a>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7">
            {loading && <Skeleton className="aspect-[4/3] w-full rounded-2xl" />}

            {!loading && featured && (
              <Link
                to="/products/$id"
                params={{ id: String(featured.id) }}
                className={`group block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-line-strong ${focusRing}`}
              >
                <img
                  src={featured.imageUrl ?? firePanel}
                  width={1200}
                  height={1200}
                  alt={featured.name}
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex items-center justify-between gap-4 border-t border-border bg-background p-5">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("home.selectedProduct")}
                      {featured.categoryLabel ? ` · ${featured.categoryLabel}` : ""}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold leading-8">
                      {featured.name}
                    </h2>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-signal">
                    {t("home.viewDetails")}
                    <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 motion-reduce:transition-none" />
                  </span>
                </div>
              </Link>
            )}

            {!loading && !featured && (
              <div
                className={`grid aspect-[4/3] w-full place-items-center rounded-2xl border border-dashed border-line-strong bg-surface text-center ${focusRing}`}
              >
                <div className="px-6">
                  <p className="font-display text-xl font-bold">{t("home.emptyTitle")}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t("home.emptyBody")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────── Categories ───────── */}
      <section id="categories" className={`${sectionPad} scroll-mt-20`}>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-signal">
              {t("home.categoriesKicker")}
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold leading-[1.4]">
              {t("home.categoriesTitle")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {t("home.categoriesBody")}
            </p>
          </div>
          <Link
            to="/products"
            className={`rounded-sm text-sm font-bold text-signal hover:underline ${focusRing}`}
          >
            {t("home.allProducts")}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <Link
              key={tile.id}
              to="/products"
              search={{ category: tile.id }}
              className={`group flex min-h-32 flex-col justify-between rounded-xl border border-border bg-background p-5 transition-colors hover:border-signal hover:bg-signal-soft ${focusRing}`}
            >
              <div>
                <h3 className="font-display text-lg font-bold leading-8">{tile.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                  {tile.nameOther}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                <span>{productsLabel(tile.count, lang)}</span>
                <ArrowLeft className="size-4 text-signal transition-transform group-hover:-translate-x-1 motion-reduce:transition-none" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── Products ───────── */}
      <section className="border-y border-border bg-surface">
        <div className={sectionPad}>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-signal">
                {t("home.productsKicker")}
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold leading-[1.4]">
                {t("home.productsTitle")}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                {t("home.productsBody")}
              </p>
            </div>
            <Button asChild variant="outline" className={focusRing}>
              <Link to="/products">{t("home.openCatalog")}</Link>
            </Button>
          </div>

          {loading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-border">
                  <Skeleton className="aspect-[3/2] w-full" />
                  <div className="space-y-2 border-t border-border p-5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && shown.length === 0 && (
            <p className="rounded-xl border border-dashed border-line-strong bg-background px-6 py-12 text-center text-sm text-muted-foreground">
              {t("home.emptyBody")}
            </p>
          )}

          {!loading && shown.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((product) => (
                <Link
                  key={product.id}
                  to="/products/$id"
                  params={{ id: String(product.id) }}
                  className={`group overflow-hidden rounded-xl border border-border bg-background transition-colors hover:border-line-strong ${focusRing}`}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      width={1408}
                      height={912}
                      loading="lazy"
                      decoding="async"
                      alt={product.name}
                      className="aspect-[3/2] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[3/2] w-full place-items-center text-sm text-muted-foreground">
                      {t("home.noImage")}
                    </div>
                  )}
                  <div className="border-t border-border p-5">
                    <span className="text-xs font-bold text-signal">{product.categoryLabel}</span>
                    <h3 className="mt-2 font-display text-base font-bold leading-7">
                      {product.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────── Why us ───────── */}
      <section className={sectionPad}>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, titleKey, textKey }) => (
            <div key={titleKey} className="bg-background p-8">
              <span className="inline-flex size-12 items-center justify-center rounded-lg bg-signal-soft">
                <Icon className="size-6 text-signal" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold leading-8">
                {translate(lang, titleKey)}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {translate(lang, textKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── About ───────── */}
      <section className="bg-foreground text-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-signal">
              {t("home.aboutKicker")}
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold leading-[1.4]">
              {t("home.aboutTitle")}
            </h2>
            <p className="mt-4 max-w-xl leading-8 text-background/75">{t("home.aboutBody")}</p>
            <ul className="mt-6 space-y-3">
              {SCOPE.map((key) => (
                <li key={key} className="flex items-center gap-3 text-background/90">
                  <CheckCircle2 className="size-5 shrink-0 text-signal" aria-hidden="true" />
                  {translate(lang, key)}
                </li>
              ))}
            </ul>
          </div>
          <img
            src={fireProducts}
            width={1408}
            height={912}
            loading="lazy"
            decoding="async"
            alt={translate(lang, "site.tagline")}
            className="aspect-[3/2] w-full rounded-xl object-cover"
          />
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className={sectionPad}>
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-signal-soft p-8 sm:p-10 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-extrabold leading-[1.4] sm:text-3xl">
              {t("home.helpTitle")}
            </h2>
            <p className="mt-2 max-w-md leading-8 text-muted-foreground">{t("home.helpBody")}</p>
          </div>
          <Button asChild size="lg" className={`shrink-0 ${focusRing}`}>
            <Link to="/products">{t("home.startSearch")}</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
