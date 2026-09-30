/**
 * The backup document the admin exports and `scripts/import-json.mjs` reads.
 *
 * Pure module: no DOM, no Supabase — the shape and the filename are
 * unit-testable on their own.
 */
import type { Brand, Category, Product } from "@/integrations/supabase/types";

export const EXPORT_VERSION = 1;

export type ExportPayload = {
  version: number;
  exported_at: string;
  categories: Category[];
  brands: Brand[];
  products: Product[];
};

export function buildExportPayload(input: {
  categories: Category[];
  brands: Brand[];
  products: Product[];
  now?: Date;
}): ExportPayload {
  return {
    version: EXPORT_VERSION,
    exported_at: (input.now ?? new Date()).toISOString(),
    categories: input.categories,
    brands: input.brands,
    products: input.products,
  };
}

export function exportFileName(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `eltawkol-backup-${stamp}.json`;
}

export function serializePayload(payload: ExportPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function isExportPayload(value: unknown): value is ExportPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ExportPayload>;
  return (
    candidate.version === EXPORT_VERSION &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.brands) &&
    Array.isArray(candidate.products)
  );
}
