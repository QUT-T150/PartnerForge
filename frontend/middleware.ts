import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "auth-token";
const REFRESH_COOKIE_NAME = "refresh-token";

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    );
    if (payload.exp && payload.exp * 1000 < Date.now()) return true;
    return false;
  } catch {
    return true;
  }
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!token || isTokenExpired(token)) {
    // Middleware runs on the edge and cannot call the API, so it does not refresh
    // here. A usable refresh cookie means the session is very likely renewable, so
    // let the request through: /api/auth/session and the proxy both renew on demand
    // and will 401 for real if the refresh token turns out to be spent.
    if (refreshToken) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
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
