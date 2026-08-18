You are continuing development of an existing application called AI-Native PTM
(Personal Task Manager).

IMPORTANT:
This is VERSION 2 of an already-working application.

DO NOT rebuild the application from scratch.
DO NOT replace the existing architecture unnecessarily.
DO NOT remove working V1 features.

First inspect the entire existing codebase and understand:
- backend architecture
- frontend architecture
- database models
- Alembic migrations
- authentication
- AI provider implementation
- API endpoints
- current task/project structure
- existing Kanban UI
- existing Daily Log / University functionality
- current Render deployment configuration

Then implement V2 incrementally.

==================================================
V2 PRODUCT VISION
==================================================

The application should evolve from:

"A task manager with AI features"

into:

"An AI-native personal execution system that understands my tasks,
projects, deadlines, workload and activity and helps me decide what
to do next."

The AI must NOT become a generic chatbot.

AI should primarily provide:
- task understanding
- task decomposition
- prioritization
- planning
- suggestions
- summaries
- natural-language querying
- project intelligence

The user remains in control of all important changes.

==================================================
1. PRESERVE V1
==================================================

Before changing anything, verify that these existing capabilities continue
to work:

- task creation
- task editing
- task completion
- task deletion
- projects
- categories
- tags
- subtasks
- Kanban
- Inbox
- Today
- University work
- Daily Log
- search
- command palette
- authentication
- AI task parsing/enrichment
- SQLite database
- Alembic migrations

Do not remove or rewrite these simply to implement V2.

==================================================
2. AI TASK DECOMPOSITION
==================================================

Add an action to large tasks:

"✦ Break Down"

Example:

User creates:

"Build FastAPI backend"

AI suggests:

□ Create project structure
□ Configure environment
□ Configure database
□ Implement authentication
□ Create API endpoints
□ Add validation
□ Write tests
□ Deploy

Do NOT automatically create the subtasks.

Show:

"✦ AI suggests 8 subtasks"

Actions:

[Add All]
[Review]
[Dismiss]

The user must be able to edit suggestions before applying them.

IMPORTANT:
The AI should inspect existing project tasks so it does not suggest
duplicates.

==================================================
3. AI DAILY PLANNER
==================================================

Add:

"✦ Plan My Day"

The AI should analyze:

- incomplete tasks
- overdue tasks
- due dates
- priorities
- estimated durations
- project importance
- task dependencies
- today's existing tasks

Generate a realistic suggested plan.

Example:

TODAY'S PLAN

09:00
DBMS Assignment
~90 min

10:30
Break

10:45
FastAPI Authentication
~60 min

12:00
Networks Review
~45 min

The plan is a suggestion.

Buttons:

[Apply Plan]
[Modify]
[Dismiss]

Never silently reschedule or delete tasks.

==================================================
4. AVAILABLE TIME
==================================================

Add simple settings for daily availability.

Example:

Available:
09:00 - 18:00

Do NOT build a complicated calendar system.

The planner must respect available time.

If the user has 8 hours of work but only 4 hours available:

Tell them:

"You have approximately 4 hours available but 8 hours of planned work."

Then prioritize what should actually be done.

==================================================
5. "WHAT SHOULD I DO NOW?"
==================================================

Add a prominent AI action:

"What should I do now?"

The AI should consider:

- current time
- today's tasks
- due dates
- overdue tasks
- priority
- estimated duration
- dependencies
- available time

Example:

"You have about 75 minutes available.

I recommend:

1. Finish DBMS assignment
   Due tomorrow · ~60 min

2. Review Networks
   ~15 min"

Provide:

[Start Task]

Starting a task should move it to "Doing" if that state exists.

==================================================
6. SMART PRIORITY
==================================================

Keep the user's visible priority system.

Internally calculate priority using:

- deadline proximity
- importance
- overdue status
- estimated effort
- project importance
- dependencies
- postponement history

Do NOT expose a confusing numerical score.

Instead show:

Critical
Important
Normal
Low

Example:

"⚠ Due tomorrow"
"✦ AI recommends doing this today"

The AI should recommend rather than silently changing priority.

==================================================
7. AI RESCHEDULING
==================================================

