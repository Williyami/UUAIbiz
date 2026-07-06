-- Shared bulletin board: everyone signed in (viewers included) can post ideas
-- (companies to contact, event formats, anything); authors manage their own
-- posts, admins can moderate.
CREATE TABLE public.board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'General',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_posts TO authenticated;
GRANT ALL ON public.board_posts TO service_role;
ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view posts" ON public.board_posts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone signed in can post as themselves" ON public.board_posts
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can update own posts" ON public.board_posts
  FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Authors and admins can delete posts" ON public.board_posts
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER board_posts_updated_at BEFORE UPDATE ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notifications: rows are created by triggers below, users read and
-- mark-as-read only their own.
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_unread ON public.notifications (user_id, read, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- SECURITY DEFINER so the insert bypasses notifications RLS regardless of who
-- fired the trigger. Never notify the actor about their own action.
CREATE OR REPLACE FUNCTION public.notify_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _title TEXT;
  _body TEXT;
  _link TEXT;
BEGIN
  IF NEW.assigned_to IS NULL OR NEW.assigned_to = auth.uid() THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'tasks' THEN
    _title := 'Task assigned to you'; _body := NEW.title; _link := '/tasks';
  ELSIF TG_TABLE_NAME = 'companies' THEN
    _title := 'You now own a company relationship'; _body := NEW.name; _link := '/outreach';
  ELSIF TG_TABLE_NAME = 'events' THEN
    _title := 'Event assigned to you'; _body := NEW.title; _link := '/events/' || NEW.id;
  ELSIF TG_TABLE_NAME = 'meetings' THEN
    _title := 'Meeting assigned to you'; _body := NEW.title; _link := '/meetings';
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (NEW.assigned_to, _title, _body, _link);
  RETURN NEW;
END $$;

CREATE TRIGGER tasks_notify_assignment AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();
CREATE TRIGGER companies_notify_assignment AFTER INSERT OR UPDATE OF assigned_to ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();
CREATE TRIGGER events_notify_assignment AFTER INSERT OR UPDATE OF assigned_to ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();
CREATE TRIGGER meetings_notify_assignment AFTER INSERT OR UPDATE OF assigned_to ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();

-- New board posts notify everyone except the author.
CREATE OR REPLACE FUNCTION public.notify_board_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _author TEXT;
BEGIN
  SELECT COALESCE(NULLIF(name, ''), email) INTO _author FROM public.profiles WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT p.id, 'New board post from ' || COALESCE(_author, 'a teammate'),
         LEFT(NEW.content, 120), '/board'
  FROM public.profiles p
  WHERE p.id <> NEW.author_id;
  RETURN NEW;
END $$;

CREATE TRIGGER board_posts_notify AFTER INSERT ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_board_post();
