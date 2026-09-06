#!/usr/bin/env bash
# Creates the Phase 2 backlog on GitHub: labels, sprint milestones, epics, and issues.
# Consolidated from the Phase 1 Capstone Report "Phase 2 plan" (pp. 5-6).
#
# ---------------------------------------------------------------------------
# THIS HAS ALREADY BEEN RUN. It created issues #1-#54 on 2026-07-28.
#
# Labels and milestones are idempotent, so re-running is harmless for those.
# ISSUES ARE NOT. Running this again adds a second copy of all ~54 issues,
# with fresh numbers, and there is no undo beyond closing them by hand.
#
# It is committed as the provenance of the backlog - it records where each
# epic and issue came from in the Phase 1 report - not as a tool to re-run.
# To add a single issue, use `gh issue create` directly.
# ---------------------------------------------------------------------------
#
# Requirements: gh CLI authenticated with push access to the repo (gh auth login).
set -euo pipefail

REPO="QUT-T150/PartnerForge"

echo "==> Creating labels"
label() { gh label create "$1" -R "$REPO" -c "$2" -d "$3" --force >/dev/null && echo "  label: $1"; }
label "epic"                     "5319e7" "Tracks a Phase 2 workstream"
label "spike"                    "d4c5f9" "Timeboxed research task"
label "process"                  "bfdadc" "Team process / project management"
label "backend"                  "1d76db" "ASP.NET Core API"
label "frontend"                 "0e8a16" "Next.js frontend"
label "database"                 "fbca04" "MySQL schema / migrations"
label "docs"                     "0075ca" "Documentation"
label "devops"                   "c2e0c6" "Docker / CI/CD / deployment"
label "security"                 "d93f0b" "Security hardening"
label "testing"                  "bfd4f2" "Automated tests"
label "priority: critical"       "b60205" "Critical path for Phase 2"
label "priority: high"           "d93f0b" "High priority"
label "priority: medium"         "fbca04" "Medium priority"
label "priority: low"            "e4e669" "Low priority"
label "blocked: stakeholder input" "e11d21" "Cannot proceed without Shailesh/Wayne input"

echo "==> Creating sprint milestones"
milestone() {
  gh api -X POST "repos/$REPO/milestones" \
    -f title="$1" -f description="$2" -f due_on="$3" >/dev/null 2>&1 \
    && echo "  milestone: $1" || echo "  milestone: $1 (already exists, skipped)"
}
milestone "Sprint 1" "Weeks 1-2: documentation, audit logging, board + pipeline setup" "2026-07-31T14:00:00Z"
milestone "Sprint 2" "Weeks 3-4: CSV import, role taxonomy expansion, analytics UI"    "2026-08-14T14:00:00Z"
milestone "Sprint 3" "Weeks 5-6: data analysis tool, security hardening begins"        "2026-08-28T14:00:00Z"
milestone "Sprint 4" "Weeks 7-8: security hardening, deployment prep"                  "2026-09-11T14:00:00Z"
milestone "Sprint 5" "Weeks 9-10: deployment, UI refinement begins"                    "2026-09-25T14:00:00Z"
milestone "Sprint 6" "Weeks 11-13: UI refinement, final documentation, handover"       "2026-10-16T14:00:00Z"

new_issue() { # title labels milestone body -> issue number on stdout
  local url
  url=$(gh issue create -R "$REPO" -t "$1" -l "$2" -m "$3" -b "$4")
  echo "${url##*/}"
}

echo "==> Creating epics"

