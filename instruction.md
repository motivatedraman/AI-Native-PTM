# AI-Native Personal Task Manager — First Draft

Build a full-stack, AI-integrated personal task management application. This is **not a generic Todo app** and should not feel like a clone of Notion, Trello, or Todoist.

The goal is to create a **minimalistic personal execution system** where I can quickly dump tasks and information, and the application intelligently organizes them.

## 1. Product Philosophy

The application should follow this principle:

> **"Dump anything into it, and the system helps figure out what it is, where it belongs, when it should happen, and how it relates to everything else."**

I previously used tools such as Notion and AppFlowy but found myself maintaining separate databases for:

* Todo
* University Work
* Daily Log

Do **not** recreate these as three independent databases.

Instead, create **one unified task/activity data model** with multiple views.

For example, a task can have:

* title
* description
* status
* priority
* due date
* estimated duration
* context/category
* project
* tags
* subtasks
* created date
* completed date
* AI-generated metadata

Then provide different views over the same underlying data.

## 2. Initial Tech Stack

Use:

### Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* shadcn/ui or similarly clean component system
* Lucide icons
* Responsive design

### Backend

* Python
* FastAPI
* Pydantic
* SQLAlchemy or SQLModel

### Database

* SQLite for the first version.

IMPORTANT:

The database layer must be designed so that SQLite can later be migrated to PostgreSQL with minimal application changes.

Use an environment variable such as:

`DATABASE_URL`

Do not scatter SQLite-specific SQL throughout the application.

### AI

Create a clean abstraction for the AI provider.

The AI API key must NEVER be exposed to the frontend.

Store it in an environment variable:

`AI_API_KEY`

Do not hard-code API keys.

The AI provider should be configurable so that the provider/model can be changed later without rewriting the application.

### Deployment

The application should be deployable as a Render web service.

Provide:

* `requirements.txt` or equivalent
* frontend build configuration
* backend start command
* `.env.example`
* clear README deployment instructions

Do not make the application dependent on Render-specific functionality.

## 3. Design Direction

The UI should be:

* minimalistic
* modern
* fast
* clean
* keyboard-friendly
* widget-oriented
* responsive
* information-dense without feeling cluttered

Take inspiration from the **clarity and polish of Linear**, the simplicity of modern productivity apps, and the flexibility of Notion databases, but do NOT copy any proprietary design directly.

Avoid:

* huge sidebars
* excessive gradients
* excessive rounded cards
* unnecessary animations
* dashboard clutter
* giant forms
* excessive colors

Use a restrained visual hierarchy.

The application should feel like a **personal productivity operating system**, not an enterprise project-management application.

## 4. Main Application Layout

Create a primary application shell with:

### Sidebar

Minimal navigation:

* Today
* Inbox
* Kanban
* University
* Projects
* Daily Log
* Search

At the bottom:

* Settings
* AI status

The sidebar should be collapsible.

### Main content

The main content area should change depending on the selected view.

### Global quick capture

There should always be an easy way to create a task.

Support:

* `N` keyboard shortcut
* prominent quick-add button
* quick capture input

## 5. Today Dashboard

The Today page should be the primary home screen.

Example structure:

```text
Good afternoon

TODAY
3 important · 5 tasks · ~4h 20m planned

[ Quick capture: What needs to be done? ]

┌─────────────────────────────────────────┐
│ IMPORTANT                               │
│                                         │
│ ○ Finish DBMS assignment      Tomorrow  │
│ ○ Fix FastAPI authentication  Today     │
│ ○ Read OS Chapter 4           Today     │
└─────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐
│ TODAY        │ │ PROGRESS     │
│              │ │              │
│ 5 tasks      │ │ 3 / 5 done   │
│ 4h 20m       │ │ 60%          │
└──────────────┘ └──────────────┘
```

Do not copy this exact visual layout; use it as a conceptual reference.

Include small widgets for:

* today's tasks
* important tasks
* progress
* upcoming deadlines
* AI suggestions

## 6. Unified Task Model

Create a robust task model.

At minimum:

```text
Task
 ├── id
 ├── title
 ├── description
 ├── status
 ├── priority
 ├── due_date
 ├── estimated_minutes
 ├── category
 ├── project_id
 ├── parent_task_id
 ├── created_at
 ├── updated_at
 ├── completed_at
 └── ai_metadata
```

Use appropriate relational structures for:

