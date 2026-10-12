-- Companies added after 20260925120000 carry a contact person inline but no
-- row in public.contacts, so the contact picker (which lists contacts rows)
-- never offered them. The app now creates the row when a company is saved;
-- this catches the 17 that were added before that fix.
--
-- Placeholder names ("N/A", "TBD", …) are skipped: they are not people, and a
-- contact called N/A would just clutter every picker.
--
-- The updated_at trigger is switched off while linking. Setting
-- primary_contact_id is bookkeeping, not an edit, and the last time this was
-- done without that (20260925120000) it stamped every company with the same
-- timestamp and flattened the Outreach ordering.

INSERT INTO public.contacts (name, role, email, phone, company_id, company_name)
SELECT
  btrim(c.contact_person),
  NULLIF(btrim(COALESCE(c.contact_title, '')), ''),
  NULLIF(btrim(COALESCE(c.contact_email, '')), ''),
  NULLIF(btrim(COALESCE(c.contact_phone, '')), ''),
  c.id,
  c.name
FROM public.companies c
WHERE c.primary_contact_id IS NULL
  AND COALESCE(btrim(c.contact_person), '') <> ''
  AND lower(btrim(c.contact_person)) NOT IN ('n/a', 'na', 'tbd', 'tba', 'unknown', '-', '?')
  AND NOT EXISTS (
    SELECT 1 FROM public.contacts x
    WHERE x.company_id = c.id
      AND lower(btrim(x.name)) = lower(btrim(c.contact_person))
  );

ALTER TABLE public.companies DISABLE TRIGGER companies_updated_at;

UPDATE public.companies c
SET primary_contact_id = m.id
FROM (
  SELECT DISTINCT ON (x.company_id, lower(btrim(x.name)))
         x.id, x.company_id, lower(btrim(x.name)) AS lname
  FROM public.contacts x
  ORDER BY x.company_id, lower(btrim(x.name)), x.created_at
) m
WHERE m.company_id = c.id
  AND c.primary_contact_id IS NULL
  AND COALESCE(btrim(c.contact_person), '') <> ''
  AND m.lname = lower(btrim(c.contact_person));

ALTER TABLE public.companies ENABLE TRIGGER companies_updated_at;
