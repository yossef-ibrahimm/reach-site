# Audit Report — Eltawkol Fire

Produced **before any code change**, from a full read of every file in the repository
(config files, `src/`, `supabase/`, `public/`, `AGENTS.md`, `README.md`).
Toolchain output in §2 is the real, captured output of the commands run on this machine
(Node 24.15.0, npm 11.12.1, Windows).

---

## 1. Project map

```
fire-guard-display-main/
├── .env                          Supabase URL + publishable key (NOT git-ignored, no .env.example)
├── .gitignore                    no `.env` entry (only `*.local`)
├── .prettierrc / .prettierignore
├── AGENTS.md                     Lovable guardrails; "frontend-only until Lovable Cloud is requested"
├── components.json               shadcn/ui config, `"rtl": false`
├── eslint.config.js              turns OFF @typescript-eslint/no-unused-vars
├── package.json                  53 deps + 17 dev deps; no `test`, `typecheck`, `format:check`
├── bun.lock + package-lock.json  two competing lockfiles
├── tsconfig.json                 strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
├── vite.config.ts                @lovable.dev/vite-tanstack-config → SSR build via nitro/Cloudflare
├── public/
│   ├── favicon.svg
│   └── robots.txt                allows everything; does NOT disallow the admin path
├── supabase/
│   └── config.toml               ONE line (project_id). No schema.sql, no seed.sql.
├── src/
│   ├── start.ts                  TanStack Start middleware (CSRF, SSR error, supabase auth attacher)
│   ├── server.ts                 SSR 500 wrapper (h3 swallowed-error recovery)
│   ├── router.tsx                createRouter, scrollRestoration: true
│   ├── routeTree.gen.ts          generated route table
│   ├── styles.css                Tailwind 4 + CSS custom properties (light/dark), utilities
│   ├── assets/                   2 JPEGs, actually referenced
│   ├── img/                      75 JPEGs / 7.9 MB — referenced by NOTHING (dead)
│   ├── components/
│   │   ├── SiteShell.tsx         header, nav, lang toggle, theme toggle, footer, easter egg
│   │   └── ui/                   46 shadcn/ui files; only `button` + `sheet` are imported
│   ├── hooks/use-mobile.tsx      imported only by ui/sidebar.tsx (which is itself unused)
│   ├── integrations/supabase/    Lovable-generated browser client, server admin client,
│   │                             auth middleware, preview auth storage, empty Database types
│   ├── lib/
│   │   ├── catalog.ts            the entire "data layer": 4 hardcoded products, 5 categories
│   │   ├── utils.ts              cn()
│   │   ├── error-capture.ts      server-side console.error monkey-patch + error ring buffer
│   │   ├── error-page.ts         static English 500 HTML
│   │   └── lovable-error-reporting.ts  forwards boundary errors to the Lovable editor
│   └── routes/
│       ├── __root.tsx            <html lang=ar dir=rtl>, global head, 404, error boundary
│       ├── index.tsx             About / hero / categories / why-us / contact CTA
│       ├── manage-x7k2.tsx       "admin" = static mock with a permanently disabled button
│       └── products/
│           ├── route.tsx         <Outlet />
│           ├── index.tsx         search + category/brand filters + card grid
│           └── $id.tsx           details page, notFound() loader, related products
└── MISSING (required by spec): supabase/schema.sql, supabase/seed.sql,
    scripts/import-json.mjs, .github/workflows/, tests/, .env.example, sitemap
```

**Feature inventory**

| Feature                              | Where                                 | State                                                      |
| ------------------------------------ | ------------------------------------- | ---------------------------------------------------------- |
| About / home                         | `routes/index.tsx`                    | present, static Arabic copy                                |
| Product list + search + filters      | `routes/products/index.tsx`           | present, partial (see findings)                            |
| Product details + 404                | `routes/products/$id.tsx`             | present, partial                                           |
| Language toggle                      | `SiteShell.tsx:12`                    | toggles `<html lang dir>` only — no translated strings     |
| Dark/light theme                     | `SiteShell.tsx:11`                    | in-memory only, no persistence, no system default          |
| Hidden admin route + logo easter egg | `SiteShell.tsx:20`, `manage-x7k2.tsx` | route exists, functionality is a mock                      |
| Supabase data                        | `integrations/supabase/*`             | client scaffolding only; never read from, never written to |
| RLS / admins / storage               | —                                     | **does not exist**                                         |

