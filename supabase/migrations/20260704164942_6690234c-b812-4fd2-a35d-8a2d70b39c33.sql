
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.company_status AS ENUM ('Contacted', 'Negotiating', 'Booked', 'Completed', 'Declined', 'On hold');
CREATE TYPE public.event_type AS ENUM ('Lunch lecture', 'Evening event', 'Weekend event or longer', 'Other');
CREATE TYPE public.event_status AS ENUM ('Planned', 'Confirmed', 'Completed', 'Cancelled');
CREATE TYPE public.task_status AS ENUM ('To do', 'In progress', 'Done');
CREATE TYPE public.task_priority AS ENUM ('Low', 'Medium', 'High');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  avatar_url TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- profile policies
CREATE POLICY "Anyone signed in can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- role policies
CREATE POLICY "Anyone signed in can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- trigger to create profile
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status company_status NOT NULL DEFAULT 'Contacted',
  notes TEXT,
  source TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_contact_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage companies" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  event_type event_type NOT NULL DEFAULT 'Lunch lecture',
  date DATE,
  duration TEXT,
  venue TEXT,
  status event_status NOT NULL DEFAULT 'Planned',
  cost_to_us NUMERIC(12,2) NOT NULL DEFAULT 0,
  revenue_from_partner NUMERIC(12,2) NOT NULL DEFAULT 0,
  food_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  participant_count INTEGER,
  luma_link TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage events" ON public.events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  related_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  status task_status NOT NULL DEFAULT 'To do',
  priority task_priority NOT NULL DEFAULT 'Medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- contracts (log)
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  event_type event_type NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  custom_terms TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  content_snapshot TEXT,
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date_generated TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage contracts" ON public.contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- info sections
CREATE TABLE public.info_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.info_sections TO authenticated;
GRANT ALL ON public.info_sections TO service_role;
ALTER TABLE public.info_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can read info" ON public.info_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage info" ON public.info_sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER info_sections_updated_at BEFORE UPDATE ON public.info_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- contract templates (single row per language)
CREATE TABLE public.contract_templates (
  language TEXT PRIMARY KEY,
  template TEXT NOT NULL,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can read templates" ON public.contract_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage templates" ON public.contract_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.contract_templates (language, template, pricing) VALUES
('en', 'Hi {name},

Thank you for your interest in organizing an event together with UUAI Society. Below are our standard terms for collaborations and events.

{pricing}

Agreement that UUAIS may use your company''s logo and name for marketing and promotional purposes.

Agreement to co-collaborators or sponsorships that may be part of the event.

{custom_terms}

If any of the terms are difficult to meet, let us know, we''re happy to find a suitable solution together.

Best regards,
{signatory}', '{"Lunch lecture": 7000, "Evening event": 12000, "Weekend event or longer": 25000, "Other": 0}'::jsonb),
('sv', 'Hej {name},

Vad roligt att ni är intresserade av att arrangera ett event tillsammans med UUAI Society! Nedan hittar ni våra standardvillkor för samarbeten och evenemang:

{pricing}

UUAIS får använda ert företags logga och namn i marknadsföring av eventet.

Det kan förekomma medarrangörer eller sponsorer som deltar i eventet.

{custom_terms}

Om ni av någon anledning inte kan gå med på något av villkoren, hör gärna av er, vi hittar säkert en lösning som fungerar för alla.

Med vänliga hälsningar,
{signatory}', '{"Lunch lecture": 7000, "Evening event": 12000, "Weekend event or longer": 25000, "Other": 0}'::jsonb);
