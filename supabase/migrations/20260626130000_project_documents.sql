-- ─────────────────────────────────────────────────────────────────────────
-- Feature 004 (Project Workspace) — Files facet.
-- ADDITIVE: scope existing Document Vault docs to a project + an input/deliverable
-- kind, and add a deliverable handover state (also reused by project_integrations
-- in the Deliverables facet). Reuses documents' storage/RLS/quota/soft-delete —
-- non-project documents (both new columns null) are completely unchanged.
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin create type public.project_doc_kind as enum ('input','deliverable');
exception when duplicate_object then null; end $$;

do $$ begin create type public.deliverable_state as enum ('draft','ready','sent');
exception when duplicate_object then null; end $$;

alter table public.documents add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.documents add column if not exists project_doc_kind public.project_doc_kind;   -- null = not a project doc
alter table public.documents add column if not exists handover_state public.deliverable_state;      -- only meaningful for kind='deliverable'

create index if not exists idx_documents_project
  on public.documents(project_id)
  where project_id is not null and deleted_at is null;
