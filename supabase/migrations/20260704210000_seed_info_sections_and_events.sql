-- Seed the Info & Resources page with the reference material from the
-- handover documents, and create the one event the handover confirms is
-- real (Ericsson — planning already underway). Idempotent by title.

INSERT INTO public.info_sections (title, body, sort_order)
SELECT v.title, v.body, v.sort_order
FROM (
  VALUES
    ('Partnership terms & pricing (HT25)', $md$
## Standard pricing
- **Lunch lecture** — 5 000 SEK + food (ca 80 SEK/participant)
- **Evening event** (workshop, lecture, smaller hackathon) — 7 000 SEK + food (ca 80 SEK/participant)
- **Weekend event** (or longer) — 10 000 SEK + food (ca 80 SEK/participant)

## Standard terms (included in every partnership)
- The agreed price for the event type
- UUAIS may use the partner's logo and name for marketing purposes
- There may be co-collaborators or sponsors also involved in the event

Set during HT25 — may be adjusted as the society grows. If pricing changes, update it here **and** in Contracts → Edit templates (the generator reads from the database).
$md$, 0),

    ('Event checklist — standard procedure', $md$
## ~4 weeks before
- Book with the partner: agree on date, time, duration, activity, venue, food, payment and participant count from the partner org

## 3 weeks before
- Create marketing material
- Internal confirmation via the "social-media-posts" channel (Slack/Mattermost)
- Partner confirmation if needed

## 2 weeks before
- Create the event on the website + Luma
- Post on LinkedIn, Instagram and Orbi

## 1 week before
- Close applications, extract the list, divide into teams if applicable

## Within 1 day of closing applications
- Send accept/reject emails

## A few days before
- Buy flowers/gifts for partners
- Assign day-of roles (logistics, photography)
- Order food and prizes

## Day of the event
- Bring roll-up, flowers, camera, food, prizes

## Within 3 days after
- Create the photo album, prep social-media thank-you content

## Within 5 days after
- Post on social media, send thank-you emails to participants and partner
- Ask to use the partner's logo, get payment info
$md$, 1),

    ('Hackathon playbook', $md$
## 1. Plan the basics
- Date at least 3 weeks out, ~3-hour duration, 30–100 participants
- Decide theme, venue and team size; prepare branded visuals and prize categories

## 2. Promote
- Registration via Lu.ma/Partiful, push through marketing channels, manage registrations

## 3. Plan the details
- Agenda template, Google Form + Sheet for submissions, judging criteria
- Confirm judges, brief participants

## 4. Run the event
- Test A/V on-site, welcome participants, MC role, judge prep, capture photos/video

## 5. Follow up
- Celebrate winners, encourage participants to showcase their work, gather feedback

For virtual/hybrid variants: livestream, provide virtual support, use async submissions for 100+ participants. The anti-discrimination and anti-harassment policy applies at every event.
$md$, 2),

    ('Why partner with UUAIS (pitch points)', $md$
- Access to a **targeted network of AI-native students** across Data Science, ML, image analysis, engineering physics and industrial engineering
- The best way to reach top engineering students in Uppsala
- UUAIS provides "boots on the ground" to help operate events
- Why pay if the company also covers food/venue? Because UUAIS is the **access point to the student network** and needs to sustain its own operations
$md$, 3),

    ('Lessons learned — prior team', $md$
## Pipeline & pace
- Keep a live pipeline reviewed weekly; be explicit with partners about who owns what (price, food, registrations)
- Aim for 1 event every 3 weeks; 1–2 bigger events per semester with smaller ones in between
- Each team member should hold ~2 active company contacts — not all will convert
- Don't be afraid to push companies to commit
- Start the semester with an event already scheduled (end of September / end of January) to build momentum

## Outreach
- Cold LinkedIn outreach works; contact multiple people per company
- Contracts ahead of events are ideal but not always practical
- Network at Stockholm events (KTHAIS, Founders House, Antler)
- Always time pitches during hackathons/workshops

## Running events
- Test A/V on-site in advance
- Use Luma for sign-up, emailing, spot allocation and check-in
- Be transparent about how event spots are allocated
- Schedule events at least 15 min after lectures end; always include end times
- Buy flowers for partner companies — consistently well received
$md$, 4)
) AS v(title, body, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.info_sections s WHERE s.title = v.title);

-- The only concrete upcoming event in the handover: Ericsson, planning underway.
INSERT INTO public.events (title, company_id, event_type, status, notes)
SELECT
  'Ericsson — next event (planning)',
  (SELECT id FROM public.companies WHERE name = 'Ericsson'),
  'Other'::public.event_type,
  'Planned'::public.event_status,
  'Planning already underway with Ida Ellingsson per the prior team''s handover. Date, event type, venue and terms TBD.'
WHERE NOT EXISTS (SELECT 1 FROM public.events e WHERE e.title = 'Ericsson — next event (planning)');
