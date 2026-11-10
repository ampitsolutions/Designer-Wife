-- Wardrobe app: initial schema
-- Closets are private per user. Outfits can be marked shared. Trips are shared via trip_members.

create extension if not exists pg_trgm;

-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Closet items -----------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text,
  photo_key text,               -- R2 object key
  type text,                    -- e.g. top, bottom, dress, shoes, outerwear, accessory
  colours text[] not null default '{}',
  formality text,               -- e.g. casual, smart-casual, formal
  seasons text[] not null default '{}',
  occasions text[] not null default '{}',
  notes text,
  ai_tags jsonb,                -- raw AI output, kept for reference
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_owner_type_idx on public.items (owner_id, type);
create index items_colours_idx on public.items using gin (colours);
create index items_occasions_idx on public.items using gin (occasions);
create index items_seasons_idx on public.items using gin (seasons);
create index items_name_trgm_idx on public.items using gin (name gin_trgm_ops);

-- Outfits ----------------------------------------------------------------
create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text,
  occasion text,
  is_favourite boolean not null default false,
  shared boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.outfit_items (
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  primary key (outfit_id, item_id)
);

create index outfit_items_item_idx on public.outfit_items (item_id);

-- Trips ------------------------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  destination text,
  start_date date,
  end_date date,
  itinerary text,
  created_at timestamptz not null default now()
);

create table public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (trip_id, user_id)
);

create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_date date not null,
  plan text,
  weather jsonb,
  outfit_id uuid references public.outfits (id) on delete set null,
  unique (trip_id, day_date)
);

-- Add the creator as a member of their own trip.
create function public.add_trip_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.trip_members (trip_id, user_id) values (new.id, new.owner_id);
  return new;
end $$;

create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.add_trip_owner();

-- Avoids RLS recursion between trips and trip_members.
create function public.is_trip_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = auth.uid());
$$;

-- Calendar events --------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  event_date date not null,
  outfit_id uuid references public.outfits (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index events_owner_date_idx on public.events (owner_id, event_date);

-- updated_at helper ------------------------------------------------------
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

-- Row level security -----------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.items        enable row level security;
alter table public.outfits      enable row level security;
alter table public.outfit_items enable row level security;
alter table public.trips        enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_days    enable row level security;
alter table public.events       enable row level security;

-- Profiles: any signed-in user can see names (needed to share trips); edit own only.
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Items: own closet only, plus items that appear in a shared outfit.
create policy items_select on public.items for select to authenticated using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.outfit_items oi
    join public.outfits o on o.id = oi.outfit_id
    where oi.item_id = items.id and o.shared
  )
);
create policy items_insert on public.items for insert to authenticated with check (owner_id = auth.uid());
create policy items_update on public.items for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy items_delete on public.items for delete to authenticated using (owner_id = auth.uid());

-- Outfits: owner full access; shared outfits readable by the other user.
create policy outfits_select on public.outfits for select to authenticated
  using (owner_id = auth.uid() or shared);
create policy outfits_insert on public.outfits for insert to authenticated with check (owner_id = auth.uid());
create policy outfits_update on public.outfits for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy outfits_delete on public.outfits for delete to authenticated using (owner_id = auth.uid());

create policy outfit_items_select on public.outfit_items for select to authenticated using (
  exists (select 1 from public.outfits o where o.id = outfit_id and (o.owner_id = auth.uid() or o.shared))
);
create policy outfit_items_write on public.outfit_items for all to authenticated
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.owner_id = auth.uid())
    and exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid())
  );

-- Trips: members can read and edit; only the owner can delete or manage members.
create policy trips_select on public.trips for select to authenticated
  using (owner_id = auth.uid() or public.is_trip_member(id));
create policy trips_insert on public.trips for insert to authenticated with check (owner_id = auth.uid());
create policy trips_update on public.trips for update to authenticated
  using (public.is_trip_member(id)) with check (public.is_trip_member(id));
create policy trips_delete on public.trips for delete to authenticated using (owner_id = auth.uid());

create policy trip_members_select on public.trip_members for select to authenticated
  using (public.is_trip_member(trip_id));
create policy trip_members_insert on public.trip_members for insert to authenticated with check (
  exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
);
create policy trip_members_delete on public.trip_members for delete to authenticated using (
  exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
);

create policy trip_days_all on public.trip_days for all to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

-- Events: own only.
create policy events_all on public.events for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
