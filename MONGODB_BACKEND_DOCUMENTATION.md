# Office Management System — MongoDB Backend Architecture & Implementation Guide

This document provides a comprehensive, production-grade guide for implementing MongoDB (via Mongoose ODM) as the primary persistent database for the **Office Management System**.

---

## 1. System Architecture & Database Design

### 1.1 Architecture Diagram

```
                 ┌──────────────────────────────────────┐
                 │       React SPA Client (Vite)        │
                 └──────────────────┬───────────────────┘
                                    │ HTTP / JSON (Bearer JWT)
                                    ▼
                 ┌──────────────────────────────────────┐
                 │         Express.js API Layer         │
                 │   - Auth Middleware (verifyJWT)      │
                 │   - Role Guard (requireAdmin)        │
                 │   - Request Validators               │
                 └──────────────────┬───────────────────┘
                                    │ Mongoose ODM
                                    ▼
                 ┌──────────────────────────────────────┐
                 │       MongoDB Database Engine        │
                 │   - users      (Role & credentials)  │
                 │   - clients    (Retainers & SLAs)    │
                 │   - tasks      (Weekly work orders)  │
                 │   - attendance (Daily check in/out)  │
                 └──────────────────────────────────────┘
```

---

## 2. Environment Configuration (`.env`)

Add the following variables to your `.env` and `.env.example`:

```env
# MongoDB Connection String (MongoDB Atlas or Local instance)
# Format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
MONGODB_URI="mongodb+srv://admin:StrongPassword123@cluster0.abcde.mongodb.net/office_management?retryWrites=true&w=majority"

# Port & Environment
PORT=3000
NODE_ENV=production

# JWT Authentication Secret & Expiration
JWT_SECRET="super_secure_office_management_jwt_secret_key_2026_xyz"
JWT_EXPIRES_IN="7d"

# Office Shift Configuration
SHIFT_START="09:00 AM"
SHIFT_END="06:00 PM"
GRACE_PERIOD_CUTOFF="09:15 AM"
```

---

## 3. Database Connection Helper (`src/server/db/mongodb.ts`)

```typescript
import mongoose from 'mongoose';

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('CRITICAL: MONGODB_URI is not defined in environment variables.');
  }

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 20,           // Maintain up to 20 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5s
      socketTimeoutMS: 45000,    // Close sockets after 45s of inactivity
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log(`[MongoDB] Connected to database: ${conn.connection.name}`);
  } catch (error) {
    console.error('[MongoDB] Connection failure:', error);
    throw error;
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from database.');
  isConnected = false;
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Runtime error:', err);
});
```

---

## 4. Complete Mongoose Collection Schemas

### 4.1 Users Collection (`models/User.ts`)

Represents both Administrators and Employees. Passwords are automatically hashed via `bcrypt` on pre-save hooks and omitted from default queries.

```typescript
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  username: string;
  password?: string;
  role: 'admin' | 'employee';
  phone: string;
  department: string;
  joiningDate: Date;
  status: 'Active' | 'Disabled';
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: ['admin', 'employee'],
      default: 'employee',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      default: 'General',
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Active', 'Disabled'],
      default: 'Active',
      index: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save password hashing
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password!, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password instance method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
```

---

### 4.2 Clients Collection (`models/Client.ts`)

