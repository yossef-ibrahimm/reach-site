import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { ProductListRow } from "@/integrations/supabase/types";

import { useProductsQuery, useTaxonomyQuery } from "@/data/hooks";
import { EMPTY_TAXONOMY } from "@/data/taxonomy";
import { DataError, errorMessageKey } from "@/data/errors";
import { translate, type TKey } from "@/lib/i18n";
import { matchesQuery, resultsLabel } from "@/lib/search";
import { brandLabel, categoryLabel, toProductCard } from "@/lib/product-view";
import { useLang } from "@/lib/prefs-context";

type ProductSearch = {
  q?: string | undefined;
  category?: string | undefined;
  brand?: string | undefined;
};

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    category: typeof search["category"] === "string" ? search["category"] : undefined,
    brand: typeof search["brand"] === "string" ? search["brand"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "المنتجات | شركة التوكل" },
      {
        name: "description",
        content: "ابحث في دليل منتجات إنذار ومكافحة الحريق لدى شركة التوكل.",
      },
      { property: "og:title", content: "دليل منتجات التوكل" },
      { property: "og:description", content: "دليل منظم لمنتجات وأنظمة إنذار ومكافحة الحريق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Text the search box matches against: both names plus both labels. */
function haystack(row: ProductListRow, labels: { category: string; brand: string }): string {
  return `${row.name_ar} ${row.name_en} ${labels.category} ${labels.brand}`;
}

function FilterOption({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const empty = count === 0 && !active;
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={empty}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-start text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${focusRing} ${
        active
          ? "border-signal bg-signal-soft font-bold text-foreground"
          : "border-transparent text-muted-foreground hover:bg-surface hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="text-xs tabular-nums">{count}</span>
    </button>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`${t("products.clearFilters")}: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold transition-colors hover:border-signal ${focusRing}`}
    >
      {label}
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { lang, t } = useLang();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const productsQuery = useProductsQuery();
  const taxonomyQuery = useTaxonomyQuery();

  const taxonomy = taxonomyQuery.data ?? EMPTY_TAXONOMY;
  const rows = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const labels = useMemo(() => {
    const map = new Map<number, { category: string; brand: string }>();
    for (const row of rows) {
      map.set(row.id, {
        category: categoryLabel(taxonomy, row.category_id, lang),
        brand: brandLabel(taxonomy, row.brand_id, lang),
      });
    }
    return map;
  }, [rows, taxonomy, lang]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          matchesQuery(
            haystack(row, labels.get(row.id) ?? { category: "", brand: "" }),
            search.q,
          ) &&
          (!search.category || row.category_id === search.category) &&
          (!search.brand || row.brand_id === search.brand),
      ),
    [rows, labels, search],
  );

  // Faceted counts: each group is counted with the OTHER filters applied, so
  // the number always matches what the user will see after clicking.
  const categoryCounts = useMemo(() => {
    const pool = rows.filter(
      (row) =>
        matchesQuery(haystack(row, labels.get(row.id) ?? { category: "", brand: "" }), search.q) &&
        (!search.brand || row.brand_id === search.brand),
    );
    return Object.fromEntries(
      taxonomy.categories.map((category) => [
        category.id,
        pool.filter((row) => row.category_id === category.id).length,
      ]),
    );
  }, [rows, labels, taxonomy.categories, search.q, search.brand]);

  const brandCounts = useMemo(() => {
    const pool = rows.filter(
      (row) =>
        matchesQuery(haystack(row, labels.get(row.id) ?? { category: "", brand: "" }), search.q) &&
        (!search.category || row.category_id === search.category),
    );
    return Object.fromEntries(
      taxonomy.brands.map((brand) => [
        brand.id,
        pool.filter((row) => row.brand_id === brand.id).length,
      ]),
    );
  }, [rows, labels, taxonomy.brands, search.q, search.category]);

  const update = (next: Partial<ProductSearch>) =>
    void navigate({
      search: (old) => ({ q: old.q, category: old.category, brand: old.brand, ...next }),
      replace: true,
    });

  const resetAll = () =>
    void navigate({
      search: { q: undefined, category: undefined, brand: undefined },
      replace: true,
    });

  const activeCount = [search.q, search.category, search.brand].filter(Boolean).length;
  const loading = productsQuery.isLoading || taxonomyQuery.isLoading;
  const errorKey: TKey | null = productsQuery.error
    ? errorMessageKey((productsQuery.error as Partial<DataError>).kind ?? "unknown")
    : null;

  return (
    <SiteShell>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
          <h1 className="font-display text-4xl font-extrabold leading-[1.4]">
            {t("products.title")}
          </h1>
          <p className="mt-3 max-w-xl leading-8 text-muted-foreground">{t("products.subtitle")}</p>
        </div>
      </section>

      <section className="sticky top-18 z-30 border-b border-border bg-background/95 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl gap-2 px-4 sm:px-6">
          <label className="relative flex-1">
            <span className="sr-only">{t("products.searchLabel")}</span>
            <Search
              className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search.q ?? ""}
              onChange={(event) => update({ q: event.target.value || undefined })}
              onKeyDown={(event) => {
                if (event.key === "Escape" && search.q) update({ q: undefined });
              }}
              enterKeyHint="search"
              autoComplete="off"
              className="h-12 w-full rounded-lg border border-input bg-surface ps-12 pe-12 outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/20 [&::-webkit-search-cancel-button]:hidden"
              placeholder={t("products.searchPlaceholder")}
            />
            {search.q && (
              <button
                type="button"
                onClick={() => update({ q: undefined })}
                aria-label={t("common.close")}
                className={`absolute end-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground ${focusRing}`}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </label>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className={`relative lg:hidden ${focusRing}`}
            aria-expanded={filtersOpen}
            aria-controls="product-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal aria-hidden="true" />
            <span className="hidden sm:inline">{t("products.filters")}</span>
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 flex size-5 items-center justify-center rounded-full bg-signal text-[11px] font-bold text-background">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-10">
        <aside
          id="product-filters"
          aria-label={t("products.filters")}
          className={`${filtersOpen ? "block" : "hidden"} rounded-xl border border-border bg-background p-4 lg:sticky lg:top-40 lg:block`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">{t("products.filters")}</h2>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className={`rounded-sm text-xs font-bold text-signal hover:underline ${focusRing}`}
              >
                {t("products.clearAll")}
              </button>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold text-muted-foreground">
              {t("products.category")}
            </h3>
            <div className="space-y-1">
              {taxonomy.categories.map((category) => (
                <FilterOption
                  key={category.id}
                  label={categoryLabel(taxonomy, category.id, lang)}
                  count={categoryCounts[category.id] ?? 0}
                  active={search.category === category.id}
                  onClick={() =>
                    update({
                      category: search.category === category.id ? undefined : category.id,
                    })
                  }
                />
              ))}
            </div>
          </div>

          {taxonomy.brands.length > 0 && (
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="mb-2 text-xs font-bold text-muted-foreground">
                {t("products.brand")}
              </h3>
              <div className="space-y-1">
                {taxonomy.brands.map((brand) => (
                  <FilterOption
                    key={brand.id}
                    label={brandLabel(taxonomy, brand.id, lang)}
                    count={brandCounts[brand.id] ?? 0}
                    active={search.brand === brand.id}
                    onClick={() =>
                      update({ brand: search.brand === brand.id ? undefined : brand.id })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <p className="me-2 text-sm text-muted-foreground" aria-live="polite">
              {loading ? t("products.loading") : resultsLabel(filtered.length, lang)}
            </p>
            {search.q && (
              <ActiveChip label={`“${search.q}”`} onRemove={() => update({ q: undefined })} />
            )}
            {search.category && (
              <ActiveChip
                label={categoryLabel(taxonomy, search.category, lang)}
                onRemove={() => update({ category: undefined })}
              />
            )}
            {search.brand && (
              <ActiveChip
                label={brandLabel(taxonomy, search.brand, lang)}
                onRemove={() => update({ brand: undefined })}
              />
            )}
          </div>

          {loading && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-border">
                  <Skeleton className="aspect-[3/2] w-full" />
                  <div className="space-y-2 border-t border-border p-5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && errorKey && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-12 text-center"
            >
              <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden="true" />
              <h2 className="mt-4 font-display text-2xl font-bold leading-[1.4]">
                {t("products.errorTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-md leading-8 text-destructive">
                {translate(lang, errorKey)}
              </p>
              <Button
                className={`mt-6 ${focusRing}`}
                onClick={() => {
                  void productsQuery.refetch();
                  void taxonomyQuery.refetch();
                }}
              >
                {t("products.retry")}
              </Button>
            </div>
          )}

          {!loading && !errorKey && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
              <Search className="mx-auto size-10 text-signal" aria-hidden="true" />
              <h2 className="mt-4 font-display text-2xl font-bold leading-[1.4]">
                {t("products.emptyTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-sm leading-8 text-muted-foreground">
                {t("products.emptyBody")}
              </p>
              <Button className={`mt-6 ${focusRing}`} onClick={resetAll}>
                {t("products.clearFilters")}
              </Button>
            </div>
          )}

          {!loading && !errorKey && filtered.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((row, index) => {
                const card = toProductCard(row, taxonomy, lang);
                return (
                  <Link
                    key={card.id}
                    to="/products/$id"
                    params={{ id: String(card.id) }}
                    search={search}
                    className={`group overflow-hidden rounded-xl border border-border bg-background transition-colors hover:border-line-strong ${focusRing}`}
                  >
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        width={1408}
                        height={912}
                        loading={index < 3 ? "eager" : "lazy"}
                        decoding="async"
                        alt={card.name}
                        className="aspect-[3/2] w-full object-cover"
                      />
                    ) : (
                      <div className="grid aspect-[3/2] w-full place-items-center bg-surface text-sm text-muted-foreground">
                        {t("admin.field.none")}
                      </div>
                    )}
                    <div className="border-t border-border p-5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-signal">{card.categoryLabel}</span>
                        <span className="text-muted-foreground">{card.brandLabel}</span>
                      </div>
                      <h2 className="mt-3 font-display text-lg font-bold leading-8 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                        {card.name}
                      </h2>
                      <p dir="ltr" className="mt-1 text-right text-sm text-muted-foreground">
                        {card.nameOther}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
