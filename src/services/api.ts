import type {
  User,
  Client,
  Task,
  AttendanceRecord,
  DashboardStats,
} from '../types.ts';

import {
  INITIAL_USERS,
  INITIAL_CLIENTS,
  INITIAL_TASKS,
  INITIAL_ATTENDANCE,
} from '../data/seedData.ts';

// ============================================================
// STORAGE KEYS
// ============================================================

const TOKEN_KEY = 'oms_auth_token';
const USER_KEY = 'oms_auth_user';

// ============================================================
// BACKEND URL
// ============================================================

const API_BASE_URL =
  'https://office-management-api-qyed.onrender.com';

// ============================================================
// DATE HELPERS
// ============================================================

/**
 * Returns the browser's current local date.
 *
 * Example:
 * 2026-10-01
 */
const getCurrentDate = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(
    2,
    '0'
  );
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Makes sure a date is in YYYY-MM-DD format.
 *
 * If no date is supplied, today's date is returned.
 */
const normalizeDate = (date?: string): string => {
  if (
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return date;
  }

  return getCurrentDate();
};

// ============================================================
// LOCAL STORAGE
// ============================================================

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

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  setUser(user: User) {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );
  },

  removeUser() {
    localStorage.removeItem(USER_KEY);
  },
};

// ============================================================
// RESILIENT API REQUEST
// ============================================================

