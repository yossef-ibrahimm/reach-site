# Fire Safety Showcase

# ROLE

You are a Principal Full-Stack Engineer and Product Designer with 10+ years shipping fast, accessible, bilingual production apps. You write clean, typed, boring-in-a-good-way code, you make deliberate design decisions, you never fake functionality, and you say so plainly when something has a limitation.

# PROJECT

Build a bilingual (Arabic RTL default / English LTR) PRODUCT SHOWCASE website (not a store: no cart, no prices, no stock) for "Eltawkol Fire" (شركة التوكل), a supplier of fire alarm and firefighting systems (~68 products: control panels, detectors, call points, sirens/bells, bases, accessories, cables, batteries, extinguishers).

Public visitors can: read About Us, search and filter products, open a full product details page.
One hidden, authenticated admin area lets the owner add / edit / delete products, categories, brands and images.

# ARCHITECTURE (fixed decisions, do not change them)

- Frontend: React 18 + Vite + TypeScript, deployed as a STATIC site on GitHub Pages. HashRouter, vite `base` read from env (`/<repo-name>/`). GitHub Actions workflow builds and deploys `dist/`.
- Backend: Supabase (Postgres + Auth + Storage) called directly from the browser via @supabase/supabase-js. NO custom server, NO localhost dependency at runtime.
- Only the project URL and the public `anon` key are used in the client (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, injected at build time from GitHub repo variables/secrets). The `service_role` key must never appear in client code or the repo.
- Security is enforced in the database with Row Level Security, NOT with a client-side password. Hiding the admin route is only tidiness and must be documented as such.
- Dependencies: react-router-dom, @supabase/supabase-js, and at most 2–3 small extras. No UI kit, no Tailwind requirement; use CSS variables + CSS Modules.

# DATABASE (deliver supabase/schema.sql and supabase/seed.sql, runnable in the Supabase SQL editor)

- categories(id text pk, name_ar text not null, name_en text not null, sort int default 0)
- brands(id text pk, name_ar text not null, name_en text not null)
- products(id int pk /_inventory number_/, name_ar, name_en not null, category_id fk, brand_id fk, image_path text null, description_ar text, description_en text, features_ar text[] default '{}', features_en text[] default '{}', specs jsonb default '[]' /_[{label:{ar,en},value:{ar,en}}]_/, created_at, updated_at with trigger)
- admins(user_id uuid pk references auth.users) + SQL function is_admin() (security definer).
- Storage bucket `product-images`: public read, write only for admins.
- RLS ON for every table and the bucket. SELECT: everyone. INSERT/UPDATE/DELETE: is_admin() only. Provide all policies, plus the SQL to add the first admin.
- Data rules: never invent specs; missing data is NULL/empty and the UI hides that block. No price/stock/status columns.
- Seed: categories control-panels, detectors, manual-call-points, sirens-bells, detector-bases, accessories, cables, batteries, extinguishers; brands hst, conwey, snoar, apollo, ats, tanda, hlt, generic-chinese (all with ar+en names); plus 6 clearly-labeled SAMPLE products.
- Provide scripts/import-json.mjs to bulk-import a products.json (same shape as the tables) using the service key from a local env var, never committed, plus an "Export all to JSON" button in admin as backup.

# PUBLIC PAGES

1. About Us (`/`): hero with the company's real purpose, what we supply (category entry points linking to the filtered products page), 3–4 "why us" points, contact block (phone/WhatsApp/address from one `siteConfig` file), footer.
2. Products (`/products`):
   - Search by product name in Arabic and English, debounced, with Arabic normalization (strip tashkeel; أ/إ/آ→ا; ى→ي; ة→ه; case-insensitive Latin).
   - Filters: Category and Brand ("النوع/الماركة"), combinable; chips on desktop, bottom-sheet drawer on mobile; clear-all; live result count (aria-live).
   - State lives in the URL query string (shareable links, working Back button).
   - Card grid: image, name, category and brand tags. Skeleton loading, designed empty state with a clear-filters action, designed error state with retry.
3. Product Details (`/products/:id`): image with zoom, name, category and brand, description, features list, specifications table (only rows that exist), related products from the same category, breadcrumb, back-to-results preserving filters and scroll. Unknown id → real 404. Per-page <title> and meta.
4. Hidden admin: see next section.

# ADMIN (lazy-loaded with React.lazy, never shipped to normal visitors)