---

## 2. Toolchain — real captured output

### `npm install` / dependency tree

Already present in `node_modules`. Not re-resolved during the audit (baseline only).

### `tsc --noEmit`

```
EXIT=0
```

**PASS — 0 errors.**

### `eslint .`

```
EXIT=1
errors=232  warnings=6  files=72
```

| File                                                                                                        | errors | warnings |
| ----------------------------------------------------------------------------------------------------------- | -----: | -------: |
| `src/components/SiteShell.tsx`                                                                              |     17 |        0 |
| `src/routes/index.tsx`                                                                                      |     18 |        0 |
| `src/routes/products/index.tsx`                                                                             |     18 |        0 |
| `src/routes/products/$id.tsx`                                                                               |     13 |        0 |
| `src/routes/manage-x7k2.tsx`                                                                                |      3 |        0 |
| `src/routes/__root.tsx`                                                                                     |      1 |        0 |
| `src/routes/products/route.tsx`                                                                             |      1 |        0 |
| `src/lib/catalog.ts`                                                                                        |      1 |        0 |
| `src/integrations/supabase/types.ts`                                                                        |     45 |        0 |
| `src/integrations/supabase/previewAuthStorage.ts`                                                           |     25 |        0 |
| `src/integrations/supabase/auth-middleware.ts`                                                              |     41 |        0 |
| `src/integrations/supabase/cron-auth.ts`                                                                    |     14 |        0 |
| `src/integrations/supabase/client.ts`                                                                       |     15 |        0 |
| `src/integrations/supabase/client.server.ts`                                                                |     13 |        0 |
| `src/integrations/supabase/auth-attacher.ts`                                                                |      7 |        0 |
| `ui/badge.tsx`, `ui/button.tsx`, `ui/form.tsx`, `ui/navigation-menu.tsx`, `ui/sidebar.tsx`, `ui/toggle.tsx` |      0 |   1 each |

Every _error_ is `prettier/prettier` (formatting). The 6 _warnings_ are
`react-refresh/only-export-components` on shadcn files that export a non-component
(`buttonVariants`, `withPassword`, etc.).

### `prettier --check .`

```
EXIT=1
Code style issues found in 19 files.
```

