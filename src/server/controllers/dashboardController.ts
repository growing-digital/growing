import type { Response } from 'express';

import { Client } from '../models/Client.ts';
import { Task } from '../models/Task.ts';
import { User } from '../models/User.ts';
import { Attendance } from '../models/Attendance.ts';

import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';

import type { AuthenticatedRequest } from '../middleware/auth.ts';

/**
 * ============================================================
 * GET CURRENT APPLICATION DATE
 * ============================================================
 *
 * Attendance/dashboard dates are stored as:
 *
 * YYYY-MM-DD
 *
 * The application uses the configured business timezone.
 *
 * You can override it with:
 *
 * APP_TIME_ZONE
 *
 * Default:
 * Asia/Kolkata
 */
function getCurrentApplicationDate(): string {
  const timeZone =
    process.env.APP_TIME_ZONE ||
    'Asia/Kolkata';

  try {
    return new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    ).format(new Date());
  } catch {
    /**
     * Safe fallback if an invalid timezone
     * is configured.
     */
    const now = new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        now.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}

/**
 * ============================================================
 * NORMALIZE REQUESTED DATE
 * ============================================================
 */
function getRequestedDate(
  req: AuthenticatedRequest
): string {
  const requestedDate =
    typeof req.query.date === 'string'
      ? req.query.date.trim()
      : '';

  /**
   * Accept only YYYY-MM-DD.
   * Otherwise use today's application date.
   */
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      requestedDate
    )
  ) {
    return requestedDate;
  }

  return getCurrentApplicationDate();
}

/**
 * ============================================================
 * DASHBOARD STATISTICS
 * ============================================================
 */
export async function getDashboardStats(
  req: AuthenticatedRequest,
  res: Response
) {
  /**
   * No hard-coded demo date anymore.
   *
   * If frontend sends:
   *
   * ?date=2026-10-01
   *
   * that date is used.
   *
   * Otherwise current application date is used.
   */
  const today =
    getRequestedDate(req);

  const isAdmin =
    req.user?.role === 'admin';

  try {
    // ========================================================
    // MONGODB
    // ========================================================
    if (isMongoConnected()) {
      // ======================================================
      // ADMIN DASHBOARD
      // ======================================================
      if (isAdmin) {
        const [
          clientsStats,
          tasksStats,
          employeesCount,
          todayAtt,
        ] = await Promise.all([
          /**
           * CLIENT STATISTICS
           */
          Client.aggregate([
            {
              $group: {
                _id: null,

                totalClients: {
                  $sum: 1,
                },

                activeClientsCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          '$status',
                          'Active',
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                totalMonthlyRevenue: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          '$status',
                          'Active',
                        ],
                      },
                      '$monthlyFee',
                      0,
                    ],
                  },
                },
              },
            },
          ]),

          /**
           * TASK STATISTICS
           */
          Task.aggregate([
            {
              $group: {
                _id: null,

                totalTasks: {
                  $sum: 1,
                },

                pendingTasks: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          '$status',
                          'Pending',
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                inProgressTasks: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          '$status',
                          'In Progress',
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                completedTasks: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          '$status',
                          'Completed',
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ]),

          /**
           * ACTIVE EMPLOYEES
           */
          User.countDocuments({
            role: 'employee',
            status: 'Active',
          }),

          /**
           * ATTENDANCE FOR THIS DATE ONLY
           */
          Attendance.find({
            date: today,
          }),
        ]);

        const clientStats =
          clientsStats[0] || {
            totalClients: 0,
            activeClientsCount: 0,
            totalMonthlyRevenue: 0,
          };

        const taskStats =
          tasksStats[0] || {
            totalTasks: 0,
            pendingTasks: 0,
            inProgressTasks: 0,
            completedTasks: 0,
          };

        /**
         * ====================================================
         * TODAY'S ATTENDANCE COUNTS
         * ====================================================
         *
         * Example for 2026-10-01:
         *
         * Present = 5
         * Late = 2
         * Active Employees = 10
         * Absent = 3
         */
        const presentToday =
          todayAtt.filter(
            (record) =>
              record.status ===
              'Present'
          ).length;

        const lateToday =
          todayAtt.filter(
            (record) =>
              record.status ===
              'Late'
          ).length;

        const absentToday =
          Math.max(
            0,
            employeesCount -
              (
                presentToday +
                lateToday
              )
          );

        return res.json({
          totalClients:
            clientStats.totalClients,

          activeClientsCount:
            clientStats.activeClientsCount,

          totalMonthlyRevenue:
            clientStats.totalMonthlyRevenue,

          totalTasks:
            taskStats.totalTasks,

          pendingTasks:
            taskStats.pendingTasks,

          inProgressTasks:
            taskStats.inProgressTasks,

          completedTasks:
            taskStats.completedTasks,

          totalEmployees:
            employeesCount,

          activeEmployees:
            employeesCount,

          presentToday,

          lateToday,

          absentToday,
        });
      }

      // ======================================================
      // EMPLOYEE DASHBOARD
      // ======================================================

      const employeeId =
        req.user?.id;

      const [
        myTasks,
        todayRecord,
      ] = await Promise.all([
        /**
         * Employee's assigned tasks.
         */
        Task.find({
          assignedTo:
            employeeId,
        }),

        /**
         * Employee's attendance
         * for THIS DATE ONLY.
         */
        Attendance.findOne({
          employeeId,
          date: today,
        }),
      ]);

      return res.json({
        myTotalTasks:
          myTasks.length,

        myPendingTasks:
          myTasks.filter(
            (task) =>
              task.status ===
              'Pending'
          ).length,

        myInProgressTasks:
          myTasks.filter(
            (task) =>
              task.status ===
              'In Progress'
          ).length,

        myCompletedTasks:
          myTasks.filter(
            (task) =>
              task.status ===
              'Completed'
          ).length,

        todayStatus:
          todayRecord
            ? todayRecord.status
            : 'Not Checked In',

        todayCheckIn:
          todayRecord
            ? todayRecord.checkIn
            : null,

        todayCheckOut:
          todayRecord
            ? todayRecord.checkOut
            : null,
      });
    }
  } catch (err: any) {
    console.warn(
      '[Dashboard] Mongo aggregation error:',
      err?.message || err
    );
  }

  // ==========================================================
  // LOCAL DATABASE FALLBACK
  // ==========================================================

  try {
    return res.json(
      db.getDashboardStats(
        today
      )
    );
  } catch (err: any) {
    console.error(
      '[Dashboard] Local dashboard error:',
      err?.message || err
    );

    return res.status(500).json({
      error:
        'Failed to load dashboard statistics.',
    });
  }
}

/**
 * ============================================================
 * RESET DATABASE
 * ============================================================
 */
export async function resetDatabase(
  _req: AuthenticatedRequest,
  res: Response
) {
  db.resetToSeed();

  return res.json({
    success: true,
    message:
      'Database reset to default seed state.',
  });
}
