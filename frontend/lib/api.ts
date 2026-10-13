import { loginPath } from "./auth-redirect";

export async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T | null> {
  const response = await fetch(`/api/proxy${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    const { pathname, search } = window.location;
    window.location.href = loginPath({ reason: "expired", next: pathname + search });
    return null;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json() as Promise<T>;
}
