-- ─────────────────────────────────────────────────────────────────────────
-- Phase 2 hardening (PDPL): the public share link must expose only the polished
-- artifact + safe fields — NOT the raw brief_text, scope_json, extraction_raw_
-- response, or user_id. Previously `proposals_public_read` + a broad anon SELECT
-- let anyone with a token read every column of a shared proposal via PostgREST
-- (and authenticated non-owners too). Replace that path with a SECURITY DEFINER
-- RPC that returns only safe columns, and remove the broad public-read grant.
-- Owners keep full access to their own rows via proposals_owner_all.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.get_shared_proposal(p_token text)
returns table (
  id             uuid,
  status         public.proposal_status,
  artifact_json  jsonb,
  brief_language public.proposal_brief_language
)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.status, p.artifact_json, p.brief_language
  from public.proposals p
  where p.share_token = p_token
    and p.public_share = true
    and p.status <> 'draft'
  limit 1;
$$;

revoke all on function public.get_shared_proposal(text) from public;
grant execute on function public.get_shared_proposal(text) to anon, authenticated;

comment on function public.get_shared_proposal(text) is
  'Public share surface: returns ONLY safe artifact fields for a publicly shared, non-draft proposal. Keeps brief_text/scope_json/extraction/user_id private.';

-- Remove the broad public-read path now that the RPC is the only public surface.
drop policy if exists proposals_public_read on public.proposals;
revoke select on public.proposals from anon;
