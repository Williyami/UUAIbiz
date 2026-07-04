-- Correct standard pricing to match UUAIS_Terms_for_Events (HT25):
-- Lunch lecture 5 000 SEK, Evening event 7 000 SEK, Weekend event (or longer) 10 000 SEK.
-- The original seed shipped with wrong values (7000/12000/25000).
UPDATE public.contract_templates
SET
  pricing = '{"Lunch lecture": 5000, "Evening event": 7000, "Weekend event or longer": 10000, "Other": 0}'::jsonb,
  updated_at = now();

-- Seed the outreach pipeline with the real contacts from the prior team's
-- handover document (last revised 4 July 2026). Idempotent: skips any company
-- that already exists by name, so this is safe to re-run.
INSERT INTO public.companies (name, contact_person, status, source, notes, last_contact_date)
SELECT v.name, v.contact_person, v.status, v.source, v.notes, v.last_contact_date
FROM (
  VALUES
    ('QuantumBlack', 'Daniel Martínez', 'Contacted'::public.company_status, 'Prior team handover',
     'Expressed interest in hosting an event.', DATE '2026-07-04'),
    ('Compileit', 'Linda Svedin', 'Contacted'::public.company_status, 'Prior team handover',
     'Expressed interest in hosting an event.', DATE '2026-07-04'),
    ('Impact Solution', 'Oliver Jonsson', 'Negotiating'::public.company_status, 'Prior team handover',
     'Held an event with us before and wants to do more. Interested in early fall; has offered their own space.', DATE '2026-07-04'),
    ('BCG X', 'Delfina Rossi', 'Contacted'::public.company_status, 'Prior team handover',
     'Expressed interest in hosting an event.', DATE '2026-07-04'),
    ('Ericsson', 'Ida Ellingsson', 'Negotiating'::public.company_status, 'Prior team handover',
     'Held an event with us before and wants to do more. Planning for the next event already underway.', DATE '2026-07-04'),
    ('Drivhuset', 'Philip Gratell', 'Contacted'::public.company_status, 'Prior team handover',
     'Interested in a startup-themed hackathon.', DATE '2026-07-04'),
    ('Scale Capital', 'Elias Agardh', 'Contacted'::public.company_status, 'Prior team handover',
     'Potential prize sponsor for hackathons.', DATE '2026-07-04'),
    ('Scaleout Systems', 'David Hovstadius', 'Completed'::public.company_status, 'Prior team handover',
     'Uppsala ML startup. Held a workshop with us; wants another one.', DATE '2026-07-04'),
    ('Modulai', 'Amanda Nilsson Ringi', 'Completed'::public.company_status, 'Prior team handover',
     'AI/ML consultants. Very positive after previous event — specifically appreciated receiving flowers. Other contacts: Viktor Westerlund, Hedda Wachtmeister Isoz.', DATE '2026-07-04')
) AS v(name, contact_person, status, source, notes, last_contact_date)
WHERE NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.name = v.name);
