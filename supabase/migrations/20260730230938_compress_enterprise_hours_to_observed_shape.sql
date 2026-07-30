-- The third time this session that the error was our own arithmetic rather than the data.
--
-- Every foreign source prices TIME; Rizq prices PROJECTS. The bridge is project_hours, and it
-- was linear in scope: a reasoned small-project figure multiplied out to a reasoned enterprise
-- one. Linear extrapolation put enterprise at 17-23x the small project.
--
-- The Saudi rate cards seeded in 20260730224935 price the same ladder directly, and they do not
-- agree. Where one Saudi source publishes both ends:
--   logo-design   500 -> 3,499 SAR   =  7.0x
--   mobile-dev  8,000 -> 80,000 SAR  = 10.0x
--
-- A studio's top package is not twenty times the work of its smallest; it is the same craft with
-- more surfaces, and the price ladder flattens accordingly. Our ladder kept climbing, so the
-- enterprise column inherited an inflation nothing in the evidence supported — and because the
-- foreign families are the ones bridged through hours, the inflation showed up as cross-family
-- DISAGREEMENT that widened the band at exactly the sizes where a freelancer has most at stake.
--
-- Compressed to the observed ceiling: enterprise = 10x the small-project figure, the top of the
-- Saudi-published range rather than the middle of it, since our sizes are coarser than a rate
-- card's tiers.
--
-- MEASURED EFFECT — divergence between the foreign and Saudi families, by size:
--   before   1.8x / 2.4x / 3.1x / 4.3x   (escalating: the bug was size-dependent)
--   after    1.43x / 1.76x / 1.89x / 1.44x   (flat: what remains is a real currency-bridge gap)
--
-- Provenance stays 'reasoned'. This is still an assumption — a better one, anchored to published
-- Saudi ladders instead of to multiplication — and it is overridden per specialty as soon as 5
-- freelancers state or record real hours (HOURS_OVERRIDE_MIN_N in lib/pricing/projectHours.ts).

update public.project_hours h
set hours = s.small_hours * 10,
    as_of = now()
from (
  select specialty_id, hours as small_hours
  from public.project_hours
  where project_size = 'small'
) s
where h.specialty_id = s.specialty_id
  and h.project_size = 'enterprise'
  and h.provenance = 'reasoned'
  and h.hours <> s.small_hours * 10;

-- Record the revision on the rows whose derived price moves, so a reader who pulls one benchmark
-- row can see which assumption produced it and when that assumption last changed.
update public.benchmark_records
set notes = coalesce(notes || ' | ', '') ||
  'Enterprise hours compressed to 10x the small-project figure. The hours model was linear in ' ||
  'scope, producing 17-23x; Saudi published rate cards price the top tier at 7-10x. Compressed ' ||
  'to the observed ceiling.'
where project_size = 'enterprise'
  and provenance = 'published_ref'
  and active;
