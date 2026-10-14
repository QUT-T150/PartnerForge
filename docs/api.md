# PartnerForge API Reference

This document provides the REST API specification for the PartnerForge ASP.NET Core Web API (built on .NET 10).

- **Local Base URL**: `http://localhost:8080` (Docker) or `http://localhost:5133` (`dotnet run`)
- **Production Base URL**: `https://api-production-a804.up.railway.app`
- **Frontend BFF Proxy**: Client applications route through `/api/proxy/[...path]` with server-side cookie injection.

---

## Authentication & Authorization

All authenticated endpoints require an RSA-signed Bearer JWT passed in the HTTP `Authorization` header:
```http
Authorization: Bearer <ACCESS_TOKEN>
```

### Role Model (5-Role RBAC)

| Role | Key | Scope & Permissions |
|---|---|---|
| **Administrator** | `admin` | Full read/write access across all organisations, projects, applications, events, users, audit logs, and bulk CSV operations. |
| **Course Organiser** | `course_organiser` | Read/write access scoped to their assigned faculty. Can manage partners, projects, applications, and events; cannot manage users or run bulk system uploads. |
| **Industry Partner** | `industry_partner` | Read/write access strictly scoped to their own linked organisation. Can submit and edit project applications and view organisation details. |
| **Industry Team** | `industry_team` | Team-level access for industry stakeholders collaborating on project proposals and capstone milestones. |
| **Industry Team Manager** | `industry_team_manager` | Supervisory role for industry organizations. Can submit, review, and delete applications for their company, and view read-only analytics. |

---

## 1. Authentication & Session Management (`/api/Auth`)

### `POST /api/Auth/login`
- **Access**: Public / Anonymous (Rate limited: 10 requests / 60s per IP)
- **Description**: Authenticates user credentials and returns an RSA-signed access JWT, single-use refresh token, and user profile claims.
- **Request Body**:
  ```json
  {
    "Email": "admin@system.com",
    "Password": "YourPassword123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "BuvNA7Xe_m0jRnZhHJH2LeUMDqlBUvbWobzX1E_eWNw",
    "expiresInSeconds": 3600,
    "email": "admin@system.com",
    "fullName": "System Administrator",
    "role": "admin",
    "facultyId": null,
    "organisationId": null
  }
  ```
- **Errors**: `401 Unauthorized` for invalid email/password or deactivated accounts; `429 Too Many Requests` on rate limit breach.

### `POST /api/Auth/refresh`
- **Access**: Public / Anonymous
- **Description**: Rotates an active single-use refresh token for a fresh token pair.
- **Request Body**:
  ```json
  {
    "RefreshToken": "BuvNA7Xe_m0jRnZhHJH2LeUMDqlBUvbWobzX1E_eWNw"
  }
  ```
- **Response `200 OK`**: Returns new `token`, `refreshToken`, and updated `expiresInSeconds`.
- **Errors**: `401 Unauthorized` if refresh token is expired, revoked, or already spent.

### `POST /api/Auth/logout`
- **Access**: Authenticated
- **Description**: Revokes the active refresh token in the database.
- **Request Body**:
  ```json
  {
    "RefreshToken": "BuvNA7Xe_m0jRnZhHJH2LeUMDqlBUvbWobzX1E_eWNw"
  }
  ```
- **Response `204 NoContent`**

### `POST /api/Auth/register`
- **Access**: `admin` only
- **Description**: Creates a new user account with assigned role and faculty/organisation scoping.
- **Request Body**:
  ```json
  {
    "Email": "lecturer@qut.edu.au",
    "Password": "InitialPassword123!",
    "FullName": "Dr. Jane Smith",
    "Role": "course_organiser",
    "FacultyId": 1,
    "OrganisationId": null
  }
  ```
- **Response `200 OK`**: Returns `AuthResponse` with created user details.
- **Errors**: `409 Conflict` if email already exists; `400 Bad Request` if role or faculty ID is invalid.

---

## 2. Organisations (`/api/Organisations`)

### `GET /api/Organisations`
- **Access**: Authenticated users
- **Query Parameters**:
  - `search` (string, optional): Substring filter on name, ABN, or contact.
  - `status` (string, optional): Partnership status filter (`active`, `pending`, `inactive`).
  - `industryId` (int, optional): Filter by ANZIC industry classification ID.
