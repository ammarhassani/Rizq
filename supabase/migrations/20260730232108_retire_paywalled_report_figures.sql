-- Licensing hygiene, decided before launch rather than after a letter.
--
-- Two sources in the corpus are headline figures lifted from reports that are SOLD:
--   IEEE-USA Consultants Fee Survey 2025    (8 rows)  — free article, paid report behind it
--   Nonprofit.ist Consultant Survey 2025    (4 rows)  — free executive summary, paid full report
--
-- Every other source in this corpus publishes its figures openly: free web pages, free PDFs, or
-- a Saudi shop's own advertised price list. These two are the only ones where the number we took
-- is the thing the publisher charges for. That is the worst exposure in the table and it is worth
-- twelve rows out of ~1,067 — about 1%.
--
-- Deactivating rather than deleting: the rows stay auditable, and `active` is what the resolver
-- reads, so nothing derived from them can surface. See
-- docs/validation/source-licensing-audit.md for the full inventory and the four sources that
-- still need twenty minutes of legal time before launch.

update public.benchmark_records
set active = false,
    notes = coalesce(notes || ' | ', '') ||
      'Retired 2026-07-31 (licensing): headline figure taken from a free article about a paid ' ||
      'report. Every other source in this corpus publishes openly. Removed pre-launch rather ' ||
      'than defended.'
where active
  and (source_ref ilike '%IEEE-USA Consultants Fee Survey%'
    or source_ref ilike '%Nonprofit.ist Consultant Cost%');