Detect repeatedly postponed tasks.

Example:

"Finish SQL practice"

If postponed multiple times:

"✦ You postponed this task twice.

Suggested:
Schedule it today at 16:00."

Actions:

[Schedule]
[Keep Unscheduled]
[Dismiss]

Never automatically move important tasks without user approval.

==================================================
8. CONTEXT-AWARE AI ASSISTANT
==================================================

Add an AI assistant accessible through:

- command palette
- AI button
- keyboard shortcut

Suggested shortcut:

A

This is NOT a generic ChatGPT clone.

The assistant should understand application data.

Examples:

"What do I need to finish this week?"

"What university work is overdue?"

"What did I complete yesterday?"

"What should I work on today?"

"Why is tomorrow overloaded?"

"What tasks have I postponed?"

"What is blocking my FastAPI project?"

The answers must come from actual application data.

Do not fabricate information.

==================================================
9. CONTEXT RESOLVER
==================================================

Create a backend context-building layer.

Conceptually:

User Query
    ↓
Context Resolver
    ↓
Relevant Tasks
Relevant Projects
Relevant Deadlines
Relevant Activity
    ↓
AI
    ↓
Structured Response

DO NOT send the entire database to the AI for every request.

Retrieve only relevant information.

Example:

"What should I work on today?"

should retrieve:

- today's tasks
- overdue tasks
- tasks due soon
- active project tasks
- available time

rather than every historical task.

==================================================
10. NATURAL LANGUAGE SEARCH
==================================================

Upgrade search so users can ask:

"Show university tasks due this week"

"Show unfinished FastAPI tasks"

"What did I complete yesterday?"

"What have I postponed?"

"Things I need to finish before Friday"

"Tasks due tomorrow"

The AI should convert natural language into a validated structured filter.

IMPORTANT SECURITY RULE:

NEVER allow the AI to generate arbitrary SQL and execute it.

Use:

Natural language
↓
AI structured JSON
↓
Pydantic validation
↓
Application query builder
↓
Database

The AI must never directly execute SQL.

==================================================
11. DAILY AI SUMMARY
==================================================

Upgrade Daily Log.

Show an optional AI-generated summary.

Example:

TODAY'S SUMMARY

You completed 5 tasks.

2 university tasks
2 project tasks
1 personal task

You postponed:
SQL Practice

Tomorrow:
DBMS Assignment is the highest priority.

Only report information that exists in the database.

If actual time tracking does not exist, do not pretend it does.

Say:

"Estimated from task durations"

when appropriate.

==================================================
12. DAILY REFLECTION
==================================================

Add an optional reflection field:

"How did today go?"

[________________________]

[Save Reflection]

Do not force users to write reflections.

Store reflections in the database.

The AI may use reflections when generating weekly reviews.

==================================================
13. WEEKLY REVIEW
==================================================

Add:

"Weekly Review"

Show:

Completed:
18 tasks

Incomplete:
6 tasks

Overdue:
2 tasks

Then categorize:

University
Projects
Personal

AI should identify observable patterns.

Example:

"You postponed SQL practice three times this week."

"Most university tasks were completed close to their deadlines."

Do NOT make psychological or medical claims.

Only identify patterns supported by actual data.

==================================================
14. TASK DEPENDENCIES
==================================================

Add optional dependencies between tasks.

Example:

Create Database
      ↓
Authentication
      ↓
API Endpoints
      ↓
Tests

A blocked task should show:

"🔒 Waiting for Create Database"

The planner must consider dependencies.

Do not allow circular dependencies.

Validate dependency relationships in the backend.

==================================================
15. PROJECT INTELLIGENCE
==================================================

Improve project pages.

Projects should expose:

- progress
- remaining tasks
- overdue tasks
- deadline
- blockers
- next actions

Example:

FASTAPI PROJECT

████████░░ 80%

8 / 10 tasks complete

Remaining:
□ Write tests
□ Deploy

Blocker:
Tests have not been started.

Add:

"✦ Project Summary"

AI should generate a concise project overview from actual data.

==================================================
16. AI SUGGESTIONS CENTER
==================================================

Create a lightweight AI suggestions area.

