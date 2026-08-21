import os
import re
import json
import httpx
import time
import asyncio
from datetime import datetime, timedelta, date, timezone
from typing import Optional, List, Dict, Any
from collections import deque
from backend.app.config import settings
from backend.app.schemas.ai import (
    AITaskParseResult, AITaskEnrichResponse, AISubtaskSuggestResponse,
    AIStatusResponse, AIDecomposeResponse, AIPlannerResponse, AIPlannerItem,
    AIWhatNowResponse, AINLSearchResponse, AIWeeklyReviewResponse,
    AIProjectSummaryResponse, AIChatRequest, AIChatResponse
)

# Lazy-import google-genai so the module loads even without the package
try:
    from google import genai as _genai
except ImportError:
    _genai = None

NPT = timezone(timedelta(hours=5, minutes=45))


class RateLimiter:
    """Simple in-memory sliding window rate limiter."""
    def __init__(self, max_rpm: int = 8):
        self.max_rpm = max_rpm
        self.timestamps: deque = deque()

    def can_proceed(self) -> bool:
        now = time.time()
        # Remove timestamps older than 60 seconds
        while self.timestamps and self.timestamps[0] < now - 60:
            self.timestamps.popleft()
        return len(self.timestamps) < self.max_rpm

    def record(self):
        self.timestamps.append(time.time())

    def wait_time(self) -> float:
        """Seconds until next request is allowed."""
        if self.can_proceed():
            return 0.0
        oldest = self.timestamps[0]
        return max(0, oldest + 60 - time.time())



