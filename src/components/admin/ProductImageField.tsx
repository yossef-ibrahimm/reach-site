/**
 * Upload / replace / remove a single product image with progress feedback.
 *
 * The file is resized to 1200px WebP by `src/data/images.ts` before upload, so
 * whatever the admin picks, the byte budget stays bounded. The object path is
 * derived from the inventory number typed in the form — the row must exist
 * before we can talk about a "product image", but the path itself does not
 * depend on it.
 */
import { useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { translate, type Lang } from "@/lib/i18n";
import { DataError, errorMessage } from "@/data/errors";
import { MAX_IMAGE_BYTES, publicUrl, uploadProductImage } from "@/data/images";

type Props = {
  lang: Lang;
  /** Valid inventory number, or `null` when the id field is not usable yet. */
  productId: number | null;
  value: string | null;
  onChange: (path: string | null) => void;
  /** Called once per successful upload so the dialog can clean up on cancel. */
  onUploaded?: (path: string) => void;
};

export function ProductImageField({ lang, productId, value, onChange, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (productId === null) {
      setError(translate(lang, "admin.formIdInteger"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(translate(lang, "admin.image.tooLarge", { mb: MAX_IMAGE_BYTES / (1024 * 1024) }));
      return;
    }

    setBusy(true);
    setPercent(0);
    try {
      const path = await uploadProductImage(productId, file, setPercent);
      onChange(path);
      onUploaded?.(path);
      setError(translate(lang, "admin.image.uploaded"));
    } catch (caught) {
      const kind = caught instanceof DataError ? caught.kind : "unknown";
      setError(errorMessage(kind, lang, (caught as DataError | undefined)?.params ?? undefined));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    const previous = value;
    setError(null);
    // Deliberately NOT deleted here. The object may still be referenced by the
    // saved row, and the admin may cancel the dialog: `ProductFormDialog`
    // deletes the previous file only after a save actually changes image_path,
    // and keeps it untouched on cancel.
    onChange(null);
    if (previous) setError(translate(lang, "admin.image.removePending"));
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-bold">{translate(lang, "admin.field.image")}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-background">
          {value ? (
            <img
              src={publicUrl(value)}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || productId === null}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-4" aria-hidden="true" />
            )}
            {value ? translate(lang, "admin.image.replace") : translate(lang, "admin.image.choose")}
          </Button>

          {value && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={handleRemove}>
              <Trash2 className="size-4" aria-hidden="true" />
              {translate(lang, "admin.image.remove")}
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={busy}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {busy && (
        <div className="mt-3">
          <Progress
            value={percent}
            aria-label={translate(lang, "admin.image.uploading", { pct: percent })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {translate(lang, "admin.image.uploading", { pct: percent })}
          </p>
        </div>
      )}

      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        {translate(lang, "admin.image.hint")}
      </p>

      <p className="mt-1 break-all font-mono text-[11px] leading-5 text-muted-foreground" dir="ltr">
        {value ?? translate(lang, "admin.field.none")}
      </p>

      {error && (
        <p role="status" className="mt-2 text-xs leading-6 text-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
