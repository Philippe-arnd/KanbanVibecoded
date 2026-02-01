# Software Requirements Specifications - Kanban Vibecodé v2.0

## 1. Introduction
The **Kanban Vibecodé** application (v2.0) is an intuitive task management tool, evolving towards a connected SaaS architecture, designed to help users organize their daily workload. It is distinguished by a clear separation between professional and personal tasks, dynamic temporal organization, and a retro "Neo-brutalism" aesthetic.

## 2. Functional Requirements

### 2.1 Authentication and Account Management
The system must secure access to user data.
- **FR-AUTH-01**: The user must be able to create an account via email and password.
- **FR-AUTH-02**: The system must validate password strength during registration (visual indicator).
- **FR-AUTH-03**: The user must be able to log in to an existing account.
- **FR-AUTH-04**: The user must be able to request a password reset if forgotten (email link).
- **FR-AUTH-05**: The logged-in user must be able to change their password via the interface.
- **FR-AUTH-06**: The user must be able to log out of their session.

### 2.2 Task Management (CRUD)
The user must have full control over their tasks.
- **FR-TASK-01**: The user must be able to create a task quickly via an input field.
- **FR-TASK-02**: The task must be created by default in the "Today" column and associated with the active mode (Pro or Personal).
- **FR-TASK-03**: The user must be able to edit a task's title (in-place editing / double-click).
- **FR-TASK-04**: The user must be able to change a task's status (completed/not completed).
- **FR-TASK-05**: The user must be able to permanently delete a task.
- **FR-TASK-06**: The user must be able to batch delete all completed tasks in a column ("Clean").

### 2.3 Organization and Visualization (Kanban)
The interface must allow for visual and temporal organization.
- **FR-BOARD-01**: The board must be divided into fixed temporal columns: *Today*, *Tomorrow*, *This Week*, *This Month*, *Later*.
- **FR-BOARD-02**: The user must be able to move tasks from one column to another via Drag & Drop.
- **FR-BOARD-03**: The user must be able to reorganize the order of tasks within the same column.
- **FR-BOARD-04**: Completed tasks must be visually separated from active tasks (at the bottom of the column, distinct style).

### 2.4 Life Modes (Pro / Personal)
The application must allow separating life contexts.
- **FR-MODE-01**: The system must handle two distinct contexts: "Pro" and "Personal".
- **FR-MODE-02**: The user must be able to switch between modes via a global switch.
- **FR-MODE-03**: The interface must filter displayed tasks to show only those corresponding to the active mode.
- **FR-MODE-04**: The interface must adapt its color theme according to the mode (e.g., Indigo for Pro, Emerald for Personal).

### 2.5 Intelligent Assistant (RetroAssistant)
- **FR-ASST-01**: A virtual assistant named **K-Liwy**, in "Pixel Art" style, must be present on the interface (Desktop version).
- **FR-ASST-02**: The assistant must analyze the context (time, number of tasks in progress/completed) to display relevant messages (encouragement, overload alerts, etc.).
- **FR-ASST-03**: The assistant must have interactive animations on hover.

## 3. Non-Functional Requirements

### 3.1 User Interface (UI/UX)
- **NFR-UI-01**: The application must respect a "retro 90s computer" / "Windows 95 vibes" graphic charter (thick black borders, hard drop shadows, saturated pastel colors).
- **NFR-UI-02**: The application must be "Responsive Design" (adapted to mobile and wide screens).
- **NFR-UI-03**: Interactions (drag & drop, buttons) must provide immediate visual and tactile feedback ("Mechanical Components" with active, hover states).

### 3.2 Performance and Data
- **NFR-PERF-01**: Data must be persisted reliably in the backend (PostgreSQL).
- **NFR-PERF-02**: The application must maintain an optimistic local state for a feeling of immediate fluidity during user actions.

### 3.3 Security
- **NFR-SEC-01**: Task data must be protected by security rules (RLS - Row Level Security) ensuring that only the creator can read or modify their tasks.

## 4. Technical Stack
- **Frontend**: React.js
- **Language**: JavaScript (JSX)
- **Styles**: Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL, Better Auth
- **Key Libraries**: 
  - `@dnd-kit` (Drag & Drop)
  - `lucide-react` (Icons)
