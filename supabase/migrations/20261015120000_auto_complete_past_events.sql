-- Events move to Completed on their own once their date has passed.
--
-- Until now someone had to remember to flip the status by hand, so a finished
-- event sat on "Confirmed" and kept counting as upcoming — on the dashboard,
-- in revenue forecasts and in the Confirmed group on the Events page.
--
-- Which statuses move:
--   Planned, Confirmed  -> Completed   (it was going ahead, and the day is gone)
-- Which don't:
--   Idea       never scheduled, so a stale date means nothing
--   On hold    paused on purpose; a slipped date is not a finished event
--   Cancelled  already decided
--   Completed  already there
--
-- "Passed" means strictly before today in Stockholm time, so an event is still
-- live for the whole of its own day. pg_cron runs in UTC, but the date is
-- computed here, so daylight saving can't shift it.
--
-- The job runs hourly rather than once at midnight: it is a cheap indexed
-- update, and it means an event whose date is edited into the past is picked
-- up within the hour instead of waiting for the next night.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.complete_past_events()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  moved integer;
BEGIN
  UPDATE public.events
  SET status = 'Completed'
  WHERE date IS NOT NULL
    AND date < (now() AT TIME ZONE 'Europe/Stockholm')::date
    AND status IN ('Planned', 'Confirmed');
  GET DIAGNOSTICS moved = ROW_COUNT;
  RETURN moved;
END;
$$;

COMMENT ON FUNCTION public.complete_past_events() IS
  'Sets Planned/Confirmed events dated before today (Stockholm) to Completed. Run hourly by pg_cron.';

-- Only the scheduler (and admins via SQL) should call this; it is not an API.
REVOKE ALL ON FUNCTION public.complete_past_events() FROM PUBLIC, anon, authenticated;

-- Named, so re-running the migration replaces the job instead of duplicating it.
SELECT cron.schedule(
  'complete-past-events',
  '0 * * * *',
  $$SELECT public.complete_past_events()$$
);

-- Fail the whole migration, rather than ship it silently inert, if the job
-- did not register.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'complete-past-events') THEN
    RAISE EXCEPTION 'pg_cron job complete-past-events was not created';
  END IF;
END
$$;

-- Catch up immediately rather than waiting for the first hourly run.
SELECT public.complete_past_events();
