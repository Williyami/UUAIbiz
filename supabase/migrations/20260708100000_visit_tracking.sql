-- Per-user visit counter, readable only by admins (shown on the Team page).
-- Counting happens through record_visit() so users never write the table
-- directly; the client calls it once per browser session.
CREATE TABLE public.user_visits (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ
);
GRANT SELECT ON public.user_visits TO authenticated;
GRANT ALL ON public.user_visits TO service_role;
ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view visit counts" ON public.user_visits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_visit()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.user_visits (user_id, visit_count, last_visit_at)
  VALUES (auth.uid(), 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET visit_count = user_visits.visit_count + 1, last_visit_at = now();
$$;
REVOKE ALL ON FUNCTION public.record_visit() FROM public;
GRANT EXECUTE ON FUNCTION public.record_visit() TO authenticated;
