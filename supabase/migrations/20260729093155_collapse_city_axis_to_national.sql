-- Feature 013 P1: prices go national, because no cited source has ever said otherwise.
--
-- 0 of 492 rows from real publications carry a city. Every one reports nationally. The ONLY
-- thing distinguishing Riyadh from Jeddah in this product is the unverifiable editorial seed
-- and the founder seed - and the UI asks the freelancer to choose a city that then changes the
-- answer on that basis alone. That is the clearest honesty failure in the engine.
--
-- Collapsing also shrinks the grid ~7x (700 cells -> ~100), which is the difference between
-- contributed data reaching the 3-contributor disclosure gate in months rather than never.
--
-- THE TRAP, and why this is a dedupe rather than an UPDATE ... SET city_id = NULL:
-- resolvePrice treats a NULL city as "supports every city". Nulling ~7 duplicate rows per
-- (specialty, tier, size) would turn them into 7 wildcards - inflating the evidence behind
-- every national query sevenfold while preserving the fabricated city deltas as fake spread.
-- So: keep ONE national triple per group, deactivate the rest.
--
-- Keeping a TRIPLE (min/median/max) rather than a single row preserves MIN_SAMPLE = 3 for
-- editorial-only cells, which would otherwise drop below the floor and go dark.
--
-- Measured: 2,112 active rows -> 1,032. 0 rows still carry a city. 14 sources retained.
-- 0 cells fell below the 3-record floor.

with fanned as (
  select id, specialty_id, experience_tier_id, project_size, price_sar,
         row_number() over (
           partition by specialty_id, experience_tier_id, project_size, source_ref
           order by price_sar
         ) rn,
         count(*) over (
           partition by specialty_id, experience_tier_id, project_size, source_ref
         ) n
  from public.benchmark_records
  where active and verified and city_id is not null
),
keepers as (
  select id from fanned
  where rn = 1
     or rn = n
     or rn = greatest(1, (n + 1) / 2)
)
update public.benchmark_records b
   set city_id = null,
       notes = coalesce(b.notes || ' | ', '')
               || 'Feature 013: city dropped as a pricing axis. No cited source distinguishes '
               || 'Saudi cities; this row is retained as one of a national min/median/max triple.'
 where b.id in (select id from keepers);

update public.benchmark_records b
   set active = false,
       notes = coalesce(b.notes || ' | ', '')
               || 'Feature 013: deactivated as a duplicate of the national triple. It existed '
               || 'only to fan one figure across cities that no cited source distinguishes.'
 where b.active and b.verified and b.city_id is not null;
