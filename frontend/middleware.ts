import { NextRequest, NextResponse } from "next/server";
import { loginPath } from "@/lib/auth-redirect";

const COOKIE_NAME = "auth-token";
const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

// Routes only some roles may open. The API still enforces access; this just
// stops other roles landing on a page that can only show them errors.
const ROLE_GATED_ROUTES: { prefix: string; roles: string[] }[] = [
  { prefix: "/audit-log", roles: ["admin"] },
  { prefix: "/analytics", roles: ["admin", "course_organiser", "industry_team_manager"] },
];

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodePayload(token);
  if (!payload) return true;
  const exp = payload.exp as number | undefined;
  return exp !== undefined && exp * 1000 < Date.now();
}

function roleOf(token: string): string {
  const payload = decodePayload(token);
  const role = (payload?.[ROLE_CLAIM] as string) || (payload?.role as string) || "";
  return role.toLowerCase();
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const { pathname, search } = req.nextUrl;

  if (!token || isTokenExpired(token)) {
    const loginUrl = new URL(
      loginPath({ reason: token ? "expired" : undefined, next: pathname + search }),
      req.url,
    );
    return NextResponse.redirect(loginUrl);
  }

  const gate = ROLE_GATED_ROUTES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (gate && !gate.roles.includes(roleOf(token))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/platform/:path*",
    "/analytics/:path*",
    "/audit-log/:path*",
  ],
};