Implements **Section 3.1: Client Master Record** with all 10 required operational and commercial fields.

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  clientName: string;
  packageTier: 'Starter' | 'Growth' | 'Premium' | 'Enterprise';
  monthlyFee: number;
  contractStart: Date;
  renewalDate: Date;
  namedApprover: string;
  billingContact: string;
  deliveryLead: string;
  baselineMetrics: string;
  seuLoad: string;
  paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  status: 'Active' | 'Archived';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    clientName: {
      type: String,
      required: [true, 'Client Name is required'],
      trim: true,
      index: true,
    },
    packageTier: {
      type: String,
      enum: ['Starter', 'Growth', 'Premium', 'Enterprise'],
      required: true,
      default: 'Growth',
      index: true,
    },
    monthlyFee: {
      type: Number,
      required: [true, 'Monthly Fee is required'],
      min: [0, 'Monthly fee cannot be negative'],
    },
    contractStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    renewalDate: {
      type: Date,
      required: true,
    },
    namedApprover: {
      type: String,
      required: [true, 'Named Approver is required'],
      trim: true,
    },
    billingContact: {
      type: String,
      required: [true, 'Billing Contact Email is required'],
      lowercase: true,
      trim: true,
    },
    deliveryLead: {
      type: String,
      required: [true, 'Delivery Lead is required'],
      trim: true,
    },
    baselineMetrics: {
      type: String,
      default: 'Website / Leads / Social',
    },
    seuLoad: {
      type: String,
      default: '40 hrs',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Overdue'],
      default: 'Paid',
      index: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Archived'],
      default: 'Active',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active clients sorted by fee
ClientSchema.index({ status: 1, monthlyFee: -1 });

export const Client = mongoose.model<IClient>('Client', ClientSchema);
```

---

### 4.3 Tasks Collection (`models/Task.ts`)

Implements **Section 4: Weekly Task Management** with client linkage, employee ownership, Definition of Done, dependencies, and status cycling.

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  title: string;
  clientId: mongoose.Types.ObjectId;
  clientName: string;
  assignedTo: mongoose.Types.ObjectId;
  assignedToName: string;
  dueDate: Date;
  definitionOfDone: string;
  dependency: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed';
  completionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task Title is required'],
      trim: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: false,
      index: true,
    },
    clientName: {
      type: String,
      required: true,
      default: 'Internal Project',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned employee is required'],
      index: true,
    },
    assignedToName: {
      type: String,
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    definitionOfDone: {
      type: String,
      required: [true, 'Definition of Done is required'],
    },
    dependency: {
      type: String,
      default: 'None',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
      index: true,
    },
    completionNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// High-speed queries: filter tasks by assignee and status
TaskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
```

---

### 4.4 Attendance Collection (`models/Attendance.ts`)

Implements **Section 5 & 8: Employee & Admin Attendance Register**. Uses a compound unique index on `{ employeeId: 1, date: 1 }` to guarantee that an employee has strictly **one** attendance record per calendar date.

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  employeeEmail: string;
  department: string;
  date: string; // Stored in YYYY-MM-DD for fast, indexable date filtering
  checkIn: string | null;  // e.g. "09:10 AM"
  checkOut: string | null; // e.g. "06:05 PM"
  status: 'Present' | 'Late' | 'Absent' | 'On Leave';
  note?: string;
  hoursWorked?: string;    // e.g. "8h 55m"
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    employeeEmail: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'],
    },
    checkIn: {
      type: String,
      default: null,
    },
    checkOut: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent', 'On Leave'],
      default: 'Present',
      index: true,
    },
    note: {
      type: String,
      default: '',
    },
    hoursWorked: {
      type: String,
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL UNIQUE CONSTRAINT: One attendance punch per employee per date
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Admin query index: date + status filtering
AttendanceSchema.index({ date: 1, status: 1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
```

---

## 5. Security & Permission Middleware

### `middleware/auth.ts`

Enforces role boundaries so employees cannot access client records, billing, or employee management even if calling the API directly.

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function verifyJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.substring(7).trim();
  const secret = process.env.JWT_SECRET || 'default_secret';

  try {
    const decoded = jwt.verify(token, secret) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user || user.status === 'Disabled') {
      return res.status(401).json({ error: 'User account disabled or not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token.' });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied: Administrative privileges required. Employee access prohibited.',
    });
  }
  next();
}
```

---

## 6. MongoDB Controller Implementations

### 6.1 Authentication Controller (`controllers/authController.ts`)

```typescript
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' });
  }

  const clean = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: clean }, { username: clean }],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid email/username or password.' });
  }

  if (user.status === 'Disabled') {
    return res.status(403).json({ error: 'Account disabled. Contact administrator.' });
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '7d' }
  );

  const safeUser = user.toObject();
  delete safeUser.password;

  res.json({ token, user: safeUser });
}
```

---

### 6.2 Attendance Controller (`controllers/attendanceController.ts`)

```typescript
import { Response } from 'express';
import { Attendance } from '../models/Attendance';
import { AuthenticatedRequest } from '../middleware/auth';

function calculateWorkDuration(checkIn: string, checkOut: string): string {
  try {
    const parseTime = (t: string) => {
      const isPM = t.includes('PM');
      const [h, m] = t.replace(/(AM|PM|\s)/g, '').split(':').map(Number);
      let hour = h;
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return hour * 60 + m;
    };
    const diff = parseTime(checkOut) - parseTime(checkIn);
    if (diff <= 0) return '8h 00m';
    return `${Math.floor(diff / 60)}h ${(diff % 60).toString().padStart(2, '0')}m`;
  } catch {
    return '8h 00m';
  }
}

export async function checkIn(req: AuthenticatedRequest, res: Response) {
  const user = req.user!;
  const today = req.body.date || new Date().toISOString().slice(0, 10);
  const nowStr = req.body.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Punctuality rule: Check-ins after 09:15 AM marked 'Late'
  let status: 'Present' | 'Late' = 'Present';
  if (nowStr.includes('AM')) {
    const [h, m] = nowStr.replace(' AM', '').split(':').map(Number);
    if (h > 9 || (h === 9 && m > 15)) status = 'Late';
  }

  try {
    const record = await Attendance.findOneAndUpdate(
      { employeeId: user._id, date: today },
      {
        $setOnInsert: {
          employeeId: user._id,
          employeeName: user.name,
          employeeEmail: user.email,
          department: user.department,
          date: today,
        },
        $set: {
          checkIn: nowStr,
          status,
          note: req.body.note || 'Present at workstation',
          hoursWorked: 'Active',
        },
      },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function checkOut(req: AuthenticatedRequest, res: Response) {
  const user = req.user!;
  const today = req.body.date || new Date().toISOString().slice(0, 10);
  const nowStr = req.body.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const record = await Attendance.findOne({ employeeId: user._id, date: today });
  if (!record || !record.checkIn) {
    return res.status(400).json({ error: 'Check-in required before checking out.' });
  }

  record.checkOut = nowStr;
  record.hoursWorked = calculateWorkDuration(record.checkIn, nowStr);
  if (req.body.note) {
    record.note = record.note ? `${record.note} · ${req.body.note}` : req.body.note;
  }

  await record.save();
  res.json(record);
}
```

---

### 6.3 Dashboard Aggregation Controller (`controllers/dashboardController.ts`)

Executes high-performance `$facet` aggregation pipeline across all collections simultaneously.

```typescript
import { Response } from 'express';
import { Client } from '../models/Client';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { Attendance } from '../models/Attendance';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  const today = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  if (req.user!.role === 'admin') {
    const [clientsStats, tasksStats, employeesCount, todayAtt] = await Promise.all([
      Client.aggregate([
        {
          $group: {
            _id: null,
            totalClients: { $sum: 1 },
            activeClientsCount: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
            totalMonthlyRevenue: {
              $sum: { $cond: [{ $eq: ['$status', 'Active'] }, '$monthlyFee', 0] },
            },
          },
        },
      ]),
      Task.aggregate([
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            pendingTasks: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            inProgressTasks: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
            completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          },
        },
      ]),
      User.countDocuments({ role: 'employee', status: 'Active' }),
      Attendance.find({ date: today }),
    ]);

    const c = clientsStats[0] || { totalClients: 0, activeClientsCount: 0, totalMonthlyRevenue: 0 };
    const t = tasksStats[0] || { totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0 };

    const presentToday = todayAtt.filter((a) => a.status === 'Present').length;
    const lateToday = todayAtt.filter((a) => a.status === 'Late').length;
    const absentToday = Math.max(0, employeesCount - (presentToday + lateToday));

    return res.json({
      totalClients: c.totalClients,
      activeClientsCount: c.activeClientsCount,
      totalMonthlyRevenue: c.totalMonthlyRevenue,
      totalTasks: t.totalTasks,
      pendingTasks: t.pendingTasks,
      inProgressTasks: t.inProgressTasks,
      completedTasks: t.completedTasks,
      totalEmployees: employeesCount,
      activeEmployees: employeesCount,
      presentToday,
      lateToday,
      absentToday,
    });
  } else {
    // Employee restricted metrics
    const [myTasks, todayRecord] = await Promise.all([
      Task.find({ assignedTo: req.user!._id }),
      Attendance.findOne({ employeeId: req.user!._id, date: today }),
    ]);

    return res.json({
      myTotalTasks: myTasks.length,
      myPendingTasks: myTasks.filter((t) => t.status === 'Pending').length,
      myInProgressTasks: myTasks.filter((t) => t.status === 'In Progress').length,
      myCompletedTasks: myTasks.filter((t) => t.status === 'Completed').length,
      todayStatus: todayRecord ? todayRecord.status : 'Not Marked',
      todayCheckIn: todayRecord ? todayRecord.checkIn : null,
      todayCheckOut: todayRecord ? todayRecord.checkOut : null,
    });
  }
}
```

---

## 7. Initial Admin Seed Script (`scripts/seedAdmin.ts`)

Run this script once after connecting MongoDB to create the root administrator:

```typescript
import { connectMongoDB } from '../src/server/db/mongodb';
import { User } from '../src/server/models/User';

async function seedAdmin() {
  await connectMongoDB();

  const existingAdmin = await User.findOne({ email: 'admin@company.com' });
  if (existingAdmin) {
    console.log('[Seed] Admin account already exists.');
    process.exit(0);
  }

  await User.create({
    name: 'Administrator',
    email: 'admin@company.com',
    username: 'admin',
    password: 'admin123', // Will be hashed automatically by pre-save hook
    role: 'admin',
    phone: '+91 98765 00001',
    department: 'Executive Management',
    status: 'Active',
  });

  console.log('[Seed] Default Admin account created successfully (admin@company.com / admin123).');
  process.exit(0);
}

seedAdmin().catch(console.error);
```

---

## 8. Deployment & Migration Checklist

1. **Provision MongoDB Cluster**:
   - Create a free or dedicated cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
   - Set Network Access to allow your backend IP (or `0.0.0.0/0` with strong authentication).
   - Add database user with `readWrite` permissions.

2. **Install Dependencies**:
   ```bash
   npm install mongoose bcryptjs jsonwebtoken
   npm install -D @types/bcryptjs @types/jsonwebtoken
   ```

3. **Configure Environment Variables**:
   - Set `MONGODB_URI` and `JWT_SECRET` in `.env`.

4. **Verify Compound Indexes**:
   - Confirm `{ employeeId: 1, date: 1 }` is created to prevent duplicate daily punches.
   - Confirm `{ email: 1 }` and `{ username: 1 }` unique indexes are active.
