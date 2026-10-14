# Request validation rules

Decision record and reference for #42 (input validation audit).

## How it works

Every request record in `api/.../Models/Dto.cs` carries DataAnnotations on its positional
parameters. All controllers have `[ApiController]`, so ASP.NET Core validates the body before
the action runs and returns **400** with a `ValidationProblemDetails` body, for example:

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "Name": ["The field Name must be a string or array type with a maximum length of '255'."] }
}
```

Before this change, none of the request DTOs had rules: an oversized string or a value outside a
database `CHECK` constraint reached MySQL and came back as a **500**.

String limits mirror the column sizes in `Schema/schema.sql`. Allowed values mirror the `CHECK`
constraints. Shared constants and two custom attributes live in `Models/Validation.cs`:

- `ValidationLimits.LongText` = 16,000 characters for `TEXT` columns (65,535 bytes ÷ 4 bytes per
  utf8mb4 character, rounded down).
- `[OptionalEmail]`: null, empty or whitespace is valid (the edit form posts `""` for a blank
  field); anything else must be a valid address with no spaces.
- `[Password]`: null or empty means "not supplied"; otherwise 8–128 characters.

## Rules by request

Fields not listed have no rule beyond their type.

### `SaveOrganisationRequest`

| Field | Rule |
|---|---|
| Name | required, ≤ 255 |
| PartnershipStatus | required, one of `prospect`, `active`, `completed`, `inactive` |
| RegistrationId | ≤ 100 |
| Abn, Postcode | ≤ 20 |
| Email, PrimaryContactEmail | ≤ 255, valid email if present |
| Phone, PrimaryContactPhone | ≤ 50 |
| Website, AddressLine1/2, PrimaryContactPosition | ≤ 255 |
| City, State, Country | ≤ 100 |
| PrimaryContactName | ≤ 200 (split into first/last name, 100 each) |
| IndustryId | ≥ 1 if present |
| OrganisationInformation, Notes | ≤ 16,000 |

### `SaveProjectRequest`

| Field | Rule |
|---|---|
| Title | required, ≤ 500 |
| ProjectType | required, one of `capstone`, `undergrad`, `postgrad` |
| Semester | required, one of `S1`, `S2`, `SS` |
| Year | 2019–2100 |
| Status | required, one of `proposed`, `ongoing`, `completed`, `cancelled` |
| EndDate | on or after StartDate (when both are set) |
| DisciplineArea, SecondaryItDiscipline | ≤ 255 |
| FacultyId | ≥ 1 if present |
| Description, ProjectDeliverables, ProjectPartnerAgreement, StudentProjectAgreement, IpAssignmentRationale, Notes | ≤ 16,000 |

### `SaveProjectApplicationRequest`

| Field | Rule |
|---|---|
| ProposedTitle | required, ≤ 500 |
| ProposedProjectType | optional; if set, `capstone` / `undergrad` / `postgrad` |
| ProposedSemester | optional; if set, `S1` / `S2` / `SS` |
| ProposedYear | optional; if set, 2019–2100 |
| ProposedDisciplineArea, ProposedSecondaryItDiscipline | ≤ 255 |
| ProposedFacultyId | ≥ 1 if present |
| ProposedDescription, ProposedDeliverables, StudentProjectAgreement, IpAssignmentRationale | ≤ 16,000 |

### `SaveEventRequest` / `SaveEventAttendanceRequest`

| Field | Rule |
|---|---|
| Event Name | required, ≤ 255 |
| EventType | ≤ 50 |
| Location | ≤ 255 |
| FacultyId | ≥ 1 if present |
| Description, Notes, EventsInvitedTo | ≤ 16,000 |
| Attendance FirstName | ≤ 100 |
| Attendance Email | ≤ 255, valid email if present |
| Attendance OrganisationName, BestContactName, PositionTitle, ListName, Source, Response | ≤ 255 |

### Users and auth

| Request | Field | Rule |
|---|---|---|
| `SaveUserRequest` | Email | required, ≤ 255, valid email |
| | Password | optional (required on create by the controller); if set, 8–128 |
| | FullName | required, ≤ 255 |
| | Role | required, ≤ 50 (the controller checks it is a real role) |
| `RegisterUserRequest` | Email | required, ≤ 255, valid email |
| | Password | required, 8–128 |
| `LoginRequest` | Email | required, ≤ 255 |
| | Password | required, ≤ 128 |
| `RefreshRequest` | RefreshToken | required, ≤ 512 |

Login deliberately does **not** check the email format or password length policy: a bad
login should still look like a normal "invalid email or password" 401.

## For the frontend (#50)

The edit forms in `platform/page.tsx` already send exactly the allowed values for every select.
Client-side checks can mirror the tables above. The API's `errors` object gives the failing
field names, so the form can show the message next to each input.

## Known follow-ups

- **CSV importer defaults** (`frontend/helper/upload-core.ts`): projects default to
  `ProjectType: "Capstone"` and `Semester: "Semester 1"`, which were never valid for the
  database `CHECK` constraints. A projects CSV without those columns used to fail with a 500;
  it now fails with a 400 naming the field. The defaults should become `capstone` / `S1`, or
  the importer should map common spellings.
- **Batch endpoints** (`POST /organisations/batch`, `/projects/batch`) validate every row; one
  invalid row rejects the whole batch, as a database error did before. Per-row error reporting
  would be an importer improvement.
- `SearchRequest` / `SaveFilterRequest` are validated inside `SearchController` and were left
  as they are.
