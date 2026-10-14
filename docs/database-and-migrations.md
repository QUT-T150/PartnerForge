# Database Schema & Migrations

This document covers the MySQL database architecture, relational entity catalog, analytics views, and migration workflows for PartnerForge.

---

## 1. Relational Architecture

The database runs on **MySQL 8.4 Server** with the `InnoDB` storage engine and `utf8mb4_unicode_ci` character collation.

### Entity Catalog

| Table | Primary Key | Key Foreign Keys & Relations | Description |
|---|---|---|---|
| `users` | `char(36)` (UUID) | `role_id -> roles.id`, `faculty_id -> faculties.id`, `organisation_id -> organisations.id` | User accounts, credentials, active state, and role assignments. |
| `roles` | `int` Auto-inc | - | 5-role RBAC hierarchy (`admin`, `course_organiser`, `industry_partner`, `industry_team`, `industry_team_manager`). |
| `faculties` | `int` Auto-inc | - | QUT academic faculty lookup (e.g. Science, Engineering, Business & Law). |
| `industries` | `int` Auto-inc | - | ANZIC industry category classifications. |
| `organisations` | `char(36)` (UUID) | `industry_id -> industries.id`, `primary_contact_id -> contacts.id` | Industry partner directory, registration IDs, ABNs, and partnership status. |
| `contacts` | `char(36)` (UUID) | `organisation_id -> organisations.id` | Primary liaisons and supervisors representing partner organisations. |
| `projects` | `char(36)` (UUID) | `organisation_id -> organisations.id`, `contact_id -> contacts.id`, `faculty_id -> faculties.id` | Capstone, undergraduate, and postgrad projects across semesters. |
| `project_applications` | `char(36)` (UUID) | `organisation_id -> organisations.id`, `proposed_faculty_id -> faculties.id` | Partner project proposals submitted for academic review and approval. |
| `events` | `char(36)` (UUID) | `faculty_id -> faculties.id` | Networking showcases, capstone expos, and meeting history. |
| `event_attendances` | `char(36)` (UUID) | `event_id -> events.id`, `contact_id -> contacts.id` | RSVP tracking and attendance records. |
| `saved_filters` | `char(36)` (UUID) | `user_id -> users.id` | User-saved dynamic filter presets across entity tables. |
| `refresh_tokens` | `char(36)` (UUID) | `user_id -> users.id` | SHA-256 hashed single-use tokens for secure session rotation. |
| `permissions` | `int` Auto-inc | - | Granular permission capabilities (`users`, `partners`, `projects`, `applications`, `events`, `upload`, `analytics`). |
| `role_permissions` | `int` Auto-inc | `role_id -> roles.id`, `permission_id -> permissions.id` | Permission matrix mappings (`rw`, `r`, `no`). |
| `audit_log` | `bigint` Auto-inc | `changed_by -> users.id` | Immutable audit trail capturing user, action, timestamp, and JSON delta snapshots. |

---

## 2. Analytics Views

Three optimized SQL views are built into the schema for reporting and dashboard charts:

1. **`v_organisation_stats`**:
   Aggregates partner organisations with total project count, active project count, completed project count, event attendance count, and multi-year longevity.
2. **`v_intake_summary`**:
   Groups capstone project allocations across teaching periods (`year`, `semester`), total project volumes, and multi-team allocations.
3. **`v_most_active_partners_3yr`**:
   Ranks top partner organisations by project and student sponsorship volume over the rolling 3-year window.

---

## 3. Database Initialization & Migration Workflow

### Fresh Deployments
The authoritative schema definition is maintained in [Schema/schema.sql](file:///C:/QUT/Year%203/CAB398/Cobble_Project/Schema/schema.sql).
- It creates all 15 tables, 3 views, primary keys, and composite indices.
- Fresh Docker or cloud deployments (such as Railway) **only need to run `schema.sql`**.

> [!IMPORTANT]
> Do **not** re-run migration scripts on top of a fresh `schema.sql`. `schema.sql` is already consolidated and includes all migration columns (including `refresh_tokens`, `saved_filters`, and extended partner fields).

### Incremental Migrations
Migrations are stored in `Schema/migrations/` using chronological timestamp naming:
`YYYYMMDD_description.sql` (e.g. `20260906_refresh_tokens.sql`).

#### Applying an Incremental Migration to Local Docker:
```bash
docker exec -i qpf-db mysql -u qut_partnerforge -pchangeme_local_only qut_partnerforge < Schema/migrations/your_migration.sql
```

#### Applying Migrations on Railway Cloud:
```bash
railway connect MySQL --tunnel-only -P 3307
# In another terminal or database GUI:
mysql -h 127.0.0.1 -P 3307 -u root -p railway < Schema/migrations/your_migration.sql
```

### Full Local Reset (Clean Volume)
To start with a completely fresh database populated with demo seed data:
```bash
docker compose down -v
docker compose up -d
```
The MySQL container automatically executes `Schema/schema.sql` on first startup.
