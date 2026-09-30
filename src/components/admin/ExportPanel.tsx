/**
 * "Export all to JSON" — a full backup of the three tables in one file.
 *
 * The document shape lives in `src/lib/export-payload.ts` and is also read by
 * `scripts/import-json.mjs`. Everything is fetched fresh rather than
 * serialising the cached list, so a backup cannot silently miss rows the
 * public page never asked for.
 */
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { DataError, errorMessage } from "@/data/errors";
import { getSupabase } from "@/data/client";
import { buildExportPayload, exportFileName, serializePayload } from "@/lib/export-payload";
import { translate, type Lang } from "@/lib/i18n";

function expectData<T>(result: { data: T | null; error: { message?: string | null } | null }): T {
  if (result.error) throw new DataError("unknown", result.error.message ?? "query failed");
  if (result.data === null) throw new DataError("notfound", "no data returned");
  return result.data;
}

export function ExportPanel({ lang }: { lang: Lang }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const supabase = await getSupabase();
      const [categories, brands, products] = await Promise.all([
        supabase.from("categories").select("*").order("sort"),
        supabase.from("brands").select("*").order("name_en"),
        supabase.from("products").select("*").order("id"),
      ]);

      const payload = buildExportPayload({
        categories: expectData(categories),
        brands: expectData(brands),
        products: expectData(products),
      });

      if (
        payload.categories.length === 0 &&
        payload.brands.length === 0 &&
        payload.products.length === 0
      ) {
        toast(translate(lang, "admin.export.empty"));
        return;
      }

      const blob = new Blob([serializePayload(payload)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportFileName();
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success(translate(lang, "admin.export.done"));
    } catch (error) {
      const dataError = error instanceof DataError ? error : null;
      toast.error(errorMessage(dataError?.kind ?? "unknown", lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-2xl rounded-lg border border-border bg-background p-6">
      <h2 className="font-display text-xl font-bold">{translate(lang, "admin.export.title")}</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">
        {translate(lang, "admin.export.body")}
      </p>
      <p className="mt-3 break-all font-mono text-xs text-muted-foreground" dir="ltr">
        {translate(lang, "admin.export.fileHint", { name: exportFileName() })}
      </p>

      <Button className="mt-5" onClick={() => void download()} disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {translate(lang, "admin.export.download")}
      </Button>
    </section>
  );
}
