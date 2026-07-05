export const INDUSTRY_ORDER = [
  "VC",
  "Finance",
  "Quant finance",
  "Consulting",
  "Tech",
  "Legal",
  "Other",
] as const;
export type CompanyIndustry = (typeof INDUSTRY_ORDER)[number];
