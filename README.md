# Nexus OS — AI-Native Personal Task & Execution Command Center

An AI-native personal task and execution management system built with **FastAPI**, **SQLAlchemy**, **SQLite / PostgreSQL**, **React**, **Vite**, **TypeScript**, and **Tailwind CSS**.

---

## Key Features

1. **Natural Language Quick Capture (`N` shortcut)**:
   - Dump unstructured tasks like `"Finish DBMS assignment tomorrow for about 2 hours"`.
   - AI and heuristic reasoning extracts action title, category, priority, due date, estimated duration, and projects.

2. **Unified Data Model with Context Views**:
   - One relational task/activity database powering all views without data duplication.
   - **Today Dashboard**: Important tasks, planned workload estimates, and execution progress.
   - **Frictionless Inbox**: Rapid triage and capture.
   - **Kanban Board**: Drag-and-drop between Inbox, Planned, Doing, and Done with instantaneous backend sync.
   - **University Academic Hub**: Filtered views for courses (DBMS, Computer Networks, AI, Operating Systems) with assignment progress.
   - **Daily Activity Log**: Automated timeline of completed tasks and work sessions with AI daily summaries.
   - **Projects Directory**: Workspace modules with completion meters.

3. **Command Palette (`/` or `Cmd+K` / `Ctrl+K`)**:
   - Keyboard-first navigation and global search across tasks and actions.

4. **Zero AI Downtime & Data Safety**:
   - AI service abstraction with configurable providers (Gemini, OpenAI).
   - Robust offline heuristic fallback ensures task creation **never fails** if AI API keys are missing or the network is offline.
   - API keys are securely kept on the backend and never exposed to the client.

5. **Production & PostgreSQL Migration Ready**:
   - Database layer configured via `DATABASE_URL`.
   - Managed via Alembic migrations.

---

## Local Development

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Create virtual environment
python3 -m venv backend/.venv
source backend/.venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run migrations & seed data
alembic upgrade head
PYTHONPATH=. python backend/seed.py

# Start backend server (runs on http://localhost:8000)
uvicorn backend.app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
# In a separate terminal
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Deployment (Render Web Service)

This repository includes a `render.yaml` configuration and `./build.sh` script:

1. Connect your repository to [Render](https://render.com).
2. Create a new **Web Service**.
3. **Environment**: Python
4. **Build Command**: `./build.sh`
5. **Start Command**: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
6. Set Environment Variables:
   - `DATABASE_URL`: `sqlite:///./data/app.db` (or PostgreSQL URL)
   - `AI_API_KEY`: (Optional Gemini/OpenAI API Key)
   - `AI_PROVIDER`: `gemini`

---

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `N` | Open AI Quick Task Capture |
| `/` or `Cmd/Ctrl + K` | Open Command Palette & Global Search |
| `Esc` | Close any modal or drawer |
