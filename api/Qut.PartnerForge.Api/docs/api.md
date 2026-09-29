# API Permission Matrix

Qut.PartnerForge.Api recognises five roles: `admin`, `course_organiser`, `industry_partner`,
`industry_team`, and `industry_team_manager`. Every controller requires an authenticated
user (`[Authorize]` at the class level); most also apply a per-role **scope filter** inside
the action, restricting *which rows* a caller can see or write even when the endpoint itself
is reachable.

`industry_team` / `industry_team_manager` are members of the same partner organisation
(`organisation_id` claim); `industry_team_manager` additionally manages that organisation's
user accounts. `course_organiser` is scoped by `faculty_id`.

## Organisations

| Method | Route | Roles | Scope |
|---|---|---|---|
| GET | `/api/organisations/industries` | any authenticated | lookup data, unscoped |
| GET | `/api/organisations` | any authenticated | admin: all; course_organiser: `SubmissionStatus == approved`; industry_partner/industry_team/industry_team_manager: own organisation only; other roles: empty |
| GET | `/api/organisations/{id}` | any authenticated | same as above |
| POST | `/api/organisations` | `admin,course_organiser` | |
| PUT | `/api/organisations/{id}` | `admin,course_organiser` | must be within caller's scope above |
| DELETE | `/api/organisations/{id}` | `admin` | |

## Projects

| Method | Route | Roles | Scope |
|---|---|---|---|
| GET | `/api/projects` | any authenticated | admin: all; course_organiser: own `faculty_id` (falls back to approved organisations if no faculty claim); industry_partner/industry_team/industry_team_manager: own organisation only; other roles: empty |
| GET | `/api/projects/{id}` | any authenticated | same as above |
| POST | `/api/projects` | `admin,course_organiser` | |
| PUT | `/api/projects/{id}` | `admin,course_organiser` | must be within caller's scope above |
| DELETE | `/api/projects/{id}` | `admin` | |

## ProjectApplications

| Method | Route | Roles | Scope |
|---|---|---|---|
| GET | `/api/projectapplications` | any authenticated | admin: all; course_organiser: own `faculty_id` (falls back to approved organisations); industry_partner: own organisation only; **industry_team and industry_team_manager have no read access** (scope filter returns empty) |
| GET | `/api/projectapplications/{id}` | any authenticated | same as above |
| POST | `/api/projectapplications` | `admin,course_organiser,industry_partner` | industry_partner writes constrained to own organisation |
| PUT | `/api/projectapplications/{id}` | `admin,course_organiser,industry_partner` | same write constraint |
| DELETE (review) | `/api/projectapplications/{id}` | `admin,course_organiser` | industry_partner cannot review/approve |

## Events

| Method | Route | Roles | Scope |
|---|---|---|---|
| GET | `/api/events` | any authenticated | admin: all; course_organiser: own `faculty_id` plus cross-faculty events (`FacultyId == null`); **all other roles see every event, unfiltered** |
| GET | `/api/events/{id}` | any authenticated | same as above |
| POST | `/api/events` | `admin,course_organiser` | |
| PUT | `/api/events/{id}` | `admin,course_organiser` | |
| DELETE | `/api/events/{id}` | `admin` | |

## Users

| Method | Route | Roles | Scope |
|---|---|---|---|
| GET | `/api/users` | `admin,industry_team_manager` | admin: all; industry_team_manager: own organisation's members only |
| GET | `/api/users/{id}` | `admin,industry_team_manager` | same as above |
| POST | `/api/users` | `admin` | |
| PUT | `/api/users/{id}` | `admin` | |
| DELETE | `/api/users/{id}` | `admin` | soft delete; cannot deactivate/delete own account |

## AuditLog

| Method | Route | Roles | Scope |
|---|---|---|---|
| GET | `/api/auditlog` | `admin,course_organiser` | admin: full log, any query; course_organiser: must supply `recordId` (per-record history only) |
| GET | `/api/auditlog/tables` | `admin,course_organiser` | lookup data for filter dropdowns |

## Search

`/api/search/*` reuses the same `ApplyOrganisationScope` / `ApplyProjectScope` /
`ApplyEventScope` helpers as the controllers above, so the effective permissions for
searching organisations, projects, and events match their respective tables.

## Auth

| Method | Route | Roles | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | `[AllowAnonymous]` | public |
| POST | `/api/auth/register` | `admin` | creates new staff/partner accounts |