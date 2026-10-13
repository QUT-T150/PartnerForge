# Issues / Blockers to Address in Meeting

Standing agenda of decisions and stakeholder inputs that are blocking upcoming work.
Raise these at the next team meeting (and the stakeholder meeting where marked).
Last updated: 2026-09-29 (week 11). Sprint 6 closes on 16 October.

## Resolved since week 8

- **Branch flow.** `staging` is retired: all work now targets `main` directly (see
  `CONTRIBUTING.md`). The release that `staging` had been holding since 21 August
  (five-role RBAC, per-record audit history) merged to `main` in PR #79, and the four
  PRs that targeted `staging` (#77, #80, #82, #83) were retargeted to `main`.
- **Audit log access for `course_organiser`.** Settled in PR #57, now on `main`: only
  admins can browse the global audit log; course organisers get per-record history only.
- **Production hosting (#45).** The team is going with the portable USB deployment
  (#64). The persistence spike (#65) decides between local MySQL and an embedded database.
- **Demo data.** The seed dataset (#58) is on `main`, and PR #87 loads it automatically
  on `docker compose up` (#81). Project Applications nav replaced (#62, closed).
- **Five-role UI (#31, #32, #33, #22).** Closed. The last nav fix for
  `industry_team_manager` is in PR #89.

## Blocking right now

### 1. Review queue: ten green PRs waiting on one approval each

Every open PR is green and up to date with `main`. Nothing is blocked on code; it is
blocked on reviewers. Suggested merge order, which keeps follow-up conflict fixes to a
minimum:

1. #80, #83, #88, #87, #86 (small and independent, any order)
2. #74 (CSV import, critical path)
3. #85 (organisation to project navigation)
4. #82 (refresh tokens)
5. #77 (analytics). Needs a small follow-up after #82 and #85: both touch
   `ApplicationDbContext.cs` / `Header.tsx` at the same lines.
6. #76 (docs portal). Needs a small follow-up after #74: both add
   `frontend/tests/permissions.test.ts`.

Authors cannot approve their own PRs. **Ask:** each person takes two reviews this week.

### 2. Branch protection settings: check before #74 merges

PR #79 merged without an approving review, so the review rule may not be enforced on
`main`. Separately, #74 and #76 delete the legacy `ci.yaml` workflow. If its
`build-and-test` check is listed as a required status check, every PR will wait forever
on a check that no longer runs. **Ask:** an admin checks Settings → Branches (or Rules)
and keeps only `frontend-ci` and `backend-ci` as required checks.

### 3. Stakeholder demo (#68): confirm status

#68 is still open with no update since 20 August. **Ask:** confirm whether the demo with
Shailesh has happened. If not, book it once #85 and #87 are merged, and pick an owner
for the demo dashboard (#63).

### 4. Unowned Sprint 6 work

No assignee on: #38 (CSRF), #41 (HTTPS/HSTS), #42 (input validation), #49 and #50 (UI
pass), #52, #53 and #54 (handover docs), #59 (CSV export), #61 (import upsert), #64 and
#65 (USB deployment). **Ask:** owners for all of these at the next meeting, or an explicit
decision to drop them from scope.

### 5. Role migration for existing databases (#30)

`schema.sql` now seeds `industry_team` and `industry_team_manager`, which covers fresh
databases. Existing local databases need `docker compose down -v` to pick up the new
roles; a migration script is still missing for anyone who cannot wipe their data.
**Ask:** decide whether a migration is still needed or close #30 with the wipe
instructions.

## Early flags

- **Portable means single-user.** Wayne acknowledged it is beyond our scope but insisted
  the limitation be documented as an option with its trade-offs. Belongs in #53 and #54.
- **Event invitations (#66)** were requested, but outbound mail is hard from a USB
  deployment. Parked at low priority pending #64; likely out of scope.
- **Data analysis (#35, #36).** Wayne's steer was that filters answer the analysis
  questions. Once #77 and #85 are in, decide whether anything more is needed or record
  it as out of scope in the handover.

## Housekeeping

- Old `bruceniyibitanga-qut/Cobble` repo: everyone should re-point clones
  (`git remote set-url origin https://github.com/QUT-T150/PartnerForge.git`) and Bruce
  should archive the old repo. *(Outstanding since week 4.)*
- Freeze or delete the `staging` branch so no new PRs target it.
