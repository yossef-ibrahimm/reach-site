import { describe, expect, it } from "vitest";

import type { Product, ProductListRow } from "@/integrations/supabase/types";
import { EMPTY_TAXONOMY } from "@/data/taxonomy";
import type { TaxonomyNames } from "@/lib/product-view";
import { toCategoryTiles, toProductCard, toProductDetail } from "@/lib/product-view";

const taxonomy: TaxonomyNames = {
  categories: [
    { id: "z-detectors", name_ar: "كاشفات", name_en: "Detectors", sort: 2 },
    { id: "a-panels", name_ar: "لوحات", name_en: "Panels", sort: 1 },
    { id: "b-cables", name_ar: "كابلات", name_en: "Cables", sort: 1 },
  ],
  brands: [{ id: "acme", name_ar: "أكمي", name_en: "Acme" }],
};

const row: ProductListRow = {
  id: 42,
  name_ar: "كاشف دخان",
  name_en: "Smoke detector",
  category_id: "z-detectors",
  brand_id: "acme",
  image_path: "42/cover.webp",
};

const product: Product = {
  ...row,
  description_ar: "وصف عربي",
  description_en: "English description",
  features_ar: ["تماس مباشر", "حماية من التلاعب"],
  features_en: ["Direct connection", "Tamper protection"],
  specs: [
    { label: { ar: "الجهد", en: "Voltage" }, value: { ar: "24 فولت", en: "24 V" } },
    { label: { ar: "اللون", en: null }, value: { ar: "أبيض", en: "white" } },
    { label: { ar: null, en: "Standard" }, value: { ar: null, en: "EN54" } },
    { label: { ar: null, en: null }, value: { ar: "x", en: "x" } },
  ],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("toProductCard", () => {
  it("picks the primary language and keeps the other for the sub-line", () => {
    const ar = toProductCard(row, taxonomy, "ar");
    expect(ar.name).toBe("كاشف دخان");
    expect(ar.nameOther).toBe("Smoke detector");

    const en = toProductCard(row, taxonomy, "en");
    expect(en.name).toBe("Smoke detector");
    expect(en.nameOther).toBe("كاشف دخان");
  });

  it("resolves category and brand labels in both languages", () => {
    expect(toProductCard(row, taxonomy, "ar").categoryLabel).toBe("كاشفات");
    expect(toProductCard(row, taxonomy, "en").categoryLabel).toBe("Detectors");
    expect(toProductCard(row, taxonomy, "en").brandLabel).toBe("Acme");
  });

  it("falls back to the raw id when the taxonomy does not know it", () => {
    const orphan: ProductListRow = { ...row, category_id: "ghost", brand_id: null };
    const card = toProductCard(orphan, taxonomy, "ar");
    expect(card.categoryLabel).toBe("ghost");
    expect(card.brandLabel).toBe("");
  });

  it("returns no image when there is no path", () => {
    expect(toProductCard({ ...row, image_path: null }, taxonomy, "ar").imageUrl).toBeNull();
    expect(toProductCard(row, taxonomy, "ar").imageUrl).toContain(
      "/storage/v1/object/public/product-images/42/cover.webp",
    );
  });

  it("works against the empty taxonomy while the query is loading", () => {
    const card = toProductCard(row, EMPTY_TAXONOMY, "ar");
    expect(card.name).toBe("كاشف دخان");
    expect(card.categoryLabel).toBe("z-detectors");
  });
});

describe("toProductDetail", () => {
  it("uses the matching description language", () => {
    expect(toProductDetail(product, taxonomy, "ar").description).toBe("وصف عربي");
    expect(toProductDetail(product, taxonomy, "en").description).toBe("English description");
  });

  it("falls back to the other language when the primary description is missing", () => {
    const partial: Product = { ...product, description_en: null };
    expect(toProductDetail(partial, taxonomy, "en").description).toBe("وصف عربي");
  });

  it("returns an empty description instead of inventing one", () => {
    const empty: Product = { ...product, description_ar: null, description_en: null };
    expect(toProductDetail(empty, taxonomy, "ar").description).toBe("");
  });

  it("keeps the features of the active language", () => {
    expect(toProductDetail(product, taxonomy, "ar").features[0]).toBe("تماس مباشر");
    expect(toProductDetail(product, taxonomy, "en").features[0]).toBe("Direct connection");
  });

  it("drops specs with no usable label and fills in the other language", () => {
    const specs = toProductDetail(product, taxonomy, "en").specs;

    expect(specs).toHaveLength(3);
    expect(specs[0]).toEqual({ label: "Voltage", value: "24 V" });
    expect(specs[1]).toEqual({ label: "اللون", value: "white" });
    expect(specs[2]).toEqual({ label: "Standard", value: "EN54" });
  });

  it("keeps the card fields", () => {
    const detail = toProductDetail(product, taxonomy, "ar");
    expect(detail.id).toBe(42);
    expect(detail.imageUrl).toContain("42/cover.webp");
  });
});

describe("toCategoryTiles", () => {
  it("sorts by sort key then by the English name", () => {
    expect(toCategoryTiles(taxonomy, "ar").map((tile) => tile.id)).toEqual([
      "b-cables",
      "a-panels",
      "z-detectors",
    ]);
  });

  it("exposes the other language for the sub-label", () => {
    const [first] = toCategoryTiles(taxonomy, "ar");
    expect(first?.name).toBe("كابلات");
    expect(first?.nameOther).toBe("Cables");
  });
});
