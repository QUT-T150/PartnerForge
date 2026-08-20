#!/usr/bin/env python3
"""
Generates Schema/seed_demo.sql — the demo dataset for issue #58.

Source data comes from test-data/csv-samples/ (multi-year fixtures originally
written for the CSV import work, #25/#27) so the seed and the importer stay
consistent with each other.

NOTE: those fixtures are deliberately NOT committed on this branch - they live
on feature/csv-upload and arrive with that PR. Committing a second copy here
would collide with it. The generated Schema/seed_demo.sql is self-contained and
needs nothing at runtime; you only need the fixtures to RE-generate. Until that
branch lands:

    git checkout origin/feature/csv-upload -- test-data/

The dataset is shaped deliberately, not randomly. Partners are assigned a
"first engagement year" and a project count so that the questions the
stakeholder actually asks (recorded on #34) have real answers:

  * "projects by a partner that's been with us the last five years"
        -> tier A partners run 2022..2026
  * "who's given us the most projects"
        -> project counts are deliberately uneven
  * "did they give it to us this year"
        -> tier C partners appear only in 2026

Deterministic: UUIDs are uuid5-derived, so re-running produces identical SQL
and re-seeding a database yields the same ids.

Usage:  python3 scripts/generate_seed.py
"""
import csv, pathlib, uuid

ROOT = pathlib.Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "test-data" / "csv-samples"
OUT = ROOT / "Schema" / "seed_demo.sql"

NS = uuid.UUID("6f9619ff-8b86-d011-b42d-00c04fc964ff")
def uid(kind, key):
    return str(uuid.uuid5(NS, f"partnerforge:{kind}:{key}"))

def q(v):
    """SQL string literal, or NULL."""
    if v is None or v == "":
        return "NULL"
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"

# ---------------------------------------------------------------- source data

with open(SAMPLES / "organisations_multiyear.csv", newline="", encoding="utf-8") as f:
    ORGS_CSV = list(csv.DictReader(f))
with open(SAMPLES / "events_multiyear.csv", newline="", encoding="utf-8") as f:
    EVENTS_CSV = list(csv.DictReader(f))
with open(SAMPLES / "projects_multiyear.csv", newline="", encoding="utf-8") as f:
    PROJECTS_CSV = list(csv.DictReader(f))

# industry name -> seeded industries.id
IND = {"IT / Software": 1, "Finance / Banking": 2, "Health / Medical": 3,
       "Government": 4, "Education": 5, "Retail / SME": 6, "Manufacturing": 7,
       "Energy / Utilities": 8, "Telecommunications": 9, "Other": 10}
# faculty code -> seeded faculties.id
FAC = {"SCI": 1, "ENG": 2, "BUS": 3, "HLTH": 4, "CI": 5, "IT": 6}

# name -> (industry_id, faculty_id, first_year, project_count, partnership_status)
# tier A = 5-year partners, tier B = mid, tier C = this year only
PROFILE = {
    # --- tier A: long-standing, high volume -------------------------------
    "TechCorp Australia":      (IND["IT / Software"],       FAC["IT"],  2022, 8, "active"),
    "DataSphere Solutions":    (IND["IT / Software"],       FAC["IT"],  2022, 7, "active"),
    "Alpha Robotics Ltd":      (IND["Manufacturing"],       FAC["ENG"], 2022, 6, "active"),
    # --- tier B: mid-length ------------------------------------------------
    "BioHealth Labs":          (IND["Health / Medical"],    FAC["HLTH"],2023, 4, "active"),
    "CyberGuard Defence":      (IND["Government"],          FAC["IT"],  2023, 3, "active"),
    "Beta Analytics":          (IND["Finance / Banking"],   FAC["BUS"], 2023, 3, "active"),
    "Gamma BioTech":           (IND["Health / Medical"],    FAC["SCI"], 2023, 2, "completed"),
    "EcoGrid Energy":          (IND["Energy / Utilities"],  FAC["ENG"], 2024, 3, "active"),
    "Quantum Dynamics":        (IND["Other"],               FAC["SCI"], 2024, 2, "active"),
    "Delta Cyber Security":    (IND["IT / Software"],       FAC["IT"],  2024, 2, "active"),
    "Epsilon Green Systems":   (IND["Energy / Utilities"],  FAC["ENG"], 2024, 2, "inactive"),
    # --- tier C: recent ----------------------------------------------------
    "AgriTech Robotics":       (IND["Manufacturing"],       FAC["ENG"], 2025, 2, "active"),
    "FinTech Pioneers":        (IND["Finance / Banking"],   FAC["BUS"], 2025, 1, "active"),
    "Zeta Health Tech":        (IND["Health / Medical"],    FAC["HLTH"],2025, 1, "active"),
    "Eta Aerospace":           (IND["Manufacturing"],       FAC["ENG"], 2025, 1, "completed"),
    "NextGen AI Hub":          (IND["Education"],           FAC["IT"],  2026, 1, "active"),
    "Theta Quantum":           (IND["Other"],               FAC["SCI"], 2026, 1, "active"),
    "Iota Financial AI":       (IND["Finance / Banking"],   FAC["BUS"], 2026, 1, "prospect"),
    "Kappa Marine Systems":    (IND["Other"],               FAC["ENG"], 2026, 0, "prospect"),
    "Oceanic Robotics":        (IND["Telecommunications"],  FAC["ENG"], 2026, 0, "prospect"),
}

