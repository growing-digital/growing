import fs from 'fs';
import path from 'path';

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
// DATABASE FILE
// ============================================================

const DATA_DIR = path.resolve(
  process.cwd(),
  'data'
);

const DB_FILE = path.join(
  DATA_DIR,
  'office_db.json'
);

// ============================================================
// OFFICE HOURS
// ============================================================

const OFFICE_START_MINUTES = 10 * 60 + 30; // 10:00 AM
const OFFICE_END_MINUTES = 17 * 60;   // 5:00 PM

// ============================================================
// DATABASE SCHEMA
// ============================================================

export interface DatabaseSchema {
  users: User[];
  clients: Client[];
  tasks: Task[];
  attendance: AttendanceRecord[];
}

// ============================================================
// DATABASE CLASS
// ============================================================

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      users: [...INITIAL_USERS],
      clients: [...INITIAL_CLIENTS],
      tasks: [...INITIAL_TASKS],
      attendance: [...INITIAL_ATTENDANCE],
    };

    this.init();
  }

  // ==========================================================
  // INITIALIZE
  // ==========================================================

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, {
          recursive: true,
        });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(
          DB_FILE,
          'utf-8'
        );

        const parsed =
          JSON.parse(raw);

        if (
          parsed &&
          Array.isArray(parsed.users) &&
          Array.isArray(parsed.clients) &&
          Array.isArray(parsed.tasks) &&
          Array.isArray(parsed.attendance)
        ) {
          this.data = parsed;

          return;
        }
      }

      this.save();
    } catch (err) {
      console.error(
        'Error initializing database, using seed data:',
        err
      );
    }
  }

  // ==========================================================
  // SAVE
  // ==========================================================

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, {
          recursive: true,
        });
      }

      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(
          this.data,
          null,
          2
        ),
        'utf-8'
      );
    } catch (err) {
      console.error(
        'Error saving database to file:',
        err
      );
    }
  }

  // ==========================================================
  // RESET
  // ==========================================================

  public resetToSeed() {
    this.data = {
      users: [...INITIAL_USERS],
      clients: [...INITIAL_CLIENTS],
      tasks: [...INITIAL_TASKS],
      attendance: [...INITIAL_ATTENDANCE],
    };

    this.save();

    return this.data;
  }

  // ==========================================================
  // USERS
  // ==========================================================

  public getUsers(): User[] {
    return this.data.users.map(
      ({ password: _, ...rest }) =>
        rest as User
    );
  }

  public getUserById(
    id: string
  ): User | undefined {
    return this.data.users.find(
      (user) =>
        user.id === id
    );
  }

  public getUserByEmailOrUsername(
    identifier: string
  ): User | undefined {
    const clean =
      identifier
        .trim()
        .toLowerCase();

    return this.data.users.find(
      (user) =>
        user.email
          .toLowerCase() ===
          clean ||
        user.username
          .toLowerCase() ===
          clean
    );
  }

  public addUser(
    user: Omit<User, 'id'>
  ): User {
    const id =
      `usr_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .substring(2, 6)}`;

    const newUser: User = {
      ...user,
      id,
    };

    this.data.users.push(
      newUser
    );

    this.save();

    const {
      password: _,
      ...safeUser
    } = newUser;

    return safeUser as User;
  }

  public updateUser(
    id: string,
    updates: Partial<User>
  ): User | null {
    const idx =
      this.data.users.findIndex(
        (user) =>
          user.id === id
      );

    if (idx === -1) {
      return null;
    }

    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
    };

    this.save();

    const {
      password: _,
      ...safeUser
    } = this.data.users[idx];

    return safeUser as User;
  }

  public deleteUser(
    id: string
  ): boolean {
    const initialLength =
      this.data.users.length;

    this.data.users =
      this.data.users.filter(
        (user) =>
          user.id !== id
      );

    if (
      this.data.users.length !==
      initialLength
    ) {
      this.save();

      return true;
    }

    return false;
  }

  // ==========================================================
  // CLIENTS
  // ==========================================================

  public getClients(): Client[] {
    return this.data.clients;
  }

  public getClientById(
    id: string
  ): Client | undefined {
    return this.data.clients.find(
      (client) =>
        client.id === id
    );
  }

  public addClient(
    client: Omit<
      Client,
      'id' | 'createdAt'
    >
  ): Client {
    const id =
      `cli_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .substring(2, 6)}`;

    const newClient: Client = {
      ...client,
      id,
      createdAt:
        new Date().toISOString(),
    };

    this.data.clients.unshift(
      newClient
    );

    this.save();

    return newClient;
  }

  public updateClient(
    id: string,
    updates: Partial<Client>
  ): Client | null {
    const idx =
      this.data.clients.findIndex(
        (client) =>
          client.id === id
      );

    if (idx === -1) {
      return null;
    }

    this.data.clients[idx] = {
      ...this.data.clients[idx],
      ...updates,
    };

    this.save();

    return this.data.clients[idx];
  }

  public deleteClient(
    id: string
  ): boolean {
    const initialLength =
      this.data.clients.length;

    this.data.clients =
      this.data.clients.filter(
        (client) =>
          client.id !== id
      );

    if (
      this.data.clients.length !==
      initialLength
    ) {
      this.save();

      return true;
    }

    return false;
  }

  // ==========================================================
  // TASKS
  // ==========================================================

  public getTasks(
    filterUserId?: string
  ): Task[] {
    if (filterUserId) {
      return this.data.tasks.filter(
        (task) =>
          task.assignedTo ===
          filterUserId
      );
    }

    return this.data.tasks;
  }

  public getTaskById(
    id: string
  ): Task | undefined {
    return this.data.tasks.find(
      (task) =>
        task.id === id
    );
  }

  public addTask(
    task: Omit<
      Task,
      'id' | 'createdAt'
    >
  ): Task {
    const id =
      `tsk_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .substring(2, 6)}`;

    const newTask: Task = {
      ...task,
      id,
      createdAt:
        new Date().toISOString(),
    };

    this.data.tasks.unshift(
      newTask
    );

    this.save();

    return newTask;
  }

  public updateTask(
    id: string,
    updates: Partial<Task>
  ): Task | null {
    const idx =
      this.data.tasks.findIndex(
        (task) =>
          task.id === id
      );

    if (idx === -1) {
      return null;
    }

    this.data.tasks[idx] = {
      ...this.data.tasks[idx],
      ...updates,
    };

    this.save();

    return this.data.tasks[idx];
  }

  public deleteTask(
    id: string
  ): boolean {
    const initialLength =
      this.data.tasks.length;

    this.data.tasks =
      this.data.tasks.filter(
        (task) =>
          task.id !== id
      );

    if (
      this.data.tasks.length !==
      initialLength
    ) {
      this.save();

      return true;
    }

    return false;
  }

  // ==========================================================
  // ATTENDANCE
  // ==========================================================

  /**
   * Get attendance records using optional filters.
   */
  public getAttendance(
    filters?: {
      employeeId?: string;
      date?: string;
      status?: string;
      search?: string;
    }
  ): AttendanceRecord[] {
    let result = [
      ...this.data.attendance,
    ];

    // Employee filter
    if (
      filters?.employeeId
    ) {
      result =
        result.filter(
          (record) =>
            record.employeeId ===
            filters.employeeId
        );
    }

    // Date filter
    if (
      filters?.date
    ) {
      result =
        result.filter(
          (record) =>
            record.date ===
            filters.date
        );
    }

    // Status filter
    if (
      filters?.status &&
      filters.status !== 'all'
    ) {
      result =
        result.filter(
          (record) =>
            record.status ===
            filters.status
        );
    }

    // Search filter
    if (
      filters?.search
    ) {
      const query =
        filters.search
          .toLowerCase()
          .trim();

      result =
        result.filter(
          (record) =>
            record.employeeName
              .toLowerCase()
              .includes(query) ||
            record.employeeEmail
              .toLowerCase()
              .includes(query) ||
            record.department
              .toLowerCase()
              .includes(query) ||
            Boolean(
              record.note
                ?.toLowerCase()
                .includes(query)
            )
        );
    }

    /**
     * Newest date first.
     */
    return result.sort(
      (a, b) =>
        b.date.localeCompare(
          a.date
        )
    );
  }

  /**
   * Get exactly one attendance record
   * for one employee on one day.
   */
  public getTodayRecord(
    employeeId: string,
    todayDate: string
  ): AttendanceRecord | undefined {
    return this.data.attendance.find(
      (record) =>
        record.employeeId ===
          employeeId &&
        record.date ===
          todayDate
    );
  }

  /**
   * Mark attendance for a particular day.
   *
   * employeeId + todayDate identifies
   * one attendance record.
   */
  public markCheckIn(
    employeeId: string,
    todayDate: string,
    timeStr: string,
    note?: string
  ): AttendanceRecord {
    const user =
      this.getUserById(
        employeeId
      );

    if (!user) {
      throw new Error(
        'Employee not found'
      );
    }

    /**
     * Find attendance for THIS employee
     * and THIS date only.
     */
    const existingIdx =
      this.data.attendance.findIndex(
        (record) =>
          record.employeeId ===
            employeeId &&
          record.date ===
            todayDate
      );

    // --------------------------------------------------------
    // Determine Present / Late
    // --------------------------------------------------------

    let status:
      AttendanceRecord['status'] =
      'Present';

    const checkInMinutes =
      parseTimeToMinutes(timeStr);

    if (
      checkInMinutes !== null &&
      checkInMinutes >
        OFFICE_START_MINUTES
    ) {
      status = 'Late';
    }

    // --------------------------------------------------------
    // Existing record for today
    // --------------------------------------------------------

    if (
      existingIdx !== -1
    ) {
      const existing =
        this.data.attendance[
          existingIdx
        ];

      /**
       * Do not create another row.
       *
       * Update today's row.
       */
      existing.checkIn =
        timeStr;

      existing.status =
        status;

      existing.hoursWorked =
        'Active';

      if (
        typeof note === 'string' &&
        note.trim()
      ) {
        existing.note =
          note.trim();
      }

      this.save();

      return existing;
    }

    // --------------------------------------------------------
    // New record for today
    // --------------------------------------------------------

    const newRecord: AttendanceRecord =
      {
        id:
          `att_${todayDate.replace(
            /-/g,
            ''
          )}_${employeeId.slice(-4)}_${Date.now()
            .toString(36)}`,

        employeeId:
          user.id,

        employeeName:
          user.name,

        employeeEmail:
          user.email,

        department:
          user.department,

        date:
          todayDate,

        checkIn:
          timeStr,

        checkOut:
          null,

        status,

        note:
          note?.trim() || '',

        hoursWorked:
          'Active',
      };

    this.data.attendance.unshift(
      newRecord
    );

    this.save();

    return newRecord;
  }

  /**
   * Mark check-out for a particular day.
   */
  public markCheckOut(
    employeeId: string,
    todayDate: string,
    timeStr: string,
    note?: string
  ): AttendanceRecord {
    const existingIdx =
      this.data.attendance.findIndex(
        (record) =>
          record.employeeId ===
            employeeId &&
          record.date ===
            todayDate
      );

    if (
      existingIdx === -1
    ) {
      throw new Error(
        'Check in record required before check out'
      );
    }

    const record =
      this.data.attendance[
        existingIdx
      ];

    if (!record.checkIn) {
      throw new Error(
        'Check in record required before check out'
      );
    }

    if (record.checkOut) {
      throw new Error(
        'This attendance record has already been checked out'
      );
    }

    // --------------------------------------------------------
    // Check out
    // --------------------------------------------------------

    record.checkOut =
      timeStr;

    if (
      typeof note === 'string' &&
      note.trim()
    ) {
      record.note =
        record.note
          ? `${record.note} · ${note.trim()}`
          : note.trim();
    }

    // --------------------------------------------------------
    // Calculate hours
    // --------------------------------------------------------

    record.hoursWorked =
      calculateWorkDuration(
        record.checkIn,
        timeStr
      );

    this.save();

    return record;
  }

  /**
   * Admin manual attendance.
   *
   * Also protects against duplicate
   * employee + date records.
   */
  public saveManualAttendance(
    record: Omit<
      AttendanceRecord,
      'id'
    >
  ): AttendanceRecord {
    const existing =
      this.data.attendance.find(
        (item) =>
          item.employeeId ===
            record.employeeId &&
          item.date ===
            record.date
      );

    if (existing) {
      throw new Error(
        'Attendance already exists for this employee on this date'
      );
    }

    const id =
      `att_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .substring(2, 6)}`;

    const newRecord:
      AttendanceRecord = {
      ...record,
      id,
    };

    this.data.attendance.unshift(
      newRecord
    );

    this.save();

    return newRecord;
  }

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  public getDashboardStats(
    todayDate: string
  ): DashboardStats {
    // --------------------------------------------------------
    // Clients
    // --------------------------------------------------------

    const totalClients =
      this.data.clients.length;

    const activeClientsCount =
      this.data.clients.filter(
        (client) =>
          client.status ===
          'Active'
      ).length;

    const totalMonthlyRevenue =
      this.data.clients
        .filter(
          (client) =>
            client.status ===
            'Active'
        )
        .reduce(
          (
            total,
            client
          ) =>
            total +
            (client.monthlyFee ||
              0),
          0
        );

    // --------------------------------------------------------
    // Tasks
    // --------------------------------------------------------

    const totalTasks =
      this.data.tasks.length;

    const pendingTasks =
      this.data.tasks.filter(
        (task) =>
          task.status ===
          'Pending'
      ).length;

    const inProgressTasks =
      this.data.tasks.filter(
        (task) =>
          task.status ===
          'In Progress'
      ).length;

    const completedTasks =
      this.data.tasks.filter(
        (task) =>
          task.status ===
          'Completed'
      ).length;

    // --------------------------------------------------------
    // Employees
    // --------------------------------------------------------

    const employees =
      this.data.users.filter(
        (user) =>
          user.role ===
          'employee'
      );

    const totalEmployees =
      employees.length;

    const activeEmployees =
      employees.filter(
        (user) =>
          user.status ===
          'Active'
      ).length;

    // --------------------------------------------------------
    // Today's attendance ONLY
    // --------------------------------------------------------

    const todayRecords =
      this.data.attendance.filter(
        (record) =>
          record.date ===
          todayDate
      );

    const presentToday =
      todayRecords.filter(
        (record) =>
          record.status ===
          'Present'
      ).length;

    const lateToday =
      todayRecords.filter(
        (record) =>
          record.status ===
          'Late'
      ).length;

    const absentToday =
      Math.max(
        0,
        activeEmployees -
          (
            presentToday +
            lateToday
          )
      );

    // --------------------------------------------------------
    // Return dashboard stats
    // --------------------------------------------------------

    return {
      totalClients,

      activeClientsCount,

      totalMonthlyRevenue,

      totalTasks,

      pendingTasks,

      inProgressTasks,

      completedTasks,

      totalEmployees,

      activeEmployees,

      presentToday,

      lateToday,

      absentToday,
    };
  }
}

