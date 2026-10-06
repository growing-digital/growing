import type { Response } from 'express';
import { Attendance } from '../models/Attendance.ts';
import { User } from '../models/User.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

// ============================================================
// OFFICE HOURS
// ============================================================

const OFFICE_START_MINUTES = 10 * 60 + 30; // 10:30 AM
const OFFICE_END_MINUTES = 17 * 60; // 5:00 PM

// ============================================================
// APPLICATION TIMEZONE
// ============================================================

const APPLICATION_TIME_ZONE = 'Asia/Kolkata';

// ============================================================
// CURRENT APPLICATION DATE
// ============================================================
//
// Uses India timezone so the backend and attendance dates
// stay consistent with the office location.
//
// Returns:
// YYYY-MM-DD
//
// Example:
// 2026-10-02
// ============================================================

function getServerDateTime(): {
  date: string;
  time: string;
} {
  /**
   * IMPORTANT:
   * This is the attendance authority.
   * It uses the backend/server clock and explicitly formats it
   * in India Standard Time. The employee's device clock is never used.
   */
  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APPLICATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(now);

  const getPart = (type: string): string =>
    parts.find(
      (part) => part.type === type
    )?.value || '';

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    time: `${getPart('hour')}:${getPart('minute')} ${getPart('dayPeriod')}`,
  };
}

function getServerDate(): string {
  return getServerDateTime().date;
}

// ============================================================
// VALIDATE DATE
// ============================================================

function isValidDateKey(
  value: string
): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  );
}

// ============================================================
// MONGOOSE ATTENDANCE → API RECORD
// ============================================================

function mapAttendanceRecord(
  record: any
) {
  return {
    id: record._id.toString(),
    employeeId:
      record.employeeId.toString(),
    employeeName:
      record.employeeName,
    employeeEmail:
      record.employeeEmail,
    department:
      record.department,
    date:
      record.date,
    checkIn:
      record.checkIn,
    checkOut:
      record.checkOut,
    status:
      record.status,
    note:
      record.note,
    hoursWorked:
      record.hoursWorked,
  };
}

// ============================================================
// TIME → MINUTES
// ============================================================
//
// Supports:
// 10:00 AM
// 10:30 AM
// 05:00 PM
// 12:00 PM
// 12:00 AM
//
// Returns total minutes after midnight.
//
// Invalid time → null
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
// CALCULATE PRESENT / LATE
// ============================================================
//
// IMPORTANT:
//
// 10:29 AM → Present
// 10:30 AM → Present
// 10:31 AM → Late
//
// Everything after 10:30 AM is Late.
//
// PM check-ins are automatically after the threshold
// and therefore Late.
// ============================================================

function calculateAttendanceStatus(
  checkInTime: string
): 'Present' | 'Late' {
  const checkInMinutes =
    parseTimeToMinutes(
      checkInTime
    );

  if (
    checkInMinutes === null
  ) {
    return 'Present';
  }

  if (
    checkInMinutes >
    OFFICE_START_MINUTES
  ) {
    return 'Late';
  }

  return 'Present';
}

// ============================================================
// CALCULATE WORK DURATION
// ============================================================
//
// Example:
// 10:00 AM -> 05:00 PM
// = 7h 00m
//
// 10:30 AM -> 05:00 PM
// = 6h 30m
// ============================================================

function calculateWorkDuration(
  checkIn: string,
  checkOut: string
): string {
  try {
    const startMinutes =
      parseTimeToMinutes(
        checkIn
      );

    const endMinutes =
      parseTimeToMinutes(
        checkOut
      );

    if (
      startMinutes === null ||
      endMinutes === null
    ) {
      return '0h 00m';
    }

    let diff =
      endMinutes -
      startMinutes;

    // Support overnight shifts.
    if (diff < 0) {
      diff += 24 * 60;
    }

    if (diff <= 0) {
      return '0h 00m';
    }

    const hours =
      Math.floor(diff / 60);

    const minutes =
      diff % 60;

    return `${hours}h ${String(
      minutes
    ).padStart(2, '0')}m`;
  } catch {
    return '0h 00m';
  }
}

// ============================================================
// GET TODAY'S ATTENDANCE
// ============================================================
//
// Admin:
//   returns all employees for the selected date.
//
// Employee:
//   returns only their own record for the selected date.
//
// Frontend normally sends:
//   ?date=2026-10-02
//
// No date:
//   backend uses current India date.
// ============================================================

