/**
 * Create / edit one product.
 *
 * Rules enforced here (see `src/lib/product-validation.ts`):
 *   - inventory number must be a positive integer and unique,
 *   - Arabic + English names and a category are required,
 *   - specs are `key: value` lines, features are one per line.
 *
 * Storage housekeeping: every object uploaded while the dialog is open is
 * tracked. Saving keeps only the final path; cancelling deletes whatever was
 * uploaded and never referenced.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { Product } from "@/integrations/supabase/types";

import { DataError, errorMessage } from "@/data/errors";
import { removeProductImage } from "@/data/images";
import { insertProduct, updateProduct, type ProductWrite } from "@/data/products";
import type { Taxonomy } from "@/data/taxonomy";
import { translate, type Lang, type TKey } from "@/lib/i18n";
import {
  formatFeatures,
  formatSpecs,
  hasErrors,
  normalizeProductId,
  parseFeatures,
  parseSpecs,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from "@/lib/product-validation";
import { ProductImageField } from "@/components/admin/ProductImageField";

type Props = {
  lang: Lang;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  product: Product | null;
  taxonomy: Taxonomy;
  /** Every inventory number already in use (the edited product excluded). */
  takenIds: readonly number[];
  onSaved: (product: Product, mode: "create" | "edit") => void;
};

const EMPTY_VALUES: ProductFormValues = {
  id: "",
  name_ar: "",
  name_en: "",
  category_id: "",
  brand_id: "",
  description_ar: "",
  description_en: "",
  features_ar: "",
  features_en: "",
  specs_ar: "",
  specs_en: "",
};

function valuesFromProduct(product: Product): ProductFormValues {
  return {
    id: String(product.id),
    name_ar: product.name_ar,
    name_en: product.name_en,
    category_id: product.category_id,
    brand_id: product.brand_id ?? "",
    description_ar: product.description_ar ?? "",
    description_en: product.description_en ?? "",
    features_ar: formatFeatures(product.features_ar ?? []),
    features_en: formatFeatures(product.features_en ?? []),
    specs_ar: formatSpecs(product.specs ?? [], "ar"),
    specs_en: formatSpecs(product.specs ?? [], "en"),
  };
}

