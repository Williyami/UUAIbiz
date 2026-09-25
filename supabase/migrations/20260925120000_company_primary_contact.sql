-- Let a company have several contacts, and record which one you last wrote to.
--
-- Until now a company carried exactly one person inline (contact_person,
-- contact_title, contact_email, contact_phone). Following up with a second
-- person at the same company meant overwriting the first — the previous
-- contact was simply lost.
--
-- public.contacts already models many-people-per-company, but 87 of 94
-- companies had their contact only in the inline columns, so a picker built on
-- that table would have been empty almost everywhere. This migration therefore
-- backfills the inline contacts into public.contacts first, then adds a
-- pointer to whichever of them is current.
--
-- The inline columns stay. Fourteen files read them, and they now act as a
-- mirror of the primary contact, kept in sync by the UI. They can be dropped
-- later, once every read site goes through primary_contact_id instead.

-- 1. Every inline contact becomes a real contacts row, unless that company
--    already has someone by that name (7 companies were already migrated by
--    hand, and duplicating them would be worse than doing nothing).
INSERT INTO public.contacts (name, role, email, phone, company_id, company_name)
SELECT
  btrim(c.contact_person),
  NULLIF(btrim(COALESCE(c.contact_title, '')), ''),
  NULLIF(btrim(COALESCE(c.contact_email, '')), ''),
  NULLIF(btrim(COALESCE(c.contact_phone, '')), ''),
  c.id,
  c.name
FROM public.companies c
WHERE COALESCE(btrim(c.contact_person), '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.contacts x
    WHERE x.company_id = c.id
      AND lower(btrim(x.name)) = lower(btrim(c.contact_person))
  );

-- 2. Which contact the outreach fields currently describe.
ALTER TABLE public.companies
  ADD COLUMN primary_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.companies.primary_contact_id IS
  'The contact the inline contact_* columns mirror — i.e. who we last wrote to.';

-- 3. Point each company at the matching row. DISTINCT ON guards against a
--    company that somehow has two contacts with the same name: pick the oldest
--    rather than failing the migration.
UPDATE public.companies c
SET primary_contact_id = m.id
FROM (
  SELECT DISTINCT ON (x.company_id, lower(btrim(x.name)))
         x.id, x.company_id, lower(btrim(x.name)) AS lname
  FROM public.contacts x
  ORDER BY x.company_id, lower(btrim(x.name)), x.created_at
) m
WHERE m.company_id = c.id
  AND m.lname = lower(btrim(COALESCE(c.contact_person, '')))
  AND COALESCE(btrim(c.contact_person), '') <> '';

CREATE INDEX companies_primary_contact_id_idx
  ON public.companies (primary_contact_id);
