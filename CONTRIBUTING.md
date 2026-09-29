# Contributing Guidelines

This document outlines the workflow, branching model, and code quality standards for the PartnerForge repository.

## 1. Branching Model

- `main`: The only long-lived branch. Protected. Direct commits and force pushes are disabled. All merges require at least 1 approved pull request review and passing CI.
- `staging` is retired (September 2026). Do not open pull requests against it; target `main` instead.
- Working branches: branch off the latest `main`.
  - `feature/<name>`: New functionality
  - `fix/<name>`: Bug fixes
  - `devops/<name>`: CI/CD, build tools, or infrastructure changes
  - `chore/<name>`: Dependency updates or general maintenance
  - `docs/<name>`: Documentation only
  - Include the issue number where there is one, e.g. `feature/rate-limiting-auth-37`.

## 2. Branch Protection Rules

The following rules apply to `main`:

- **Pull Requests Required**: Direct pushes are disabled.
- **Approvals**: At least 1 approving review from a team member other than the author is required before merging.
- **Dismiss Stale Approvals**: New commits invalidate previous approvals, requiring re-review.
- **Status Checks**: Automated CI checks (`frontend-ci` and `backend-ci`) must pass before merge.
- **Branch Up to Date**: PR branches must be synced with `main` prior to merge. Merge `main` into your branch rather than rebasing a branch others have pulled.
- **Force Pushes Disabled**: `git push --force` is blocked.
- **Branch Deletions Disabled**: Branch deletion is blocked on protected branches.

## 3. Pull Request Workflow

1. Sync local branch:
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/your-branch
   git merge main
   ```
2. Push branch and open a PR using the repository template.
3. Link the associated issue in the PR description (e.g., `Closes #11`).
4. Ensure all CI checks pass and address any review feedback.

## 4. Commit Message Format

Use standard Conventional Commits format:
`type(scope): description`

Examples:
- `feat(csv): add column mapping support`
- `fix(auth): correct token expiration check`
- `devops(ci): update github actions workflow`

## 5. Local Verification Commands

Run these checks locally before opening a pull request:

### Frontend (Next.js)
```bash
cd frontend
pnpm test
pnpm run type-check
pnpm run build
```

### Backend (.NET)
```bash
dotnet build api/Qut.PartnerForge.Api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.csproj
dotnet test api/Qut.PartnerForge.Api/Qut.PartnerForge.Api.Tests/Qut.PartnerForge.Api.Tests.csproj
```

## 6. Issues and Project Board

- Every piece of work has an issue on the GitHub Projects board. Columns: Backlog → Sprint → In Progress → In Review → Done.
- Labels: one area label (`backend`, `frontend`, `database`, `docs`, `devops`, `security`, `testing`), a priority label where it matters, and `blocked: stakeholder input` when waiting on the client.
- Sprints are GitHub milestones. At sprint planning, each person self-assigns the issues they will take; an issue must have an assignee before it moves into the Sprint column.
- Use `Closes #<issue>` in the PR description so the issue closes when the PR merges to `main`.

## 7. GitHub Ruleset Configuration (Admins)

To configure branch protection via GitHub repository settings:

1. Navigate to **Settings** > **Rules** > **Rulesets** (or **Branches** > **Branch protection rules**).
2. Target branch: `main`.
3. Enable:
   - Restrict deletions
   - Block force pushes
   - Require a pull request before merging (1 approval, dismiss stale approvals)
   - Require status checks to pass (`frontend-ci`, `backend-ci`). Do not list the retired `build-and-test` check from the old `ci.yaml` workflow.
4. Save ruleset.
