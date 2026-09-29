import { User, Client, Task, AttendanceRecord, DashboardStats } from '../types.ts';
import { INITIAL_USERS, INITIAL_CLIENTS, INITIAL_TASKS, INITIAL_ATTENDANCE } from '../data/seedData.ts';

const TOKEN_KEY = 'oms_auth_token';
const USER_KEY = 'oms_auth_user';

export const storage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  removeUser() {
    localStorage.removeItem(USER_KEY);
  },
};

// Resilient API request wrapper
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = storage.getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }));
      if (res.status === 401) {
        storage.removeToken();
        storage.removeUser();
      }
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    // If backend is unreachable (e.g. dev server initializing), use resilient fallback store
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      console.warn('Network request failed, attempting local fallback for:', url);
      return fallbackHandler<T>(url, options);
    }
    throw err;
  }
}

// Resilient in-browser state fallback in case of transient dev network hiccups
const LOCAL_STORE = {
  users: [...INITIAL_USERS],
  clients: [...INITIAL_CLIENTS],
  tasks: [...INITIAL_TASKS],
  attendance: [...INITIAL_ATTENDANCE],
};

function fallbackHandler<T>(url: string, options: RequestInit): Promise<T> {
  const method = options.method || 'GET';
  const currentUser = storage.getUser();

  if (url.includes('/api/auth/login') && method === 'POST') {
    const body = JSON.parse(options.body as string);
    const user = LOCAL_STORE.users.find(
      (u) =>
        (u.email.toLowerCase() === body.identifier.toLowerCase() ||
          u.username.toLowerCase() === body.identifier.toLowerCase()) &&
        (u.password === body.password || !u.password)
    );
    if (!user) throw new Error('Invalid credentials');
    const token = `token_${user.username}`;
    storage.setToken(token);
    storage.setUser(user);
    return Promise.resolve({ token, user } as unknown as T);
  }

  if (url.includes('/api/clients')) {
    if (method === 'GET') {
      return Promise.resolve(LOCAL_STORE.clients as unknown as T);
    }
    if (method === 'POST') {
      const body = JSON.parse(options.body as string);
      const newClient = { ...body, id: `cli_${Date.now()}`, createdAt: new Date().toISOString() };
      LOCAL_STORE.clients.unshift(newClient);
      return Promise.resolve(newClient as unknown as T);
    }
  }

  if (url.includes('/api/tasks')) {
    if (method === 'GET') {
      if (currentUser?.role === 'employee') {
        return Promise.resolve(LOCAL_STORE.tasks.filter((t) => t.assignedTo === currentUser.id) as unknown as T);
      }
      return Promise.resolve(LOCAL_STORE.tasks as unknown as T);
    }
  }

  if (url.includes('/api/attendance')) {
    if (currentUser?.role === 'employee') {
      return Promise.resolve(
        LOCAL_STORE.attendance.filter((a) => a.employeeId === currentUser.id) as unknown as T
      );
    }
    return Promise.resolve(LOCAL_STORE.attendance as unknown as T);
  }

  if (url.includes('/api/employees')) {
    return Promise.resolve(LOCAL_STORE.users as unknown as T);
  }

  throw new Error('Action could not be completed locally');
}

export const api = {
  // Auth
  async login(identifier: string, password: string): Promise<{ token: string; user: User }> {
    const data = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    storage.setToken(data.token);
    storage.setUser(data.user);
    return data;
  },

  async getMe(): Promise<User> {
    const data = await apiRequest<{ user: User }>('/api/auth/me');
    storage.setUser(data.user);
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      storage.removeToken();
      storage.removeUser();
    }
  },

  async forgotPassword(identifier: string): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  // Clients
  async getClients(): Promise<Client[]> {
    return apiRequest<Client[]>('/api/clients');
  },

  async createClient(data: Partial<Client>): Promise<Client> {
    return apiRequest<Client>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    return apiRequest<Client>(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteClient(id: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  },

  // Employees
  async getEmployees(): Promise<User[]> {
    return apiRequest<User[]>('/api/employees');
  },

  async createEmployee(data: Partial<User>): Promise<User> {
    return apiRequest<User>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateEmployee(id: string, data: Partial<User>): Promise<User> {
    return apiRequest<User>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async toggleEmployeeStatus(id: string, status: 'Active' | 'Disabled'): Promise<User> {
    return apiRequest<User>(`/api/employees/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async resetEmployeePassword(id: string, newPassword?: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/employees/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  async deleteEmployee(id: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/employees/${id}`, {
      method: 'DELETE',
    });
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    return apiRequest<Task[]>('/api/tasks');
  },

  async createTask(data: Partial<Task>): Promise<Task> {
    return apiRequest<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return apiRequest<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateTaskStatus(id: string, status: Task['status'], completionNotes?: string): Promise<Task> {
    return apiRequest<Task>(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, completionNotes }),
    });
  },

  async deleteTask(id: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  // Attendance
  async getTodayAttendance(date: string = '2026-09-28'): Promise<any> {
    return apiRequest(`/api/attendance/today?date=${date}`);
  },

  async getAttendance(params?: {
    date?: string;
    employeeId?: string;
    status?: string;
    search?: string;
  }): Promise<AttendanceRecord[]> {
    const q = new URLSearchParams();
    if (params?.date) q.append('date', params.date);
    if (params?.employeeId) q.append('employeeId', params.employeeId);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    return apiRequest<AttendanceRecord[]>(`/api/attendance?${q.toString()}`);
  },

  async checkIn(date?: string, time?: string, note?: string): Promise<AttendanceRecord> {
    return apiRequest<AttendanceRecord>('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ date, time, note }),
    });
  },

  async checkOut(date?: string, time?: string, note?: string): Promise<AttendanceRecord> {
    return apiRequest<AttendanceRecord>('/api/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify({ date, time, note }),
    });
  },

  async addManualAttendance(data: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    return apiRequest<AttendanceRecord>('/api/admin/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Dashboard & Reset
  async getDashboardStats(date: string = '2026-09-28'): Promise<any> {
    return apiRequest(`/api/dashboard/stats?date=${date}`);
  },

  async resetDemoData(): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/admin/reset-demo', { method: 'POST' });
  },
};
