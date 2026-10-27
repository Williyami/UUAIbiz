-- Video-call link on a meeting (Zoom, Google Meet, Teams, …), shown as a
-- Join button on the Meetings page and written into exported calendar files.
-- Free text: the app normalises and validates it before saving.

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS meeting_link text;
