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

## What's New v2.1.0 - Architecture & Docker 💾☁️

This version 2.1 marks the transition to a clean monorepo-style architecture and full containerization.

### 🏗️ Monorepo Structure
- **Client**: Vite-powered React application in `/client`.
- **Server**: Node.js/Express backend in `/server`.
- **Scripts**: Utility scripts for database seeding and management in `/scripts`.

### 🐳 Docker & DevOps
- **Dockerized**: Full `Dockerfile` and `docker-compose.yml` for easy deployment.
- **Coolify Compatible**: Seamless deployment on self-hosted VPS.
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

4. Start the application in development mode:
   ```bash
   npm run dev
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
