import { describe, expect, it } from "vitest";

import {
  formatFeatures,
  formatSpecs,
  hasErrors,
  isValidProductId,
  lines,
  normalizeProductId,
  parseFeatures,
  parseSpecs,
  validateProductForm,
  type ProductFormValues,
} from "@/lib/product-validation";

const base: ProductFormValues = {
  id: "1001",
  name_ar: "كاشف دخان",
  name_en: "Smoke detector",
  category_id: "alarms",
  brand_id: "",
  description_ar: "",
  description_en: "",
  features_ar: "",
  features_en: "",
  specs_ar: "",
  specs_en: "",
};

describe("lines()", () => {
  it("trims, drops blanks and handles CRLF", () => {
    expect(lines("  one \r\n\r\n two \n\nthree")).toEqual(["one", "two", "three"]);
    expect(lines("")).toEqual([]);
  });
});

describe("parseFeatures()", () => {
  it("keeps one feature per non-empty line", () => {
    expect(parseFeatures("a\n b \n\nc")).toEqual(["a", "b", "c"]);
  });
});

describe("parseSpecs() — bilingual pairing", () => {
  it("pairs line N of each language", () => {
    const specs = parseSpecs("الجهد: 24V\nالتغطية: 200m2", "Voltage: 24V\nCoverage: 200m2");

    expect(specs).toEqual([
      { label: { ar: "الجهد", en: "Voltage" }, value: { ar: "24V", en: "24V" } },
      { label: { ar: "التغطية", en: "Coverage" }, value: { ar: "200m2", en: "200m2" } },
    ]);
  });

  it("stores null when only one language has the line", () => {
    const specs = parseSpecs("اللون: أحمر", "");
    expect(specs).toEqual([{ label: { ar: "اللون", en: null }, value: { ar: "أحمر", en: null } }]);
  });

  it("splits on the FIRST colon so values may contain colons", () => {
    const specs = parseSpecs("Time: 00:30", "Time: 00:30");
    expect(specs[0]?.value).toEqual({ ar: "00:30", en: "00:30" });
  });

  it("skips lines without a colon", () => {
    expect(parseSpecs("no colon here", "no colon here")).toEqual([]);
  });
});

describe("formatSpecs()", () => {
  it("rebuilds each language, dropping rows that have no translation", () => {
    const specs = parseSpecs("الجهد: 24V\nاللون: أحمر", "Voltage: 24V");

    expect(formatSpecs(specs, "ar")).toBe("الجهد: 24V\nاللون: أحمر");
    expect(formatSpecs(specs, "en")).toBe("Voltage: 24V");
  });
});

describe("formatFeatures()", () => {
  it("joins with newlines", () => {
    expect(formatFeatures(["a", "b"])).toBe("a\nb");
    expect(formatFeatures([])).toBe("");
  });
});

describe("inventory numbers", () => {
  it("accepts positive integers only", () => {
    expect(isValidProductId("1")).toBe(true);
    expect(isValidProductId(" 42 ")).toBe(true);
    expect(isValidProductId("")).toBe(false);
    expect(isValidProductId("0")).toBe(false);
    expect(isValidProductId("-3")).toBe(false);
    expect(isValidProductId("12.5")).toBe(false);
    expect(isValidProductId("12a")).toBe(false);
    expect(normalizeProductId(" 7 ")).toBe(7);
  });
});

describe("validateProductForm()", () => {
  it("passes a fully populated form", () => {
    expect(validateProductForm(base, [1, 2])).toEqual({});
    expect(hasErrors(validateProductForm(base, [1, 2]))).toBe(false);
  });

  it("rejects an empty form with one error per required field", () => {
    const empty: ProductFormValues = { ...base, id: "", name_ar: "", name_en: "", category_id: "" };
    const errors = validateProductForm(empty, []);
    expect(Object.keys(errors).sort()).toEqual(["category_id", "id", "name_ar", "name_en"]);
  });

  it("flags an inventory number already used by another product", () => {
    expect(validateProductForm(base, [1001])).toEqual({ id: "admin.formDuplicateId" });
  });

  it("does not flag the number of the product being edited", () => {
    // `takenIds` is computed with the edited row removed, so this is the
    // editing case: the id is not in the list.
    expect(validateProductForm(base, [1002])).toEqual({});
  });

  it("rejects a malformed inventory number", () => {
    expect(validateProductForm({ ...base, id: "abc" }, []).id).toBe("admin.formIdInteger");
    expect(validateProductForm({ ...base, id: "-5" }, []).id).toBe("admin.formIdInteger");
  });

  it("does not require descriptions, features or specs", () => {
    const minimal: ProductFormValues = { ...base, description_ar: "", specs_ar: "" };
    expect(validateProductForm(minimal, [])).toEqual({});
  });
});
