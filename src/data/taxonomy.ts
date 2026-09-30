/**
 * Categories and brands — the only module that talks to those two tables.
 *
 * Deleting a category or brand that products still reference must be blocked
 * with a message that says HOW MANY products use it. We do that with an
 * explicit count (so the message is friendly) and the FK `on delete restrict`
 * in schema.sql backs it up if the count races.
 */
import type { Brand, Category } from "@/integrations/supabase/types";

import { getSupabase } from "@/data/client";
import { DataError, classifySupabaseError, toDataError } from "@/data/errors";

type PostgrestFailure = { code?: string | null; message?: string | null; status?: number };

function unwrap<T>(result: { data: T | null; error: PostgrestFailure | null }): T {
  if (result.error) {
    throw new DataError(
      classifySupabaseError(result.error),
      result.error.message ?? "supabase error",
      result.error,
      result.error.code ?? null,
    );
  }
  if (result.data === null) {
    throw new DataError("notfound", "no rows returned", undefined, "PGRST116");
  }
  return result.data;
}

export type Taxonomy = {
  categories: Category[];
  brands: Brand[];
  /** How many products point at each category / brand id. */
  categoryUsage: Record<string, number>;
  brandUsage: Record<string, number>;
};

/** Stable fallback so React ref-deps stay equal while the query loads. */
export const EMPTY_TAXONOMY: Taxonomy = {
  categories: [],
  brands: [],
  categoryUsage: {},
  brandUsage: {},
};

export async function fetchCategories(): Promise<Category[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort", { ascending: true })
      .order("name_en", { ascending: true });
    return unwrap({ data, error });
  } catch (error) {
    throw toDataError(error);
  }
}

export async function fetchBrands(): Promise<Brand[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("name_en", { ascending: true });
    return unwrap({ data, error });
  } catch (error) {
    throw toDataError(error);
  }
}

/** Public read — counts are safe to expose and the admin needs them. */
export async function fetchUsageCounts(): Promise<{
  categoryUsage: Record<string, number>;
  brandUsage: Record<string, number>;
}> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("category_id,brand_id")
      .limit(10000);
    const rows = unwrap({ data, error });

    const categoryUsage: Record<string, number> = {};
    const brandUsage: Record<string, number> = {};
    for (const row of rows) {
      categoryUsage[row.category_id] = (categoryUsage[row.category_id] ?? 0) + 1;
      if (row.brand_id) brandUsage[row.brand_id] = (brandUsage[row.brand_id] ?? 0) + 1;
    }
    return { categoryUsage, brandUsage };
  } catch (error) {
    throw toDataError(error);
  }
}

export async function fetchTaxonomy(): Promise<Taxonomy> {
  const [categories, brands, usage] = await Promise.all([
    fetchCategories(),
    fetchBrands(),
    fetchUsageCounts(),
  ]);
  return {
    categories,
    brands,
    categoryUsage: usage.categoryUsage,
    brandUsage: usage.brandUsage,
  };
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function assertUnused(kind: "category" | "brand", id: string, count: number): void {
  if (count > 0) {
    throw new DataError(
      "inuse",
      `${kind} ${id} is referenced by ${count} product(s)`,
      undefined,
      null,
      { n: count, name: id },
    );
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type CategoryWrite = { id: string; name_ar: string; name_en: string; sort: number };
export type BrandWrite = { id: string; name_ar: string; name_en: string };

export async function insertCategory(input: CategoryWrite): Promise<Category> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from("categories").insert(input).select("*").single();
    return unwrap({ data, error });
  } catch (error) {
    throw toDataError(error);
  }
}

export async function updateCategory(id: string, patch: Partial<CategoryWrite>): Promise<Category> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("categories")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    return unwrap({ data, error });
  } catch (error) {
    throw toDataError(error);
  }
}

export async function deleteCategory(id: string, usage: Record<string, number>): Promise<void> {
  assertUnused("category", id, usage[id] ?? 0);
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      throw new DataError(
        classifySupabaseError(error),
        error.message ?? "delete failed",
        error,
        error.code ?? null,
        { n: usage[id] ?? 0, name: id },
      );
    }
  } catch (error) {
    const dataError = toDataError(error);
    if (dataError.kind === "conflict" || dataError.code === "23503") {
      throw new DataError("inuse", dataError.message, error, dataError.code, {
        n: usage[id] ?? 0,
        name: id,
      });
    }
    throw dataError;
  }
}

export async function insertBrand(input: BrandWrite): Promise<Brand> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from("brands").insert(input).select("*").single();
    return unwrap({ data, error });
  } catch (error) {
    throw toDataError(error);
  }
}

export async function updateBrand(id: string, patch: Partial<BrandWrite>): Promise<Brand> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("brands")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    return unwrap({ data, error });
  } catch (error) {
    throw toDataError(error);
  }
}

export async function deleteBrand(id: string, usage: Record<string, number>): Promise<void> {
  assertUnused("brand", id, usage[id] ?? 0);
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) {
      throw new DataError(
        classifySupabaseError(error),
        error.message ?? "delete failed",
        error,
        error.code ?? null,
        { n: usage[id] ?? 0, name: id },
      );
    }
  } catch (error) {
    const dataError = toDataError(error);
    if (dataError.kind === "conflict" || dataError.code === "23503") {
      throw new DataError("inuse", dataError.message, error, dataError.code, {
        n: usage[id] ?? 0,
        name: id,
      });
    }
    throw dataError;
  }
}
