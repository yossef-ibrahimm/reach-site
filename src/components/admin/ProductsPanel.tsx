/**
 * Admin product list: search, create, edit, duplicate, delete.
 *
 * Deletion is optimistic — the row disappears immediately and comes back if
 * the request fails — because waiting on a slow delete over a bad connection
 * feels broken. Every other action waits for the server so the id, name and
 * image shown are the ones that actually got stored.
 */
import { useMemo, useState } from "react";
import { AlertCircle, Copy, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Product, ProductListRow } from "@/integrations/supabase/types";

import { useAdminProductsQuery, useInvalidateCatalog, useTaxonomyQuery } from "@/data/hooks";
import { DataError, errorMessage } from "@/data/errors";
import {
  deleteProduct,
  fetchProduct,
  insertProduct,
  nextInventoryNumber,
  type ProductWrite,
} from "@/data/products";
import { publicUrl, removeProductImage } from "@/data/images";
import { translate, type Lang } from "@/lib/i18n";
import { ProductFormDialog } from "@/components/admin/ProductFormDialog";

export function ProductsPanel({ lang }: { lang: Lang }) {
  const products = useAdminProductsQuery();
  const taxonomy = useTaxonomyQuery();
  const invalidate = useInvalidateCatalog();

  const [term, setTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductListRow | null>(null);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<number>>(() => new Set());

  const rows = useMemo(() => products.data ?? [], [products.data]);

  const categoryNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of taxonomy.data?.categories ?? []) map.set(category.id, category.name_ar);
    return map;
  }, [taxonomy.data]);

  const brandNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const brand of taxonomy.data?.brands ?? []) map.set(brand.id, brand.name_ar);
    return map;
  }, [taxonomy.data]);

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const visible = rows.filter((row) => !deletingIds.has(row.id));
    if (!needle) return visible;
    return visible.filter(
      (row) =>
        String(row.id).includes(needle) ||
        row.name_ar.toLowerCase().includes(needle) ||
        row.name_en.toLowerCase().includes(needle),
    );
  }, [rows, term, deletingIds]);

  const editingRow = editingId === null ? null : (rows.find((row) => row.id === editingId) ?? null);
  const takenIds = useMemo(
    () => rows.filter((row) => row.id !== editingId).map((row) => row.id),
    [rows, editingId],
  );

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(id: number) {
    setMode("edit");
    setEditingId(id);
    setDialogOpen(true);
  }

  async function openDuplicate(row: ProductListRow) {
    try {
      const id = await nextInventoryNumber();
      // Duplicate the FULL row, not just the list columns: a copy with an empty
      // description or no features would silently lose the original's content.
      const source = await fetchProduct(row.id);
      const duplicate: ProductWrite = {
        id,
        name_ar: `${source.name_ar} (نسخة)`,
        name_en: `${source.name_en} (copy)`,
        category_id: source.category_id,
        brand_id: source.brand_id,
        // A copy starts WITHOUT an image: the stored object belongs to the
        // original row and must never be shared or deleted by the copy.
        image_path: null,
        description_ar: source.description_ar,
        description_en: source.description_en,
        features_ar: source.features_ar ?? [],
        features_en: source.features_en ?? [],
        specs: source.specs ?? [],
      };
      const saved = await insertProduct(duplicate);
      await invalidate();
      setMode("edit");
      setEditingId(saved.id);
      setDialogOpen(true);
      toast.success(translate(lang, "admin.products.duplicated", { n: saved.id }));
    } catch (error) {
      reportError(error, lang);
    }
  }

  async function confirmDelete() {
    const row = pendingDelete;
    if (!row) return;
    setPendingDelete(null);
    setDeletingIds((current) => new Set(current).add(row.id));

    try {
      await deleteProduct(row.id);
      await invalidate();
      // Best effort: the row is already gone, so a storage failure here must
      // not undo the delete — it only leaves a file we can clean up later.
      if (row.image_path) {
        await Promise.allSettled([removeProductImage(row.image_path)]);
      }
      toast.success(translate(lang, "admin.products.deleted", { n: row.id }));
    } catch (error) {
      reportError(error, lang);
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  }

  const errorText =
    products.error && !products.isLoading
      ? errorMessage((products.error as Partial<DataError>).kind ?? "unknown", lang)
      : null;

  const dialogProduct: Product | null = mode === "edit" ? (editingRow as Product | null) : null;
  const showCreateDialog = dialogOpen && mode === "create" && taxonomy.data !== undefined;
  const showEditDialog =
    dialogOpen && mode === "edit" && taxonomy.data !== undefined && dialogProduct !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={translate(lang, "admin.products.searchPlaceholder")}
            className="ps-9"
            aria-label={translate(lang, "admin.products.searchPlaceholder")}
          />
        </div>

        <Button
          variant="outline"
          onClick={() => void products.refetch()}
          disabled={products.isFetching}
        >
          <RefreshCw className={products.isFetching ? "size-4 animate-spin" : "size-4"} />
          {translate(lang, "admin.refresh")}
        </Button>

        <Button onClick={openCreate} disabled={taxonomy.isLoading}>
          <Plus className="size-4" />
          {translate(lang, "admin.products.new")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {translate(lang, "admin.products.count", { n: filtered.length })}
        {products.dataUpdatedAt > 0 && (
          <span className="ms-3">
            {translate(lang, "admin.lastUpdated", {
              at: new Date(products.dataUpdatedAt).toLocaleTimeString(lang),
            })}
          </span>
        )}
      </p>

      {products.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      )}

      {errorText && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            {translate(lang, "products.errorTitle")}
          </p>
          <p className="mt-1 text-sm leading-6 text-destructive">{errorText}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => void products.refetch()}
          >
            {translate(lang, "common.retry")}
          </Button>
        </div>
      )}

      {!products.isLoading && !errorText && filtered.length === 0 && (
        <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          {term ? translate(lang, "products.emptyTitle") : translate(lang, "admin.products.empty")}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">{translate(lang, "admin.products.colId")}</TableHead>
                <TableHead>{translate(lang, "admin.products.colName")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {translate(lang, "admin.products.colCategory")}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {translate(lang, "admin.products.colBrand")}
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  {translate(lang, "admin.products.colImage")}
                </TableHead>
                <TableHead className="text-end">
                  {translate(lang, "admin.products.colActions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.id}</TableCell>
                  <TableCell>
                    <span className="font-bold" lang="ar" dir="rtl">
                      {row.name_ar}
                    </span>
                    <span
                      className="mt-0.5 block text-xs text-muted-foreground"
                      lang="en"
                      dir="ltr"
                    >
                      {row.name_en}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">
                      {categoryNames.get(row.category_id) ?? row.category_id}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {row.brand_id ? (
                      <Badge variant="outline">
                        {brandNames.get(row.brand_id) ?? row.brand_id}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {row.image_path ? (
                      <img
                        src={publicUrl(row.image_path)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-9 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {translate(lang, "admin.field.none")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={translate(lang, "admin.products.edit")}
                        onClick={() => openEdit(row.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={translate(lang, "admin.products.duplicate")}
                        onClick={() => void openDuplicate(row)}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={translate(lang, "admin.products.delete")}
                        onClick={() => setPendingDelete(row)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(showCreateDialog || showEditDialog) && taxonomy.data && (
        <ProductFormDialog
          lang={lang}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={mode}
          product={dialogProduct}
          taxonomy={taxonomy.data}
          takenIds={takenIds}
          onSaved={(saved, savedMode) => {
            setDialogOpen(false);
            void invalidate();
            toast.success(
              translate(
                lang,
                savedMode === "create" ? "admin.products.created" : "admin.products.updated",
                { n: saved.id },
              ),
            );
          }}
        />
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {translate(lang, "admin.products.deleteTitle", { n: pendingDelete?.id ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {translate(lang, "admin.products.deleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translate(lang, "common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              {translate(lang, "admin.products.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function reportError(error: unknown, lang: Lang): void {
  const dataError = error instanceof DataError ? error : null;
  toast.error(errorMessage(dataError?.kind ?? "unknown", lang, dataError?.params ?? undefined));
}
