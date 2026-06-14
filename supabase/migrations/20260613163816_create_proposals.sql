-- ─────────────────────────────────────────────────────────────────────────
-- Phase 2.1 — Proposal Studio (M1): schema, RLS, quota, config seeds.
-- Cross-phase note: proposals.client_id is nullable with NO FK (clients table
-- arrives in Phase 3); gig_id/invoice_id deferred to P3/P4.
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin create type public.proposal_status as enum
  ('draft','final','sent','viewed','accepted','declined','expired');
exception when duplicate_object then null; end $$;
do $$ begin create type public.proposal_brief_channel as enum
  ('paste','whatsapp_forward','email_forward');
exception when duplicate_object then null; end $$;
do $$ begin create type public.proposal_brief_language as enum
  ('ar','en','mixed');
exception when duplicate_object then null; end $$;
do $$ begin create type public.proposal_tone as enum
  ('formal','balanced','friendly','persuasive');
exception when duplicate_object then null; end $$;
do $$ begin create type public.proposal_share_channel as enum
  ('link','whatsapp','email','pdf_download');
exception when duplicate_object then null; end $$;

-- ── proposal_templates (created before proposals; proposals FKs it) ──
create table if not exists public.proposal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name_ar text not null,
  name_en text,
  description_ar text,
  specialty_id uuid references public.specialties(id),
  scope_json jsonb,
  pricing_json jsonb,
  tone_preference public.proposal_tone not null default 'balanced',
  usage_count int not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_proposal_templates_user on public.proposal_templates(user_id, updated_at desc);

-- ── proposals ──
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid,                       -- nullable; NO FK (clients arrives in Phase 3)
  template_id uuid references public.proposal_templates(id) on delete set null,
  brief_text text not null,
  brief_channel public.proposal_brief_channel not null default 'paste',
  brief_language public.proposal_brief_language not null default 'ar',
  scope_json jsonb not null,
  extraction_model text not null,
  extraction_prompt_hash text,
  extraction_confidence numeric,
  extraction_raw_response jsonb,
  specialty_id uuid not null references public.specialties(id),
  city_id uuid not null references public.cities(id),
  experience_tier_id uuid not null references public.experience_tiers(id),
  price_min numeric not null,
  price_anchor numeric not null,
  price_max numeric not null,
  sample_size int not null,
  dominant_provenance public.benchmark_provenance not null,
  provenance_citation text not null,
  urgency_modifier numeric not null default 1.0,
  client_type_modifier numeric not null default 1.0,
  complexity_modifier numeric not null default 1.0,
  ip_modifier numeric not null default 1.0,
  personal_weight numeric not null default 0.0,
  tone_adjustments jsonb not null default '[]'::jsonb,
  scope_comparison_json jsonb,
  status public.proposal_status not null default 'draft',
  version int not null default 1,
  public_share boolean not null default false,
  share_token text unique,
  share_viewed_at timestamptz,
  share_view_count int not null default 0,
  view_history jsonb not null default '[]'::jsonb,
  artifact_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  expires_at timestamptz
);
create index if not exists idx_proposals_user_created on public.proposals(user_id, created_at desc);
create index if not exists idx_proposals_client on public.proposals(client_id, created_at desc);
create unique index if not exists idx_proposals_share_token on public.proposals(share_token) where share_token is not null;
create index if not exists idx_proposals_user_status on public.proposals(user_id, status, created_at desc);

-- ── proposal_versions (user_id for direct RLS) ──
create table if not exists public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  version int not null,
  scope_json jsonb not null,
  price_min numeric not null,
  price_anchor numeric not null,
  price_max numeric not null,
  changed_by uuid not null references public.users(id),
  change_summary text,
  created_at timestamptz not null default now(),
  unique(proposal_id, version)
);
create index if not exists idx_proposal_versions_proposal on public.proposal_versions(proposal_id, version desc);

