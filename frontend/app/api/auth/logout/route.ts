import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies, REFRESH_COOKIE } from "@/lib/auth-cookies";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function POST() {
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
