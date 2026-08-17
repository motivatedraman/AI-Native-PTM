import { Task, Project, Tag, Subtask, ActivityLog, DailyLogGroup, AIParseResult, AIStatus } from '../types';

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
  // Auth
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
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Unauthenticated');
    return res.json();
  },

  // Tasks
  async getTasks(params?: { status?: string; category?: string; project_id?: number; search?: string; tag?: string }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.project_id !== undefined) query.append('project_id', String(params.project_id));
    if (params?.search) query.append('search', params.search);
    if (params?.tag) query.append('tag', params.tag);

    const res = await fetch(`${API_BASE}/tasks?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(data: Partial<Task> & { tag_ids?: number[]; initial_subtasks?: string[] }): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  async quickAddTask(raw_text: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/quick-add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ raw_text }),
    });
    if (!res.ok) throw new Error('Failed to quick add task');
    return res.json();
  },

  async updateTask(id: number, data: Partial<Task> & { tag_ids?: number[] }): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  async completeTask(id: number): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}/complete`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to complete task');
    return res.json();
  },

  async reopenTask(id: number): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}/reopen`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reopen task');
    return res.json();
  },

  async deleteTask(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete task');
  },

  // Subtasks
  async addSubtask(taskId: number, title: string): Promise<Subtask> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to add subtask');
    return res.json();
  },

  async updateSubtask(taskId: number, subtaskId: number, data: Partial<Subtask>): Promise<Subtask> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update subtask');
    return res.json();
  },

  async deleteSubtask(taskId: number, subtaskId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete subtask');
  },

  // Projects
  async getProjects(category?: string): Promise<Project[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`${API_BASE}/projects${query}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async deleteProject(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete project');
  },

  // Tags
  async getTags(): Promise<Tag[]> {
    const res = await fetch(`${API_BASE}/tags`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tags');
    return res.json();
  },

  // Activity & Daily Log
  async getActivity(limit: number = 50): Promise<ActivityLog[]> {
    const res = await fetch(`${API_BASE}/activity?limit=${limit}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch activity');
    return res.json();
  },

  async getDailyLog(date?: string): Promise<DailyLogGroup> {
    const query = date ? `?target_date=${date}` : '';
    const res = await fetch(`${API_BASE}/daily-log${query}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch daily log');
    return res.json();
  },

  // AI Service
  async getAIStatus(): Promise<AIStatus> {
    const res = await fetch(`${API_BASE}/ai/status`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch AI status');
    return res.json();
  },

  async parseTaskWithAI(text: string): Promise<AIParseResult> {
    const res = await fetch(`${API_BASE}/ai/parse-task`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Failed to parse task with AI');
    return res.json();
  },

  async enrichTaskWithAI(taskId: number) {
    const res = await fetch(`${API_BASE}/ai/enrich-task/${taskId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to enrich task');
    return res.json();
  },

  async suggestSubtasksWithAI(taskId: number): Promise<{ task_id: number; suggested_subtasks: string[] }> {
    const res = await fetch(`${API_BASE}/ai/suggest-subtasks/${taskId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to suggest subtasks');
    return res.json();
  }
};
