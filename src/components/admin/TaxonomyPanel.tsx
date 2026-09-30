/**
 * Categories and brands CRUD.
 *
 * Deleting something products still reference is refused BEFORE the request
 * goes out (with the exact count in the message) and again by the FK in
 * Postgres, so a stale usage count cannot turn into a broken foreign key.
 */
import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Brand, Category } from "@/integrations/supabase/types";

import { useInvalidateCatalog, useTaxonomyQuery } from "@/data/hooks";
import { DataError, errorMessage } from "@/data/errors";
import {
  deleteBrand,
  deleteCategory,
  insertBrand,
  insertCategory,
  updateBrand,
  updateCategory,
} from "@/data/taxonomy";
import { translate, type Lang, type TKey } from "@/lib/i18n";

export function TaxonomyPanel({ lang }: { lang: Lang }) {
  const taxonomy = useTaxonomyQuery();

  if (taxonomy.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const data = taxonomy.data;
  if (!data) {
    return <ErrorBox lang={lang} error={taxonomy.error} onRetry={() => void taxonomy.refetch()} />;
  }

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <CategoryTable lang={lang} categories={data.categories} usage={data.categoryUsage} />
      <BrandTable lang={lang} brands={data.brands} usage={data.brandUsage} />
    </div>
  );
}

// ---------------------------------------------------------------------------

type BaseRow = { id: string; name_ar: string; name_en: string };

function useTaxonomyActions(lang: Lang, onDone: () => void) {
  return useMemo(
    () => ({
      report(error: unknown) {
        const dataError = error instanceof DataError ? error : null;
        toast.error(
          errorMessage(dataError?.kind ?? "unknown", lang, dataError?.params ?? undefined),
        );
      },
      /** Returns `true` only when the write actually landed. */
      async run(action: () => Promise<unknown>, message: TKey, vars: Record<string, string>) {
        try {
          await action();
          onDone();
          toast.success(translate(lang, message, vars));
          return true;
        } catch (error) {
          if (error instanceof DataError && error.kind === "inuse") {
            toast.error(translate(lang, "error.inUse", error.params ?? undefined));
            return false;
          }
          const dataError = error instanceof DataError ? error : null;
          toast.error(
            errorMessage(dataError?.kind ?? "unknown", lang, dataError?.params ?? undefined),
          );
          return false;
        }
      },
    }),
    [lang, onDone],
  );
}

type TaxonomyEditorProps<T extends BaseRow> = {
  lang: Lang;
  titleKey: TKey;
  newKey: TKey;
  sort?: boolean;
  rows: T[];
  usage: Record<string, number>;
  insert: (values: { id: string; name_ar: string; name_en: string; sort?: number }) => Promise<T>;
  update: (id: string, values: { name_ar?: string; name_en?: string; sort?: number }) => Promise<T>;
  remove: (id: string, usage: Record<string, number>) => Promise<void>;
  onFinished: () => void;
};

