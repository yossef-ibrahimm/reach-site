import { describe, expect, it } from "vitest";

import {
  DataError,
  classifySupabaseError,
  errorMessage,
  errorMessageKey,
  toDataError,
} from "@/data/errors";

describe("classifySupabaseError()", () => {
  it("maps Postgres codes onto failure kinds", () => {
    expect(classifySupabaseError({ code: "23505" })).toBe("conflict");
    expect(classifySupabaseError({ code: "23514" })).toBe("validation");
    expect(classifySupabaseError({ code: "23503" })).toBe("validation");
    expect(classifySupabaseError({ code: "42501" })).toBe("forbidden");
    expect(classifySupabaseError({ code: "PGRST301", status: 401 })).toBe("session");
    expect(classifySupabaseError({ status: 403 })).toBe("forbidden");
    expect(classifySupabaseError({ status: 404 })).toBe("notfound");
    expect(classifySupabaseError({})).toBe("unknown");
  });

  it("treats an RLS violation message as forbidden even without a code", () => {
    expect(classifySupabaseError({ message: "new row violates row-level security policy" })).toBe(
      "forbidden",
    );
  });
});

describe("toDataError()", () => {
  it("passes DataError through unchanged", () => {
    const original = new DataError("conflict", "dup");
    expect(toDataError(original)).toBe(original);
  });

  it("treats a TypeError as a network failure", () => {
    const error = toDataError(new TypeError("Failed to fetch"));
    expect(error.kind).toBe("network");
  });

  it("classifies a thrown PostgrestError-shaped object", () => {
    const error = toDataError({ code: "23505", message: "duplicate key" });
    expect(error.kind).toBe("conflict");
    expect(error.code).toBe("23505");
  });

  it("flags auth-sounding messages", () => {
    expect(toDataError(new Error("JWT expired")).kind).toBe("session");
    expect(toDataError(new Error("boom")).kind).toBe("unknown");
  });

  it("handles non-Error values", () => {
    expect(toDataError("oops").kind).toBe("unknown");
    expect(toDataError("oops").message).toBe("oops");
  });
});

describe("bilingual error copy", () => {
  it("has a message key for every failure kind", () => {
    for (const kind of [
      "network",
      "session",
      "forbidden",
      "validation",
      "credentials",
      "conflict",
      "inuse",
      "notfound",
      "config",
      "unknown",
    ] as const) {
      expect(errorMessage(kind, "ar"), kind).toBeTruthy();
      expect(errorMessage(kind, "en"), kind).toBeTruthy();
      expect(errorMessageKey(kind), kind).toBeTruthy();
    }
  });

  it("interpolates the usage count on an in-use failure", () => {
    expect(errorMessage("inuse", "en", { n: 12, name: "alarms" })).toBe(
      "Cannot delete: alarms is still linked to 12 product(s).",
    );
    expect(errorMessage("inuse", "ar", { n: 12, name: "alarms" })).toContain("12");
  });

  it("keeps unknown vars verbatim rather than printing undefined", () => {
    expect(errorMessage("inuse", "en")).toBe(
      "Cannot delete: {name} is still linked to {n} product(s).",
    );
  });

  it("separates bad credentials from generic validation", () => {
    expect(errorMessage("credentials", "en")).toBe("Incorrect e-mail or password.");
    expect(errorMessageKey("credentials")).toBe("error.credentials");
    expect(errorMessageKey("validation")).toBe("error.validation");
  });
});
