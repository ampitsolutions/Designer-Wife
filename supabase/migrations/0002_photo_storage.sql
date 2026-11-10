-- Private bucket for clothing photos. Each user writes only to their own folder: <user id>/<file>.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe-photos', 'wardrobe-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: read own" on storage.objects for select to authenticated
  using (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: update own" on storage.objects for update to authenticated
  using (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