# contact + address detail, keyed by organisation name
DETAIL = {}
for r in ORGS_CSV:
    DETAIL[r["Organisation Name"].strip()] = dict(
        address=r["Address"], abn=r["ABN"],
        contact=r["Industry Supervisor's Name"],
        title=r["Industry Supervisor's Position Title"],
        phone=r["Business Phone"], email=r["Business Email"],
        info=r["Organisation Information"])
for r in EVENTS_CSV:
    n = r["Organisation"].strip()
    DETAIL.setdefault(n, dict(
        address=None, abn=None,
        contact=r["Best contact person to liaise with on this event"],
        title=r["Position Title"], phone=None, email=r["Email"],
        info=None))

SEM = ["S1", "S2", "SS"]
PTYPE = ["capstone", "capstone", "capstone", "undergrad", "postgrad"]
THEMES = [(r["Project Title"], r["Description" if "Description" in r else "Project Description"],
           r["Project Partner Agreement"],
           r["Student Project Agreement - IP Licence/Assignment"]) for r in PROJECTS_CSV]

# Distinguishes repeat engagements on the same theme. Real capstone portfolios
# do revisit a theme year on year, so this reads naturally rather than looking
# like padded test data.
PHASES = ["Prototype", "Phase 2", "Pilot Deployment", "Field Trial",
          "Scale-Up", "Integration", "Phase 3", "Optimisation"]

_used_titles = set()

def theme_title(base, year, sem):
    """Strip the year the fixture bakes in, re-stamp, and guarantee uniqueness."""
    stem = base.rsplit(" ", 1)[0] if base.rsplit(" ", 1)[-1].isdigit() else base
    candidate = f"{stem} ({sem} {year})"
    i = 0
    while candidate in _used_titles:
        candidate = f"{stem} \u2014 {PHASES[i % len(PHASES)]} ({sem} {year})"
        i += 1
    _used_titles.add(candidate)
    return candidate

CUR_YEAR = 2026
lines = []
w = lines.append

w("-- =============================================================================")
w("-- PartnerForge demo dataset  (issue #58)")
w("--")
w("-- GENERATED FILE - do not edit by hand.")
w("--   regenerate:  python3 scripts/generate_seed.py")
w("--   source data: test-data/csv-samples/*.csv")
w("--")
w("-- 20 industry partners, 50 projects, 10 events, all linked, spanning 2022-2026.")
w("-- Partner longevity and project volume are deliberately uneven so the questions")
w("-- recorded on #34 are answerable through the filters.")
w("--")
w("-- Apply to a running stack:")
w("--   docker exec -i qpf-db mysql -uqut_partnerforge -p<pw> qut_partnerforge < Schema/seed_demo.sql")
w("-- =============================================================================")
w("")
w("SET FOREIGN_KEY_CHECKS = 0;")
w("SET @admin := (SELECT id FROM users WHERE email = 'admin@system.com' LIMIT 1);")
w("")
w("-- WARNING: this wipes ALL partner data in the target database, not just rows")
w("-- this script inserted. It is a demo seeder - never run it against anything")
w("-- holding work you care about.")
w("DELETE FROM event_attendances;")
w("DELETE FROM project_applications;")
w("DELETE FROM events;")
w("DELETE FROM projects;")
w("DELETE FROM contacts;")
w("DELETE FROM organisations;")
w("DELETE FROM saved_filters;")
w("SET FOREIGN_KEY_CHECKS = 1;")
w("")

