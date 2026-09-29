export type Role = "admin" | "course_organiser" | "industry_partner" | "industry_team" | "industry_team_manager";
export type EntityType = "partner" | "project" | "application" | "event" | "user";
export type PermLevel = "rw" | "r" | "no";

export const PERMISSIONS: Record<Role, Record<string, PermLevel>> = {
  admin: { partners: "rw", projects: "rw", events: "rw", applications: "rw", analytics: "r", users: "rw", audit: "r" },
  course_organiser: { partners: "rw", projects: "rw", events: "rw", applications: "r", analytics: "r", users: "no", audit: "no" },
  industry_partner: { partners: "r", projects: "r", events: "r", applications: "rw", analytics: "no", users: "no", audit: "no" },
  industry_team: { partners: "r", projects: "r", events: "r", applications: "rw", analytics: "no", users: "no", audit: "no" },
  industry_team_manager: { partners: "r", projects: "r", events: "r", applications: "rw", analytics: "r", users: "r", audit: "no" },
};

export const PERM_LABEL: Record<PermLevel, { text: string; cls: string }> = {
  rw: { text: "Read / Write", cls: "perm-rw" },
  r: { text: "Read only", cls: "perm-r" },
  no: { text: "No access", cls: "perm-no" },
};

export function canCreate(role: Role, type: EntityType): boolean {
  if (type === "partner" || type === "project") return role === "admin" || role === "course_organiser";
  if (type === "application") return ["admin", "course_organiser", "industry_partner", "industry_team", "industry_team_manager"].includes(role);
  if (type === "event") return role === "admin" || role === "course_organiser";
  if (type === "user") return role === "admin";
  return false;
}

export function canEdit(role: Role, type: EntityType): boolean {
  return canCreate(role, type);
}

export function canDelete(role: Role, type: EntityType): boolean {
  if (type === "partner" || type === "project") return role === "admin";
  if (type === "application") return role === "admin" || role === "course_organiser"|| role === "industry_team_manager";
  if (type === "event" || type === "user") return role === "admin";
  return false;
}

export function prettyRole(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getPermissions(role: Role) {
  return PERMISSIONS[role] || PERMISSIONS.industry_partner;
}