class AIService:
    def __init__(self):
        # Rate limiter: 20 RPM gives headroom under the free tier
        self.rate_limiter = RateLimiter(max_rpm=20)
        self._last_error: Optional[str] = None
        self._consecutive_failures = 0

    @property
    def provider(self) -> str:
        return settings.get_ai_provider()

    @property
    def api_key(self) -> str:
        return settings.get_ai_api_key()

    @property
    def model(self) -> str:
        return settings.get_ai_model()

    def _refresh_key(self):
        # Properties dynamically read from settings, no-op for backward compat
        pass

    def get_status(self) -> AIStatusResponse:
        key = self.api_key
        is_configured = bool(key and len(key) > 5)
        healthy = self._consecutive_failures < 3
        msg = "AI Engine active with structured heuristic fallback"
        if is_configured:
            msg = f"AI Engine active with {self.provider.capitalize()} ({self.model})"
            if not healthy:
                msg += f" — temporarily degraded: {self._last_error or 'too many failures'}"
            elif not self.rate_limiter.can_proceed():
                msg += f" — rate limited, {self.rate_limiter.wait_time():.0f}s until next request"
        return AIStatusResponse(
            is_configured=is_configured,
            provider=self.provider,
            model=self.model,
            is_healthy=healthy,
            message=msg
        )

    # ─────────────────────────────────────────────
    # Core AI call helper with rate limiting
    # ─────────────────────────────────────────────
    async def _call_ai(self, prompt: str, expect_json: bool = True) -> Optional[Any]:
        """Call the AI provider with rate limiting and async wait on throttle. Returns parsed JSON or raw text."""
        key = self.api_key
        if not key or len(key) < 5:
            return None

        # If rate limited, wait for the window to clear instead of silently dropping
        wait = self.rate_limiter.wait_time()
        if wait > 0:
            print(f"[AIService] Rate limit reached, sleeping {wait:.1f}s before proceeding")
            self._last_error = f"Rate limited, waiting {wait:.0f}s"
            await asyncio.sleep(wait + 0.5)  # small buffer to avoid edge-case re-throttle

        try:
            if self.provider == "gemini":
                return await self._call_gemini(prompt, expect_json)
            elif self.provider == "openai":
                return await self._call_openai(prompt, expect_json)
        except httpx.TimeoutException:
            self._consecutive_failures += 1
            self._last_error = "Request timed out"
            print("[AIService] Request timed out")
        except Exception as e:
            self._consecutive_failures += 1
            self._last_error = str(e)
            print(f"[AIService] AI call failed ({e})")
        return None

    async def _call_gemini(self, prompt: str, expect_json: bool) -> Optional[Any]:
        """Call Gemini using the official google-genai SDK with retry and candidate model fallback."""
        if _genai is None:
            self._last_error = "google-genai package not installed"
            print("[AIService] google-genai not installed, falling back to heuristic")
            return None

        key = self.api_key
        if not key or len(key) < 5:
            self._last_error = "API key not configured"
            return None

        client = _genai.Client(api_key=key)

        config: Dict[str, Any] = {
            "temperature": 0.4,
            "max_output_tokens": 2048,
        }
        if expect_json:
            config["response_mime_type"] = "application/json"

        # Candidate models to try: configured model first, then fallback models
        candidate_models = [self.model]
        for fb in ["gemini-3.5-flash-lite", "gemini-3.6-flash"]:
            if fb not in candidate_models:
                candidate_models.append(fb)

        max_retries = 2
        last_exception = None

        for model_name in candidate_models:
            for attempt in range(1, max_retries + 1):
                try:
                    response = await client.aio.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config,
                    )
                    self.rate_limiter.record()
                    self._consecutive_failures = 0
                    self._last_error = None

                    text = response.text
                    if expect_json:
                        clean_text = text.strip()
                        if clean_text.startswith("```"):
                            clean_text = re.sub(r"^```[a-zA-Z]*\n?", "", clean_text)
                            clean_text = re.sub(r"\n?```$", "", clean_text).strip()
                        return json.loads(clean_text)
                    return text

                except Exception as e:
                    last_exception = e
                    err_str = str(e).lower()
                    if "not found" in err_str or "404" in err_str or "no longer available" in err_str:
                        print(f"[AIService] Model '{model_name}' unavailable ({e}), trying fallback...")
                        break

                    is_rate_error = (
                        "429" in err_str
                        or "resource_exhausted" in err_str
                        or "quota" in err_str
                    )
                    if is_rate_error and attempt < max_retries:
                        backoff = 5 * attempt
                        print(f"[AIService] Gemini 429 on attempt {attempt}/{max_retries}, retrying in {backoff}s")
                        self._last_error = f"Rate limited by Gemini (attempt {attempt}), retrying"
                        await asyncio.sleep(backoff)
                        continue
                    break

        self._consecutive_failures += 1
        self._last_error = str(last_exception) if last_exception else "AI call failed"
        print(f"[AIService] Gemini call failed: {self._last_error}")
        return None

    async def _call_openai(self, prompt: str, expect_json: bool) -> Optional[Any]:
        """Call OpenAI via raw HTTP."""
        key = self.api_key
        if not key or len(key) < 5:
            return None

        async with httpx.AsyncClient(timeout=30.0) as client:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {key}"}
            messages = [{"role": "user", "content": prompt}]
            payload: Dict[str, Any] = {
                "model": self.model or "gpt-4o-mini",
                "messages": messages,
                "temperature": 0.4,
            }
            if expect_json:
                payload["response_format"] = {"type": "json_object"}

            res = await client.post(url, headers=headers, json=payload)

            if res.status_code == 429:
                self._consecutive_failures += 1
                self._last_error = "Rate limited by OpenAI API (429)"
                return None

            if res.status_code == 200:
                self._consecutive_failures = 0
                self._last_error = None
                data = res.json()
                text_content = data["choices"][0]["message"]["content"]
                if expect_json:
                    clean_text = text_content.strip()
                    if clean_text.startswith("```"):
                        clean_text = re.sub(r"^```[a-zA-Z]*\n?", "", clean_text)
                        clean_text = re.sub(r"\n?```$", "", clean_text).strip()
                    return json.loads(clean_text)
                return text_content
            else:
                self._consecutive_failures += 1
                self._last_error = f"OpenAI returned {res.status_code}"
                print(f"[AIService] OpenAI error {res.status_code}: {res.text[:200]}")
        return None

    # ─────────────────────────────────────────────
    # V1: Task Parsing (preserved)
    # ─────────────────────────────────────────────
    # ─────────────────────────────────────────────
    # V1/V2: Enhanced Natural Language Task Parsing
    # ─────────────────────────────────────────────
    def _heuristic_parse(self, text: str) -> AITaskParseResult:
        """High-precision, zero-latency natural language task parser.
        Handles dates, times, durations, priorities, categories, projects, tags, and subtasks."""
        clean_text = text.strip()
        category = "Personal"
        priority = "medium"
        estimated_minutes = None
        due_date = None
        suggested_project = None
        suggested_tags: List[str] = []
        lower = clean_text.lower()
        now_npt = datetime.now(NPT)

        # 1. Tags extraction (#tag or #homework)
        tag_matches = re.findall(r'#([A-Za-z0-9_\-]+)', clean_text)
        for t in tag_matches:
            suggested_tags.append(t.capitalize())

        # 2. Priority extraction (!urgent, !high, !medium, !low, p1, p2, p3, p4, keywords)
        if re.search(r'(?:!urgent|\bp1\b|\burgen(?:t|cy)\b|\basap\b|\bcritical\b|\bemergency\b|\bimmediately\b)', lower):
            priority = "urgent"
            suggested_tags.append("Urgent")
        elif re.search(r'(?:!high|\bp2\b|\bimportant\b|\bhigh priority\b|\bmust do\b|\bexam\b|\btest\b)', lower):
            priority = "high"
        elif re.search(r'(?:!low|\bp4\b|\blow priority\b|\bsomeday\b|\bmaybe\b)', lower):
            priority = "low"
        elif re.search(r'(?:!medium|\bp3\b|\bmedium priority\b|\bnormal\b)', lower):
            priority = "medium"

        # 3. Duration extraction (~30m, 1h, 1.5h, 45 mins, 2 hours, for 1 hr, takes 30m)
        dur_match = re.search(
            r'(?:takes?|taking|for|duration|est|~)?\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b',
            lower
        )
        if dur_match:
            val = float(dur_match.group(1))
            unit = dur_match.group(2)
            if 'h' in unit:
                estimated_minutes = int(val * 60)
            else:
                estimated_minutes = int(val)

        # 4. Specific time extraction (at 5pm, at 5:30pm, at 17:00, at 9am, 9:30 am, morning, evening, etc.)
        parsed_hour: Optional[int] = None
        parsed_minute: Optional[int] = None

        time_match = re.search(r'\b(?:at|@)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b', lower)
        if time_match:
            h = int(time_match.group(1))
            m = int(time_match.group(2)) if time_match.group(2) else 0
            meridiem = time_match.group(3)
            if meridiem == 'pm' and h < 12:
                h += 12
            elif meridiem == 'am' and h == 12:
                h = 0
            parsed_hour, parsed_minute = h, m
        else:
            military_match = re.search(r'\b(?:at|@)\s*(\d{1,2}):(\d{2})\b', lower)
            if military_match:
                parsed_hour = int(military_match.group(1))
                parsed_minute = int(military_match.group(2))
            elif "in the morning" in lower or "morning" in lower:
                parsed_hour, parsed_minute = 9, 0
            elif "in the afternoon" in lower or "afternoon" in lower:
                parsed_hour, parsed_minute = 14, 0
            elif "in the evening" in lower or "evening" in lower:
                parsed_hour, parsed_minute = 18, 0
            elif "at night" in lower or "tonight" in lower or "night" in lower:
                parsed_hour, parsed_minute = 20, 0
            elif "noon" in lower or "midday" in lower:
                parsed_hour, parsed_minute = 12, 0
            elif "midnight" in lower:
                parsed_hour, parsed_minute = 23, 59

        # 5. Date extraction (relative & absolute)
        target_date_npt: Optional[datetime] = None

        if "today" in lower:
            target_date_npt = now_npt
        elif "tomorrow" in lower or "tmrw" in lower:
            target_date_npt = now_npt + timedelta(days=1)
        elif "day after tomorrow" in lower:
            target_date_npt = now_npt + timedelta(days=2)
        elif "in 2 days" in lower or "in two days" in lower:
            target_date_npt = now_npt + timedelta(days=2)
        elif "in 3 days" in lower or "in three days" in lower:
            target_date_npt = now_npt + timedelta(days=3)
        elif "in 4 days" in lower or "in four days" in lower:
            target_date_npt = now_npt + timedelta(days=4)
        elif "in 5 days" in lower or "in five days" in lower:
            target_date_npt = now_npt + timedelta(days=5)
        elif "in a week" in lower or "in 1 week" in lower or "in one week" in lower:
            target_date_npt = now_npt + timedelta(days=7)
        elif "next week" in lower:
            target_date_npt = now_npt + timedelta(days=7)
        else:
            # Days of the week
            weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            for idx, wday in enumerate(weekdays):
                if re.search(rf'\b(?:next|this|on|by|before|due)?\s*{wday}\b', lower):
                    curr_wday = now_npt.weekday()
                    days_ahead = (idx - curr_wday) % 7
                    if "next " + wday in lower:
                        days_ahead += 7
                    elif days_ahead == 0 and "this " not in lower:
                        days_ahead = 7
                    target_date_npt = now_npt + timedelta(days=days_ahead)
                    break

            # Month name pattern (e.g. "Oct 15", "15 Oct", "October 20th", "2026-08-25")
            if not target_date_npt:
                iso_match = re.search(r'\b(\d{4})-(\d{1,2})-(\d{1,2})\b', lower)
                if iso_match:
                    try:
                        y, m, d = int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))
                        target_date_npt = now_npt.replace(year=y, month=m, day=d)
                    except Exception:
                        pass
                else:
                    month_map = {
                        "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
                        "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
                        "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
                        "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12
                    }
                    month_names = "|".join(month_map.keys())
                    m_match = re.search(rf'\b({month_names})\s+(\d{{1,2}})(?:st|nd|rd|th)?\b', lower)
                    if not m_match:
                        m_match = re.search(rf'\b(\d{{1,2}})(?:st|nd|rd|th)?\s+({month_names})\b', lower)
                        if m_match:
                            d_val, m_str = int(m_match.group(1)), m_match.group(2)
                        else:
                            d_val, m_str = None, None
                    else:
                        m_str, d_val = m_match.group(1), int(m_match.group(2))

                    if m_str and d_val:
                        m_val = month_map[m_str]
                        y_val = now_npt.year
                        try:
                            candidate = now_npt.replace(year=y_val, month=m_val, day=d_val)
                            if candidate < now_npt - timedelta(days=30):
                                candidate = candidate.replace(year=y_val + 1)
                            target_date_npt = candidate
                        except Exception:
                            pass

        # If a date was resolved, set default time if not specified
        if target_date_npt:
            def_h = parsed_hour if parsed_hour is not None else 18
            def_m = parsed_minute if parsed_minute is not None else 0
            due_date_npt = target_date_npt.replace(hour=def_h, minute=def_m, second=0, microsecond=0)
            if due_date_npt < now_npt:
                # Target date/time is in the past (e.g. 'at 9am' when now is 1pm) -> advance forward
                due_date_npt = due_date_npt + timedelta(days=1)
            due_date = due_date_npt.astimezone(timezone.utc).replace(tzinfo=None)
        elif parsed_hour is not None:
            # Time specified without explicit date -> assume today if in future, else tomorrow
            candidate = now_npt.replace(hour=parsed_hour, minute=parsed_minute or 0, second=0, microsecond=0)
            if candidate < now_npt:
                candidate = candidate + timedelta(days=1)
            due_date = candidate.astimezone(timezone.utc).replace(tzinfo=None)

        # 6. Category & Project inference
        academic_kw = [
            "dbms", "os", "operating system", "networks", "computer networks", "assignment",
            "homework", "exam", "study", "lecture", "professor", "chapter", "lab", "thesis",
            "university", "college", "slides", "teacher", "taught", "class", "course",
            "coursework", "syllabus", "curriculum", "tutorial", "seminar", "workshop",
            "quiz", "test", "paper", "essay", "research", "read the book", "textbook",
            "notes", "review chapter", "before class", "prepare for class", "lecture notes",
            "prof", "midterm", "final", "semester", "grade", "gpa"
        ]
        coding_kw = [
            "fastapi", "react", "backend", "frontend", "api", "database", "git", "github",
            "bug", "deploy", "auth", "refactor", "docker", "endpoint", "sql", "tailwind",
            "vite", "component", "route", "test suite", "migration", "server", "pr",
            "pull request", "code review", "schema", "orm", "fullstack"
        ]
        work_kw = [
            "meeting", "client", "presentation", "pitch", "report", "interview",
            "standup", "sync", "invoice", "customer", "manager", "colleague", "quarterly", "budget"
        ]
        personal_kw = [
            "buy", "order", "purchase", "cable", "groceries", "store", "amazon", "doctor",
            "gym", "workout", "call", "clean", "cook", "meds", "walk", "laundry", "bills",
            "rent", "haircut", "car", "flight", "hotel", "dinner", "lunch", "breakfast"
        ]

        if any(k in lower for k in academic_kw):
            category = "University"
            if "dbms" in lower or "database" in lower:
                suggested_project = "DBMS"
                suggested_tags.append("Homework")
            elif "network" in lower:
                suggested_project = "Computer Networks"
                suggested_tags.append("Homework")
            elif "os" in lower or "operating system" in lower:
                suggested_project = "Operating Systems"
                suggested_tags.append("Reading")
            elif "ai" in lower or "artificial intelligence" in lower or "model" in lower or "machine learning" in lower:
                suggested_project = "Artificial Intelligence"
                suggested_tags.append("Homework")
            else:
                suggested_tags.append("University")
        elif any(k in lower for k in coding_kw):
            category = "Project"
            suggested_tags.append("Coding")
            if "fastapi" in lower or "task" in lower or "engine" in lower or "nexus" in lower:
                suggested_project = "Personal Task Engine"
        elif any(k in lower for k in work_kw):
            category = "Work"
            suggested_tags.append("Work")
        elif any(k in lower for k in personal_kw):
            category = "Personal"
            if any(k in lower for k in ["buy", "order", "purchase", "groceries", "amazon"]):
                suggested_tags.append("Shopping")
            elif any(k in lower for k in ["gym", "workout", "doctor", "meds"]):
                suggested_tags.append("Health")

        # 7. Title Cleanup
        # Remove date/time/duration/priority/tag patterns from title to get clean action name
        title = clean_text
        patterns_to_strip = [
            r'#[A-Za-z0-9_\-]+',
            r'!urgent|!high|!medium|!low|\bp[1-4]\b',
            r'\b(?:takes?|taking|should\s+take|duration|est|~|for)?\s*\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b',
            r'\bfor\s+(?:around\s+|about\s+|~)?\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b',
            r'\b(?:before|by|on|due|at|@)?\s*(?:next|this)?\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            r'\b(?:day\s+after\s+tomorrow|in\s+\d+\s+days?|in\s+a\s+week|next\s+week|tomorrow|today|tonight|tmrw)\b',
            r'\b(?:at|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b',
            r'\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b',
            r'\b(?:in\s+the\s+morning|in\s+the\s+afternoon|in\s+the\s+evening|at\s+night|morning|afternoon|evening|tonight)\b',
            r"\b(?:i\s+need\s+to|i\s+should|i\s+have\s+to|don'?t\s+forget\s+to|remember\s+to|please)\b",
        ]
        for pat in patterns_to_strip:
            title = re.sub(pat, '', title, flags=re.IGNORECASE)

        # Clean trailing separators & spaces
        title = re.sub(r'[\s,\-~:;]+', ' ', title).strip()
        if not title:
            title = clean_text
        title = title[0].upper() + title[1:] if len(title) > 0 else title

        # Calculate high confidence for heuristic extraction
        confidence = 0.94 if (due_date or estimated_minutes or priority != "medium") else 0.88

        return AITaskParseResult(
            title=title,
            category=category,
            priority=priority,
            due_date_str=due_date.strftime("%Y-%m-%d %H:%M") if due_date else None,
            due_date_iso=due_date.isoformat() if due_date else None,
            estimated_minutes=estimated_minutes,
            suggested_project=suggested_project,
            suggested_tags=list(dict.fromkeys(suggested_tags)),
            confidence=confidence,
            reasoning="Extracted task structure."
        )

    async def parse_task(self, text: str, force_ai: bool = False) -> AITaskParseResult:
        """Parse natural language task entry.
        Uses AI when configured; falls back gracefully to high-precision heuristics."""
        heuristic = self._heuristic_parse(text)

        if self.api_key and len(self.api_key) > 5:
            now_npt = datetime.now(NPT)
            prompt = f"""You are an intelligent task parsing assistant. Convert the user's natural language task input into structured JSON.
Current datetime (Nepal Time / UTC+5:45): {now_npt.strftime("%Y-%m-%d %H:%M")}

User input: "{text}"

Return ONLY valid JSON matching this schema:
{{
    "title": "Clean, action-oriented task title without date/duration filler words",
    "category": "Personal | University | Work | Project | Other",
    "priority": "low | medium | high | urgent",
    "due_date_iso": "YYYY-MM-DDTHH:MM:SS (in UTC) or null",
    "estimated_minutes": integer or null,
    "suggested_project": "Name of project if mentioned or null",
    "suggested_tags": ["Tag1", "Tag2"],
    "confidence": float between 0.0 and 1.0,
    "reasoning": "brief explanation"
}}"""
            result = await self._call_ai(prompt)
            if result and isinstance(result, dict) and "title" in result:
                try:
                    due_iso = result.get("due_date_iso")
                    due_str = None
                    if due_iso:
                        try:
                            dt = datetime.fromisoformat(due_iso.replace("Z", "+00:00"))
                            due_str = dt.astimezone(NPT).strftime("%Y-%m-%d %H:%M")
                        except Exception:
                            due_str = heuristic.due_date_str
                    else:
                        due_str = heuristic.due_date_str
                        due_iso = heuristic.due_date_iso

                    return AITaskParseResult(
                        title=result.get("title") or heuristic.title,
                        category=result.get("category") or heuristic.category,
                        priority=result.get("priority") or heuristic.priority,
                        due_date_str=due_str,
                        due_date_iso=due_iso,
                        estimated_minutes=result.get("estimated_minutes") or heuristic.estimated_minutes,
                        suggested_project=result.get("suggested_project") or heuristic.suggested_project,
                        suggested_tags=result.get("suggested_tags") or heuristic.suggested_tags,
                        confidence=result.get("confidence", 0.95),
                        reasoning=result.get("reasoning", "AI structured extraction.")
                    )
                except Exception as e:
                    print(f"[AIService] Failed to parse AI result ({e}), using heuristic fallback")

        # Return fast, comprehensive heuristic result
        return heuristic

    async def enrich_task(self, title: str, description: Optional[str] = None) -> AITaskEnrichResponse:
        combined = f"{title}. {description or ''}"
        heuristics = self._heuristic_parse(combined)

        subtasks = []
        lower = combined.lower()
        if "dbms" in lower or "database" in lower:
            subtasks = ["Schema Design & ER Diagram", "Write SQL Queries / Constraints", "Verify 3NF/BCNF Normalization", "Submit Final Report"]
        elif "network" in lower:
            subtasks = ["Review Protocol Architecture", "Packet Analysis in Wireshark", "Summarize Findings"]
        elif "os" in lower or "operating system" in lower:
            subtasks = ["Read Assigned Sections", "Take Key Notes", "Implement/Test Code Example"]
        elif "fastapi" in lower or "api" in lower:
            subtasks = ["Define Pydantic Models", "Implement Route Handler", "Write Unit Tests", "Verify Swagger Docs"]
        elif "presentation" in lower or "slides" in lower:
            subtasks = ["Outline Slide Structure", "Draft Core Content", "Add Visual Diagrams", "Practice Rehearsal"]
        elif "buy" in lower or "order" in lower:
            subtasks = ["Check Price & Specs", "Place Order", "Track Delivery"]
        else:
            subtasks = ["Initial Planning", "Execution & Draft", "Review & Polish"]

        return AITaskEnrichResponse(
            category=heuristics.category, priority=heuristics.priority,
            due_date_iso=heuristics.due_date_iso,
            estimated_minutes=heuristics.estimated_minutes or 60,
            suggested_project=heuristics.suggested_project,
            suggested_tags=heuristics.suggested_tags,
            subtasks=subtasks,
            notes=f"AI evaluated task complexity as ~{heuristics.estimated_minutes or 60}m."
        )

    async def suggest_subtasks(self, task_id: int, title: str) -> AISubtaskSuggestResponse:
        enrichment = await self.enrich_task(title=title)
        return AISubtaskSuggestResponse(task_id=task_id, suggested_subtasks=enrichment.subtasks)

    async def generate_daily_summary(self, date_str: str, completed_titles: List[str], activity_descriptions: List[str]) -> str:
        if not completed_titles and not activity_descriptions:
            return f"No logged activity yet for {date_str}. Start by capturing tasks in the Inbox!"

        comp_count = len(completed_titles)
        if comp_count > 0:
            tasks_str = ", ".join(f"'{t}'" for t in completed_titles[:4])
            return f"High-impact progress on {date_str}: Completed {comp_count} task(s) including {tasks_str}. Strong execution momentum!"
        return f"Active progress on {date_str}: Logged {len(activity_descriptions)} actions. Keep focusing on top priority items!"

    # ─────────────────────────────────────────────
    # V2: Task Decomposition (§2)
    # ─────────────────────────────────────────────
    async def decompose_task(self, task_id: int, title: str, description: Optional[str], existing_subtasks: List[Dict], sibling_tasks: List[Dict]) -> AIDecomposeResponse:
        """AI suggests subtask breakdown for a task."""
        existing_titles = [s["title"] for s in existing_subtasks]
        sibling_titles = [s.get("title", "") for s in sibling_tasks]

        if not self.api_key or len(self.api_key) < 5:
            # Heuristic decomposition
            return self._heuristic_decompose(task_id, title, existing_titles)

        prompt = f"""You are a task decomposition assistant. Break down the following task into actionable subtasks.

Task: "{title}"
{f"Description: {description}" if description else ""}
{f"Existing subtasks (DO NOT duplicate): {existing_titles}" if existing_titles else ""}
{f"Sibling tasks in same project (avoid overlap): {sibling_titles[:5]}" if sibling_titles else ""}

Return ONLY valid JSON:
{{
    "subtasks": [
        {{"title": "Subtask title", "estimated_minutes": 30}},
        ...
    ],
    "reasoning": "Brief explanation of the breakdown"
}}

Rules:
- Each subtask should be completable in 15-90 minutes
- 3-8 subtasks is ideal
- Do NOT duplicate existing subtasks
- Order from dependency-first to last
- Be specific and actionable, not vague"""

        result = await self._call_ai(prompt)
        if result and "subtasks" in result:
            return AIDecomposeResponse(
                task_id=task_id,
                subtasks=[{"title": s["title"], "estimated_minutes": s.get("estimated_minutes")} for s in result["subtasks"]],
                reasoning=result.get("reasoning", "AI decomposed the task")
            )
        return self._heuristic_decompose(task_id, title, existing_titles)

    def _heuristic_decompose(self, task_id: int, title: str, existing_titles: List[str]) -> AIDecomposeResponse:
        lower = title.lower()
        subtasks = []
        if "dbms" in lower or "database" in lower:
            subtasks = [{"title": "Design ER diagram and schema", "estimated_minutes": 45}, {"title": "Write SQL queries", "estimated_minutes": 60}, {"title": "Verify normalization (3NF/BCNF)", "estimated_minutes": 30}, {"title": "Test with sample data", "estimated_minutes": 30}, {"title": "Write final report", "estimated_minutes": 45}]
        elif "network" in lower:
            subtasks = [{"title": "Review relevant protocols", "estimated_minutes": 30}, {"title": "Study key concepts", "estimated_minutes": 45}, {"title": "Practice with examples", "estimated_minutes": 30}, {"title": "Summarize findings", "estimated_minutes": 20}]
        elif "fastapi" in lower or "api" in lower or "backend" in lower:
            subtasks = [{"title": "Define data models and schemas", "estimated_minutes": 30}, {"title": "Implement route handlers", "estimated_minutes": 60}, {"title": "Add validation and error handling", "estimated_minutes": 30}, {"title": "Write tests", "estimated_minutes": 45}, {"title": "Update API documentation", "estimated_minutes": 15}]
        elif "deploy" in lower:
            subtasks = [{"title": "Prepare production configuration", "estimated_minutes": 30}, {"title": "Run build and verify", "estimated_minutes": 20}, {"title": "Deploy to production", "estimated_minutes": 30}, {"title": "Verify deployment health", "estimated_minutes": 15}]
        else:
            subtasks = [{"title": "Research and plan approach", "estimated_minutes": 30}, {"title": "Execute core work", "estimated_minutes": 60}, {"title": "Review and polish", "estimated_minutes": 20}]

        # Filter out existing
        existing_lower = {t.lower() for t in existing_titles}
        subtasks = [s for s in subtasks if s["title"].lower() not in existing_lower]

        return AIDecomposeResponse(
            task_id=task_id, subtasks=subtasks,
            reasoning="Decomposed using heuristic task analysis"
        )

    # ─────────────────────────────────────────────
    # V2: Daily Planner (§3) with Discrete Time Chunks & Partial Progress
    # ─────────────────────────────────────────────
    async def plan_my_day(self, context: Dict[str, Any]) -> AIPlannerResponse:
        """Generate a realistic daily plan based on discrete available time chunks and remaining task times."""
        today_tasks = context.get("today_tasks", [])
        overdue_tasks = context.get("overdue_tasks", [])
        floating_tasks = context.get("floating_tasks", [])
        upcoming_tasks = context.get("upcoming_tasks", [])
        daily_chunks = context.get("daily_chunks", [])
        total_minutes_available = context.get("total_available_minutes", 480)
        current_time = context.get("current_time_npt", "06:00")

        # Combine all pending tasks and compute remaining work needed
        all_needs_work = overdue_tasks + today_tasks + floating_tasks[:5] + upcoming_tasks[:3]
        total_minutes_needed = sum(t.get("remaining_minutes") or t.get("estimated_minutes") or 30 for t in all_needs_work)

        if not self.api_key or len(self.api_key) < 5:
            return self._heuristic_plan(all_needs_work, daily_chunks, current_time, total_minutes_needed, total_minutes_available)

        prompt = f"""You are an intelligent daily planner. Create a realistic schedule.

CRITICAL TIMING RULES:
- The current time is {current_time} NPT.
- You MUST NOT schedule any task or break before {current_time}.
- The first task MUST start at or after {current_time}.
- Available active time intervals remaining today: {json.dumps(daily_chunks, indent=2)}
- Total available time: {total_minutes_available} minutes ({total_minutes_available // 60}h {total_minutes_available % 60}m)
- Total estimated work needed: ~{total_minutes_needed} minutes

Overdue tasks (MUST prioritize):
{json.dumps(overdue_tasks, indent=2)}

Today's tasks:
{json.dumps(today_tasks, indent=2)}

Floating tasks (no due date):
{json.dumps(floating_tasks[:5], indent=2)}

Upcoming tasks (due this week):
{json.dumps(upcoming_tasks[:3], indent=2)}

Return ONLY valid JSON matching this schema:
{{
    "items": [
        {{
            "time": "HH:MM",
            "task_id": 123,
            "task_title": "Task name",
            "duration_minutes": 60,
            "type": "task",
            "note": "optional note e.g. Session 1 of 3 (60m / 180m remaining)"
        }},
        {{
            "time": "HH:MM",
            "task_title": "Break",
            "duration_minutes": 15,
            "type": "break"
        }}
    ],
    "summary": "Brief summary of the day plan",
    "total_planned_minutes": 480,
    "available_minutes": {total_minutes_available},
    "overflow": false,
    "overflow_message": null
}}

Rules:
- STRICTLY schedule tasks only inside the user's available time chunks starting at {current_time}
- NEVER schedule at 06:00 or morning hours if current time is {current_time}
- For long tasks (>90m remaining), split into focused work blocks (45-90m each)
- Prioritize overdue tasks first, then today's urgent tasks
- Schedule 10-15m breaks after deep work blocks
- If total work exceeds available time, set overflow=true with helpful explanation"""

        result = await self._call_ai(prompt)
        if result and "items" in result:
            items = [AIPlannerItem(**item) for item in result["items"]]
            return AIPlannerResponse(
                items=items,
                summary=result.get("summary", "Your customized day plan"),
                total_planned_minutes=result.get("total_planned_minutes", total_minutes_needed),
                available_minutes=total_minutes_available,
                overflow=result.get("overflow", total_minutes_needed > total_minutes_available),
                overflow_message=result.get("overflow_message")
            )
        return self._heuristic_plan(all_needs_work, daily_chunks, current_time, total_minutes_needed, total_minutes_available)

    def _heuristic_plan(self, tasks: List[Dict], daily_chunks: List[Dict], current_time: str, total_needed: int, total_available: int) -> AIPlannerResponse:
        items: List[AIPlannerItem] = []

        if not daily_chunks:
            daily_chunks = [{
                "start": "06:00",
                "end": "22:00",
                "duration_minutes": 960,
                "start_mins": 360,
                "end_mins": 1320
            }]

        try:
            curr_h, curr_m = map(int, current_time.split(":"))
            current_mins = curr_h * 60 + curr_m
        except Exception:
            current_mins = daily_chunks[0].get("start_mins", 360)

        # Queue of tasks with remaining minutes
        task_queue = []
        for t in tasks:
            rem = t.get("remaining_minutes")
            if rem is None:
                rem = t.get("estimated_minutes") or 30
            if rem > 0:
                task_queue.append({
                    "id": t.get("id"),
                    "title": t.get("title", "Task"),
                    "rem_minutes": rem,
                    "est_minutes": t.get("estimated_minutes") or rem,
                    "spent_minutes": t.get("spent_minutes") or 0,
                    "priority": t.get("priority", "medium"),
                    "is_overdue": bool(t.get("due_date") and t["due_date"] < datetime.utcnow().isoformat())
                })

        # Sort: Overdue first, then Urgent/High, then remaining
        priority_weights = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        task_queue.sort(key=lambda x: (0 if x["is_overdue"] else 1, priority_weights.get(x["priority"], 2)))

        total_planned_mins = 0

        # Schedule across each chunk
        for chunk in daily_chunks:
            c_start = chunk.get("start_mins", 360)
            c_end = chunk.get("end_mins", 1320)
            if c_end <= current_mins:
                continue

            slot_start = max(c_start, current_mins)
            # Round slot_start up to nearest 5 minutes
            if slot_start % 5 != 0:
                slot_start += (5 - (slot_start % 5))

            while slot_start < c_end and task_queue:
                slot_remaining = c_end - slot_start
                if slot_remaining < 15:
                    break

                curr_task = task_queue[0]
                task_rem = curr_task["rem_minutes"]

                # Max single session duration 60-90m
                session_len = min(task_rem, 90, slot_remaining)

                time_h = slot_start // 60
                time_m = slot_start % 60
                time_str = f"{time_h:02d}:{time_m:02d}"

                note = None
                if curr_task["est_minutes"] > session_len:
                    note = f"Focus Block · {session_len}m of {curr_task['est_minutes']}m ({curr_task['spent_minutes']}m already done)"

                items.append(AIPlannerItem(
                    time=time_str,
                    task_id=curr_task["id"],
                    task_title=curr_task["title"],
                    duration_minutes=session_len,
                    type="task",
                    note=note
                ))

                slot_start += session_len
                total_planned_mins += session_len
                curr_task["rem_minutes"] -= session_len

                if curr_task["rem_minutes"] <= 0:
                    task_queue.pop(0)

                # Add a 10m break if space permits in this chunk
                if slot_start + 15 <= c_end and task_queue:
                    break_h = slot_start // 60
                    break_m = slot_start % 60
                    items.append(AIPlannerItem(
                        time=f"{break_h:02d}:{break_m:02d}",
                        task_title="Quick Break",
                        duration_minutes=10,
                        type="break"
                    ))
                    slot_start += 10

        overflow = len(task_queue) > 0 and sum(t["rem_minutes"] for t in task_queue) > 0
        overflow_msg = None
        if overflow:
            rem_work = sum(t["rem_minutes"] for t in task_queue)
            overflow_msg = f"You have {total_available // 60}h {total_available % 60}m available in your active chunks, but ~{total_needed // 60}h {total_needed % 60}m of total work. {len(task_queue)} task(s) deferred."

        return AIPlannerResponse(
            items=items,
            summary=f"Planned {len([i for i in items if i.type == 'task'])} focus session(s) across {len(daily_chunks)} time chunk(s)",
            total_planned_minutes=total_planned_mins,
            available_minutes=total_available,
            overflow=overflow,
            overflow_message=overflow_msg
        )

    # ─────────────────────────────────────────────
    # V2: What Should I Do Now? (§5)
    # ─────────────────────────────────────────────
    async def what_should_i_do_now(self, context: Dict[str, Any]) -> AIWhatNowResponse:
        current_time = context.get("current_time_npt", "09:00")
        available_hours = context.get("available_hours_today", 8)
        overdue = context.get("overdue_tasks", [])
        today = context.get("today_tasks", [])
        floating = context.get("floating_tasks", [])

        all_candidates = overdue + today + floating[:5]

        if not self.api_key or len(self.api_key) < 5:
            return self._heuristic_what_now(all_candidates, available_hours, current_time)

        prompt = f"""You are a smart productivity advisor. Tell the user what to focus on RIGHT NOW.

Current time: {current_time} NPT
Available time today: ~{available_hours} hours ({available_hours * 60} minutes)

Overdue tasks:
{json.dumps(overdue[:5], indent=2)}

Today's tasks:
{json.dumps(today[:8], indent=2)}

Floating tasks (no deadline):
{json.dumps(floating[:5], indent=2)}

Return ONLY valid JSON:
{{
    "message": "Personalized recommendation message (2-3 sentences)",
    "recommendations": [
        {{
            "task_id": 123,
            "task_title": "Task name",
            "reason": "Why this should be done now",
            "duration_minutes": 60,
            "urgency": "critical | high | medium | low"
        }}
    ],
    "available_minutes": {available_hours * 60},
    "suggested_start_time": "HH:MM"
}}

Rules:
- Maximum 3-5 recommendations
- Always prioritize overdue tasks
- Consider estimated duration vs available time
- Be direct and actionable
- If nothing urgent, suggest the most impactful task"""

        result = await self._call_ai(prompt)
        if result and "recommendations" in result:
            return AIWhatNowResponse(
                message=result.get("message", "Here's what I recommend:"),
                recommendations=result["recommendations"],
                available_minutes=available_hours * 60,
                suggested_start_time=result.get("suggested_start_time", current_time)
            )
        return self._heuristic_what_now(all_candidates, available_hours, current_time)

    def _heuristic_what_now(self, candidates: List[Dict], available_hours: int, current_time: str) -> AIWhatNowResponse:
        # Sort: overdue first, then by priority, then by due date
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        sorted_candidates = sorted(candidates, key=lambda t: (
            0 if t.get("due_date") and t["due_date"] < datetime.utcnow().isoformat() else 1,
            priority_order.get(t.get("priority", "medium"), 2)
        ))

        recommendations = []
        remaining = available_hours * 60
        for t in sorted_candidates[:3]:
            dur = t.get("estimated_minutes") or 30
            if remaining <= 0:
                break
            overdue = t.get("due_date") and t["due_date"] < datetime.utcnow().isoformat()
            recommendations.append({
                "task_id": t.get("id"),
                "task_title": t.get("title"),
                "reason": "Overdue — needs immediate attention" if overdue else f"Priority: {t.get('priority', 'medium')}",
                "duration_minutes": dur,
                "urgency": "critical" if overdue else t.get("priority", "medium")
            })
            remaining -= dur

        msg = f"You have about {available_hours}h available. "
        if recommendations:
            msg += f"I recommend starting with \"{recommendations[0]['task_title']}\"."
        else:
            msg += "No urgent tasks found. Consider planning new tasks."

        return AIWhatNowResponse(
            message=msg,
            recommendations=recommendations,
            available_minutes=available_hours * 60,
            suggested_start_time=current_time
        )

    # ─────────────────────────────────────────────
    # V2: Natural Language Search (§10)
    # ─────────────────────────────────────────────
    def _heuristic_search(self, query: str, context: Dict[str, Any]) -> Optional[AINLSearchResponse]:
        """Fast heuristic filter converter for common search queries (0 API calls)."""
        lower = query.strip().lower()
        now_npt = datetime.now(NPT)
        today_start_utc = now_npt.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc).replace(tzinfo=None)
        today_end_utc = now_npt.replace(hour=23, minute=59, second=59, microsecond=0).astimezone(timezone.utc).replace(tzinfo=None)

        # 1. Status shortcuts
        if lower in ["inbox", "status:inbox"]:
            return AINLSearchResponse(filters={"status": ["inbox"]}, explanation="Showing inbox tasks")
        if lower in ["planned", "status:planned"]:
            return AINLSearchResponse(filters={"status": ["planned"]}, explanation="Showing planned tasks")
        if lower in ["doing", "in progress", "status:doing"]:
            return AINLSearchResponse(filters={"status": ["doing"]}, explanation="Showing tasks in progress")
        if lower in ["done", "completed", "status:done", "finished"]:
            return AINLSearchResponse(filters={"completed": True}, explanation="Showing completed tasks")

        # 2. Priority shortcuts
        if lower in ["urgent", "priority:urgent", "!urgent", "p1"]:
            return AINLSearchResponse(filters={"priority": ["urgent"], "completed": False}, explanation="Showing urgent tasks")
        if lower in ["high priority", "priority:high", "!high", "p2"]:
            return AINLSearchResponse(filters={"priority": ["high"], "completed": False}, explanation="Showing high priority tasks")

        # 3. Overdue & Due dates
        if lower in ["overdue", "late", "past due"]:
            return AINLSearchResponse(filters={"due_before": datetime.utcnow().isoformat(), "completed": False}, explanation="Showing overdue tasks")
        if lower in ["due today", "today", "today's tasks"]:
            return AINLSearchResponse(filters={"due_before": today_end_utc.isoformat(), "completed": False}, explanation="Showing tasks due today")
        if lower in ["due tomorrow", "tomorrow"]:
            tmrw_end = (now_npt + timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=0).astimezone(timezone.utc).replace(tzinfo=None)
            return AINLSearchResponse(filters={"due_before": tmrw_end.isoformat(), "completed": False}, explanation="Showing tasks due tomorrow")

        # 4. Project matches
        for p in context.get("projects", []):
            p_name = p.get("name", "")
            if lower == p_name.lower() or lower == f"project:{p_name.lower()}":
                return AINLSearchResponse(filters={"project_name": p_name, "completed": False}, explanation=f"Showing tasks in project '{p_name}'")

        # 5. Tag matches
        if lower.startswith("#"):
            tag_name = lower[1:].capitalize()
            return AINLSearchResponse(filters={"tag": tag_name}, explanation=f"Showing tasks tagged #{tag_name}")

        # 6. Category shortcuts
        for cat in ["University", "Personal", "Work", "Project"]:
            if lower == cat.lower() or lower == f"category:{cat.lower()}":
                return AINLSearchResponse(filters={"category": [cat], "completed": False}, explanation=f"Showing {cat} tasks")

        return None

    async def natural_language_search(self, query: str, context: Dict[str, Any]) -> AINLSearchResponse:
        """Convert natural language query into structured filter.
        Uses fast heuristic for structured/simple searches, and AI for complex semantic queries."""
        # 1. Try fast heuristic first
        heuristic_res = self._heuristic_search(query, context)
        if heuristic_res:
            return heuristic_res

        # 2. If query is complex and AI is available, call AI
        if self.api_key and len(self.api_key) > 5:
            now_npt = datetime.now(NPT)
            prompt = f"""You are a search filter assistant. Convert the user's natural language query into structured JSON filters.

Current date (Nepal Time): {now_npt.strftime("%Y-%m-%d")} ({now_npt.strftime("%A")})
Available tasks: {len(context.get("tasks", []))} tasks
Available projects: {[p["name"] for p in context.get("projects", [])]}
Available tags: {[t["name"] for t in context.get("tags", [])]}

User query: "{query}"

Return ONLY valid JSON:
{{
    "filters": {{
        "status": ["inbox", "planned", "doing"] or null to show all,
        "priority": ["low", "medium", "high", "urgent"] or null,
        "category": ["Personal", "University", "Work", "Project"] or null,
        "project_name": "exact project name" or null,
        "tag": "tag name" or null,
        "due_before": "YYYY-MM-DDTHH:MM:SS" or null,
        "due_after": "YYYY-MM-DDTHH:MM:SS" or null,
        "completed": true/false/null (true = only completed, false = only not completed, null = all),
        "search_keyword": "text to search in title" or null
    }},
    "explanation": "Brief explanation of what the filters mean"
}}

Rules:
- "this week" = due before end of current week
- "yesterday" = completed yesterday
- "postponed" = tasks that have been reopened or moved back
- "overdue" = tasks past their due date
- Be precise with date calculations based on current date"""

            result = await self._call_ai(prompt)
            if result and "filters" in result:
                return AINLSearchResponse(
                    filters=result["filters"],
                    explanation=result.get("explanation", f"Searching for: {query}")
                )

        # Fallback: basic keyword search
        return AINLSearchResponse(
            filters={"search_keyword": query, "completed": False},
            explanation=f"Keyword search for: {query}"
        )

    # ─────────────────────────────────────────────
    # V2: Weekly Review (§13)
    # ─────────────────────────────────────────────
    async def generate_weekly_review(self, context: Dict[str, Any]) -> AIWeeklyReviewResponse:
        """Generate weekly review with patterns."""
        completed_count = context.get("completed_count", 0)
        incomplete_count = context.get("incomplete_count", 0)
        overdue_count = context.get("overdue_count", 0)
        reopened_count = context.get("reopened_count", 0)
        completed_by_cat = context.get("completed_by_category", {})
        incomplete_by_cat = context.get("incomplete_by_category", {})

        if not self.api_key or len(self.api_key) < 5:
            return self._heuristic_weekly_review(context)

        prompt = f"""You are a productivity analyst. Generate a concise weekly review.

Week: {context.get("week_start", "?")} to {context.get("week_end", "?")}

Statistics:
- Completed: {completed_count} tasks
- Incomplete: {incomplete_count} tasks
- Overdue: {overdue_count} tasks
- Reopened (postponed): {reopened_count} tasks

Completed by category: {json.dumps(completed_by_cat)}
Incomplete by category: {json.dumps(incomplete_by_cat)}

Overdue tasks: {json.dumps(context.get("overdue_tasks", [])[:5])}

Return ONLY valid JSON:
{{
    "highlights": ["Highlight 1", "Highlight 2"],
    "patterns": ["Observable pattern 1 based on data", "Pattern 2"],
    "suggestions": ["Suggestion 1", "Suggestion 2"],
    "completion_rate": 75,
    "summary": "2-3 sentence overall summary"
}}

Rules:
- Only identify patterns supported by actual data
- Do NOT make psychological or medical claims
- Be specific and actionable
- If a task was postponed multiple times, mention it
- If most tasks were completed last-minute, note it"""

        result = await self._call_ai(prompt)
        if result:
            return AIWeeklyReviewResponse(
                highlights=result.get("highlights", []),
                patterns=result.get("patterns", []),
                suggestions=result.get("suggestions", []),
                completion_rate=result.get("completion_rate", 0),
                summary=result.get("summary", "Weekly review generated")
            )
        return self._heuristic_weekly_review(context)

    def _heuristic_weekly_review(self, context: Dict[str, Any]) -> AIWeeklyReviewResponse:
        completed = context.get("completed_count", 0)
        incomplete = context.get("incomplete_count", 0)
        overdue = context.get("overdue_count", 0)
        reopened = context.get("reopened_count", 0)
        total = completed + incomplete
        rate = round(completed / total * 100) if total > 0 else 0

        highlights = [f"Completed {completed} tasks this week"]
        if overdue > 0:
            highlights.append(f"{overdue} tasks are overdue")
        if reopened > 0:
            highlights.append(f"{reopened} tasks were postponed/reopened")

        patterns = []
        cat_data = context.get("completed_by_category", {})
        if cat_data:
            top_cat = max(cat_data, key=cat_data.get)
            patterns.append(f"Most productive category: {top_cat} ({cat_data[top_cat]} tasks)")

        suggestions = []
        if overdue > 0:
            suggestions.append("Focus on overdue tasks first next week")
        if reopened > 0:
            suggestions.append("Consider breaking down postponed tasks into smaller subtasks")
        if rate < 50:
            suggestions.append("Try reducing task load to increase completion rate")

        return AIWeeklyReviewResponse(
            highlights=highlights, patterns=patterns, suggestions=suggestions,
            completion_rate=rate,
            summary=f"Completed {completed}/{total} tasks ({rate}% completion rate). {overdue} overdue, {reopened} postponed."
        )

    # ─────────────────────────────────────────────
    # V2: Project Summary (§15)
    # ─────────────────────────────────────────────
    async def generate_project_summary(self, context: Dict[str, Any]) -> AIProjectSummaryResponse:
        project = context.get("project", {})
        remaining = context.get("remaining_tasks", [])
        overdue = context.get("overdue_tasks", [])
        blocked = context.get("blocked_tasks", [])
        progress = context.get("progress_pct", 0)

        if not self.api_key or len(self.api_key) < 5:
            return self._heuristic_project_summary(context)

        prompt = f"""You are a project analyst. Generate a concise project summary.

Project: {project.get("name", "Unknown")}
Category: {project.get("category", "General")}
Progress: {progress}% ({context.get("completed_count", 0)}/{context.get("total_tasks", 0)} tasks)
Remaining tasks: {len(remaining)}
Overdue tasks: {len(overdue)}
Blocked tasks: {len(blocked)}

Remaining: {json.dumps(remaining[:10])}
Overdue: {json.dumps(overdue[:5])}
Blocked: {json.dumps(blocked[:5])}

Return ONLY valid JSON:
{{
    "summary": "2-3 sentence project status summary",
    "blockers": ["Blocker 1 or empty if none"],
    "next_actions": ["Action 1", "Action 2"],
    "health": "on_track | at_risk | critical"
}}

Rules:
- Be specific about what's blocking progress
- Suggest concrete next actions
- Health: on_track if <3 overdue and <2 blocked, at_risk if some issues, critical if many blocked/overdue"""

        result = await self._call_ai(prompt)
        if result:
            return AIProjectSummaryResponse(
                summary=result.get("summary", ""),
                blockers=result.get("blockers", []),
                next_actions=result.get("next_actions", []),
                health=result.get("health", "on_track")
            )
        return self._heuristic_project_summary(context)

    def _heuristic_project_summary(self, context: Dict[str, Any]) -> AIProjectSummaryResponse:
        project = context.get("project", {})
        overdue = context.get("overdue_tasks", [])
        blocked = context.get("blocked_tasks", [])
        progress = context.get("progress_pct", 0)
        remaining = context.get("remaining_count", 0)

        health = "on_track"
        if len(overdue) > 2 or len(blocked) > 2:
            health = "critical"
        elif len(overdue) > 0 or len(blocked) > 0:
            health = "at_risk"

        next_actions = [t["title"] for t in context.get("remaining_tasks", [])[:3]]
        blockers = [b.get("blocked_by", "Unknown") for b in blocked]

        return AIProjectSummaryResponse(
            summary=f"Project '{project.get('name', '')}' is {progress}% complete with {remaining} tasks remaining.",
            blockers=blockers, next_actions=next_actions, health=health
        )

    # ─────────────────────────────────────────────
    # V2: AI Suggestions Center (§16)
    # ─────────────────────────────────────────────
    async def generate_suggestions(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate AI suggestions based on current context."""
        overdue = context.get("overdue_tasks", [])
        today = context.get("today_tasks", [])
        floating = context.get("floating_tasks", [])
        projects = context.get("project_summaries", [])

        suggestions = []

        # Deadline warnings
        for t in overdue[:3]:
            suggestions.append({
                "type": "deadline_warning",
                "title": f"⚠ {t['title']} is overdue",
                "description": f"Originally due: {t.get('due_date', 'unknown')}",
                "task_id": t["id"],
                "action": {"type": "schedule", "task_id": t["id"]}
            })

        # Daily focus suggestion
        if today:
            top = today[0]
            suggestions.append({
                "type": "daily_tip",
                "title": f"✦ Focus on \"{top['title']}\" today",
                "description": f"Priority: {top.get('priority', 'medium')}",
                "task_id": top["id"],
                "action": {"type": "start_task", "task_id": top["id"]}
            })

        # Project insight
        for p in projects[:2]:
            if p["remaining"] > 0:
                suggestions.append({
                    "type": "project_insight",
                    "title": f"✦ {p['name']}: {p['remaining']} tasks remaining",
                    "description": f"{p['done']}/{p['total']} complete",
                    "project_id": p.get("id"),
                    "action": {"type": "view_project", "project_id": p.get("id")}
                })

        # Floating tasks reminder
        if floating:
            suggestions.append({
                "type": "daily_tip",
                "title": f"📋 {len(floating)} tasks have no deadline",
                "description": "Consider scheduling them to avoid forgetting",
                "action": {"type": "review_floating"}
            })

        return suggestions[:6]

    # ─────────────────────────────────────────────
    # V2: Context-Aware Chat Assistant (§8)
    # ─────────────────────────────────────────────
    async def chat_assistant(self, message: str, context: Dict[str, Any]) -> AIChatResponse:
        """Context-aware AI assistant that answers questions about tasks."""
        if not self.api_key or len(self.api_key) < 5:
            return AIChatResponse(
                answer="AI assistant requires an API key to answer contextual questions. Please configure GEMINI_API_KEY.",
                actions=[]
            )

        prompt = f"""You are a task management assistant embedded in a personal task manager app. You have access to the user's actual task data. Answer their question using ONLY the data provided. Never fabricate information.

TASK DATA:
{json.dumps(context, indent=2)[:4000]}

User question: "{message}"

Return ONLY valid JSON:
{{
    "answer": "Clear, concise answer using the actual task data. Be specific with task names, dates, and counts. If the data doesn't contain enough info to answer, say so.",
    "actions": [
        {{
            "label": "Action button text",
            "type": "start_task | view_task | view_project | plan_day",
            "task_id": 123,
            "project_id": null
        }}
    ]
}}

Rules:
- Use ONLY data from the context, never make up tasks
- Be concise and direct
- Include specific task names, dates, counts from the data
- If nothing matches, say "I don't see that in your current tasks"
- Actions should help the user act on the answer"""

        result = await self._call_ai(prompt)
        if result:
            return AIChatResponse(
                answer=result.get("answer", "I couldn't generate a response."),
                actions=result.get("actions", [])
            )
        return AIChatResponse(
            answer="I'm having trouble connecting to the AI service. Please try again.",
            actions=[]
        )

    # ─────────────────────────────────────────────
    # V2: Enhanced Daily Summary (§11)
    # ─────────────────────────────────────────────
    async def generate_enhanced_daily_summary(self, context: Dict[str, Any]) -> str:
        """Generate a richer daily summary with context."""
        completed = context.get("completed_tasks", [])
        activities = context.get("activities", [])
        overdue = context.get("overdue_tasks", [])
        upcoming = context.get("upcoming_tasks", [])

        if not self.api_key or len(self.api_key) < 5:
            # Heuristic enhanced summary
            parts = []
            if completed:
                parts.append(f"Completed {len(completed)} task(s): {', '.join(t.get('title', '') for t in completed[:3])}")
            if overdue:
                parts.append(f"⚠ {len(overdue)} overdue task(s) need attention")
            if upcoming:
                parts.append(f"Coming up: {', '.join(t.get('title', '') for t in upcoming[:2])}")
            if not parts:
                return "No activity recorded yet today. Start by capturing tasks!"
            return " | ".join(parts)

        prompt = f"""You are a daily productivity assistant. Generate a concise end-of-day summary.

Completed today: {json.dumps(completed[:10])}
Activities: {len(activities)} actions logged
Overdue tasks: {json.dumps(overdue[:5])}
Upcoming tomorrow: {json.dumps(upcoming[:3])}

Return ONLY valid JSON:
{{
    "summary": "2-3 sentence daily summary",
    "highlights": ["Highlight 1", "Highlight 2"],
    "tomorrow_outlook": "Brief note about tomorrow's priorities"
}}

Rules:
- Only report information that exists in the data
- If time tracking data doesn't exist, say "Estimated from task durations"
- Be factual, not motivational"""

        result = await self._call_ai(prompt)
        if result:
            parts = [result.get("summary", "")]
            if result.get("highlights"):
                parts.append("Highlights: " + " | ".join(result["highlights"]))
            if result.get("tomorrow_outlook"):
                parts.append(f"Tomorrow: {result['tomorrow_outlook']}")
            return " ".join(parts)

        return await self.generate_daily_summary(
            date_str=datetime.now(NPT).strftime("%B %d, %Y"),
            completed_titles=[t.get("title", "") for t in completed],
            activity_descriptions=[a.get("description", "") for a in activities]
        )


ai_service = AIService()