# ---------------------------------------------------------------- organisations
w("-- --------------------------------------------------------------- organisations")
org_ids, seq = {}, 0
for name, (ind, fac, first_year, n_proj, status) in PROFILE.items():
    seq += 1
    oid = uid("org", name)
    org_ids[name] = (oid, ind, fac, first_year, n_proj)
    d = DETAIL.get(name, {})
    reg = f"REG-{first_year}-{1000 + seq}"
    w(f"INSERT INTO organisations (id, registration_id, name, legal_name, abn, industry_id, "
      f"website, phone, email, address_line1, city, state, country, organisation_information, "
      f"partnership_status, submission_status, created_by, updated_by) VALUES")
    website = f"https://www.{name.lower().replace(' ', '').replace('.', '')}.com.au"
    w(f"  ({q(oid)}, {q(reg)}, {q(name)}, {q(name + ' Pty Ltd')}, {q(d.get('abn'))}, {ind}, "
      f"{q(website)}, {q(d.get('phone'))}, {q(d.get('email'))}, {q(d.get('address'))}, "
      f"{q('Brisbane')}, {q('QLD')}, {q('Australia')}, {q(d.get('info'))}, "
      f"{q(status)}, 'approved', @admin, @admin);")
w("")

# ---------------------------------------------------------------- contacts
w("-- -------------------------------------------------------------------- contacts")
for name in PROFILE:
    d = DETAIL.get(name, {})
    if not d.get("contact"):
        continue
    oid = org_ids[name][0]
    full = d["contact"]
    first, _, last = full.partition(" ")
    w(f"INSERT INTO contacts (id, organisation_id, first_name, last_name, job_title, "
      f"email, phone, is_primary, created_by, updated_by) VALUES")
    w(f"  ({q(uid('contact', name))}, {q(oid)}, {q(first)}, {q(last or first)}, "
      f"{q(d.get('title'))}, {q(d.get('email'))}, {q(d.get('phone'))}, 1, @admin, @admin);")
w("")

# ---------------------------------------------------------------- projects
w("-- -------------------------------------------------------------------- projects")
total = 0
for name, (oid, ind, fac, first_year, n_proj) in org_ids.items():
    for i in range(n_proj):
        # spread this partner's projects evenly across first_year..2026
        span = CUR_YEAR - first_year + 1
        year = first_year + (i % span)
        sem = SEM[i % 3]
        ptype = PTYPE[(i + fac) % len(PTYPE)]
        base, desc, ppa, spa = THEMES[(total + i) % len(THEMES)]
        title = theme_title(base, year, sem)
        status = "completed" if year < CUR_YEAR else "ongoing"
        start = f"{year}-{'02' if sem == 'S1' else '07' if sem == 'S2' else '11'}-01"
        end = f"{year}-{'06' if sem == 'S1' else '11' if sem == 'S2' else '12'}-30"
        w(f"INSERT INTO projects (id, title, description, organisation_id, faculty_id, "
          f"project_type, semester, year, status, start_date, end_date, multiple_teams, "
          f"discipline_area, project_partner_agreement, student_project_agreement, "
          f"created_by, updated_by) VALUES")
        w(f"  ({q(uid('project', f'{name}:{i}'))}, {q(title)}, {q(desc)}, {q(oid)}, {fac}, "
          f"{q(ptype)}, {q(sem)}, {year}, {q(status)}, {q(start)}, {q(end)}, "
          f"{1 if i % 4 == 0 else 0}, {q('Information Technology')}, {q(ppa)}, {q(spa)}, "
          f"@admin, @admin);")
        total += 1
