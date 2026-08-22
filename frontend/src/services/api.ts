import { Task, Project, Tag, Subtask, ActivityLog, DailyLogGroup, AIParseResult, AIStatus, DecomposeResult, PlannerResult, WhatNowResult, NLSearchResult, WeeklyReviewResult, ProjectSummaryResult, ChatResult, AISuggestion, DailyReflection, UserSettings, TaskDependency, FocusSession } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getHeaders = (customHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('nexus_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };
};

export const api = {
  // ─── Auth ────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem('nexus_auth_token');
  },

  setToken(token: string) {
    localStorage.setItem('nexus_auth_token', token);
  },

  clearToken() {
    localStorage.removeItem('nexus_auth_token');
  },

  async login(username: string, password: string): Promise<{ access_token: string; username: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid username or password');
    }
    const data = await res.json();
    this.setToken(data.access_token);
    return data;
  },

  async getMe(): Promise<{ username: string; is_authenticated: boolean }> {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Unauthenticated');
    return res.json();
  },

  // ─── Tasks ───────────────────────────────
  async getTasks(params?: { status?: string; category?: string; project_id?: number; search?: string; tag?: string }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.project_id !== undefined) query.append('project_id', String(params.project_id));
    if (params?.search) query.append('search', params.search);
    if (params?.tag) query.append('tag', params.tag);
    const res = await fetch(`${API_BASE}/tasks?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(data: Partial<Task> & { tag_ids?: number[]; initial_subtasks?: string[] }): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  async quickAddTask(raw_text: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/quick-add`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ raw_text }) });
    if (!res.ok) throw new Error('Failed to quick add task');
    return res.json();
  },

  async updateTask(id: number, data: Partial<Task> & { tag_ids?: number[] }): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  async completeTask(id: number): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}/complete`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to complete task');
    return res.json();
  },

  async reopenTask(id: number): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}/reopen`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to reopen task');
    return res.json();
  },

  async deleteTask(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete task');
  },

  async logTaskTime(taskId: number, minutes: number): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/log-time?minutes=${minutes}`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to log time');
    return res.json();
  },

  // ─── Subtasks ────────────────────────────
  async addSubtask(taskId: number, title: string): Promise<Subtask> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ title }) });
    if (!res.ok) throw new Error('Failed to add subtask');
    return res.json();
  },

  async updateSubtask(taskId: number, subtaskId: number, data: Partial<Subtask>): Promise<Subtask> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update subtask');
    return res.json();
  },

  async deleteSubtask(taskId: number, subtaskId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete subtask');
  },

  // ─── Projects ────────────────────────────
  async getProjects(category?: string): Promise<Project[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`${API_BASE}/projects${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async deleteProject(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete project');
  },

  // ─── Tags ────────────────────────────────
  async getTags(): Promise<Tag[]> {
    const res = await fetch(`${API_BASE}/tags`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch tags');
    return res.json();
  },

  // ─── Activity & Daily Log ────────────────
  async getActivity(limit: number = 50): Promise<ActivityLog[]> {
    const res = await fetch(`${API_BASE}/activity?limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch activity');
    return res.json();
  },

  async getDailyLog(date?: string): Promise<DailyLogGroup> {
    const query = date ? `?target_date=${date}` : '';
    const res = await fetch(`${API_BASE}/daily-log${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch daily log');
    return res.json();
  },

  // ─── AI V1 ───────────────────────────────
  async getAIStatus(): Promise<AIStatus> {
    const res = await fetch(`${API_BASE}/ai/status`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch AI status');
    return res.json();
  },

  async testAIConnection(): Promise<any> {
    const res = await fetch(`${API_BASE}/ai/test`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to test AI connection');
    return res.json();
  },

  async parseTaskWithAI(text: string, force_ai: boolean = false): Promise<AIParseResult> {
    const res = await fetch(`${API_BASE}/ai/parse-task`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ text, force_ai }) });
    if (!res.ok) throw new Error('Failed to parse task with AI');
    return res.json();
  },

  async enrichTaskWithAI(taskId: number) {
    const res = await fetch(`${API_BASE}/ai/enrich-task/${taskId}`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to enrich task');
    return res.json();
  },

  async suggestSubtasksWithAI(taskId: number): Promise<{ task_id: number; suggested_subtasks: string[] }> {
    const res = await fetch(`${API_BASE}/ai/suggest-subtasks/${taskId}`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to suggest subtasks');
    return res.json();
  },

  // ─── AI V2: Decomposition ────────────────
  async decomposeTask(taskId: number): Promise<DecomposeResult> {
    const res = await fetch(`${API_BASE}/ai/decompose/${taskId}`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to decompose task');
    return res.json();
  },

  // ─── AI V2: Planner ─────────────────────
  async planMyDay(chunks?: Array<{ start: string; end: string }>): Promise<PlannerResult> {
    const res = await fetch(`${API_BASE}/ai/plan-my-day`, {
      method: 'POST',
      headers: getHeaders(),
      body: chunks ? JSON.stringify({ chunks }) : undefined,
    });
    if (!res.ok) throw new Error('Failed to plan day');
    return res.json();
  },

  // ─── AI V2: What Should I Do Now ────────
  async whatShouldIDo(): Promise<WhatNowResult> {
    const res = await fetch(`${API_BASE}/ai/what-should-i-do`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to get recommendation');
    return res.json();
  },

  // ─── AI V2: Natural Language Search ─────
  async nlSearch(query: string): Promise<NLSearchResult> {
    const res = await fetch(`${API_BASE}/ai/execute-search`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ query }) });
    if (!res.ok) throw new Error('Failed to search');
    return res.json();
  },

  // ─── AI V2: Weekly Review ────────────────
  async getWeeklyReview(): Promise<WeeklyReviewResult> {
    const res = await fetch(`${API_BASE}/ai/weekly-review`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to get weekly review');
    return res.json();
  },

  // ─── AI V2: Project Summary ─────────────
  async getProjectSummary(projectId: number): Promise<ProjectSummaryResult> {
    const res = await fetch(`${API_BASE}/ai/project-summary/${projectId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to get project summary');
    return res.json();
  },

  // ─── AI V2: Daily Summary ────────────────
  async getEnhancedDailySummary(dateStr: string): Promise<{ date: string; summary: string; completed_count: number; activity_count: number }> {
    const res = await fetch(`${API_BASE}/ai/daily-summary/${dateStr}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to get daily summary');
    return res.json();
  },

  // ─── AI V2: Chat Assistant ───────────────
  async chatWithAI(message: string): Promise<ChatResult> {
    const res = await fetch(`${API_BASE}/ai/chat`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ message }) });
    if (!res.ok) throw new Error('Failed to chat with AI');
    return res.json();
  },

  // ─── AI V2: Suggestions ──────────────────
  async getAISuggestions(): Promise<AISuggestion[]> {
    const res = await fetch(`${API_BASE}/ai/suggestions`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to get suggestions');
    return res.json();
  },

  // ─── V2: Reflections ─────────────────────
  async getReflections(limit: number = 30): Promise<DailyReflection[]> {
    const res = await fetch(`${API_BASE}/reflections?limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reflections');
    return res.json();
  },

  async getTodayReflection(): Promise<DailyReflection | null> {
    const res = await fetch(`${API_BASE}/reflections/today`, { headers: getHeaders() });
    if (!res.ok) return null;
    return res.json();
  },

  async saveReflection(content: string, mood?: string): Promise<DailyReflection> {
    const res = await fetch(`${API_BASE}/reflections`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ content, mood }) });
    if (!res.ok) throw new Error('Failed to save reflection');
    return res.json();
  },

  // ─── V2: Settings ────────────────────────
  async getSettings(): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(data: Partial<UserSettings>): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // ─── V2: Task Dependencies ───────────────
  async getTaskDependencies(taskId: number): Promise<TaskDependency[]> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/dependencies`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch dependencies');
    return res.json();
  },

  async addTaskDependency(taskId: number, dependsOnId: number): Promise<TaskDependency> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/dependencies`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ depends_on_id: dependsOnId }) });
    if (!res.ok) throw new Error('Failed to add dependency');
    return res.json();
  },

  async removeTaskDependency(taskId: number, dependencyId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/dependencies/${dependencyId}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to remove dependency');
  },

  // ─── Focus Timer ─────────────────────────
  async startFocusSession(taskId: number | null, plannedMinutes: number): Promise<FocusSession> {
    const res = await fetch(`${API_BASE}/focus/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ task_id: taskId, planned_minutes: plannedMinutes }),
    });
    if (!res.ok) throw new Error('Failed to start focus session');
    return res.json();
  },

  async endFocusSession(sessionId: number, data: { actual_minutes: number; status: 'completed' | 'abandoned'; break_taken: boolean }): Promise<FocusSession> {
    const res = await fetch(`${API_BASE}/focus/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to end focus session');
    return res.json();
  },

  async getFocusSessions(limit: number = 50): Promise<FocusSession[]> {
    const res = await fetch(`${API_BASE}/focus/sessions?limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch focus sessions');
    return res.json();
  },
};
