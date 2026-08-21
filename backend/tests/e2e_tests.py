#!/usr/bin/env python3
"""End-to-end API test suite for the AI-Native Personal Task Manager.

Runs against a live server (default http://127.0.0.1:8001) backed by an
isolated SQLite DB in heuristic-AI mode. Covers auth, tasks CRUD, timezone
round-trips, subtasks, dependencies, projects, tags, quick-add NLP parsing,
activity, reflections, settings and all AI endpoints.
"""
import sys
import time
from datetime import datetime, timedelta, timezone

import httpx

BASE = "http://127.0.0.1:8001"
USERNAME = "raman"
PASSWORD = "admin123"

NPT = timezone(timedelta(hours=5, minutes=45))

client = httpx.Client(base_url=BASE, timeout=30)
anon = httpx.Client(base_url=BASE, timeout=30)
token = None
failures = []
passes = 0


def check(name: str, cond: bool, detail: str = ""):
    global passes
    if cond:
        passes += 1
        print(f"  PASS  {name}")
    else:
        failures.append((name, detail))
        print(f"  FAIL  {name}  -- {detail}")


def section(title: str):
    print(f"\n=== {title} ===")


def auth_headers():
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------- Health
section("Health")
r = client.get("/api/health")
check("health returns 200", r.status_code == 200, f"got {r.status_code}")
check("health status healthy", r.json().get("status") == "healthy", r.text[:200])

# ---------------------------------------------------------------- Auth
section("Auth")
r = client.post("/api/auth/login", json={"username": USERNAME, "password": "wrong"})
check("login wrong password -> 401", r.status_code == 401, f"got {r.status_code}")

r = client.post("/api/auth/login", json={"username": "nobody", "password": PASSWORD})
check("login unknown user -> 401", r.status_code == 401, f"got {r.status_code}")

