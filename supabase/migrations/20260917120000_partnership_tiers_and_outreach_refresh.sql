-- Bring the Info page in line with the two partnership PDFs and the current
-- cold-outreach wording.
--
--   1. Adds the Alfa/Beta semester tiers, which were documented only in
--      UUAIS_Partnership_Tiers.pdf and nowhere in the Hub. These are separate
--      from the per-event pricing already in "Partnership terms & pricing" —
--      that section is left untouched, including its numbers.
--   2. Replaces the cold-outreach template: the old one opened with "You
--      previously indicated an interest", which is wrong for a first contact
--      and contradicted its own heading.
--   3. Puts real figures into the pitch points, from UUAIS_Partnership_Overview.pdf.
--
-- Idempotent: sort orders are assigned by title, and the insert is guarded.

-- 1. Fixed positions, so re-running can't shuffle the page.
UPDATE public.info_sections SET sort_order = 0 WHERE title = 'Partnership terms & pricing (HT25)';
UPDATE public.info_sections SET sort_order = 2 WHERE title = 'Event checklist — standard procedure';
UPDATE public.info_sections SET sort_order = 3 WHERE title = 'Hackathon playbook';
UPDATE public.info_sections SET sort_order = 4 WHERE title = 'Why partner with UUAIS (pitch points)';
UPDATE public.info_sections SET sort_order = 5 WHERE title = 'Lessons learned — prior team';
UPDATE public.info_sections SET sort_order = 6 WHERE title = 'Outreach templates';

INSERT INTO public.info_sections (title, body, sort_order)
SELECT 'Partnership tiers — Alfa & Beta', $md$
Two levels, both running a full semester and renewable. Hosting an event with UUAIS is a **separate arrangement** — partners are welcome to do both.

## Alfa — 20 000 SEK per semester
Our closest level. The number of Alfa partners is kept deliberately small so each one stands out.

**Visibility**
- Logo in top placement on the UUAIS website
- A dedicated announcement post on LinkedIn and Instagram when the partnership begins
- Named as a partner in our event write-ups

**Recruiting**
- Job postings published on the UUAIS job board
- Job postings shared on LinkedIn and Instagram, up to four per semester
- Job postings sent directly to all UUAIS members
- Access to CVs and contact details from students who have actively consented

**Events**
- A guaranteed jury or panel seat at at least one major event per semester
- Priority on dates when they want to host their own event with us
- The option to give a lightning talk or have a booth presence at our hackathons

**Community**
- The option to sponsor UUAIS merch, with their logo on the items; production arranged at cost
- Named in updates sent to our members
- The right to use the title "Official Partner of UU AI Society" in their own marketing

**Relationship**
- A dedicated contact in the UUAIS business team
- One check-in meeting per semester

## Beta — 8 000 SEK per semester
A lighter level for organizations that want a presence in our community and access to our members without the broader commitment of Alfa.

- Logo listed on the UUAIS website
- Named in a combined partner post on social media once per semester
- Job postings published on the UUAIS job board
- Job postings sent directly to all UUAIS members
- The option to take part as a mentor at our hackathons
- A dedicated contact in the UUAIS business team

## What Beta does not include
Social sharing of job postings · announcement post at signing · CV access · guaranteed jury or panel seat · lightning talk or booth · date priority · merch sponsorship · the partner title · the check-in meeting.

---
Source of truth is **UUAIS_Partnership_Tiers.pdf** — change both together. These are semester partnerships, separate from the per-event pricing above.
$md$, 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.info_sections WHERE title = 'Partnership tiers — Alfa & Beta'
);

-- 2. Current cold-outreach wording, with the subject line and the
--    "point me elsewhere" close. The LinkedIn note below it is unchanged.
UPDATE public.info_sections
SET body = $md$## Cold outreach (first contact)
Use when reaching out to a new company contact with no prior relationship.

**Subject:** UU AI Society x [Company] collaboration

> Dear [Contact name],
>
> My name is [Your name]. I serve as [Your role] at UU AI Society (UUAIS) at Uppsala University. We facilitate connections between organisations and a network of AI-focused students (Data Science, Machine Learning, Engineering, Finance and related programs) through events such as lunch lectures, workshops, hackathons and more.
>
> Given [Company]'s work in [specific reason the partnership fits, e.g. AI infrastructure / AI-driven consulting / quantitative research], and the strong overlap with what our students are studying and building, I believe there is strong potential for a mutually valuable partnership.
>
> Would you be available for a brief call to explore possible formats and next steps? I am flexible and can adapt to a time that suits your schedule. Happy to be pointed in a different direction too, if there's someone else better placed to discuss this.
>
> [Email signature]

**Tips**
- Always fill in the [specific reason] — a generic send is the one that gets ignored.
- Contact multiple people per company where possible; cold LinkedIn outreach works.
- Log the send in Outreach and set a follow-up reminder — don't let it go quiet after one message.

## LinkedIn connection note
Use when sending a connection request to a new contact. LinkedIn caps connection notes at 300 characters — keep it this tight.

> Hi [First name]! I'm [Your name], [Your role] at UU AI Society at Uppsala University. We connect AI-focused students in Data Science, Machine Learning, Engineering and Finance to organisations through workshops, hackathons and events. I'd love to connect and explore collaboration opportunities with [Company].$md$
WHERE title = 'Outreach templates';

-- 3. Pitch points with the figures partners actually ask for.
UPDATE public.info_sections
SET body = $md$## The numbers (as of September 2026)
- **361 members**, 281 with a program on file
- **12 events** this year: 4 hackathons, 6 workshops, 1 guest lecture, 1 study visit
- **1 100 LinkedIn followers** (up from 287) and **441 on Instagram** (up from 150)
- Most represented programs: Data Science / ML (54), Engineering Physics (39), Computer Science (31), Industrial Engineering & Management (21)

## Names that open doors
The National AI Startup Competition 2026 local round was run with **Anthropic, NVIDIA, AWS and Lovable**, hosted at Impact Solution's HQ. Other partners include Unibap Space Solutions, Modulai, Epiminds, Scaleout Systems, Ericsson and Uppsala Municipality.

## The argument
- Access to a **targeted network of AI-native students** across Data Science, ML, image analysis, engineering physics and industrial engineering
- The best way to reach top engineering students in Uppsala, with growing reach into business and economics
- UUAIS provides "boots on the ground": marketing, registration, logistics and follow-up, so the partner brings content rather than admin
- Why pay if the company also covers food and venue? Because UUAIS is the **access point to the student network** and needs to sustain its own operations
- Partners come back — the pitch is a long-term relationship, not a one-off transaction

---
Figures from **UUAIS_Partnership_Overview.pdf**. Refresh both when the numbers move.$md$
WHERE title = 'Why partner with UUAIS (pitch points)';
