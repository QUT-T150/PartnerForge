import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refreshAccessToken } from "@/lib/auth-cookies";
import { CSRF_ERROR, isCrossSiteRequest } from "@/lib/csrf";

/**
 * Renews the session from the refresh cookie. The client never sees either token —
 * both stay httpOnly — so this returns only whether the renewal worked.
 */
export async function POST(req: NextRequest) {
  // The refresh token is single-use, so a cross-site call could burn it (#38).
  if (isCrossSiteRequest(req)) {
    return NextResponse.json({ error: CSRF_ERROR }, { status: 403 });
  }
  const cookieStore = await cookies();
  const token = await refreshAccessToken(cookieStore);

  if (!token) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
