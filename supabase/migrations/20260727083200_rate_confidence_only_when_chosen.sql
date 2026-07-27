-- rate_confidence records a CHOICE, so it must be able to say "not chosen".
--
-- Feature 011 (FR-015) required that nothing be shown or stored as chosen unless the
-- freelancer chose it. The UI half shipped: the confidence pills no longer pre-select, and
-- the rates step omits the field from the payload when it was never picked.
--
-- The row kept lying anyway. `rate_confidence` was NOT NULL DEFAULT 'approximate', so every
-- account carried that value from the moment it was created, and the pass-4 re-drive found a
-- brand-new account already claiming a confidence nobody had picked.
--
-- After this migration NULL means "not chosen", which is what the application already assumes.

alter table public.users alter column rate_confidence drop default;
alter table public.users alter column rate_confidence drop not null;

-- One-time backfill.
--
-- Every stored 'approximate' was written unconditionally: by the column default above at
-- signup, and by the pre-fix rates step, which sent its own 'approximate' fallback on every
-- save regardless of what the freelancer touched. None of them is evidence of a choice, so
-- none may keep claiming to be one.
--
-- 'exact' and 'estimate' could only ever have come from a deliberate click, and are kept.
update public.users
   set rate_confidence = null
 where rate_confidence = 'approximate';
