import { getPermissions, type Role } from "./permissions";

export interface JourneyStep {
  key: "partners" | "projects" | "events";
  title: string;
  action: string;
  href: string;
}

/**
 * The dashboard's only content: the Partners -> Projects -> Events path the stakeholder
 * walks through (#63). Every other tool lives in the header nav, gated by role, so the
 * dashboard doesn't repeat it. All roles have at least read access to these three.
 */
export const JOURNEY_STEPS: JourneyStep[] = [
  { key: "partners", title: "Industry Partners", action: "Browse partners", href: "/platform?view=partners" },
  { key: "projects", title: "Projects", action: "Browse projects", href: "/platform?view=projects" },
  { key: "events", title: "Events", action: "Browse events", href: "/platform?view=events" },
];

export const IMPORT_EXPORT_HREF = "/import-export";

/** Import/Export has its own permission level (`upload`), independent of `applications` (#62). */
export function canUseImportExport(role: Role): boolean {
  return getPermissions(role).upload !== "no";
}