function TaxonomyEditor<T extends BaseRow>({
  lang,
  titleKey,
  newKey,
  sort = false,
  rows,
  usage,
  insert,
  update,
  remove,
  onFinished,
}: TaxonomyEditorProps<T>) {
  const actions = useTaxonomyActions(lang, onFinished);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [values, setValues] = useState({ id: "", name_ar: "", name_en: "", sort: "" });
  const [errors, setErrors] = useState<Partial<Record<"id" | "name_ar" | "name_en", TKey>>>({});
  const [saving, setSaving] = useState(false);

  function reset() {
    setValues({ id: "", name_ar: "", name_en: "", sort: "" });
    setErrors({});
    setCreating(false);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: typeof errors = {};
    const id = values.id.trim();
    const nameAr = values.name_ar.trim();
    const nameEn = values.name_en.trim();

    if (!id) found.id = "admin.taxonomy.idRequired";
    else if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) found.id = "admin.taxonomy.idInvalid";
    else if (rows.some((row) => row.id === id)) found.id = "admin.taxonomy.idExists";
    if (!nameAr) found.name_ar = "admin.taxonomy.arRequired";
    if (!nameEn) found.name_en = "admin.taxonomy.enRequired";

    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSaving(true);
    const ok = await actions.run(
      () =>
        insert({
          id,
          name_ar: nameAr,
          name_en: nameEn,
          ...(sort ? { sort: Number(values.sort) || rows.length + 1 } : {}),
        }),
      "admin.taxonomy.created",
      { name: nameEn },
    );
    setSaving(false);
    // Only clear the form when it really saved — otherwise a network failure
    // would wipe what the admin just typed.
    if (ok) reset();
  }

  async function confirmDelete() {
    const row = pendingDelete;
    if (!row) return;
    setPendingDelete(null);
    const count = usage[row.id] ?? 0;
    if (count > 0) {
      toast.error(translate(lang, "error.inUse", { n: count, name: row.name_en }));
      return;
    }
    await actions.run(() => remove(row.id, usage), "admin.taxonomy.deleted", {
      name: row.name_en,
    });
  }

  async function handleRename(row: T, field: "name_ar" | "name_en", value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === row[field]) return;
    const patch = field === "name_ar" ? { name_ar: trimmed } : { name_en: trimmed };
    await actions.run(() => update(row.id, patch), "admin.taxonomy.saved", {
      name: row.name_en,
    });
  }

  return (
    <section className="rounded-lg border border-border bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="font-display text-lg font-bold">{translate(lang, titleKey)}</h2>
        <Button size="sm" variant="outline" onClick={() => setCreating((value) => !value)}>
          <Plus className="size-4" />
          {translate(lang, newKey)}
        </Button>
      </header>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 border-b border-border bg-surface p-4 sm:grid-cols-2"
        >
          <Field
            label={translate(lang, "admin.taxonomy.id")}
            error={errors.id}
            lang={lang}
            htmlFor={`${titleKey}-id`}
          >
            <Input
              id={`${titleKey}-id`}
              dir="ltr"
              value={values.id}
              onChange={(event) => setValues((v) => ({ ...v, id: event.target.value }))}
              placeholder="alarms"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {translate(lang, "admin.taxonomy.idHint")}
            </p>
          </Field>

          {sort && (
            <Field
              label={translate(lang, "admin.taxonomy.sort")}
              lang={lang}
              htmlFor={`${titleKey}-sort`}
            >
              <Input
                id={`${titleKey}-sort`}
                type="number"
                min={1}
                value={values.sort}
                onChange={(event) => setValues((v) => ({ ...v, sort: event.target.value }))}
              />
            </Field>
          )}

          <Field
            label={translate(lang, "admin.taxonomy.nameAr")}
            error={errors.name_ar}
            lang={lang}
            htmlFor={`${titleKey}-ar`}
          >
            <Input
              id={`${titleKey}-ar`}
              dir="rtl"
              lang="ar"
              value={values.name_ar}
              onChange={(event) => setValues((v) => ({ ...v, name_ar: event.target.value }))}
            />
          </Field>

          <Field
            label={translate(lang, "admin.taxonomy.nameEn")}
            error={errors.name_en}
            lang={lang}
            htmlFor={`${titleKey}-en`}
          >
            <Input
              id={`${titleKey}-en`}
              dir="ltr"
              lang="en"
              value={values.name_en}
              onChange={(event) => setValues((v) => ({ ...v, name_en: event.target.value }))}
            />
          </Field>

          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={saving}>
              {translate(lang, "admin.taxonomy.save")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              {translate(lang, "common.cancel")}
            </Button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          {translate(lang, "admin.taxonomy.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">{translate(lang, "admin.taxonomy.id")}</TableHead>
                <TableHead>{translate(lang, "admin.taxonomy.nameAr")}</TableHead>
                <TableHead>{translate(lang, "admin.taxonomy.nameEn")}</TableHead>
                <TableHead className="w-28">{translate(lang, "admin.taxonomy.colUsage")}</TableHead>
                <TableHead className="text-end">
                  {translate(lang, "admin.products.colActions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const count = usage[row.id] ?? 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs" dir="ltr">
                      {row.id}
                    </TableCell>
                    <TableCell>
                      <EditableName
                        lang={lang}
                        value={row.name_ar}
                        onBlur={(next) => void handleRename(row, "name_ar", next)}
                      />
                    </TableCell>
                    <TableCell>
                      <EditableName
                        lang={lang}
                        value={row.name_en}
                        onBlur={(next) => void handleRename(row, "name_en", next)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={count > 0 ? "secondary" : "outline"}>
                        {count > 0
                          ? translate(lang, "admin.taxonomy.usage", { n: count })
                          : translate(lang, "admin.taxonomy.usageNone")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${translate(lang, "admin.products.delete")} ${row.name_en}`}
                        onClick={() => setPendingDelete(row)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {translate(lang, "admin.taxonomy.deleteTitle", {
                name: pendingDelete?.name_en ?? "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {translate(lang, "admin.taxonomy.deleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translate(lang, "common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              {translate(lang, "common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

// ---------------------------------------------------------------------------

function CategoryTable({
  lang,
  categories,
  usage,
}: {
  lang: Lang;
  categories: Category[];
  usage: Record<string, number>;
}) {
  const invalidate = useInvalidateCatalog();

  return (
    <TaxonomyEditor<Category>
      lang={lang}
      onFinished={() => void invalidate()}
      titleKey="admin.categories"
      newKey="admin.taxonomy.newCategory"
      sort
      rows={categories}
      usage={usage}
      insert={(values) => insertCategory({ ...values, sort: values.sort ?? 1 })}
      update={(id, values) => updateCategory(id, values)}
      remove={(id, counts) => deleteCategory(id, counts)}
    />
  );
}

function BrandTable({
  lang,
  brands,
  usage,
}: {
  lang: Lang;
  brands: Brand[];
  usage: Record<string, number>;
}) {
  const invalidate = useInvalidateCatalog();

  return (
    <TaxonomyEditor<Brand>
      lang={lang}
      onFinished={() => void invalidate()}
      titleKey="admin.brands"
      newKey="admin.taxonomy.newBrand"
      rows={brands}
      usage={usage}
      insert={(values) =>
        insertBrand({ id: values.id, name_ar: values.name_ar, name_en: values.name_en })
      }
      update={(id, values) => updateBrand(id, values)}
      remove={(id, counts) => deleteBrand(id, counts)}
    />
  );
}

// ---------------------------------------------------------------------------

function EditableName({
  lang,
  value,
  onBlur,
}: {
  lang: Lang;
  value: string;
  onBlur: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <Input
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => {
        if (event.target.value !== value) onBlur(event.target.value);
        else setDraft(value);
      }}
      className="h-8 min-w-32"
      aria-label={value}
    />
  );
}

function Field({
  label,
  error,
  lang,
  htmlFor,
  children,
}: {
  label: string;
  error?: TKey | undefined;
  lang: Lang;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-xs leading-5 text-destructive">
          {translate(lang, error)}
        </p>
      )}
    </div>
  );
}

function ErrorBox({ lang, error, onRetry }: { lang: Lang; error: unknown; onRetry: () => void }) {
  const dataError = error instanceof DataError ? error : null;
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-destructive">
        <AlertCircle className="size-4" aria-hidden="true" />
        {translate(lang, "products.errorTitle")}
      </p>
      <p className="mt-1 text-sm leading-6 text-destructive">
        {errorMessage(dataError?.kind ?? "unknown", lang, dataError?.params ?? undefined)}
      </p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
        {translate(lang, "common.retry")}
      </Button>
    </div>
  );
}
