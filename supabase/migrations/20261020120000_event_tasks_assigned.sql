-- "Tasks assigned?" on an event: a manual flag the team ticks once every
-- checklist item has an owner, so the Events page can show at a glance which
-- events still need people put on them. Mirrors "Meeting booked?" on
-- companies: a plain boolean, set by hand, nothing derived.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tasks_assigned boolean NOT NULL DEFAULT false;
