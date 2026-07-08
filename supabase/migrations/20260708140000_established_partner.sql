-- Established partners: companies we have a proven relationship with,
-- marked manually and shown as a green light on outreach cards.
ALTER TABLE public.companies ADD COLUMN established_partner BOOLEAN NOT NULL DEFAULT false;
