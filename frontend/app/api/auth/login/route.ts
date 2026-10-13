import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setAuthCookies, type AuthPayload } from "@/lib/auth-cookies";
import { CSRF_ERROR, isCrossSiteRequest } from "@/lib/csrf";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function POST(req: NextRequest) {
  // Stops another site logging the user in to an account of its choosing (#38).
  if (isCrossSiteRequest(req)) {
    return NextResponse.json({ error: CSRF_ERROR }, { status: 403 });
  }
  try {
    const { email, password } = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/api/Auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Email: email, Password: password }),
    });

    if (!backendRes.ok) {
      const status = backendRes.status;
      const message =
        status === 401
          ? "Invalid email or password."
          : `Login failed (HTTP ${status}).`;
      return NextResponse.json({ error: message }, { status });
    }

    const data: AuthPayload = await backendRes.json();

    const cookieStore = await cookies();
    setAuthCookies(cookieStore, data);

    return NextResponse.json({
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      facultyId: data.facultyId || null,
      organisationId: data.organisationId || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the authentication server." },
      { status: 502 },
    );
  }
}
