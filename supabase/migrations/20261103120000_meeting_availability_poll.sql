-- "Find a time": a When2Meet-style availability poll on a meeting.
--
-- A meeting with poll_week_start set is open for availability. Everyone
-- assigned to it paints the half-hour slots they can make in that week; an
-- editor then books the best fit (or any slot), which sets meeting_date and
-- meeting_time and closes the poll by clearing poll_week_start.
--
-- Slots are stored as local wall-clock starts, 'YYYY-MM-DDTHH:MM', the same
-- way meeting_date and meeting_time are: the whole team is in one timezone.

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS poll_week_start date,
  ADD COLUMN IF NOT EXISTS poll_days smallint NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS poll_day_start smallint NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS poll_day_end smallint NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS duration_minutes smallint NOT NULL DEFAULT 60;

ALTER TABLE public.meetings
  DROP CONSTRAINT IF EXISTS meetings_poll_shape;
ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_poll_shape CHECK (
    poll_days BETWEEN 1 AND 7
    AND poll_day_start BETWEEN 0 AND 23
    AND poll_day_end BETWEEN 1 AND 24
    AND poll_day_end > poll_day_start
    AND duration_minutes BETWEEN 30 AND 480
  );

CREATE TABLE IF NOT EXISTS public.meeting_availability (
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slots text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_availability TO authenticated;
GRANT ALL ON public.meeting_availability TO service_role;
ALTER TABLE public.meeting_availability ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can see the group's answers (that is the point of the
-- grid); each person can only write their own row.
DROP POLICY IF EXISTS "Anyone signed in can view availability" ON public.meeting_availability;
CREATE POLICY "Anyone signed in can view availability" ON public.meeting_availability
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "People manage their own availability" ON public.meeting_availability;
CREATE POLICY "People manage their own availability" ON public.meeting_availability
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS meeting_availability_updated_at ON public.meeting_availability;
CREATE TRIGGER meeting_availability_updated_at BEFORE UPDATE ON public.meeting_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notify the people on a meeting when a poll opens (pick your times) and when
-- it is booked (the time is set). Never the person who did it.
CREATE OR REPLACE FUNCTION public.notify_meeting_poll()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid;
  _title text;
  _body text;
BEGIN
  IF NEW.poll_week_start IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.poll_week_start IS DISTINCT FROM NEW.poll_week_start) THEN
    _title := 'Pick your times: ' || NEW.title;
    _body := 'Mark when you can meet in the week of ' || to_char(NEW.poll_week_start, 'YYYY-MM-DD') || '.';
  ELSIF TG_OP = 'UPDATE' AND OLD.poll_week_start IS NOT NULL AND NEW.poll_week_start IS NULL
        AND NEW.meeting_date IS NOT NULL THEN
    _title := 'Meeting booked: ' || NEW.title;
    _body := to_char(NEW.meeting_date, 'YYYY-MM-DD')
             || COALESCE(' at ' || to_char(NEW.meeting_time, 'HH24:MI'), '');
  ELSE
    RETURN NEW;
  END IF;
  FOREACH _uid IN ARRAY COALESCE(NEW.assignees, '{}') LOOP
    IF _uid IS DISTINCT FROM auth.uid() THEN
      INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (_uid, _title, _body, '/meetings');
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS meetings_notify_poll ON public.meetings;
CREATE TRIGGER meetings_notify_poll AFTER INSERT OR UPDATE OF poll_week_start ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.notify_meeting_poll();
