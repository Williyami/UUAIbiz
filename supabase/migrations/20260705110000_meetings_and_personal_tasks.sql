-- Meetings: track on the company whether an intro/partnership meeting is
-- booked, and when. Surfaced on the Outreach forms and the Meetings page.
ALTER TABLE public.companies
  ADD COLUMN meeting_booked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN meeting_date DATE;

-- Personal tasks: private to their assignee. Team tasks stay shared.
ALTER TABLE public.tasks ADD COLUMN personal BOOLEAN NOT NULL DEFAULT false;

DROP POLICY "Anyone signed in can view tasks" ON public.tasks;
CREATE POLICY "Anyone signed in can view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (NOT personal OR assigned_to = auth.uid());

DROP POLICY "Editors can manage tasks" ON public.tasks;
CREATE POLICY "Editors can manage tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_editor(auth.uid()) AND (NOT personal OR assigned_to = auth.uid()))
  WITH CHECK (public.is_editor(auth.uid()) AND (NOT personal OR assigned_to = auth.uid()));
