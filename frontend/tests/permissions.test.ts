import { describe, it, expect } from "vitest";
import { canCreate, canEdit, canDelete, prettyRole, getPermissions } from "../lib/permissions";

describe("RBAC Permissions (5-Role Model + Upload)", () => {
  describe("canCreate", () => {
    it("allows admin to create all entity types including upload", () => {
      expect(canCreate("admin", "partner")).toBe(true);
      expect(canCreate("admin", "project")).toBe(true);
      expect(canCreate("admin", "application")).toBe(true);
      expect(canCreate("admin", "event")).toBe(true);
      expect(canCreate("admin", "user")).toBe(true);
      expect(canCreate("admin", "upload")).toBe(true);
    });

    it("allows course organiser to create partners, projects, applications, and events but not users or uploads", () => {
      expect(canCreate("course_organiser", "partner")).toBe(true);
      expect(canCreate("course_organiser", "project")).toBe(true);
      expect(canCreate("course_organiser", "application")).toBe(true);
      expect(canCreate("course_organiser", "event")).toBe(true);
      expect(canCreate("course_organiser", "user")).toBe(false);
      expect(canCreate("course_organiser", "upload")).toBe(false);
    });

    it("restricts industry partner, industry team, and industry team manager", () => {
      expect(canCreate("industry_partner", "partner")).toBe(false);
      expect(canCreate("industry_partner", "project")).toBe(false);
      expect(canCreate("industry_partner", "application")).toBe(true);
      expect(canCreate("industry_partner", "event")).toBe(false);
      expect(canCreate("industry_partner", "user")).toBe(false);

      expect(canCreate("industry_team", "application")).toBe(true);
      expect(canCreate("industry_team_manager", "application")).toBe(true);
    });
  });

  describe("canDelete", () => {
    it("allows only admin to delete partners, projects, events, users, and uploads", () => {
      expect(canDelete("admin", "partner")).toBe(true);
      expect(canDelete("course_organiser", "partner")).toBe(false);
      expect(canDelete("industry_partner", "partner")).toBe(false);

      expect(canDelete("admin", "user")).toBe(true);
      expect(canDelete("course_organiser", "user")).toBe(false);
      expect(canDelete("admin", "upload")).toBe(true);
    });

    it("allows admin, course organiser, and industry team manager to delete applications", () => {
      expect(canDelete("admin", "application")).toBe(true);
      expect(canDelete("course_organiser", "application")).toBe(true);
      expect(canDelete("industry_team_manager", "application")).toBe(true);
      expect(canDelete("industry_partner", "application")).toBe(false);
      expect(canDelete("industry_team", "application")).toBe(false);
    });
  });

  describe("prettyRole", () => {
    it("formats snake_case role strings into title case", () => {
      expect(prettyRole("admin")).toBe("Admin");
      expect(prettyRole("course_organiser")).toBe("Course Organiser");
      expect(prettyRole("industry_partner")).toBe("Industry Partner");
      expect(prettyRole("industry_team")).toBe("Industry Team");
      expect(prettyRole("industry_team_manager")).toBe("Industry Team Manager");
    });
  });

  describe("getPermissions", () => {
    it("returns correct permission matrix for all 5 roles", () => {
      const adminPerms = getPermissions("admin");
      expect(adminPerms.users).toBe("rw");
      expect(adminPerms.partners).toBe("rw");
      expect(adminPerms.upload).toBe("rw");

      const partnerPerms = getPermissions("industry_partner");
      expect(partnerPerms.users).toBe("no");
      expect(partnerPerms.partners).toBe("r");
      expect(partnerPerms.applications).toBe("rw");
      expect(partnerPerms.upload).toBe("no");

      const teamManagerPerms = getPermissions("industry_team_manager");
      expect(teamManagerPerms.users).toBe("r");
      expect(teamManagerPerms.analytics).toBe("r");
    });
  });
});
