/**
 * Public URL for a stored product image.
 *
 * Kept out of `src/data/images.ts` on purpose: the upload pipeline drags the
 * whole storage client into anything that imports it, while the public pages
 * only need a string.
 */

export const PRODUCT_IMAGE_BUCKET = "product-images";

export function productImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = import.meta.env["VITE_SUPABASE_URL"];
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path}`;
}