w("")
# ---------------------------------------------------------------- events
w("-- ---------------------------------------------------------------------- events")
w("-- Events carry attendances linking back to organisations, so the demo can walk")
w("-- Industry Partner -> Projects -> Events without a dead end.")
ev_ids = []
for r in EVENTS_CSV:
    ev_name = r["Events Invited to"].strip()
    year = int(ev_name.rsplit(" ", 1)[-1]) if ev_name.rsplit(" ", 1)[-1].isdigit() else CUR_YEAR
    eid = uid("event", ev_name)
    ev_ids.append((eid, ev_name, r))
    etype = ("Showcase" if "Showcase" in ev_name else
             "Conference" if "Conference" in ev_name or "Summit" in ev_name else
             "Expo" if "Expo" in ev_name else "Networking")
    fac = FAC["IT"] if any(k in ev_name for k in ("IT", "Cyber", "AI", "Data")) else FAC["ENG"]
    w(f"INSERT INTO events (id, name, description, event_type, event_date, location, "
      f"faculty_id, created_by, updated_by) VALUES")
    w(f"  ({q(eid)}, {q(ev_name)}, {q(f'{etype} bringing QUT students together with industry partners.')}, "
      f"{q(etype)}, {q(f'{year}-09-15')}, {q('QUT Gardens Point, Brisbane')}, {fac}, @admin, @admin);")
w("")

w("-- ---------------------------------------------------------- event attendances")
for eid, ev_name, r in ev_ids:
    org_name = r["Organisation"].strip()
    if org_name not in org_ids:
        continue
    oid = org_ids[org_name][0]
    w(f"INSERT INTO event_attendances (id, event_id, organisation_id, first_name, "
      f"best_contact_name, position_title, email, list_name, source, events_invited_to, "
      f"response, created_by, updated_by) VALUES")
    w(f"  ({q(uid('att', f'{ev_name}:{org_name}'))}, {q(eid)}, {q(oid)}, "
      f"{q(r['First Name'])}, {q(r['Best contact person to liaise with on this event'])}, "
      f"{q(r['Position Title'])}, {q(r['Email'])}, {q(r['List'])}, {q(r['Source'])}, "
      f"{q(ev_name)}, {q(r['Response'])}, @admin, @admin);")
w("")

# Give the long-standing partners attendance at more than one event, so the
# Partner -> Events relationship isn't uniformly one-to-one.
w("-- Extra attendances for the long-standing partners (multi-event history).")
extra = [("Alpha Robotics Ltd", 0), ("Alpha Robotics Ltd", 4),
         ("Beta Analytics", 1), ("Gamma BioTech", 2),
         ("Delta Cyber Security", 3), ("Epsilon Green Systems", 4),
         ("Zeta Health Tech", 6), ("Eta Aerospace", 7),
         ("Theta Quantum", 8), ("Iota Financial AI", 7),
         ("Kappa Marine Systems", 9)]
for org_name, ev_idx in extra:
    if org_name not in org_ids:
        continue
    eid, ev_name, r = ev_ids[ev_idx]
    oid = org_ids[org_name][0]
    d = DETAIL.get(org_name, {})
    contact = d.get("contact") or "Partner Representative"
    w(f"INSERT IGNORE INTO event_attendances (id, event_id, organisation_id, first_name, "
      f"best_contact_name, position_title, email, list_name, source, events_invited_to, "
      f"response, created_by, updated_by) VALUES")
    w(f"  ({q(uid('att', f'{ev_name}:{org_name}'))}, {q(eid)}, {q(oid)}, "
      f"{q(contact.split(' ')[0])}, {q(contact)}, {q(d.get('title'))}, {q(d.get('email'))}, "
      f"{q(ev_name)}, {q('Partner Outreach')}, {q(ev_name)}, {q('Attending')}, @admin, @admin);")
w("")

w(f"-- Seeded: {len(PROFILE)} organisations, {total} projects, {len(ev_ids)} events.")
w("SELECT")
w("  (SELECT COUNT(*) FROM organisations)     AS organisations,")
w("  (SELECT COUNT(*) FROM contacts)          AS contacts,")
w("  (SELECT COUNT(*) FROM projects)          AS projects,")
w("  (SELECT COUNT(*) FROM events)            AS events,")
w("  (SELECT COUNT(*) FROM event_attendances) AS attendances;")

OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)}")
print(f"  organisations : {len(PROFILE)}")
print(f"  projects      : {total}")
print(f"  events        : {len(ev_ids)}")
