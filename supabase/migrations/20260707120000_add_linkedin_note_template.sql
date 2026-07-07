-- Append a LinkedIn connection note template to the existing "Outreach
-- templates" info section. Idempotent: only runs if the section doesn't
-- already contain it.
UPDATE public.info_sections
SET body = body || $md$

## LinkedIn connection note
Use when sending a connection request to a new contact. LinkedIn caps connection notes at 300 characters — keep it this tight.

> Hi [First name]! I'm [Your name], [Your role] at UU AI Society at Uppsala University. We connect AI-focused students in Data Science, Machine Learning, Engineering and Finance to organisations through workshops, hackathons and events. I'd love to connect and explore collaboration opportunities with [Company].
$md$
WHERE title = 'Outreach templates'
  AND body NOT LIKE '%LinkedIn connection note%';
