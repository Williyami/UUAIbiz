-- Adds an "Idea" event status for events we're kicking around but not yet
-- planning: no date, no venue, no partner confirmed — just a thing someone
-- thinks we should do. Those already fit the events table, they just had
-- nowhere sensible to sit, so they ended up as "Planned" and polluted the
-- picture of what is actually in motion.
--
-- Placed before 'Planned' so the enum reads as a lifecycle:
-- Idea, Planned, Confirmed, On hold, Completed, Cancelled.
--
-- IF NOT EXISTS keeps this re-runnable. Postgres allows ADD VALUE inside a
-- transaction but the value cannot be *used* until that transaction commits,
-- so nothing here may reference it — the column work is a separate migration.

ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'Idea' BEFORE 'Planned';
