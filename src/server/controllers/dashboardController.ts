import { Response } from 'express';
import { Client } from '../models/Client.ts';
import { Task } from '../models/Task.ts';
import { User } from '../models/User.ts';
import { Attendance } from '../models/Attendance.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  const today = (req.query.date as string) || '2026-09-28';
  const isAdmin = req.user?.role === 'admin';

  try {
    if (isMongoConnected()) {
      if (isAdmin) {
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
        const [myTasks, todayRecord] = await Promise.all([
          Task.find({ assignedTo: req.user?.id }),
          Attendance.findOne({ employeeId: req.user?.id, date: today }),
        ]);

        return res.json({
          myTotalTasks: myTasks.length,
          myPendingTasks: myTasks.filter((t) => t.status === 'Pending').length,
          myInProgressTasks: myTasks.filter((t) => t.status === 'In Progress').length,
          myCompletedTasks: myTasks.filter((t) => t.status === 'Completed').length,
          todayStatus: todayRecord ? todayRecord.status : 'Not Checked In',
          todayCheckIn: todayRecord ? todayRecord.checkIn : null,
          todayCheckOut: todayRecord ? todayRecord.checkOut : null,
        });
      }
    }
  } catch (err: any) {
    console.warn('[Dashboard] Mongo aggregation error:', err.message);
  }

  // Fallback to local store stats
  return res.json(db.getDashboardStats(today));
}

export async function resetDatabase(_req: AuthenticatedRequest, res: Response) {
  db.resetToSeed();
  return res.json({ success: true, message: 'Database reset to default seed state.' });
}
