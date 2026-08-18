import os
import re
import json
import httpx
from datetime import datetime, timedelta, date, timezone
from typing import Optional, List, Dict, Any
from backend.app.config import settings
from backend.app.schemas.ai import AITaskParseResult, AITaskEnrichResponse, AISubtaskSuggestResponse, AIStatusResponse

class AIService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower()
        self.api_key = settings.AI_API_KEY.strip()
        self.model = settings.AI_MODEL.strip()

    def get_status(self) -> AIStatusResponse:
        is_configured = bool(self.api_key and len(self.api_key) > 5)
        return AIStatusResponse(
            is_configured=is_configured,
            provider=self.provider,
            model=self.model,
            is_healthy=True, # Active with smart fallback if no API key
            message="AI Engine active with structured heuristic fallback" if not is_configured else f"AI Engine active with {self.provider.capitalize()} ({self.model})"
        )

    def _heuristic_parse(self, text: str) -> AITaskParseResult:
        """Robust deterministic parser when AI key is not supplied or offline."""
        clean_text = text.strip()
        category = "Personal"
        priority = "medium"
        estimated_minutes = None
        due_date = None
        suggested_project = None
        suggested_tags = []

        lower = clean_text.lower()

        # 1. Parse duration
        duration_match = re.search(r'(?:take[s]?\s*(?:around|about)?\s*|for\s+|~)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b', lower)
        if duration_match:
            val = float(duration_match.group(1))
            unit = duration_match.group(2)
            if 'h' in unit:
                estimated_minutes = int(val * 60)
            else:
                estimated_minutes = int(val)

        # 2. Parse due dates (all in NPT — UTC+5:45)
        NPT = timezone(timedelta(hours=5, minutes=45))
        now_npt = datetime.now(NPT)
        now_utc = datetime.utcnow()
        if "today" in lower or "tonight" in lower:
            due_date_npt = now_npt.replace(hour=20, minute=0, second=0, microsecond=0)
            due_date = due_date_npt.astimezone(timezone.utc).replace(tzinfo=None)
        elif "tomorrow" in lower:
            due_date_npt = (now_npt + timedelta(days=1)).replace(hour=18, minute=0, second=0, microsecond=0)
            due_date = due_date_npt.astimezone(timezone.utc).replace(tzinfo=None)
        elif "in 2 days" in lower or "in two days" in lower:
            due_date_npt = (now_npt + timedelta(days=2)).replace(hour=18, minute=0, second=0, microsecond=0)
            due_date = due_date_npt.astimezone(timezone.utc).replace(tzinfo=None)
        elif "in 3 days" in lower or "in three days" in lower:
            due_date_npt = (now_npt + timedelta(days=3)).replace(hour=18, minute=0, second=0, microsecond=0)
            due_date = due_date_npt.astimezone(timezone.utc).replace(tzinfo=None)
        elif "next week" in lower:
            due_date_npt = (now_npt + timedelta(days=7)).replace(hour=12, minute=0, second=0, microsecond=0)
            due_date = due_date_npt.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            for idx, wday in enumerate(weekdays):
                if f"before {wday}" in lower or f"by {wday}" in lower or f"on {wday}" in lower:
                    curr_wday = now_npt.weekday()
                    days_ahead = (idx - curr_wday) % 7
                    if days_ahead == 0:
                        days_ahead = 7
                    due_date_npt = (now_npt + timedelta(days=days_ahead)).replace(hour=18, minute=0, second=0, microsecond=0)
                    due_date = due_date_npt.astimezone(timezone.utc).replace(tzinfo=None)
                    break

        # 3. Parse category & project hints
        academic_keywords = ["dbms", "os", "operating systems", "networks", "computer networks", "assignment", "homework", "exam", "study", "lecture", "professor", "chapter", "lab", "thesis", "university", "college", "slides"]
        coding_keywords = ["fastapi", "react", "backend", "frontend", "api", "database", "git", "bug", "deploy", "auth", "refactor", "docker"]
        shopping_keywords = ["buy", "order", "purchase", "cable", "groceries", "store", "amazon"]

        if any(k in lower for k in academic_keywords):
            category = "University"
            if "dbms" in lower:
                suggested_project = "DBMS"
                suggested_tags.append("Homework")
            elif "network" in lower:
                suggested_project = "Computer Networks"
                suggested_tags.append("Homework")
            elif "os" in lower or "operating system" in lower:
                suggested_project = "Operating Systems"
                suggested_tags.append("Reading")
            elif "ai" in lower or "artificial intelligence" in lower or "model" in lower:
                suggested_project = "Artificial Intelligence"
                suggested_tags.append("Homework")
            else:
                suggested_tags.append("University")
        elif any(k in lower for k in coding_keywords):
            category = "Project"
            suggested_tags.append("Coding")
            if "fastapi" in lower or "task" in lower:
                suggested_project = "Personal Task Engine"
        elif any(k in lower for k in shopping_keywords):
            category = "Personal"
            suggested_tags.append("Shopping")

        # 4. Parse Priority
        if any(w in lower for w in ["urgent", "asap", "critical", "immediately", "emergency"]):
            priority = "urgent"
            suggested_tags.append("Urgent")
        elif any(w in lower for w in ["important", "must", "exam", "high priority"]):
            priority = "high"

        # 5. Extract Title (strip common trailing qualifiers)
        title = clean_text
        patterns_to_strip = [
            r'\b(?:should\s+take|taking|take)\s+(?:around\s+|about\s+|~)?\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b',
            r'\bfor\s+(?:around\s+|about\s+|~)?\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b',
            r'\b(?:before|by|on|due)\s+(?:tomorrow|today|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b',
            r'\b(?:tomorrow|today|tonight)\b'
        ]
        for pat in patterns_to_strip:
            title = re.sub(pat, '', title, flags=re.IGNORECASE).strip()
        
        # Clean trailing commas, hyphens or spaces
        title = re.sub(r'[\s,\-]+$', '', title).strip()
        if not title:
            title = clean_text

        # Capitalize first letter
        title = title[0].upper() + title[1:] if len(title) > 0 else title

        return AITaskParseResult(
            title=title,
            category=category,
            priority=priority,
            due_date_str=due_date.strftime("%Y-%m-%d %H:%M") if due_date else None,
            due_date_iso=due_date.isoformat() if due_date else None,
            estimated_minutes=estimated_minutes,
            suggested_project=suggested_project,
            suggested_tags=list(set(suggested_tags)),
            confidence=0.88,
            reasoning="Parsed using built-in task heuristic reasoning."
        )

    async def parse_task(self, text: str) -> AITaskParseResult:
        """Parses natural language prompt into structured task data."""
        if not self.api_key or len(self.api_key) < 5:
            return self._heuristic_parse(text)

        NPT = timezone(timedelta(hours=5, minutes=45))
        now_npt = datetime.now(NPT)
        prompt = f"""
        You are an intelligent task parsing assistant. Convert the user's natural language task input into structured JSON.
        Current datetime (Nepal Time / UTC+5:45): {now_npt.strftime("%Y-%m-%d %H:%M")}
        
        User input: "{text}"
        
        Return ONLY valid JSON matching this schema:
        {{
            "title": "Clean, action-oriented task title without date/duration filler words",
            "category": "Personal | University | Work | Project | Other",
            "priority": "low | medium | high | urgent",
            "due_date_iso": "YYYY-MM-DDTHH:MM:SS (in UTC) or null",
            "estimated_minutes": integer or null,
            "suggested_project": "Name of project if mentioned (e.g. DBMS, Computer Networks, Operating Systems, Artificial Intelligence) or null",
            "suggested_tags": ["Tag1", "Tag2"],
            "confidence": float between 0.0 and 1.0,
            "reasoning": "brief explanation"
        }}
        """

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                if self.provider == "gemini":
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"response_mime_type": "application/json"}
                    }
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed_dict = json.loads(text_content)
                        return AITaskParseResult(**parsed_dict)
                elif self.provider == "openai":
                    url = "https://api.openai.com/v1/chat/completions"
                    headers = {"Authorization": f"Bearer {self.api_key}"}
                    payload = {
                        "model": self.model or "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"}
                    }
                    res = await client.post(url, headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        text_content = data["choices"][0]["message"]["content"]
                        parsed_dict = json.loads(text_content)
                        return AITaskParseResult(**parsed_dict)
        except Exception as e:
            print(f"[AIService] Remote call failed ({e}), falling back to heuristics.")

        return self._heuristic_parse(text)

    async def enrich_task(self, title: str, description: Optional[str] = None) -> AITaskEnrichResponse:
        """Suggests metadata, tags, and breaking subtasks for an existing task."""
        combined = f"{title}. {description or ''}"
        heuristics = self._heuristic_parse(combined)
        
        # Suggest realistic subtasks based on domain
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
            category=heuristics.category,
            priority=heuristics.priority,
            due_date_iso=heuristics.due_date_iso,
            estimated_minutes=heuristics.estimated_minutes or 60,
            suggested_project=heuristics.suggested_project,
            suggested_tags=heuristics.suggested_tags,
            subtasks=subtasks,
            notes=f"AI evaluated task complexity as ~{heuristics.estimated_minutes or 60}m."
        )

    async def suggest_subtasks(self, task_id: int, title: str) -> AISubtaskSuggestResponse:
        enrichment = await self.enrich_task(title=title)
        return AISubtaskSuggestResponse(
            task_id=task_id,
            suggested_subtasks=enrichment.subtasks
        )

    async def generate_daily_summary(self, date_str: str, completed_titles: List[str], activity_descriptions: List[str]) -> str:
        """Generates a concise, motivating daily productivity executive summary."""
        if not completed_titles and not activity_descriptions:
            return f"No logged activity yet for {date_str}. Start by dumping your tasks into the Inbox or Today dashboard!"
        
        comp_count = len(completed_titles)
        if comp_count > 0:
            tasks_str = ", ".join(f"'{t}'" for t in completed_titles[:4])
            return f"High-impact progress on {date_str}: Completed {comp_count} task(s) including {tasks_str}. Strong execution momentum!"
        
        return f"Active progress on {date_str}: Logged {len(activity_descriptions)} actions. Keep focusing on top priority items!"

ai_service = AIService()
