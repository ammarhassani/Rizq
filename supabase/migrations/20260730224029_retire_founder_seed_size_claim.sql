-- The founder editorial seed asserts a project size it does not know, and the product was
-- showing the result: four specialties priced a few days BELOW a few hours.
--
-- mobile-dev 14,096 small against 12,658 medium. photography 3,991 against 3,667. translation
-- 1,110 against 865. voice-over 2,579 against 2,118. Any freelancer who moves the size slider
-- sees a bigger job get cheaper.
--
-- Traced to this seed: in 11 of the 12 specialties it covers, its medium price sits below its
-- small, and in 9 of 12 its enterprise sits below its large.
--
-- The first instinct was to reverse the ordering - a systematic flip would be a repair using the
-- seed's own numbers. Checking the rows killed that: photography/beginner runs 270, 325, 460,
-- then 130; photography/expert runs 12,015 down to 6,240; photography/mid runs 1,900, 1,500,
-- 1,870, 1,210. That is not an inverted ordering, it is no ordering. Re-sorting would have
-- invented a size structure the data has never contained, which is exactly the failure this
-- codebase keeps finding in its own history.
--
-- So only the false claim is dropped. project_size becomes NULL; the rows keep their price and
-- their tier, because the TIER ladder in this same seed is coherent and plausible -
-- beginner 270, junior 930, mid 1,900, senior 4,840, expert 12,015 for photography. One
-- dimension of this seed is informative and the other is noise, and they can be separated.
--
-- MEASURED EFFECT: inversions across all 20 active specialties go 4 -> 0. mobile-dev and
-- translation resolve ascending again from their cited sources. photography and voice-over have
-- no other evidence, so their bands go FLAT across sizes - the honest reading. We do not know how
-- size moves price for those two, and a flat band says so where a backwards one lied about it.
--
-- These rows are `editorial` family: they never anchor a band wherever a cited source exists, so
-- for the 12 specialties with real sources this widens rather than moves anything.

update public.benchmark_records
   set project_size = null,
       notes = coalesce(notes || ' | ', '')
               || 'Feature 013 follow-up: project_size cleared. This seed''s size assignment was '
               || 'not merely inverted but incoherent (photography/beginner ran 270, 325, 460, 130), '
               || 'and it was pricing a few days below a few hours in 11 of 12 specialties. The '
               || 'price and the experience tier are retained — the tier ladder in this seed is '
               || 'coherent; only its size claim was noise.'
 where active
   and verified
   and source_ref like 'Rizq founder editorial%'
   and project_size is not null;
