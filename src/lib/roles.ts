export type AppRole = "admin" | "board" | "member" | "other" | "viewer";

// Highest first: picks the effective role when a user somehow has several, and
// orders the role pickers.
export const ROLE_ORDER: AppRole[] = ["admin", "board", "member", "other", "viewer"];

// Board has the same perms as admin (mirrored by has_role in the database).
export function isAdminRole(role: AppRole | string | null | undefined): boolean {
  return role === "admin" || role === "board";
}

export function roleLabel(role: AppRole | string | null | undefined): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "board":
      return "Board";
    case "other":
      return "Others";
    case "viewer":
      return "Viewer";
    default:
      return "Business team";
  }
}
