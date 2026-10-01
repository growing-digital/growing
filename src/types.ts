export type Role = 'admin' | 'employee';

export type UserStatus = 'Active' | 'Disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: Role;
  phone: string;
  department: string;
  joiningDate: string;
  status: UserStatus;
  avatarUrl?: string;
}

export type PackageTier = 'Starter' | 'Growth' | 'Premium' | 'Enterprise';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';
export type ClientStatus = 'Active' | 'Archived';

export interface Client {
  id: string;
  clientName: string;
  packageTier: PackageTier;
  monthlyFee: number; // e.g. 25000
  contractStart: string; // YYYY-MM-DD
  renewalDate: string; // YYYY-MM-DD
  namedApprover: string; // e.g. "Mr. Kumar"
  billingContact: string; // e.g. "billing@abc.com"
  deliveryLead: string; // e.g. "Arun"
  baselineMetrics: string; // e.g. "Website / Leads / Social"
  seuLoad: string; // e.g. "40 hrs"
  paymentStatus: PaymentStatus;
  status: ClientStatus;
  notes?: string;
  createdAt: string;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Task {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  assignedTo: string; // employee userId
  assignedToName: string;
  dueDate: string; // YYYY-MM-DD
  definitionOfDone: string;
  dependency: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  completionNotes?: string;
}

export type AttendanceStatus =
  | 'Present'
  | 'Late'
  | 'Absent'
  | 'On Leave';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // e.g. "09:10 AM"
  checkOut: string | null; // e.g. "06:05 PM"
  status: AttendanceStatus;
  note: string;
  hoursWorked: string; // e.g. "8h 55m"
}
export interface AuthSession {
  token: string;
  user: User;
}

export interface DashboardStats {
  totalClients: number;
  activeClientsCount: number;
  totalMonthlyRevenue: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
}
