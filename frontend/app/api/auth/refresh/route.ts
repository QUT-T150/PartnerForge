import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refreshAccessToken } from "@/lib/auth-cookies";

/**
 * Renews the session from the refresh cookie. The client never sees either token —
 * both stay httpOnly — so this returns only whether the renewal worked.
 */
export async function POST() {
  const cookieStore = await cookies();
  const token = await refreshAccessToken(cookieStore);

  if (!token) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
