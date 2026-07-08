-- Multi-assignee: tasks/meetings/companies/events move from a single
-- assigned_to UUID to an assignees UUID[] (existing values carried over).
-- Meetings also gain an "internal" flag for meetings with no company.

ALTER TABLE public.tasks ADD COLUMN assignees UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE public.meetings ADD COLUMN assignees UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE public.companies ADD COLUMN assignees UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE public.events ADD COLUMN assignees UUID[] NOT NULL DEFAULT '{}';

UPDATE public.tasks SET assignees = ARRAY[assigned_to] WHERE assigned_to IS NOT NULL;
UPDATE public.meetings SET assignees = ARRAY[assigned_to] WHERE assigned_to IS NOT NULL;
UPDATE public.companies SET assignees = ARRAY[assigned_to] WHERE assigned_to IS NOT NULL;
UPDATE public.events SET assignees = ARRAY[assigned_to] WHERE assigned_to IS NOT NULL;

DROP TRIGGER tasks_notify_assignment ON public.tasks;
DROP TRIGGER companies_notify_assignment ON public.companies;
DROP TRIGGER events_notify_assignment ON public.events;
DROP TRIGGER meetings_notify_assignment ON public.meetings;

-- The personal-task policies reference assigned_to; recreate them on assignees.
DROP POLICY "Anyone signed in can view tasks" ON public.tasks;
CREATE POLICY "Anyone signed in can view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (NOT personal OR auth.uid() = ANY (assignees));

DROP POLICY "Editors can manage tasks" ON public.tasks;
CREATE POLICY "Editors can manage tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_editor(auth.uid()) AND (NOT personal OR auth.uid() = ANY (assignees)))
  WITH CHECK (public.is_editor(auth.uid()) AND (NOT personal OR auth.uid() = ANY (assignees)));

ALTER TABLE public.tasks DROP COLUMN assigned_to;
ALTER TABLE public.meetings DROP COLUMN assigned_to;
ALTER TABLE public.companies DROP COLUMN assigned_to;
ALTER TABLE public.events DROP COLUMN assigned_to;

ALTER TABLE public.meetings ADD COLUMN internal BOOLEAN NOT NULL DEFAULT false;

-- Notify each newly added assignee (never the actor themself).
CREATE OR REPLACE FUNCTION public.notify_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID;
  _old UUID[];
  _title TEXT;
  _body TEXT;
  _link TEXT;
BEGIN
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
  _old := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.assignees, '{}') ELSE '{}' END;
  FOREACH _uid IN ARRAY COALESCE(NEW.assignees, '{}') LOOP
    IF NOT (_uid = ANY (_old)) AND _uid IS DISTINCT FROM auth.uid() THEN
      INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (_uid, _title, _body, _link);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER tasks_notify_assignment AFTER INSERT OR UPDATE OF assignees ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();
CREATE TRIGGER companies_notify_assignment AFTER INSERT OR UPDATE OF assignees ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();
CREATE TRIGGER events_notify_assignment AFTER INSERT OR UPDATE OF assignees ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();
CREATE TRIGGER meetings_notify_assignment AFTER INSERT OR UPDATE OF assignees ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();
