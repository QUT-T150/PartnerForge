# Local Development & Runbook

This guide covers the local development environment, tooling, test suites, and troubleshooting procedures for PartnerForge.

---

## 1. Prerequisites

- **Docker Desktop**: Engine 24+ with Compose v2
- **.NET SDK**: Version 10.0 (or 9.0+)
- **Node.js**: Version 22 LTS or newer
- **pnpm**: Version 10+ (`npm install -g pnpm`)

---

## 2. Running the Full Stack

### Step 1: Start Infrastructure
```bash
docker compose up -d
```
Services started:
- `qpf-db`: MySQL 8.4 Server (`localhost:3306`)
- `qpf-adminer`: Web database manager (`http://localhost:8080`)
  - Server: `db`
  - Username: `qpf`
  - Password: `qpf_dev_secret`
  - Database: `partnerforge`

### Step 2: Start Backend API
```bash
dotnet run --project api/Qut.PartnerForge.Api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.csproj
```
- API Endpoint: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/swagger`

### Step 3: Start Frontend Web App
```bash
cd frontend
pnpm install --no-frozen-lockfile
pnpm dev
```
- Web Application: `http://localhost:3000`
- Documentation Portal: `http://localhost:3000/docs`

---

## 3. Running Automated Tests

### Backend Unit & Integration Tests (xUnit)
```bash
dotnet test api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.Tests/Qut.PartnerForge.Api.Tests.csproj
```

### Frontend Type Check & Tests (Vitest)
```bash
cd frontend

# Run unit tests
pnpm test

# Run TypeScript typecheck
pnpm run type-check

# Verify Next.js production build
pnpm run build
```

---

## 4. Troubleshooting Guide

### Port 3306 Conflict (Local MySQL already running)
- **Symptom**: `docker compose up` fails with `port 3306 is already allocated`.
- **Solution**: Stop local MySQL service (`net stop MySQL` or stop via Services manager) or change mapped host port in `docker-compose.yml` (e.g. `"3307:3306"`).

### 500 Error: Unknown Column / Outdated Database Volume
- **Symptom**: API throws `MySqlException: Unknown column 'o.notes' in 'field list'`.
- **Cause**: The persistent Docker volume was created prior to recent schema additions.
- **Solution**: Reset volume with:
  ```bash
  docker compose down -v
  docker compose up -d
  ```

### CORS Errors in Browser
- **Symptom**: `Access to fetch has been blocked by CORS policy`.
- **Solution**: In development, client requests go through the Next.js BFF proxy (`/api/proxy/[...path]`), which eliminates CORS issues. Direct calls to `localhost:5000` must include origins configured in `Program.cs` under `DevCors`.