export async function getTodayAttendance(
  req: AuthenticatedRequest,
  res: Response
) {
  const requestedDate =
    typeof req.query.date ===
    'string'
      ? req.query.date.trim()
      : '';

  const isAdmin =
    req.user?.role === 'admin';

  /**
   * SECURITY:
   * Admins may request a selected historical date.
   * Employees can only request the backend's actual current date.
   */
  const today =
    isAdmin && requestedDate
      ? requestedDate
      : getServerDate();

  if (!isValidDateKey(today)) {
    return res.status(400).json({
      error:
        'Invalid attendance date. Expected YYYY-MM-DD.',
    });
  }

  try {
    if (isMongoConnected()) {
      // ------------------------------------------------------
      // ADMIN
      // ------------------------------------------------------

      if (isAdmin) {
        const records =
          await Attendance.find({
            date: today,
          }).sort({
            checkIn: 1,
            employeeName: 1,
          });

        return res.json(
          records.map(
            mapAttendanceRecord
          )
        );
      }

      // ------------------------------------------------------
      // EMPLOYEE
      // ------------------------------------------------------

      const employeeId =
        req.user?.id;

      if (!employeeId) {
        return res.status(401).json({
          error:
            'Authenticated employee ID is missing.',
        });
      }

      const record =
        await Attendance.findOne({
          employeeId,
          date: today,
        });

      return res.json(
        record
          ? mapAttendanceRecord(
              record
            )
          : null
      );
    }
  } catch (err: any) {
    console.warn(
      '[Attendance] Mongo getTodayAttendance error:',
      err?.message || err
    );
  }

  // --------------------------------------------------------
  // LOCAL FALLBACK
  // --------------------------------------------------------

  try {
    if (isAdmin) {
      return res.json(
        db.getAttendance({
          date: today,
        })
      );
    }

    return res.json(
      db.getTodayRecord(
        req.user!.id,
        today
      ) || null
    );
  } catch (err: any) {
    console.error(
      '[Attendance] Local getTodayAttendance error:',
      err?.message || err
    );

    return res.status(500).json({
      error:
        'Failed to load today attendance.',
    });
  }
}

// ============================================================
// GET ATTENDANCE HISTORY
// ============================================================
//
// Employee:
//   only their own records.
//
// Admin:
//   can filter by employee/date/status/search.
// ============================================================

export async function getAttendance(
  req: AuthenticatedRequest,
  res: Response
) {
  const {
    date,
    employeeId,
    status,
    search,
  } =
    req.query as Record<
      string,
      string
    >;

  const isAdmin =
    req.user?.role === 'admin';

  if (
    date &&
    !isValidDateKey(date)
  ) {
    return res.status(400).json({
      error:
        'Invalid attendance date. Expected YYYY-MM-DD.',
    });
  }

  try {
    if (isMongoConnected()) {
      const query: Record<
        string,
        any
      > = {};

      // ------------------------------------------------------
      // EMPLOYEE SECURITY
      // Employees can only access their own records.
      // ------------------------------------------------------

      if (!isAdmin) {
        query.employeeId =
          req.user?.id;
      } else if (employeeId) {
        query.employeeId =
          employeeId;
      }

      if (date) {
        query.date = date;
      }

      if (
        status &&
        status !== 'all'
      ) {
        query.status = status;
      }

      if (search) {
        query.$or = [
          {
            employeeName: {
              $regex: search,
              $options: 'i',
            },
          },
          {
            department: {
              $regex: search,
              $options: 'i',
            },
          },
          {
            note: {
              $regex: search,
              $options: 'i',
            },
          },
        ];
      }

      const records =
        await Attendance.find(
          query
        ).sort({
          date: -1,
          checkIn: -1,
        });

      return res.json(
        records.map(
          mapAttendanceRecord
        )
      );
    }
  } catch (err: any) {
    console.warn(
      '[Attendance] Mongo query error:',
      err?.message || err
    );
  }

  // --------------------------------------------------------
  // LOCAL FALLBACK
  // --------------------------------------------------------

  try {
    if (isAdmin) {
      return res.json(
        db.getAttendance({
          date,
          employeeId,
          status,
          search,
        })
      );
    }

    return res.json(
      db.getAttendance({
        employeeId:
          req.user!.id,
        date,
        status,
        search,
      })
    );
  } catch (err: any) {
    console.error(
      '[Attendance] Local getAttendance error:',
      err?.message || err
    );

    return res.status(500).json({
      error:
        'Failed to load attendance records.',
    });
  }
}

