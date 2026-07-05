-- Split the previous "USING (true) FOR ALL" policies on companies/events/
-- tasks/contracts into: read for everyone signed in (viewers included), and
-- write restricted to admins + business-team members (not viewers).
CREATE OR REPLACE FUNCTION public.is_editor(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'member')
$$;

DROP POLICY "Team can manage companies" ON public.companies;
CREATE POLICY "Anyone signed in can view companies" ON public.companies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can manage companies" ON public.companies
  FOR ALL TO authenticated USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

DROP POLICY "Team can manage events" ON public.events;
CREATE POLICY "Anyone signed in can view events" ON public.events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can manage events" ON public.events
  FOR ALL TO authenticated USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

DROP POLICY "Team can manage tasks" ON public.tasks;
CREATE POLICY "Anyone signed in can view tasks" ON public.tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can manage tasks" ON public.tasks
  FOR ALL TO authenticated USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

DROP POLICY "Team can manage contracts" ON public.contracts;
CREATE POLICY "Anyone signed in can view contracts" ON public.contracts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can manage contracts" ON public.contracts
  FOR ALL TO authenticated USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));
