# Qut.PartnerForge - Industry Team Partner Management

## What is this?

A CRM for QUT Professional Services to manage industry partners, projects, and events. Four parts running in Docker:

- **Frontend** (Next.js / React) on port 3000
- **API** (ASP.NET Core / C#) on port 8080
- **Database** (MySQL 8.4 LTS) on port 3306
- **Adminer** (Database Web UI) on port 5050

## What you need installed

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. [Node.js 22 LTS](https://nodejs.org/) & [pnpm](https://pnpm.io/) (if developing frontend locally outside Docker)
3. [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) (if developing API outside Docker)
4. Git

## How to get started (Full-Stack Docker)

Clone the repo:

```bash
git clone <repo-url>
cd Qut.PartnerForge
```

Make sure Docker Desktop is open and running.

Then run:

```bash
docker compose up --build
```

First time will take a few minutes because it downloads and builds the .NET, Node.js, and MySQL images.

When services are ready, you can access:
- **Frontend App:** http://localhost:3000
- **Swagger API Docs:** http://localhost:8080/swagger
- **Adminer (Database Manager):** http://localhost:5050

## Development Workflows

### Option A: Full-Stack via Docker
Run the whole application with a single command:
```bash
docker compose up --build
```

### Option B: Local Frontend Development Loop (Hot Reloading)
For fast frontend iteration with instant hot-reload:
1. Start the database and API in Docker:
   ```bash
   docker compose up -d db api
   ```
2. In a separate terminal, install dependencies and run Next.js locally:
   ```bash
   cd frontend
   pnpm install
   pnpm dev
   ```
   The local Next.js dev server runs at http://localhost:3000 and connects to the Docker API at `http://localhost:8080` (configured in `frontend/.env.local`).

## Seeded test account

The database comes with a test account already created:

- **Email:** admin@system.com
- **Password:** Admin123!
- **Role:** Admin
- **Organisation:** System Administration

## Browsing the database

Adminer runs at http://localhost:5050. Login with:

- **System:** MySQL
- **Server:** db
- **Username:** qut_partnerforge
- **Password:** changeme_local_only
- **Database:** qut_partnerforge

## Useful commands

Stop all containers:

```bash
docker compose down
```

Stop and wipe the database (fresh start):

```bash
docker compose down -v
```

Rebuild after code changes:

```bash
docker compose up --build
```

Run frontend tests & type-checking locally:

```bash
cd frontend
pnpm test
pnpm run type-check
```

Run backend unit tests locally:

```bash
dotnet test api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.Tests/Qut.PartnerForge.Api.Tests.csproj
```

See container logs:

```bash
docker compose logs -f frontend
docker compose logs -f api
```

## Project structure

- `docker-compose.yml` - root compose file that orchestrates db, api, adminer, and frontend
- `frontend/` - Next.js application (App Router, Tailwind CSS, TypeScript, Vitest)
  - `Dockerfile` - multi-stage standalone build for production containerisation
- `api/Qut.PartnerForge.Api/` - ASP.NET Core API solution and unit tests
- `Schema/` - `schema.sql` (MySQL DDL) and database design documentation

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. It covers branch naming, the review and CI rules on `main`, and how issues move across the project board.

## Troubleshooting

**"Cannot connect to Docker daemon"**
Open Docker Desktop and wait for it to fully start before running any commands.

**Port already in use**
Ensure ports 3000, 8080, 3306, or 5050 are not used by other running processes.

**API or Frontend keeps crashing**
Check container logs via `docker compose logs frontend` or `docker compose logs api`. Try `docker compose down -v` then `docker compose up --build` for a fresh restart.