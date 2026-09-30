import { describe, expect, it } from "vitest";

import type { Brand, Category, Product } from "@/integrations/supabase/types";

import {
  EXPORT_VERSION,
  buildExportPayload,
  exportFileName,
  isExportPayload,
  serializePayload,
} from "@/lib/export-payload";

const category: Category = { id: "alarms", name_ar: "الإنذار", name_en: "Alarms", sort: 1 };
const brand: Brand = { id: "acme", name_ar: "أكمي", name_en: "Acme" };
const product: Product = {
  id: 1001,
  name_ar: "كاشف",
  name_en: "Detector",
  category_id: "alarms",
  brand_id: "acme",
  image_path: "1001/1.webp",
  description_ar: null,
  description_en: null,
  features_ar: [],
  features_en: [],
  specs: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const now = new Date("2026-09-30T12:34:56.000Z");

describe("export payload", () => {
  it("produces the documented shape", () => {
    const payload = buildExportPayload({
      categories: [category],
      brands: [brand],
      products: [product],
      now,
    });

    expect(payload).toEqual({
      version: EXPORT_VERSION,
      exported_at: "2026-09-30T12:34:56.000Z",
      categories: [category],
      brands: [brand],
      products: [product],
    });
  });

  it("defaults exported_at to the current time", () => {
    const before = Date.now();
    const payload = buildExportPayload({ categories: [], brands: [], products: [] });
    const stamped = Date.parse(payload.exported_at);
    expect(stamped).toBeGreaterThanOrEqual(before - 1_000);
    expect(stamped).toBeLessThanOrEqual(Date.now() + 1_000);
  });

  it("round-trips through serializePayload", () => {
    const payload = buildExportPayload({
      categories: [category],
      brands: [brand],
      products: [product],
      now,
    });
    const parsed: unknown = JSON.parse(serializePayload(payload));
    expect(isExportPayload(parsed)).toBe(true);
    expect(parsed).toEqual(payload);
  });

  it("accepts an empty backup (a brand new project)", () => {
    expect(
      isExportPayload(buildExportPayload({ categories: [], brands: [], products: [], now })),
    ).toBe(true);
  });

  it("rejects foreign or malformed documents", () => {
    expect(isExportPayload(null)).toBe(false);
    expect(isExportPayload("a string")).toBe(false);
    expect(isExportPayload({ version: 99, categories: [], brands: [], products: [] })).toBe(false);
    expect(
      isExportPayload({ version: EXPORT_VERSION, categories: {}, brands: [], products: [] }),
    ).toBe(false);
  });

  it("names the file with a sortable UTC timestamp", () => {
    expect(exportFileName(now)).toBe("eltawkol-backup-2026-09-30-12-34-56.json");
  });
});
