import { describe, expect, it } from "vitest";
import { loginPath, parseLoginReason, safeNextPath } from "./auth-redirect";

describe("safeNextPath", () => {
  it("keeps same-origin paths with their query string", () => {
    expect(safeNextPath("/platform?view=projects")).toBe("/platform?view=projects");
    expect(safeNextPath("/audit-log")).toBe("/audit-log");
  });

  it("falls back to the dashboard for missing or unsafe values", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath("dashboard")).toBe("/dashboard");
  });

  it("never sends users back to the login page", () => {
    expect(safeNextPath("/login")).toBe("/dashboard");
    expect(safeNextPath("/login?reason=expired")).toBe("/dashboard");
  });
});

describe("parseLoginReason", () => {
  it("accepts known reasons only", () => {
    expect(parseLoginReason("expired")).toBe("expired");
    expect(parseLoginReason("signed-out")).toBe("signed-out");
    expect(parseLoginReason("toString")).toBeNull();
    expect(parseLoginReason("anything")).toBeNull();
    expect(parseLoginReason(null)).toBeNull();
  });
});

describe("loginPath", () => {
  it("returns plain /login with no options", () => {
    expect(loginPath()).toBe("/login");
  });

  it("encodes the reason and return path", () => {
    expect(loginPath({ reason: "expired", next: "/platform?view=events" })).toBe(
      "/login?reason=expired&next=%2Fplatform%3Fview%3Devents",
    );
  });

  it("drops an unsafe return path", () => {
    expect(loginPath({ reason: "expired", next: "//evil.example" })).toBe("/login?reason=expired");
  });
});
