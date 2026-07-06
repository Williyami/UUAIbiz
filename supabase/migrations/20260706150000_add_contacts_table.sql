-- Standalone contacts: people we know at companies (or independent of one).
-- The Contacts page merges these manual rows with contact people already
-- recorded on companies in Outreach, so this table only stores manual adds.
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors can manage contacts" ON public.contacts
  FOR ALL TO authenticated USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