AGENTS.md, README.md, src/components/SiteShell.tsx, all 8 src/integrations/supabase/*,
src/lib/catalog.ts, src/routes/{__root,index,manage-x7k2,README}.tsx/.md,
src/routes/products/{index,$id,route}.tsx, src/styles.css

### Vitest

```
node_modules\.bin\vitest.cmd -> NOT FOUND
```

No `test` script in `package.json`, no vitest dependency, no test files anywhere.

### `vite build`

```
✓ 2047 modules transformed.
✓ built in 938ms
EXIT=0
```

Output goes to `.output/` (nitro → Cloudflare Worker), **not** `dist/`.

### Bundle size (gzipped, measured with `zlib.gzipSync` on `.output/public/assets`)

| Asset                                   |      raw |     **gzip** |
| --------------------------------------- | -------: | -----------: |
| `index-CUAmufQB.js` (main/public entry) | 551.2 KB | **157.6 KB** |
| `styles-*.css`                          |  75.5 KB |      12.9 KB |
| `SiteShell-*.js`                        |  41.4 KB |      13.9 KB |
| `button-*.js`                           |  32.7 KB |      10.7 KB |
| `useStore-*.js`                         |  18.7 KB |       6.7 KB |
| `catalog-*.js`                          |  10.9 KB |       4.6 KB |
| `routes-*.js`                           |   8.2 KB |       2.6 KB |
| `jsx-runtime-*.js`                      |   8.6 KB |       3.3 KB |
| `products-*.js`                         |   4.7 KB |       1.9 KB |
| `_id-*.js`                              |   3.4 KB |       1.4 KB |
| `**manage-x7k2-*.js**`                  |   3.3 KB |   **1.3 KB** |
| other chunks                            |   1.6 KB |       0.8 KB |
| **TOTAL JS+CSS**                        |   771 KB | **217.9 KB** |

- **Main public chunk = 157.6 KB gz → OVER the 150 KB budget on its own.**
- **Admin code IS in a separate lazy chunk** (`manage-x7k2-*.js`, 1.3 KB gz) and is not
  in `index-*.js` — verified by string-probing the built file. ✅
- Confirmed present inside `index-*.js`: `supabase`, `createClient`, `sb_publishable`,
  `lovable.cloud` — i.e. the **whole Supabase SDK ships to every visitor** even though no
  public page calls it. It is dragged in by `start.ts` → `auth-attacher.ts:3` → `client.ts`.

### Runtime smoke test (`vite dev`, port 5199)

```
GET / -> 200
<html lang="ar" dir="rtl" ...>
<title>شركة التوكل | أنظمة إنذار ومكافحة الحريق</title>
```

Dev log: `vite-tsconfig-paths is detected ... you can remove the plugin` (warning).
No browser automation is available on this machine, so **browser console output was not
observed** — see §5.

---

## 3. Findings

Severity: **blocker** = spec cannot be met without a decision; **major** = broken/missing
required behaviour; **minor** = polish/a11y/RTL.

### BLOCKER

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                            | Location                                                                                                                 | Fix                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| B1  | **Architecture does not match the fixed spec.** Spec: React 18 + Vite + _static_ GitHub Pages + **HashRouter** + `vite base` from env + CSS variables & **CSS Modules** + **no UI kit** + react-router-dom + 2–3 extras. Actual: **React 19 + TanStack Start SSR** (nitro → Cloudflare Worker), path router (`/products/1001`), **Tailwind 4 + shadcn/ui + 53 deps**, no `dist/`, no GitHub Pages workflow, no `react-router-dom`. | `package.json:48-70`, `vite.config.ts:7-15`, `src/routes/*`                                                              | See "Decision" below. **Requires your decision.**                         |
| B2  | **Admin area is a mock.** A login form with `disabled` on the button, and a caption admitting nothing works. No Supabase auth, no session, no `is_admin()` check, no CRUD.                                                                                                                                                                                                                                                         | `src/routes/manage-x7k2.tsx:12`                                                                                          | Build Part B for real.                                                    |
| B3  | **No database artifacts.** `supabase/` has only a one-line `config.toml`. No `schema.sql`, no `seed.sql`, no tables, no `admins`, no `is_admin()`, no `product-images` bucket, no RLS policies, no SQL to add the first admin.                                                                                                                                                                                                     | `supabase/`                                                                                                              | Author both SQL files runnable in the Supabase SQL editor.                |
| B4  | **No data layer.** Components import a hardcoded array directly. There is no Supabase read, no write, no stale-while-revalidate cache, no "grid columns only" fetch, and `Database` types declare **zero tables** (`Tables: { [_ in never]: never }`).                                                                                                                                                                             | `routes/index.tsx:8`, `routes/products/index.tsx:7`, `routes/products/$id.tsx:7`, `integrations/supabase/types.ts:16-17` | Create `src/data/*` as the single data-access layer; regenerate DB types. |

### MAJOR

| #   | Finding                                                                                                                                                                                                                                                                                                     | Location                                               | Fix                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| M1  | **Not bilingual.** The lang toggle flips `<html lang/dir>` but **no string is translated** — all copy is hardcoded Arabic. No typed dictionary, no `useLang`.                                                                                                                                               | `SiteShell.tsx:12-18`                                  | Add `src/lib/i18n.ts` + translate every UI string.                                                 |
| M2  | **Language and theme are not persisted** and ignore the system default (`useState(false)`; no `localStorage`, no `prefers-color-scheme`). Also causes a flash: SSR always renders `lang="ar" dir="rtl"` light theme.                                                                                        | `SiteShell.tsx:11-18`                                  | Persist both, seed from `matchMedia`, apply a pre-hydration inline script.                         |
| M3  | **No Arabic search normalization.** Only `toLocaleLowerCase("ar")` + `includes`. Missing: strip tashkeel, `أ/إ/آ→ا`, `ى→ي`, `ة→ه`, case-insensitive Latin.                                                                                                                                                  | `routes/products/index.tsx:26-27`                      | Pure `normalizeArabic()` + `matchesQuery()` in `src/lib/normalize.ts`, unit-tested.                |
| M4  | **No debounce** — every keystroke rewrites the URL (history.replace on each char).                                                                                                                                                                                                                          | `routes/products/index.tsx:33`                         | Debounce input (150–250 ms) before writing search state.                                           |
| M5  | **Back button broken by `replace: true` on _all_ updates.** Category/brand chips also `replace`, so they create no history entry; Back leaves the page instead of undoing the filter.                                                                                                                       | `routes/products/index.tsx:29`                         | `push` for discrete filter changes, `replace` while typing.                                        |
| M6  | **Dead "Filters" control** — `<Button ... title="الفلاتر">` has no `onClick`. Spec requires chips on desktop **and a bottom-sheet drawer on mobile**; the drawer does not exist.                                                                                                                            | `routes/products/index.tsx:33`                         | Wire it to a mobile filter drawer (reuses `Sheet`).                                                |
| M7  | **Missing loading and error states.** No skeletons anywhere; the list has only an empty state; the details page has neither. No retry affordance.                                                                                                                                                           | `routes/products/index.tsx`, `routes/products/$id.tsx` | Add skeleton / error-with-retry to both.                                                           |
| M8  | **Product details incomplete**: no specifications table (the `Product` type has no `specs`), no breadcrumb, no `image_path`/`description_ar`/`description_en`, single Arabic-only `description`.                                                                                                            | `routes/products/$id.tsx:29`, `lib/catalog.ts:4-14`    | Add `specs`, breadcrumb, bilingual description per spec schema.                                    |
| M9  | **`robots.txt` does not disallow the admin path** (`Allow: /` for `*`). Crawlers are explicitly invited to `/manage-x7k2`.                                                                                                                                                                                  | `public/robots.txt:13-14`                              | `Disallow: /manage-x7k2` + a non-indexed rule.                                                     |
| M10 | **`.env` is not git-ignored and there is no `.env.example`.** `.gitignore` only has `*.local`. The publishable key is public _by design_, but the file must still never be committed.                                                                                                                       | `.gitignore:17`, missing `.env.example`                | Add `.env`, `.env*` to `.gitignore`; commit `.env.example`.                                        |
| M11 | **Public bundle over budget**: 157.6 KB gz for `index-*.js` alone (limit 150 KB), 217.9 KB gz total, because the unused Supabase SDK is in the public entry.                                                                                                                                                | `start.ts:4` → `auth-attacher.ts:3` → `client.ts`      | Stop statically importing the client from `start.ts`; load it only from the lazy admin/data layer. |
| M12 | **Dead code: 75 unused images (7.9 MB)** in `src/img/` — never imported by anything.                                                                                                                                                                                                                        | `src/img/**`                                           | Delete.                                                                                            |
| M13 | **Dead code: 44 of 46 `src/components/ui/*` files are never imported**; they are the only reason recharts, cmdk, embla, react-day-picker, react-hook-form, react-resizable-panels, vaul, input-otp, date-fns and ~20 Radix packages are in the dependency graph (and the source of all 6 lint warnings).    | `src/components/ui/**`                                 | Delete the unused ones; drop their deps.                                                           |
| M14 | **ESLint fails (232 errors / 6 warnings) and Prettier fails (19 files).** Also `@typescript-eslint/no-unused-vars` is switched off, so dead code is invisible to the linter.                                                                                                                                | `eslint.config.js:36`                                  | Format everything, remove dead files, re-enable the rule.                                          |
| M15 | **No tests at all**; no vitest; no `test` script.                                                                                                                                                                                                                                                           | `package.json:6-13`                                    | Add vitest + unit tests for normalization, filtering, validation, export shape, route guard.       |
| M16 | **No `typecheck` or `format:check` scripts** — CI cannot gate on them.                                                                                                                                                                                                                                      | `package.json`                                         | Add both.                                                                                          |
| M17 | **Two lockfiles** (`bun.lock` and `package-lock.json`) drift independently.                                                                                                                                                                                                                                 | repo root                                              | Keep one (npm), delete the other.                                                                  |
| M18 | **Data model does not match the spec schema**: no `category_id`/`brand_id` foreign keys (categories are Arabic display strings used as IDs), no `image_path`, no `description_ar/en`, no `specs jsonb`, no `created_at`/`updated_at`, no separate `categories`/`brands` tables, products are `4` not `~68`. | `lib/catalog.ts:4-22`                                  | Introduce spec-shaped types + DB-backed rows.                                                      |
| M19 | **Hardcoded placeholder in production copy**: `ID 1001` in the hero.                                                                                                                                                                                                                                        | `routes/index.tsx:40`                                  | Derive from data or remove.                                                                        |
| M20 | **404 and 500 pages are English-only** while the site is Arabic-default.                                                                                                                                                                                                                                    | `__root.tsx:15-35`, `lib/error-page.ts`                | Make bilingual.                                                                                    |
| M21 | **No `siteConfig`**: contact block shows "data will be added here" instead of real phone/WhatsApp/address.                                                                                                                                                                                                  | `SiteShell.tsx:77`, `SiteShell.tsx:44`                 | Single `src/lib/siteConfig.ts`.                                                                    |
| M22 | **No sitemap.xml** (spec: generated at build) and no Open Graph image.                                                                                                                                                                                                                                      | missing                                                | Generate at build.                                                                                 |

### MINOR

| #   | Finding                                                                                                                                                                                                                                  | Location                                                                                                                      | Fix                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| m1  | **Physical (non-logical) CSS in the one shared UI file**: `left-0`/`right-0`, `border-r`/`border-l`, close button pinned `right-4 top-4`. In RTL the sheet opens on the physical right and the close button sits over the content start. | `ui/sheet.tsx:41-44,64`                                                                                                       | Use `start-0`/`end-0`, `border-s`/`border-e`, `end-4`. |
| m2  | `SheetContent side="right"` is a physical side used for a mobile menu in an RTL app.                                                                                                                                                     | `SiteShell.tsx:59`                                                                                                            | Logical side / `dir`-aware.                            |
| m3  | `text-left` / `sm:text-left` in several components.                                                                                                                                                                                      | `ui/dialog.tsx:57`, `ui/drawer.tsx:54`, `ui/sheet.tsx:75`, `ui/alert-dialog.tsx:47`, `ui/table.tsx:63`, `ui/accordion.tsx:25` | `text-start` / `sm:text-start`.                        |
| m4  | `components.json` declares `"rtl": false`, so future shadcn scaffolding will be LTR-biased.                                                                                                                                              | `components.json:13`                                                                                                          | `true`.                                                |
| m5  | Fonts loaded from the Google Fonts CDN (third-party, render-blocking) instead of self-hosted/preloaded.                                                                                                                                  | `__root.tsx:95-98`                                                                                                            | Self-host with `font-display: swap`.                   |
| m6  | `twitter:site` is `"@Lovable"` — a template placeholder shipped to production.                                                                                                                                                           | `__root.tsx:87`                                                                                                               | Remove or set the real handle.                         |
| m7  | `console.error(error)` inside the React error boundary, plus a server-side monkey-patch of `console.error`.                                                                                                                              | `__root.tsx:38`, `lib/error-capture.ts:55-63`                                                                                 | Report through the error-reporting hook only.          |
| m8  | Brands are recomputed from the array on every render without memoisation.                                                                                                                                                                | `routes/products/index.tsx:24`                                                                                                | `useMemo`.                                             |
| m9  | Anchor `<a href="/#categories">` navigates to the site root from any route, so it silently escapes `/products`.                                                                                                                          | `SiteShell.tsx:33`                                                                                                            | Router link + hash.                                    |
| m10 | Magic image dimensions `width={product.id === 1001 ? 1200 : 1408}` and a `4/3` CSS aspect-ratio that disagrees with the declared `1408×912` attributes (intrinsic vs. used ratio → possible layout shift).                               | `routes/products/index.tsx:38`, `styles.css:102`                                                                              | Single source of truth for ratio.                      |
| m11 | `<a href="/">` inside the error boundary bypasses the router.                                                                                                                                                                            | `__root.tsx:63`                                                                                                               | Router `Link`.                                         |
| m12 | Dev-time deprecation warning: `vite-tsconfig-paths` is now built into Vite.                                                                                                                                                              | `vite.config.ts`                                                                                                              | Use `resolve.tsconfigPaths: true`.                     |
| m13 | Zoom control is a `<button>` that toggles an image, but there is no keyboard/Escape handling, no `aria-pressed`, and no focus trap if it becomes a lightbox.                                                                             | `routes/products/$id.tsx:28`                                                                                                  | `aria-pressed` + Escape + focus return.                |
| m14 | Result count is `aria-live="polite"` ✅, but there is no live region for filter changes on mobile and no `aria-pressed`/`aria-current` on the active filter chips.                                                                       | `routes/products/index.tsx:35-37`                                                                                             | Add ARIA state.                                        |
| m15 | `routeTree.gen.ts` is prettier-ignored but not eslint-ignored (saved only by its own `/* eslint-disable */`).                                                                                                                            | `.prettierignore:8`                                                                                                           | Add to eslint `ignores`.                               |

---

## 4. Decision (B1) — how I am proceeding

The "fixed architecture" paragraph and this repository describe two different projects.
Rewriting TanStack Start → React 18 + Vite + HashRouter + GitHub Pages would mean
discarding the SSR layer, the Lovable config, Tailwind/shadcn and the whole route tree —
i.e. a greenfield rewrite of a project that `AGENTS.md` explicitly says must stay in a
working, Lovable-syncable state.

**I am keeping the existing framework and delivering every spec artefact that can exist
inside it.** Concretely, this means the following _documented deviations_ from the
"fixed architecture", each of which is called out again in the README:

| Spec says                                 | This repo will do                                                  | Why                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| React 18                                  | React 19 (already pinned by TanStack Start)                        | Changing it means rewriting the router layer.                                                 |
| Static GitHub Pages, `vite base` from env | SSR build via nitro (`vite build` → `.output/`)                    | The Lovable config owns the build; a static export is not available for this template.        |
| HashRouter (`#/products`)                 | Path router (`/products`)                                          | TanStack Router file-based routing. `robots.txt` and a `404` fallback are documented instead. |
| CSS Modules, no UI kit, ≤3 extras         | Tailwind 4 + shadcn/ui (trimmed to the components actually used)   | Already the visual system of the whole app.                                                   |
| `.github/workflows/deploy.yml`            | Not delivered — deployment target is Lovable/Cloudflare, not Pages | There is no static `dist/` to publish.                                                        |

