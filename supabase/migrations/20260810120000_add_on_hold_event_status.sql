-- Adds an "On hold" event status, mirroring the value that already exists on
-- company_status. Covers events that are paused rather than cancelled: the
-- partner has gone quiet, a date slipped, or a decision is pending.
--
-- Placed after 'Confirmed' so the enum's natural order still reads as a
-- lifecycle — Planned, Confirmed, On hold, Completed, Cancelled.
--
-- IF NOT EXISTS keeps this re-runnable. Note that Postgres allows ADD VALUE
-- inside a transaction, but the new value cannot be *used* until that
-- transaction commits — so nothing in this migration may reference it. Any
-- backfill has to be a separate, later migration.

ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'On hold' AFTER 'Confirmed';
