# Kanban Vibecodé

<img src="public/favicon.svg" width="80" alt="Kanban Logo" />

An intuitive Kanban-style task management application, with a retro computer style (Neo-brutalism), designed to organize your workload with a clear separation between professional and personal life.

🚀 **Production URL: https://kanban-vibecoded.vercel.app/**

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
- **Cloud & Security**: Full authentication, account management, and real-time synchronization (Supabase).

## What's New v2.0.0 - Cloud System Upgrade & Retro UI 💾☁️

This version 2.0 marks the major transformation of the application towards a connected SaaS architecture.

### 🎨 UI Overhaul "Retro Computer"
- **Neo-Retro Style**: Thick black borders, hard shadows, and pastel palette (Windows 95 vibes).
- **Mechanical Components**: Tactile effects on click.
- **Virtual Assistant**: Introduction of **K-Liwy**, a humorous productivity assistant.

### ☁️ Backend & Security (Supabase)
- **PostgreSQL Database**: Real-time synchronization.
- **RLS Security**: Private and protected data.

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
   Create a `.env` file at the root and add your Supabase keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the application in development mode:
   ```bash
   npm run dev
   ```

## Technologies

- React
- React Router Dom
- Tailwind CSS
- Supabase (Auth & Database)
- @dnd-kit
- Lucide React (Icons)

## Deployment (CI/CD)

The project is optimized for deployment on **Vercel**.

1. **Login**: Connect your GitHub repository to Vercel.
2. **Configuration**: Vercel will automatically detect Vite (thanks to the `vercel.json` file).
3. **Variables**: Add the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. **Workflow**:
   - Push to `main` → Update **Production**.
   - Push to `dev` (or other branch) → Create a unique **Preview** environment.

## Credits

© 2026 - [Kanban Vibecodé](https://github.com/Philippe-arnd/KanbanVibecoded)