async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = storage.getToken();

  const headers = new Headers(
    options.headers || {}
  );

  headers.set(
    'Content-Type',
    'application/json'
  );

  if (token) {
    headers.set(
      'Authorization',
      `Bearer ${token}`
    );
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}${url}`,
      {
        ...options,
        headers,
      }
    );

    if (!res.ok) {
      const errData = await res
        .json()
        .catch(() => ({
          error: res.statusText,
        }));

      /**
       * Remove invalid authentication information.
       */
      if (res.status === 401) {
        storage.removeToken();
        storage.removeUser();
      }

      throw new Error(
        errData.error ||
          `HTTP error ${res.status}`
      );
    }

    return (await res.json()) as T;
  } catch (err: any) {
    /**
     * Only use local fallback for actual network failures.
     *
     * Do NOT hide normal API validation/server errors.
     */
    const message =
      err?.message || '';

    if (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('Load failed')
    ) {
      /**
       * SECURITY:
       * Attendance check-in/check-out must ALWAYS reach the live backend.
       * Never fall back to browser-side attendance logic because the device
       * clock can be changed by the employee.
       */
      if (
        url.includes('/api/attendance/check-in') ||
        url.includes('/api/attendance/check-out')
      ) {
        throw new Error(
          'Attendance requires a live connection to the office server. Please check your internet connection and try again.'
        );
      }

      console.warn(
        'Network request failed, attempting local fallback for:',
        url
      );

      return fallbackHandler<T>(
        url,
        options
      );
    }

    throw err;
  }
}

// ============================================================
// LOCAL FALLBACK STORE
// ============================================================

const LOCAL_STORE = {
  users: [...INITIAL_USERS],

  clients: [...INITIAL_CLIENTS],

  tasks: [...INITIAL_TASKS],

  attendance: [...INITIAL_ATTENDANCE],
};

// ============================================================
// LOCAL FALLBACK
// ============================================================

function fallbackHandler<T>(
  url: string,
  options: RequestInit
): Promise<T> {
  const method =
    options.method || 'GET';

  const currentUser =
    storage.getUser();

  // ==========================================================
  // AUTH LOGIN
  // ==========================================================

  if (
    url.includes('/api/auth/login') &&
    method === 'POST'
  ) {
    const body = JSON.parse(
      (options.body as string) || '{}'
    );

    const identifier =
      String(body.identifier || '')
        .toLowerCase()
        .trim();

    const password =
      String(body.password || '');

    const user =
      LOCAL_STORE.users.find(
        (u) =>
          (
            u.email?.toLowerCase() ===
              identifier ||
            u.username?.toLowerCase() ===
              identifier
          ) &&
          (
            u.password === password ||
            !u.password
          )
      );

    if (!user) {
      throw new Error(
        'Invalid credentials'
      );
    }

    const token = `token_${user.username}`;

    storage.setToken(token);
    storage.setUser(user);

    return Promise.resolve({
      token,
      user,
    } as unknown as T);
  }

  // ==========================================================
  // CLIENTS
  // ==========================================================

  if (
    url.includes('/api/clients')
  ) {
    if (method === 'GET') {
      return Promise.resolve(
        LOCAL_STORE.clients as unknown as T
      );
    }

    if (method === 'POST') {
      const body = JSON.parse(
        (options.body as string) || '{}'
      );

      const newClient = {
        ...body,
        id: `cli_${Date.now()}`,
        createdAt:
          new Date().toISOString(),
      };

      LOCAL_STORE.clients.unshift(
        newClient as Client
      );

      return Promise.resolve(
        newClient as unknown as T
      );
    }

    /**
     * Basic local update support.
     */
    if (
      method === 'PUT'
    ) {
      const match = url.match(
        /\/api\/clients\/([^/?]+)/
      );

      const id =
        match?.[1];

      const body = JSON.parse(
        (options.body as string) || '{}'
      );

      const index =
        LOCAL_STORE.clients.findIndex(
          (client) =>
            client.id === id
        );

      if (index === -1) {
        throw new Error(
          'Client not found'
        );
      }

      LOCAL_STORE.clients[index] = {
        ...LOCAL_STORE.clients[index],
        ...body,
      };

      return Promise.resolve(
        LOCAL_STORE.clients[index] as unknown as T
      );
    }

    /**
     * Basic local delete support.
     */
    if (
      method === 'DELETE'
    ) {
      const match = url.match(
        /\/api\/clients\/([^/?]+)/
      );

      const id =
        match?.[1];

      const index =
        LOCAL_STORE.clients.findIndex(
          (client) =>
            client.id === id
        );

      if (index === -1) {
        throw new Error(
          'Client not found'
        );
      }

      LOCAL_STORE.clients.splice(
        index,
        1
      );

      return Promise.resolve({
        success: true,
      } as unknown as T);
    }
  }

  // ==========================================================
  // TASKS
  // ==========================================================

  if (
    url.includes('/api/tasks')
  ) {
    if (method === 'GET') {
      if (
        currentUser?.role ===
        'employee'
      ) {
        return Promise.resolve(
          LOCAL_STORE.tasks.filter(
            (task) =>
              task.assignedTo ===
              currentUser.id
          ) as unknown as T
        );
      }

      return Promise.resolve(
        LOCAL_STORE.tasks as unknown as T
      );
    }

    /**
     * Local task status update.
     */
    if (
      method === 'PATCH' &&
      url.includes('/status')
    ) {
      const match = url.match(
        /\/api\/tasks\/([^/]+)\/status/
      );

      const id =
        match?.[1];

      const body = JSON.parse(
        (options.body as string) || '{}'
      );

      const task =
        LOCAL_STORE.tasks.find(
          (item) =>
            item.id === id
        );

      if (!task) {
        throw new Error(
          'Task not found'
        );
      }

      task.status =
        body.status;

      if (
        typeof body.completionNotes ===
        'string'
      ) {
        task.completionNotes =
          body.completionNotes;
      }

      return Promise.resolve(
        task as unknown as T
      );
    }
  }

  // ==========================================================
  // ATTENDANCE
  // ==========================================================

  if (
    url.includes('/api/attendance')
  ) {
    const parsedUrl =
      new URL(
        url,
        window.location.origin
      );

    const requestedDate =
      parsedUrl.searchParams.get(
        'date'
      );

    const attendanceDate =
      normalizeDate(
        requestedDate || undefined
      );

    /**
     * --------------------------------------------------------
     * TODAY ATTENDANCE
     * --------------------------------------------------------
     */
    if (
      url.includes(
        '/api/attendance/today'
      ) &&
      method === 'GET'
    ) {
      if (
        currentUser?.role ===
        'employee'
      ) {
        const record =
          LOCAL_STORE.attendance.find(
            (attendance) =>
              attendance.employeeId ===
                currentUser.id &&
              attendance.date ===
                attendanceDate
          );

        return Promise.resolve(
          (record || null) as unknown as T
        );
      }

      return Promise.resolve(
        LOCAL_STORE.attendance.filter(
          (attendance) =>
            attendance.date ===
            attendanceDate
        ) as unknown as T
      );
    }

    /**
     * --------------------------------------------------------
     * CHECK IN
     * --------------------------------------------------------
     *
     * Attendance actions intentionally have NO local fallback.
     * The live backend must create the timestamp.
     */
    if (
      url.includes(
        '/api/attendance/check-in'
      ) &&
      method === 'POST'
    ) {
      throw new Error(
        'Attendance requires a live connection to the office server.'
      );
    }

    /**
     * --------------------------------------------------------
     * CHECK OUT
     * --------------------------------------------------------
     *
     * Attendance actions intentionally have NO local fallback.
     * The live backend must create the timestamp.
     */
    if (
      url.includes(
        '/api/attendance/check-out'
      ) &&
      method === 'POST'
    ) {
      throw new Error(
        'Attendance requires a live connection to the office server.'
      );
    }

    /**
     * --------------------------------------------------------
     * GET ATTENDANCE HISTORY
     * --------------------------------------------------------
     */
    if (
      method === 'GET'
    ) {
      if (
        currentUser?.role ===
        'employee'
      ) {
        const history =
          LOCAL_STORE.attendance.filter(
            (attendance) =>
              attendance.employeeId ===
              currentUser.id
          );

        const dateFilter =
          parsedUrl.searchParams.get(
            'date'
          );

        const statusFilter =
          parsedUrl.searchParams.get(
            'status'
          );

        const search =
          parsedUrl.searchParams.get(
            'search'
          );

        let filtered =
          history;

        if (
          dateFilter
        ) {
          filtered =
            filtered.filter(
              (attendance) =>
                attendance.date ===
                dateFilter
            );
        }

        if (
          statusFilter &&
          statusFilter !==
            'all'
        ) {
          filtered =
            filtered.filter(
              (attendance) =>
                attendance.status ===
                statusFilter
            );
        }

        if (
          search
        ) {
          const lowerSearch =
            search.toLowerCase();

          filtered =
            filtered.filter(
              (attendance) =>
                attendance.employeeName
                  ?.toLowerCase()
                  .includes(
                    lowerSearch
                  ) ||
                attendance.department
                  ?.toLowerCase()
                  .includes(
                    lowerSearch
                  ) ||
                attendance.note
                  ?.toLowerCase()
                  .includes(
                    lowerSearch
                  )
            );
        }

        /**
         * Newest attendance date first.
         */
        filtered.sort(
          (a, b) =>
            b.date.localeCompare(
              a.date
            )
        );

        return Promise.resolve(
          filtered as unknown as T
        );
      }

      /**
       * ADMIN HISTORY
       */
      let filtered =
        [...LOCAL_STORE.attendance];

      const employeeId =
        parsedUrl.searchParams.get(
          'employeeId'
        );

      const dateFilter =
        parsedUrl.searchParams.get(
          'date'
        );

      const statusFilter =
        parsedUrl.searchParams.get(
          'status'
        );

      const search =
        parsedUrl.searchParams.get(
          'search'
        );

      if (employeeId) {
        filtered =
          filtered.filter(
            (attendance) =>
              attendance.employeeId ===
              employeeId
          );
      }

      if (dateFilter) {
        filtered =
          filtered.filter(
            (attendance) =>
              attendance.date ===
              dateFilter
          );
      }

      if (
        statusFilter &&
        statusFilter !== 'all'
      ) {
        filtered =
          filtered.filter(
            (attendance) =>
              attendance.status ===
              statusFilter
          );
      }

      if (search) {
        const lowerSearch =
          search.toLowerCase();

        filtered =
          filtered.filter(
            (attendance) =>
              attendance.employeeName
                ?.toLowerCase()
                .includes(
                  lowerSearch
                ) ||
              attendance.department
                ?.toLowerCase()
                .includes(
                  lowerSearch
                ) ||
              attendance.note
                ?.toLowerCase()
                .includes(
                  lowerSearch
                )
          );
      }

      filtered.sort(
        (a, b) =>
          b.date.localeCompare(
            a.date
          )
      );

      return Promise.resolve(
        filtered as unknown as T
      );
    }
  }

  // ==========================================================
  // EMPLOYEES
  // ==========================================================

  if (
    url.includes('/api/employees')
  ) {
    return Promise.resolve(
      LOCAL_STORE.users as unknown as T
    );
  }

  throw new Error(
    'Action could not be completed locally'
  );
}

// ============================================================
// API
// ============================================================

export const api = {
  // ==========================================================
  // AUTH
  // ==========================================================

  async login(
    identifier: string,
    password: string
  ): Promise<{
    token: string;
    user: User;
  }> {
    const data =
      await apiRequest<{
        token: string;
        user: User;
      }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            identifier,
            password,
          }),
        }
      );

    storage.setToken(
      data.token
    );

    storage.setUser(
      data.user
    );

    return data;
  },

  async getMe(): Promise<User> {
    const data =
      await apiRequest<{
        user: User;
      }>(
        '/api/auth/me'
      );

    storage.setUser(
      data.user
    );

    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiRequest(
        '/api/auth/logout',
        {
          method: 'POST',
        }
      );
    } finally {
      storage.removeToken();
      storage.removeUser();
    }
  },

  async forgotPassword(
    identifier: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiRequest(
      '/api/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({
          identifier,
        }),
      }
    );
  },

  // ==========================================================
  // CLIENTS
  // ==========================================================

  async getClients(): Promise<Client[]> {
    return apiRequest<Client[]>(
      '/api/clients'
    );
  },

  async createClient(
    data: Partial<Client>
  ): Promise<Client> {
    return apiRequest<Client>(
      '/api/clients',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async updateClient(
    id: string,
    data: Partial<Client>
  ): Promise<Client> {
    return apiRequest<Client>(
      `/api/clients/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  async deleteClient(
    id: string
  ): Promise<{
    success: boolean;
  }> {
    return apiRequest<{
      success: boolean;
    }>(
      `/api/clients/${id}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ==========================================================
  // EMPLOYEES
  // ==========================================================

  async getEmployees(): Promise<User[]> {
    return apiRequest<User[]>(
      '/api/employees'
    );
  },

  async createEmployee(
    data: Partial<User>
  ): Promise<User> {
    return apiRequest<User>(
      '/api/employees',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async updateEmployee(
    id: string,
    data: Partial<User>
  ): Promise<User> {
    return apiRequest<User>(
      `/api/employees/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  async toggleEmployeeStatus(
    id: string,
    status: 'Active' | 'Disabled'
  ): Promise<User> {
    return apiRequest<User>(
      `/api/employees/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status,
        }),
      }
    );
  },

  async resetEmployeePassword(
    id: string,
    newPassword?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(
      `/api/employees/${id}/reset-password`,
      {
        method: 'POST',
        body: JSON.stringify({
          newPassword,
        }),
      }
    );
  },

  async deleteEmployee(
    id: string
  ): Promise<{
    success: boolean;
  }> {
    return apiRequest<{
      success: boolean;
    }>(
      `/api/employees/${id}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ==========================================================
  // TASKS
  // ==========================================================

  async getTasks(): Promise<Task[]> {
    return apiRequest<Task[]>(
      '/api/tasks'
    );
  },

  async createTask(
    data: Partial<Task>
  ): Promise<Task> {
    return apiRequest<Task>(
      '/api/tasks',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async updateTask(
    id: string,
    data: Partial<Task>
  ): Promise<Task> {
    return apiRequest<Task>(
      `/api/tasks/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  async updateTaskStatus(
    id: string,
    status: Task['status'],
    completionNotes?: string
  ): Promise<Task> {
    return apiRequest<Task>(
      `/api/tasks/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          completionNotes,
        }),
      }
    );
  },

  async deleteTask(
    id: string
  ): Promise<{
    success: boolean;
  }> {
    return apiRequest<{
      success: boolean;
    }>(
      `/api/tasks/${id}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ==========================================================
  // ATTENDANCE
  // ==========================================================

  /**
   * Get today's attendance.
   *
   * Employee pages should call this without a date.
   * The backend determines "today" from its server clock
   * in Asia/Kolkata.
   *
   * The optional date is retained for admin/history views
   * that intentionally request a selected date.
   */
  async getTodayAttendance(
    date?: string
  ): Promise<
    AttendanceRecord | AttendanceRecord[] | null
  > {
    if (
      typeof date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return apiRequest(
        `/api/attendance/today?date=${encodeURIComponent(
          date
        )}`
      );
    }

    return apiRequest(
      '/api/attendance/today'
    );
  },

  /**
   * Get attendance history.
   */
  async getAttendance(
    params?: {
      date?: string;
      employeeId?: string;
      status?: string;
      search?: string;
    }
  ): Promise<AttendanceRecord[]> {
    const q =
      new URLSearchParams();

    if (
      params?.date
    ) {
      q.append(
        'date',
        params.date
      );
    }

    if (
      params?.employeeId
    ) {
      q.append(
        'employeeId',
        params.employeeId
      );
    }

    if (
      params?.status
    ) {
      q.append(
        'status',
        params.status
      );
    }

    if (
      params?.search
    ) {
      q.append(
        'search',
        params.search
      );
    }

    const query =
      q.toString();

    return apiRequest<
      AttendanceRecord[]
    >(
      query
        ? `/api/attendance?${query}`
        : '/api/attendance'
    );
  },

  /**
   * Employee check-in.
   *
   * SECURITY:
   * The browser sends only an optional note.
   * Date and time are generated by the backend server.
   */
  async checkIn(
    note?: string
  ): Promise<AttendanceRecord> {
    return apiRequest<AttendanceRecord>(
      '/api/attendance/check-in',
      {
        method: 'POST',
        body: JSON.stringify({
          note:
            typeof note === 'string'
              ? note.trim()
              : '',
        }),
      }
    );
  },

  /**
   * Employee check-out.
   *
   * SECURITY:
   * The browser sends only an optional note.
   * Date and time are generated by the backend server.
   */
  async checkOut(
    note?: string
  ): Promise<AttendanceRecord> {
    return apiRequest<AttendanceRecord>(
      '/api/attendance/check-out',
      {
        method: 'POST',
        body: JSON.stringify({
          note:
            typeof note === 'string'
              ? note.trim()
              : '',
        }),
      }
    );
  },

  /**
   * Admin manual attendance.
   */
  async addManualAttendance(
    data: Partial<AttendanceRecord>
  ): Promise<AttendanceRecord> {
    return apiRequest<AttendanceRecord>(
      '/api/admin/attendance',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  /**
   * Dashboard statistics.
   *
   * Uses today's date by default.
   */
  async getDashboardStats(
    date?: string
  ): Promise<DashboardStats> {
    const dashboardDate =
      normalizeDate(date);

    return apiRequest<DashboardStats>(
      `/api/dashboard/stats?date=${encodeURIComponent(
        dashboardDate
      )}`
    );
  },

  // ==========================================================
  // RESET DEMO DATA
  // ==========================================================

  async resetDemoData(): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiRequest(
      '/api/admin/reset-demo',
      {
        method: 'POST',
      }
    );
  },
};