E1=$(new_issue "Epic: Documentation (weeks 1-2)" "epic,docs,priority: high" "Sprint 1" \
"Document all existing code, API endpoints, database schema, services, controllers, and containerised components. Sequenced first because the Phase 1 codebase was built under time pressure during the week 11-13 pivot and lacks fully updated documentation. Output doubles as a handover-ready artifact for the Industry Engagement team.

Child issues are linked below (search \"Part of #\" references).")
echo "  E1 Documentation: #$E1"

E2=$(new_issue "Epic: Audit logging & analytics (weeks 2-3)" "epic,backend,priority: high" "Sprint 1" \
"The \`audit_log\` table exists in \`Schema/schema.sql\` but is not wired into the API. Three analytics views (\`v_organisation_stats\`, \`v_intake_summary\`, \`v_most_active_partners_3yr\`) are defined in SQL but not exposed through the API or frontend. Wire audit logging into all create/update/delete operations and surface the analytics through endpoints + a dashboard view.

Low-risk: schema design is complete, remaining effort is API and frontend integration.")
echo "  E2 Audit & analytics: #$E2"

E3=$(new_issue "Epic: CSV import (weeks 3-4)" "epic,priority: critical" "Sprint 2" \
"The Industry Engagement team's existing data lives in BIT/MIT Capstone spreadsheets. **Partner Forge has limited operational value until that data is migrated in.** Build an import tool that validates incoming data against the schema, handles deduplication (the spreadsheets contain overlapping records), and reports errors for unmappable rows.

Critical-path item for Phase 2.")
echo "  E3 CSV import: #$E3"

E4=$(new_issue "Epic: Role taxonomy expansion (weeks 3-4)" "epic,backend,priority: medium" "Sprint 2" \
"Current roles (\`admin\`, \`course_organiser\`, \`industry_partner\`) are a known simplification. Add \`industry_team\` and \`industry_team_manager\` to reflect the Industry Engagement team's organisational hierarchy, keep \`industry_partner\` for potential future external access, and update all RBAC scoping in the API controllers.")
echo "  E4 Role expansion: #$E4"

E5=$(new_issue "Epic: Data analysis tool (weeks 5-7)" "epic,blocked: stakeholder input,priority: medium" "Sprint 3" \
"The stakeholder has indicated data analysis capability is required but has not specified its form. Current plan: an Azure-based analysis component operating on data exposed by the API - reports, engagement trends, decision support. Highest-uncertainty Phase 2 item; scope to be refined through stakeholder consultation early in the semester, sequenced after documentation and CSV import so it can operate on real data.")
echo "  E5 Data analysis: #$E5"

E6=$(new_issue "Epic: Security hardening (weeks 6-8)" "epic,security,priority: high" "Sprint 3" \
"Phase 1 delivered the core auth model (RSA-signed JWTs, server-side RBAC, httpOnly cookies via the Next.js proxy). Phase 2 adds: rate limiting on auth endpoints, CSRF protection, token refresh, and transport-layer hardening (enforced HTTPS). Expand the unit test suite to cover the new security features and the broader API surface.")
echo "  E6 Security: #$E6"

E7=$(new_issue "Epic: Containerisation & deployment (weeks 8-10)" "epic,devops,priority: high" "Sprint 4" \
"API, MySQL, and Adminer are containerised via Docker Compose; the Next.js frontend runs independently. Bring the frontend into the compose stack and prepare deployment configurations for two targets: Azure (stakeholder's Microsoft-ecosystem preference) and a Linux VPS / container platform fallback. Include environment-specific config management, health checks, and CI/CD extension of the existing GitHub Actions workflow. The Railway pipeline rebuild is front-loaded to Sprint 1.")
echo "  E7 Deployment: #$E7"

E8=$(new_issue "Epic: UI refinement (weeks 10-12)" "epic,frontend,priority: medium" "Sprint 5" \
"Refine the frontend based on stakeholder feedback once the system is deployed and accessible: navigation, form validation, error messaging, visual consistency. Deliberately sequenced late so UI work is informed by real user feedback on a running system rather than speculative design.")
echo "  E8 UI refinement: #$E8"

E9=$(new_issue "Epic: Final documentation & handover (weeks 12-13)" "epic,docs,priority: high" "Sprint 6" \
"Document all Phase 2 additions and prepare handover to the Industry Engagement team: deployment guides, user documentation, administrative procedures. Includes raising the unresolved governance questions from the Phase 1 report (data ownership/retention, IP terms of handover) with Shailesh and the teaching team.")
echo "  E9 Handover: #$E9"

echo "==> Creating Sprint 1 issues (documentation + process + audit wiring)"

i=$(new_issue "Set up GitHub Projects board for Phase 2" "process,priority: high" "Sprint 1" \
"Part of the Phase 2 process commitments (Phase 1 report, Team Operation): adopt a shared board so task state is visible without a meeting or Discord exchange.

- [ ] Create GitHub Projects (v2) board linked to this repo
- [ ] Columns: Backlog / Sprint / In Progress / In Review / Done
- [ ] Add all Phase 2 epics + issues to the board
- [ ] Enable auto-add workflow for new issues and auto-move on PR merge
- [ ] Every issue entering a sprint must have an assignee

**Acceptance:** board exists, all open issues appear on it, team walked through it at the next meeting."); echo "  #$i board"

i=$(new_issue "Enforce branch protection: 1 approving review + green CI on main/staging" "process,devops,priority: high" "Sprint 1" \
"Phase 1 report commits to a hard rule: minimum one approving review before any PR merges to main (applied inconsistently in Phase 1).

- [ ] Branch protection on \`main\`: require 1 approving review, require status checks (CI) to pass, block force pushes
- [ ] Same for \`staging\` (review requirement optional there - team to decide)
- [ ] Document the rule in CONTRIBUTING.md (see documentation epic)

Requires repo admin. **Acceptance:** direct pushes and unreviewed merges to main are rejected by GitHub.

Part of #$E1"); echo "  #$i branch protection"

i=$(new_issue "Fix README encoding and rewrite for current stack" "docs,priority: high" "Sprint 1" \
"\`README.md\` is saved as UTF-16 (renders garbled in many tools) and predates parts of the pivot. \`PR_PHASE1.md\` still references PostgreSQL and HMAC signing (current stack is MySQL + RSA).

- [ ] Re-save README as UTF-8
- [ ] Update: stack overview (Next.js frontend, not static HTML), quickstart (docker compose up, seeded admin login, Swagger, Adminer), repo layout
- [ ] Remove or archive stale statements in PR_PHASE1.md

**Acceptance:** a new team member can go from clone to logged-in dashboard using only the README.

Part of #$E1"); echo "  #$i readme"

i=$(new_issue "API reference: document all endpoints" "docs,backend" "Sprint 1" \
"Document every endpoint across the seven controllers (Auth, Users, Organisations, Projects, ProjectApplications, Events, Search) in \`api/.../Controllers/\`.

- [ ] XML doc comments on all controller actions (feeds Swagger)
- [ ] \`docs/api.md\`: per endpoint - route, roles allowed, request/response shape, error cases
- [ ] Document the SearchController contract: filter JSON format, operators, relationship filters (any/none), saved filters

**Acceptance:** Swagger UI shows descriptions for every endpoint; docs/api.md covers all routes incl. RBAC rules.

Part of #$E1"); echo "  #$i api docs"

i=$(new_issue "Database schema documentation refresh + migration workflow" "docs,database" "Sprint 1" \
"\`Schema/schema_design.md\` is good but predates the saved-filters migration; the migration process itself is undocumented.

- [ ] Update schema_design.md to match current \`schema.sql\` + \`Schema/migrations/\`
- [ ] Document how to write/apply a migration on an existing volume vs fresh \`docker compose up\`
- [ ] Document the three analytics views and their intended consumers

**Acceptance:** docs match the live schema; a team member can ship a schema change end-to-end following the guide.

Part of #$E1"); echo "  #$i schema docs"

i=$(new_issue "Local development environment guide" "docs,devops" "Sprint 1" \
"One guide covering the full local loop.

- [ ] Backend: docker compose up, resetting the DB volume, Adminer access, env vars / JWT keys in dev
- [ ] Frontend: pnpm install / next dev, how the BFF proxy reaches the API, seeded admin credentials
- [ ] Running the xUnit test suite locally
- [ ] Troubleshooting section (port conflicts, stale volume after schema change, CORS)

**Acceptance:** verified by a teammate following it cold on their machine.

Part of #$E1"); echo "  #$i dev guide"

i=$(new_issue "Frontend architecture documentation" "docs,frontend" "Sprint 1" \
"Document the Next.js app so frontend work isn't gated on the original author.

- [ ] Auth flow: login route -> httpOnly cookie -> \`app/api/proxy/[...path]\` BFF proxy -> API
- [ ] Route structure: \`(authenticated)\` group, middleware protection
- [ ] Core components: FilterBuilder (and its contract with /api/search), DataTable, RecordModal, Header
- [ ] Conventions: styling (Tailwind + CSS modules), state handling

**Acceptance:** doc reviewed by a team member who didn't write the frontend.

Part of #$E1"); echo "  #$i frontend docs"

i=$(new_issue "CONTRIBUTING.md: branching model, staging flow, review rule" "docs,process" "Sprint 1" \
"Write down the workflow the team already follows so it stops being tribal knowledge.

- [ ] Branch naming, feature branches off staging, PR flow staging -> main
- [ ] The 1-approving-review rule and CI-must-pass rule
- [ ] Issue/board conventions: labels, sprints, self-assignment at sprint planning

**Acceptance:** linked from README; referenced at sprint planning.

Part of #$E1"); echo "  #$i contributing"

i=$(new_issue "Rebuild Railway CI/CD pipeline for current architecture" "devops,priority: high" "Sprint 1" \
"The Railway auto-deploy built in Phase 1 predates the pivot (Postgres -> MySQL, static HTML -> Next.js) and needs rebuilding against the current stack. Front-loaded to Sprint 1 so the team gets a hosted test environment early.

- [ ] Deploy API + MySQL to Railway from staging/main merges
- [ ] Deploy the Next.js frontend; point it at the hosted API (CORS already allows qpf-frontend-staging.up.railway.app in Program.cs)
- [ ] Secrets via Railway env vars (DB password, JWT PEM keys) - no keys in the repo image

**Acceptance:** merge to staging produces a working hosted build the team can click through.

Part of #$E7"); echo "  #$i railway"

i=$(new_issue "Implement audit logging in the API write path" "backend,database,priority: high" "Sprint 1" \
"Wire the existing \`audit_log\` table into all create/update/delete/soft-delete operations, per the schema design doc's recommendation to write from the API layer (captures acting user + IP, which DB triggers can't).

- [ ] AuditService (or SaveChanges interceptor) recording: acting user id, action, table, record id, old values JSON, new values JSON, timestamp, IP
- [ ] Cover all seven controllers' write paths
- [ ] Exclude no-op saves; handle soft deletes as their own action type

**Acceptance:** every write through the API produces a correct audit row; verified in tests (see companion test issue).

Part of #$E2"); echo "  #$i audit write"

echo "==> Creating Sprint 2 issues (analytics surface, CSV import, roles)"

i=$(new_issue "Analytics API endpoints for the three schema views" "backend" "Sprint 2" \
"Expose \`v_organisation_stats\`, \`v_intake_summary\`, and \`v_most_active_partners_3yr\` through authenticated endpoints (e.g. /api/analytics/*), keyless read-only EF mappings or raw SQL.

- [ ] Endpoints with role scoping consistent with existing controllers
- [ ] DTOs - don't leak view columns wholesale if any are internal

**Acceptance:** all three views queryable via Swagger with a course_organiser token.

Part of #$E2"); echo "  #$i analytics api"

i=$(new_issue "Analytics dashboard view in frontend" "frontend" "Sprint 2" \
"Surface the three analytics endpoints on the dashboard: per-organisation statistics, per-intake summaries, most-active partners (3yr).

- [ ] Dashboard cards/charts consuming /api/analytics/* via the BFF proxy
- [ ] Empty-state handling while the DB has little data (pre-CSV-import)

**Acceptance:** dashboard shows live numbers from seeded/imported data.

Part of #$E2"); echo "  #$i analytics ui"

i=$(new_issue "Per-record audit history endpoint + UI panel" "backend,frontend" "Sprint 2" \
"Let staff answer 'who changed this and when' - the accountability requirement behind the audit log.

- [ ] GET endpoint: audit entries for a given table + record id (admin + course_organiser)
- [ ] History panel in RecordModal showing change list with user, time, and old -> new diffs

**Acceptance:** editing an organisation then opening its history shows the change with the acting user.

Part of #$E2"); echo "  #$i audit ui"

i=$(new_issue "Tests: audit logging coverage" "testing" "Sprint 2" \
"- [ ] Unit tests: audit row written for create/update/soft-delete on at least Organisations + Projects
- [ ] Old/new JSON correctness on update
- [ ] No audit row on failed/unauthorised writes

Part of #$E2"); echo "  #$i audit tests"

i=$(new_issue "Obtain sample spreadsheets from Shailesh + agree field mapping" "blocked: stakeholder input,priority: critical" "Sprint 2" \
"Prerequisite for the whole CSV import epic. We built the schema from column headers only - we need real (or realistic redacted) BIT/MIT spreadsheet exports to design import mapping and dedup rules.

- [ ] Request sample exports at the week-3 stakeholder meeting (agenda item)
- [ ] Produce a written mapping: spreadsheet column -> schema table.column, incl. columns we drop and defaults we apply
- [ ] Note known data-quality issues (duplicate orgs, inconsistent naming) to feed the dedup rules

**Acceptance:** mapping doc agreed by the team; sample files stored privately (NOT committed - they contain partner PII).

Part of #$E3"); echo "  #$i csv mapping"

i=$(new_issue "CSV import API: upload, validate, report errors" "backend,priority: critical" "Sprint 2" \
"- [ ] POST endpoint (admin-only) accepting CSV upload per entity type (organisations, contacts, projects, events)
- [ ] Validate rows against schema rules (required fields, enums like partnership_status, FK resolution by name)
- [ ] Row-level error report: row number, column, reason - valid rows import, invalid rows returned
- [ ] Import runs in a transaction per file

**Acceptance:** importing a deliberately messy fixture file yields correct rows inserted + precise errors for the rest.

Part of #$E3"); echo "  #$i csv api"

i=$(new_issue "CSV import: deduplication rules" "backend,database,priority: critical" "Sprint 2" \
"The existing spreadsheets contain overlapping records - the same partner appears under different names or conflicting details across files (the core problem Partner Forge exists to fix).

- [ ] Match organisations on ABN (exact) then normalised name (case/whitespace/punctuation-insensitive)
- [ ] Match contacts on email within an organisation
- [ ] On match: configurable skip / update / flag-for-review behaviour, defaulting to flag-for-review
- [ ] Dedup decisions appear in the import report

**Acceptance:** importing the same file twice creates zero duplicates.

Part of #$E3"); echo "  #$i csv dedup"

i=$(new_issue "CSV import UI: upload, preview, error report" "frontend,priority: high" "Sprint 2" \
"- [ ] Admin-only import page: file picker, entity type, dry-run toggle
- [ ] Preview table of parsed rows before committing
- [ ] Post-import report: imported / skipped / flagged / failed with reasons, downloadable

**Acceptance:** an admin can complete a full import without touching Swagger.

Part of #$E3"); echo "  #$i csv ui"

i=$(new_issue "CSV import: dry-run mode + rollback strategy" "backend" "Sprint 2" \
"- [ ] Dry-run flag: full validation + dedup analysis, no writes, returns the same report
- [ ] Batch id recorded on imported rows (or via audit log) so a bad import can be soft-deleted as a unit

**Acceptance:** dry-run leaves row counts unchanged; a completed import can be reversed by batch id.

Part of #$E3"); echo "  #$i csv dryrun"

i=$(new_issue "Tests: CSV import fixtures and edge cases" "testing" "Sprint 2" \
"- [ ] Fixture files: clean, duplicates (intra-file and vs-DB), bad enums, missing FKs, encoding oddities (Excel BOM, quoted commas)
- [ ] Unit tests for validator and dedup matcher; integration test for the endpoint

Part of #$E3"); echo "  #$i csv tests"

i=$(new_issue "Migration: add industry_team and industry_team_manager roles" "database" "Sprint 2" \
"- [ ] Migration in \`Schema/migrations/\` inserting the two roles (+ role_permissions rows as agreed)
- [ ] Update seed data in schema.sql for fresh installs
- [ ] Team decision recorded: exact permission set for each new role vs course_organiser

**Acceptance:** fresh install and migrated install both show 5 roles with identical permissions.

Part of #$E4"); echo "  #$i roles migration"

i=$(new_issue "Update RBAC scoping across controllers for expanded roles" "backend,security" "Sprint 2" \
"- [ ] Review every [Authorize(Roles = ...)] attribute + row-level scoping in the seven controllers against the new 5-role model
- [ ] Update AuthService claims if new scoping claims are needed
- [ ] Document the resulting permission matrix in docs/api.md

**Acceptance:** permission matrix implemented and covered by tests (companion issue).

Part of #$E4"); echo "  #$i roles rbac"

i=$(new_issue "Frontend: permission matrix + role-aware UI for new roles" "frontend" "Sprint 2" \
"- [ ] Extend the role-keyed permissions object to industry_team / industry_team_manager
- [ ] Nav, action buttons, and route protection reflect the new matrix (server remains the enforcer)

**Acceptance:** logging in as each of the 5 roles shows the intended UI surface.

Part of #$E4"); echo "  #$i roles ui"

i=$(new_issue "Tests: role scoping for the 5-role model" "testing" "Sprint 2" \
"- [ ] Controller tests asserting allow/deny per role per endpoint group (matrix-driven)
- [ ] Row-scoping tests: industry_partner sees only own org; faculty scoping for course_organiser

Part of #$E4"); echo "  #$i roles tests"

echo "==> Creating Sprint 3-4 issues (analysis tool, security)"

i=$(new_issue "Stakeholder consultation: define data analysis requirements" "blocked: stakeholder input,priority: high" "Sprint 3" \
"The stakeholder has said analysis capability is required but not what form it takes. Agenda item for the week-3/6 meetings; written summary of outcomes required.

- [ ] Questions drafted in advance (what reports, what audience, Azure constraints, budget/tenancy)
- [ ] Outcome written up and linked here; epic re-scoped from it

Part of #$E5"); echo "  #$i analysis reqs"

i=$(new_issue "Spike: Azure-based analysis vs in-app reporting" "spike" "Sprint 3" \
"Timeboxed (max ~1 week) comparison to de-risk the highest-uncertainty Phase 2 item.

- [ ] Option A: Azure component (e.g. Power BI / Azure-hosted service) reading via the API or read replica
- [ ] Option B: extend the in-app analytics dashboard (charts over new endpoints)
- [ ] Compare: cost, auth/tenancy fit with QUT, effort, maintainability post-handover
- [ ] Recommendation written to the epic

Part of #$E5"); echo "  #$i analysis spike"

i=$(new_issue "Implement chosen data analysis approach" "backend,frontend" "Sprint 4" \
"Placeholder - scope after the requirements consultation and spike land. Split into concrete issues at Sprint 3 review.

Part of #$E5"); echo "  #$i analysis impl"

i=$(new_issue "Rate limiting on authentication endpoints" "backend,security,priority: high" "Sprint 3" \
"- [ ] ASP.NET Core rate limiter on /api/auth/login (per-IP, e.g. fixed window + stricter per-account lockout/backoff)
- [ ] 429 responses with sensible Retry-After; failures logged to audit log
- [ ] Limits configurable via appsettings

**Acceptance:** scripted brute-force attempt is throttled; normal logins unaffected.

Part of #$E6"); echo "  #$i rate limit"

i=$(new_issue "CSRF protection for cookie-based sessions" "backend,frontend,security,priority: high" "Sprint 3" \
"The JWT lives in an httpOnly cookie set by the Next.js BFF, so state-changing requests need CSRF defence.

- [ ] Choose strategy: SameSite=Strict/Lax on the session cookie + origin checks in the proxy, and/or anti-forgery token
- [ ] Apply to all mutating routes through \`app/api/proxy\`
- [ ] Document the decision in the security notes

**Acceptance:** cross-origin forged POST is rejected; legitimate app flows unaffected.

Part of #$E6"); echo "  #$i csrf"

i=$(new_issue "JWT refresh tokens (avoid forced re-login at 60 min)" "backend,security,priority: high" "Sprint 4" \
"- [ ] Refresh token issued at login (httpOnly cookie), stored server-side (hashed) with revocation on logout/password change
- [ ] /api/auth/refresh endpoint; access token stays 60 min, refresh window per team decision
- [ ] Next.js proxy transparently refreshes on 401 and retries once

**Acceptance:** a user active past 60 minutes never sees a login screen; logout revokes the refresh token.

Part of #$E6"); echo "  #$i refresh"

i=$(new_issue "Frontend: route protection and session-expiry feedback" "frontend,security" "Sprint 4" \
"- [ ] middleware.ts redirects unauthenticated users to /login (and role-gates admin routes)
- [ ] Clear UI feedback on session expiry and logout; return-to-page after re-login
- [ ] Role-aware module visibility verified against the 5-role model

**Acceptance:** deep-linking to a protected route while signed out redirects cleanly; expiry mid-session shows a friendly prompt, not a broken page.

Part of #$E6"); echo "  #$i routes"

i=$(new_issue "Transport hardening: enforce HTTPS/HSTS in production config" "devops,security" "Sprint 4" \
"- [ ] HTTPS redirection + HSTS enabled outside Development
- [ ] Secure + SameSite attributes on all cookies in production
- [ ] Verified on the hosted (Railway/Azure) environment

Part of #$E6"); echo "  #$i https"

i=$(new_issue "Input validation audit across DTOs and controllers" "backend,security" "Sprint 4" \
"- [ ] Data annotations / validation on every request DTO (lengths, formats, enums, email/ABN patterns)
- [ ] Consistent 400 ProblemDetails responses
- [ ] Check SearchController filter parsing rejects malformed/oversized payloads safely

Part of #$E6"); echo "  #$i validation"

i=$(new_issue "Expand test suite; remove stale TenantServiceTests" "testing" "Sprint 4" \
"- [ ] Delete/replace \`TenantServiceTests.cs\` (Tenant model was removed in Phase 1)
- [ ] Add coverage for the new security features (rate limit, refresh, CSRF) and at least one CRUD controller end-to-end
- [ ] CI runs the expanded suite

Part of #$E6"); echo "  #$i test expand"

echo "==> Creating Sprint 4-6 issues (deployment, UI, handover)"

i=$(new_issue "Containerise the Next.js frontend into docker-compose" "devops,frontend,priority: high" "Sprint 4" \
"- [ ] Multi-stage Dockerfile for the frontend (pnpm build, standalone output)
- [ ] Service in root docker-compose.yml with env-based API URL; works alongside api/db/adminer
- [ ] Update dev guide: full-stack \`docker compose up\` vs local \`next dev\` loop

**Acceptance:** fresh clone + docker compose up serves the full app including login.

Part of #$E7"); echo "  #$i fe container"

i=$(new_issue "Resolve production hosting question with stakeholder" "blocked: stakeholder input,devops,priority: high" "Sprint 4" \
"The unresolved deployment target is the most significant open risk (Phase 1 report). Pursue from the start of semester; agenda item until answered.

- [ ] Confirm: QUT-hosted? Azure tenancy? Who pays/owns the subscription post-handover?
- [ ] Record the decision; it gates the Azure vs VPS issues below

Part of #$E7"); echo "  #$i hosting"

i=$(new_issue "Azure deployment configuration" "devops" "Sprint 5" \
"- [ ] Azure config for API container, MySQL (Azure Database for MySQL), frontend
- [ ] Secrets via Azure app settings/Key Vault; JWT PEMs not baked into images
- [ ] Deploy pipeline stage in GitHub Actions (manual approval gate)

Part of #$E7"); echo "  #$i azure"

i=$(new_issue "Fallback deployment configuration (Linux VPS / container platform)" "devops" "Sprint 5" \
"Prepared in parallel because no hosting guidance has been received (Phase 1 report).

- [ ] Compose-based production profile (frontend + api + mysql + reverse proxy w/ TLS)
- [ ] Documented runbook: provision, deploy, update, backup

Part of #$E7"); echo "  #$i vps"

i=$(new_issue "Health checks and environment configuration management" "devops" "Sprint 5" \
"- [ ] /health endpoint on the API (DB connectivity check) wired into compose/platform healthchecks
- [ ] Single documented matrix of env vars per environment (dev/staging/prod)
- [ ] CI extended: build + test + deploy triggers per environment

Part of #$E7"); echo "  #$i health"

i=$(new_issue "UI: navigation and visual consistency pass" "frontend" "Sprint 5" \
"- [ ] Consistent layout/spacing/typography across dashboard, platform views, modals
- [ ] Navigation reflects role + current section; breadcrumbs or active states
- [ ] Loading and empty states for all tables

Part of #$E8"); echo "  #$i ui nav"

i=$(new_issue "UI: form validation and error messaging" "frontend" "Sprint 6" \
"- [ ] Client-side validation mirroring API rules, with inline field errors
- [ ] API error responses surfaced meaningfully (not generic failure toasts)
- [ ] Destructive actions (delete/reject) get confirmation dialogs

Part of #$E8"); echo "  #$i ui forms"

i=$(new_issue "Stakeholder feedback session on deployed UI + actioned fixes" "frontend,blocked: stakeholder input" "Sprint 6" \
"- [ ] Walkthrough with Shailesh/Industry Engagement team on the hosted build (target week 9/12 meeting)
- [ ] Feedback captured as individual issues, prioritised, and top items fixed within the sprint

Part of #$E8"); echo "  #$i ui feedback"

i=$(new_issue "User guide and admin procedures" "docs" "Sprint 6" \
"- [ ] Task-oriented user guide for the Industry Engagement team (manage partners/contacts/projects/events, filters, imports, analytics)
- [ ] Admin procedures: user management, roles, restoring soft-deleted records, reading audit history

Part of #$E9"); echo "  #$i user guide"

i=$(new_issue "Final deployment guide / operations runbook" "docs,devops" "Sprint 6" \
"- [ ] End-to-end deploy instructions for the chosen target (+ fallback)
- [ ] Backup/restore, key rotation (JWT PEMs, DB password), upgrade procedure

Part of #$E9"); echo "  #$i runbook"

i=$(new_issue "Handover package: IP, data governance, and retention questions" "docs,priority: high" "Sprint 6" \
"The Phase 1 report identifies unresolved governance questions the team cannot answer unilaterally.

- [ ] Raise with Shailesh + teaching team: data ownership/accuracy responsibility, deletion authority, retention after partnership inactivity, IP/licensing terms of the codebase handover
- [ ] Record outcomes in the handover document
- [ ] Assemble final handover package (code, docs, credentials transfer plan)

Part of #$E9"); echo "  #$i handover"

echo ""
echo "==> Done. Backlog created on https://github.com/$REPO/issues"
echo "    Next (manual, needs 'project' scope: gh auth refresh -s project):"
echo "      gh project create --owner QUT-T150 --title 'Partner Forge - Phase 2'"
echo "      then link it to the repo and enable auto-add workflows in the UI."
