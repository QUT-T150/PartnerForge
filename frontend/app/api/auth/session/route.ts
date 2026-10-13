import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, refreshAccessToken } from "@/lib/auth-cookies";

const COOKIE_NAME = ACCESS_COOKIE;

interface JwtPayload {
  [key: string]: unknown;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  const exp = payload.exp as number | undefined;
  return exp !== undefined && exp * 1000 < Date.now();
}

export async function GET() {
  const cookieStore = await cookies();
  let token = cookieStore.get(COOKIE_NAME)?.value;

  // No access token, or an expired one, is recoverable while the refresh cookie
  // is still good — that is the whole point of #39. Only a failed renewal is a
  // real 401, and the client turns that into a redirect to /login.
  if (!token || isExpired(token)) {
    token = (await refreshAccessToken(cookieStore)) ?? undefined;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const role =
    (payload[
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ] as string) ||
    (payload.role as string) ||
    "industry_partner";

  const email =
    (payload[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    ] as string) ||
    (payload.email as string) ||
    (payload[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    ] as string) ||
    "";

  const fullName =
    (payload.full_name as string) ||
    (payload[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
    ] as string) ||
    (payload.fullName as string) ||
    (payload.name as string) ||
    "User";

  return NextResponse.json({
    fullName,
    email,
    role: role.toLowerCase(),
    facultyId: (payload.faculty_id as string) || (payload.facultyId as string) || null,
    organisationId:
      (payload.organisation_id as string) ||
      (payload.organisationId as string) ||
      null,
  });
}