// ============================================================
// CHECK IN
// ============================================================
//
// Creates exactly one record for:
//
// employeeId + date
//
// Office rule:
// 10:30 AM or earlier → Present
// After 10:30 AM      → Late
//
// Example:
//
// 10:29 AM → Present
// 10:30 AM → Present
// 10:31 AM → Late
// ============================================================

export async function checkIn(
  req: AuthenticatedRequest,
  res: Response
) {
  const user = req.user;

  if (!user?.id) {
    return res.status(401).json({
      error:
        'Authenticated employee is missing.',
    });
  }

  /**
   * SECURITY:
   * Ignore any date/time values sent by the browser.
   * Generate both values from ONE server-side instant so the
   * attendance date and time can never come from the mobile clock.
   */
  const serverDateTime =
    getServerDateTime();

  const attendanceDate =
    serverDateTime.date;

  const checkInTime =
    serverDateTime.time;

  const body =
    req.body || {};

  const note =
    typeof body.note === 'string'
      ? body.note.trim()
      : '';

  const status =
    calculateAttendanceStatus(
      checkInTime
    );

  try {
    if (isMongoConnected()) {
      // ------------------------------------------------------
      // ONE CHECK-IN PER EMPLOYEE PER SERVER DATE
      // ------------------------------------------------------

      const existing =
        await Attendance.findOne({
          employeeId: user.id,
          date: attendanceDate,
        });

      if (existing) {
        return res.status(409).json({
          error:
            existing.checkOut
              ? 'You have already completed attendance for today.'
              : 'You have already checked in for today.',
        });
      }

      const record =
        await Attendance.create({
          employeeId:
            user.id,

          employeeName:
            user.name,

          employeeEmail:
            user.email,

          department:
            user.department,

          date:
            attendanceDate,

          checkIn:
            checkInTime,

          checkOut:
            null,

          status,

          note,

          hoursWorked:
            'Active',
        });

      return res.json(
        mapAttendanceRecord(
          record
        )
      );
    }
  } catch (err: any) {
    /**
     * Unique employee/date indexes can also reject a race where
     * two check-in requests arrive almost simultaneously.
     */
    if (
      err?.code === 11000
    ) {
      return res.status(409).json({
        error:
          'You have already checked in for today.',
      });
    }

    console.warn(
      '[Attendance] Mongo checkIn error, using local fallback:',
      err?.message || err
    );
  }

  // --------------------------------------------------------
  // LOCAL FALLBACK
  // --------------------------------------------------------

  try {
    const record =
      db.markCheckIn(
        user.id,
        attendanceDate,
        checkInTime,
        note
      );

    return res.json(
      record
    );
  } catch (err: any) {
    return res.status(400).json({
      error:
        err?.message ||
        'Check-in failed.',
    });
  }
}

// ============================================================
// CHECK OUT
// ============================================================
//
// Stores the employee's actual checkout time.
//
// Scheduled office end:
// 5:00 PM
//
// The actual checkout time is NOT replaced with 5:00 PM.
// ============================================================

export async function checkOut(
  req: AuthenticatedRequest,
  res: Response
) {
  const employeeId =
    req.user?.id;

  if (!employeeId) {
    return res.status(401).json({
      error:
        'Authenticated employee is missing.',
    });
  }

  /**
   * SECURITY:
   * Ignore any date/time values sent by the browser.
   * The backend decides both the current attendance date and
   * the exact checkout time from its own server clock.
   */
  const serverDateTime =
    getServerDateTime();

  const attendanceDate =
    serverDateTime.date;

  const checkOutTime =
    serverDateTime.time;

  const body =
    req.body || {};

  const note =
    typeof body.note === 'string'
      ? body.note.trim()
      : '';

  try {
    if (isMongoConnected()) {
      // ------------------------------------------------------
      // FIND ONLY THIS EMPLOYEE + SERVER DATE
      // ------------------------------------------------------

      const record =
        await Attendance.findOne({
          employeeId,
          date:
            attendanceDate,
        });

      if (!record) {
        return res.status(400).json({
          error:
            'No attendance record exists for today.',
        });
      }

      if (!record.checkIn) {
        return res.status(400).json({
          error:
            'Check in record required before check out.',
        });
      }

      if (record.checkOut) {
        return res.status(400).json({
          error:
            'This attendance record has already been checked out.',
        });
      }

      // ------------------------------------------------------
      // SAVE SERVER-GENERATED CHECKOUT
      // ------------------------------------------------------

      record.checkOut =
        checkOutTime;

      // ------------------------------------------------------
      // CALCULATE ACTUAL WORKED HOURS
      // ------------------------------------------------------

      record.hoursWorked =
        calculateWorkDuration(
          record.checkIn,
          checkOutTime
        );

      if (note) {
        record.note =
          record.note
            ? `${record.note} · ${note}`
            : note;
      }

      await record.save();

      return res.json(
        mapAttendanceRecord(
          record
        )
      );
    }
  } catch (err: any) {
    console.warn(
      '[Attendance] Mongo checkOut error, using local fallback:',
      err?.message || err
    );
  }

  // --------------------------------------------------------
  // LOCAL FALLBACK
  // --------------------------------------------------------

  try {
    const record =
      db.markCheckOut(
        employeeId,
        attendanceDate,
        checkOutTime,
        note
      );

    return res.json(
      record
    );
  } catch (err: any) {
    return res.status(400).json({
      error:
        err?.message ||
        'Check-out failed.',
    });
  }
}

