import { describe, expect, it } from "vitest";

import { matchesQuery, normalize, productsLabel, resultsLabel } from "@/lib/search";

describe("normalize()", () => {
  it("strips tashkeel and tatweel", () => {
    expect(normalize("كَاشِف")).toBe("كاشف");
    expect(normalize("كـاشف")).toBe("كاشف");
  });

  it("unifies alef, yaa and taa-marbuta", () => {
    expect(normalize("إنذار")).toBe("انذار");
    expect(normalize("إطفاء")).toBe("اطفاء");
    expect(normalize("مروحي")).toBe("مروحي");
    expect(normalize("لوحات")).toBe("لوحات");
    expect(normalize("ملصق")).toBe("ملصق");
  });

  it("keeps Arabic-Indic digits (NFKD + diacritics must not eat them)", () => {
    expect(normalize("كاشف ٤٢")).toBe("كاشف ٤٢");
    expect(normalize("٠١٢٣٤٥٦٧٨٩")).toBe("٠١٢٣٤٥٦٧٨٩");
  });

  it("normalises both sides of a query the same way", () => {
    // NFKD decomposes ئ into ي + U+0654, then the hamza mark is dropped, so
    // رئيسي and رييسي collapse to the same search key and still match.
    expect(matchesQuery("رئيسي", "رئيسي")).toBe(true);
    expect(matchesQuery("رئيسي", "رييسي")).toBe(true);
  });

  it("case-folds Latin text", () => {
    expect(normalize("FIRE Alarm")).toBe("fire alarm");
  });

  it("trims surrounding whitespace", () => {
    expect(normalize("  جرس  ")).toBe("جرس");
  });
});

describe("matchesQuery()", () => {
  const haystack = "كاشف دخان ضوئي Optical Smoke Detector";

  it("matches when there is no query", () => {
    expect(matchesQuery(haystack, undefined)).toBe(true);
    expect(matchesQuery(haystack, "")).toBe(true);
    expect(matchesQuery(haystack, "   ")).toBe(true);
  });

  it("matches a single Arabic token despite diacritics", () => {
    expect(matchesQuery(haystack, "كاشِف")).toBe(true);
  });

  it("matches an English token case-insensitively", () => {
    expect(matchesQuery(haystack, "OPTICAL")).toBe(true);
  });

  it("requires every token to match", () => {
    expect(matchesQuery(haystack, "كاشف ضوئي")).toBe(true);
    expect(matchesQuery(haystack, "كاشف لوح")).toBe(false);
  });

  it("does not match a substring that only exists in another field", () => {
    expect(matchesQuery(haystack, "جرس")).toBe(false);
  });
});

describe("resultsLabel()", () => {
  it("uses the correct Arabic plural form", () => {
    expect(resultsLabel(0, "ar")).toBe("لا توجد نتائج");
    expect(resultsLabel(1, "ar")).toBe("نتيجة واحدة");
    expect(resultsLabel(2, "ar")).toBe("نتيجتان");
    expect(resultsLabel(5, "ar")).toBe("5 نتائج");
    expect(resultsLabel(11, "ar")).toBe("11 نتيجة");
  });

  it("handles English", () => {
    expect(resultsLabel(0, "en")).toBe("No results");
    expect(resultsLabel(1, "en")).toBe("1 result");
    expect(resultsLabel(7, "en")).toBe("7 results");
  });
});

describe("productsLabel()", () => {
  it("uses the correct Arabic plural form", () => {
    expect(productsLabel(0, "ar")).toBe("لا توجد منتجات");
    expect(productsLabel(1, "ar")).toBe("منتج واحد");
    expect(productsLabel(2, "ar")).toBe("منتجان");
    expect(productsLabel(4, "ar")).toBe("4 منتجات");
    expect(productsLabel(12, "ar")).toBe("12 منتج");
  });

  it("handles English", () => {
    expect(productsLabel(0, "en")).toBe("No products");
    expect(productsLabel(1, "en")).toBe("1 product");
    expect(productsLabel(3, "en")).toBe("3 products");
  });
});
