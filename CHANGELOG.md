# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-25

### Fixed
- **KanbanApp**: Resolved "Rules of Hooks" violation by moving `useCallback` hook before early returns.
- **Subtasks**: Fixed bug in subtask title display and improved deletion modal behavior.
- **Dependencies**: Updated `tailwind-merge` to v3.

### Added
- **Drag & Drop**: Improved UX with custom collision detection strategy (`closestCorners` and `pointerWithin`).
- **Checklists**: Added support for subtasks within task cards.
- **Supabase**: Integrated Supabase backend for subtasks persistence.
- **Landing Page**: New application landing page.

### Changed
- **Refactoring**: General codebase refactoring for better maintainability.
- **UX**: Moved subtask addition form for better accessibility in the modal.
- **Documentation**: Updated README and project requirements.
