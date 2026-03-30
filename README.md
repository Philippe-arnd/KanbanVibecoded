<p align="center">
  <img src="client/public/favicon.svg" width="80" height="80" alt="Kanban Logo" />
</p>

<h1 align="center">Kanban Vibecodé</h1>

<p align="center">
  A time-based Kanban app with dual Pro / Personal workspaces, end-to-end task encryption,<br/>
  and a retro Neo-brutalism aesthetic.
</p>

<p align="center">
  <a href="https://github.com/Philippe-arnd/KanbanVibecoded/actions/workflows/pr-validation.yml">
    <img alt="PR Validation" src="https://github.com/Philippe-arnd/KanbanVibecoded/actions/workflows/pr-validation.yml/badge.svg" />
  </a>
  <a href="https://github.com/Philippe-arnd/KanbanVibecoded/actions/workflows/docker-validation.yml">
    <img alt="Docker Validation" src="https://github.com/Philippe-arnd/KanbanVibecoded/actions/workflows/docker-validation.yml/badge.svg" />
  </a>
  <a href="https://github.com/Philippe-arnd/KanbanVibecoded/actions/workflows/weekly-pipeline.yml">
    <img alt="Weekly Pipeline" src="https://github.com/Philippe-arnd/KanbanVibecoded/actions/workflows/weekly-pipeline.yml/badge.svg" />
  </a>
  <a href="https://github.com/Philippe-arnd/KanbanVibecoded/actions/workflows/dependency-review.yml">
    <img alt="Dependency Review" src="https://github.com/Philippe-arnd/KanbanVibecoded/actions/workflows/dependency-review.yml/badge.svg" />
  </a>
  <a href="https://github.com/Philippe-arnd/KanbanVibecoded/releases">
    <img alt="Latest Release" src="https://img.shields.io/github/v/tag/Philippe-arnd/KanbanVibecoded?label=release&color=blue" />
  </a>
</p>

---

## ✨ Features

- **Time-based columns** — Today, Tomorrow, This Week, This Month, Later
- **Dual workspace** — Pro (Indigo) and Personal (Emerald) modes, instantly switchable
- **Drag & drop** — fluid reordering powered by `@dnd-kit`
- **End-to-end encryption** — tasks encrypted client-side with `VITE_ENCRYPTION_KEY` before hitting the server
- **RLS isolation** — PostgreSQL Row Level Security enforces per-user data boundaries at the database level
- **K-Liwy 📎** — Pixel Art retro assistant that analyses your productivity
- **PWA ready** — installable on mobile and desktop

---

## 🛠️ Stack

| Layer | Technology |
|---|---|
| 🖥️ Frontend | React 19 + Vite, Tailwind CSS 4, @dnd-kit |
| ⚙️ Backend | Node.js + Express 5 |
| 🗄️ Database | PostgreSQL + Drizzle ORM + RLS |
| 🔐 Auth | Better Auth + Nodemailer (SMTP) |
| 🐳 Deployment | Docker Compose on Coolify (self-hosted) |
| 🔄 CI/CD | GitHub Actions (7 workflows) |

---

## 🚀 Getting Started

### Prerequisites

- Docker + Docker Compose

### 1. Configure environment

```bash
cp .env.example .env
# Fill in DATABASE_URL, ADMIN_DATABASE_URL, BETTER_AUTH_SECRET, VITE_ENCRYPTION_KEY, SMTP_*
```

### 2. Start the full stack

```bash
docker-compose up -d --build
# App available at http://localhost:3000
```

The Docker entrypoint runs migrations → applies RLS policies → seeds the test user → starts the server.

### ⚡ Local development (hot reload)

```bash
npm install
npm run dev        # Vite (5173) + Express (3000) concurrently
```

---

## 🧪 Testing

```bash
npm test                              # Vitest unit & integration tests
npm run test:coverage                 # With coverage report
node --test server/tests/test-rls.js  # RLS isolation tests (node:test runner)
```

---

## 🔄 CI/CD

7 GitHub Actions workflows active on `main`:

| Workflow | Trigger | Purpose |
|---|---|---|
| CI | Push to main/dev | Build check |
| PR Validation | PR → main | Lint, Vitest, RLS tests, coverage report |
| Security & Performance | PR → main | Secret scan, SAST, bundle size |
| Dependency Review | PR → main | CVE and license compliance |
| Docker Validation | PR → main (Docker files) or release tag | Docker build + Trivy CVE scan + SBOM + health check |
| Auto Merge | All checks green | Squash merge |
| Release | Manual dispatch | Tag `YYYY.MM.DD` + changelog + GitHub release |

---

## ☁️ Deployment (Coolify)

- Use the provided `docker-compose.yml` — **do not add fixed host port mappings** (Coolify manages routing)
- All FQDNs must use `https://` (required by Better Auth for secure session cookies)
- Releases are created manually via the **Release** workflow (`workflow_dispatch`) from the GitHub Actions UI

---

## 📄 License

© 2026 — [Kanban Vibecodé](https://github.com/Philippe-arnd/KanbanVibecoded)
