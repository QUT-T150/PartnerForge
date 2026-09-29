# Issues / Blockers to Address in Meeting

Standing agenda of decisions and stakeholder inputs that are blocking upcoming epics.
Raise these at the next team meeting (and the stakeholder meeting where marked).
Last updated: 2026-09-06 (week 8). Week 6 agenda from the Wayne coordinator meeting,
with item 4 revised after PR #75 landed branch protection.

## Resolved since week 4 — no longer blockers

- **CSV sample spreadsheets (#24)** — closed as won't do. Wayne: *"You're not going to
  get it"* — the university has told Shailesh he cannot hand over PII. Replaced by a
  synthetic dataset (#58) and a flexible, user-mapped importer (#60, #61). Epic #3 is
  unblocked.
- **Data analysis requirements (#34)** — closed. Wayne gave concrete questions
  (partner longevity, most projects, project recency, cross-entity multi-view) and a
  clear steer that filters answer them rather than a separate reports module.
  Epic #5, #35 and #36 are unblocked.
- **Production hosting (#45)** — build-blocking part decided. No installs on the QUT
  network; portable USB or MySQL on Shailesh's own laptop for the stakeholder (#64,
  #65), plus our own Azure deployment for the capstone assessment. Post-handover
  subscription ownership is still open on #45.
- **PR #55** — merged to `staging` on 2026-08-11; #19, #23 and #56 closed.

## Blocking right now

### 1. Stakeholder demo dates — owed to Wayne, this week
[#68](https://github.com/QUT-T150/PartnerForge/issues/68)

Wayne is arranging a demo with Shailesh **next week** and asked for dates in Discord.
Nothing has been sent yet. He was explicit about the stakes: the other capstone team is
being seen in the same window and *"I want you to be ahead of the game."*
**Ask:** everyone's availability, today, so we can post three options.

### 2. Demo readiness — three issues gate the demo
[#58](https://github.com/QUT-T150/PartnerForge/issues/58) seed data ·
[#63](https://github.com/QUT-T150/PartnerForge/issues/63) dashboard ·
[#62](https://github.com/QUT-T150/PartnerForge/issues/62) hide Project Applications

Projects and Events were empty at the coordinator demo, which is the single thing that
stopped Wayne seeing the relational model work. Seed data (#58) is the critical one and
needs projects spread across **multiple years** so the analysis questions on #34 are
demonstrable. **Ask:** owners for all three, and a rehearsal before the demo.

### 3. Audit log access for `course_organiser` — team decision
[#30](https://github.com/QUT-T150/PartnerForge/issues/30) ·
[PR #57](https://github.com/QUT-T150/PartnerForge/pull/57)

PR #57 opens `AuditLogController` to `admin,course_organiser` at the class level, which
lets a course organiser page the entire audit log rather than one record's history.
#30 already lists audit-log access for the new roles as an undecided question.
**Ask:** 10 minutes to decide who reads the global audit log vs per-record history.

### 4. Branch flow: `feature/*` → `staging` → `main` — agreed on paper, not in practice
[#11](https://github.com/QUT-T150/PartnerForge/issues/11) (closed) ·
[#17](https://github.com/QUT-T150/PartnerForge/issues/17) (open)

Half resolved since week 6. #11 is closed: PR #75 added `.github/workflows/ci.yml`,
a PR template, and `CONTRIBUTING.md` documenting 1 approving review + green CI, and
branch protection is now actually enabled on `main`.

What has not changed is the behaviour the rule was meant to fix. `staging` sat 7 commits
ahead of `main` for 16 days holding the whole of PR #57 — the five-role RBAC model — because
release PR #69 went in *before* #57 landed. Both open PRs from that period, #74 and #76,
target `main` directly and bypass `staging`, which is what CONTRIBUTING.md now tells us
not to do. #74 edits `frontend/lib/permissions.ts` against the three-role model, and
`git merge-tree origin/staging origin/feature/csv-upload` conflicts on exactly that file;
whichever side merges second gets hand-resolved and either the `upload` permission or the
two new roles silently go missing.

**Ask:** ratify the flow in practice (#17) — retarget #74 and #76 at `staging`, and agree
that a release PR gets raised the same day anything merges to `staging`, not a fortnight
later.

### 5. #30 migration for the two new roles
PR #57 defers the migration file and `role_permissions` seed rows. Without it, anyone
with an existing local database won't have the new roles and the role-aware UI will look
broken. **Ask:** owner, and a Discord heads-up to rebuild local DBs when #57 lands.

## Early flags

- **Portable means single-user.** Wayne acknowledged it is beyond our scope but insisted
  the limitation be documented as an option with its trade-offs — belongs in #53 and #54.
- **Event invitations (#66)** were requested, but Wayne flagged himself that outbound
  mail is hard from a USB deployment. Parked at low priority pending #64.
- **`Microsoft.OpenApi` 2.4.1 high-severity advisory (#67)** — every build warns.

## Housekeeping

- Old `bruceniyibitanga-qut/Cobble` repo: all branches exist identically on
  `QUT-T150/PartnerForge`; everyone should re-point clones
  (`git remote set-url origin https://github.com/QUT-T150/PartnerForge.git`)
  and Bruce should archive the old repo to stop accidental pushes. *(Still outstanding
  from week 4.)*
- Analytics #20/#21 reassigned to Josh, who has the branch.
