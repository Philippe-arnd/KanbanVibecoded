# CI/CD Workflow Architecture

This document describes the complete GitHub Actions CI/CD system for the kanban-app project.
<!-- auto-merge validation: 2026-02-15 -->

---

## Overview

The system consists of **7 workflow files**: `ci.yml` runs inline; the other 5 PR workflows are thin callers that delegate to reusable workflows in [`Philippe-arnd/reusable-workflow-vibecoded`](https://github.com/Philippe-arnd/reusable-workflow-vibecoded); `release.yml` is a standalone manual release workflow.

```
Every push to main/dev
  └── ci.yml                    (inline build check)

Every PR targeting main (non-draft)
  ├── pr-validation.yml         → reusable-pr-validation.yml
  ├── security-performance.yml  → reusable-security-performance.yml
  ├── dependency-review.yml     → reusable-dependency-review.yml
  └── docker-validation.yml     → reusable-docker-validation.yml (path-filtered)

When any of the above complete
  └── auto-merge.yml            → reusable-auto-merge.yml

Manual dispatch (or on release tag push)
  └── release.yml               (inline — creates tag + GitHub release)
```

---

## Workflow Details

### 1. `ci.yml` — 🔧 CI (Build Check)

**Trigger:** Push or PR to `main` or `dev`
**Implementation:** Inline (no reusable counterpart — different trigger)
**Purpose:** Lightweight baseline check on every push, including `dev` where PR workflows don't apply.

| Step | Detail |
|------|--------|
| 📥 Checkout | `actions/checkout@v6` |
| ⚙️ Node setup | Node 24, npm cache |
| 📦 Install | `npm ci` |
| 🏗️ Build | `npm run build` with `VITE_ENCRYPTION_KEY=ci-dummy-key` |

---

### 2. `pr-validation.yml` — PR Validation

**Trigger:** PR opened/synchronized/reopened/ready-for-review targeting `main`
**Skip condition:** Draft PRs (`if: github.event.pull_request.draft == false`)
**Concurrency:** One run per PR, cancels in-progress runs
**Delegates to:** `reusable-pr-validation.yml@main`

Key inputs passed to the reusable:

| Input | Value |
|-------|-------|
| `build-env` | `VITE_ENCRYPTION_KEY=ci-dummy-key` |
| `postgres-db` | `kanban_test` |
| `db-migration-command` | `npx drizzle-kit push --config=server/drizzle.config.js --force` |
| `db-rls-setup-command` | `node server/db/apply-rls.js` |
| `rls-test-command` | `node --test server/tests/test-rls.js` |
| `test-env` | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |

The reusable runs 4 jobs (3 parallel → report):
```
✅ Quick Checks  ──┐
🧪 Vitest Tests  ──┤──► 📊 Test Report (PR comment)
🔒 RLS Tests     ──┘
```

`DATABASE_URL` and `ADMIN_DATABASE_URL` are constructed internally by the reusable from `postgres-db`, `app-user`, `app-password`, and `postgres-admin-password`.

---

### 3. `security-performance.yml` — Security & Performance

**Trigger:** PR opened/synchronized/reopened/ready-for-review targeting `main`
**Skip condition:** Draft PRs
**Concurrency:** One run per PR, cancels in-progress runs
**Delegates to:** `reusable-security-performance.yml@main`

Key inputs passed to the reusable:

| Input | Value |
|-------|-------|
| `build-env` | `VITE_ENCRYPTION_KEY=ci-dummy-key` |
| `bundle-client-dir` | `client` (output is `client/dist/assets/`) |
| `semgrep-extra-config` | `.semgrep.yml` |
| `bundle-js-limit-kb` | `600` |
| `bundle-css-limit-kb` | `80` |

The reusable runs 4 jobs (3 parallel → report):
```
🔑 Secret Detection  ──┐
🛡️ Security Scan     ──┤──► 📋 Security Report (PR comment)
📦 Bundle Analysis   ──┘
```

---

### 4. `dependency-review.yml` — Dependency Review

**Trigger:** Any PR targeting `main` (no draft filter)
**Delegates to:** `reusable-dependency-review.yml@main`

Key inputs passed to the reusable:

| Input | Value |
|-------|-------|
| `fail-on-severity` | `high` |
| `allow-licenses` | MIT, Apache-2.0, BSD-*, ISC, 0BSD |
| `allow-dependencies-licenses` | All 12 `lightningcss` platform packages (MPL-2.0, build-only) |
| `openssf-warn-level` | `3` |

---

### 5. `docker-validation.yml` — Docker Validation

**Trigger:** PR targeting `main` (path-filtered), **or push of a release tag** (`YYYY.MM.DD` / `YYYY.MM.DD-X`)

**Path filter (PR only):**
- `Dockerfile`, `docker-compose*.yml`, `.dockerignore`

**Skip condition:** Draft PRs
**Concurrency:** One run per PR, cancels in-progress runs
**Delegates to:** `reusable-docker-validation.yml@main`

Key inputs passed to the reusable:

| Input | Value |
|-------|-------|
| `postgres-db` | `kanban_test` |
| `postgres-image` | `postgres:17-alpine` |
| `image-tag` | `kanban-app:ci-test` |
| `build-args` | `VITE_ENCRYPTION_KEY=ci-dummy-key` |
| `app-env` | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NODE_ENV=production` |

The reusable runs a single job (`🐳 Build & Validate Docker Image`) with these steps:

1. **Build** — `docker build` with the provided `build-args`
2. **Trivy scan** — scans the built image for `CRITICAL,HIGH` OS and dependency CVEs; results uploaded as SARIF to the GitHub Security tab (`trivy-fail-on-finding: false` by default — reports but does not block)
3. **SBOM** — generates an SPDX-JSON Software Bill of Materials, uploaded as a 90-day artifact (`sbom-spdx`)
4. **Start Postgres** — isolated Docker network, `app_user` created
5. **Start app** — dynamic port (`-p 3000`)
6. **Health check** — polls `GET /api/health` (30 retries × 3 s)
7. **Cleanup** — always runs

**Docker Compose mode** (`use-compose: true`) is also available in the reusable but not used here — kanban-app CI uses single Dockerfile mode because Coolify manages its own compose setup in production.

**Why `postgres:17-alpine` (not 18)?** The `docker-compose.yml` is pinned to `postgres:16-alpine` for Coolify compatibility. Using 17 here keeps CI in a stable range without risking data volume incompatibility on the production server.

---

### 6. `auto-merge.yml` — Auto Merge

**Trigger:** `workflow_run` completed for any of: `PR Validation`, `Security & Performance`, `Dependency Review`, `Docker Validation`
**Delegates to:** `reusable-auto-merge.yml@main`

Key inputs passed to the reusable:

| Input | Value |
|-------|-------|
| `required-checks` | 6 check names (see below) |
| `merge-method` | `squash` |
| `base-branch` | `main` |
| `block-label` | `major-update` |

The reusable checks all 6 required checks via `gh pr checks`, skips draft/conflicting/blocked PRs, and squash-merges when everything is green.

---

### 7. `release.yml` — 🚀 Release

**Trigger:** `workflow_dispatch` (manual)
**Implementation:** Inline
**Permissions:** `contents: write`

| Step | Detail |
|------|--------|
| 📥 Checkout | `actions/checkout@v6`, full history (`fetch-depth: 0`) |
| 🏷️ Determine tag | `YYYY.MM.DD`; if already taken → `YYYY.MM.DD-2`, `-3`, … |
| 📝 Generate changelog | Parses commits since last release tag, groups by conventional commit type |
| 🔖 Create & push tag | Annotated git tag pushed to origin |
| 🚀 Create GitHub release | Full release with grouped changelog + optional notes |

**Tag format:** `YYYY.MM.DD` (first release of the day) or `YYYY.MM.DD-X` (subsequent).

**Changelog groups:**

| Group | Commit types |
|-------|-------------|
| 🚀 Features | `feat` |
| 🐛 Bug Fixes | `fix` |
| ⚡ Performance | `perf` |
| 🔒 Security | `sec`, `security` |
| 🏗️ CI / Infra | `ci`, `build`, `infra` |
| ♻️ Refactor / Tests | `refactor`, `test` |
| 📦 Dependencies | `chore` (collapsed into a single summary link) |
| 📝 Other | `docs`, `style`, `revert`, `other` |

Pushing the release tag also triggers `docker-validation.yml` (full Docker build + Trivy scan + health check on the final image).

---

## Required Checks for Auto-Merge

All **6** check names must be `SUCCESS`. Because these come from reusable workflows, GitHub reports them as `"Caller Workflow / Job Name"`:

| Check Name (as seen in GitHub UI) | Source Workflow | Reusable Job |
|-----------------------------------|----------------|--------------|
| `PR Validation / ✅ Quick Checks` | PR Validation | `quick-checks` |
| `PR Validation / 🧪 Vitest Tests` | PR Validation | `vitest-tests` |
| `PR Validation / 🔒 RLS Tests` | PR Validation | `rls-tests` |
| `Security & Performance / 🔑 Secret Detection` | Security & Performance | `secret-detection` |
| `Security & Performance / 🛡️ Security Scan` | Security & Performance | `security-scan` |
| `Dependency Review / 🔎 Review Dependencies for Vulnerabilities` | Dependency Review | `dependency-review` |

### Docker Validation and auto-merge

Docker Validation (`Docker Validation / 🐳 Build & Validate Docker Image`) is **not** in the required checks list because it is path-filtered — it only runs when `Dockerfile`, `docker-compose*.yml`, or `.dockerignore` change. Adding it as a required check would block all unrelated PRs where it never runs.

**Current behaviour:** if Docker Validation runs and fails, it does **not** block auto-merge. The reusable `reusable-auto-merge.yml` only evaluates the `required-checks` list, and Docker is absent from it. The old inline `auto-merge.yml` had explicit logic to block on Docker failure; that logic was not carried over to the reusable.

**Mitigation options** if stricter enforcement is needed:
- Add `Docker Validation / 🐳 Build & Validate Docker Image` to the `required-checks` input in `auto-merge.yml` and mark it as optional in branch protection (merges will only be blocked when the check ran AND failed, not when it was skipped) — but this is not natively supported by GitHub branch protection
- Add the optional-block logic upstream to `reusable-auto-merge.yml` via an `optional-block-checks` input

> **When renaming jobs in the reusable:** update `auto-merge.yml` `required-checks` input AND the branch protection rules via:
> ```bash
> gh api repos/Philippe-arnd/KanbanVibecoded/branches/main/protection/required_status_checks/contexts \
>   --method PUT --input - <<< '["PR Validation / ✅ Quick Checks", ...]'
> ```

---

## Supporting Config Files

### `.gitleaks.toml`

Global allowlist covers:
- **Paths:** `*.md`, `*.test.*`, `*.spec.*`, `server/tests/`, `.env.example`
- **Regexes:** test/placeholder/example/dummy/ci prefixed values, `localhost` URLs, CI postgres connection strings, `${{ ... }}` GitHub Actions expressions

Three custom rules with allowlists:
- `generic-api-key` — detects `api_key = "..."` patterns
- `jwt-better-auth-secret` — detects `BETTER_AUTH_SECRET = "..."` patterns
- `database-url-with-credentials` — detects non-localhost `postgres://user:pass@host` patterns

### `.semgrep.yml`

10 custom security rules for JavaScript:

| Rule ID | Severity | CWE |
|---------|----------|-----|
| `weak-hash-md5` | WARNING | CWE-327 |
| `weak-hash-sha1` | WARNING | CWE-327 |
| `hardcoded-secret-assignment` | ERROR | CWE-798 |
| `insecure-cookie-secure-false` | WARNING | CWE-614 |
| `insecure-cookie-httponly-false` | WARNING | CWE-1004 |
| `sql-injection-string-concat` | ERROR | CWE-89 |
| `xss-innerhtml` | WARNING | CWE-79 |
| `xss-dangerously-set-inner-html` | WARNING | CWE-79 |
| `insecure-math-random-security` | ERROR | CWE-338 |
| `sensitive-data-localstorage-password` | ERROR | CWE-312 |

---

## PR Comments & Artifacts

Each workflow that posts PR comments uses an HTML comment as a sentinel so the comment is updated in-place rather than duplicated on every push:

| Sentinel | Workflow | Content |
|----------|---------|---------|
| `<!-- ci-test-results -->` | PR Validation | Suite status, coverage metrics, artifact link |
| `<!-- ci-security-report -->` | Security & Performance | Security check status, bundle sizes in KB with % of limit |

Dependency Review uses the built-in comment feature of `actions/dependency-review-action` (no custom sentinel needed).

### Coverage Artifact

The `🧪 Vitest Tests` job uploads the full `coverage/` directory as a **downloadable artifact** named `coverage-report` (retained 7 days). The PR comment includes a direct link to the workflow run where it can be downloaded.

---

## Environment Variables Used in CI

| Variable | Value in CI | Purpose |
|----------|-------------|---------|
| `VITE_ENCRYPTION_KEY` | `ci-dummy-key` | Required by Vite build (client-side crypto) |
| `DATABASE_URL` | `postgresql://app_user:app_password@localhost:5432/kanban_test` | Non-superuser connection (RLS enforced) |
| `ADMIN_DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/kanban_test` | Superuser connection (migrations, RLS setup) |
| `BETTER_AUTH_SECRET` | `ci-secret-for-better-auth-minimum-32-chars` | Must be 32+ chars — shorter values crash the auth module |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Auth base URL |
| `GITHUB_TOKEN` | Injected by GitHub | Used by gitleaks, auto-merge, dependency review |

---

## Concurrency Behaviour

Three caller workflows use `cancel-in-progress: true` grouped by PR number:
- `pr-validation-<PR_NUMBER>`
- `security-performance-<PR_NUMBER>`
- `docker-validation-<PR_NUMBER>`

Pushing a new commit to a PR while CI is running immediately cancels the in-progress run and starts a fresh one. `dependency-review.yml` relies on GitHub's own concurrency handling.
