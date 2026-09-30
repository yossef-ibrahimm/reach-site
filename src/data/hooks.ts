/**
 * React bindings for `src/data/*`.
 *
 * Caching strategy = stale-while-revalidate:
 *   1. render the localStorage snapshot immediately (`placeholderData`),
 *   2. refetch in the background,
 *   3. write the fresh result back to localStorage on success.
 * That keeps a repeat visit to the catalogue instant even when Supabase is
 * slow or unreachable, and the public site stays useful when it is down.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Brand, Category, Product, ProductListRow } from "@/integrations/supabase/types";

import {
  PRODUCTS_CACHE_KEY,
  TAXONOMY_CACHE_KEY,
  browserStorage,
  readCache,
  writeCache,
} from "@/data/cache";
import { fetchProduct, fetchProductList } from "@/data/products";
import { fetchTaxonomy, type Taxonomy } from "@/data/taxonomy";

export const queryKeys = {
  products: ["products", "list"] as const,
  product: (id: number) => ["products", "detail", id] as const,
  taxonomy: ["taxonomy"] as const,
};

function cachedOrDefault<T>(key: string): T | undefined {
  const hit = readCache<T>(browserStorage(), key);
  return hit ? hit.data : undefined;
}

function persist<T>(key: string, data: T): void {
  writeCache(browserStorage(), key, data);
}

export function useProductsQuery() {
  const query = useQuery({
    queryKey: queryKeys.products,
    queryFn: async () => {
      const rows = await fetchProductList();
      persist(PRODUCTS_CACHE_KEY, rows);
      return rows;
    },
    placeholderData: () => cachedOrDefault<ProductListRow[]>(PRODUCTS_CACHE_KEY),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return query;
}

export function useProductQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.product(id ?? -1),
    queryFn: async () => {
      const product = await fetchProduct(id as number);
      return product;
    },
    enabled: id !== null && Number.isInteger(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTaxonomyQuery() {
  return useQuery({
    queryKey: queryKeys.taxonomy,
    queryFn: async () => {
      const taxonomy = await fetchTaxonomy();
      persist(TAXONOMY_CACHE_KEY, taxonomy);
      return taxonomy;
    },
    placeholderData: () => cachedOrDefault<Taxonomy>(TAXONOMY_CACHE_KEY),
    staleTime: 5 * 60 * 1000,
  });
}

/** Admin lists may poll less politely than the public catalogue. */
export function useAdminProductsQuery() {
  return useQuery({
    queryKey: [...queryKeys.products, "admin"],
    queryFn: async () => {
      const rows = await fetchProductList();
      persist(PRODUCTS_CACHE_KEY, rows);
      return rows;
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/**
 * After any admin write, drop every list/detail cache so the next render (and
 * the public site) reflects the change immediately.
 */
export function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    await queryClient.invalidateQueries({ queryKey: ["taxonomy"] });
  };
}

export type { Product, Category, Brand, ProductListRow };
