-- Follow-up: push subscriptions + promo ownership

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_select on public.push_subscriptions;
create policy push_select on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists push_insert on public.push_subscriptions;
create policy push_insert on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists push_delete on public.push_subscriptions;
create policy push_delete on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- promo_codes: track which user owns the code and its source (referral/admin)
alter table public.promo_codes
  add column if not exists owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists source text not null default 'admin' check (source in ('admin','referral'));