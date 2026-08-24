# Phase 2 Backlog — QUT Partner Forge (Team 150, P997)

Source of truth for the Phase 2 backlog, consolidated from the Phase 1 Capstone Report
("Phase 2 plan", pp. 5–6). Mirrored on GitHub as epics/issues/milestones on
`QUT-T150/PartnerForge`, tracked on the GitHub Projects board.

## Process (from Phase 1 report — Team Operation / Phase 2 readiness)

- **Task tracking:** GitHub Projects board linked to this repo. Columns: Backlog → Sprint → In Progress → In Review → Done. Every issue has an assignee before it enters a sprint.
- **Code review:** minimum **one approving review** before any PR merges to `main` (enforced via branch protection).
- **Cadence:** fortnightly sprints matching the plan's week ranges; stakeholder meetings targeted weeks 3, 6, 9, 12.

## Sprints (milestones)

| Milestone | Weeks | Due (Friday) |
|---|---|---|
| Sprint 1 | 1–2 | 2026-07-31 |
| Sprint 2 | 3–4 | 2026-08-14 |
| Sprint 3 | 5–6 | 2026-08-28 |
| Sprint 4 | 7–8 | 2026-09-11 |
| Sprint 5 | 9–10 | 2026-09-25 |
| Sprint 6 | 11–13 | 2026-10-16 |

## Labels

- Type: `epic`, `spike`, `process`
- Area: `backend`, `frontend`, `database`, `docs`, `devops`, `security`, `testing`
- Priority: `priority: critical`, `priority: high`, `priority: medium`, `priority: low`
- Risk: `blocked: stakeholder input` — surfaces the Phase 1 communication-dependency risk explicitly

## Epics

| # | Epic | Plan weeks | Sprint | Notes |
|---|---|---|---|---|
| E1 | Documentation | 1–2 | 1 | Sequenced first per plan; handover-ready artifacts |
| E2 | Audit logging & analytics | 2–3 | 1–2 | `audit_log` table + 3 SQL views already exist; wiring only |
| E3 | CSV import | 3–4 | 2 | **Critical path** — system has limited value until spreadsheet data is migrated |
| E4 | Role taxonomy expansion | 3–4 | 2 | Add `industry_team`, `industry_team_manager` |
| E5 | Data analysis tool | 5–7 | 3–4 | Highest uncertainty; needs stakeholder input |
| E6 | Security hardening | 6–8 | 3–4 | Rate limiting, CSRF, token refresh, HTTPS |
| E7 | Containerisation & deployment | 8–10 | 4–5 | Azure primary, VPS fallback; Railway pipeline rebuild front-loaded to Sprint 1 |
| E8 | UI refinement | 10–12 | 5–6 | Deliberately last — informed by real user feedback |
| E9 | Final documentation & handover | 12–13 | 6 | Includes IP / data-governance questions |

Issue-level breakdown lives on GitHub (each child issue links back to its epic).
Run `scripts/create_phase2_backlog.sh` to (re)create labels, milestones, and issues —
it is idempotent for labels/milestones but will duplicate issues if run twice.