-- ── proposal_share_events (user_id for direct RLS; writes via definer RPC in P2.8) ──
create table if not exists public.proposal_share_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  share_channel public.proposal_share_channel not null,
  viewed_at timestamptz,
  viewer_ip_hash text,
  viewer_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_proposal_share_events_proposal on public.proposal_share_events(proposal_id, created_at desc);

-- ── follow_up_question_templates (config-driven; public read) ──
create table if not exists public.follow_up_question_templates (
  id text primary key,
  field_name text not null,
  priority int not null,
  min_confidence numeric not null default 0.7,
  question_ar text not null,
  question_en text not null,
  options_json jsonb,
  allow_skip boolean not null default true,
  enabled boolean not null default true
);

-- ── tone_adjustment_prompts (config-driven) ──
create table if not exists public.tone_adjustment_prompts (
  tone public.proposal_tone not null,
  locale public.app_language not null,
  prompt text not null,
  primary key (tone, locale)
);

-- ─── RLS ───
alter table public.proposals enable row level security;
revoke all on public.proposals from anon, authenticated;
grant select on public.proposals to anon;
grant select, insert, update, delete on public.proposals to authenticated;
drop policy if exists proposals_owner_all on public.proposals;
create policy proposals_owner_all on public.proposals for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists proposals_public_read on public.proposals;
create policy proposals_public_read on public.proposals for select to anon, authenticated
  using (public_share = true and status <> 'draft');

alter table public.proposal_templates enable row level security;
revoke all on public.proposal_templates from anon, authenticated;
grant select, insert, update, delete on public.proposal_templates to authenticated;
drop policy if exists proposal_templates_owner on public.proposal_templates;
create policy proposal_templates_owner on public.proposal_templates for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.proposal_versions enable row level security;
revoke all on public.proposal_versions from anon, authenticated;
grant select, insert on public.proposal_versions to authenticated;
drop policy if exists proposal_versions_owner_read on public.proposal_versions;
create policy proposal_versions_owner_read on public.proposal_versions for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists proposal_versions_owner_insert on public.proposal_versions;
create policy proposal_versions_owner_insert on public.proposal_versions for insert to authenticated
  with check (auth.uid() = user_id);

alter table public.proposal_share_events enable row level security;
revoke all on public.proposal_share_events from anon, authenticated;
grant select on public.proposal_share_events to authenticated;
drop policy if exists proposal_share_events_owner_read on public.proposal_share_events;
create policy proposal_share_events_owner_read on public.proposal_share_events for select to authenticated
  using (auth.uid() = user_id);

alter table public.follow_up_question_templates enable row level security;
revoke all on public.follow_up_question_templates from anon, authenticated;
grant select on public.follow_up_question_templates to anon, authenticated;
drop policy if exists fuqt_public_read on public.follow_up_question_templates;
create policy fuqt_public_read on public.follow_up_question_templates for select to anon, authenticated
  using (enabled = true);

alter table public.tone_adjustment_prompts enable row level security;
revoke all on public.tone_adjustment_prompts from anon, authenticated;
grant select on public.tone_adjustment_prompts to authenticated;
drop policy if exists tap_read on public.tone_adjustment_prompts;
create policy tap_read on public.tone_adjustment_prompts for select to authenticated using (true);

-- ─── Atomic proposal quota (free = 2 / Riyadh-month; pro/admin unlimited) ───
-- Mirrors private.enforce_query_quota. Lives in `private` (not PostgREST-exposed).
create or replace function private.enforce_proposal_quota()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role;
  v_used int;
  v_month_start timestamptz;
begin
  select role into v_role from public.users where id = new.user_id;
  if v_role is null or v_role = 'pro' or v_role = 'admin' then
    return new;
  end if;
  v_month_start := date_trunc('month', now() at time zone 'Asia/Riyadh');
  select count(*) into v_used from public.proposals
    where user_id = new.user_id and created_at >= v_month_start;
  if v_used >= 2 then
    raise exception 'free proposal quota exhausted' using errcode = '53400';
  end if;
  return new;
end $$;

