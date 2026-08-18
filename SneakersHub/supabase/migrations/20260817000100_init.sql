-- SneakersHub initial schema — recreated for new project
-- Covers everything the frontend + Express backend expect.

-- ============================================================
-- extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  phone text,
  role text not null default 'buyer' check (role in ('buyer','seller')),
  is_seller boolean not null default false,
  city text,
  region text,
  verified boolean not null default false,
  is_official boolean not null default false,
  avatar_url text,
  listing_count integer not null default 0,
  commission_rate numeric not null default 5,
  subaccount_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-create profile row on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, is_seller, phone, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email,'user'),'@',1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'buyer'),
    coalesce((new.raw_user_meta_data ->> 'role') = 'seller', false),
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- listings
-- ============================================================
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  brand text not null,
  price numeric not null check (price >= 0),
  category text not null,
  sizes numeric[] not null default '{}',
  description text,
  image_url text,
  images text[] not null default '{}',
  status text not null default 'active' check (status in ('active','sold')),
  boosted boolean not null default false,
  boost_expires_at timestamptz,
  views integer not null default 0,
  city text,
  region text,
  condition text,
  negotiable boolean not null default false,
  delivery_available boolean not null default false,
  whatsapp text,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists listings_seller_id_idx on public.listings(seller_id);
create index if not exists listings_status_created_idx on public.listings(status, created_at desc);

-- ============================================================
-- saved_listings
-- ============================================================
create table if not exists public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  saved_price numeric,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

-- ============================================================
-- seller_applications
-- ============================================================
create table if not exists public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_name text not null,
  applicant_name text,
  applicant_email text,
  phone text,
  momo_number text,
  city text,
  region text,
  instagram text,
  website text,
  store_description text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists seller_applications_user_idx on public.seller_applications(user_id);
create index if not exists seller_applications_status_idx on public.seller_applications(status);

-- ============================================================
-- orders
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','shipped','delivered')),
  seller_confirmed boolean not null default false,
  buyer_confirmed boolean not null default false,
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  total numeric not null default 0,
  delivery_method text,
  delivery_label text,
  delivery_estimated_cost text,
  delivery_days text,
  buyer_first_name text not null default '',
  buyer_last_name text not null default '',
  buyer_phone text not null default '',
  buyer_address text not null default '',
  buyer_city text not null default '',
  buyer_region text not null default '',
  seen_by_seller boolean not null default false,
  placed_at timestamptz not null default now(),
  payout_status text not null default 'pending'
    check (payout_status in ('pending','released','auto_released','disputed','refunded','transfer_failed')),
  release_at timestamptz,
  paystack_reference text,
  dispute_reason text,
  transfer_attempts integer,
  transfer_failure_reason text,
  unique (paystack_reference)
);

create index if not exists orders_seller_id_idx on public.orders(seller_id);
create index if not exists orders_buyer_id_idx on public.orders(buyer_id);
create index if not exists orders_payout_status_idx on public.orders(payout_status);
create index if not exists orders_release_at_idx on public.orders(release_at) where release_at is not null;

-- ============================================================
-- order_items
-- ============================================================
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  name text not null,
  brand text,
  image_url text,
  price numeric not null default 0,
  size numeric,
  quantity integer not null default 1
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ============================================================
-- reviews
-- ============================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  buyer_name text not null default '',
  stars integer not null default 5 check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id)
);

-- ============================================================
-- promo_codes (15% discount codes)
-- ============================================================
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent numeric not null default 15,
  max_uses integer not null default 1,
  uses integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- referrals
-- ============================================================
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referee_id uuid references public.profiles(id) on delete set null,
  uses integer not null default 0,
  max_uses integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists referrals_code_idx on public.referrals(code);

-- ============================================================
-- RPCs used by the frontend
-- ============================================================

create or replace function public.increment_listing_views(listing_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.listings set views = views + 1 where id = listing_id;
end;
$$;

create or replace function public.increment_listing_count(seller_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set listing_count = listing_count + 1 where id = seller_id;
end;
$$;

create or replace function public.expire_boosts()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.listings
    set boosted = false, boost_expires_at = null
    where boosted = true and boost_expires_at is not null and boost_expires_at <= now();
end;
$$;

-- escrow auto-release: mark released orders whose release_at has passed and
-- both parties confirmed (or release window elapsed regardless of confirmation)
create or replace function public.release_escrowed_orders()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.orders
    set payout_status = 'auto_released'
    where payout_status = 'pending'
      and release_at is not null
      and release_at <= now()
      and paystack_reference is not null;
end;
$$;

-- ============================================================
-- Realtime publication
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table public.listings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.saved_listings enable row level security;
alter table public.seller_applications enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.promo_codes enable row level security;
alter table public.referrals enable row level security;

-- profiles: read all (public), write own
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);

-- listings: read active for all; owner full control; RPCs are definer
drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings
  for select using (status = 'active' or seller_id = auth.uid());

drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings
  for insert with check (seller_id = auth.uid());

drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings
  for update using (seller_id = auth.uid());

drop policy if exists listings_delete on public.listings;
create policy listings_delete on public.listings
  for delete using (seller_id = auth.uid());

-- saved_listings: owner only
drop policy if exists saved_select on public.saved_listings;
create policy saved_select on public.saved_listings
  for select using (auth.uid() = user_id);

drop policy if exists saved_insert on public.saved_listings;
create policy saved_insert on public.saved_listings
  for insert with check (auth.uid() = user_id);

drop policy if exists saved_delete on public.saved_listings;
create policy saved_delete on public.saved_listings
  for delete using (auth.uid() = user_id);

-- seller_applications: read own; insert own
drop policy if exists apps_select on public.seller_applications;
create policy apps_select on public.seller_applications
  for select using (auth.uid() = user_id);

drop policy if exists apps_insert on public.seller_applications;
create policy apps_insert on public.seller_applications
  for insert with check (auth.uid() = user_id);

-- orders: participants read; buyer creates; sellers update their side
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (auth.uid() in (buyer_id, seller_id));

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert with check (auth.uid() = buyer_id);

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
  for update using (auth.uid() in (buyer_id, seller_id));

-- order_items: inherit via order participation
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id))
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and auth.uid() = o.buyer_id)
  );

-- reviews: read all; participants write once (enforced by unique order_id)
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and auth.uid() = o.buyer_id)
  );

-- promo_codes + referrals: server-managed (service role only)
drop policy if exists promo_select on public.promo_codes;
create policy promo_select on public.promo_codes
  for select using (true);

drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals
  for select using (true);

-- ============================================================
-- Storage: public "listings" bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do nothing;

drop policy if exists listings_storage_read on storage.objects;
create policy listings_storage_read on storage.objects
  for select using (bucket_id = 'listings');

drop policy if exists listings_storage_insert on storage.objects;
create policy listings_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] in (
      select l.id::text from public.listings l where l.seller_id = auth.uid()
    )
  );

drop policy if exists listings_storage_delete on storage.objects;
create policy listings_storage_delete on storage.objects
  for delete using (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] in (
      select l.id::text from public.listings l where l.seller_id = auth.uid()
    )
  );