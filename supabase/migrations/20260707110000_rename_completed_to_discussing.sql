-- Outreach pipeline rework: "Completed" becomes "Discussing", a stage between
-- Contacted and Negotiating (stage order lives in the frontend). Existing
-- Completed companies carry over into Discussing.
ALTER TYPE public.company_status RENAME VALUE 'Completed' TO 'Discussing';
