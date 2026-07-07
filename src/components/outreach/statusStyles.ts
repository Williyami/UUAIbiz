export const STATUS_ORDER = [
  "Contacted",
  "Discussing",
  "Negotiating",
  "Booked",
  "Declined",
  "On hold",
] as const;
export type CompanyStatus = (typeof STATUS_ORDER)[number];

export const companyStatusColor: Record<CompanyStatus, string> = {
  Contacted: "var(--status-neutral)",
  Discussing: "var(--status-info)",
  Negotiating: "var(--status-warning)",
  Booked: "var(--status-success)",
  Declined: "var(--status-danger)",
  "On hold": "var(--status-neutral)",
};
