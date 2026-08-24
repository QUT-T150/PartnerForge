# Manual CSV Test Files

Sample CSV files for manual testing of the CSV upload and column mapping functionality in the dashboard (`/dashboard`).

## Files

| File | Target | Description |
|---|---|---|
| `01_industry_partners_standard.csv` | Industry Partners | Standard format with Australian addresses, contacts, ABNs, and registration IDs. |
| `02_industry_partners_custom_headers.csv` | Industry Partners | Non-standard headers (`Enterprise Name`, `Business Number`, `Physical Location`, etc.) to test column mapping dropdowns. |
| `03_organisations_standard.csv` | Organisation | Standard organisation fields, phone, email, notes, and company info. |
| `04_projects_standard.csv` | Projects | Standard project records with descriptions, PPA/SPA agreements, notes, and status. |
| `05_projects_custom_headers.csv` | Projects | Custom headers (`Capstone Title`, `Abstract`, `PPA Document`, `Special Remarks`) to test mapping. |
| `06_events_attendances.csv` | Events | Event attendance records with contact persons, organisations, event names, and responses. |
| `07_project_applications.csv` | Project Applications | Proposal records with semester, year, project types, and IP rationale. |
| `08_users_import.csv` | Users | User account records with roles and passwords. |
| `09_address_and_notes_edge_cases.csv` | Industry Partners | Addresses across multiple Australian states (QLD, NSW, VIC, WA, SA, TAS, ACT) and multiline notes with special characters. |

## Testing Steps

### 1. Standard Import & Modal Population
1. Open `/dashboard` and navigate to CSV upload.
2. Select **Industry Partners** and upload `01_industry_partners_standard.csv`.
3. Verify that headers auto-map and import the records.
4. Go to `/platform` > **Industry Partners** and open the edit modal for `TechCorp Australia`.
5. Verify that address line 1, city, state, postcode, notes, and contacts are all populated in their respective form inputs.

### 2. Custom Column Mapping
1. Select **Industry Partners** and upload `02_industry_partners_custom_headers.csv`.
2. Map `Enterprise Name` -> `Name`, `Business Number` -> `Abn`, `Physical Location` -> `AddressLine1`, `Internal Notes` -> `Notes`.
3. Import records and confirm they appear under `/platform`.
