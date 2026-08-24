# PartnerForge API Reference

This document provides the REST API specification for the PartnerForge ASP.NET Core Web API.

Base URL: `http://localhost:5000` (or `https://qpf-api-staging.up.railway.app` in staging).

---

## Authentication & Authorization

All authenticated endpoints require an RSA-signed JWT passed in the HTTP Authorization header:
```
Authorization: Bearer <TOKEN>
```

### Role Model
- `admin`: Global read/write access across all organisations, projects, applications, events, users, and audit logs.
- `course_organiser`: Read/write access scoped to their assigned faculty.
- `industry_partner`: Read/write access restricted to their own linked organisation.

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/login`
- **Access**: Public / Anonymous
- **Description**: Authenticates user credentials and returns a signed JWT token and profile claims.
- **Request Body**:
  ```json
  {
    "email": "admin@system.com",
    "password": "Admin123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "email": "admin@system.com",
    "fullName": "System Administrator",
    "role": "admin",
    "facultyId": null,
    "organisationId": null
  }
  ```
- **Errors**: `401 Unauthorized` for invalid credentials or inactive accounts.

### `POST /api/auth/register`
- **Access**: `admin` role only
- **Description**: Registers a new staff or partner account.
- **Request Body**:
  ```json
  {
    "email": "lecturer@qut.edu.au",
    "password": "Password123!",
    "fullName": "Dr. Jane Smith",
    "role": "course_organiser",
    "facultyId": 1
  }
  ```
- **Response `200 OK`**: Returns `AuthResponse` with JWT token.
- **Errors**: `409 Conflict` (email registered), `400 Bad Request` (invalid role).

---

## 2. Organisations Endpoints (`/api/organisations`)

### `GET /api/organisations`
- **Access**: Authenticated users
- **Query Parameters**:
  - `search` (string, optional): Substring filter on organisation name.
  - `status` (string, optional): Filter by `partnership_status` (`active`, `pending`, `inactive`).
  - `industryId` (int, optional): Filter by industry ID.
- **Response `200 OK`**: Array of `OrganisationListItemDto`.

### `GET /api/organisations/{id}`
- **Access**: Authenticated users (subject to role scoping)
- **Response `200 OK`**: Single `OrganisationListItemDto`.

### `POST /api/organisations`
- **Access**: `admin`, `course_organiser`
- **Request Body**:
  ```json
  {
    "name": "BioHealth Labs",
    "abn": "12345678901",
    "partnershipStatus": "active",
    "submissionStatus": "approved",
    "industryId": 3,
    "addressLine1": "123 Innovation Way",
    "city": "Brisbane",
    "state": "QLD",
    "postcode": "4000",
    "country": "Australia",
    "primaryContactName": "Marcus Vance",
    "primaryContactEmail": "marcus@biohealth.com",
    "phone": "+61 7 3000 1111",
    "notes": "Biotech research partner."
  }
  ```
- **Response `201 Created`**: Returns `{ "id": "<UUID>" }`.

### `PUT /api/organisations/{id}`
- **Access**: `admin`, `course_organiser`, or `industry_partner` (own organisation)
- **Response `204 NoContent`**

### `DELETE /api/organisations/{id}`
- **Access**: `admin` only (soft delete)
- **Response `204 NoContent`**

### `GET /api/organisations/industries`
- **Access**: Authenticated users
- **Response `200 OK`**: List of `{ "id": 1, "name": "Information Technology" }`.

---

## 3. Projects Endpoints (`/api/projects`)

### `GET /api/projects`
- **Access**: Authenticated users (subject to role/faculty scoping)
- **Query Parameters**:
  - `search` (string, optional): Title substring filter.
  - `status` (string, optional): Status filter (`active`, `completed`, `draft`).
  - `semester` (string, optional): Semester code (`1`, `2`, `summer`).
  - `year` (int, optional): Calendar year.
  - `organisationId` (UUID, optional): Filter by owning organisation.
- **Response `200 OK`**: Array of `ProjectListItemDto`.

### `POST /api/projects`
- **Access**: `admin`, `course_organiser`
- **Request Body**:
  ```json
  {
    "title": "Autonomous Drone Telemetry",
    "description": "Real-time sensor processing pipeline.",
    "organisationId": "7b13904e-28b9-4b35-8664-5858cfd79904",
    "projectType": "capstone",
    "disciplineArea": "Robotics",
    "semester": "1",
    "year": 2026,
    "status": "active",
    "ppaSigned": true,
    "spaSigned": true,
    "notes": "Weekly lab meetings."
  }
  ```

---

## 4. Project Applications Endpoints (`/api/projectapplications`)

### `GET /api/projectapplications`
- **Access**: Authenticated users
- **Query Parameters**: `search`, `status` (defaults to `pending`), `organisationId`, `semester`, `year`.

### `POST /api/projectapplications`
- **Access**: `admin`, `course_organiser`, `industry_partner`
- **Description**: Submits a new project proposal.

### `PUT /api/projectapplications/{id}/review`
- **Access**: `admin`, `course_organiser`
- **Request Body**:
  ```json
  {
    "status": "approved",
    "feedback": "Approved for Semester 1 intake."
  }
  ```

---

## 5. Events Endpoints (`/api/events`)

### `GET /api/events`
- **Query Parameters**: `search`, `type`, `facultyId`, `year`.

### `POST /api/events/{id}/attendances`
- **Access**: Authenticated users
- **Description**: Records RSVP response (`accepted`, `declined`, `tentative`).

---

## 6. Dynamic Search & Filter DSL (`/api/search`)

### `POST /api/search/{entity}`
- **Entities supported**: `organisations`, `projects`, `events`
- **Request Structure**:
  ```json
  {
    "filters": [
      { "field": "partnership_status", "operator": "eq", "value": "active" },
      { "field": "state", "operator": "eq", "value": "QLD" }
    ],
    "relation_filters": [
      { "relation": "projects", "condition": "has_any" }
    ]
  }
  ```

### Supported Operators:
- `eq`: Exact equality
- `neq`: Not equal
- `contains`: Substring match
- `starts_with`: Prefix match
- `ends_with`: Suffix match
- `gt`, `gte`, `lt`, `lte`: Numeric/Date comparisons
- `is_null`, `is_not_null`: Null checks

### Saved Filters:
- `GET /api/search/filters`: List user's saved filter configurations.
- `POST /api/search/filters`: Save a filter configuration.
- `DELETE /api/search/filters/{id}`: Delete a saved filter.

---

## 7. Audit Log Endpoints (`/api/auditlog`)

### `GET /api/auditlog`
- **Access**: `admin` only
- **Query Parameters**: `action`, `tableName`, `changedBy`, `from`, `to`, `page`, `pageSize` (max 1000).
- **Response `200 OK`**: Paginated audit events including old/new JSON snapshots.
