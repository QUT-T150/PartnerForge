# Local Development & Runbook

This guide covers the local development environment, tooling, test suites, and troubleshooting procedures for PartnerForge.

---

## 1. Prerequisites

- **Docker Desktop**: Engine 24+ with Compose v2
- **.NET SDK**: Version 10.0 (or 9.0+)
- **Node.js**: Version 22 LTS or newer
- **pnpm**: Version 10+ (`npm install -g pnpm`)
- **Railway CLI**: Optional for cloud operations (`npm install -g @railway/cli`)

---

## 2. Running the Full Stack Locally

### Option A: Docker Compose (All-in-One)
```bash
docker compose up -d --build
```
Services:
- `qpf-db`: MySQL 8.4 Server (`localhost:3306`)
- `qpf-api`: ASP.NET Core API (`http://localhost:8080`)
- `qpf-frontend`: Next.js 16 Web App (`http://localhost:3000`)
- `qpf-adminer`: Web database manager (`http://localhost:8081`)

---

### Option B: Hybrid (Docker Database + Local Services)

#### Step 1: Start Database
```bash
docker compose up -d db
```

#### Step 2: Start Backend API
```bash
dotnet run --project api/Qut.PartnerForge.Api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.csproj
```
- API Base: `http://localhost:5133` (or configured port)
- Swagger / OpenAPI UI: `http://localhost:5133/swagger`
- Healthcheck: `http://localhost:5133/health`

#### Step 3: Start Frontend Web App
```bash
cd frontend
pnpm install
pnpm dev
```
- Web Application: `http://localhost:3000`
- Documentation Portal: `http://localhost:3000/docs`

> [!NOTE]
> When running the API with `dotnet run` (port 5133), set `BACKEND_URL=http://localhost:5133` in `frontend/.env.local`.

---

## 3. Running Automated Tests

### Backend Unit & Integration Tests (xUnit)
```bash
dotnet test api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.Tests/Qut.PartnerForge.Api.Tests.csproj
```
Runs 163 tests covering DTO validation, authentication, role-permission matrices, scoping, rate limiting, and health checks.

### Frontend Type Check & Tests (Vitest)
```bash
cd frontend

# Run Vitest test suites
pnpm test

# Run TypeScript type check
pnpm run type-check

# Verify Next.js production build
pnpm run build
```

---

## 4. Railway Cloud Deployment Runbook

1. **Link Project**:
   ```bash
   railway login
   railway link
   ```
2. **Database Initialization**:
   - Open a tunnel: `railway connect MySQL --tunnel-only -P 3307`
   - Execute `Schema/schema.sql` on `127.0.0.1:3307`.
   - Optionally seed demo data: execute `Schema/seed_demo.sql`.
3. **API Configuration**:
   - Set Root Directory: `api/Qut.PartnerForge.Api`
   - Set Dockerfile Path: `Qut.PartnerForge.Api/Dockerfile`
   - Set variables:
     - `ConnectionStrings__Default=Server=${{MySQL.MYSQLHOST}};Port=${{MySQL.MYSQLPORT}};Database=${{MySQL.MYSQLDATABASE}};User=${{MySQL.MYSQLUSER}};Password=${{MySQL.MYSQLPASSWORD}}`
     - `Jwt__PrivateKeyPem` & `Jwt__PublicKeyPem` (production 2048-bit RSA keys).
4. **Frontend Configuration**:
   - Set `PORT=3000`
   - Set `BACKEND_URL=https://<api-domain>.up.railway.app` (or private domain `http://api.railway.internal:8080`).

---

## 5. Troubleshooting Guide

### Port 3306 Conflict (Local MySQL running)
- **Symptom**: `docker compose up` fails with `port 3306 is already allocated`.
- **Solution**: Stop local MySQL service (`net stop MySQL` in Admin terminal) or edit the host port in `docker-compose.yml`.

### Outdated Database Schema
- **Symptom**: API throws `MySqlException: Table 'railway.refresh_tokens' doesn't exist`.
- **Solution**: Re-run `Schema/schema.sql` on the database.

### CORS Errors in Browser
- **Symptom**: `Access to fetch has been blocked by CORS policy`.
- **Solution**: Client components must use `/api/proxy/[...path]` rather than calling the backend URL directly from the browser. Direct calls from development hosts must be listed under `DevCors` in `Program.cs`.