r = client.post("/api/auth/login", json={"username": USERNAME.title(), "password": PASSWORD})
check("login case-insensitive username -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
token = r.json().get("access_token") if r.status_code == 200 else None
check("login returns token", bool(token), r.text[:200])
if token:
    client.headers.update({"Authorization": f"Bearer {token}"})

r = anon.get("/api/tasks")
check("protected route without token rejected", r.status_code in (401, 403), f"got {r.status_code}")

r = anon.get("/api/tasks", headers={"Authorization": "Bearer garbage.token.here"})
check("protected route with bad token rejected", r.status_code in (401, 403), f"got {r.status_code}")

# ---------------------------------------------------------------- Projects
section("Projects")
r = client.post("/api/projects", json={"name": "E2E Project", "description": "test project", "category": "Work"})
check("create project -> 201", r.status_code == 201, f"got {r.status_code}: {r.text[:200]}")
proj = r.json()
pid = proj.get("id")

r = client.get("/api/projects")
names = [p["name"] for p in r.json()]
check("project list contains created project", "E2E Project" in names, str(names))
check("seeded projects present", "DBMS" in names, str(names))

r = client.get(f"/api/projects/{pid}")
check("get project by id", r.status_code == 200 and r.json()["name"] == "E2E Project", r.text[:200])

r = client.get("/api/projects/999999")
check("get missing project -> 404", r.status_code == 404, f"got {r.status_code}")

# ---------------------------------------------------------------- Tags
section("Tags")
r = client.post("/api/tags", json={"name": "E2ETag"})
check("create tag -> 201", r.status_code == 201, f"got {r.status_code}: {r.text[:200]}")
tag_id = r.json().get("id")
r = client.get("/api/tags")
check("tag list contains created tag", any(t["name"] == "E2ETag" for t in r.json()), r.text[:300])

# ---------------------------------------------------------------- Tasks CRUD
section("Tasks - create/read/update/delete")
r = client.post("/api/tasks", json={})
check("create task without title -> 422", r.status_code == 422, f"got {r.status_code}")

r = client.post("/api/tasks", json={"title": "Minimal task"})
check("create minimal task -> 201", r.status_code == 201, f"got {r.status_code}: {r.text[:300]}")
minimal = r.json()
check("default status inbox", minimal.get("status") == "inbox", str(minimal.get("status")))
check("default priority medium", minimal.get("priority") == "medium", str(minimal.get("priority")))
check("default category Personal", minimal.get("category") == "Personal", str(minimal.get("category")))

full_payload = {
    "title": "Write E2E suite",
    "description": "Comprehensive end-to-end coverage",
    "priority": "urgent",
    "category": "Project",
    "project_id": pid,
    "due_date": "2026-08-25T04:15:00",
    "estimated_minutes": 90,
    "tag_ids": [tag_id],
    "initial_subtasks": ["write auth tests", "write task tests"],
}
r = client.post("/api/tasks", json=full_payload)
check("create full task -> 201", r.status_code == 201, f"got {r.status_code}: {r.text[:400]}")
task = r.json()
tid = task.get("id")
check("title echoed", task.get("title") == "Write E2E suite", str(task.get("title")))
check("description echoed", task.get("description") == full_payload["description"], str(task.get("description")))
check("priority echoed", task.get("priority") == "urgent", str(task.get("priority")))
check("category echoed", task.get("category") == "Project", str(task.get("category")))
check("project_id echoed", task.get("project_id") == pid, str(task.get("project_id")))
check(
    "naive UTC due_date round-trips unchanged",
    task.get("due_date") == "2026-08-25T04:15:00",
    f"sent 2026-08-25T04:15:00 got {task.get('due_date')}",
)
check("estimated_minutes echoed", task.get("estimated_minutes") == 90, str(task.get("estimated_minutes")))
check("tag linked", any(t["id"] == tag_id for t in task.get("tags", [])), str(task.get("tags")))
check(
    "initial_subtasks created",
    len(task.get("subtasks", [])) == 2,
    str(task.get("subtasks")),
)

r = client.get(f"/api/tasks/{tid}")
check("get task by id", r.status_code == 200 and r.json()["id"] == tid, r.text[:200])
r = client.get("/api/tasks/999999")
check("get missing task -> 404", r.status_code == 404, f"got {r.status_code}")

# ---- Timezone regression tests (the bug that was just fixed)
section("Due-date timezone round-trip (regression)")
r = client.patch(f"/api/tasks/{tid}", json={"due_date": "2026-08-25T04:15:00"})
check(
    "PATCH naive UTC due_date echoes same value",
    r.json().get("due_date") == "2026-08-25T04:15:00",
    f"got {r.json().get('due_date')}",
)
r = client.get(f"/api/tasks/{tid}")
check(
    "GET after PATCH shows no drift",
    r.json().get("due_date") == "2026-08-25T04:15:00",
    f"got {r.json().get('due_date')}",
)
r = client.patch(f"/api/tasks/{tid}", json={"due_date": "2026-08-25T04:15:00Z"})
check(
    "PATCH Z-suffix UTC stored as same instant (no offset shift)",
    r.json().get("due_date") == "2026-08-25T04:15:00",
    f"got {r.json().get('due_date')} (shifted!)",
)
r = client.patch(f"/api/tasks/{tid}", json={"due_date": None})
check("PATCH due_date null clears it", r.json().get("due_date") is None, str(r.json().get("due_date")))

# ---- Update fields
section("Tasks - update & filters")
r = client.patch(f"/api/tasks/{tid}", json={
    "title": "Write E2E suite v2",
    "description": "updated desc",
    "priority": "high",
    "status": "doing",
    "category": "Work",
})
upd = r.json()
check("patch title", upd.get("title") == "Write E2E suite v2", str(upd.get("title")))
check("patch description", upd.get("description") == "updated desc", str(upd.get("description")))
check("patch priority", upd.get("priority") == "high", str(upd.get("priority")))
check("patch status", upd.get("status") == "doing", str(upd.get("status")))
check("patch category", upd.get("category") == "Work", str(upd.get("category")))
check("updated_at bumped >= created_at", upd.get("updated_at") >= upd.get("created_at"),
      f"{upd.get('updated_at')} vs {upd.get('created_at')}")

# extra tasks for filter tests
t_inbox = client.post("/api/tasks", json={"title": "FilterAlpha inbox task", "category": "University", "priority": "low"}).json()
t_done = client.post("/api/tasks", json={"title": "FilterBeta done task", "status": "done"}).json()
t_word = client.post("/api/tasks", json={"title": "Unsearchable", "description": "needle-in-haystack"}).json()

r = client.get("/api/tasks?status=doing")
check("filter by status", all(t["status"] == "doing" for t in r.json()) and any(t["id"] == tid for t in r.json()),
      f"{r.status_code}: {[t['id'] for t in r.json()][:10]}")
r = client.get("/api/tasks?category=university")
check("filter by category (case-insensitive)", all(t["category"].lower() == "university" for t in r.json())
      and any(t["id"] == t_inbox["id"] for t in r.json()), str([t["id"] for t in r.json()][:10]))
r = client.get("/api/tasks?priority=high")
check("filter by priority", all(t["priority"] == "high" for t in r.json()), str(len(r.json())))
r = client.get(f"/api/tasks?project_id={pid}")
check("filter by project_id", all(t["project_id"] == pid for t in r.json()) and len(r.json()) >= 1,
      str(len(r.json())))
r = client.get("/api/tasks?search=E2E%20suite")
check("search matches title", any(t["id"] == tid for t in r.json()), str([t["title"] for t in r.json()][:5]))
r = client.get("/api/tasks?search=needle-in-haystack")
check("search matches description", any(t["id"] == t_word["id"] for t in r.json()), str([t["title"] for t in r.json()][:5]))
r = client.get("/api/tasks?tag=E2ETag")
check("filter by tag name", any(t["id"] == tid for t in r.json()), str([t["id"] for t in r.json()][:10]))
r = client.get("/api/tasks?limit=1")
check("limit param respected", len(r.json()) == 1, str(len(r.json())))
r = client.get("/api/tasks?limit=0")
check("limit=0 -> 422", r.status_code == 422, f"got {r.status_code}")

# project task_count reflects tasks
r = client.get(f"/api/projects/{pid}")
check("project task_count updated", (r.json().get("task_count") or 0) >= 1, str(r.json().get("task_count")))

# ---- Complete / reopen
section("Tasks - complete/reopen/log-time")
r = client.post(f"/api/tasks/{tid}/complete")
comp = r.json()
check("complete sets status done", comp.get("status") == "done", str(comp.get("status")))
check("complete sets completed_at", bool(comp.get("completed_at")), str(comp.get("completed_at")))
r = client.post(f"/api/tasks/{tid}/reopen")
reop = r.json()
check("reopen clears done status", reop.get("status") != "done", str(reop.get("status")))
check("reopen clears completed_at", not reop.get("completed_at"), str(reop.get("completed_at")))

r = client.post(f"/api/tasks/{tid}/log-time?minutes=30")
check("log-time 30", r.json().get("spent_minutes") == 30, str(r.json().get("spent_minutes")))
r = client.post(f"/api/tasks/{tid}/log-time?minutes=45")
check("log-time accumulates to 75", r.json().get("spent_minutes") == 75, str(r.json().get("spent_minutes")))
r = client.post(f"/api/tasks/{tid}/log-time?minutes=-100")
if r.status_code in (400, 422):
    check("negative log-time rejected", True)
else:
    check("negative log-time rejected", False,
          f"accepted negative minutes, spent_minutes now {r.json().get('spent_minutes')}")
r = client.post(f"/api/tasks/{tid}/log-time?minutes=2000")
check("log-time above 1440 rejected", r.status_code == 422, f"got {r.status_code}")

# ---- Subtasks
section("Subtasks")
r = client.post(f"/api/tasks/{tid}/subtasks", json={"title": "extra subtask"})
check("add subtask -> 201", r.status_code == 201, f"got {r.status_code}: {r.text[:200]}")
sub = r.json()
sid = sub.get("id")
r = client.patch(f"/api/tasks/{tid}/subtasks/{sid}", json={"is_completed": True})
check("toggle subtask complete", r.json().get("is_completed") is True, str(r.json()))
r = client.patch(f"/api/tasks/{tid}/subtasks/{sid}", json={"title": "renamed subtask"})
check("rename subtask", r.json().get("title") == "renamed subtask", str(r.json().get("title")))
r = client.delete(f"/api/tasks/{tid}/subtasks/{sid}")
check("delete subtask -> 204", r.status_code == 204, f"got {r.status_code}")
r = client.get(f"/api/tasks/{tid}")
check("deleted subtask gone", all(s["id"] != sid for s in r.json().get("subtasks", [])), "")
r = client.patch(f"/api/tasks/{tid}/subtasks/999999", json={"is_completed": True})
check("patch missing subtask -> 404", r.status_code == 404, f"got {r.status_code}")

# ---- Dependencies
section("Task dependencies")
dep_a = client.post("/api/tasks", json={"title": "DepA"}).json()
dep_b = client.post("/api/tasks", json={"title": "DepB"}).json()
r = client.post(f"/api/tasks/{dep_a['id']}/dependencies", json={"depends_on_id": dep_b["id"]})
check("create dependency -> 201", r.status_code == 201, f"got {r.status_code}: {r.text[:200]}")
dep_id = r.json().get("id")
check("dependency echoes blocking title", r.json().get("depends_on_title") == "DepB", str(r.json()))

r = client.post(f"/api/tasks/{dep_a['id']}/dependencies", json={"depends_on_id": dep_b["id"]})
check("duplicate dependency -> 400", r.status_code == 400, f"got {r.status_code}")
r = client.post(f"/api/tasks/{dep_a['id']}/dependencies", json={"depends_on_id": dep_a["id"]})
check("self dependency -> 400", r.status_code == 400, f"got {r.status_code}")
r = client.post(f"/api/tasks/{dep_b['id']}/dependencies", json={"depends_on_id": dep_a["id"]})
check("circular dependency -> 400", r.status_code == 400, f"got {r.status_code}: {r.text[:150]}")
r = client.post(f"/api/tasks/{dep_a['id']}/dependencies", json={"depends_on_id": 999999})
check("dependency on missing task -> 404", r.status_code == 404, f"got {r.status_code}")
r = client.get(f"/api/tasks/{dep_a['id']}/dependencies")
check("list dependencies", any(d["id"] == dep_id for d in r.json()), r.text[:200])
r = client.delete(f"/api/tasks/{dep_a['id']}/dependencies/{dep_id}")
check("delete dependency -> 204", r.status_code == 204, f"got {r.status_code}")

# ---------------------------------------------------------------- Quick-add + NLP tz
section("Quick-add natural language (heuristic) + NPT timezone")
now_npt = datetime.now(NPT)
tomorrow_npt = now_npt + timedelta(days=1)
r = client.post("/api/tasks/quick-add", json={"raw_text": "Submit DBMS assignment tomorrow 5pm !high ~2h #homework"})
check("quick-add -> 201", r.status_code == 201, f"got {r.status_code}: {r.text[:400]}")
qa = r.json()
check("quick-add priority !high", qa.get("priority") == "high", str(qa.get("priority")))
check("quick-add category University", qa.get("category") == "University", str(qa.get("category")))
check("quick-add duration ~2h -> 120m", qa.get("estimated_minutes") == 120, str(qa.get("estimated_minutes")))
check("quick-add tag Homework linked", any(t["name"].lower() == "homework" for t in qa.get("tags", [])),
      str(qa.get("tags")))
expected_due = f"{tomorrow_npt:%Y-%m-%d}T11:15:00"  # 17:00 NPT == 11:15 UTC
check(
    "quick-add 'tomorrow 5pm' stored as 17:00 NPT == 11:15 UTC",
    qa.get("due_date") == expected_due,
    f"expected {expected_due}, got {qa.get('due_date')}",
)
check("quick-add title cleaned of date words",
      "tomorrow" not in qa.get("title", "").lower() and "5pm" not in qa.get("title", "").lower(),
      str(qa.get("title")))

r = client.post("/api/tasks/quick-add", json={"raw_text": "   "})
check("quick-add empty text -> 400", r.status_code == 400, f"got {r.status_code}")

# parse-task endpoint with explicit time
r = client.post("/api/ai/parse-task", json={"text": "Pay electricity bill tomorrow 6pm"})
pt = r.json() if r.status_code == 200 else {}
expected_iso = f"{tomorrow_npt:%Y-%m-%d}T12:15:00"  # 18:00 NPT == 12:15 UTC
check("parse-task -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
check(
    "parse-task 'tomorrow 6pm' due_date_iso is NPT-correct UTC",
    pt.get("due_date_iso", "").startswith(f"{tomorrow_npt:%Y-%m-%d}T12:15"),
    f"expected {expected_iso}, got {pt.get('due_date_iso')}",
)

# ---------------------------------------------------------------- Activity & daily log
section("Activity & daily log")
r = client.get("/api/activity?limit=50")
check("activity list non-empty", r.status_code == 200 and len(r.json()) > 0, f"{r.status_code} n={len(r.json())}")
acts = r.json() if r.status_code == 200 else []
check("activity has task_created entries", any(a.get("action_type") == "task_created" for a in acts),
      str({a.get("action_type") for a in acts}))

r = client.get("/api/daily-log")
check("daily-log default -> 200", r.status_code == 200, f"got {r.status_code}")
dl = r.json() if r.status_code == 200 else {}
check("daily-log has created_tasks incl. today's tasks",
      any(t["id"] == tid for t in dl.get("created_tasks", [])), str(dl.keys()))
r = client.get("/api/daily-log?target_date=2026-01-01")
check("daily-log explicit past date -> 200 empty-ish", r.status_code == 200, f"got {r.status_code}")
past = r.json() if r.status_code == 200 else {}
check("daily-log past date has no today's tasks", not any(t["id"] == tid for t in past.get("created_tasks", [])), "")
r = client.get("/api/daily-log?target_date=garbage")
check("daily-log invalid date falls back gracefully", r.status_code == 200, f"got {r.status_code}")

# ---------------------------------------------------------------- Reflections
section("Daily reflections")
today_server = datetime.now(NPT).date()  # app convention is NPT; server-local may differ (see report)
r = client.post("/api/reflections", json={"content": "Solid progress on E2E tests", "mood": "productive"})
check("save reflection -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
refl = r.json()
r2 = client.post("/api/reflections", json={"content": "Updated reflection", "mood": "focused"})
check("second save updates same day (no duplicate)", r2.json().get("id") == refl.get("id"),
      f"ids {refl.get('id')} vs {r2.json().get('id')}")
r = client.get("/api/reflections/today")
check("GET today returns saved reflection", r.status_code == 200 and r.json() and r.json().get("content") == "Updated reflection",
      r.text[:200])
r = client.get("/api/reflections")
check("reflection list contains entry", any(x["id"] == refl.get("id") for x in r.json()), r.text[:200])

# ---------------------------------------------------------------- Settings
section("Settings")
r = client.get("/api/settings")
check("get settings -> 200", r.status_code == 200, f"got {r.status_code}")
s0 = r.json()
check("settings has timezone field", "timezone" in s0, str(s0))
r = client.patch("/api/settings", json={
    "available_start_hour": 9,
    "available_end_hour": 17,
    "timezone": "Asia/Kathmandu",
    "daily_chunks": [{"start": "09:00", "end": "12:00"}, {"start": "13:00", "end": "17:00"}],
})
check("patch settings -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
r = client.get("/api/settings")
s1 = r.json()
check("settings persisted (hours)", s1.get("available_start_hour") == 9 and s1.get("available_end_hour") == 17, str(s1))
check("settings persisted (chunks)", s1.get("daily_chunks") == [{"start": "09:00", "end": "12:00"}, {"start": "13:00", "end": "17:00"}], str(s1.get("daily_chunks")))

# ---------------------------------------------------------------- AI endpoints (heuristic mode)
section("AI endpoints (heuristic fallback mode)")
r = client.get("/api/ai/status")
check("ai status -> 200", r.status_code == 200, f"got {r.status_code}")
check("ai provider reported", "provider" in r.json(), r.text[:200])

r = client.post(f"/api/ai/enrich-task/{tid}")
check("enrich-task -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
r = client.post("/api/ai/enrich-task/999999")
check("enrich missing task -> 404", r.status_code == 404, f"got {r.status_code}")

r = client.post(f"/api/ai/suggest-subtasks/{tid}")
check("suggest-subtasks -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
subs = r.json().get("subtasks", r.json()) if r.status_code == 200 else []
check("suggest-subtasks returns non-empty suggestions", bool(subs), r.text[:200])

r = client.post(f"/api/ai/decompose/{tid}")
check("decompose -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:300]}")

r = client.post("/api/ai/plan-my-day", json=None)
check("plan-my-day no payload -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:300]}")
plan = r.json() if r.status_code == 200 else {}
items = plan.get("items", plan.get("plan", []))
check("plan-my-day returns items", isinstance(items, list), str(plan)[:200])

r = client.post("/api/ai/what-should-i-do")
check("what-should-i-do -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")

r = client.post("/api/ai/search", json={"query": "urgent university tasks"})
check("nl search -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
r = client.post("/api/ai/execute-search", json={"query": "tasks due this week"})
check("execute-search -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")

r = client.get("/api/ai/weekly-review")
check("weekly-review -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:300]}")

r = client.get("/api/ai/daily-summary/2026-08-20")
check("daily-summary -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:300]}")

r = client.post("/api/ai/chat", json={"message": "What should I focus on today?"})
check("chat -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
check("chat returns answer", bool(r.json().get("answer")), r.text[:200])

r = client.get("/api/ai/suggestions")
check("suggestions -> 200", r.status_code == 200, f"got {r.status_code}")

# ---------------------------------------------------------------- Delete cascade / cleanup checks
section("Delete tasks")
r = client.delete(f"/api/tasks/{t_done['id']}")
check("delete task -> 204", r.status_code == 204, f"got {r.status_code}")
r = client.get(f"/api/tasks/{t_done['id']}")
check("deleted task gone -> 404", r.status_code == 404, f"got {r.status_code}")
r = client.delete("/api/tasks/999999")
check("delete missing task -> 404", r.status_code == 404, f"got {r.status_code}")

r = client.delete(f"/api/projects/{pid}")
check("delete project -> 204", r.status_code == 204, f"got {r.status_code}")
r = client.get(f"/api/tasks/{tid}")
check("task survives project deletion (project_id nulled or kept)",
      r.status_code == 200, f"got {r.status_code}")

# ---------------------------------------------------------------- CORS
section("CORS")
r = client.options("/api/tasks", headers={
    "Origin": "http://localhost:5173",
    "Access-Control-Request-Method": "GET",
})
allow_origin = r.headers.get("access-control-allow-origin", "")
check("CORS preflight for allowed origin", r.status_code in (200, 204) and allow_origin in ("http://localhost:5173", "*"),
      f"{r.status_code} allow-origin={allow_origin!r}")

# ---------------------------------------------------------------- Summary
print("\n" + "=" * 60)
print(f"RESULTS: {passes} passed, {len(failures)} failed")
print("=" * 60)
if failures:
    print("\nFAILURES:")
    for i, (name, detail) in enumerate(failures, 1):
        print(f"  {i}. {name}")
        if detail:
            print(f"     {detail}")
sys.exit(1 if failures else 0)
