-- ─────────────────────────────────────────────────────────────────────────
-- Feature 004 (Project Workspace) — Deliverables facet.
-- ADDITIVE: give integration links a deliverable handover state so the
-- Deliverables view can unify deliverable documents + external links with one
-- per-item state (draft → ready → sent). `deliverable_state` enum already
-- exists (created in the Files migration).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.project_integrations
  add column if not exists handover_state public.deliverable_state;
