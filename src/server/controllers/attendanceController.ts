// import { Response } from 'express';
// import { Attendance } from '../models/Attendance.ts';
// import { db } from '../db.ts';
// import { isMongoConnected } from '../db/mongodb.ts';
// import { AuthenticatedRequest } from '../middleware/auth.ts';

// function calculateWorkDuration(checkIn: string, checkOut: string): string {
//   try {
//     const parseTime = (t: string) => {
//       const isPM = t.includes('PM');
//       const clean = t.replace(/(AM|PM|\s)/g, '');
//       const [h, m] = clean.split(':').map(Number);
//       let hour = h;
//       if (isPM && hour !== 12) hour += 12;
//       if (!isPM && hour === 12) hour = 0;
//       return hour * 60 + m;
//     };
//     const diff = parseTime(checkOut) - parseTime(checkIn);
//     if (diff <= 0) return '8h 00m';
//     return `${Math.floor(diff / 60)}h ${(diff % 60).toString().padStart(2, '0')}m`;
//   } catch {
//     return '8h 00m';
//   }
// }

// export async function getTodayAttendance(req: AuthenticatedRequest, res: Response) {
//   const today = (req.query.date as string) || '2026-09-28';
//   const isAdmin = req.user?.role === 'admin';

//   try {
//     if (isMongoConnected()) {
//       if (isAdmin) {
//         const records = await Attendance.find({ date: today }).sort({ checkIn: 1 });
//         return res.json(
//           records.map((r) => ({
//             id: r._id.toString(),
//             employeeId: r.employeeId.toString(),
//             employeeName: r.employeeName,
//             employeeEmail: r.employeeEmail,
//             department: r.department,
//             date: r.date,
//             checkIn: r.checkIn,
//             checkOut: r.checkOut,
//             status: r.status,
//             note: r.note,
//             hoursWorked: r.hoursWorked,
//           }))
//         );
//       } else {
//         const rec = await Attendance.findOne({ employeeId: req.user?.id, date: today });
//         return res.json(
//           rec
//             ? {
//                 id: rec._id.toString(),
//                 employeeId: rec.employeeId.toString(),
//                 employeeName: rec.employeeName,
//                 employeeEmail: rec.employeeEmail,
//                 department: rec.department,
//                 date: rec.date,
//                 checkIn: rec.checkIn,
//                 checkOut: rec.checkOut,
//                 status: rec.status,
//                 note: rec.note,
//                 hoursWorked: rec.hoursWorked,
//               }
//             : null
//         );
//       }
//     }
//   } catch (err: any) {
//     console.warn('[Attendance] Mongo getTodayAttendance error:', err.message);
//   }

//   if (isAdmin) {
//     return res.json(db.getAttendance({ date: today }));
//   } else {
//     return res.json(db.getTodayRecord(req.user!.id, today) || null);
//   }
// }

// export async function getAttendance(req: AuthenticatedRequest, res: Response) {
//   const { date, employeeId, status, search } = req.query as Record<string, string>;
//   const isAdmin = req.user?.role === 'admin';

//   try {
//     if (isMongoConnected()) {
//       const query: any = {};
//       if (!isAdmin) {
//         query.employeeId = req.user?.id;
//       } else if (employeeId) {
//         query.employeeId = employeeId;
//       }

//       if (date) query.date = date;
//       if (status && status !== 'all') query.status = status;
//       if (search) {
//         query.$or = [
//           { employeeName: { $regex: search, $options: 'i' } },
//           { department: { $regex: search, $options: 'i' } },
//           { note: { $regex: search, $options: 'i' } },
//         ];
//       }

//       const records = await Attendance.find(query).sort({ date: -1 });
//       return res.json(
//         records.map((r) => ({
//           id: r._id.toString(),
//           employeeId: r.employeeId.toString(),
//           employeeName: r.employeeName,
//           employeeEmail: r.employeeEmail,
//           department: r.department,
//           date: r.date,
//           checkIn: r.checkIn,
//           checkOut: r.checkOut,
//           status: r.status,
//           note: r.note,
//           hoursWorked: r.hoursWorked,
//         }))
//       );
//     }
//   } catch (err: any) {
//     console.warn('[Attendance] Mongo query error:', err.message);
//   }

