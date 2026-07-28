-- Only offer a specialty the engine can actually price.
--
-- After the two published-reference waves, five of the expanded specialties still hold
-- fewer than MIN_SAMPLE (3) records in their thinnest cell, so every lookup would return
-- insufficient_data. Offering a specialty in the picker that can only ever answer "no
-- data" is a worse experience than not offering it, and it teaches the freelancer that
-- the tool does not know their field.
--
-- Deactivated, not deleted: their benchmark rows stay in place, so each one becomes
-- active again the moment a source lifts it over the floor. What each still needs:
--   product-management  — 2 records (YunoJuno, Stack Overflow). Needs 1 more source.
--   project-management  — 2 records (YunoJuno, Stack Overflow). Needs 1 more source.
--   proofreading        — 2 records, both EFA endpoints. Needs a second source.
--   transcription       — 2 records, both EFA endpoints. Needs a second source.
--   motion-graphics     — 1 record (YunoJuno "Creatives"). Needs 2 more.
-- The refresh-pricing-sources skill reports this list on every run.

update public.specialties
   set active = false
 where slug in (
   'product-management',
   'project-management',
   'proofreading',
   'transcription',
   'motion-graphics'
 );