export function ProductFormDialog({
  lang,
  open,
  onOpenChange,
  mode,
  product,
  taxonomy,
  takenIds,
  onSaved,
}: Props) {
  const [values, setValues] = useState<ProductFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    setUploadedPaths([]);
    setSaving(false);
    if (mode === "edit" && product) {
      setValues(valuesFromProduct(product));
      setImagePath(product.image_path);
    } else {
      setValues({
        ...EMPTY_VALUES,
        id: takenIds.length > 0 ? String(Math.max(...takenIds) + 1) : "1001",
      });
      setImagePath(null);
    }
  }, [open, mode, product, takenIds]);

  const selectedCategory = useMemo(
    () => taxonomy.categories.find((item) => item.id === values.category_id) ?? null,
    [taxonomy.categories, values.category_id],
  );

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function cleanup(keepPath: string | null) {
    const orphans = uploadedPaths.filter((path) => path !== keepPath);
    await Promise.allSettled(orphans.map((path) => removeProductImage(path)));
  }

  async function handleCancel() {
    if (saving) return;
    await cleanup(null);
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (saving) return;
    setSubmitError(null);

    const found = validateProductForm(values, takenIds);
    if (hasErrors(found)) {
      setErrors(found);
      setSubmitError(translate(lang, "admin.formInvalid"));
      return;
    }

    const id = normalizeProductId(values.id);
    const payload: ProductWrite = {
      id,
      name_ar: values.name_ar.trim(),
      name_en: values.name_en.trim(),
      category_id: values.category_id,
      brand_id: values.brand_id || null,
      image_path: imagePath,
      description_ar: values.description_ar.trim() || null,
      description_en: values.description_en.trim() || null,
      features_ar: parseFeatures(values.features_ar),
      features_en: parseFeatures(values.features_en),
      specs: parseSpecs(values.specs_ar, values.specs_en),
    };

    const previousPath = mode === "edit" && product ? product.image_path : null;

    setSaving(true);
    try {
      const saved =
        mode === "edit" && product
          ? await updateProduct(product.id, payload)
          : await insertProduct(payload);

      const orphans = uploadedPaths.filter((path) => path !== saved.image_path);
      if (previousPath && previousPath !== saved.image_path) orphans.push(previousPath);
      await Promise.allSettled(orphans.map((path) => removeProductImage(path)));

      setUploadedPaths([]);
      onSaved(saved, mode);
    } catch (error) {
      const dataError = error instanceof DataError ? error : null;
      if (dataError?.kind === "conflict") setErrors({ id: "admin.formDuplicateId" });
      setSubmitError(
        errorMessage(dataError?.kind ?? "unknown", lang, dataError?.params ?? undefined),
      );
    } finally {
      setSaving(false);
    }
  }

  const title =
    mode === "edit" && product
      ? `${translate(lang, "admin.products.edit")} · ${product.id}`
      : translate(lang, "admin.products.new");

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : void handleCancel())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {selectedCategory
              ? `${translate(lang, "admin.field.category")}: ${selectedCategory.name_en}`
              : translate(lang, "admin.field.idHint")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={translate(lang, "admin.field.id")}
              error={errors.id}
              lang={lang}
              htmlFor="pf-id"
            >
              <Input
                id="pf-id"
                inputMode="numeric"
                dir="ltr"
                value={values.id}
                onChange={(event) => set("id", event.target.value)}
                aria-invalid={errors.id !== undefined}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {translate(lang, "admin.field.idHint")}
              </p>
            </Field>

            <Field
              label={translate(lang, "admin.field.category")}
              error={errors.category_id}
              lang={lang}
              htmlFor="pf-category"
            >
              <Select
                value={values.category_id}
                onValueChange={(value) => set("category_id", value)}
              >
                <SelectTrigger id="pf-category" aria-invalid={errors.category_id !== undefined}>
                  <SelectValue placeholder={translate(lang, "admin.field.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {taxonomy.categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={translate(lang, "admin.field.nameAr")}
              error={errors.name_ar}
              lang={lang}
              htmlFor="pf-name-ar"
            >
              <Input
                id="pf-name-ar"
                dir="rtl"
                lang="ar"
                value={values.name_ar}
                onChange={(event) => set("name_ar", event.target.value)}
                aria-invalid={errors.name_ar !== undefined}
              />
            </Field>

            <Field
              label={translate(lang, "admin.field.nameEn")}
              error={errors.name_en}
              lang={lang}
              htmlFor="pf-name-en"
            >
              <Input
                id="pf-name-en"
                dir="ltr"
                lang="en"
                value={values.name_en}
                onChange={(event) => set("name_en", event.target.value)}
                aria-invalid={errors.name_en !== undefined}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={translate(lang, "admin.field.brand")} lang={lang} htmlFor="pf-brand">
              <Select value={values.brand_id} onValueChange={(value) => set("brand_id", value)}>
                <SelectTrigger id="pf-brand">
                  <SelectValue placeholder={translate(lang, "admin.field.selectBrand")} />
                </SelectTrigger>
                <SelectContent>
                  {taxonomy.brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="hidden sm:block" />
          </div>

          <Field label={translate(lang, "admin.field.descAr")} lang={lang} htmlFor="pf-desc-ar">
            <Textarea
              id="pf-desc-ar"
              dir="rtl"
              lang="ar"
              rows={3}
              value={values.description_ar}
              onChange={(event) => set("description_ar", event.target.value)}
            />
          </Field>

          <Field label={translate(lang, "admin.field.descEn")} lang={lang} htmlFor="pf-desc-en">
            <Textarea
              id="pf-desc-en"
              dir="ltr"
              lang="en"
              rows={3}
              value={values.description_en}
              onChange={(event) => set("description_en", event.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={translate(lang, "admin.field.featuresAr")}
              lang={lang}
              htmlFor="pf-feat-ar"
            >
              <Textarea
                id="pf-feat-ar"
                dir="rtl"
                lang="ar"
                rows={4}
                value={values.features_ar}
                onChange={(event) => set("features_ar", event.target.value)}
              />
            </Field>

            <Field
              label={translate(lang, "admin.field.featuresEn")}
              lang={lang}
              htmlFor="pf-feat-en"
            >
              <Textarea
                id="pf-feat-en"
                dir="ltr"
                lang="en"
                rows={4}
                value={values.features_en}
                onChange={(event) => set("features_en", event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={translate(lang, "admin.field.specsAr")} lang={lang} htmlFor="pf-specs-ar">
              <Textarea
                id="pf-specs-ar"
                dir="rtl"
                lang="ar"
                rows={4}
                placeholder={"الجهد: 24 فولت\nالتغطية: 200 م²"}
                value={values.specs_ar}
                onChange={(event) => set("specs_ar", event.target.value)}
              />
            </Field>

            <Field label={translate(lang, "admin.field.specsEn")} lang={lang} htmlFor="pf-specs-en">
              <Textarea
                id="pf-specs-en"
                dir="ltr"
                lang="en"
                rows={4}
                placeholder={"Voltage: 24V DC\nCoverage: 200 m²"}
                value={values.specs_en}
                onChange={(event) => set("specs_en", event.target.value)}
              />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            {translate(lang, "admin.field.specsHint")}
          </p>

          <ProductImageField
            lang={lang}
            productId={
              values.id.trim() && /^\d+$/.test(values.id.trim())
                ? normalizeProductId(values.id)
                : null
            }
            value={imagePath}
            onChange={setImagePath}
            onUploaded={(path) => setUploadedPaths((current) => [...current, path])}
          />
        </div>

        {submitError && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
          >
            {submitError}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleCancel()}
            disabled={saving}
          >
            {translate(lang, "common.cancel")}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {translate(lang, "common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
