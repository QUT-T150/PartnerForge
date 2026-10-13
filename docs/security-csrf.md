# CSRF protection

Decision record for #38.

## The risk

The session (access and refresh tokens) lives in `httpOnly` cookies set by the Next.js BFF.
The browser attaches those cookies to every request aimed at the app, including one that a
different website triggers (a hidden form, an `<img>`, a `fetch`). Without a check, a page on
another site could make a logged-in user's browser send `POST /api/proxy/...` or
`DELETE /api/proxy/...` and the proxy would forward it to the API with the user's token.

## Decision

Two layers, no anti-forgery token for now.

1. **`SameSite=Lax` cookies** (already in place, `lib/auth-cookies.ts`). Modern browsers do
   not send `Lax` cookies on cross-site POST/PUT/PATCH/DELETE, which blocks most CSRF on its own.
2. **Origin check in every BFF route that changes state** (`lib/csrf.ts`), applied to:
   - `app/api/proxy/[...path]` (all API writes)
   - `app/api/auth/login`, `logout`, `refresh`

   A request with method other than GET/HEAD/OPTIONS is rejected with
   **403 `{ "error": "Cross-site request blocked." }`** unless:
   - `Sec-Fetch-Site` is `same-origin` or `none`, or
   - (older browsers without `Sec-Fetch-Site`) the `Origin` host matches the request host
     (`X-Forwarded-Host` first, then `Host`), or is listed in `CSRF_TRUSTED_ORIGINS`.

   Requests with neither header are allowed: they are not browser forms or fetches, so they
   cannot carry a victim's cookies.

GET requests are never blocked, so page loads, links and data reads behave exactly as before.
GET endpoints must therefore stay free of side effects.

## Why not an anti-forgery token

A synchroniser or double-submit token would need the API and every client call to change,
for little extra protection once both layers above are in place. It is worth revisiting if
the app ever needs to accept writes from another origin, or must support browsers that send
neither `Sec-Fetch-Site` nor `Origin` on POST.

## Not covered here

- **Server actions** (`helper/upload.ts`, CSV import) are protected by Next.js itself, which
  compares `Origin` with `Host` for every server action. Extra hosts would go in
  `experimental.serverActions.allowedOrigins` in `next.config.ts`.
- **The .NET API** accepts only `Authorization: Bearer` tokens, which browsers never attach
  automatically, so it is not exposed to CSRF directly.

## Configuration

| Env var | Default | Use |
|---|---|---|
| `CSRF_TRUSTED_ORIGINS` | empty | Comma-separated extra origins allowed to send writes, e.g. `https://staging.example.edu.au`. Normally not needed, because the app's own host is always allowed. |

If the frontend runs behind a reverse proxy, make sure it forwards `X-Forwarded-Host` (or the
original `Host`); otherwise older browsers falling back to the `Origin` check will get 403s.

## Testing

- Unit tests: `frontend/lib/csrf.test.ts` (`npm test`).
- Manual check with curl, simulating a cross-site browser request:

  ```bash
  curl -i -X POST http://localhost:3000/api/proxy/organisations \
    -H "Content-Type: application/json" -H "Sec-Fetch-Site: cross-site" -d '{}'
  # → 403 {"error":"Cross-site request blocked."}
  ```
