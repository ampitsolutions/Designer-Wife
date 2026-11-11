-- Let someone manage another person's closet (full edit), granted by the closet's owner.
-- Everything that was "owner only" becomes "owner or someone they've granted".

create table if not exists public.closet_managers (
  owner_id uuid not null references auth.users (id) on delete cascade,
  manager_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, manager_id),
  check (owner_id <> manager_id)
);

alter table public.closet_managers enable row level security;

drop policy if exists closet_managers_select on public.closet_managers;
create policy closet_managers_select on public.closet_managers for select to authenticated
  using (owner_id = auth.uid() or manager_id = auth.uid());
drop policy if exists closet_managers_insert on public.closet_managers;
create policy closet_managers_insert on public.closet_managers for insert to authenticated
  with check (owner_id = auth.uid());
-- The owner can revoke; a manager can step down.
drop policy if exists closet_managers_delete on public.closet_managers;
create policy closet_managers_delete on public.closet_managers for delete to authenticated
  using (owner_id = auth.uid() or manager_id = auth.uid());

-- True if the signed-in user is this person or manages their closet.
create or replace function public.can_manage(person uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select person = auth.uid()
      or exists (select 1 from public.closet_managers where owner_id = person and manager_id = auth.uid());
$$;

-- Same, for a storage folder name (the owner's id as text). Non-uuid folders are never managed.
create or replace function public.can_manage_folder(folder text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return public.can_manage(folder::uuid);
exception when invalid_text_representation then
  return false;
end $$;

-- "Owns item" now means "can manage the item's owner". Used by outfit, trip and wear policies.
create or replace function public.owns_item(item uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.items where id = item and public.can_manage(owner_id));
$$;

create or replace function public.is_user_trip_member(t uuid, person uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = person);
$$;

-- Items
drop policy if exists items_select on public.items;
create policy items_select on public.items for select to authenticated
  using (public.can_manage(owner_id) or public.in_shared_outfit(id));
drop policy if exists items_insert on public.items;
create policy items_insert on public.items for insert to authenticated with check (public.can_manage(owner_id));
drop policy if exists items_update on public.items;
create policy items_update on public.items for update to authenticated
  using (public.can_manage(owner_id)) with check (public.can_manage(owner_id));
drop policy if exists items_delete on public.items;
create policy items_delete on public.items for delete to authenticated using (public.can_manage(owner_id));

-- Outfits (an outfit may mix items from closets you manage, e.g. a matching couple look)
drop policy if exists outfits_select on public.outfits;
create policy outfits_select on public.outfits for select to authenticated
  using (public.can_manage(owner_id) or shared);
drop policy if exists outfits_insert on public.outfits;
create policy outfits_insert on public.outfits for insert to authenticated with check (public.can_manage(owner_id));
drop policy if exists outfits_update on public.outfits;
create policy outfits_update on public.outfits for update to authenticated
  using (public.can_manage(owner_id)) with check (public.can_manage(owner_id));
drop policy if exists outfits_delete on public.outfits;
create policy outfits_delete on public.outfits for delete to authenticated using (public.can_manage(owner_id));

drop policy if exists outfit_items_select on public.outfit_items;
create policy outfit_items_select on public.outfit_items for select to authenticated using (
  exists (select 1 from public.outfits o where o.id = outfit_id and (public.can_manage(o.owner_id) or o.shared))
);
drop policy if exists outfit_items_write on public.outfit_items;
create policy outfit_items_write on public.outfit_items for all to authenticated
  using (exists (select 1 from public.outfits o where o.id = outfit_id and public.can_manage(o.owner_id)))
  with check (
    exists (select 1 from public.outfits o where o.id = outfit_id and public.can_manage(o.owner_id))
    and public.owns_item(item_id)
  );

-- Wear log (owner_id = whose item it is)
drop policy if exists wear_logs_select on public.wear_logs;
create policy wear_logs_select on public.wear_logs for select to authenticated using (public.can_manage(owner_id));
drop policy if exists wear_logs_insert on public.wear_logs;
create policy wear_logs_insert on public.wear_logs for insert to authenticated
  with check (public.can_manage(owner_id) and public.owns_item(item_id));
drop policy if exists wear_logs_delete on public.wear_logs;
create policy wear_logs_delete on public.wear_logs for delete to authenticated using (public.can_manage(owner_id));

-- Trip outfits and packing: you can act for anyone on the trip whose closet you manage
drop policy if exists trip_day_items_insert on public.trip_day_items;
create policy trip_day_items_insert on public.trip_day_items for insert to authenticated
  with check (
    public.can_manage(user_id)
    and public.is_user_trip_member(public.trip_of_day(trip_day_id), user_id)
    and public.is_trip_member(public.trip_of_day(trip_day_id))
    and public.owns_item(item_id)
  );
drop policy if exists trip_day_items_delete on public.trip_day_items;
create policy trip_day_items_delete on public.trip_day_items for delete to authenticated
  using (public.can_manage(user_id));

drop policy if exists packing_insert on public.packing_items;
create policy packing_insert on public.packing_items for insert to authenticated
  with check (
    public.can_manage(owner_id)
    and public.is_user_trip_member(trip_id, owner_id)
    and public.is_trip_member(trip_id)
  );
drop policy if exists packing_delete on public.packing_items;
create policy packing_delete on public.packing_items for delete to authenticated
  using (public.can_manage(owner_id));

-- Calendar events
drop policy if exists events_all on public.events;
create policy events_all on public.events for all to authenticated
  using (public.can_manage(owner_id)) with check (public.can_manage(owner_id));

-- Photos: folder = owner id
drop policy if exists "photos: read own" on storage.objects;
create policy "photos: read own" on storage.objects for select to authenticated
  using (bucket_id = 'wardrobe-photos' and public.can_manage_folder((storage.foldername(name))[1]));
drop policy if exists "photos: upload own" on storage.objects;
create policy "photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'wardrobe-photos' and public.can_manage_folder((storage.foldername(name))[1]));
drop policy if exists "photos: update own" on storage.objects;
create policy "photos: update own" on storage.objects for update to authenticated
  using (bucket_id = 'wardrobe-photos' and public.can_manage_folder((storage.foldername(name))[1]));
drop policy if exists "photos: delete own" on storage.objects;
create policy "photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'wardrobe-photos' and public.can_manage_folder((storage.foldername(name))[1]));
