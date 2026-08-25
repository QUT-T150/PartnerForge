# Issues / Blockers to Address in Meeting

Standing agenda of decisions and stakeholder inputs that are blocking upcoming epics.
Raise these at the next team meeting (and the stakeholder meeting where marked).
Last updated: 2026-08-06 (week 4).

## Blocking Sprint 2 work right now

### 1. CSV import: sample spreadsheets + field mapping — needs Shailesh
[#24](https://github.com/QUT-T150/PartnerForge/issues/24) · blocks the whole CSV import epic
[#3](https://github.com/QUT-T150/PartnerForge/issues/3) (#25–#29, **priority: critical**, Sprint 2)

We cannot design validation, dedup rules, or the field mapping without real
spreadsheets. Every week this sits idle the epic slips a sprint. **Ask:** sample
files (all variants in circulation) and agreement on which columns map to which
`organisations` / `contacts` / `projects` fields.

### 2. Role permission matrix for the two new roles — team decision
[#30](https://github.com/QUT-T150/PartnerForge/issues/30) · blocks the role taxonomy epic
[#4](https://github.com/QUT-T150/PartnerForge/issues/4) (#31–#33, Sprint 2)

`industry_team` and `industry_team_manager` need an agreed permission set vs
`course_organiser` before the migration and RBAC changes can be written.
**Ask:** 30 minutes with the permission matrix on screen; record the decision on #30.
Include: should `industry_team_manager` get read access to the new audit log page?

### 3. PR #55 review — one approver needed
[PR #55](https://github.com/QUT-T150/PartnerForge/pull/55) closes #19, #23, #56 (audit
logging + admin audit browser). Testing instructions are in the PR body. The remaining
audit & analytics work (#20–#22) builds on it, so a quick review keeps epic
[#2](https://github.com/QUT-T150/PartnerForge/issues/2) moving.

## Blocking Sprint 3 (weeks 5–6) — decide now to avoid slip

### 4. Data analysis requirements — needs Shailesh / Wayne
[#34](https://github.com/QUT-T150/PartnerForge/issues/34) · blocks the data analysis epic
[#5](https://github.com/QUT-T150/PartnerForge/issues/5) (#35, #36)

The Azure-vs-in-app spike (#35) can't start until we know what analysis they
actually want. **Ask:** concrete example questions they need answered
(e.g. "most active partners over 3 years"), preferred output (dashboard vs export),
and whether Azure tooling is on the table.

### 5. Branch protection rule — resolved in #11
[#11](https://github.com/QUT-T150/PartnerForge/issues/11) establishes the hard rule (1 approving review + green CI on `main` and `staging`), documented in `CONTRIBUTING.md` with automated GitHub Actions CI in `.github/workflows/ci.yml`.

## Early flag (Sprint 4)

### 6. Production hosting decision — needs stakeholder + possibly QUT IT
[#45](https://github.com/QUT-T150/PartnerForge/issues/45) · gates the deployment epic
[#7](https://github.com/QUT-T150/PartnerForge/issues/7). QUT IT governance approval may
have long lead times — worth raising the question now even though build work is weeks away.

## Housekeeping

- Old `bruceniyibitanga-qut/Cobble` repo: all branches exist identically on
  `QUT-T150/PartnerForge`; everyone should re-point clones
  (`git remote set-url origin https://github.com/QUT-T150/PartnerForge.git`)
  and Bruce should archive the old repo to stop accidental pushes.
