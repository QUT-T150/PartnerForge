import { cookies } from "next/headers";

export const ACCESS_COOKIE = "auth-token";
export const REFRESH_COOKIE = "refresh-token";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

// 14 days, matching Jwt:RefreshTokenExpiryInDays on the API.
const REFRESH_MAX_AGE = 60 * 60 * 24 * 14;

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function options(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export interface AuthPayload {
  token: string;
  refreshToken: string;
  expiresInSeconds: number;
  email: string;
  fullName: string;
  role: string;
  facultyId: number | null;
  organisationId: string | null;
}

/**
 * Writes both cookies from an API auth payload. The access cookie is given the
 * token's own lifetime, so once it lapses the browser drops it and only the
 * refresh cookie remains — which is the signal to renew.
 */
export function setAuthCookies(store: CookieStore, data: AuthPayload) {
  store.set(ACCESS_COOKIE, data.token, options(data.expiresInSeconds ?? 900));
  if (data.refreshToken) {
    store.set(REFRESH_COOKIE, data.refreshToken, options(REFRESH_MAX_AGE));
  }
}

/** Clears both cookies. Used on logout and whenever a refresh is refused. */
export function clearAuthCookies(store: CookieStore) {
  store.set(ACCESS_COOKIE, "", options(0));
  store.set(REFRESH_COOKIE, "", options(0));
}

/**
 * Exchanges the stored refresh token for a new access token, rotating both cookies.
 *
 * Returns the new access token, or null when there is nothing to refresh with or the
 * API refuses. A refusal clears both cookies: the refresh token is single-use, so a
 * rejected one is spent and keeping it only produces repeated failures.
 */
export async function refreshAccessToken(store: CookieStore): Promise<string | null> {
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/Auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ RefreshToken: refreshToken }),
    });

    if (!res.ok) {
      clearAuthCookies(store);
      return null;
    }

    const data: AuthPayload = await res.json();
    setAuthCookies(store, data);
    return data.token;
  } catch {
    // Backend unreachable is not the same as a rejected token — leave the cookies
    // alone so the session survives a transient outage.
    return null;
  }
}