//   if (isAdmin) {
//     return res.json(db.getAttendance({ date, employeeId, status, search }));
//   } else {
//     return res.json(db.getAttendance({ employeeId: req.user!.id, date, status, search }));
//   }
// }

// export async function checkIn(req: AuthenticatedRequest, res: Response) {
//   const { date, time, note } = req.body;
//   const today = date || '2026-09-28';
//   const checkInTime = time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

//   let status: 'Present' | 'Late' = 'Present';
//   if (checkInTime.includes('AM')) {
//     const [h, m] = checkInTime.replace(' AM', '').split(':').map(Number);
//     if (h > 9 || (h === 9 && m > 15)) status = 'Late';
//   }

//   try {
//     if (isMongoConnected()) {
//       const user = req.user!;
//       const record = await Attendance.findOneAndUpdate(
//         { employeeId: user.id, date: today },
//         {
//           $setOnInsert: {
//             employeeId: user.id,
//             employeeName: user.name,
//             employeeEmail: user.email,
//             department: user.department,
//             date: today,
//           },
//           $set: {
//             checkIn: checkInTime,
//             status,
//             note: note || '',
//             hoursWorked: 'Active',
//           },
//         },
//         { upsert: true, new: true }
//       );

//       return res.json({
//         id: record._id.toString(),
//         employeeId: record.employeeId.toString(),
//         employeeName: record.employeeName,
//         employeeEmail: record.employeeEmail,
//         department: record.department,
//         date: record.date,
//         checkIn: record.checkIn,
//         checkOut: record.checkOut,
//         status: record.status,
//         note: record.note,
//         hoursWorked: record.hoursWorked,
//       });
//     }
//   } catch (err: any) {
//     console.warn('[Attendance] Mongo checkIn error, using local fallback:', err.message);
//   }

//   try {
//     const record = db.markCheckIn(req.user!.id, today, checkInTime, note);
//     return res.json(record);
//   } catch (err: any) {
//     return res.status(400).json({ error: err.message });
//   }
// }

// export async function checkOut(req: AuthenticatedRequest, res: Response) {
//   const { date, time, note } = req.body;
//   const today = date || '2026-09-28';
//   const checkOutTime = time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

//   try {
//     if (isMongoConnected()) {
//       const record = await Attendance.findOne({ employeeId: req.user!.id, date: today });
//       if (!record || !record.checkIn) {
//         return res.status(400).json({ error: 'Check in record required before check out' });
//       }

//       record.checkOut = checkOutTime;
//       record.hoursWorked = calculateWorkDuration(record.checkIn, checkOutTime);
//       if (note) record.note = record.note ? `${record.note} · ${note}` : note;
//       await record.save();

//       return res.json({
//         id: record._id.toString(),
//         employeeId: record.employeeId.toString(),
//         employeeName: record.employeeName,
//         employeeEmail: record.employeeEmail,
//         department: record.department,
//         date: record.date,
//         checkIn: record.checkIn,
//         checkOut: record.checkOut,
//         status: record.status,
//         note: record.note,
//         hoursWorked: record.hoursWorked,
//       });
//     }
//   } catch (err: any) {
//     console.warn('[Attendance] Mongo checkOut error, using local fallback:', err.message);
//   }

//   try {
//     const record = db.markCheckOut(req.user!.id, today, checkOutTime, note);
//     return res.json(record);
//   } catch (err: any) {
//     return res.status(400).json({ error: err.message });
//   }
// }

// export async function addManualAttendance(req: AuthenticatedRequest, res: Response) {
//   const { employeeId, date, checkIn, checkOut, status, note, hoursWorked } = req.body;

//   if (!employeeId || !date || !status) {
//     return res.status(400).json({ error: 'Employee, date, and status are required.' });
//   }

//   const user = db.getUserById(employeeId);
//   if (!user) {
//     return res.status(404).json({ error: 'Employee not found.' });
//   }

//   try {
//     if (isMongoConnected()) {
//       const created = await Attendance.create({
//         employeeId,
//         employeeName: user.name,
//         employeeEmail: user.email,
//         department: user.department,
//         date,
//         checkIn: checkIn || null,
//         checkOut: checkOut || null,
//         status,
//         note: note || '',
//         hoursWorked: hoursWorked || (checkIn && checkOut ? calculateWorkDuration(checkIn, checkOut) : '0h 00m'),
//       });

