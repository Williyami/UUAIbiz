-- Refresh the pitch figures from the October 2026 Partnership Overview.
--
-- Movement since the September version: members 361 → 462, program data on
-- file 281 → 385, LinkedIn 1 100 → 1 135, Instagram 441 → 600. Event count is
-- unchanged at 12. Taking numbers into a partner conversation that are three
-- weeks stale undersells the society by a hundred members, so this matters
-- more than it looks.

UPDATE public.info_sections
SET body = $md$## The numbers (as of October 2026)
- **462 members**, 385 with a program on file
- **12 events** this year: 4 hackathons, 6 workshops, 1 guest lecture, 1 study visit
- **1 135 LinkedIn followers** (up from 287) and **600 on Instagram** (up from 150)
- Most represented programs: Data Science / ML (66), Engineering Physics (60), Computer Science (48), Industrial Engineering & Management (29), IT (29)

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