Example:

AI SUGGESTIONS

⚠ DBMS assignment due tomorrow
   Suggested: Work on it today

↻ SQL practice postponed twice
   Suggested: Schedule 30 minutes

✦ FastAPI project has 2 remaining tasks
   Suggested: Finish testing before deployment

Every suggestion must have:

[Apply]
[Dismiss]

AI suggestions must never make destructive changes automatically.

==================================================
17. AI ACTION ARCHITECTURE
==================================================

AI should NOT directly modify the database.

Use this pattern:

AI
↓
Structured response
↓
Pydantic validation
↓
Business logic
↓
User confirmation
↓
Database

For example, if AI recommends moving a task:

AI proposes:

{
  "action": "reschedule_task",
  "task_id": "...",
  "new_date": "...",
  "reason": "..."
}

The backend validates it.

The UI asks the user for confirmation.

Only then is the database changed.

==================================================
18. AI PROVIDER ABSTRACTION
==================================================

Preserve the existing provider abstraction.

AI functionality should remain provider-independent.

Conceptually:

AIProvider
├── generate_text()
├── generate_structured()
└── generate_stream()

Do not scatter provider-specific API calls throughout the application.

Keep AI logic modular.

==================================================
19. AI FAILURE MUST NOT BREAK THE APP
==================================================

If the AI API:

- fails
- times out
- returns invalid JSON
- reaches a quota
- is unavailable

the task manager itself must continue working.

For example:

Task creation should still work without AI.

Search should still work normally.

Kanban should still work.

Daily Log should still work.

AI is an enhancement, not a dependency for core task management.

==================================================
20. AI COST OPTIMIZATION
==================================================

Do NOT call AI:

- on every page load
- on every keystroke
- every time a task renders
- every drag-and-drop
- every normal search
- every task completion

Call AI only when useful:

- user requests decomposition
- user requests planning
- user asks AI assistant
- natural-language search
- daily summary
- weekly review
- project summary
- task enrichment

Cache generated summaries when appropriate.

==================================================
21. UI/UX
==================================================

Keep the V1 visual style.

The application should remain:

- minimal
- clean
- fast
- widget-oriented
- Kanban-friendly
- information-dense without being cluttered

Do NOT redesign the entire application.

AI should feel integrated rather than taking over the UI.

Use subtle indicators:

✦ AI suggestion

rather than huge AI banners.

Improve:

- task cards
- task detail panel
- AI suggestion cards
- loading states
- empty states
- error states
- responsive layout
- mobile usability
- animations/transitions where appropriate

==================================================
22. DASHBOARD WIDGETS
==================================================

Improve the dashboard using compact widgets.

Suggested widgets:

TODAY
5 tasks · 3h 20m

UPCOMING
3 deadlines

OVERDUE
2 tasks

AI SUGGESTION
"Finish DBMS today."

PROJECTS
FastAPI 80%
University 62%

DAILY PROGRESS
████████░░

Keep widgets compact.

Do not turn the dashboard into a huge analytics dashboard.

==================================================
23. COMMAND PALETTE
==================================================

Extend the command palette.

Commands:

New Task
Search
Today
Kanban
Daily Log
University
Plan My Day
What Should I Do Now?
AI Assistant
Weekly Review

Keyboard shortcuts:

N → New Task
A → AI Assistant
/ → Search
P → Plan Day
T → Today
K → Kanban
D → Daily Log
Esc → Close

Do not trigger shortcuts while typing inside inputs/textareas.

==================================================
24. DATABASE
==================================================

Continue using SQLite for now.

Do NOT migrate to PostgreSQL in V2.

Keep the database architecture portable so PostgreSQL can be introduced later.

Potential new tables:

task_dependencies
daily_reflections
ai_suggestions
planning_sessions
planning_items

Only add tables/columns when actually required.

Use Alembic migrations.

NEVER reset or delete the existing database.

Existing V1 data must survive migrations.

==================================================
25. DATABASE PATH
==================================================

Preserve the existing Render/local database configuration.

The application currently uses:

DATABASE_URL

Do not hard-code database paths.

Ensure SQLite works locally and on Render.