* Projects
* Tags
* TaskTags
* Subtasks
* Activity/Event history
* Daily logs

Do not put everything into one giant JSON object.

Use relational fields where appropriate.

## 7. Categories / Contexts

Initially support:

* Personal
* University
* Work
* Project
* Other

These should be configurable later.

University should NOT be a separate database.

It should simply be a category/context and optionally contain projects such as:

* DBMS
* Computer Networks
* AI
* Operating Systems
* etc.

## 8. Inbox

The Inbox is where raw tasks initially go.

Example:

```text
Finish DBMS report tomorrow

Buy HDMI cable

Study networks before Friday

Work on FastAPI project
```

The user should not have to fill out a form before creating these.

A task can initially exist with only a title.

AI enrichment can happen afterward.

## 9. Natural Language Task Creation

This is one of the most important features.

When the user enters:

> Finish DBMS assignment tomorrow, should take around 2 hours

the application should be capable of interpreting:

```text
Title:
Finish DBMS assignment

Category:
University

Due:
Tomorrow

Estimated duration:
120 minutes
```

The AI should return structured data.

Do NOT ask the AI to return arbitrary prose and then attempt to parse it.

Use structured JSON/Pydantic validation.

Example conceptual response:

```json
{
  "title": "Finish DBMS assignment",
  "category": "University",
  "priority": "medium",
  "due_date": "...",
  "estimated_minutes": 120
}
```

If the AI fails, the original task must still be created.

AI failure must never prevent normal task creation.

## 10. AI Suggestions

For the first draft, implement:

### Automatic task enrichment

After a task is created, AI may suggest:

* category
* priority
* due date
* estimated duration
* project
* tags

Show these as suggestions rather than silently making destructive changes.

Example:

```text
✦ AI suggestions

University
Due tomorrow
~2 hours

[Apply] [Dismiss]
```

The user remains in control.

## 11. Kanban View

Create a beautiful Kanban view.

Initial columns:

```text
INBOX
PLANNED
DOING
DONE
```

Tasks should be draggable between columns.

Dragging a task should update its status through the backend.

Cards should show only useful information:

```text
Finish DBMS assignment

📚 University
Tomorrow
~2h
```

Avoid putting every property on the card.

## 12. University View

The University page is simply a filtered view of the unified task system.

Display:

* university tasks
* subjects/projects
* upcoming deadlines
* completion progress

Do NOT create a separate university database.

Example:

```text
UNIVERSITY

Upcoming
────────────────────────────

DBMS assignment       Tomorrow
Networks report       Friday
AI presentation       Aug 25

Projects
────────────────────────────

DBMS
Networks
AI
Operating Systems
```

## 13. Daily Log

The Daily Log should be based on activity from the unified task system.

Do not require the user to manually duplicate completed tasks into a daily-log database.

Record useful activity events such as:

* task created
* task completed
* task reopened
* task moved
* task edited

Then display a daily timeline.

Example:

```text
AUGUST 17

Completed
✓ DBMS assignment
✓ FastAPI authentication

Worked on
• Computer Networks

Incomplete
○ SQL practice

Activity
10:20 — Started FastAPI work
11:40 — Completed authentication
14:10 — Started DBMS assignment
16:05 — Completed DBMS assignment
```

AI-generated daily summaries can be added as a separate feature, but keep the underlying activity data independent.

## 14. Task Details

Clicking a task should open a clean detail panel/modal.

Allow editing:

* title
* description
* status
* priority
* due date
* estimated time
* category
* project
* tags
* subtasks

Show:

* activity history
* AI suggestions
* created/completed timestamps

Support keyboard-friendly interaction.

## 15. Search

Implement global search.

Search should be able to find:

* tasks
* projects
* tags
* daily activity

Create a command-palette style interface.

Keyboard shortcut:

`/`

## 16. Command Palette

Create a command palette.

Initially support:

```text
Create task
Search
Go to Today
Go to Inbox
Go to Kanban
Go to University
Go to Daily Log
Go to Projects
Toggle sidebar
```

Use keyboard navigation.

## 17. AI Architecture

Create an abstraction such as:

```text
AIService
 ├── parse_task()
 ├── enrich_task()
 ├── suggest_subtasks()
 └── generate_daily_summary()
```

Do not put AI API calls directly inside route handlers.

Keep AI functionality isolated.

Use timeouts and error handling.

If the AI API is unavailable:

* task creation still works
* application still works
* user sees a subtle AI unavailable indicator
* retry can happen later

