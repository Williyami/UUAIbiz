-- The source field ("cold LinkedIn", "Prior team handover", …) was never
-- useful — drop it from companies and the UI.
ALTER TABLE public.companies DROP COLUMN source;