Keep the application portable for eventual Oracle VPS deployment.

==================================================
26. SECURITY
==================================================

Maintain the existing authentication system.

Do not expose:

- API keys
- JWT secrets
- application secrets
- passwords

to the frontend.

Never commit .env files.

Use environment variables.

AI-generated database actions must always pass backend validation.

Do not allow arbitrary SQL.

Do not allow AI-generated shell commands to execute.

==================================================
27. DEPLOYMENT
==================================================

Maintain compatibility with the existing Render deployment.

Current deployment architecture:

Render
↓
FastAPI
↓
SQLite

Do not introduce infrastructure that requires paid services.

The application must continue running when AI is unavailable.

Keep these configurable through environment variables:

DATABASE_URL
AUTH_USERNAME
AUTH_PASSWORD
JWT_SECRET
AI_PROVIDER
AI_MODEL
AI_API_KEY
SECRET_KEY

Do not hard-code secrets.

==================================================
28. FRONTEND/BACKEND SEPARATION
==================================================

Preserve the current frontend/backend architecture.

Do not move business logic into the frontend.

AI orchestration must remain on the backend.

The frontend should call backend APIs.

==================================================
29. TESTING
==================================================

Add/update tests for:

Backend:

- task CRUD
- task decomposition
- planner
- dependencies
- natural-language search
- AI response validation
- project summaries
- daily summaries
- weekly review
- migrations

AI:

- malformed response
- missing fields
- invalid task IDs
- invalid dates
- invalid actions
- timeout
- provider failure

Frontend:

- task creation
- task completion
- Kanban movement
- AI suggestion application
- AI suggestion dismissal
- planner application
- command palette
- keyboard shortcuts

==================================================
30. PERFORMANCE
==================================================

The application will initially run on a small free Render instance.

Keep it lightweight.

Avoid:

- unnecessary background processes
- expensive database queries
- huge AI context payloads
- polling loops
- unnecessary WebSockets
- loading the entire task database into the frontend

Use pagination where appropriate.

Use database indexes for frequently queried fields.

==================================================
31. IMPLEMENTATION PROCESS
==================================================

DO NOT immediately start rewriting files.

First:

1. Inspect the complete repository.
2. Understand V1 architecture.
3. Identify current AI implementation.
4. Identify database schema.
5. Identify existing migrations.
6. Identify current API endpoints.
7. Identify current frontend components.
8. Identify reusable components.
9. Create a V2 implementation plan.
10. Implement incrementally.

Before making major architectural changes, explain why they are necessary.

==================================================
32. V2 ACCEPTANCE TEST
==================================================

After implementation I should be able to:

1. Create a task naturally.

Example:

"Finish DBMS assignment tomorrow, around 2 hours."

The system should understand:

title
deadline
estimated duration
category/project when appropriate

2. Select:

"Break Down"

and receive useful subtasks.

3. Click:

"Plan My Day"

and receive a realistic plan based on my actual workload.

4. Ask:

"What should I do now?"

and receive a useful recommendation.

5. Ask:

"What university work is due this week?"

and receive actual database results.

6. Ask:

"What did I complete yesterday?"

and receive an accurate answer.

7. Open a project and see:

progress
remaining work
blockers
next actions

8. Open Daily Log and receive an accurate AI summary.

9. Open Weekly Review and see meaningful statistics and observable patterns.

10. Turn off/break the AI API and verify that the core application still works.

==================================================
33. IMPORTANT DEVELOPMENT RULE
==================================================

Do not implement everything as one giant change.

Work in logical increments.

After each major feature:

- run backend tests
- run frontend build
- verify migrations
- verify existing V1 functionality
- fix errors
- then continue

Do not leave the repository in a half-working state.

==================================================
FINAL GOAL
==================================================

When V2 is finished, the application should feel like:

"I capture tasks and the system understands them, organizes them,
helps me prioritize them, plans my day, remembers what I have done,
and tells me what I should focus on next."

It should NOT feel like:

"A normal todo application with a ChatGPT button."

Keep the interface minimal.

Keep the architecture clean.

Keep SQLite.

Keep the application portable.

Make AI genuinely useful.
