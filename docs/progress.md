# CI/CD Implementation — Progress Summary

**Date:** 2026-02-14
**Branch:** dev → main (via PR #20, PR #22)

---

## What Was Built

A complete 6-workflow GitHub Actions CI/CD system covering the full lifecycle from push to auto-merge.

### Workflow Overview

```
Every push to main/dev
  └── ci.yml                    (build check only)

Every PR targeting main (non-draft)
  ├── pr-validation.yml         (lint, build, tests, coverage)
  ├── security-performance.yml  (secrets, SAST, bundle size)
  ├── dependency-review.yml     (CVEs, license compliance)
  └── docker-validation.yml     (Docker build + health, path-filtered)

When any of the above complete
  └── auto-merge.yml            (squash merge if all required checks pass)
```

### Files Created or Modified

| File | Status |
|------|--------|
| `server/vitest.config.ts` | Created |
| `.github/workflows/ci.yml` | Modified |
| `.github/workflows/pr-validation.yml` | Created |
| `.github/workflows/security-performance.yml` | Created |
| `.github/workflows/dependency-review.yml` | Created |
| `.github/workflows/docker-validation.yml` | Created |
| `.github/workflows/auto-merge.yml` | Created |
| `.github/workflows/workflow.md` | Created |
| `.gitleaks.toml` | Created |
| `.semgrep.yml` | Created |
| `.semgrepignore` | Created |
| `package.json` | Modified (test scripts + @vitest/coverage-v8) |
| `server/index.js` | Fixed (unused imports removed) |

---

## Key Design Decisions

### Two-DB-User Pattern in CI
CI creates both `postgres` (superuser) and `app_user` (non-superuser). Migrations run as postgres; vitest and RLS tests run as `app_user`. PostgreSQL superusers bypass RLS by default, so this is necessary for RLS tests to be meaningful.

```bash
DATABASE_URL=postgresql://app_user:app_password@localhost:5432/kanban_test   # tests
ADMIN_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kanban_test # migrations
```

### node:test vs vitest
`server/tests/test-rls.js` uses Node's native `node:test` module and must be run with `node --test`, not via vitest. Both test suites run in `pr-validation.yml` using `set +e` to capture exit codes independently so both always run.

### Gitleaks RE2 Engine
Gitleaks uses the RE2 regex engine which does **not** support negative lookaheads (`(?!...)`). The initial `.gitleaks.toml` used `(?!localhost)` and caused a panic. Fixed by using `[^/\s]+\.[^/\s]+` (requires a dot in the hostname) and adding `.github/` to path allowlists.

### BETTER_AUTH_SECRET Length
Must be ≥32 characters. Shorter values cause the Better Auth module to crash at load time, which silently kills all vitest tests with no obvious error.

### workflow_run Bootstrap Issue
`auto-merge.yml` uses `workflow_run` trigger which only fires from workflows **already on the default branch (main)**. PR #20 (which added auto-merge.yml) couldn't auto-merge itself. It was merged manually, and subsequent PRs auto-merge correctly.

### Docker Port Constraint
Coolify manages host port routing, so `docker-compose.yml` must not have fixed host port mappings. Docker validation mirrors this: uses `-p 3000` (no host port) and retrieves the dynamic port with `docker port test-app 3000 | cut -d: -f2`.

---

## Bugs Encountered and Fixed

### 1. ESLint Failure (Quick Checks)
**Error:** `'db' is defined but never used`, `'and' is defined but never used` in `server/index.js`
**Fix:** Removed `db` and `and` from their respective imports. `withRLS` wraps all DB access; `eq` is the only drizzle-orm operator used.

### 2. PR Comment 403 (Database & API Tests)
**Error:** `RequestError [HttpError]: Resource not accessible by integration` when posting PR comment
**Cause:** `db-and-api-tests` job had no `permissions` block; default GITHUB_TOKEN doesn't include `pull-requests: write`
**Fix:** Added `permissions: pull-requests: write` to the job.

### 3. Gitleaks RE2 Regex Panic
**Error:** `panic: regexp: Compile(...): error parsing regexp: bad perl operator: (?!`
**Fix:** Replaced negative lookahead with dot-in-hostname pattern. Added `@postgres:` and `@test-postgres:` to allowlist regexes.

### 4. Gitleaks False Positive on CI Placeholder Secret
**Error:** `jwt-better-auth-secret` rule fired on `BETTER_AUTH_SECRET: ci-secret-for-better-auth-minimum-32-chars` in workflow files
**Cause:** Rule-level regex allowlists in Gitleaks don't suppress matches reliably in RE2
**Fix:** Added `.github/` to both global `[allowlist] paths` and each custom rule's `[rules.allowlist] paths`.

### 5. Dependency Review Not Supported
**Error:** `Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled`
**Fix:** `gh api --method PUT repos/Philippe-arnd/KanbanVibecoded/vulnerability-alerts` — enables the dependency graph/vulnerability alerts API.

---

## Required Checks for Auto-Merge

| Check Name | Source Workflow |
|------------|----------------|
| Quick Checks | PR Validation |
| Database & API Tests | PR Validation |
| Secret Detection | Security & Performance |
| Security Scan | Security & Performance |
| Review Dependencies for Vulnerabilities | Dependency Review |

"Build & Validate Docker Image" is intentionally excluded — it only runs when Docker-related files change.

---

## End-to-End Validation

- PR #20: All workflows triggered. 3 bugs found and fixed across 3 follow-up commits. Merged manually (auto-merge.yml didn't yet exist on main).
- PR #22: All 5 required checks passed → auto-merge.yml fired → posted confirmation comment → squash-merged automatically. Full loop confirmed working.

---

## CI Workflow Optimization — PRs #23, #24, #25

**Date:** 2026-02-14
**PRs:** feat/optimize-ci-workflows (#23), feat/coverage-table-with-status (#24), fix/coverage-table-newlines (#25)

### What Was Changed

Three rounds of improvements to the existing CI/CD system.

#### PR #23 — Parallelize + Emojis + Coverage/Bundle Access

1. **Parallelized test jobs**: Split the single `db-and-api-tests` job into two independent jobs (`vitest-tests` + `rls-tests`), each with their own postgres service container. All three PR Validation jobs now run concurrently.
2. **Emojis**: Added emoji prefixes to all job and step names across all 6 workflows.
3. **Coverage artifact**: `vitest-tests` uploads the full `coverage/` directory as a downloadable artifact (7-day retention) via `actions/upload-artifact@v4`.
4. **Unified PR comment**: Added a `report` job (`needs: [quick-checks, vitest-tests, rls-tests]`, `if: always()`) posting suite status + coverage metrics + artifact link.
5. **Bundle size readability**: Fixed missing job-level `outputs:` declaration on `bundle-size` job; converted raw bytes to KB with percentage-of-limit (e.g. `✅ 511 KB / 600 KB (85%)`).
6. **Auto-merge and branch protection updated**: Required checks updated from 5 (old names, no emojis) to 6 (new emoji-prefixed names). GitHub branch protection rules updated via API to match.

#### PR #24 — Coverage Table with Pass/Fail Emojis

Replaced plain coverage percentages with a 3-column table (`| Metric | Coverage | Status |`) with ✅/❌ per metric based on an 80% threshold.

**Issue encountered**: Initial implementation used `format()` with `\n` in the string. GitHub Actions outputs `\n` as a literal character — the table rendered as one broken line. PR auto-merged before the fix was ready.

#### PR #25 — Fix Coverage Table Newlines

Cherry-picked the fix onto a fresh branch. Replaced the single `format()` call with per-row YAML lines — each table row on its own line in the `body: |` block with a separate `${{ }}` expression per row.

---

### Bugs Encountered and Fixed

#### 1. Dirty Branch (PR #24)
**Cause:** Created branch from stale local `main` (hadn't pulled after PR #23 squash merge). PR diff showed 8 files changed instead of 1.
**Fix:** `git fetch origin && git rebase origin/main <branch>` — git dropped the already-merged commits automatically. Then `git push --force-with-lease`.

#### 2. Stale Branch Protection Rules (PR #24)
**Cause:** Branch protection rules on `main` still had old check names (`"Quick Checks"`, `"Database & API Tests"`) that no longer matched new emoji-prefixed job names. 5 checks showed as permanently pending.
**Fix:**
```bash
gh api repos/Philippe-arnd/KanbanVibecoded/branches/main/protection/required_status_checks/contexts \
  --method PUT --input - <<<'["✅ Quick Checks","🧪 Vitest Tests","🔒 RLS Tests","🔑 Secret Detection","🛡️ Security Scan","🔎 Review Dependencies for Vulnerabilities"]'
```

#### 3. `format()` Newline Bug (PR #24 → fixed in #25)
**Cause:** `format()` in GitHub Actions outputs literal `\n` strings — NOT real newlines. Multi-line markdown tables built with `format('...\n...')` render as one broken line.
**Fix:** Each table row as its own YAML line in the `body: |` block:
```yaml
body: |
  ${{ '| Metric | Coverage | Status |' }}
  ${{ '|--------|----------|--------|' }}
  ${{ format('| Lines | {0}% | {1} |', outputs.lines, outputs.lines >= 80 && '✅' || '❌') }}
```

#### 4. Fix Commit Missed the Merge Window (PR #24 → PR #25)
**Cause:** PR #24 was auto-merged before the newline fix was pushed (auto-merge had already queued from a prior successful run).
**Fix:** `git cherry-pick <commit>` onto a fresh branch from `origin/main`, then opened PR #25.

---

### Updated Required Checks

| Check Name | Source Workflow | Job |
|------------|----------------|-----|
| ✅ Quick Checks | PR Validation | `quick-checks` |
| 🧪 Vitest Tests | PR Validation | `vitest-tests` |
| 🔒 RLS Tests | PR Validation | `rls-tests` |
| 🔑 Secret Detection | Security & Performance | `secret-detection` |
| 🛡️ Security Scan | Security & Performance | `security-scan` |
| 🔎 Review Dependencies for Vulnerabilities | Dependency Review | `dependency-review` |

"🐳 Build & Validate Docker Image" is intentionally excluded — it only runs on Docker-related file changes.

---

### End-to-End Validation

- PR #23: 11 checks passed → auto-merged (first run with 6-check config).
- PR #24: Auto-merged before newline fix was ready — exposed the `format()\n` gotcha.
- PR #25: Fix cherry-picked onto fresh branch → all checks passed → auto-merged.
