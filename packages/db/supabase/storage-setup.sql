-- Supabase Storage policies for Vaultly PDF files.
-- Prerequisite: private bucket "vaultly-files" already created in Dashboard.

drop policy if exists "vaultly_files_select_own" on storage.objects;
drop policy if exists "vaultly_files_insert_own" on storage.objects;
drop policy if exists "vaultly_files_delete_own" on storage.objects;

create policy "vaultly_files_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'vaultly-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "vaultly_files_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vaultly-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "vaultly_files_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vaultly-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
