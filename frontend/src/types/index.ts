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

export type ActiveView = 'today' | 'inbox' | 'kanban' | 'university' | 'projects' | 'dailylog';
