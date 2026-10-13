import { afterEach, describe, expect, it } from "vitest";
import { isCrossSiteRequest } from "./csrf";

function req(method: string, headers: Record<string, string> = {}) {
  return { method, headers: new Headers(headers) };
}

describe("isCrossSiteRequest", () => {
  afterEach(() => {
    delete process.env.CSRF_TRUSTED_ORIGINS;
  });

  describe("safe methods are never blocked", () => {
    it.each(["GET", "HEAD", "OPTIONS", "get"])("%s", (method) => {
      expect(
        isCrossSiteRequest(req(method, { "sec-fetch-site": "cross-site" })),
      ).toBe(false);
    });
  });

  describe("Sec-Fetch-Site", () => {
    it("allows same-origin POST", () => {
      expect(isCrossSiteRequest(req("POST", { "sec-fetch-site": "same-origin" }))).toBe(false);
    });

    it("allows user-initiated navigation (none)", () => {
      expect(isCrossSiteRequest(req("POST", { "sec-fetch-site": "none" }))).toBe(false);
    });

    it.each(["cross-site", "same-site"])("blocks %s POST", (site) => {
      expect(isCrossSiteRequest(req("POST", { "sec-fetch-site": site }))).toBe(true);
    });

    it.each(["PUT", "PATCH", "DELETE"])("blocks cross-site %s", (method) => {
      expect(isCrossSiteRequest(req(method, { "sec-fetch-site": "cross-site" }))).toBe(true);
    });

    it("takes priority over a matching Origin", () => {
      expect(
        isCrossSiteRequest(
          req("POST", {
            "sec-fetch-site": "cross-site",
            origin: "http://localhost:3000",
            host: "localhost:3000",
          }),
        ),
      ).toBe(true);
    });
  });

  describe("Origin fallback (no Sec-Fetch-Site)", () => {
    it("allows an Origin matching Host", () => {
      expect(
        isCrossSiteRequest(req("POST", { origin: "http://localhost:3000", host: "localhost:3000" })),
      ).toBe(false);
    });

    it("blocks a different Origin", () => {
      expect(
        isCrossSiteRequest(req("POST", { origin: "https://evil.example", host: "localhost:3000" })),
      ).toBe(true);
    });

    it("blocks a different port on the same hostname", () => {
      expect(
        isCrossSiteRequest(req("POST", { origin: "http://localhost:4000", host: "localhost:3000" })),
      ).toBe(true);
    });

    it("uses X-Forwarded-Host when behind a proxy", () => {
      expect(
        isCrossSiteRequest(
          req("POST", {
            origin: "https://partnerforge.qut.edu.au",
            host: "frontend:3000",
            "x-forwarded-host": "partnerforge.qut.edu.au",
          }),
        ),
      ).toBe(false);
    });

    it('blocks Origin "null"', () => {
      expect(isCrossSiteRequest(req("POST", { origin: "null", host: "localhost:3000" }))).toBe(true);
    });

    it("blocks a malformed Origin", () => {
      expect(isCrossSiteRequest(req("POST", { origin: "not a url", host: "localhost:3000" }))).toBe(true);
    });

    it("allows an origin listed in CSRF_TRUSTED_ORIGINS", () => {
      process.env.CSRF_TRUSTED_ORIGINS = "https://staging.example, https://other.example/";
      expect(
        isCrossSiteRequest(req("POST", { origin: "https://other.example", host: "localhost:3000" })),
      ).toBe(false);
    });
  });

  it("allows non-browser callers that send neither header", () => {
    expect(isCrossSiteRequest(req("POST", { host: "localhost:3000" }))).toBe(false);
  });
});
