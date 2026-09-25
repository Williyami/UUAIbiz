-- Two repairs to the Outreach list.
--
-- 1. Restore updated_at. The previous migration (20260925120000) set
--    primary_contact_id on every company, which fired companies_updated_at and
--    stamped all 94 rows with the same timestamp. Outreach sorts on that
--    column, so the ordering collapsed into a tie. The original values are
--    gone; the closest honest estimate is the later of when we created the row
--    and when we last contacted them, which is what the list is meant to
--    surface anyway.
--
-- 2. Merge companies that were entered twice. Reaching a second person at a
--    company used to mean creating a second company row, because a company
--    could only hold one contact. Now that contacts are their own rows, those
--    pairs should be one company with two contacts.
--
-- Only exact name matches are merged, and the oldest row wins so the earliest
-- created_at (when we first made contact) survives.

-- ---------------------------------------------------------------- 2. merge

CREATE TEMP TABLE dupe_merge ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    id,
    btrim(lower(name)) AS key,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY btrim(lower(name)) ORDER BY created_at, id) AS rn,
    COUNT(*)      OVER (PARTITION BY btrim(lower(name)))                        AS n
  FROM public.companies
)
SELECT k.id AS keep_id, d.id AS drop_id
FROM ranked k
JOIN ranked d ON d.key = k.key AND d.rn > 1
WHERE k.rn = 1 AND k.n > 1;

-- Everything pointing at the losing row moves across first.
UPDATE public.contacts c
SET company_id = m.keep_id,
    company_name = (SELECT name FROM public.companies WHERE id = m.keep_id)
FROM dupe_merge m WHERE c.company_id = m.drop_id;

UPDATE public.meetings x SET company_id = m.keep_id FROM dupe_merge m WHERE x.company_id = m.drop_id;
UPDATE public.events   x SET company_id = m.keep_id FROM dupe_merge m WHERE x.company_id = m.drop_id;
UPDATE public.tasks    x SET related_company_id = m.keep_id FROM dupe_merge m WHERE x.related_company_id = m.drop_id;

-- Fold the losing row's field values into the keeper. The most recently
-- contacted side wins the contact fields, since that is who we last spoke to;
-- assignees union, notes concatenate, flags OR together.
UPDATE public.companies k
SET
  last_contact_date = GREATEST(
    COALESCE(k.last_contact_date, DATE '0001-01-01'),
    COALESCE(d.last_contact_date, DATE '0001-01-01')
  ),
  primary_contact_id = CASE
    WHEN COALESCE(d.last_contact_date, DATE '0001-01-01')
       > COALESCE(k.last_contact_date, DATE '0001-01-01')
    THEN d.primary_contact_id ELSE k.primary_contact_id END,
  contact_person = CASE
    WHEN COALESCE(d.last_contact_date, DATE '0001-01-01')
       > COALESCE(k.last_contact_date, DATE '0001-01-01')
    THEN d.contact_person ELSE k.contact_person END,
  contact_title = CASE
    WHEN COALESCE(d.last_contact_date, DATE '0001-01-01')
       > COALESCE(k.last_contact_date, DATE '0001-01-01')
    THEN d.contact_title ELSE k.contact_title END,
  contact_email = CASE
    WHEN COALESCE(d.last_contact_date, DATE '0001-01-01')
       > COALESCE(k.last_contact_date, DATE '0001-01-01')
    THEN d.contact_email ELSE k.contact_email END,
  contact_phone = CASE
    WHEN COALESCE(d.last_contact_date, DATE '0001-01-01')
       > COALESCE(k.last_contact_date, DATE '0001-01-01')
    THEN d.contact_phone ELSE k.contact_phone END,
  assignees = ARRAY(
    SELECT DISTINCT u FROM unnest(COALESCE(k.assignees, '{}') || COALESCE(d.assignees, '{}')) AS u
  ),
  notes = NULLIF(
    btrim(concat_ws(E'\n', NULLIF(btrim(COALESCE(k.notes, '')), ''), NULLIF(btrim(COALESCE(d.notes, '')), ''))),
    ''
  ),
  industry = COALESCE(k.industry, d.industry),
  established_partner = k.established_partner OR d.established_partner,
  meeting_booked = k.meeting_booked OR d.meeting_booked,
  meeting_date = COALESCE(k.meeting_date, d.meeting_date)
FROM dupe_merge m
JOIN public.companies d ON d.id = m.drop_id
WHERE k.id = m.keep_id;

DELETE FROM public.companies WHERE id IN (SELECT drop_id FROM dupe_merge);

-- ------------------------------------------------- 1. restore updated_at
-- Done last so the merge's own writes don't re-flatten it. The trigger has to
-- stand down, or it would stamp now() over the values being restored.

ALTER TABLE public.companies DISABLE TRIGGER companies_updated_at;

UPDATE public.companies
SET updated_at = GREATEST(created_at, COALESCE(last_contact_date::timestamptz, created_at))
WHERE updated_at::date = DATE '2026-09-25';

ALTER TABLE public.companies ENABLE TRIGGER companies_updated_at;
