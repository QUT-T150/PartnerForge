import { describe, it, expect } from "vitest";
import { JOURNEY_STEPS, IMPORT_EXPORT_HREF, canUseImportExport } from "./navigation";
import { PERMISSIONS, type Role } from "./permissions";

const ROLES = Object.keys(PERMISSIONS) as Role[];

describe("dashboard journey (#63)", () => {
  it("runs Industry Partners -> Projects -> Events, in that order", () => {
    expect(JOURNEY_STEPS.map((s) => s.key)).toEqual(["partners", "projects", "events"]);
  });

  it("sends every step straight to its list view in one click", () => {
    for (const step of JOURNEY_STEPS) {
      expect(step.href).toBe(`/platform?view=${step.key}`);
    }
  });

  it("only includes steps every role can at least read", () => {
    for (const role of ROLES) {
      for (const step of JOURNEY_STEPS) {
        expect(PERMISSIONS[role][step.key]).not.toBe("no");
      }
    }
  });

  it("no longer links to Project Applications (#62)", () => {
    expect(JOURNEY_STEPS.some((s) => s.href.includes("applications"))).toBe(false);
  });
});

describe("Import/Export access (#62)", () => {
  it("is available to admin only", () => {
    expect(ROLES.filter(canUseImportExport)).toEqual(["admin"]);
  });

  it("is a separate route, not a dashboard anchor", () => {
    expect(IMPORT_EXPORT_HREF).toBe("/import-export");
  });
});