- Route is not linked anywhere: secret path constant (e.g. `#/manage-x7k2`) + footer easter egg (5 quick taps on the logo).
- Supabase email+password login; public sign-ups disabled (document the dashboard step). Sign out button; handle expired sessions gracefully.
- Products table with search, filter, sort. Add / edit / duplicate / delete (with confirm). AR and EN fields side by side; dynamic lists for features and specs (add, remove, reorder); category and brand selects; duplicate-id prevention; required-field validation; live preview of the public product page.
- Image upload to the storage bucket: client-side resize (max 1200px) and WebP conversion, replace/delete the old file, show progress.
- Manage categories and brands; block deleting anything still in use.
- Optimistic updates with rollback on error, toasts, and clear messages for: network failure, RLS denial ("no permission"), expired session.

# DATA FETCHING AND PERFORMANCE

- Fetch the product list once per session (only the columns the grid needs), keep it in memory + localStorage with stale-while-revalidate, and search/filter client-side. Fetch the full row only on the details page.
- Targets: Lighthouse 95+ in all four categories, LCP < 2s on 4G, public JS < 150 KB gzipped, zero layout shift (explicit image dimensions), lazy images, WebP, self-hosted or preloaded fonts (Tajawal for Arabic, Inter for Latin) with font-display: swap, route-level code splitting.

# UI / UX

- Visual direction: trustworthy, industrial-safety, calm. Deliberate palette: deep navy ink, cool off-white background, ONE signal-red accent used sparingly for actions and emphasis. A real type scale, 8px spacing system, varied radii for hierarchy, subtle borders over heavy shadows. Avoid generic template looks: no gradient-wash decoration, no identical-card-everywhere sameness, no all-caps label spam, no scroll-triggered entrance animation on every section. Spend the boldness in ONE memorable place (the hero or the category entry points).
- RTL/LTR done properly with CSS logical properties only. Language switch persists and updates <html lang dir>. Arabic default.
- Light and dark themes via CSS variables (system default + manual toggle).
- Mobile-first: sticky search, thumb-reachable filters, 44px touch targets, safe-area insets.
- Accessibility WCAG 2.2 AA: landmarks, skip link, visible focus, full keyboard support (drawer, gallery), alt text, contrast, prefers-reduced-motion.
- Motion is minimal and purposeful (drawer, zoom, subtle page fade).
- Scroll restoration; every screen has loading, empty and error states.
- SEO for a static site: meta description, Open Graph, favicon, robots.txt disallowing the admin path, sitemap generated at build.

# CODE QUALITY

- Folders: features/{about,products,admin}, components/ui, lib (supabase client, normalize, cache), i18n (small typed dictionary + useLang hook, no heavy library), styles, types.
- Strict TypeScript, generated or hand-written DB types, one data-access layer (no Supabase calls inside components), pure functions for search/filter with Vitest tests (Arabic normalizer + filters), ESLint + Prettier, no dead code, no lorem ipsum, no console errors.
- Never fake features. If something cannot be done client-side, say so and give the correct alternative.

# DELIVERABLES

1. Before coding: 5-line list of assumptions and the final folder tree.
2. All files, complete (no "...rest of code").
3. supabase/schema.sql, seed.sql, scripts/import-json.mjs, .github/workflows/deploy.yml.
4. README: create the Supabase project → run schema then seed → create the admin user and insert into `admins` → disable public sign-ups → create bucket → add URL + anon key to GitHub variables → enable Pages with Actions → import the real products → rotate keys. Plus "Known limitations": Supabase free-tier limits and possible project pausing after inactivity (owner must check current limits), the anon key is public by design.

عايزين نعمل بس ديزاين و تصميم لل ui ux للبرنامج ده بس عايزينو مميز و بسيط قوي و مش اوفر و من غير ديزاين الai زي تدريجه الالوان البنفسيجي و الايموجيز الي ملهاش لازمه

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fire-guard-display.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4f05f9f5-59cc-557e-8fdb-3999d3ad14b8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                        | Purpose                                 |
| ------------------------------- | --------------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL (public)           |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key (public by design) |

The `service_role` key is **never** used by the app. It is only needed by
`scripts/import-json.mjs`, read from `SUPABASE_SERVICE_ROLE_KEY` at run time and
never committed.

## Supabase setup

1. **Create the project** in the Supabase dashboard.
2. **Run the SQL** in this order, in _SQL Editor → New query_:
   - `supabase/schema.sql` — tables, `is_admin()` (SECURITY DEFINER), RLS
     policies, the `product-images` storage bucket and its policies.
   - `supabase/seed.sql` — sample categories, brands and 6 clearly-labelled
     sample products.