//       return res.status(201).json({
//         id: created._id.toString(),
//         employeeId: created.employeeId.toString(),
//         employeeName: created.employeeName,
//         employeeEmail: created.employeeEmail,
//         department: created.department,
//         date: created.date,
//         checkIn: created.checkIn,
//         checkOut: created.checkOut,
//         status: created.status,
//         note: created.note,
//         hoursWorked: created.hoursWorked,
//       });
//     }
//   } catch (err: any) {
//     console.warn('[Attendance] Mongo manual attendance error:', err.message);
//   }

//   const record = db.saveManualAttendance({
//     employeeId,
//     employeeName: user.name,
//     employeeEmail: user.email,
//     department: user.department,
//     date,
//     checkIn: checkIn || null,
//     checkOut: checkOut || null,
//     status,
//     note: note || '',
//     hoursWorked: hoursWorked || (checkIn && checkOut ? '8h 00m' : '0h 00m'),
//   });

//   return res.status(201).json(record);
// }


import type { Response } from 'express';
import { Attendance } from '../models/Attendance.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

/**
 * ============================================================
 * CURRENT SERVER DATE
 * ============================================================
 *
 * Returns:
 * YYYY-MM-DD
 *
 * Example:
 * 2026-10-01
 */
function getServerDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * ============================================================
 * CONVERT MONGOOSE ATTENDANCE DOCUMENT
 * ============================================================
 */
function mapAttendanceRecord(record: any) {
  return {
    id: record._id.toString(),
    employeeId: record.employeeId.toString(),
    employeeName: record.employeeName,
    employeeEmail: record.employeeEmail,
    department: record.department,
    date: record.date,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    status: record.status,
    note: record.note,
    hoursWorked: record.hoursWorked,
  };
}

/**
 * ============================================================
 * CALCULATE WORK DURATION
 * ============================================================
 *
 * Example:
 * 09:00 AM -> 06:00 PM
 * = 9h 00m
 */
function calculateWorkDuration(
  checkIn: string,
  checkOut: string
): string {
  try {
    const parseTime = (time: string): number => {
      const normalized = time.trim().toUpperCase();

      const isPM = normalized.includes('PM');
      const isAM = normalized.includes('AM');

      const clean = normalized.replace(
        /(AM|PM|\s)/g,
        ''
      );

      const [hourPart, minutePart] = clean
        .split(':')
        .map(Number);

      let hour = hourPart;
      const minute = minutePart || 0;

      if (Number.isNaN(hour) || Number.isNaN(minute)) {
        throw new Error('Invalid time');
      }

      if (isPM && hour !== 12) {
        hour += 12;
      }

      if (isAM && hour === 12) {
        hour = 0;
      }

      return hour * 60 + minute;
    };

    const startMinutes = parseTime(checkIn);
    const endMinutes = parseTime(checkOut);

    let diff = endMinutes - startMinutes;

    /**
     * Handles overnight shifts.
     *
     * Example:
     * 10:00 PM -> 02:00 AM
     */
    if (diff < 0) {
      diff += 24 * 60;
    }

    if (diff <= 0) {
      return '0h 00m';
    }

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    return `${hours}h ${minutes
      .toString()
      .padStart(2, '0')}m`;
  } catch {
    return '0h 00m';
  }
}

/**
 * ============================================================
 * GET TODAY'S ATTENDANCE
 * ============================================================
 *
 * Employee:
 * returns only their attendance for the requested day.
 *
 * Admin:
 * returns all employee attendance records for that day.
 *
 * Frontend normally sends:
 * ?date=2026-10-01
 *
 * If no date is sent, backend uses current date.
 */
export async function getTodayAttendance(
  req: AuthenticatedRequest,
  res: Response
) {
  const requestedDate =
    typeof req.query.date === 'string'
      ? req.query.date
      : '';

  const today =
    requestedDate || getServerDate();

  const isAdmin = req.user?.role === 'admin';

  try {
    if (isMongoConnected()) {
      // ------------------------------------------------------
      // ADMIN
      // ------------------------------------------------------
      if (isAdmin) {
        const records = await Attendance.find({
          date: today,
        }).sort({
          checkIn: 1,
          employeeName: 1,
        });

        return res.json(
          records.map(mapAttendanceRecord)
        );
      }

      // ------------------------------------------------------
      // EMPLOYEE
      // ------------------------------------------------------
      const employeeId = req.user?.id;

      if (!employeeId) {
        return res.status(401).json({
          error: 'Authenticated employee ID is missing.',
        });
      }

      const record = await Attendance.findOne({
        employeeId,
        date: today,
      });

      return res.json(
        record
          ? mapAttendanceRecord(record)
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
  // LOCAL DEVELOPMENT FALLBACK
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
      error: 'Failed to load today attendance.',
    });
  }
}

