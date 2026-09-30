/**
 * The signed-in admin workspace: header, tabs, and the three panels.
 *
 * Loaded with `React.lazy` from the route so nothing in here — not react-query
 * panels, not the form dialogs, not the image pipeline — is paid for by a
 * visitor who never opens /manage-x7k2.
 */
import { useState } from "react";
import { ExternalLink, LogOut, Package, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { translate, type Lang } from "@/lib/i18n";
import { useAdmin } from "@/components/admin/admin-context";
import { ExportPanel } from "@/components/admin/ExportPanel";
import { ProductsPanel } from "@/components/admin/ProductsPanel";
import { TaxonomyPanel } from "@/components/admin/TaxonomyPanel";

type Props = { lang: Lang };

export default function AdminApp({ lang }: Props) {
  const { email, signOut } = useAdmin();
  const [tab, setTab] = useState("products");

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="font-display text-xl font-extrabold leading-8">
              {translate(lang, "admin.title")}
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
              {email
                ? translate(lang, "admin.signedInAs", { email })
                : translate(lang, "admin.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                {translate(lang, "admin.backToSite")}
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden="true" />
              {translate(lang, "admin.signOut")}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="products" className="gap-2">
              <Package className="size-4" aria-hidden="true" />
              {translate(lang, "admin.tabProducts")}
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="gap-2">
              <Tags className="size-4" aria-hidden="true" />
              {translate(lang, "admin.tabCategories")}
            </TabsTrigger>
            <TabsTrigger value="export">{translate(lang, "admin.tabExport")}</TabsTrigger>
          </TabsList>

          <Separator className="my-5" />

          <TabsContent value="products">
            <ProductsPanel lang={lang} />
          </TabsContent>
          <TabsContent value="taxonomy">
            <TaxonomyPanel lang={lang} />
          </TabsContent>
          <TabsContent value="export">
            <ExportPanel lang={lang} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
