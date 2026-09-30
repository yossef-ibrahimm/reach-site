import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Check, Maximize2 } from "lucide-react";
import { useState } from "react";

import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useProductsQuery, useTaxonomyQuery } from "@/data/hooks";
import { EMPTY_TAXONOMY } from "@/data/taxonomy";
import { fetchProduct } from "@/data/products";
import { DataError } from "@/data/errors";
import { translate } from "@/lib/i18n";
import { toProductCard, toProductDetail } from "@/lib/product-view";
import { useLang } from "@/lib/prefs-context";

export const Route = createFileRoute("/products/$id")({
  // The loader returns only the raw row (serialisable, cacheable); the
  // language-dependent view model is derived in the component so switching
  // language does not require a refetch.
  loader: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw notFound();
    try {
      return await fetchProduct(id);
    } catch (error) {
      if (error instanceof DataError && error.kind === "notfound") throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name_ar ?? "المنتج"} | شركة التوكل` },
      {
        name: "description",
        content: loaderData?.description_ar ?? "تفاصيل منتج من شركة التوكل.",
      },
      { property: "og:title", content: loaderData?.name_ar ?? "منتج شركة التوكل" },
      {
        property: "og:description",
        content: loaderData?.description_ar ?? "تفاصيل منتج من شركة التوكل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductDetails,
});

function ProductDetails() {
  const product = Route.useLoaderData();
  const search = Route.useSearch();
  const { lang, t } = useLang();
  const [zoom, setZoom] = useState(false);

  const productsQuery = useProductsQuery();
  const taxonomyQuery = useTaxonomyQuery();
  const taxonomy = taxonomyQuery.data ?? EMPTY_TAXONOMY;

  const detail = toProductDetail(product, taxonomy, lang);

  const related = (productsQuery.data ?? [])
    .filter((row) => row.category_id === product.category_id && row.id !== product.id)
    .slice(0, 3)
    .map((row) => toProductCard(row, taxonomy, lang));

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link
          to="/products"
          search={search}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          {t("product.back")}
        </Link>

        <div className="mt-5 grid gap-10 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => setZoom((value) => !value)}
            className="group relative overflow-hidden rounded-lg border border-border bg-surface"
            aria-label={translate(lang, "product.zoom")}
          >
            {detail.imageUrl ? (
              <img
                src={detail.imageUrl}
                width={1200}
                height={1200}
                alt={detail.name}
                className={`aspect-square w-full object-cover transition-transform duration-300 ${zoom ? "scale-125" : "group-hover:scale-[1.02]"}`}
              />
            ) : (
              <div className="grid aspect-square w-full place-items-center text-sm text-muted-foreground">
                {translate(lang, "admin.field.none")}
              </div>
            )}
            <span className="absolute bottom-4 end-4 grid size-11 place-items-center rounded-md bg-background text-foreground">
              <Maximize2 className="size-5" aria-hidden="true" />
            </span>
          </button>

          <div className="py-2">
            <div className="flex flex-wrap gap-2">
              {detail.categoryLabel && <span className="signal-label">{detail.categoryLabel}</span>}
              {detail.brandLabel && <span className="neutral-label">{detail.brandLabel}</span>}
            </div>

            <p className="mt-8 font-mono text-sm text-muted-foreground">
              {translate(lang, "product.number", { n: detail.id })}
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">
              {detail.name}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground" dir="auto">
              {detail.nameOther}
            </p>

            {detail.description && (
              <p className="mt-7 border-y border-border py-6 leading-8 text-muted-foreground">
                {detail.description}
              </p>
            )}

            {detail.features.length > 0 && (
              <div className="mt-7">
                <h2 className="font-display text-xl font-bold">
                  {translate(lang, "product.features")}
                </h2>
                <ul className="mt-4 space-y-3">
                  {detail.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-signal-soft text-signal">
                        <Check className="size-4" aria-hidden="true" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.specs.length > 0 && (
              <div className="mt-7">
                <h2 className="font-display text-xl font-bold">
                  {translate(lang, "product.specs")}
                </h2>
                <dl className="mt-4 divide-y divide-border rounded-lg border border-border">
                  {detail.specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="flex items-baseline justify-between gap-4 px-4 py-3"
                    >
                      <dt className="text-sm text-muted-foreground">{spec.label}</dt>
                      <dd className="text-sm font-bold">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {productsQuery.isLoading && (
          <section className="mt-16 border-t border-border pt-10">
            <Skeleton className="h-7 w-64" />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="aspect-[3/2] w-full" />
              ))}
            </div>
          </section>
        )}

        {productsQuery.isError && !productsQuery.isLoading && (
          <div
            role="alert"
            className="mt-16 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-bold text-destructive">
              <AlertCircle className="size-4" aria-hidden="true" />
              {translate(lang, "product.errorTitle")}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => void productsQuery.refetch()}
            >
              {translate(lang, "common.retry")}
            </Button>
          </div>
        )}

        {related.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <h2 className="font-display text-2xl font-bold">
              {translate(lang, "product.related")}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to="/products/$id"
                  params={{ id: String(item.id) }}
                  search={search}
                  className="product-card"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      width={1408}
                      height={912}
                      loading="lazy"
                      decoding="async"
                      alt={item.name}
                    />
                  ) : (
                    <div className="grid aspect-[3/2] w-full place-items-center bg-surface text-sm text-muted-foreground">
                      {translate(lang, "admin.field.none")}
                    </div>
                  )}
                  <div className="p-4 font-display font-bold">{item.name}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteShell>
  );
}
