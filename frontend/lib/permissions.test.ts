import { describe, it, expect } from "vitest";
import {
  canCreate,
  canEdit,
  canDelete,
  prettyRole,
  getPermissions,
  PERMISSIONS,
} from "./permissions";

describe("Permissions and RBAC Matrix Unit Tests", () => {
  describe("canCreate()", () => {
    it("allows admin to create all entities", () => {
      expect(canCreate("admin", "partner")).toBe(true);
      expect(canCreate("admin", "project")).toBe(true);
      expect(canCreate("admin", "event")).toBe(true);
      expect(canCreate("admin", "application")).toBe(true);
      expect(canCreate("admin", "user")).toBe(true);
    });

    it("allows course_organiser to create partners, projects, events, and applications, but not users", () => {
      expect(canCreate("course_organiser", "partner")).toBe(true);
      expect(canCreate("course_organiser", "project")).toBe(true);
      expect(canCreate("course_organiser", "event")).toBe(true);
      expect(canCreate("course_organiser", "application")).toBe(true);
      expect(canCreate("course_organiser", "user")).toBe(false);
    });

    it("allows industry_partner to only create applications", () => {
      expect(canCreate("industry_partner", "application")).toBe(true);
      expect(canCreate("industry_partner", "partner")).toBe(false);
      expect(canCreate("industry_partner", "project")).toBe(false);
      expect(canCreate("industry_partner", "event")).toBe(false);
      expect(canCreate("industry_partner", "user")).toBe(false);
    });
  });

  describe("canDelete()", () => {
    it("restricts deleting partners, projects, events, users to admin", () => {
      expect(canDelete("admin", "partner")).toBe(true);
      expect(canDelete("admin", "project")).toBe(true);
      expect(canDelete("admin", "event")).toBe(true);
      expect(canDelete("admin", "user")).toBe(true);

      expect(canDelete("course_organiser", "partner")).toBe(false);
      expect(canDelete("course_organiser", "project")).toBe(false);
      expect(canDelete("industry_partner", "partner")).toBe(false);
    });

    it("allows course_organiser and admin to delete applications", () => {
      expect(canDelete("admin", "application")).toBe(true);
      expect(canDelete("course_organiser", "application")).toBe(true);
      expect(canDelete("industry_partner", "application")).toBe(false);
    });
  });

  describe("prettyRole()", () => {
    it("formats snake_case role identifiers into human-readable capitalized strings", () => {
      expect(prettyRole("admin")).toBe("Admin");
      expect(prettyRole("course_organiser")).toBe("Course Organiser");
      expect(prettyRole("industry_partner")).toBe("Industry Partner");
    });
  });

  describe("getPermissions()", () => {
    it("returns correct permission mappings for given roles", () => {
      expect(getPermissions("admin")).toEqual(PERMISSIONS.admin);
      expect(getPermissions("course_organiser")).toEqual(PERMISSIONS.course_organiser);
      expect(getPermissions("industry_partner")).toEqual(PERMISSIONS.industry_partner);
    });
  });
});
