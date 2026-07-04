export const STATUS_ORDER = ["Contacted", "Negotiating", "Booked", "Completed", "Declined", "On hold"] as const;
export type CompanyStatus = typeof STATUS_ORDER[number];

export const statusStyles: Record<CompanyStatus, string> = {
  "Contacted": "bg-slate-100 text-slate-700 border-slate-200",
  "Negotiating": "bg-amber-50 text-amber-800 border-amber-200",
  "Booked": "bg-blue-50 text-blue-800 border-blue-200",
  "Completed": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Declined": "bg-rose-50 text-rose-800 border-rose-200",
  "On hold": "bg-neutral-100 text-neutral-700 border-neutral-200",
};