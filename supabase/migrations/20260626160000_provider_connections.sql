-- ─────────────────────────────────────────────────────────────────────────
-- Feature 004 (Project Workspace) — Phase 5: provider connections (OAuth).
-- SECURITY-GATED (security-review-oauth.md approved). Holds OAuth tokens for
-- real provider integrations (GitHub read-only first). Tokens are stored
-- ENCRYPTED (app-layer envelope, done in Node) as bytea.
--
-- The app has NO service-role key, so this table is reached ONLY via the
-- SECURITY DEFINER RPCs below (scoped to auth.uid()). The table itself grants
-- nothing to anon/authenticated — the client can't select it directly. Even
-- the secret-fetch RPC returns ciphertext only; the decryption key lives solely
-- in server env, so a leaked row/ciphertext is useless.
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin create type public.provider_connection_status as enum ('active','expired','revoked');
exception when duplicate_object then null; end $$;

create table if not exists public.provider_connections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  provider          public.project_integration_provider not null,
  status            public.provider_connection_status not null default 'active',
  access_token_enc  bytea,         -- envelope-encrypted in Node; never plaintext
  refresh_token_enc bytea,
  scope             text,
  external_login    text,          -- non-secret display handle (e.g. github username)
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, provider)
);

-- project_integrations links may reference a connection (nullable — manual
-- links keep working with no connection).
alter table public.project_integrations
  add column if not exists connection_id uuid references public.provider_connections(id) on delete set null;

-- ── RLS: NO client access at all (deliberate exception to owner-select). ──
alter table public.provider_connections enable row level security;
revoke all on public.provider_connections from anon, authenticated;
-- (no grant, no policy → unreachable except via SECURITY DEFINER RPCs / service role)

-- ── RPCs (SECURITY DEFINER, scoped to auth.uid(); EXECUTE granted to authenticated) ──

-- Upsert the caller's connection for a provider. Ciphertext is produced in Node.
create or replace function public.upsert_provider_connection(
  p_provider          public.project_integration_provider,
  p_scope             text,
  p_external_login    text,
  p_expires_at        timestamptz,
  p_access_token_enc  bytea,
  p_refresh_token_enc bytea
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode='42501'; end if;
  insert into public.provider_connections
    (user_id, provider, status, scope, external_login, expires_at, access_token_enc, refresh_token_enc)
  values (v_uid, p_provider, 'active', p_scope, p_external_login, p_expires_at, p_access_token_enc, p_refresh_token_enc)
  on conflict (user_id, provider) do update
    set status='active', scope=excluded.scope, external_login=excluded.external_login,
        expires_at=excluded.expires_at, access_token_enc=excluded.access_token_enc,
        refresh_token_enc=excluded.refresh_token_enc, updated_at=now()
  returning id into v_id;
  return v_id;
end $$;

-- Non-secret list for display (NO token columns).
create or replace function public.list_provider_connections()
returns table (id uuid, provider public.project_integration_provider, status public.provider_connection_status,
               external_login text, expires_at timestamptz, created_at timestamptz)
language sql security definer set search_path='' stable as $$
  select id, provider, status, external_login, expires_at, created_at
  from public.provider_connections where user_id = auth.uid();
$$;

-- Returns the caller's own ciphertext for a server action to decrypt in Node.
-- Ciphertext only; undecryptable without the server env key.
create or replace function public.get_provider_connection_secret(p_connection_id uuid)
returns table (access_token_enc bytea, refresh_token_enc bytea, status public.provider_connection_status)
language sql security definer set search_path='' stable as $$
  select access_token_enc, refresh_token_enc, status
  from public.provider_connections
  where id = p_connection_id and user_id = auth.uid();
$$;

-- Revoke: mark revoked + wipe tokens for the caller's own connection.
create or replace function public.revoke_provider_connection(p_connection_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.provider_connections
    set status='revoked', access_token_enc=null, refresh_token_enc=null, updated_at=now()
  where id = p_connection_id and user_id = auth.uid();
end $$;

revoke all on function public.upsert_provider_connection(public.project_integration_provider, text, text, timestamptz, bytea, bytea) from public, anon;
revoke all on function public.list_provider_connections() from public, anon;
revoke all on function public.get_provider_connection_secret(uuid) from public, anon;
revoke all on function public.revoke_provider_connection(uuid) from public, anon;
grant execute on function public.upsert_provider_connection(public.project_integration_provider, text, text, timestamptz, bytea, bytea) to authenticated;
grant execute on function public.list_provider_connections() to authenticated;
grant execute on function public.get_provider_connection_secret(uuid) to authenticated;
grant execute on function public.revoke_provider_connection(uuid) to authenticated;
