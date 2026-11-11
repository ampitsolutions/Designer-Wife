-- Wear tracking, declutter status, and fields for items imported from orders.

alter table public.items add column if not exists status text not null default 'active';
alter table public.items drop constraint if exists items_status_check;
alter table public.items add constraint items_status_check check (status in ('active', 'donate', 'sell'));
alter table public.items add column if not exists keep_until date;      -- "keep" snoozes declutter suggestions until this date
alter table public.items add column if not exists brand text;
alter table public.items add column if not exists size text;
alter table public.items add column if not exists retailer text;
alter table public.items add column if not exists purchased_on date;
alter table public.items add column if not exists source text not null default 'photo';  -- photo | bulk | order

-- One row per item per day worn.
create table if not exists public.wear_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  worn_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (item_id, worn_on)
);

create index if not exists wear_logs_owner_idx on public.wear_logs (owner_id, item_id, worn_on desc);

alter table public.wear_logs enable row level security;

drop policy if exists wear_logs_select on public.wear_logs;
create policy wear_logs_select on public.wear_logs for select to authenticated
  using (owner_id = auth.uid());
drop policy if exists wear_logs_insert on public.wear_logs;
create policy wear_logs_insert on public.wear_logs for insert to authenticated
  with check (owner_id = auth.uid() and public.owns_item(item_id));
drop policy if exists wear_logs_delete on public.wear_logs;
create policy wear_logs_delete on public.wear_logs for delete to authenticated
  using (owner_id = auth.uid());

-- Last worn date and wear count per item (respects the caller's row level security).
create or replace view public.item_wear
with (security_invoker = true) as
  select item_id, max(worn_on) as last_worn, count(*)::int as times_worn
  from public.wear_logs
  group by item_id;

grant select on public.item_wear to authenticated;
