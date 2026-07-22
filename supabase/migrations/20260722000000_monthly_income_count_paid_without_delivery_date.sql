-- monthly_income previously keyed income on delivery_date and DROPPED any gig with a
-- null delivery_date (`where delivery_date is not null`). So a PAID gig with no delivery
-- date vanished from income tracking entirely — the dashboard Monthly Income widget AND
-- HADAF eligibility (which both read this view) showed nothing even though the money was
-- real and paid. Fix: attribute the income month to the best available date and never drop
-- a gig for lacking a delivery date. security_invoker is preserved (RLS still per-user).
create or replace view public.monthly_income with (security_invoker = true) as
select user_id,
  date_trunc('month', coalesce(delivery_date, completed_date, final_paid_at::date, created_at::date)) as month,
  count(*) as gig_count,
  sum(amount_sar) as total_sar,
  sum(amount_sar) filter (where status='paid') as paid_sar,
  sum(amount_sar) filter (where status in ('pending','deposit_paid','in_progress','delivered')) as pending_sar,
  sum(amount_sar) filter (where status='overdue') as overdue_sar,
  count(*) filter (where status='paid') as paid_count,
  count(*) filter (where status in ('pending','deposit_paid','in_progress','delivered')) as pending_count
from public.gigs
group by user_id, month;