drop trigger if exists enforce_proposal_quota_before_insert on public.proposals;
create trigger enforce_proposal_quota_before_insert
  before insert on public.proposals for each row
  execute function private.enforce_proposal_quota();

comment on function private.enforce_proposal_quota() is
  'Atomic proposal quota before insert. Free=2/Riyadh-month, pro/admin=unlimited. Errcode 53400 on exhaustion.';

-- ─── seed follow-up questions ───
insert into public.follow_up_question_templates (id, field_name, priority, min_confidence, question_ar, question_en, options_json) values
('fq_revisions','revisions',1,0.7,'كم عدد جولات التعديل المتضمّنة؟','How many revision rounds are included?',
  '[{"value":1,"label_ar":"جولة واحدة","label_en":"1 round"},{"value":2,"label_ar":"جولتان","label_en":"2 rounds"},{"value":3,"label_ar":"٣ جولات","label_en":"3 rounds"}]'::jsonb),
('fq_urgency','urgency',2,0.7,'ما الإطار الزمني للمشروع؟','What is the project timeline?',
  '[{"value":"rush_under_1_week","label_ar":"عاجل (أقل من أسبوع)","label_en":"Rush (under 1 week)"},{"value":"standard_1_4_weeks","label_ar":"عادي (١-٤ أسابيع)","label_en":"Standard (1-4 weeks)"},{"value":"long_term","label_ar":"طويل الأمد","label_en":"Long-term"}]'::jsonb),
('fq_ip','ip_transfer',3,0.7,'هل يشمل العرض نقل ملكية العمل بالكامل؟','Does this include full IP transfer?',
  '[{"value":"full_transfer","label_ar":"نقل كامل","label_en":"Full transfer"},{"value":"license","label_ar":"ترخيص فقط","label_en":"License only"},{"value":"unclear","label_ar":"غير محدد","label_en":"Unclear"}]'::jsonb),
('fq_deliverable_count','deliverable_count',4,0.7,'كم عدد المخرجات المطلوبة؟','How many deliverables are required?', null),
('fq_client_type','client_type',5,0.7,'ما نوع العميل؟','What type of client is this?',
  '[{"value":"individual","label_ar":"فرد","label_en":"Individual"},{"value":"smb","label_ar":"منشأة صغيرة","label_en":"Small business"},{"value":"corporate","label_ar":"شركة كبرى","label_en":"Corporate"},{"value":"government","label_ar":"جهة حكومية","label_en":"Government"},{"value":"agency","label_ar":"وكالة","label_en":"Agency"}]'::jsonb)
on conflict (id) do nothing;

-- ─── seed tone-adjustment prompts (4 tones × {ar,en}) ───
insert into public.tone_adjustment_prompts (tone, locale, prompt) values
('formal','ar','اكتب بلغة عربية فصحى رسمية، مهنية ومباشرة، مناسبة للشركات والجهات الحكومية. لا تغيّر أي أرقام أو أسماء أو تواريخ.'),
('formal','en','Use formal MSA Arabic. Professional, direct, suitable for corporate/government clients. Never change any numbers, names, or dates.'),
('balanced','ar','استخدم نبرة سعودية مهذّبة دافئة ومهنية في آنٍ واحد. لا تغيّر أي أرقام أو أسماء أو تواريخ.'),
('balanced','en','Warm but professional Saudi-polite tone (default). Never change any numbers, names, or dates.'),
('friendly','ar','استخدم نبرة ودّية قريبة من اللهجة السعودية، مناسبة للعملاء المتكررين. لا تغيّر أي أرقام أو أسماء أو تواريخ.'),
('friendly','en','Casual Saudi dialect-adjacent tone, suitable for repeat clients. Never change any numbers, names, or dates.'),
('persuasive','ar','أضف تبريراً موجزاً بعد كل بند يوضح القيمة المقدّمة، دون مبالغة في الادعاءات. لا تغيّر أي أرقام أو أسماء أو تواريخ.'),
('persuasive','en','Add a brief value justification after each scope item, without inflating claims. Never change any numbers, names, or dates.')
on conflict (tone, locale) do nothing;
