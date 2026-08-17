# Feature Completion Log

This document tracks completed features and milestones for the **AI-Native Personal Task Manager**.

| Feature / Milestone | Status | Description | Timestamp |
| :--- | :--- | :--- | :--- |
| **Project Roadmap Initialized** | `COMPLETED` | Extracted full requirement set from `instruction.md` into a structured, step-by-step phased execution plan. | 2026-08-17 |
| **Phase 1: Project Setup & Database Architecture** | `COMPLETED` | Configured backend structure, SQLAlchemy models (`Task`, `Project`, `Tag`, `Subtask`, `ActivityLog`), Alembic migrations, environment config, and realistic development seed data. | 2026-08-17 |
| **Phase 2: Backend REST API & AI Abstraction Layer** | `COMPLETED` | Implemented complete CRUD endpoints for Tasks, Projects, Tags, Subtasks, Activity timeline, and `AIService` abstraction with Gemini/OpenAI + robust heuristic fallback. | 2026-08-17 |
| **Phase 3: Frontend Foundation & Design System** | `COMPLETED` | Scaffolded React + Vite + TypeScript frontend with Tailwind CSS, Lucide icons, dark mode color palette, and type-safe API client services. | 2026-08-17 |
| **Phase 4: Frontend Views & Interactive Features** | `COMPLETED` | Built Today Dashboard, Frictionless Inbox, Drag-and-Drop Kanban board, University Academic Hub, Daily Activity Audit Log, Task Detail Drawer, Command Palette (`/`, `Cmd+K`), and Global Quick Capture (`N`). | 2026-08-17 |
| **Phase 5: Production Polish & Deployment Config** | `COMPLETED` | Configured Render web service deployment (`render.yaml`, `build.sh`), production static build integration, and end-to-end test verification. | 2026-08-17 |
| **Single-User Security & Authentication** | `COMPLETED` | Built JWT single-user authentication protecting all endpoints, customizable credentials (`AUTH_USERNAME`, `AUTH_PASSWORD`), session persistence in localStorage, Linear-inspired login lock screen, and Sidebar logout button. | 2026-08-17 |

---

## Detailed Feature Log

### Single-User Security & Authentication
- [x] **Backend Auth Service**: JWT token issuing (`HS256`, 30-day expiry), token verification, and FastAPI route dependency `get_current_user`.
- [x] **Route Protection**: All tasks, projects, tags, activity, and AI endpoints now require bearer token authentication (returns 401 when unauthorized).
- [x] **Frontend Login Screen**: Minimalist unlock screen displaying workspace owner identity, password prompt, and error feedback.
- [x] **Session Persistence & Logout**: Automatic token attachment across all API calls via `api.ts`, session verification on reload, and one-click logout in the sidebar.

### Render Deployment Configuration
- [x] **PostgreSQL & SQLite Interoperability**: Added `psycopg2-binary` to backend dependencies for instant Render Managed Postgres support without rebuilding.
- [x] **Blueprint & Single-Service Deploy**: Updated `render.yaml` with auth environment variables and single-command `./build.sh` pipeline.

### Auth Credential Configuration Fix
- [x] **Removed Hardcoded Form Defaults**: Cleared default state values from [`LoginScreen.tsx`](file:///home/raman/Projects/test1/frontend/src/components/LoginScreen.tsx) so fields are empty by default.
- [x] **Dynamic Environment Reading**: Upgraded `SettingsConfigDict` in [`config.py`](file:///home/raman/Projects/test1/backend/app/config.py) and string normalization in [`auth.py`](file:///home/raman/Projects/test1/backend/app/routers/auth.py) so Render environment variables (`AUTH_USERNAME`, `AUTH_PASSWORD`) override defaults cleanly.

### Render Blueprint & Dynamic Env Resolution Fix
- [x] **Render.yaml Blueprint Key Fix**: Changed `AUTH_USERNAME` in [`render.yaml`](file:///home/raman/Projects/test1/render.yaml) to `sync: false` so Render does not force-overwrite custom dashboard usernames back to default.
- [x] **Dynamic Getter Methods**: Added `get_auth_username()`, `get_auth_password()`, and `get_jwt_secret()` in [`config.py`](file:///home/raman/Projects/test1/backend/app/config.py) to read live `os.environ` per request with case-insensitive username normalization and quote stripping.
