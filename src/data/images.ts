/**
 * Product image pipeline: resize → WebP → upload to the private-by-default
 * `product-images` bucket (RLS in schema.sql restricts writes to admins).
 *
 * Everything is normalised BEFORE upload so the storage cost and the byte size
 * users download are bounded no matter who uploads what.
 */
import { getSupabase } from "@/data/client";
import { DataError, toDataError } from "@/data/errors";
import { PRODUCT_IMAGE_BUCKET, productImageUrl } from "@/lib/image-url";

export const IMAGE_BUCKET = PRODUCT_IMAGE_BUCKET;
/** Hard cap enforced client-side; schema does not enforce it. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Longest edge of the stored image, in pixels. */
export const MAX_IMAGE_EDGE = 1200;
export const WEBP_QUALITY = 0.85;

function resizeCanvas(source: HTMLCanvasElement, edge: number): HTMLCanvasElement {
  const scale = Math.min(1, edge / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const target = document.createElement("canvas");
  target.width = width;
  target.height = height;
  const context = target.getContext("2d");
  if (!context) throw new DataError("unknown", "2d canvas unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return target;
}

function drawBitmap(bitmap: ImageBitmap): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new DataError("unknown", "2d canvas unavailable");
  context.drawImage(bitmap, 0, 0);
  return canvas;
}

async function decode(file: Blob): Promise<HTMLCanvasElement> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = drawBitmap(bitmap);
      bitmap.close();
      return canvas;
    } catch {
      /* fall through to the <img> decoder */
    }
  }

  return await new Promise<HTMLCanvasElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new DataError("unknown", "2d canvas unavailable"));
        return;
      }
      context.drawImage(image, 0, 0);
      resolve(canvas);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new DataError("validation", "image could not be decoded"));
    };
    image.src = url;
  });
}

/**
 * Downscale to at most `MAX_IMAGE_EDGE` px and re-encode as WebP.
 * Returns `null` when the browser cannot produce WebP, so the caller can fall
 * back to uploading the original instead of failing the save.
 */
export async function prepareProductImage(file: File): Promise<Blob | null> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new DataError("validation", `image exceeds ${MAX_IMAGE_BYTES} bytes`);
  }
  if (!file.type.startsWith("image/")) {
    throw new DataError("validation", `not an image: ${file.type}`);
  }

  const decoded = await decode(file);
  const resized = resizeCanvas(decoded, MAX_IMAGE_EDGE);

  if (typeof resized.toBlob !== "function") return null;
  return await new Promise<Blob | null>((resolve) =>
    resized.toBlob(resolve, "image/webp", WEBP_QUALITY),
  );
}

/** `{inventoryNumber}/{epoch}.webp` — unique per upload so replaces never serve a cached copy. */
export function buildImagePath(productId: number, now: number = Date.now()): string {
  return `${productId}/${now}.webp`;
}

export function publicUrl(path: string): string {
  return productImageUrl(path) ?? "";
}

export type UploadProgress = (percent: number) => void;

export async function uploadProductImage(
  productId: number,
  file: File,
  onProgress?: UploadProgress,
): Promise<string> {
  onProgress?.(10);
  try {
    const blob = (await prepareProductImage(file)) ?? file;
    onProgress?.(55);

    const supabase = await getSupabase();
    const path = buildImagePath(productId);
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, blob, { upsert: false, contentType: blob.type || "image/webp" });
    if (error) throw new DataError("unknown", error.message, error, error.name ?? null);

    onProgress?.(100);
    return path;
  } catch (error) {
    throw toDataError(error);
  }
}

export async function removeProductImage(path: string): Promise<void> {
  if (!path) return;
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
    if (error) throw new DataError("unknown", error.message, error, error.name ?? null);
  } catch (error) {
    const dataError = toDataError(error);
    // A missing object is fine — the goal (no stored image) is already met.
    if (dataError.kind === "notfound") return;
    throw dataError;
  }
}
