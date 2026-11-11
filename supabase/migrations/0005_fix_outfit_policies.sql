-- Fix: "infinite recursion detected in policy for relation outfit_items" when saving an outfit.
-- items_select looked at outfit_items, whose insert check looked at items. A security definer
-- helper reads outfit_items/outfits without re-applying their policies, breaking the loop.

create or replace function public.in_shared_outfit(item uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.outfit_items oi
    join public.outfits o on o.id = oi.outfit_id
    where oi.item_id = item and o.shared
  );
$$;

create or replace function public.owns_item(item uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.items where id = item and owner_id = auth.uid());
$$;

drop policy if exists items_select on public.items;
create policy items_select on public.items for select to authenticated
  using (owner_id = auth.uid() or public.in_shared_outfit(id));

drop policy if exists outfit_items_write on public.outfit_items;
create policy outfit_items_write on public.outfit_items for all to authenticated
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.owner_id = auth.uid())
    and public.owns_item(item_id)
  );

drop policy if exists trip_day_items_insert on public.trip_day_items;
create policy trip_day_items_insert on public.trip_day_items for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_trip_member(public.trip_of_day(trip_day_id))
    and public.owns_item(item_id)
  );

-- Partner's photos: allow reading a photo when its item is in a shared outfit.
drop policy if exists "photos: read shared" on storage.objects;
create policy "photos: read shared" on storage.objects for select to authenticated
  using (
    bucket_id = 'wardrobe-photos'
    and exists (
      select 1 from public.items i
      where i.photo_key = storage.objects.name and public.in_shared_outfit(i.id)
    )
  );
