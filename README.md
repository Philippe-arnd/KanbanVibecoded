# Kanban Vibecodé

<img src="client/public/favicon.svg" width="80" alt="Kanban Logo" />

An intuitive Kanban-style task management application, with a retro computer style (Neo-brutalism), designed to organize your workload with a clear separation between professional and personal life.

> For detailed specifications, see [requirements.md](./requirements.md).

## Features

- **Time Organization**: Dynamic columns (Today, Tomorrow, This Week, This Month, Later).
- **Dual Mode**: Instantly switch between **Pro** (Indigo theme) and **Personal** (Emerald theme) spaces.
- **Fluid Drag & Drop**: Reorganize your tasks with simple drag-and-drop (powered by `@dnd-kit`).
- **Retro Assistant (K-Liwy 📎)**: A Pixel Art companion that analyzes your productivity and gives advice.
- **Complete Management**:
  - Quick task addition.
  - Edit by double-clicking.
  - Mark tasks as completed.
  - Automatic cleanup of finished tasks per column.
- **Cloud & Security**: Full authentication and account management (Better Auth + PostgreSQL).
- **PWA Ready**: Installable on mobile and desktop with optimized icons and offline manifest.

## What's New v2.3.0 - Hardened Isolation (RLS) 🛡️🔒

This version focuses on data security and multi-tenant isolation at the database level.

### 🔐 PostgreSQL Row Level Security (RLS)

- **Database-Level Isolation**: Every user query is restricted at the PostgreSQL engine level using RLS policies.
- **withRLS Helper**: A new transactional helper ensures all sensitive operations carry the user context.
- **Defense in Depth**: Even if the application logic is bypassed, the database denies access to data not owned by the current user.

### 🧪 Enhanced Testing

- **RLS Integration Tests**: Specific tests to verify cross-user data isolation.
- **Native Node Test Runner**: Tests use `node:test` for compatibility in production/minimal environments.
- **How to run RLS tests**:
  ```bash
  node server/tests/test-rls.js
  ```

### 🏗️ Monorepo Structure

- **Client**: Vite-powered React application in `/client`.
- **Server**: Node.js/Express backend in `/server`.
- **Scripts**: Utility scripts for database seeding and management in `/scripts`.

### 🐳 Docker & Local Dev

- **Dockerized**: Full `Dockerfile` and `docker-compose.yml`.
- **Local Overrides**: Support for `docker-compose.override.yml` for custom port mapping and local dev environments.
- **CI/CD**: GitHub Actions for automated testing and deployment.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Philippe-arnd/KanbanVibecoded.git
   cd KanbanVibecoded
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the environment:
   Create a `.env` file at the root and configure your database and auth (see `.env.example`).

4. Run tests:

   ```bash
   npm test
   ```

5. Start the application:

   ```bash
   # Development (Vite + Node)
   npm run dev

   # Or via Docker
   docker-compose up -d
   ```

## Technologies

- **Frontend**: React 19, Vite, Tailwind CSS 4, React Router 7.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL (via Drizzle ORM).
- **Auth**: Better Auth.
- **Utilities**: @dnd-kit, Lucide React, Docker.

## Deployment (CI/CD)

### Vercel (Frontend/Fullstack)

1. Connect your GitHub repository to Vercel.
2. The `vercel.json` file handles the configuration.
3. Add environment variables in settings.

### Docker / Coolify (Self-hosted)

1. Use the provided `docker-compose.yml` for self-hosted deployment.
2. The application is served on port `3000` by default.
3. Automatic database migrations and seeding are handled via the Docker entrypoint.

## Credits

© 2026 - [Kanban Vibecodé](https://github.com/Philippe-arnd/KanbanVibecoded)
