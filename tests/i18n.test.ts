import { describe, expect, it } from "vitest";

import { LANGS, keys, langDir, translate, type TKey } from "@/lib/i18n";

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((match) => match[1] as string).sort();
}

describe("i18n table", () => {
  it("exposes exactly two languages", () => {
    expect([...LANGS]).toEqual(["ar", "en"]);
  });

  it("has an English string for every Arabic key", () => {
    const arabicKeys = keys();
    expect(arabicKeys.length).toBeGreaterThan(150);

    for (const key of arabicKeys as TKey[]) {
      expect(translate("ar", key), `ar missing: ${key}`).toBeTruthy();
      expect(translate("en", key), `en missing: ${key}`).toBeTruthy();
    }
  });

  it("keeps the same {placeholders} in both languages", () => {
    for (const key of keys() as TKey[]) {
      expect(placeholders(translate("en", key)), `placeholder mismatch: ${key}`).toEqual(
        placeholders(translate("ar", key)),
      );
    }
  });

  it("substitutes {vars} and leaves unknown vars untouched", () => {
    expect(translate("en", "products.results", { n: 42 })).toBe("42 results");
    expect(translate("ar", "admin.products.count", { n: 3 })).toBe("3 منتج");
    expect(translate("en", "products.results")).toBe("{n} results");
  });

  it("maps Arabic to rtl and English to ltr", () => {
    expect(langDir("ar")).toBe("rtl");
    expect(langDir("en")).toBe("ltr");
  });
});
