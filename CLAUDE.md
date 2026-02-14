# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Run full stack (server + client concurrently)
npm run dev:client   # Vite dev server only (port 5173)
npm run start:server # Express server only (port 3000)

# Build & Quality
npm run build        # Vite production build
npm run lint         # ESLint
npm run format       # Prettier

# Database
npm run db:push      # Apply schema changes via Drizzle (use this, not migrations)

# Testing
npm test                                          # Run all Vitest tests
npm run test:coverage                             # Run tests with coverage report
npx vitest run server/tests/api.test.js           # Run a single test file
node --test server/tests/test-rls.js              # Run RLS tests (node:test, NOT vitest)
```

**Local Docker dev** (recommended for full-stack testing):
```bash
docker-compose up -d --build
# Use http://localhost:3000 (not 5173) when testing via Docker
```

## Architecture

### Monorepo Layout

- `client/` — React 19 + Vite + Tailwind CSS 4 frontend
- `server/` — Node.js + Express 5 backend
- `scripts/` — Utility scripts (seeding, encryption helpers)

### Database: Dual-Connection Pattern

The most important architectural detail is the **dual-connection pattern** in `server/db/index.js`:

- **`db`** — Standard connection with RLS enforced. Used for all task operations.
- **`adminDb`** — Admin/superuser connection. Used only for migrations and applying RLS policies. Driven by `ADMIN_DATABASE_URL`.

RLS isolation is implemented via a **`withRLS(userId, callback)`** helper that wraps queries in a transaction and sets `app.current_user_id` as a PostgreSQL config variable. All task queries must go through this helper. RLS policies live in `server/db/apply-rls.sql`.

### Authentication

Better Auth (`server/auth.js`) with Drizzle adapter. Email verification and password reset use Nodemailer (SMTP). The auth schema tables (`user`, `session`, `account`, `verification`) are defined in `server/db/schema.js` alongside the `tasks` table.

### Task Encryption

Tasks are encrypted client-side using `VITE_ENCRYPTION_KEY` (`client/src/utils/crypto.js`). Data is decrypted after fetch and re-encrypted before send in `client/src/hooks/useTasks.js`.

### Frontend State

- `client/src/hooks/useTasks.js` — All task CRUD, drag-drop reordering, and API calls
- `client/src/hooks/useAuth.js` — Auth state
- `client/src/KanbanApp.jsx` — Main UI with @dnd-kit drag-drop logic
- Columns are time-based: Today, Tomorrow, This Week, This Month, Later

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Standard user DB connection (RLS enforced) |
| `ADMIN_DATABASE_URL` | Admin DB connection (migrations, RLS setup) |
| `BETTER_AUTH_SECRET` | Auth secret |
| `BETTER_AUTH_URL` | App URL (affects cookie domain) |
| `VITE_ENCRYPTION_KEY` | Client-side task encryption key |
| `SMTP_*` | Email delivery (Nodemailer) |
| `TEST_USER_EMAIL` / `TEST_USER_PWD` | Seed user for Docker startup |

## Deployment (Coolify)

- **Never add fixed host port mappings** (e.g., `3000:3000`) to `docker-compose.yml` — Coolify manages routing. Port mappings belong only in `docker-compose.override.yml` for local dev.
- All FQDNs must use `https://` — Better Auth requires HTTPS for secure session cookies in production.
- Express is configured with `app.set('trust proxy', true)` to correctly detect HTTPS behind Coolify's reverse proxy.
- Docker entrypoint runs: migrations → apply RLS → seed user → start server.

## Coding Conventions

- **JavaScript only** — no TypeScript. All files are `.js` or `.jsx`.
- **ESM throughout** — `import`/`export` in all files.
- **Prettier**: no semicolons, single quotes, 2-space tabs, trailing commas (es5), 100-char line width.
- **UI style**: Neo-brutalism — thick borders, hard shadows. Preserve this aesthetic.
- Always use `db:push` for schema changes during development, not manual migrations.

## CI/CD

6 GitHub Actions workflows are active on `main`. See `.github/workflows/workflow.md` for full architecture docs.

**Workflows:**
- `ci.yml` — Build check on every push to main/dev
- `pr-validation.yml` — Lint/build + Vitest + RLS tests run in parallel; report job posts PR comment with results + downloadable coverage artifact
- `security-performance.yml` — Gitleaks, Semgrep, bundle size check
- `dependency-review.yml` — CVE and license check via `actions/dependency-review-action@v4`
- `docker-validation.yml` — Docker build + health check (path-filtered: only runs when Docker files change)
- `auto-merge.yml` — Squash-merges when all 6 required checks pass

**Key gotchas:**
- `BETTER_AUTH_SECRET` must be ≥32 chars — shorter values crash the auth module at import time
- `test-rls.js` uses `node:test` — run with `node --test`, never vitest
- Gitleaks uses RE2: no negative lookaheads (`(?!...)`) — use path allowlists instead
- `drizzle-kit push` in CI needs `--force` flag (non-interactive)
- `workflow_run` trigger only fires from workflows on the default branch (bootstrap limitation)
- Docker: use `-p 3000` (no fixed host port), get dynamic port with `docker port <container> 3000 | cut -d: -f2`
- `format()` in GHA outputs literal `\n` — NOT real newlines. For multi-line markdown in `body: |` blocks, put each row on its own YAML line with a separate `${{ }}` expression
- When renaming workflow job names, update BOTH `auto-merge.yml` required checks AND GitHub branch protection rules via API (`gh api repos/.../branches/main/protection/required_status_checks/contexts --method PUT`)

**Required checks for auto-merge (6 total):** "✅ Quick Checks", "🧪 Vitest Tests", "🔒 RLS Tests", "🔑 Secret Detection", "🛡️ Security Scan", "🔎 Review Dependencies for Vulnerabilities"

## Commit Message Format

```
Short descriptive summary

- Bullet point 1: What/Why.
- Bullet point 2: Implementation detail.
- Bullet point 3: Verification step.
```
