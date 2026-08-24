# Database Schema & Migrations

This document covers the MySQL database architecture, entity relationships, analytical summary views, and the database migration workflow for PartnerForge.

---

## 1. Relational Architecture

The database runs on **MySQL 8.4 Server** with the `InnoDB` storage engine and `utf8mb4_unicode_ci` character collation.

### Entity Catalog

| Table | Primary Key | Foreign Keys & Relations | Description |
|---|---|---|---|
| `users` | `char(36)` (UUID) | `role_id -> roles.id`, `faculty_id -> faculties.id`, `organisation_id -> organisations.id` | User accounts and authentication credentials. |
| `roles` | `int` Auto-inc | - | System role definitions (`admin`, `course_organiser`, `industry_partner`). |
| `faculties` | `int` Auto-inc | - | QUT academic faculty lookup (e.g. Science, Business & Law). |
| `industries` | `int` Auto-inc | - | ANZIC industry categories. |
| `organisations` | `char(36)` (UUID) | `industry_id -> industries.id`, `primary_contact_id -> contacts.id` | Industry partner company directory and partnership statuses. |
| `contacts` | `char(36)` (UUID) | `organisation_id -> organisations.id` | Contact personnel representing partner organisations. |
| `projects` | `char(36)` (UUID) | `organisation_id -> organisations.id`, `contact_id -> contacts.id`, `faculty_id -> faculties.id` | Active and past capstone projects. |
| `project_applications` | `char(36)` (UUID) | `organisation_id -> organisations.id`, `proposed_faculty_id -> faculties.id` | Industry partner project proposals. |
| `events` | `char(36)` (UUID) | `faculty_id -> faculties.id` | Networking and showcase events. |
| `event_attendances` | `char(36)` (UUID) | `event_id -> events.id`, `contact_id -> contacts.id` | RSVP attendance tracking. |
| `saved_filters` | `char(36)` (UUID) | `user_id -> users.id` | User-saved dynamic filter presets. |
| `audit_logs` | `bigint` Auto-inc | `changed_by -> users.id` | Immutable audit log capturing row mutations. |

---

## 2. Analytics Views

Three SQL views are built into the database schema for reporting:

1. **`v_partner_engagement_summary`**:
   Aggregates partner organisations by active project counts, completed projects, attendance records, and engagement scoring.
2. **`v_project_pipeline_status`**:
   Summary of proposal pipeline across stages (`pending`, `under_review`, `approved`, `active`, `completed`).
3. **`v_curriculum_distribution`**:
   Distribution of projects and applications across discipline areas, semesters, and teaching years.

---

## 3. Migration Workflow

Migrations are SQL scripts stored in `Schema/migrations/` using chronological timestamp naming:
`YYYYMMDD_author_description.sql` (e.g., `20260824_bruce_add_notes_columns.sql`).

### Creating a New Migration
1. Create a new SQL file under `Schema/migrations/`.
2. Write idempotent SQL statements (e.g. `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS notes TEXT;`).
3. Update `Schema/schema.sql` so fresh installations reflect the new schema.

### Applying Migrations Locally (Running Docker Container)
```bash
docker exec -i qpf-db mysql -u qpf -pqpf_dev_secret partnerforge < Schema/migrations/your_migration.sql
```

### Full Database Reset (Fresh Volume)
To start with a completely fresh database populated with initial seeds:
```bash
docker compose down -v
docker compose up -d
```
Docker will initialize the database from `Schema/schema.sql` and run any startup initialization scripts in `/docker-entrypoint-initdb.d`.
