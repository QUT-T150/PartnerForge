# Manual CSV Upload Test Data Suite

This directory contains test CSV files designed for manual testing of the CSV Upload and Interactive Column Mapping system in the Bulk CSV Import Center (`/dashboard`).

---

## Test Files Overview

| # | File Name | Target Category | Purpose & Features Tested |
|---|---|---|---|
| **01** | [`01_industry_partners_standard.csv`](./01_industry_partners_standard.csv) | **Industry Partners** | Standard format with Australian addresses, contacts, ABNs, and registration IDs. Auto-detects 100% of headers. Tests address splitting into Suburb, State, and Postcode. |
| **02** | [`02_industry_partners_custom_headers.csv`](./02_industry_partners_custom_headers.csv) | **Industry Partners** | Non-standard column headers (`Tracking Code`, `Enterprise Name`, `Business Number`, `Physical Location`, `Lead Supervisor`, `Supervisor Role`, `Mobile Contact`, `Internal Notes`). Tests the Interactive Column Mapping dropdowns and custom mapping validation. |
| **03** | [`03_organisations_standard.csv`](./03_organisations_standard.csv) | **Organisation** | Standard organisation format with industry supervisor titles, business phones, notes, and company information. |
| **04** | [`04_projects_standard.csv`](./04_projects_standard.csv) | **Projects** | Standard project records with descriptions, PPA and SPA agreements, notes, and status fields. |
| **05** | [`05_projects_custom_headers.csv`](./05_projects_custom_headers.csv) | **Projects** | Non-standard project headers (`Capstone Title`, `Abstract`, `PPA Document`, `IP Agreement Details`, `Term`, `Calendar Year`, `Special Remarks`). Tests user-defined column selection and defaults. |
| **06** | [`06_events_attendances.csv`](./06_events_attendances.csv) | **Events** | Event attendance and RSVP records linking contact persons, organisations, event titles, and notes. |
| **07** | [`07_project_applications.csv`](./07_project_applications.csv) | **Project Applications** | Partner proposal submissions with proposed semesters, year, project types, and IP rationale. |
| **08** | [`08_users_import.csv`](./08_users_import.csv) | **Users** | Account onboarding records with roles (`course_organiser`, `industry_partner`, `admin`) and initial passwords. |
| **09** | [`09_address_and_notes_edge_cases.csv`](./09_address_and_notes_edge_cases.csv) | **Industry Partners** | Multi-state Australian addresses (QLD, NSW, VIC, WA, SA, TAS, ACT) with unit/suite numbers, level prefixes, country suffixes, and complex multi-sentence notes with special characters. |

---

## Manual Testing Step-by-Step Guide

### Test Case 1: Standard Auto-Detection & Address Splitting
1. Navigate to `/dashboard` $\rightarrow$ **Bulk CSV Import**.
2. Under **1. Select Target Category**, choose **Industry Partners**.
3. Under **2. Upload CSV File**, upload [`01_industry_partners_standard.csv`](./01_industry_partners_standard.csv).
4. Verify that:
   - Column Mapping table automatically matches all system fields.
   - Status badge displays **"Ready to import"**.
5. Click **Run Dry-Run Simulation** $\rightarrow$ Check simulation results.
6. Click **Import CSV to Database**.
7. Navigate to `/platform` $\rightarrow$ **Industry Partners**.
8. Click **Edit** on `TechCorp Australia` or `BioHealth Labs`.
9. **Verify Modal Fields:**
   - **Address Line 1**: `123 Innovation Way` (or `Suite 4, 78 Science Park`)
   - **City / Suburb**: `Brisbane` (or `Fortitude Valley`)
   - **State**: `QLD`
   - **Postcode**: `4000` (or `4006`)
   - **Notes**: Loaded and visible in the Notes textarea.
   - **Contact details**: Supervisor name, email, phone, and position title are pre-filled.

---

### Test Case 2: Custom Column Header Mapping
1. Select **Industry Partners** as category.
2. Upload [`02_industry_partners_custom_headers.csv`](./02_industry_partners_custom_headers.csv).
3. Verify that under **3. Match CSV Columns to System Fields**, you can map:
   - `Name` $\rightarrow$ `Enterprise Name`
   - `Abn` $\rightarrow$ `Business Number`
   - `AddressLine1` $\rightarrow$ `Physical Location`
   - `PrimaryContactName` $\rightarrow$ `Lead Supervisor`
   - `PrimaryContactPosition` $\rightarrow$ `Supervisor Role`
   - `PrimaryContactEmail` $\rightarrow$ `Supervisor Email`
   - `Phone` $\rightarrow$ `Mobile Contact`
   - `Notes` $\rightarrow$ `Internal Notes`
4. Click **Import CSV to Database** $\rightarrow$ Verify import succeeds.
5. In `/platform`, verify `AeroSpace Dynamics` and `BioGen Therapeutics` are created with all fields and notes.

---

### Test Case 3: Project Notes & Field Mapping
1. Select **Projects** as category.
2. Upload [`04_projects_standard.csv`](./04_projects_standard.csv) (or [`05_projects_custom_headers.csv`](./05_projects_custom_headers.csv)).
3. Import the records.
4. In `/platform` $\rightarrow$ **Projects**, click **Edit** on any project.
5. Verify the **Notes** textarea contains the project notes and all agreements / semesters are populated.
