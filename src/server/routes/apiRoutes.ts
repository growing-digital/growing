import { Router } from 'express';
import { verifyAuth, requireAdmin } from '../middleware/auth.ts';
import * as authController from '../controllers/authController.ts';
import * as clientController from '../controllers/clientController.ts';
import * as taskController from '../controllers/taskController.ts';
import * as attendanceController from '../controllers/attendanceController.ts';
import * as employeeController from '../controllers/employeeController.ts';
import * as dashboardController from '../controllers/dashboardController.ts';
import { db } from '../db.ts';

export const apiRouter = Router();

// --- Auth Routes ---
apiRouter.post('/auth/login', authController.login);
apiRouter.get('/auth/me', verifyAuth, authController.getMe);
apiRouter.post('/auth/logout', verifyAuth, authController.logout);
apiRouter.post('/auth/forgot-password', authController.forgotPassword);

// --- Dashboard Routes ---
apiRouter.get('/dashboard/stats', verifyAuth, dashboardController.getDashboardStats);

// --- Client Routes (Admin Only) ---
apiRouter.get('/clients', verifyAuth, requireAdmin, clientController.getClients);
apiRouter.post('/clients', verifyAuth, requireAdmin, clientController.createClient);
apiRouter.put('/clients/:id', verifyAuth, requireAdmin, clientController.updateClient);
apiRouter.delete('/clients/:id', verifyAuth, requireAdmin, clientController.deleteClient);

// --- Task Routes ---
apiRouter.get('/tasks', verifyAuth, taskController.getTasks);
apiRouter.post('/tasks', verifyAuth, requireAdmin, taskController.createTask);
apiRouter.put('/tasks/:id', verifyAuth, requireAdmin, taskController.updateTask);
apiRouter.patch('/tasks/:id/status', verifyAuth, taskController.updateTaskStatus);
apiRouter.delete('/tasks/:id', verifyAuth, requireAdmin, taskController.deleteTask);

// --- Attendance Routes ---
apiRouter.get('/attendance/today', verifyAuth, attendanceController.getTodayAttendance);
apiRouter.get('/attendance', verifyAuth, attendanceController.getAttendance);
apiRouter.post('/attendance/check-in', verifyAuth, attendanceController.checkIn);
apiRouter.post('/attendance/check-out', verifyAuth, attendanceController.checkOut);
apiRouter.post('/admin/attendance', verifyAuth, requireAdmin, attendanceController.addManualAttendance);

// --- Employee Routes (Admin Only) ---
apiRouter.get('/employees', verifyAuth, requireAdmin, employeeController.getEmployees);
apiRouter.post('/employees', verifyAuth, requireAdmin, employeeController.createEmployee);
apiRouter.put('/employees/:id', verifyAuth, requireAdmin, employeeController.updateEmployee);
apiRouter.patch('/employees/:id/status', verifyAuth, requireAdmin, employeeController.toggleEmployeeStatus);
apiRouter.post('/employees/:id/reset-password', verifyAuth, requireAdmin, employeeController.resetPassword);
apiRouter.delete('/employees/:id', verifyAuth, requireAdmin, employeeController.deleteEmployee);

// --- System Maintenance ---
apiRouter.post('/admin/reset-demo', verifyAuth, requireAdmin, (_req, res) => {
  db.resetToSeed();
  res.json({ success: true, message: 'Database reset to default seed state.' });
});
