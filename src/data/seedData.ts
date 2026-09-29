import { User, Client, Task, AttendanceRecord } from '../types.ts';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin_01',
    name: 'Administrator',
    email: 'admin@company.com',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    phone: '+91 98765 00001',
    department: 'Executive Management',
    joiningDate: '2026-01-01',
    status: 'Active',
    avatarUrl: '/src/assets/images/avatar_admin_1790595482398.jpg',
  },
];

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_TASKS: Task[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
