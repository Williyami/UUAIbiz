export const STATUS_ORDER = [
  "Contacted",
  "Negotiating",
  "Booked",
  "Completed",
  "Declined",
  "On hold",
] as const;
export type CompanyStatus = (typeof STATUS_ORDER)[number];

export const companyStatusColor: Record<CompanyStatus, string> = {
  Contacted: "var(--status-neutral)",
  Negotiating: "var(--status-warning)",
  Booked: "var(--status-info)",
  Completed: "var(--status-success)",
  Declined: "var(--status-danger)",
  "On hold": "var(--status-neutral)",
};