Never make the application dependent on AI availability.

## 18. API Design

Create clean REST endpoints.

Examples:

```text
POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/{id}
PATCH  /api/tasks/{id}
DELETE /api/tasks/{id}

POST   /api/tasks/{id}/complete

GET    /api/projects
POST   /api/projects

GET    /api/tags
POST   /api/tags

GET    /api/activity
GET    /api/daily-log

POST   /api/ai/enrich-task
POST   /api/ai/suggest-subtasks
```

Keep API responses consistent.

Use Pydantic schemas for request/response validation.

## 19. Error Handling

The application should gracefully handle:

* AI API failure
* database failure
* invalid dates
* network errors
* malformed AI responses
* duplicate requests

Display useful user-facing error messages.

Do not expose stack traces to users.

Log useful debugging information on the backend.

## 20. Data Safety

Never:

* expose API keys
* store secrets in Git
* hard-code credentials
* trust AI output without validation
* allow arbitrary AI-generated database queries
* execute AI-generated code

Create:

`.env.example`

with placeholders such as:

```text
DATABASE_URL=sqlite:///./data/app.db
AI_API_KEY=
AI_MODEL=
SECRET_KEY=
```

Add `.env` and database files to `.gitignore`.

## 21. Database

Use migrations from the beginning, preferably Alembic.

Even though the first database is SQLite, structure the models and migrations so PostgreSQL can be introduced later.

The application should read the database URL from the environment.

Do not hard-code:

```text
sqlite:///...
```

throughout the codebase.

## 22. Seed Data

Create an optional development seed script.

Include realistic example data:

```text
Finish DBMS assignment
Study Computer Networks
Fix FastAPI authentication
Read OS Chapter 4
Buy HDMI cable
Prepare AI presentation
```

This should make the UI look populated during development.

Do not automatically seed production.

## 23. Responsive Design

The application must work on:

* desktop
* laptop
* tablet
* mobile

On small screens:

* collapse sidebar
* preserve quick capture
* make Kanban horizontally scrollable
* use mobile-friendly task details

A PWA/mobile application can be added later.

## 24. Performance

Keep the application lightweight.

Do not introduce unnecessary libraries.

Avoid:

* huge frontend frameworks
* unnecessary state-management complexity
* excessive API calls
* AI calls on every keystroke
* unnecessary polling

Task creation should feel immediate.

AI enrichment can happen asynchronously or after creation.

## 25. Important Product Rule

**The AI is an assistant, not the owner of the user's data.**

The user should always be able to:

* create a task without AI
* edit AI suggestions
* dismiss AI suggestions
* manually organize tasks
* use the application when AI is unavailable

## 26. First Draft Scope

Do NOT implement everything imaginable.

The first working version should prioritize:

1. Authentication or a clean single-user mode
2. Task CRUD
3. SQLite database
4. Projects
5. Categories
6. Tags
7. Subtasks
8. Kanban
9. Today view
10. Inbox
11. University filtered view
12. Daily activity log
13. Search
14. Command palette
15. Natural-language task creation
16. Basic AI task enrichment
17. Responsive polished UI

Do NOT implement yet:

* complex calendar synchronization
* Google Calendar integration
* email integration
* notifications infrastructure
* multi-user collaboration
* advanced AI memory
* vector database
* autonomous AI agents
* complicated analytics
* billing
* social features

Build the foundation correctly first.

## 27. Code Quality

The code should be:

* modular
* readable
* typed where appropriate
* documented where useful
* easy for another developer/AI coding agent to understand

Separate:

```text
frontend
backend
database
AI services
API schemas
configuration
```

Do not create a giant single-file application.

Before finishing, verify:

* frontend builds successfully
* backend starts successfully
* database initializes correctly
* migrations work
* CRUD operations work
* Kanban updates persist
* AI failures don't break task creation
* API keys are not exposed
* `.env` is ignored
* Render deployment configuration is included

## 28. Final UX Goal

When I open the application, I should immediately be able to type:

> `Finish my DBMS assignment tomorrow for about 2 hours`

and get a useful task without filling out a form.

The application should feel like:

> **a fast personal command center that happens to have a Kanban board**

rather than:

> **a database application with an AI chatbot attached to it.**

Build the first version with a polished, production-quality UI, but keep the architecture simple enough that it can later be migrated from Render/SQLite to a VPS/PostgreSQL without rewriting the application.

