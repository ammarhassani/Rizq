-- Storage bucket for optional proof uploads (Mostaql screenshot, invoice PDF, etc.)
-- Private bucket — admin reads via service-role or RLS-aware queries; owner reads own.

insert into storage.buckets (id, name, public)
values ('submission-proofs', 'submission-proofs', false)
on conflict (id) do nothing;

-- Owner can upload to their own folder: {user_id}/{file}
create policy "submission_proofs_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'submission-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can read their own files (to verify upload succeeded)
create policy "submission_proofs_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submission-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin can read all proofs (for review)
create policy "submission_proofs_select_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submission-proofs'
    and public.is_admin()
  );

-- Owner can delete their own upload (e.g. if they reupload)
create policy "submission_proofs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'submission-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
