-- Feature 004 Phase 5 — store envelope-encrypted tokens as base64 TEXT instead
-- of bytea: a clean RPC interface over PostgREST. The decryption key is
-- server-only, so text vs bytea is equivalent for secrecy. Table is empty when
-- this runs → safe to drop/re-add the token columns and recreate the 2 RPCs.

drop function if exists public.upsert_provider_connection(public.project_integration_provider, text, text, timestamptz, bytea, bytea);
drop function if exists public.get_provider_connection_secret(uuid);

alter table public.provider_connections drop column if exists access_token_enc;
alter table public.provider_connections drop column if exists refresh_token_enc;
alter table public.provider_connections add column if not exists access_token_enc text;
alter table public.provider_connections add column if not exists refresh_token_enc text;

create or replace function public.upsert_provider_connection(
  p_provider          public.project_integration_provider,
  p_scope             text,
  p_external_login    text,
  p_expires_at        timestamptz,
  p_access_token_enc  text,
  p_refresh_token_enc text
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

create or replace function public.get_provider_connection_secret(p_connection_id uuid)
returns table (access_token_enc text, refresh_token_enc text, status public.provider_connection_status)
language sql security definer set search_path='' stable as $$
  select access_token_enc, refresh_token_enc, status
  from public.provider_connections
  where id = p_connection_id and user_id = auth.uid();
$$;

revoke all on function public.upsert_provider_connection(public.project_integration_provider, text, text, timestamptz, text, text) from public, anon;
revoke all on function public.get_provider_connection_secret(uuid) from public, anon;
grant execute on function public.upsert_provider_connection(public.project_integration_provider, text, text, timestamptz, text, text) to authenticated;
grant execute on function public.get_provider_connection_secret(uuid) to authenticated;
