-- ─────────────────────────────────────────────────────────────────────────
-- Phase 2.8 — anon-callable proposal view logging + a client_name column.
-- log_proposal_view increments view count + logs a share event for a publicly
-- shared, non-draft proposal. Acts ONLY on public_share=true, status<>'draft'
-- rows, so it leaks nothing about private/draft proposals. SECURITY DEFINER
-- (writes bypass owner RLS) but gated by the token + public_share check.
-- ─────────────────────────────────────────────────────────────────────────

-- Freelancer-typed client name for proposals without a Client Book entry
-- (M2 arrives in Phase 3; client_id stays nullable/no-FK until then).
alter table public.proposals add column if not exists client_name text;

create or replace function public.log_proposal_view(
  p_token   text,
  p_channel public.proposal_share_channel,
  p_agent   text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_user uuid;
begin
  select id, user_id into v_id, v_user
    from public.proposals
    where share_token = p_token
      and public_share = true
      and status <> 'draft';
  if v_id is null then
    return; -- silent no-op for invalid/private/draft tokens
  end if;

  update public.proposals
    set share_view_count = share_view_count + 1,
        share_viewed_at = now()
    where id = v_id;

  insert into public.proposal_share_events
    (proposal_id, user_id, share_channel, viewed_at, viewer_agent)
  values
    (v_id, v_user, p_channel, now(), left(coalesce(p_agent, ''), 300));
end $$;

revoke all on function public.log_proposal_view(text, public.proposal_share_channel, text) from public;
grant execute on function public.log_proposal_view(text, public.proposal_share_channel, text) to anon, authenticated;

comment on function public.log_proposal_view(text, public.proposal_share_channel, text) is
  'Anon-callable view logger for publicly shared, non-draft proposals. No-op for invalid/private tokens.';