- **Response `200 OK`**: Array of `OrganisationListItemDto`.

### `GET /api/Organisations/{id}`
- **Access**: Authenticated users (subject to role scoping)
- **Response `200 OK`**: Single `OrganisationDetailDto` including linked primary contact details.

### `POST /api/Organisations`
- **Access**: `admin`, `course_organiser`
- **Request Body**:
  ```json
  {
    "name": "BioHealth Labs",
    "legalName": "BioHealth Labs Pty Ltd",
    "registrationId": "REG-2026-004",
    "abn": "12345678901",
    "industryId": 3,
    "partnershipStatus": "active",
    "submissionStatus": "approved",
    "addressLine1": "123 Innovation Way",
    "city": "Brisbane",
    "state": "QLD",
    "postcode": "4000",
    "country": "Australia",
    "phone": "+61 7 3000 1111",
    "email": "contact@biohealth.org",
    "website": "https://biohealthlabs.com.au",
    "organisationInformation": "Biotechnology research institute."
  }
  ```
- **Response `201 Created`**: Returns `{ "id": "<UUID>" }`.

### `PUT /api/Organisations/{id}`
- **Access**: `admin`, `course_organiser`, or `industry_partner` (own organisation only)
- **Response `204 NoContent`**

### `DELETE /api/Organisations/{id}`
- **Access**: `admin` only (soft delete with audit trail)
- **Response `204 NoContent`**

### `GET /api/Organisations/industries`
- **Access**: Authenticated users
- **Response `200 OK`**: Array of industry categories (`{ "id": 1, "name": "IT / Software" }`).

---

## 3. Projects (`/api/Projects`)

### `GET /api/Projects`
- **Access**: Authenticated users (subject to role/faculty scoping)
- **Query Parameters**: `search`, `status`, `semester`, `year`, `organisationId`, `facultyId`.
- **Response `200 OK`**: Array of `ProjectListItemDto`.

### `GET /api/Projects/{id}`
- **Access**: Authenticated users
- **Response `200 OK`**: Single `ProjectDetailDto`.

### `POST /api/Projects`
- **Access**: `admin`, `course_organiser`
- **Request Body**:
  ```json
  {
    "title": "Autonomous Drone Telemetry",
    "description": "Real-time edge sensor processing pipeline for UAVs.",
    "organisationId": "7b13904e-28b9-4b35-8664-5858cfd79904",
    "projectType": "capstone",
    "disciplineArea": "Robotics",
    "secondaryItDiscipline": "Cloud Computing",
    "semester": "1",
    "year": 2026,
    "multipleTeams": false,
    "status": "active",
    "projectPartnerAgreement": "Signed",
    "studentProjectAgreement": "Standard QUT Assignment"
  }
  ```
- **Response `201 Created`**: Returns `{ "id": "<UUID>" }`.

### `PUT /api/Projects/{id}`
- **Access**: `admin`, `course_organiser`
- **Response `204 NoContent`**

### `DELETE /api/Projects/{id}`
- **Access**: `admin` only
- **Response `204 NoContent`**

---

## 4. Project Applications (`/api/ProjectApplications`)

### `GET /api/ProjectApplications`
- **Access**: Authenticated users (partners only see their own submissions)
- **Response `200 OK`**: Array of `ProjectApplicationDto`.

### `POST /api/ProjectApplications`
- **Access**: `admin`, `course_organiser`, `industry_partner`, `industry_team`, `industry_team_manager`
- **Request Body**:
  ```json
  {
    "organisationId": "7b13904e-28b9-4b35-8664-5858cfd79904",
    "proposedTitle": "Microgrid Frequency Response Controller",
    "proposedDescription": "Low-latency sub-cycle inverter control.",
    "proposedProjectType": "capstone",
    "proposedDisciplineArea": "Electrical & Software",
    "proposedSemester": "2",
    "proposedYear": 2026,
    "proposedMultipleTeams": false
  }
  ```
- **Response `201 Created`**: Returns `{ "id": "<UUID>" }`.

### `PUT /api/ProjectApplications/{id}`
- **Access**: `admin`, `course_organiser` (or submitting partner while pending)
- **Response `204 NoContent`**

### `DELETE /api/ProjectApplications/{id}`
- **Access**: `admin`, `course_organiser`, `industry_team_manager`
- **Response `204 NoContent`**

---

