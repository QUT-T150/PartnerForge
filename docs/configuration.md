# Configuration and health checks

Every setting the stack reads, where it is set, and what the defaults are. ASP.NET Core
maps `Section:Key` in `appsettings.json` to the `Section__Key` environment variable, so
any API setting below can be overridden from `docker-compose.yml` or the shell.

## API (`api/.../appsettings.json`, overridden in `docker-compose.yml`)

| Setting (env var) | Local dev (`dotnet run`) | Docker compose | Notes |
|---|---|---|---|
| `ConnectionStrings__Default` | `Server=localhost;Port=3306;…` from appsettings | `Server=db;…` with `${DB_PASSWORD}` | Points at the `db` service inside compose. |
| `Database__MySqlVersion` | `8.4.0` | `8.4.0` | Must match the MySQL image (`mysql:8.4`). |
| `Jwt__Issuer` / `Jwt__Audience` | appsettings | set in compose | Must match what the frontend expects; don't change independently. |
| `Jwt__ExpiryInMinutes` | `60` | `60` | Access-token lifetime. |
| `Jwt__PrivateKeyPem` / `Jwt__PublicKeyPem` | dev key pair in appsettings | dev key pair in appsettings | **Replace for any real deployment.** Pass via env or Docker secrets, never commit. |
| `RateLimiting__Auth__PermitLimit` | `10` | `10` | Login attempts per IP per window. |
| `RateLimiting__Auth__WindowSeconds` | `60` | `60` | |
| `ASPNETCORE_ENVIRONMENT` | `Development` | `Development` | `Development` enables Swagger at `/swagger`. |
| `ASPNETCORE_URLS` | `http://localhost:5133` (launch profile) | `http://+:8080` | The frontend defaults to port 8080, so set `BACKEND_URL` if you run the API with `dotnet run`. |

## Database (`db` service)

| Env var | Default | Notes |
|---|---|---|
| `DB_PASSWORD` | `changeme_local_only` | Read by both `db` and `api`. Set it in a `.env` file next to `docker-compose.yml`. |
| `DB_ROOT_PASSWORD` | `changeme_local_only_root` | MySQL root; only Adminer or manual admin use. |

`schema.sql` and `seed_demo.sql` are loaded only when the `qpf-dbdata` volume is empty.
Run `docker compose down -v` to reset it.

## Frontend (`frontend` service)

| Env var | Local dev (`pnpm dev`) | Docker compose | Notes |
|---|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` (default) | `http://api:8080` | Where the BFF proxy (`app/api/proxy`) forwards API calls. |
| `NODE_ENV` | `development` | `production` | `production` marks auth cookies `secure`. |

## Health checks

| Service | Check | Healthy when |
|---|---|---|
| `db` | `mysqladmin ping` | MySQL accepts connections |
| `api` | `curl http://127.0.0.1:8080/health` | API is up **and** can reach MySQL (`200 Healthy`; `503 Unhealthy` otherwise) |
| `frontend` | `wget http://127.0.0.1:3000/login` | Next.js server is serving pages |

Startup order is enforced with `depends_on: condition: service_healthy`:
`db` → `api` → `frontend`. Check the state with `docker compose ps` (the STATUS column
shows `(healthy)`), or call `GET /health` directly. It needs no authentication.
