import fs from 'fs';
import path from 'path';
import { User, Client, Task, AttendanceRecord, DashboardStats } from '../types.ts';
import { INITIAL_USERS, INITIAL_CLIENTS, INITIAL_TASKS, INITIAL_ATTENDANCE } from '../data/seedData.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'office_db.json');

export interface DatabaseSchema {
  users: User[];
  clients: Client[];
  tasks: Task[];
  attendance: AttendanceRecord[];
}

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

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.clients && parsed.tasks && parsed.attendance) {
          this.data = parsed;
          return;
        }
      }
      this.save();
    } catch (err) {
      console.error('Error initializing database, using seed data:', err);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }

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

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users.map(({ password: _, ...rest }) => rest as User);
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmailOrUsername(identifier: string): User | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(
      (u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
    );
  }

  public addUser(user: Omit<User, 'id'>): User {
    const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User = { ...user, id };
    this.data.users.push(newUser);
    this.save();
    const { password: _, ...safeUser } = newUser;
    return safeUser as User;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.save();
    const { password: _, ...safeUser } = this.data.users[idx];
    return safeUser as User;
  }

  public deleteUser(id: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== id);
    if (this.data.users.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Clients ---
  public getClients(): Client[] {
    return this.data.clients;
  }

  public getClientById(id: string): Client | undefined {
    return this.data.clients.find((c) => c.id === id);
  }

  public addClient(client: Omit<Client, 'id' | 'createdAt'>): Client {
    const id = `cli_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newClient: Client = {
      ...client,
      id,
      createdAt: new Date().toISOString(),
    };
    this.data.clients.unshift(newClient);
    this.save();
    return newClient;
  }

  public updateClient(id: string, updates: Partial<Client>): Client | null {
    const idx = this.data.clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.clients[idx] = { ...this.data.clients[idx], ...updates };
    this.save();
    return this.data.clients[idx];
  }

  public deleteClient(id: string): boolean {
    const initialLen = this.data.clients.length;
    this.data.clients = this.data.clients.filter((c) => c.id !== id);
    if (this.data.clients.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Tasks ---
  public getTasks(filterUserId?: string): Task[] {
    if (filterUserId) {
      return this.data.tasks.filter((t) => t.assignedTo === filterUserId);
    }
    return this.data.tasks;
  }

  public getTaskById(id: string): Task | undefined {
    return this.data.tasks.find((t) => t.id === id);
  }

  public addTask(task: Omit<Task, 'id' | 'createdAt'>): Task {
    const id = `tsk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newTask: Task = {
      ...task,
      id,
      createdAt: new Date().toISOString(),
    };
    this.data.tasks.unshift(newTask);
    this.save();
    return newTask;
  }

  public updateTask(id: string, updates: Partial<Task>): Task | null {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.data.tasks[idx] = { ...this.data.tasks[idx], ...updates };
    this.save();
    return this.data.tasks[idx];
  }

  public deleteTask(id: string): boolean {
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    if (this.data.tasks.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Attendance ---
  public getAttendance(filters?: {
    employeeId?: string;
    date?: string;
    status?: string;
    search?: string;
  }): AttendanceRecord[] {
    let result = [...this.data.attendance];

    if (filters?.employeeId) {
      result = result.filter((a) => a.employeeId === filters.employeeId);
    }
    if (filters?.date) {
      result = result.filter((a) => a.date === filters.date);
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.employeeName.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q) ||
          (a.note && a.note.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }

  public getTodayRecord(employeeId: string, todayDate: string): AttendanceRecord | undefined {
    return this.data.attendance.find(
      (a) => a.employeeId === employeeId && a.date === todayDate
    );
  }

  public markCheckIn(employeeId: string, todayDate: string, timeStr: string, note?: string): AttendanceRecord {
    const user = this.getUserById(employeeId);
    if (!user) throw new Error('Employee not found');

    const existingIdx = this.data.attendance.findIndex(
      (a) => a.employeeId === employeeId && a.date === todayDate
    );

    // Determine status (check if after 09:15 AM)
    let status: AttendanceRecord['status'] = 'Present';
    if (timeStr.includes('AM')) {
      const parts = timeStr.replace(' AM', '').split(':');
      const hour = parseInt(parts[0], 10);
      const min = parseInt(parts[1], 10);
      if (hour > 9 || (hour === 9 && min > 15)) {
        status = 'Late';
      }
    }

    if (existingIdx !== -1) {
      this.data.attendance[existingIdx].checkIn = timeStr;
      this.data.attendance[existingIdx].status = status;
      if (note) this.data.attendance[existingIdx].note = note;
      this.save();
      return this.data.attendance[existingIdx];
    } else {
      const newRecord: AttendanceRecord = {
        id: `att_${todayDate.replace(/-/g, '')}_${employeeId.slice(-4)}`,
        employeeId: user.id,
        employeeName: user.name,
        employeeEmail: user.email,
        department: user.department,
        date: todayDate,
        checkIn: timeStr,
        checkOut: null,
        status,
        note: note || '',
        hoursWorked: 'Active',
      };
      this.data.attendance.unshift(newRecord);
      this.save();
      return newRecord;
    }
  }

  public markCheckOut(employeeId: string, todayDate: string, timeStr: string, note?: string): AttendanceRecord {
    const existingIdx = this.data.attendance.findIndex(
      (a) => a.employeeId === employeeId && a.date === todayDate
    );

    if (existingIdx === -1) {
      throw new Error('Check in record required before check out');
    }

    const rec = this.data.attendance[existingIdx];
    rec.checkOut = timeStr;
    if (note) {
      rec.note = rec.note ? `${rec.note} · ${note}` : note;
    }

    // Calculate approximate hours worked
    if (rec.checkIn) {
      rec.hoursWorked = calculateWorkDuration(rec.checkIn, timeStr);
    }

    this.save();
    return rec;
  }

  public saveManualAttendance(record: Omit<AttendanceRecord, 'id'>): AttendanceRecord {
    const id = `att_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: AttendanceRecord = { ...record, id };
    this.data.attendance.unshift(newRecord);
    this.save();
    return newRecord;
  }

  public getDashboardStats(todayDate: string): DashboardStats {
    const totalClients = this.data.clients.length;
    const activeClientsCount = this.data.clients.filter((c) => c.status === 'Active').length;
    const totalMonthlyRevenue = this.data.clients
      .filter((c) => c.status === 'Active')
      .reduce((sum, c) => sum + (c.monthlyFee || 0), 0);

    const totalTasks = this.data.tasks.length;
    const pendingTasks = this.data.tasks.filter((t) => t.status === 'Pending').length;
    const inProgressTasks = this.data.tasks.filter((t) => t.status === 'In Progress').length;
    const completedTasks = this.data.tasks.filter((t) => t.status === 'Completed').length;

    const employees = this.data.users.filter((u) => u.role === 'employee');
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((u) => u.status === 'Active').length;

    const todayRecords = this.data.attendance.filter((a) => a.date === todayDate);
    const presentToday = todayRecords.filter((a) => a.status === 'Present').length;
    const lateToday = todayRecords.filter((a) => a.status === 'Late').length;
    const absentToday = Math.max(0, activeEmployees - (presentToday + lateToday));

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

function calculateWorkDuration(checkIn: string, checkOut: string): string {
  try {
    const parseTime = (t: string) => {
      const isPM = t.includes('PM');
      const clean = t.replace(/(AM|PM|\s)/g, '');
      const [h, m] = clean.split(':').map(Number);
      let hour = h;
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return hour * 60 + m;
    };

    const diffMins = parseTime(checkOut) - parseTime(checkIn);
    if (diffMins <= 0) return '8h 00m';
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  } catch {
    return '8h 00m';
  }
}

export const db = new Database();
