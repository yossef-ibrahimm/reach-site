/**
 * Pure validation + parsing for the admin product form.
 *
 * No React, no Supabase, no DOM — so the rules (duplicate ids, required
 * fields, spec format) are unit-testable on their own.
 */
import type { SpecRow } from "@/integrations/supabase/types";

import type { TKey } from "@/lib/i18n";

export type ProductFormValues = {
  id: string;
  name_ar: string;
  name_en: string;
  category_id: string;
  brand_id: string;
  description_ar: string;
  description_en: string;
  features_ar: string;
  features_en: string;
  specs_ar: string;
  specs_en: string;
};

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, TKey>>;

/** Split a textarea into clean lines: CRLF-safe, trimmed, blanks dropped. */
export function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function parseFeatures(text: string): string[] {
  return lines(text);
}

type SpecLine = { label: string; value: string };

/**
 * One `key: value` line. The first colon is the separator, so a value may
 * itself contain colons. A line without a colon yields `null` rather than a
 * keyless row.
 */
function parseSpecLine(text: string): SpecLine | null {
  const index = text.indexOf(":");
  if (index <= 0) return null;
  const label = text.slice(0, index).trim();
  const value = text.slice(index + 1).trim();
  if (!label) return null;
  return { label, value };
}

function parseSpecLines(text: string): (SpecLine | null)[] {
  return lines(text).map(parseSpecLine);
}

/**
 * Merge the Arabic and English spec textareas into the stored bilingual rows.
 *
 * The i-th Arabic line pairs with the i-th English line, so the admin keeps
 * the two lists aligned while editing; a missing translation is stored as
 * `null` instead of being silently duplicated from the other language.
 */
export function parseSpecs(arText: string, enText: string): SpecRow[] {
  const arabic = parseSpecLines(arText);
  const english = parseSpecLines(enText);
  const count = Math.max(arabic.length, english.length);
  const specs: SpecRow[] = [];

  for (let index = 0; index < count; index += 1) {
    const ar = arabic[index] ?? null;
    const en = english[index] ?? null;
    if (!ar && !en) continue;
    specs.push({
      label: { ar: ar?.label ?? null, en: en?.label ?? null },
      value: { ar: ar?.value ?? null, en: en?.value ?? null },
    });
  }
  return specs;
}

export function formatFeatures(features: readonly string[]): string {
  return features.join("\n");
}

/** Rebuild one language's spec textarea from the stored bilingual rows. */
export function formatSpecs(specs: readonly SpecRow[], lang: "ar" | "en"): string {
  return specs
    .map((spec) => {
      const label = spec.label[lang];
      const value = spec.value[lang];
      if (!label) return null;
      return `${label}: ${value ?? ""}`;
    })
    .filter((line): line is string => line !== null)
    .join("\n");
}

/** `true` for a positive integer inventory number. */
export function isValidProductId(raw: string): boolean {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return false;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value > 0;
}

export function normalizeProductId(raw: string): number {
  return Number(raw.trim());
}

/**
 * Validate the form.
 *
 * @param values   raw form state (strings, because inputs produce strings)
 * @param takenIds every inventory number already used by ANOTHER product
 *                 (`originalId` excluded when editing)
 */
export function validateProductForm(
  values: ProductFormValues,
  takenIds: readonly number[],
): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const trimmedId = values.id.trim();

  if (!trimmedId) {
    errors.id = "admin.formIdInteger";
  } else if (!isValidProductId(trimmedId)) {
    errors.id = "admin.formIdInteger";
  } else if (takenIds.includes(normalizeProductId(trimmedId))) {
    errors.id = "admin.formDuplicateId";
  }

  if (!values.name_ar.trim()) errors.name_ar = "admin.formNameRequired";
  if (!values.name_en.trim()) errors.name_en = "admin.formNameEnRequired";
  if (!values.category_id) errors.category_id = "admin.formCategoryRequired";

  return errors;
}

export function hasErrors(errors: ProductFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