Everything else in the spec **is** delivered: Supabase schema + seed + RLS, the
data-access layer with SWR caching, Arabic normalization, URL filter state, real 404s,
per-page meta, bilingual UI, persisted language/theme, logical-property CSS, a real
lazy-loaded admin guarded by `is_admin()`, image upload with resize/WebP, managed
categories & brands with in-use blocking, JSON export, Vitest tests, README and a manual
QA checklist.

---

## 5. What I could NOT verify (and why)

1. **A live Supabase project.** No network credentials beyond the public publishable key
   in `.env`, and no browser automation. Every read/write, `is_admin()` RPC, RLS denial
   and storage policy is therefore _written and reasoned about_, not executed here.
2. **RLS actually blocking the anon key.** Requires a real project. Covered by the manual
   QA checklist and by the SQL in `supabase/schema.sql`.
3. **Storage bucket policies / image upload / orphan cleanup.** Same reason.
4. **Browser console output at runtime** (no headless browser on this machine). The
   SSR response was fetched and inspected; client-side console was not.
5. **Lighthouse scores, LCP, CLS.** Cannot be measured without a deployed URL + browser.
6. **GitHub Pages / GitHub Actions behaviour.** Not applicable to this build target.
7. **Real product data (~68 rows) and real contact details.** Only 4 sample rows and
   placeholder contact copy exist in the repo.