// ============================================================
// TIME PARSER
// ============================================================

function parseTimeToMinutes(
  value: string
): number | null {
  try {
    const normalized =
      value
        .trim()
        .toUpperCase();

    const match =
      normalized.match(
        /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
      );

    if (!match) {
      return null;
    }

    let hour =
      Number(match[1]);

    const minute =
      Number(match[2]);

    const period =
      match[3];

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 1 ||
      hour > 12 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    if (
      period === 'PM' &&
      hour !== 12
    ) {
      hour += 12;
    }

    if (
      period === 'AM' &&
      hour === 12
    ) {
      hour = 0;
    }

    return (
      hour * 60 +
      minute
    );
  } catch {
    return null;
  }
}

// ============================================================
// WORK DURATION
// ============================================================

function calculateWorkDuration(
  checkIn: string,
  checkOut: string
): string {
  try {
    const start =
      parseTimeToMinutes(
        checkIn
      );

    const end =
      parseTimeToMinutes(
        checkOut
      );

    if (
      start === null ||
      end === null
    ) {
      return '0h 00m';
    }

    let difference =
      end - start;

    /**
     * Support overnight shifts.
     */
    if (
      difference < 0
    ) {
      difference +=
        24 * 60;
    }

    if (
      difference <= 0
    ) {
      return '0h 00m';
    }

    const hours =
      Math.floor(
        difference / 60
      );

    const minutes =
      difference % 60;

    return `${hours}h ${String(
      minutes
    ).padStart(2, '0')}m`;
  } catch {
    return '0h 00m';
  }
}

// ============================================================
// DATABASE INSTANCE
// ============================================================

export const db =
  new Database();