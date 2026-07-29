-- Retire the unverifiable seed (founder decision, 2026-07-29).
--
-- 1,260 rows — 69% of the corpus — under a single source_ref with no resolvable URL, no
-- stated sample, and one capture date. It was a min/median/max triple per cell derived from
-- one draft document, and until this week it carried the joint-HIGHEST confidence in the
-- table. It is "Saudi" data in name only: the underlying figures are global references with
-- an undocumented Saudi adjustment applied on top.
--
-- The cost was measured before running this, not after:
--   rows per cell            5.3 -> 3.8
--   average evidence score   16.1% -> 11.8%   (LOWER: the formula punishes a thin sample
--                                              harder than it rewards a cleaner average)
--   cells below the 3-row floor   0 -> 171
--
-- Eight specialties lose their band in at least one cell and now serve insufficient_data:
-- photography and voice-over (down to 1 row), digital-marketing, graphic-design, logo-design,
-- video-editing (1-3), translation and ui-ux-design (2-4).
--
-- That is the intended trade. Those cells were only resolving because invented figures padded
-- the count, and a screen that says "not enough data" is worth more than a band built on a
-- document nobody can check. The gap is now visible instead of papered over, and real
-- freelancer submissions are what fill it — see
-- src/app/actions/pricing/contributeBenchmarkFromProposal.ts.
--
-- Deactivated rather than deleted: active = false keeps the rows out of every read path
-- (resolvePrice filters on it) while preserving the record of what was once served.

update public.benchmark_records
   set active = false,
       notes = coalesce(notes || ' | ', '')
               || 'Retired 2026-07-29: unverifiable seed (no stated sample, no resolvable '
               || 'citation). Founder decision — replaced by real freelancer submissions.'
 where source_ref like 'Saudi-adjusted global freelance reference%'
   and active;