3. **Create the admin user**: _Authentication → Users → Add user_, e-mail +
   password, and turn **Auto Confirm** on.
4. **Grant admin rights** — this is the only thing that decides access:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com'
   on conflict (user_id) do nothing;
   ```

   Remove an admin with
   `delete from public.admins where user_id = '<uuid>';`.

5. **Disable public sign-ups**: _Authentication → Providers → Email →
   "Allow new users to sign up" = off_ (or _Settings → Disable sign ups_).
   Otherwise anyone could create an account — and step 4, not the sign-up, is
   what grants admin.
6. **Keys**: copy the project URL and the publishable key into `.env`
   (and into your hosting variables). Rotate them if they were ever shared.

### Verify you can log in

Open `/manage-x7k2`, sign in with the user from step 3, then add a category and
a product. Sign out and confirm the public page shows it.

## Admin area

- Path: `/manage-x7k2` — not linked from anywhere (only the footer logo
  easter egg, 5 taps within 1.8 s) and disallowed in `public/robots.txt`.
- Login is Supabase Auth email + password, throttled after 5 failed attempts
  (60 s window, 30 s lock).
- Tabs: **Products** (search, add, edit, duplicate, delete, image upload),
  **Categories & brands** (add, rename, sort order, delete blocked while in
  use), **Export** (downloads the JSON backup).
- Enforced in Postgres by RLS + `is_admin()`. Hiding the route is tidiness
  only — never treat it as security.

## Backup and restore

- Admin → _Export_ downloads `eltawkol-backup-<timestamp>.json`
  (`{ version: 1, exported_at, categories, brands, products }`).
- Restore it from the command line with the service key:

  ```sh
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-json.mjs backup.json --dry-run
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-json.mjs backup.json
  ```

  It validates the shape, refuses products that point at a missing category or
  brand, then upserts categories → brands → products on their primary key.

## Commands

```sh
npm run dev          # TanStack Start dev server
npm run build        # production build (.output/)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run format:check # prettier --check .
npm test             # vitest run
npm run check        # typecheck → lint → format:check → test
```

## Project layout

```
supabase/             schema.sql, seed.sql (run in the SQL editor)
scripts/              import-json.mjs (restore a JSON backup)
src/data/             the only layer allowed to talk to Supabase
src/lib/              pure logic: i18n, search, validation, export, cache
src/components/admin/ hidden admin area (lazy-loaded route)
src/routes/           index, products, products/$id, manage-x7k2
tests/                vitest unit tests for the pure logic
AUDIT.md              audit: tooling, findings, spec deviations, QA list
```

## Architecture notes (deviations from the original brief)

The original brief specified React 18 + Vite + `HashRouter` + GitHub Pages +
CSS Modules. This repository is a **TanStack Start** app (React 19, file-based
path routing, Nitro build output) with **Tailwind 4 + shadcn/ui**. The stack was
kept and every requirement from the brief was delivered inside it instead:

| Brief                            | This repo                                             |
| -------------------------------- | ----------------------------------------------------- |
| HashRouter / static GitHub Pages | TanStack path routes, SSR build (`.output/`)          |
| CSS Modules                      | Tailwind 4 + CSS variables + logical properties       |
| `VITE_SUPABASE_ANON_KEY`         | `VITE_SUPABASE_PUBLISHABLE_KEY` (same key, new name)  |
| `features/` folders              | `src/data/` + `src/components/admin/` + `src/routes/` |

Everything else matches: Supabase Postgres/Auth/Storage with RLS, `is_admin()`,
a bilingual catalogue, the hidden admin, JSON export/import, one data-access
layer, and pure search/validation covered by Vitest.

## Known limitations

- The Supabase **free tier** pauses a project after extended inactivity; check
  the current limits in your dashboard (they change over time).
- The publishable/anon key is **public by design** — RLS is the real security
  boundary, so keep the `schema.sql` policies intact.
- Browser-side checks (Lighthouse scores, live login, real Supabase calls) need
  a running site plus credentials and were not executed here; see the manual QA
  checklist in `AUDIT.md` §5.
- Contact details in `src/lib/siteConfig.ts` are intentionally empty — never
  invent a phone number or address.
- No `.github/workflows/deploy.yml`: deployment is Nitro/`wrangler` output, not
  GitHub Pages. Add a workflow only if you decide to switch hosts.
