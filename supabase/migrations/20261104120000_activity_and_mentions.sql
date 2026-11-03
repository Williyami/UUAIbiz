-- 1. Activity feed for the home page: one row per thing a teammate did.
--
-- Written only by the triggers below (SECURITY DEFINER), never by clients.
-- Rows are recorded only when a signed-in person did it (auth.uid() is set),
-- so background jobs like the hourly auto-complete of past events don't
-- flood the feed.

CREATE TABLE IF NOT EXISTS public.activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind text NOT NULL,
  title text NOT NULL,
  detail text,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_recent ON public.activity (created_at DESC);
GRANT SELECT ON public.activity TO authenticated;
GRANT ALL ON public.activity TO service_role;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone signed in can view activity" ON public.activity;
CREATE POLICY "Anyone signed in can view activity" ON public.activity
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _kind text; _title text; _detail text; _link text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'companies' THEN
    _title := NEW.name; _link := '/outreach';
    IF TG_OP = 'INSERT' THEN _kind := 'company_added';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN _kind := 'company_moved'; _detail := NEW.status::text;
    END IF;
  ELSIF TG_TABLE_NAME = 'contacts' AND TG_OP = 'INSERT' THEN
    _kind := 'contact_added'; _title := NEW.name; _link := '/contacts';
    SELECT name INTO _detail FROM public.companies WHERE id = NEW.company_id;
    _detail := COALESCE(_detail, NEW.company_name);
  ELSIF TG_TABLE_NAME = 'events' THEN
    _title := NEW.title; _link := '/events/' || NEW.id;
    IF TG_OP = 'INSERT' THEN _kind := 'event_added';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN _kind := 'event_status'; _detail := NEW.status::text;
    END IF;
  ELSIF TG_TABLE_NAME = 'tasks' AND TG_OP = 'UPDATE' THEN
    -- Personal tasks are private; never surface them.
    IF NEW.status = 'Done' AND OLD.status IS DISTINCT FROM 'Done' AND NOT NEW.personal THEN
      _kind := 'task_done'; _title := NEW.title; _link := '/tasks';
    END IF;
  ELSIF TG_TABLE_NAME = 'meetings' THEN
    _title := NEW.title; _link := '/meetings';
    IF TG_OP = 'INSERT' THEN _kind := 'meeting_added';
    ELSIF OLD.poll_week_start IS NOT NULL AND NEW.poll_week_start IS NULL AND NEW.meeting_date IS NOT NULL THEN
      _kind := 'meeting_booked';
      _detail := to_char(NEW.meeting_date, 'YYYY-MM-DD') || COALESCE(' ' || to_char(NEW.meeting_time, 'HH24:MI'), '');
    END IF;
  ELSIF TG_TABLE_NAME = 'board_posts' AND TG_OP = 'INSERT' THEN
    _kind := 'idea_posted'; _title := LEFT(NEW.content, 80); _link := '/ideas';
  END IF;

  IF _kind IS NOT NULL THEN
    INSERT INTO public.activity (actor_id, kind, title, detail, link)
    VALUES (auth.uid(), _kind, _title, _detail, _link);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS companies_log_activity ON public.companies;
CREATE TRIGGER companies_log_activity AFTER INSERT OR UPDATE OF status ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
DROP TRIGGER IF EXISTS contacts_log_activity ON public.contacts;
CREATE TRIGGER contacts_log_activity AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
DROP TRIGGER IF EXISTS events_log_activity ON public.events;
CREATE TRIGGER events_log_activity AFTER INSERT OR UPDATE OF status ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
DROP TRIGGER IF EXISTS tasks_log_activity ON public.tasks;
CREATE TRIGGER tasks_log_activity AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
DROP TRIGGER IF EXISTS meetings_log_activity ON public.meetings;
CREATE TRIGGER meetings_log_activity AFTER INSERT OR UPDATE OF poll_week_start ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
DROP TRIGGER IF EXISTS board_posts_log_activity ON public.board_posts;
CREATE TRIGGER board_posts_log_activity AFTER INSERT ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();


-- 2. @mentions in chat, ideas and idea comments notify the person mentioned.
--
-- A handle is someone's full name without spaces (@WilliamEklund), or just
-- their first name (@William) when nobody else shares it. Matching ignores
-- case. The app inserts handles in the same format from its @ picker.

CREATE OR REPLACE FUNCTION public.notify_mentions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _author text;
  _where text;
  _link text;
BEGIN
  IF NEW.content IS NULL OR position('@' IN NEW.content) = 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(NULLIF(split_part(name, ' ', 1), ''), email) INTO _author
  FROM public.profiles WHERE id = NEW.author_id;

  IF TG_TABLE_NAME = 'chat_messages' THEN _where := 'in chat'; _link := '/chat';
  ELSIF TG_TABLE_NAME = 'board_posts' THEN _where := 'in an idea'; _link := '/ideas';
  ELSE _where := 'in a comment'; _link := '/ideas';
  END IF;

  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT DISTINCT p.id,
         COALESCE(_author, 'A teammate') || ' mentioned you ' || _where,
         LEFT(NEW.content, 140),
         _link
  FROM public.profiles p
  JOIN LATERAL (
    SELECT lower(m[1]) AS handle
    FROM regexp_matches(NEW.content, '@([[:alnum:]_]+)', 'g') AS m
  ) t ON true
  WHERE p.id IS DISTINCT FROM NEW.author_id
    AND p.name IS NOT NULL
    AND (
      lower(regexp_replace(p.name, '\s+', '', 'g')) = t.handle
      OR (
        lower(split_part(p.name, ' ', 1)) = t.handle
        AND (SELECT count(*) FROM public.profiles q
             WHERE lower(split_part(q.name, ' ', 1)) = t.handle) = 1
      )
    );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS chat_messages_notify_mentions ON public.chat_messages;
CREATE TRIGGER chat_messages_notify_mentions AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_mentions();
DROP TRIGGER IF EXISTS board_posts_notify_mentions ON public.board_posts;
CREATE TRIGGER board_posts_notify_mentions AFTER INSERT ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_mentions();
DROP TRIGGER IF EXISTS idea_comments_notify_mentions ON public.idea_comments;
CREATE TRIGGER idea_comments_notify_mentions AFTER INSERT ON public.idea_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_mentions();
