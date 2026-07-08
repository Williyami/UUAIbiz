-- Optional start time for meetings; date-only meetings stay valid.
ALTER TABLE public.meetings ADD COLUMN meeting_time TIME;