/**
 * ============================================================
 * GET ATTENDANCE HISTORY / RECORDS
 * ============================================================
 *
 * Employee:
 * only their own records.
 *
 * Admin:
 * can filter by employee, date, status and search.
 */
export async function getAttendance(
  req: AuthenticatedRequest,
  res: Response
) {
  const {
    date,
    employeeId,
    status,
    search,
  } = req.query as Record<string, string>;

  const isAdmin = req.user?.role === 'admin';

  try {
    if (isMongoConnected()) {
      const query: Record<string, any> = {};

      // ------------------------------------------------------
      // SECURITY:
      // Employees can NEVER request another employee's data.
      // ------------------------------------------------------
      if (!isAdmin) {
        query.employeeId = req.user?.id;
      } else if (employeeId) {
        query.employeeId = employeeId;
      }

      if (date) {
        query.date = date;
      }

      if (status && status !== 'all') {
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

      const records = await Attendance.find(
        query
      ).sort({
        date: -1,
        checkIn: -1,
      });

      return res.json(
        records.map(mapAttendanceRecord)
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
        employeeId: req.user!.id,
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
      error: 'Failed to load attendance records.',
    });
  }
}

/**
 * ============================================================
 * CHECK IN
 * ============================================================
 *
 * Creates or updates exactly one record for:
 *
 * employeeId + date
 *
 * Example:
 *
 * employeeId: ABC
 * date: 2026-10-01
 *
 * This ensures October 1 is separate from September 30.
 */
export async function checkIn(
  req: AuthenticatedRequest,
  res: Response
) {
  const {
    date,
    time,
    note,
  } = req.body || {};

  /**
   * Frontend normally sends the date.
   *
   * If it doesn't, backend automatically uses
   * the current server date.
   */
  const attendanceDate =
    typeof date === 'string' && date.trim()
      ? date.trim()
      : getServerDate();

  const checkInTime =
    typeof time === 'string' && time.trim()
      ? time.trim()
      : new Date().toLocaleTimeString(
          'en-US',
          {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }
        );

  // ----------------------------------------------------------
  // PRESENT / LATE
  // ----------------------------------------------------------
  let status: 'Present' | 'Late' = 'Present';

  try {
    const upperTime = checkInTime
      .trim()
      .toUpperCase();

    if (upperTime.includes('AM')) {
      const clean = upperTime.replace(
        ' AM',
        ''
      );

      const [hour, minute] = clean
        .split(':')
        .map(Number);

      if (
        hour > 9 ||
        (hour === 9 && minute > 15)
      ) {
        status = 'Late';
      }
    }
  } catch {
    status = 'Present';
  }

  try {
    if (isMongoConnected()) {
      const user = req.user;

      if (!user?.id) {
        return res.status(401).json({
          error: 'Authenticated employee is missing.',
        });
      }

      /**
       * IMPORTANT:
       *
       * employeeId + date is the unique daily attendance key.
       *
       * Because the Attendance model has:
       *
       * { employeeId: 1, date: 1 } unique index
       *
       * there can only be ONE attendance record
       * for the employee on a particular date.
       */
      const record =
        await Attendance.findOneAndUpdate(
          {
            employeeId: user.id,
            date: attendanceDate,
          },
          {
            $setOnInsert: {
              employeeId: user.id,
              employeeName: user.name,
              employeeEmail: user.email,
              department: user.department,
              date: attendanceDate,
              checkOut: null,
            },

            $set: {
              checkIn: checkInTime,
              status,
              note:
                typeof note === 'string'
                  ? note.trim()
                  : '',
              hoursWorked: 'Active',
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
          }
        );

      if (!record) {
        return res.status(500).json({
          error:
            'Unable to create attendance record.',
        });
      }

      return res.json(
        mapAttendanceRecord(record)
      );
    }
  } catch (err: any) {
    console.warn(
      '[Attendance] Mongo checkIn error, using local fallback:',
      err?.message || err
    );
  }

  // --------------------------------------------------------
  // LOCAL DEVELOPMENT FALLBACK
  // --------------------------------------------------------
  try {
    const record = db.markCheckIn(
      req.user!.id,
      attendanceDate,
      checkInTime,
      note
    );

    return res.json(record);
  } catch (err: any) {
    return res.status(400).json({
      error:
        err?.message ||
        'Check-in failed.',
    });
  }
}

/**
 * ============================================================
 * CHECK OUT
 * ============================================================
 */
export async function checkOut(
  req: AuthenticatedRequest,
  res: Response
) {
  const {
    date,
    time,
    note,
  } = req.body || {};

  /**
   * Uses the date supplied by frontend.
   * Otherwise uses current date.
   */
  const attendanceDate =
    typeof date === 'string' && date.trim()
      ? date.trim()
      : getServerDate();

  const checkOutTime =
    typeof time === 'string' && time.trim()
      ? time.trim()
      : new Date().toLocaleTimeString(
          'en-US',
          {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }
        );

  try {
    if (isMongoConnected()) {
      const employeeId = req.user?.id;

      if (!employeeId) {
        return res.status(401).json({
          error: 'Authenticated employee is missing.',
        });
      }

      /**
       * Find today's record ONLY.
       */
      const record = await Attendance.findOne({
        employeeId,
        date: attendanceDate,
      });

      if (!record) {
        return res.status(400).json({
          error:
            'No attendance record exists for this date.',
        });
      }

      if (!record.checkIn) {
        return res.status(400).json({
          error:
            'Check in record required before check out.',
        });
      }

      /**
       * Prevent multiple checkout operations.
       */
      if (record.checkOut) {
        return res.status(400).json({
          error:
            'This attendance record has already been checked out.',
        });
      }

      record.checkOut = checkOutTime;

      record.hoursWorked =
        calculateWorkDuration(
          record.checkIn,
          checkOutTime
        );

      if (
        typeof note === 'string' &&
        note.trim()
      ) {
        record.note = record.note
          ? `${record.note} · ${note.trim()}`
          : note.trim();
      }

      await record.save();

      return res.json(
        mapAttendanceRecord(record)
      );
    }
  } catch (err: any) {
    console.warn(
      '[Attendance] Mongo checkOut error, using local fallback:',
      err?.message || err
    );
  }

  // --------------------------------------------------------
  // LOCAL DEVELOPMENT FALLBACK
  // --------------------------------------------------------
  try {
    const record = db.markCheckOut(
      req.user!.id,
      attendanceDate,
      checkOutTime,
      note
    );

    return res.json(record);
  } catch (err: any) {
    return res.status(400).json({
      error:
        err?.message ||
        'Check-out failed.',
    });
  }
}

/**
 * ============================================================
 * ADMIN MANUAL ATTENDANCE
 * ============================================================
 *
 * Allows an administrator to create an attendance record
 * for a specific employee and specific date.
 */
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
  } = req.body || {};

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

  const user = db.getUserById(employeeId);

  if (!user) {
    return res.status(404).json({
      error: 'Employee not found.',
    });
  }

  try {
    if (isMongoConnected()) {
      /**
       * Do not allow duplicate employee/day records.
       */
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

      const created =
        await Attendance.create({
          employeeId,
          employeeName: user.name,
          employeeEmail: user.email,
          department: user.department,
          date,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          status,
          note: note || '',
          hoursWorked:
            hoursWorked ||
            (
              checkIn &&
              checkOut
            )
              ? calculateWorkDuration(
                  checkIn,
                  checkOut
                )
              : '0h 00m',
        });

      return res.status(201).json(
        mapAttendanceRecord(created)
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
    const record =
      db.saveManualAttendance({
        employeeId,
        employeeName: user.name,
        employeeEmail: user.email,
        department: user.department,
        date,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        status,
        note: note || '',
        hoursWorked:
          hoursWorked ||
          (
            checkIn &&
            checkOut
          )
            ? calculateWorkDuration(
                checkIn,
                checkOut
              )
            : '0h 00m',
      });

    return res.status(201).json(record);
  } catch (err: any) {
    return res.status(400).json({
      error:
        err?.message ||
        'Failed to save attendance.',
    });
  }
}