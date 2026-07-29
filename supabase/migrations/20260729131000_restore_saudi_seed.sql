-- Reversal of 20260729130000 (founder decision, same day).
--
-- Retiring the seed lowered the evidence score (16.1% -> 11.8%) instead of raising it, and
-- took 171 cells below the 3-row floor. The seed goes back in service while a better answer
-- is worked out.
--
-- Nothing about its problems changed: one source_ref, no stated sample, no resolvable
-- citation, one capture date, 1,260 rows from a single draft document. It sits at confidence
-- 0.50 — the unstated-sample floor — and its retirement note is kept on the row rather than
-- erased, so the record of what it is travels with it.

update public.benchmark_records
   set active = true,
       notes = coalesce(notes, '')
               || ' | Restored 2026-07-29: retiring it lowered the evidence score rather than '
               || 'raising it (thin-sample penalty outweighed the cleaner average). Still '
               || 'unverifiable; still at the unstated-sample floor of 0.50.'
 where source_ref like 'Saudi-adjusted global freelance reference%'
   and not active;
