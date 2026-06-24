-- ─────────────────────────────────────────────────────────────────────────
-- Feature 001 (bug ④): distinguish a DISABLED share link from a MISSING one.
--
-- get_shared_proposal filters public_share = true (and non-draft), so a link the
-- owner disabled returns the same empty result as a token that never existed —
-- the page then 404s for both. Disabling sharing is non-destructive (it flips
-- public_share to false but keeps share_token), so the states ARE distinguishable.
--
-- This read-only, SECURITY DEFINER probe returns ONLY a state string — never any
-- proposal content (PDPL-safe). The page uses it to show a clear "publisher
-- disabled this link" view for 'disabled' and a 404 only for 'missing'.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.get_shared_proposal_state(p_token text)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select case
    when exists (
      select 1 from public.proposals p
      where p.share_token = p_token
        and p.public_share = true
        and p.status <> 'draft'
    ) then 'active'
    when exists (
      select 1 from public.proposals p
      where p.share_token = p_token
    ) then 'disabled'
    else 'missing'
  end;
$$;

revoke all on function public.get_shared_proposal_state(text) from public;
grant execute on function public.get_shared_proposal_state(text) to anon, authenticated;

comment on function public.get_shared_proposal_state(text) is
  'Public share-state probe: returns active | disabled | missing for a share token. Leaks NO proposal content (PDPL). Lets the share page show a distinct "sharing disabled" state instead of a 404.';
