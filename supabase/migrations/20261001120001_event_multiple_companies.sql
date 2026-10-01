-- An event can involve several partners. The National AI Startup Competition
-- ran with Anthropic, NVIDIA, AWS and Lovable at once, and the single
-- company_id could only record one of them.
--
-- Mirrors the assignees pattern already used on tasks, meetings, companies and
-- events: a uuid[] of the partners involved.
--
-- company_id stays as a mirror of the first entry. The events query embeds
-- company:companies(...) through that foreign key, and tasks created from an
-- event copy it into related_company_id — keeping it means neither has to
-- change, and it can be dropped once every read goes through company_ids.

ALTER TABLE public.events
  ADD COLUMN company_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.events.company_ids IS
  'Partner companies involved. company_id mirrors the first entry.';

UPDATE public.events
SET company_ids = ARRAY[company_id]
WHERE company_id IS NOT NULL;

CREATE INDEX events_company_ids_idx ON public.events USING GIN (company_ids);
