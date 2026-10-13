export type LoginReason = "expired" | "signed-out";

export const LOGIN_REASON_MESSAGES: Record<LoginReason, string> = {
  expired: "Your session has expired. Please sign in again to continue.",
  "signed-out": "You have been signed out.",
};

const DEFAULT_NEXT = "/dashboard";

/**
 * Accepts only same-origin relative paths, so a crafted `?next=` link cannot
 * bounce users to another site after they sign in.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return DEFAULT_NEXT;
  }
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/login/")) {
    return DEFAULT_NEXT;
  }
  return next;
}

export function parseLoginReason(value: string | null | undefined): LoginReason | null {
  return value && Object.hasOwn(LOGIN_REASON_MESSAGES, value) ? (value as LoginReason) : null;
}

/** Builds `/login?reason=...&next=...`, omitting whichever parts are not set. */
export function loginPath(options: { reason?: LoginReason; next?: string } = {}): string {
  const params = new URLSearchParams();
  if (options.reason) params.set("reason", options.reason);
  if (options.next && safeNextPath(options.next) === options.next) {
    params.set("next", options.next);
  }
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
