CREATE TYPE public.company_industry AS ENUM (
  'VC',
  'Finance',
  'Quant finance',
  'Consulting',
  'Tech',
  'Legal',
  'Other'
);

ALTER TABLE public.companies ADD COLUMN industry public.company_industry;
