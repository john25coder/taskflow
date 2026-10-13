import type { Task, TaskInput, TaskStatus, TaskType, User } from '../types';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Falha de comunicação.' }));
    throw new ApiError(body.error ?? 'Não foi possível concluir a ação.', response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const authApi = {
  me: () => api<{ user: User }>('/auth/me'),
  login: (email: string, password: string) => api<{ user: User }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  }),
  register: (name: string, email: string, password: string) => api<{ user: User }>('/auth/register', {
    method: 'POST', body: JSON.stringify({ name, email, password })
  }),
  logout: () => api<void>('/auth/logout', { method: 'POST' })
};

export const tasksApi = {
  list: (status: TaskStatus | 'all', type: TaskType | 'all', query: string, date: string) => {
    const params = new URLSearchParams({ status, type, q: query, date });
    return api<{ tasks: Task[] }>(`/tasks?${params}`);
  },
  create: (input: TaskInput) => api<{ task: Task }>('/tasks', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<TaskInput>) => api<{ task: Task }>(`/tasks/${id}`, {
    method: 'PATCH', body: JSON.stringify(input)
  }),
  completeHabit: (id: string, date: string) => api<{ task: Task }>(`/tasks/${id}/habit-completions`, {
    method: 'POST', body: JSON.stringify({ date })
  }),
  undoHabit: (id: string, date: string) => api<{ task: Task }>(`/tasks/${id}/habit-completions/${date}`, {
    method: 'DELETE'
  }),
  remove: (id: string) => api<void>(`/tasks/${id}`, { method: 'DELETE' })
};
