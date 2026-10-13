/**
 * CSRF protection for the BFF route handlers (#38).
 *
 * The session lives in httpOnly cookies, so the browser attaches them to any request
 * aimed at this app — including one a different site triggers. The cookies are
 * SameSite=Lax, which already stops cross-site POST/PUT/PATCH/DELETE in modern
 * browsers; this check is the second layer and does not depend on cookie settings.
 *
 * Rule: a state-changing request is accepted only if the browser says it came from
 * this origin. Safe methods (GET/HEAD/OPTIONS) are never blocked, so normal page
 * loads and data reads are unaffected. See docs/security-csrf.md.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const CSRF_ERROR = "Cross-site request blocked.";

interface RequestLike {
  method: string;
  headers: Headers;
}

/** Origins allowed besides the app's own, from CSRF_TRUSTED_ORIGINS (comma-separated). */
function trustedOrigins(): string[] {
  return (process.env.CSRF_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/**
 * The host the browser used to reach the app. Behind Docker or a reverse proxy the
 * request URL can be an internal address, so prefer the forwarded host header.
 */
function requestHost(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-host");
  if (forwarded) return forwarded.split(",")[0].trim().toLowerCase();
  return headers.get("host")?.toLowerCase() ?? null;
}

/**
 * Returns true when a state-changing request should be rejected as cross-site.
 *
 * 1. Sec-Fetch-Site (sent by all current browsers): only "same-origin" or "none"
 *    (typed URL / bookmark) are accepted. "same-site" is rejected too, because a
 *    sibling subdomain is not this app.
 * 2. Older browsers without Sec-Fetch-Site: compare the Origin header's host with the
 *    request's host, or with CSRF_TRUSTED_ORIGINS.
 * 3. Neither header: not a browser form or fetch (e.g. curl, a server-side caller),
 *    which cannot ride on a user's cookies, so it is allowed.
 */
export function isCrossSiteRequest(req: RequestLike): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return false;

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite) {
    return fetchSite !== "same-origin" && fetchSite !== "none";
  }

  const origin = req.headers.get("origin");
  if (!origin) return false;
  // Sandboxed iframes and some redirects send the literal string "null".
  if (origin === "null") return true;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return true;
  }

  if (trustedOrigins().includes(originUrl.origin)) return false;

  const host = requestHost(req.headers);
  return !host || originUrl.host.toLowerCase() !== host;
}
