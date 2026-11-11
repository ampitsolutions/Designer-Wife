-- Trips: per-person outfit plan for each day, shared packing checklist, weather location.

alter table public.trips add column if not exists latitude double precision;
alter table public.trips add column if not exists longitude double precision;
alter table public.trips add column if not exists place_label text;   -- e.g. "Paris, France"

alter table public.trip_days add column if not exists activities text;

-- Items each person plans to wear on a given trip day.
create table if not exists public.trip_day_items (
  trip_day_id uuid not null references public.trip_days (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  primary key (trip_day_id, user_id, item_id)
);

create index if not exists trip_day_items_item_idx on public.trip_day_items (item_id);

-- Packing checklist. Shared by everyone on the trip; each line belongs to the person who packs it.
create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  label text not null,
  quantity int not null default 1 check (quantity > 0),
  packed boolean not null default false,
  from_ai boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists packing_items_trip_idx on public.packing_items (trip_id);

create or replace function public.trip_of_day(d uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select trip_id from public.trip_days where id = d;
$$;

alter table public.trip_day_items enable row level security;
alter table public.packing_items  enable row level security;

-- Everyone on the trip can see the plan; you can only add or remove your own items.
create policy trip_day_items_select on public.trip_day_items for select to authenticated
  using (public.is_trip_member(public.trip_of_day(trip_day_id)));
create policy trip_day_items_insert on public.trip_day_items for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_trip_member(public.trip_of_day(trip_day_id))
    and exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid())
  );
create policy trip_day_items_delete on public.trip_day_items for delete to authenticated
  using (user_id = auth.uid());

-- Packing list: members can see and tick any line; add lines for yourself; delete your own.
create policy packing_select on public.packing_items for select to authenticated
  using (public.is_trip_member(trip_id));
create policy packing_insert on public.packing_items for insert to authenticated
  with check (owner_id = auth.uid() and public.is_trip_member(trip_id));
create policy packing_update on public.packing_items for update to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy packing_delete on public.packing_items for delete to authenticated
  using (owner_id = auth.uid());
