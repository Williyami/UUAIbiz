export const TASK_STATUS_ORDER = ["To do", "In progress", "Done"] as const;
export type TaskStatus = (typeof TASK_STATUS_ORDER)[number];

export const TASK_PRIORITY_ORDER = ["Low", "Medium", "High"] as const;
export type TaskPriority = (typeof TASK_PRIORITY_ORDER)[number];

export const taskStatusColor: Record<TaskStatus, string> = {
  "To do": "var(--status-neutral)",
  "In progress": "var(--status-warning)",
  Done: "var(--status-success)",
};

export const priorityColor: Record<TaskPriority, string> = {
  Low: "var(--status-neutral)",
  Medium: "var(--status-warning)",
  High: "var(--status-danger)",
};