## 5. Events & Attendances (`/api/Events`)

### `GET /api/Events`
- **Access**: Authenticated users
- **Response `200 OK`**: Array of `EventListItemDto`.

### `POST /api/Events`
- **Access**: `admin`, `course_organiser`
- **Request Body**:
  ```json
  {
    "title": "Semester 1 Capstone Industry Showcase",
    "eventType": "Showcase",
    "eventDate": "2026-06-12T09:00:00Z",
    "location": "QUT Gardens Point, P Block",
    "description": "Annual student capstone project showcase."
  }
  ```
- **Response `201 Created`**: Returns `{ "id": "<UUID>" }`.

### `GET /api/Events/{id}/attendances`
- **Access**: Authenticated users
- **Response `200 OK`**: Array of attendee RSVP records.

### `POST /api/Events/{id}/attendances`
- **Access**: `admin`, `course_organiser`
- **Request Body**:
  ```json
  {
    "contactId": "9b12404e-28b9-4b35-8664-5858cfd79905",
    "response": "attending",
    "bestContactName": "Jane Doe",
    "positionTitle": "Head of Engineering",
    "email": "jane.doe@acme.com"
  }
  ```
- **Response `201 Created`**

---

## 6. Search & Dynamic Expression DSL (`/api/search`)

Powered by dynamic LINQ expression trees, supporting cross-table relational subqueries, multi-condition conjunctions, and saved user presets.

### `GET /api/search/fields/{entity}`
- **Description**: Returns all filterable fields and their data types (`text`, `number`, `select`, `date`) for the specified entity.
- **Supported entities**: `organisations`, `projects`, `events`, `applications`, `users`.

### `GET /api/search/relationships/{entity}`
- **Description**: Returns relational entities available for cross-table sub-filtering (e.g. filter organisations that have projects in 2026).

### `POST /api/search/{entity}`
- **Description**: Executes dynamic query against MySQL.
- **Request Body**:
  ```json
  {
    "filters": [
      { "field": "partnershipStatus", "operator": "equals", "value": "active" }
    ],
    "relatedFilters": [
      {
        "entity": "projects",
        "quantifier": "any",
        "filters": [
          { "field": "year", "operator": "greaterThan", "value": "2024" }
        ]
      }
    ],
    "sortBy": "name",
    "sortDirection": "asc",
    "page": 1,
    "pageSize": 25
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "total": 42,
    "page": 1,
    "pageSize": 25,
    "items": [ ... ]
  }
  ```

### `GET /api/search/saved-filters/{entity}`
- **Description**: Returns saved filter presets for the current authenticated user.

### `POST /api/search/saved-filters`
- **Description**: Saves a named filter configuration for 1-click re-use.

### `DELETE /api/search/saved-filters/{id}`
- **Description**: Deletes a saved filter preset.

---

## 7. Analytics (`/api/Analytics`)

Summary and pipeline metrics calculated from SQL views and optimized aggregations.

### `GET /api/Analytics/summary`
- **Access**: `admin`, `course_organiser`, `industry_team_manager`
- **Response `200 OK`**:
  ```json
  {
    "totalPartners": 20,
    "activePartners": 17,
    "totalProjects": 50,
    "activeProjects": 38,
    "upcomingEvents": 3,
    "pendingApplications": 6
  }
  ```

### `GET /api/Analytics/organisations`
- **Response `200 OK`**: Industry category distribution and partnership longevity metrics.

### `GET /api/Analytics/intakes`
- **Response `200 OK`**: Historical project and student allocation volume across semesters and years.

### `GET /api/Analytics/most-active-partners`
- **Response `200 OK`**: Top 10 partner organizations ranked by multi-year project and sponsorship volume.

---

## 8. System & Audit Log (`/api/AuditLog` & `/health`)

### `GET /health`
- **Access**: Public / Anonymous
- **Description**: Health check probe evaluating API uptime and MySQL database roundtrip connectivity.
- **Response `200 OK`**: Plain text `"Healthy"`. Returns `503 Service Unavailable` if database connection fails.

### `GET /api/AuditLog`
- **Access**: `admin` only
- **Query Parameters**: `tableName`, `recordId`, `userId`, `action`, `page`, `pageSize`.
- **Response `200 OK`**: Paginated immutable audit trail records with JSON snapshots of `old_values` and `new_values`.
