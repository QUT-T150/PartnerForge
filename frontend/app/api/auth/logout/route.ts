import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies, REFRESH_COOKIE } from "@/lib/auth-cookies";
import { CSRF_ERROR, isCrossSiteRequest } from "@/lib/csrf";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function POST(req: NextRequest) {
  // Stops another site forcing the user out (#38).
  if (isCrossSiteRequest(req)) {
    return NextResponse.json({ error: CSRF_ERROR }, { status: 403 });
  }
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  // Revoke server-side so the token cannot renew a session after the cookie is gone.
  // A failure here must not block logout — the cookies are cleared either way.
  if (refreshToken) {
    try {
      await fetch(`${BACKEND_URL}/api/Auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ RefreshToken: refreshToken }),
      });
    } catch {
      // ignored on purpose
    }
  }

  clearAuthCookies(cookieStore);
  return NextResponse.json({ ok: true });
}