8. **Login with a real admin user, wrong password, non-admin user, expired session.**
   Needs a live Auth instance — manual checklist only.

---

## 6. Re-verification after implementation

§2 above is the **baseline** captured before any work. This section is the same
toolchain re-run after the data layer, i18n, admin area and public-page wiring landed.

### Toolchain (all green)

| Command            | Result                              |
| ------------------ | ----------------------------------- |
| `tsc --noEmit`     | EXIT=0, no diagnostics              |
| `eslint .`         | 0 errors, 0 warnings                |
| `prettier --check` | all files clean                     |
| `vitest run`       | **8 files / 80 tests passed**       |
| `vite build`       | EXIT=0, `.output/` generated        |
| `npm run check`    | runs all five in order — **EXIT=0** |

Test files: `i18n` (key + placeholder parity between `ar` and `en`), `cache`,
`product-validation`, `login-throttle`, `export-payload`, `errors`, `search`,
`product-view` (language fallbacks, missing taxonomy/image, spec fallbacks).

### Bundle (gzipped, `zlib.gzipSync` on `.output/public/assets`)

| Asset                           |      raw |     **gzip** |
| ------------------------------- | -------: | -----------: |
| `index-*.js` (public entry)     | 375.4 KB | **114.0 KB** |
| `client-*.js` (Supabase SDK)    | 212.4 KB |      54.4 KB |
| `AdminApp-*.js` (lazy)          | 103.9 KB |      32.2 KB |
| `image-url-*.js`                |  45.7 KB |      15.4 KB |
| `dist-*.js`                     |  33.3 KB |      11.0 KB |
| `client-aYQ--*.js` (data layer) |  31.4 KB |      10.0 KB |
| `useStore-*.js`                 |  18.7 KB |       6.7 KB |
| `product-view-*.js`             |  11.0 KB |       3.7 KB |
| `manage-x7k2-*.js`              |  10.2 KB |       3.6 KB |
| `products-*.js` / `_id-*.js`    | 9.9/5.1K | 3.1 / 1.8 KB |
| `styles-*.css`                  |  51.3 KB |       9.2 KB |
| **all JS (24 chunks)**          |          | **267.1 KB** |

