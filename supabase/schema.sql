-- =============================================================================
-- Eltawkol Fire — schema, Row Level Security and storage policies.
--
-- HOW TO RUN
--   Supabase dashboard -> SQL Editor -> New query -> paste this ENTIRE file
--   -> Run. Then run supabase/seed.sql the same way.
--
-- Design rules enforced here:
--   * No price / stock / status columns: this is a showcase, not a store.
--   * Missing data is NULL or an empty array — never a placeholder string.
--   * Every table has RLS enabled. Reads are public, writes require is_admin().
--   * is_admin() is SECURITY DEFINER so it can read `admins` without recursing
--     through the admins table's own policies.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id      text primary key,
  name_ar text not null,
  name_en text not null,
  sort    integer not null default 0,
  constraint categories_id_format check (id ~ '^[a-z0-9-]+$'),
  constraint categories_names_not_blank
    check (btrim(name_ar) <> '' and btrim(name_en) <> '')
);

-- -----------------------------------------------------------------------------
-- brands
-- -----------------------------------------------------------------------------
create table if not exists public.brands (
  id      text primary key,
  name_ar text not null,
  name_en text not null,
  constraint brands_id_format check (id ~ '^[a-z0-9-]+$'),
  constraint brands_names_not_blank
    check (btrim(name_ar) <> '' and btrim(name_en) <> '')
);

-- -----------------------------------------------------------------------------
-- products  (id = inventory number, so it is an int, not a uuid)
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id            integer primary key,
  name_ar       text not null,
  name_en       text not null,
  category_id   text not null references public.categories (id) on delete restrict,
  brand_id      text references public.brands (id) on delete restrict,
  image_path    text,
  description_ar text,
  description_en text,
  features_ar   text[] not null default '{}',
  features_en   text[] not null default '{}',
  -- [{ "label": {"ar": "...", "en": "..."}, "value": {"ar": "...", "en": "..."} }]
  specs         jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint products_names_not_blank
    check (btrim(name_ar) <> '' and btrim(name_en) <> ''),
  constraint products_specs_is_array check (jsonb_typeof(specs) = 'array'),
  constraint products_image_path_relative
    check (image_path is null or image_path !~ '^https?://')
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_brand_idx    on public.products (brand_id);
create index if not exists products_updated_idx  on public.products (updated_at desc);

-- -----------------------------------------------------------------------------
-- admins — one row per Supabase Auth user that may write
-- -----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- is_admin()
-- SECURITY DEFINER: runs with the function owner's rights, so it can read
-- `admins` even though `admins` has its own RLS policies. That also means the
-- policies below can call it without infinitely recursing.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.brands      enable row level security;
alter table public.products    enable row level security;
alter table public.admins      enable row level security;

-- categories ------------------------------------------------------------------
drop policy if exists "categories select" on public.categories;
create policy "categories select" on public.categories
  for select using (true);

drop policy if exists "categories insert" on public.categories;
create policy "categories insert" on public.categories
  for insert with check (public.is_admin());

drop policy if exists "categories update" on public.categories;
create policy "categories update" on public.categories
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories delete" on public.categories;
create policy "categories delete" on public.categories
  for delete using (public.is_admin());

-- brands -----------------------------------------------------------------------
drop policy if exists "brands select" on public.brands;
create policy "brands select" on public.brands
  for select using (true);

drop policy if exists "brands insert" on public.brands;
create policy "brands insert" on public.brands
  for insert with check (public.is_admin());

drop policy if exists "brands update" on public.brands;
create policy "brands update" on public.brands
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "brands delete" on public.brands;
create policy "brands delete" on public.brands
  for delete using (public.is_admin());

-- products ---------------------------------------------------------------------
drop policy if exists "products select" on public.products;
create policy "products select" on public.products
  for select using (true);

drop policy if exists "products insert" on public.products;
create policy "products insert" on public.products
  for insert with check (public.is_admin());

drop policy if exists "products update" on public.products;
create policy "products update" on public.products
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products delete" on public.products;
create policy "products delete" on public.products
  for delete using (public.is_admin());

-- admins -----------------------------------------------------------------------
-- A signed-in user may read only their own row (so the app can tell
-- "logged in but not an admin" apart from "not logged in"). Nobody but an
-- admin may add or remove administrators.
drop policy if exists "admins select own or admin" on public.admins;
create policy "admins select own or admin" on public.admins
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "admins insert" on public.admins;
create policy "admins insert" on public.admins
  for insert with check (public.is_admin());

drop policy if exists "admins delete" on public.admins;
create policy "admins delete" on public.admins
  for delete using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Storage: public-read bucket, admin-only writes
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('product-images', 'product-images', true, 5242880)
on conflict (id) do nothing;

drop policy if exists "product images read" on storage.objects;
create policy "product images read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product images insert" on storage.objects;
create policy "product images insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images update" on storage.objects;
create policy "product images update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images delete" on storage.objects;
create policy "product images delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- -----------------------------------------------------------------------------
-- ADD YOUR FIRST ADMIN  (run after creating the user in Authentication -> Users)
--
--   1. Supabase dashboard -> Authentication -> Users -> "Add user"
--      (Email + password, and leave "Auto Confirm User" ON — sign-ups are
--       disabled for the public site, so the dashboard is how users are made.)
--   2. Copy the user's UUID and run:
--
-- insert into public.admins (user_id)
-- values ('PASTE-THE-USER-UUID-HERE')
-- on conflict (user_id) do nothing;
--
-- Remove an admin:
-- delete from public.admins where user_id = 'PASTE-THE-USER-UUID-HERE';
-- -----------------------------------------------------------------------------
