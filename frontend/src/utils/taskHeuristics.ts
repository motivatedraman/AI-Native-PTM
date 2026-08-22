import { AIParseResult, TaskPriority } from '../types';
import { formatDateLabel, formatTimeNPT } from './time';

/** Nepal Standard Time — UTC+5:45 (no DST) */
const NPT_TZ = 'Asia/Kathmandu';
const NPT_OFFSET_MINUTES = 5 * 60 + 45;

interface DayParts { y: number; mo: number; da: number }

function nptNow(): DayParts & { hh: number; mi: number } {
  const s = new Intl.DateTimeFormat('sv-SE', {
    timeZone: NPT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
  const [datePart, timePart] = s.split(' ');
  const [y, mo, da] = datePart.split('-').map(Number);
  const [hh, mi] = timePart.split(':').map(Number);
  return { y, mo, da, hh, mi };
}

function addDays(day: DayParts, days: number): DayParts {
  const d = new Date(Date.UTC(day.y, day.mo - 1, day.da) + days * 86400000);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, da: d.getUTCDate() };
}

/** Convert an NPT wall-clock moment to a UTC ISO instant (matches backend storage). */
function nptWallToUtcMs(day: DayParts, hh: number, mi: number): number {
  return Date.UTC(day.y, day.mo - 1, day.da, hh, mi) - NPT_OFFSET_MINUTES * 60000;
}

function dayKey(day: DayParts): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.y}-${pad(day.mo)}-${pad(day.da)}`;
}

/**
 * High-speed, zero-API client-side heuristic parser for natural language tasks.
 * Delivers instant typing preview without consuming AI quota or making network calls.
 */
export function parseTaskLocally(text: string): AIParseResult {
  const clean = text.trim();
  if (!clean) {
    return {
      title: '',
      category: 'Personal',
      priority: 'medium',
      due_date_str: null,
      due_date_iso: null,
      estimated_minutes: null,
      suggested_project: null,
      suggested_tags: [],
      confidence: 0,
      reasoning: '',
    };
  }

  const lower = clean.toLowerCase();
  let category = 'Personal';
  let priority: TaskPriority = 'medium';
  let estimated_minutes: number | null = null;
  let suggested_project: string | null = null;
  const suggested_tags: string[] = [];

  // 1. Tags extraction (#tag or #homework)
  const tagMatches = clean.match(/#([A-Za-z0-9_-]+)/g);
  if (tagMatches) {
    tagMatches.forEach(t => {
      const name = t.replace('#', '');
      suggested_tags.push(name.charAt(0).toUpperCase() + name.slice(1));
    });
  }

  // 2. Priority extraction (!urgent, !high, !medium, !low, p1, p2, p3, p4, keywords)
  if (/(?:!urgent|\bp1\b|\burgen(?:t|cy)\b|\basap\b|\bcritical\b|\bemergency\b|\bimmediately\b)/i.test(lower)) {
    priority = 'urgent';
    suggested_tags.push('Urgent');
  } else if (/(?:!high|\bp2\b|\bimportant\b|\bhigh priority\b|\bmust do\b|\bexam\b|\btest\b)/i.test(lower)) {
    priority = 'high';
  } else if (/(?:!low|\bp4\b|\blow priority\b|\bsomeday\b|\bmaybe\b)/i.test(lower)) {
    priority = 'low';
  } else if (/(?:!medium|\bp3\b|\bmedium priority\b|\bnormal\b)/i.test(lower)) {
    priority = 'medium';
  }

  // 3. Duration extraction (~30m, 1h, 1.5h, 45 mins, 2 hours, for 1 hr, takes 30m)
  const durMatch = lower.match(/(?:takes?|taking|for|duration|est|~)?\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i);
  if (durMatch) {
    const val = parseFloat(durMatch[1]);
    const unit = durMatch[2];
    estimated_minutes = unit.startsWith('h') ? Math.round(val * 60) : Math.round(val);
  }

  // 4. Time extraction (at 5pm, at 5:30pm, at 17:00, morning, evening, etc.)
  let parsedHour: number | null = null;
  let parsedMinute: number | null = null;

  const timeMatch = lower.match(/\b(?:at|@)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3].toLowerCase();
    if (meridiem === 'pm' && h < 12) h += 12;
    else if (meridiem === 'am' && h === 12) h = 0;
    parsedHour = h;
    parsedMinute = m;
  } else {
    const militaryMatch = lower.match(/\b(?:at|@)\s*(\d{1,2}):(\d{2})\b/);
    if (militaryMatch) {
      parsedHour = parseInt(militaryMatch[1], 10);
      parsedMinute = parseInt(militaryMatch[2], 10);
    } else if (lower.includes('in the morning') || lower.includes('morning')) {
      parsedHour = 9;
      parsedMinute = 0;
    } else if (lower.includes('in the afternoon') || lower.includes('afternoon')) {
      parsedHour = 14;
      parsedMinute = 0;
    } else if (lower.includes('in the evening') || lower.includes('evening')) {
      parsedHour = 18;
      parsedMinute = 0;
    } else if (lower.includes('at night') || lower.includes('tonight') || lower.includes('night')) {
      parsedHour = 20;
      parsedMinute = 0;
    } else if (lower.includes('noon')) {
      parsedHour = 12;
      parsedMinute = 0;
    } else if (lower.includes('midnight')) {
      parsedHour = 23;
      parsedMinute = 59;
    }
  }

  // 5. Date extraction (computed in NPT so the preview matches the server exactly)
  const nowNpt = nptNow();
  let dayOffset: number | null = null;

  if (lower.includes('today')) {
    dayOffset = 0;
  } else if (lower.includes('tomorrow') || lower.includes('tmrw')) {
    dayOffset = 1;
  } else if (lower.includes('day after tomorrow')) {
    dayOffset = 2;
  } else if (lower.includes('in 2 days') || lower.includes('in two days')) {
    dayOffset = 2;
  } else if (lower.includes('in 3 days') || lower.includes('in three days')) {
    dayOffset = 3;
  } else if (lower.includes('in 4 days')) {
    dayOffset = 4;
  } else if (lower.includes('in a week') || lower.includes('in 1 week') || lower.includes('next week')) {
    dayOffset = 7;
  } else {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < weekdays.length; i++) {
      const wday = weekdays[i];
      const re = new RegExp(`\\b(?:next|this|on|by|before|due)?\\s*${wday}\\b`, 'i');
      if (re.test(lower)) {
        const currWday = new Date(Date.UTC(nowNpt.y, nowNpt.mo - 1, nowNpt.da)).getUTCDay();
        let daysAhead = (i - currWday + 7) % 7;
        if (lower.includes('next ' + wday)) daysAhead += 7;
        else if (daysAhead === 0 && !lower.includes('this ')) daysAhead = 7;
        dayOffset = daysAhead;
        break;
      }
    }
  }

  let dueDateIso: string | null = null;
  let dueDateStr: string | null = null;
  const h = parsedHour !== null ? parsedHour : 18;
  const m = parsedMinute !== null ? parsedMinute : 0;

  if (dayOffset !== null) {
    let targetDay = addDays(nowNpt, dayOffset);
    // Roll forward only when an EXPLICIT time was given and is already past
    // (mirrors backend rule; keyword-only dates like 'today' stay put)
    if (parsedHour !== null && nptWallToUtcMs(targetDay, h, m) <= Date.now()) {
      targetDay = addDays(targetDay, 1);
    }
    dueDateIso = new Date(nptWallToUtcMs(targetDay, h, m)).toISOString();
    dueDateStr = `${formatDateLabel(dayKey(targetDay))} at ${formatTimeNPT(dueDateIso)}`;
  } else if (parsedHour !== null) {
    let targetDay: DayParts = { y: nowNpt.y, mo: nowNpt.mo, da: nowNpt.da };
    if (nptWallToUtcMs(targetDay, h, m) <= Date.now()) {
      targetDay = addDays(targetDay, 1);
    }
    dueDateIso = new Date(nptWallToUtcMs(targetDay, h, m)).toISOString();
    dueDateStr = `${formatDateLabel(dayKey(targetDay))} at ${formatTimeNPT(dueDateIso)}`;
  }

  // 6. Category & Project inference
  const academicKw = [
    'dbms', 'os', 'operating system', 'networks', 'computer networks', 'assignment',
    'homework', 'exam', 'study', 'lecture', 'professor', 'chapter', 'lab', 'thesis',
    'university', 'college', 'slides', 'teacher', 'taught', 'class', 'course',
    'coursework', 'syllabus', 'curriculum', 'quiz', 'test', 'paper', 'essay', 'research',
    'read the book', 'textbook', 'notes', 'review chapter', 'before class', 'prof'
  ];
  const codingKw = [
    'fastapi', 'react', 'backend', 'frontend', 'api', 'database', 'git', 'github',
    'bug', 'deploy', 'auth', 'refactor', 'docker', 'endpoint', 'sql', 'tailwind',
    'vite', 'component', 'route', 'test suite', 'migration', 'pr', 'code'
  ];
  const workKw = [
    'meeting', 'client', 'presentation', 'pitch', 'report', 'interview',
    'standup', 'sync', 'invoice', 'customer', 'manager', 'budget'
  ];
  const personalKw = [
    'buy', 'order', 'purchase', 'groceries', 'store', 'amazon', 'doctor',
    'gym', 'workout', 'call', 'clean', 'cook', 'meds', 'walk', 'laundry', 'rent'
  ];

  if (academicKw.some(k => lower.includes(k))) {
    category = 'University';
    if (lower.includes('dbms') || lower.includes('database')) {
      suggested_project = 'DBMS';
      suggested_tags.push('Homework');
    } else if (lower.includes('network')) {
      suggested_project = 'Computer Networks';
      suggested_tags.push('Homework');
    } else if (lower.includes('os') || lower.includes('operating system')) {
      suggested_project = 'Operating Systems';
      suggested_tags.push('Reading');
    } else if (lower.includes('ai') || lower.includes('machine learning')) {
      suggested_project = 'Artificial Intelligence';
      suggested_tags.push('Homework');
    } else {
      suggested_tags.push('University');
    }
  } else if (codingKw.some(k => lower.includes(k))) {
    category = 'Project';
    suggested_tags.push('Coding');
    if (lower.includes('fastapi') || lower.includes('task') || lower.includes('nexus')) {
      suggested_project = 'Personal Task Engine';
    }
  } else if (workKw.some(k => lower.includes(k))) {
    category = 'Work';
    suggested_tags.push('Work');
  } else if (personalKw.some(k => lower.includes(k))) {
    category = 'Personal';
    if (/buy|order|purchase|groceries|amazon/i.test(lower)) {
      suggested_tags.push('Shopping');
    } else if (/gym|workout|doctor|meds/i.test(lower)) {
      suggested_tags.push('Health');
    }
  }

  // 7. Title Cleaning
  let title = clean;
  const patternsToStrip = [
    /#[A-Za-z0-9_-]+/g,
    /!urgent|!high|!medium|!low|\bp[1-4]\b/gi,
    /\b(?:takes?|taking|should\s+take|duration|est|~|for)?\s*\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b/gi,
    /\bfor\s+(?:around\s+|about\s+|~)?\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b/gi,
    /\b(?:before|by|on|due|at|@)?\s*(?:next|this)?\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(?:day\s+after\s+tomorrow|in\s+\d+\s+days?|in\s+a\s+week|next\s+week|tomorrow|today|tonight|tmrw)\b/gi,
    /\b(?:at|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi,
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi,
    /\b(?:in\s+the\s+morning|in\s+the\s+afternoon|in\s+the\s+evening|at\s+night|morning|afternoon|evening|tonight)\b/gi,
    /\b(?:i\s+need\s+to|i\s+should|i\s+have\s+to|don'?t\s+forget\s+to|remember\s+to|please)\b/gi,
  ];

  patternsToStrip.forEach(pat => {
    title = title.replace(pat, '');
  });

  title = title.replace(/[\s, ~:;]+/g, ' ').trim();
  if (!title) title = clean;
  title = title.charAt(0).toUpperCase() + title.slice(1);

  const uniqueTags = Array.from(new Set(suggested_tags));

  return {
    title,
    category,
    priority,
    due_date_str: dueDateStr,
    due_date_iso: dueDateIso,
    estimated_minutes,
    suggested_project,
    suggested_tags: uniqueTags,
    confidence: dueDateIso || estimated_minutes || priority !== 'medium' ? 0.95 : 0.88,
    reasoning: 'Extracted task structure',
  };
}
