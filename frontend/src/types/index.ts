export type TaskStatus = 'inbox' | 'planned' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategory = 'Personal' | 'University' | 'Work' | 'Project' | 'Other';

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
  order: number;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  color: string;
  category: string;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_task_count?: number;
}

export interface ActivityLog {
  id: number;
  task_id?: number | null;
  action_type: string;
  description: string;
  details?: Record<string, any> | null;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  estimated_minutes?: number | null;
  category: string;
  project_id?: number | null;
  parent_task_id?: number | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  ai_metadata?: Record<string, any> | null;
  project?: Project | null;
  tags: Tag[];
  subtasks: Subtask[];
  activities?: ActivityLog[];
}

export interface DailyLogGroup {
  date: string;
  completed_tasks: Task[];
  worked_on_tasks: Task[];
  created_tasks: Task[];
  activities: ActivityLog[];
  ai_summary?: string | null;
}

export interface AIParseResult {
  title: string;
  category?: string;
  priority?: TaskPriority;
  due_date_str?: string | null;
  due_date_iso?: string | null;
  estimated_minutes?: number | null;
  suggested_project?: string | null;
  suggested_tags: string[];
  confidence: number;
  reasoning?: string | null;
}

export interface AIStatus {
  is_configured: boolean;
  provider: string;
  model: string;
  is_healthy: boolean;
  message: string;
}

export type ActiveView = 'today' | 'inbox' | 'kanban' | 'university' | 'projects' | 'dailylog' | 'weeklyreview' | 'aiassistant';

// ─── V2 Types ───────────────────────────────

export interface DecomposeSubtask {
  title: string;
  estimated_minutes?: number | null;
}

export interface DecomposeResult {
  task_id: number;
  subtasks: DecomposeSubtask[];
  reasoning?: string | null;
}

export interface PlannerItem {
  time: string;
  task_id?: number | null;
  task_title: string;
  duration_minutes: number;
  type: 'task' | 'break';
  note?: string | null;
}

export interface PlannerResult {
  items: PlannerItem[];
  summary: string;
  total_planned_minutes: number;
  available_minutes: number;
  overflow: boolean;
  overflow_message?: string | null;
}

export interface WhatNowRecommendation {
  task_id?: number | null;
  task_title: string;
  reason: string;
  duration_minutes: number;
  urgency: string;
}

export interface WhatNowResult {
  message: string;
  recommendations: WhatNowRecommendation[];
  available_minutes: number;
  suggested_start_time: string;
}

export interface NLSearchResult {
  filters: Record<string, any>;
  explanation: string;
  results?: Task[];
  count?: number;
}

export interface WeeklyReviewResult {
  highlights: string[];
  patterns: string[];
  suggestions: string[];
  completion_rate: number;
  summary: string;
}

export interface ProjectSummaryResult {
  summary: string;
  blockers: string[];
  next_actions: string[];
  health: 'on_track' | 'at_risk' | 'critical';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatAction[];
}

export interface ChatAction {
  label: string;
  type: string;
  task_id?: number;
  project_id?: number;
}

export interface ChatResult {
  answer: string;
  actions: ChatAction[];
}

export interface AISuggestion {
  type: string;
  title: string;
  description?: string;
  task_id?: number;
  project_id?: number;
  action?: Record<string, any>;
}

export interface DailyReflection {
  id: number;
  reflection_date: string;
  content: string;
  mood?: string | null;
  created_at: string;
}

export interface UserSettings {
  available_start_hour: number;
  available_end_hour: number;
  timezone: string;
}

export interface TaskDependency {
  id: number;
  task_id: number;
  depends_on_id: number;
  depends_on_title?: string | null;
}
