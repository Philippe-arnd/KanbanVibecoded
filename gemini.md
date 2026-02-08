# ♊ Kanban - Gemini CLI Context

This document serves as the primary context for the Gemini CLI agent, defining the technical architecture, development standards, and operational procedures for the **Kanban Vibecodé** application.

## 🚀 Tech Stack

### Frontend (client/)

- **Framework**: React 19 (JavaScript/JSX)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.0
- **Auth Client**: Better Auth (React plugin)
- **Drag & Drop**: @dnd-kit

### Backend (server/)

- **Runtime**: Node.js (Express)
- **Language**: JavaScript (ESM)
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL 16 (Alpine)
- **Authentication**: Better Auth (Drizzle adapter)
- **Email**: SMTP via Nodemailer (for verification and password resets)

---

## 🛠 Infrastructure & Deployment (Coolify)

The application is deployed on a self-hosted VPS using Coolify.

### 🌐 Domain Strategy

- **Production**:
  - Client: `https://kanban.philapps.com` (Target)
- **Preview (PR-based)**:
  - Template: `https://{{pr_id}}.kanban.philapps.com`

### ⚠️ Critical Deployment Rules

1.  **Port Mapping**: **Never use fixed host port mappings** (e.g., `3000:3000`) in `docker-compose.yml`. Coolify manages routing internally.
2.  **HTTPS Enforcement**: All FQDNs in Coolify must start with `https://`. Better Auth requires HTTPS to set secure session cookies in production.
3.  **Proxy Trust**: The Express server is configured with `app.set('trust proxy', true)` (to be added if missing) to correctly detect HTTPS behind Coolify's reverse proxy.
4.  **Database Migrations**: Handled via `npm run db:push` in the Docker entrypoint.

---

## 🧪 Testing & Validation

- **Automated Testing**: Run `npm test` (Vitest) to validate API, security, and CORS configuration.
- **Manual Validation**: Ensure Drag & Drop works across columns and persistence is verified after refresh.
- **Auth Flow**: Test registration, email verification (via logs in dev), and password reset.

## 🛠 Local Testing & Development

### Local Setup

```bash
# Recommended for local dev (uses docker-compose.override.yml for port mapping)
docker-compose up -d --build
```

### Constraints

- **Origin Consistency**: Always use `http://localhost:3000` when running via Docker (production build) or `http://localhost:5173` for development.
- **Automated Seeding**: The `scripts/seed-user.js` script runs on container start. It ensures a test user exists based on `.env` variables.

---

## 💎 Quality & Performance Standards

### Code Quality

- **Linting**: Must pass `npm run lint` (ESLint).
- **Architecture**: Keep a clean separation between `client/` and `server/`.
- **Seeding Robustness**: The `seed-user.js` script should be idempotent.

---

## 📜 Workflow & Commit Convention

### Commit Messages

Every commit must include a bullet-point changelog.

**Format:**

```
Short descriptive summary

- Bullet point 1: What/Why.
- Bullet point 2: Implementation detail.
- Bullet point 3: Verification step.
```

### Agent Mandate

- Respect the **Neo-brutalism** UI style (thick borders, hard shadows).
- Always use `db:push` for schema changes during development.
- Prioritize React 19 patterns and Tailwind 4.0 utilities.
