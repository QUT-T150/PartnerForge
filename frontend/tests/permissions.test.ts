import { describe, it, expect } from "vitest";
import { canCreate, canEdit, canDelete, prettyRole, getPermissions } from "../lib/permissions";

describe("RBAC Permissions", () => {
  describe("canCreate", () => {
    it("allows admin to create all entity types", () => {
      expect(canCreate("admin", "partner")).toBe(true);
      expect(canCreate("admin", "project")).toBe(true);
      expect(canCreate("admin", "application")).toBe(true);
      expect(canCreate("admin", "event")).toBe(true);
      expect(canCreate("admin", "user")).toBe(true);
    });

    it("allows course organiser to create partners, projects, applications, and events but not users", () => {
      expect(canCreate("course_organiser", "partner")).toBe(true);
      expect(canCreate("course_organiser", "project")).toBe(true);
      expect(canCreate("course_organiser", "application")).toBe(true);
      expect(canCreate("course_organiser", "event")).toBe(true);
      expect(canCreate("course_organiser", "user")).toBe(false);
    });

    it("restricts industry partners to only creating applications", () => {
      expect(canCreate("industry_partner", "partner")).toBe(false);
      expect(canCreate("industry_partner", "project")).toBe(false);
      expect(canCreate("industry_partner", "application")).toBe(true);
      expect(canCreate("industry_partner", "event")).toBe(false);
      expect(canCreate("industry_partner", "user")).toBe(false);
    });
  });

  describe("canDelete", () => {
    it("allows only admin to delete partners, projects, events, and users", () => {
      expect(canDelete("admin", "partner")).toBe(true);
      expect(canDelete("course_organiser", "partner")).toBe(false);
      expect(canDelete("industry_partner", "partner")).toBe(false);

      expect(canDelete("admin", "user")).toBe(true);
      expect(canDelete("course_organiser", "user")).toBe(false);
    });

    it("allows admin and course organiser to delete applications", () => {
      expect(canDelete("admin", "application")).toBe(true);
      expect(canDelete("course_organiser", "application")).toBe(true);
      expect(canDelete("industry_partner", "application")).toBe(false);
    });
  });

  describe("prettyRole", () => {
    it("formats snake_case role strings into title case", () => {
      expect(prettyRole("admin")).toBe("Admin");
      expect(prettyRole("course_organiser")).toBe("Course Organiser");
      expect(prettyRole("industry_partner")).toBe("Industry Partner");
    });
  });

  describe("getPermissions", () => {
    it("returns correct permission matrix for known roles", () => {
      const adminPerms = getPermissions("admin");
      expect(adminPerms.users).toBe("rw");
      expect(adminPerms.partners).toBe("rw");

      const partnerPerms = getPermissions("industry_partner");
      expect(partnerPerms.users).toBe("no");
      expect(partnerPerms.partners).toBe("r");
      expect(partnerPerms.applications).toBe("rw");
    });
  });
});
