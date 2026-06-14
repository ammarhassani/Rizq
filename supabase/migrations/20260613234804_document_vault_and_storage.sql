-- ─────────────────────────────────────────────────────────────────────────
-- Phase 6.4 — Document Vault (M12): documents + config categories + private
-- Storage bucket. Owner CRUD; public surface is the get_shared_document RPC
-- (token + not-expired), NOT a broad anon SELECT. Storage RLS confines each
-- user to their own {user_id}/ prefix. Soft-delete via deleted_at.
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin create type public.expiry_detected_by as enum ('manual','ai'); exception when duplicate_object then null; end $$;

-- ── document_categories (config; public read) ──
create table if not exists public.document_categories (
  id text primary key,
  name_ar text not null,
  name_en text not null,
  icon text,
  sort_order int not null,
  enabled boolean not null default true
);
alter table public.document_categories enable row level security;
revoke all on public.document_categories from anon, authenticated;
grant select on public.document_categories to anon, authenticated;
drop policy if exists document_categories_read on public.document_categories;
create policy document_categories_read on public.document_categories for select to anon, authenticated using (enabled = true);

insert into public.document_categories (id, name_ar, name_en, icon, sort_order) values
('freelance_doc','وثيقة العمل الحر','Freelance work document','badge-check',1),
('commercial_reg','السجل التجاري','Commercial registration','building-2',2),
('tax_cert','شهادة ضريبية','Tax certificate','receipt',3),
('contract','عقد','Contract','file-signature',4),
('portfolio','أعمال','Portfolio','image',5),
('nda','اتفاقية عدم إفصاح','NDA','lock',6),
('other','أخرى','Other','file',7)
on conflict (id) do nothing;

-- ── documents ──
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title_ar text not null,
  title_en text,
  description_ar text,
  file_path text not null,                     -- storage path: {user_id}/{uuid}_{name}
  file_name text not null,
  file_size int not null,
  file_type text not null,
  storage_bucket text not null default 'documents',
  category text references public.document_categories(id),
  category_auto text,
  category_confidence numeric,
  expiry_date date,
  expiry_detected_by public.expiry_detected_by not null default 'manual',
  reminder_days_before int not null default 30,
  share_token text unique,
  share_expires_at timestamptz,
  share_view_count int not null default 0,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_documents_user on public.documents(user_id, created_at desc) where deleted_at is null;
create index if not exists idx_documents_category on public.documents(user_id, category) where deleted_at is null;
create index if not exists idx_documents_expiry on public.documents(user_id, expiry_date) where deleted_at is null and expiry_date is not null;
create index if not exists idx_documents_client on public.documents(client_id) where deleted_at is null;

alter table public.documents enable row level security;
revoke all on public.documents from anon, authenticated;
grant select, insert, update, delete on public.documents to authenticated;
drop policy if exists documents_owner on public.documents;
create policy documents_owner on public.documents for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── quota: free 10 / pro 50 / admin ∞ (BEFORE INSERT; counts non-deleted) ──
create or replace function private.enforce_document_quota()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_role public.user_role; v_used int; v_limit int;
begin
  select role into v_role from public.users where id = new.user_id;
  if v_role = 'admin' then return new; end if;
  v_limit := case when v_role = 'pro' then 50 else 10 end;
  select count(*) into v_used from public.documents where user_id = new.user_id and deleted_at is null;
  if v_used >= v_limit then raise exception 'document quota exhausted' using errcode='53400'; end if;
  return new;
end $$;
drop trigger if exists enforce_document_quota_before on public.documents;
create trigger enforce_document_quota_before before insert on public.documents
  for each row execute function private.enforce_document_quota();

-- ── public share surface: RPC only (token + not expired + not deleted) ──
create or replace function public.get_shared_document(p_token text)
returns table (
  id uuid, title_ar text, title_en text, file_path text, file_name text,
  file_type text, storage_bucket text
)
language sql security definer set search_path='' stable as $$
  select d.id, d.title_ar, d.title_en, d.file_path, d.file_name, d.file_type, d.storage_bucket
  from public.documents d
  where d.share_token = p_token
    and d.deleted_at is null
    and d.share_expires_at is not null
    and d.share_expires_at > now()
  limit 1;
$$;
revoke all on function public.get_shared_document(text) from public;
grant execute on function public.get_shared_document(text) to anon, authenticated;
comment on function public.get_shared_document(text) is
  'Public share surface for a time-limited shared document. Returns only safe fields for a non-deleted, non-expired share token.';

-- ── private Storage bucket + owner-prefix RLS on storage.objects ──
insert into storage.buckets (id, name, public) values ('documents','documents',false)
on conflict (id) do nothing;

drop policy if exists "documents_storage_owner_read" on storage.objects;
create policy "documents_storage_owner_read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "documents_storage_owner_insert" on storage.objects;
create policy "documents_storage_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "documents_storage_owner_update" on storage.objects;
create policy "documents_storage_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "documents_storage_owner_delete" on storage.objects;
create policy "documents_storage_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
