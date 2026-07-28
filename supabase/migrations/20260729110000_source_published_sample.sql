-- Weight each source by the sample size it published (specs/012-source-sample-confidence).
--
-- Until now every published_ref row carried a confidence set by hand at ingestion: 0.60 for a
-- directly published freelance rate, 0.50 for anything bridged from a salary or a currency.
-- So YunoJuno's 182,000 booking data points and ProCopywriters' 298 respondents contributed
-- to a price band with identical trustworthiness. Both publishers state their sample; both
-- figures were written into the ingestion comments; and both were discarded at the one point
-- they mattered.
--
-- WHAT THIS DOES NOT DO: it does not touch price_sar. Not one band moves. The only thing that
-- changes is how much weight the evidence behind a price carries.
--
-- WHAT TO EXPECT: the average evidence score across the 700 live cells rises from 12.1% to
-- about 13.4% — roughly +11%, NOT the +40% first estimated in docs/pricing-confidence-plan.md.
-- 315 cells go DOWN and 385 go up. The reason is the row block below: the 1,260-row
-- "Saudi-adjusted global freelance reference" seed is 69% of the corpus, publishes no sample
-- whatsoever, and today holds the joint-HIGHEST confidence in the table at 0.60. Under the
-- rule it correctly falls to 0.50, cancelling most of the gain from the two large surveys.
-- A run of this migration in which nothing decreased would mean the rule was not applied.

alter table public.benchmark_records
  add column if not exists published_sample integer;

comment on column public.benchmark_records.published_sample is
  'Number of observations the source''s publisher states stand behind the figure THIS row uses. '
  'NULL means the publisher stated none — which is not the same as a small sample, and lands in '
  'the lowest confidence band rather than below it. May differ from a source''s headline total: '
  'ProCopywriters surveyed 298 freelancers overall but reports the content-writing rate from 38 '
  'of them, and 38 is the honest number for a content-writing row.';

-- Recorded samples, each verified against the publisher''s own statement. Where a source gives
-- an approximation the conservative end is used ("over 1,100" -> 1100), never the flattering one.
update public.benchmark_records b
   set published_sample = case
     when b.source_ref like 'YunoJuno 2026%'                     then 182000  -- booking data points, 2024-25
     when b.source_ref like 'Stack Overflow Developer Survey%'   then 23928   -- respondents
     when b.source_ref like 'Robert Half 2026 Salary Guide%'     then 4200    -- ~2,000 workers + ~2,200 hiring managers
     when b.source_ref like 'Editorial Freelancers Association%' then 1100    -- "over 1,100" members
     when b.source_ref like 'Nonprofit.ist%'                     then 300     -- "over 300" consultants
     when b.source_ref like 'ProCopywriters%'
       and b.specialty_id = (select id from public.specialties where slug = 'copywriting')
                                                                 then 220     -- copywriters within the 298 total
     when b.source_ref like 'ProCopywriters%'
       and b.specialty_id = (select id from public.specialties where slug = 'content-writing')
                                                                 then 38      -- content writers within the 298 total
     -- IEEE-USA publishes regional medians without a stated sample.
     -- The legacy seed states nothing at all. Both stay NULL, and both read as unstated.
     else null
   end
 where b.provenance in ('published_ref', 'ingested');

-- Derive confidence from the recorded sample. Mirrors src/lib/pricing/sourceConfidence.ts;
-- the thresholds live in both places on purpose so the backfill is readable on its own, and
-- sourceConfidence.test.ts pins the same boundaries.
--
-- RESTRICTED to published_ref/ingested deliberately. Including 'founder' would drop editorial
-- rows into the unstated band and RAISE them from 0.30 to 0.50 — inflating the weakest evidence
-- in the corpus under the banner of an honesty fix. Editorial weakness is already carried by
-- PROVENANCE_WEIGHT (founder = 0.3); it does not belong in the sample column too.
update public.benchmark_records b
   set confidence = case
     when b.published_sample is null      then 0.50
     when b.published_sample >= 50000     then 0.90
     when b.published_sample >= 5000      then 0.80
     when b.published_sample >= 500       then 0.70
     when b.published_sample >= 50        then 0.60
     else 0.50
   end
 where b.provenance in ('published_ref', 'ingested');