// ============================================================
// ADMIN MANUAL ATTENDANCE
// ============================================================
//
// Admin can create one attendance record for:
// employee + date
//
// Duplicate employee/date records are rejected.
// ============================================================

export async function addManualAttendance(
  req: AuthenticatedRequest,
  res: Response
) {
  const {
    employeeId,
    date,
    checkIn,
    checkOut,
    status,
    note,
    hoursWorked,
  } =
    req.body || {};

  if (
    !employeeId ||
    !date ||
    !status
  ) {
    return res.status(400).json({
      error:
        'Employee, date, and status are required.',
    });
  }

  if (!isValidDateKey(date)) {
    return res.status(400).json({
      error:
        'Invalid attendance date. Expected YYYY-MM-DD.',
    });
  }

  if (
    ![
      'Present',
      'Late',
      'Absent',
      'On Leave',
    ].includes(status)
  ) {
    return res.status(400).json({
      error:
        'Invalid attendance status.',
    });
  }

  try {
    if (isMongoConnected()) {
      // ------------------------------------------------------
      // GET EMPLOYEE FROM MONGODB
      // ------------------------------------------------------

      const mongoUser =
        await User.findById(
          employeeId
        );

      if (!mongoUser) {
        return res.status(404).json({
          error:
            'Employee not found.',
        });
      }

      // ------------------------------------------------------
      // PROTECT AGAINST DUPLICATE DATE
      // ------------------------------------------------------

      const existing =
        await Attendance.findOne({
          employeeId,
          date,
        });

      if (existing) {
        return res.status(409).json({
          error:
            'Attendance already exists for this employee on this date.',
        });
      }

      // ------------------------------------------------------
      // HOURS
      // ------------------------------------------------------

      const calculatedHours =
        checkIn &&
        checkOut
          ? calculateWorkDuration(
              checkIn,
              checkOut
            )
          : '0h 00m';

      const created =
        await Attendance.create({
          employeeId,

          employeeName:
            mongoUser.name,

          employeeEmail:
            mongoUser.email,

          department:
            mongoUser.department,

          date,

          checkIn:
            checkIn || null,

          checkOut:
            checkOut || null,

          status,

          note:
            note || '',

          hoursWorked:
            hoursWorked ||
            calculatedHours,
        });

      return res.status(201).json(
        mapAttendanceRecord(
          created
        )
      );
    }
  } catch (err: any) {
    console.warn(
      '[Attendance] Mongo manual attendance error:',
      err?.message || err
    );

    return res.status(500).json({
      error:
        'Failed to save manual attendance record.',
    });
  }

  // --------------------------------------------------------
  // LOCAL FALLBACK
  // --------------------------------------------------------

  try {
    const user =
      db.getUserById(
        employeeId
      );

    if (!user) {
      return res.status(404).json({
        error:
          'Employee not found.',
      });
    }

    const calculatedHours =
      checkIn &&
      checkOut
        ? calculateWorkDuration(
            checkIn,
            checkOut
          )
        : '0h 00m';

    const record =
      db.saveManualAttendance({
        employeeId,

        employeeName:
          user.name,

        employeeEmail:
          user.email,

        department:
          user.department,

        date,

        checkIn:
          checkIn || null,

        checkOut:
          checkOut || null,

        status,

        note:
          note || '',

        hoursWorked:
          hoursWorked ||
          calculatedHours,
      });

    return res.status(201).json(
      record
    );
  } catch (err: any) {
    return res.status(400).json({
      error:
        err?.message ||
        'Failed to save attendance.',
    });
  }
}