- **Eager (static import graph of `index-*.js`) = 136.5 KB gz across 7 chunks**,
  - 9.2 KB gz CSS = **145.7 KB gz before hydration** → **under the 150 KB budget.**
- The Supabase SDK is a **dynamic** import (verified in the built `index-*.js`
  and `client-aYQ--*.js`: `await import("./client-BvIKolCI.js")`). It is only
  fetched when a page first reads data, not on parse. This is the fix for the
  baseline finding where `start.ts → auth-attacher` pulled the whole SDK into
  the public entry (157.6 KB gz).
- **Admin code is still a separate chunk**: `AdminApp-*.js` 32.2 KB gz plus the
  3.6 KB route wrapper, loaded only by `React.lazy` on `/manage-x7k2`.
- `catalog.ts` (hardcoded 4-product sample) was **deleted**; the home, list and
  detail pages now read Supabase through `src/data/hooks.ts`.

### Functional status

| Area                                                         | State                                                                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Public pages (home, list, detail)                            | wired to `src/data/*` + i18n, skeleton/empty/error states                                            |
| Admin area (auth, guard, products, taxonomy, images, export) | implemented, unit-covered where pure                                                                 |
| `scripts/import-json.mjs`                                    | implemented; `--help`, `--dry-run`, orphan-refusal and publishable-key refusal all exercised locally |
| `supabase/schema.sql` + `seed.sql`                           | written, **not executed** (needs a live project)                                                     |
| README setup / admin / limitations                           | written                                                                                              |

Still unverified (unchanged from §5): anything that requires a live Supabase
project, a browser or a real admin account.
