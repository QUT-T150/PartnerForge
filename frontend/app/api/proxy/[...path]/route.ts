import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  refreshAccessToken,
} from "@/lib/auth-cookies";
import { CSRF_ERROR, isCrossSiteRequest } from "@/lib/csrf";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

async function proxyRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  // Reject state-changing requests from other sites before touching cookies (#38).
  if (isCrossSiteRequest(req)) {
    return NextResponse.json({ error: CSRF_ERROR }, { status: 403 });
  }

  const { path } = await params;
  const cookieStore = await cookies();

  // The access cookie expires with the token it carries, so a missing one is the
  // normal state of an idle session rather than an error — try to renew first.
  let token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) {
    token = (await refreshAccessToken(cookieStore)) ?? undefined;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
  }

  const backendPath = `/api/${path.join("/")}`;
  const url = new URL(backendPath, BACKEND_URL);
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const contentType = req.headers.get("content-type");
  let body: string | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    // Read once: the request stream cannot be consumed twice, and a retry needs it.
    body = await req.text();
  }

  const send = (bearer: string) =>
    fetch(url.toString(), {
      method: req.method,
      headers: {
        Authorization: `Bearer ${bearer}`,
        ...(contentType && body !== null ? { "Content-Type": contentType } : {}),
      },
      body,
    });

  try {
    let backendRes = await send(token);

    // A 401 here means the token lapsed between the cookie check and the call, or
    // was rejected for another reason. Try exactly one renewal, then give up —
    // retrying a second time would loop against a genuinely invalid session.
    if (backendRes.status === 401) {
      const renewed = await refreshAccessToken(cookieStore);

      if (!renewed) {
        clearAuthCookies(cookieStore);
        return NextResponse.json({ error: "Session expired" }, { status: 401 });
      }

      backendRes = await send(renewed);

      if (backendRes.status === 401) {
        clearAuthCookies(cookieStore);
        return NextResponse.json({ error: "Session expired" }, { status: 401 });
      }
    }

    if (backendRes.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await backendRes.text();
    return new NextResponse(data, {
      status: backendRes.status,
      headers: {
        "Content-Type":
          backendRes.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the backend server." },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
