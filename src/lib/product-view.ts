/**
 * View models for the public catalogue.
 *
 * Pure mapping from database rows + taxonomy to what a page actually renders,
 * so the language switch (`name_ar` vs `name_en`) and the "no brand / no
 * image / no description" fallbacks live in exactly one testable place.
 */
import type { Brand, Category, Product, ProductListRow } from "@/integrations/supabase/types";

import { productImageUrl } from "@/lib/image-url";
import type { Lang } from "@/lib/i18n";

export type TaxonomyNames = {
  categories: Pick<Category, "id" | "name_ar" | "name_en" | "sort">[];
  brands: Pick<Brand, "id" | "name_ar" | "name_en">[];
};

function nameOf(
  list: readonly { id: string; name_ar: string; name_en: string }[],
  id: string | null | undefined,
  lang: Lang,
): string {
  if (!id) return "";
  const found = list.find((item) => item.id === id);
  if (!found) return id;
  return lang === "ar" ? found.name_ar : found.name_en;
}

export type ProductCard = {
  id: number;
  name: string;
  /** The other language, shown small under the title. */
  nameOther: string;
  categoryLabel: string;
  brandLabel: string;
  categoryId: string | null;
  brandId: string | null;
  imageUrl: string | null;
};

export function toProductCard(
  row: ProductListRow,
  taxonomy: TaxonomyNames,
  lang: Lang,
): ProductCard {
  const primary = lang === "ar" ? row.name_ar : row.name_en;
  const secondary = lang === "ar" ? row.name_en : row.name_ar;
  return {
    id: row.id,
    name: primary,
    nameOther: secondary,
    categoryLabel: nameOf(taxonomy.categories, row.category_id, lang),
    brandLabel: nameOf(taxonomy.brands, row.brand_id, lang),
    categoryId: row.category_id,
    brandId: row.brand_id,
    imageUrl: productImageUrl(row.image_path),
  };
}

export type ProductDetail = ProductCard & {
  description: string;
  features: string[];
  specs: { label: string; value: string }[];
};

export function toProductDetail(
  product: Product,
  taxonomy: TaxonomyNames,
  lang: Lang,
): ProductDetail {
  const features = (lang === "ar" ? product.features_ar : product.features_en) ?? [];

  // Spec rows are stored bilingual and may have a label in only one language;
  // fall back to the other side rather than rendering an empty line.
  const specs = (product.specs ?? [])
    .map((spec) => {
      const label = spec.label[lang] ?? spec.label[lang === "ar" ? "en" : "ar"] ?? null;
      const value = spec.value[lang] ?? spec.value[lang === "ar" ? "en" : "ar"] ?? null;
      return label === null ? null : { label, value: value ?? "" };
    })
    .filter((spec): spec is { label: string; value: string } => spec !== null);

  return {
    ...toProductCard(product, taxonomy, lang),
    description:
      (lang === "ar" ? product.description_ar : product.description_en) ??
      (lang === "ar" ? product.description_en : product.description_ar) ??
      "",
    features,
    specs,
  };
}

/** Category tiles on the home page + facet labels in the sidebar. */
export type CategoryTile = {
  id: string;
  name: string;
  nameOther: string;
  sort: number;
};

export function toCategoryTiles(taxonomy: TaxonomyNames, lang: Lang): CategoryTile[] {
  return taxonomy.categories
    .slice()
    .sort((a, b) => a.sort - b.sort || a.name_en.localeCompare(b.name_en))
    .map((category) => ({
      id: category.id,
      name: lang === "ar" ? category.name_ar : category.name_en,
      nameOther: lang === "ar" ? category.name_en : category.name_ar,
      sort: category.sort,
    }));
}

export function categoryLabel(
  taxonomy: TaxonomyNames,
  id: string | null | undefined,
  lang: Lang,
): string {
  return nameOf(taxonomy.categories, id, lang);
}

export function brandLabel(
  taxonomy: TaxonomyNames,
  id: string | null | undefined,
  lang: Lang,
): string {
  return nameOf(taxonomy.brands, id, lang);
}
