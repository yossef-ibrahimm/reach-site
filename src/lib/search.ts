/**
 * Search helpers for the public catalogue.
 *
 * Pure functions — no React, no data access — so the Arabic matching rules
 * (which are the whole point of the search box) are unit-testable.
 */

/**
 * Make Arabic search forgiving: drop tashkeel and tatweel, unify the alef,
 * yaa and taa-marbuta forms, and case-fold Latin text.
 *
 * Every code point in the diacritic class is written as a `\u` escape rather
 * than a literal mark: a literal range like `[ً-ٰ]` silently spans
 * U+064B–U+0670, which also covers the Arabic-Indic digits U+0660–U+0669 and
 * would delete any digit the admin typed in a product name.
 */
export function normalize(text: string): string {
  return (
    text
      .toLocaleLowerCase("ar")
      .normalize("NFKD")
      // U+064B–U+065F harakat, U+0670 superscript alef, U+0640 tatweel
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .trim()
  );
}

/** Every whitespace-separated token must appear somewhere in `haystack`. */
export function matchesQuery(haystack: string, query: string | undefined): boolean {
  const tokens = normalize(query ?? "")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const normalizedHaystack = normalize(haystack);
  return tokens.every((token) => normalizedHaystack.includes(token));
}

/**
 * "3 نتائج" vs "11 نتيجة" vs "نتيجتان" — Arabic has 4 plural forms and the
 * catalogue shows counts everywhere, so get them right.
 */
export function resultsLabel(count: number, lang: "ar" | "en"): string {
  if (lang === "en") {
    if (count === 0) return "No results";
    if (count === 1) return "1 result";
    return `${count} results`;
  }

  if (count === 0) return "لا توجد نتائج";
  if (count === 1) return "نتيجة واحدة";
  if (count === 2) return "نتيجتان";
  if (count <= 10) return `${count} نتائج`;
  return `${count} نتيجة`;
}

/** Same idea for the product-count label under a category tile. */
export function productsLabel(count: number, lang: "ar" | "en"): string {
  if (lang === "en") {
    if (count === 0) return "No products";
    if (count === 1) return "1 product";
    return `${count} products`;
  }

  if (count === 0) return "لا توجد منتجات";
  if (count === 1) return "منتج واحد";
  if (count === 2) return "منتجان";
  if (count <= 10) return `${count} منتجات`;
  return `${count} منتج`;
}
