/**
 * Product reads/writes. The ONLY module in the app that talks to the
 * `products` table.
 */
import type { Product, ProductListRow, SpecRow } from "@/integrations/supabase/types";

import { getSupabase } from "@/data/client";
import { DataError, classifySupabaseError, toDataError } from "@/data/errors";

/**
 * Exactly the columns the public card grid renders. The list query must never
 * request `description_*`, `features_*` or `specs` — that is what keeps the
 * first paint of ~68 products small.
 */
export const PRODUCT_LIST_COLUMNS = "id,name_ar,name_en,category_id,brand_id,image_path";

export type ProductListResponse = {
  rows: ProductListRow[];
  /** `true` when the rows came from localStorage and are still being revalidated. */
  fromCache: boolean;
  /** Epoch ms of the cache entry, when it came from cache. */
  cachedAt: number | null;
};

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

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Grid columns only. */
export async function fetchProductList(): Promise<ProductListRow[]> {
  try {
    const supabase = await getSupabase();
    const result = await supabase
      .from("products")
      .select(PRODUCT_LIST_COLUMNS)
      .order("name_ar", { ascending: true });
    return unwrap({ data: result.data, error: result.error });
  } catch (error) {
    throw toDataError(error);
  }
}

/** One product, every column. Used by the details page and the admin editor. */
export async function fetchProduct(id: number): Promise<Product> {
  if (!Number.isInteger(id)) {
    throw new DataError("validation", `invalid product id: ${String(id)}`);
  }
  try {
    const supabase = await getSupabase();
    const result = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    const row = unwrap({ data: result.data, error: result.error });
    if (!row) throw new DataError("notfound", `product ${id} not found`);
    return row;
  } catch (error) {
    throw toDataError(error);
  }
}

/** `true` when an inventory number is already taken (duplicate prevention). */
export async function productExists(id: number, exceptId?: number): Promise<boolean> {
  try {
    const supabase = await getSupabase();
    const base = supabase.from("products").select("id").eq("id", id).limit(1);
    const result = await (exceptId === undefined ? base : base.neq("id", exceptId));
    const rows = unwrap({ data: result.data, error: result.error });
    return rows.length > 0;
  } catch (error) {
    throw toDataError(error);
  }
}

// ---------------------------------------------------------------------------
// Writes (all guarded by is_admin() in Postgres)
// ---------------------------------------------------------------------------

export type ProductWrite = {
  id: number;
  name_ar: string;
  name_en: string;
  category_id: string;
  brand_id: string | null;
  image_path: string | null;
  description_ar: string | null;
  description_en: string | null;
  features_ar: string[];
  features_en: string[];
  specs: SpecRow[];
};

export async function insertProduct(input: ProductWrite): Promise<Product> {
  try {
    const supabase = await getSupabase();
    const result = await supabase.from("products").insert(input).select("*").single();
    return unwrap({ data: result.data, error: result.error });
  } catch (error) {
    throw toDataError(error);
  }
}

export async function updateProduct(id: number, patch: Partial<ProductWrite>): Promise<Product> {
  try {
    const supabase = await getSupabase();
    const result = await supabase.from("products").update(patch).eq("id", id).select("*").single();
    return unwrap({ data: result.data, error: result.error });
  } catch (error) {
    throw toDataError(error);
  }
}

export async function deleteProduct(id: number): Promise<void> {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      throw new DataError(
        classifySupabaseError(error),
        error.message ?? "delete failed",
        error,
        error.code ?? null,
      );
    }
  } catch (error) {
    throw toDataError(error);
  }
}

/**
 * Duplicating a product must never collide on the inventory number: we return
 * the suggested id and let the editor ask the admin to confirm it.
 */
export async function nextInventoryNumber(): Promise<number> {
  try {
    const supabase = await getSupabase();
    const result = await supabase
      .from("products")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);
    const rows = unwrap({ data: result.data, error: result.error });
    const max = rows[0]?.id ?? 1000;
    return max + 1;
  } catch (error) {
    throw toDataError(error);
  }
}
