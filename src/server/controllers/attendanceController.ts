import { Response } from 'express';
import { Attendance } from '../models/Attendance.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

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
    const diff = parseTime(checkOut) - parseTime(checkIn);
    if (diff <= 0) return '8h 00m';
    return `${Math.floor(diff / 60)}h ${(diff % 60).toString().padStart(2, '0')}m`;
  } catch {
    return '8h 00m';
  }
}

export async function getTodayAttendance(req: AuthenticatedRequest, res: Response) {
  const today = (req.query.date as string) || '2026-09-28';
  const isAdmin = req.user?.role === 'admin';

  try {
    if (isMongoConnected()) {
      if (isAdmin) {
        const records = await Attendance.find({ date: today }).sort({ checkIn: 1 });
        return res.json(
          records.map((r) => ({
            id: r._id.toString(),
            employeeId: r.employeeId.toString(),
            employeeName: r.employeeName,
            employeeEmail: r.employeeEmail,
            department: r.department,
            date: r.date,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            status: r.status,
            note: r.note,
            hoursWorked: r.hoursWorked,
          }))
        );
      } else {
        const rec = await Attendance.findOne({ employeeId: req.user?.id, date: today });
        return res.json(
          rec
            ? {
                id: rec._id.toString(),
                employeeId: rec.employeeId.toString(),
                employeeName: rec.employeeName,
                employeeEmail: rec.employeeEmail,
                department: rec.department,
                date: rec.date,
                checkIn: rec.checkIn,
                checkOut: rec.checkOut,
                status: rec.status,
                note: rec.note,
                hoursWorked: rec.hoursWorked,
              }
            : null
        );
      }
    }
  } catch (err: any) {
    console.warn('[Attendance] Mongo getTodayAttendance error:', err.message);
  }

  if (isAdmin) {
    return res.json(db.getAttendance({ date: today }));
  } else {
    return res.json(db.getTodayRecord(req.user!.id, today) || null);
  }
}

export async function getAttendance(req: AuthenticatedRequest, res: Response) {
  const { date, employeeId, status, search } = req.query as Record<string, string>;
  const isAdmin = req.user?.role === 'admin';

  try {
    if (isMongoConnected()) {
      const query: any = {};
      if (!isAdmin) {
        query.employeeId = req.user?.id;
      } else if (employeeId) {
        query.employeeId = employeeId;
      }

      if (date) query.date = date;
      if (status && status !== 'all') query.status = status;
      if (search) {
        query.$or = [
          { employeeName: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
          { note: { $regex: search, $options: 'i' } },
        ];
      }

      const records = await Attendance.find(query).sort({ date: -1 });
      return res.json(
        records.map((r) => ({
          id: r._id.toString(),
          employeeId: r.employeeId.toString(),
          employeeName: r.employeeName,
          employeeEmail: r.employeeEmail,
          department: r.department,
          date: r.date,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          status: r.status,
          note: r.note,
          hoursWorked: r.hoursWorked,
        }))
      );
    }
  } catch (err: any) {
    console.warn('[Attendance] Mongo query error:', err.message);
  }

  if (isAdmin) {
    return res.json(db.getAttendance({ date, employeeId, status, search }));
  } else {
    return res.json(db.getAttendance({ employeeId: req.user!.id, date, status, search }));
  }
}

export async function checkIn(req: AuthenticatedRequest, res: Response) {
  const { date, time, note } = req.body;
  const today = date || '2026-09-28';
  const checkInTime = time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  let status: 'Present' | 'Late' = 'Present';
  if (checkInTime.includes('AM')) {
    const [h, m] = checkInTime.replace(' AM', '').split(':').map(Number);
    if (h > 9 || (h === 9 && m > 15)) status = 'Late';
  }

  try {
    if (isMongoConnected()) {
      const user = req.user!;
      const record = await Attendance.findOneAndUpdate(
        { employeeId: user.id, date: today },
        {
          $setOnInsert: {
            employeeId: user.id,
            employeeName: user.name,
            employeeEmail: user.email,
            department: user.department,
            date: today,
          },
          $set: {
            checkIn: checkInTime,
            status,
            note: note || '',
            hoursWorked: 'Active',
          },
        },
        { upsert: true, new: true }
      );

      return res.json({
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
      });
    }
  } catch (err: any) {
    console.warn('[Attendance] Mongo checkIn error, using local fallback:', err.message);
  }

  try {
    const record = db.markCheckIn(req.user!.id, today, checkInTime, note);
    return res.json(record);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function checkOut(req: AuthenticatedRequest, res: Response) {
  const { date, time, note } = req.body;
  const today = date || '2026-09-28';
  const checkOutTime = time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  try {
    if (isMongoConnected()) {
      const record = await Attendance.findOne({ employeeId: req.user!.id, date: today });
      if (!record || !record.checkIn) {
        return res.status(400).json({ error: 'Check in record required before check out' });
      }

      record.checkOut = checkOutTime;
      record.hoursWorked = calculateWorkDuration(record.checkIn, checkOutTime);
      if (note) record.note = record.note ? `${record.note} · ${note}` : note;
      await record.save();

      return res.json({
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
      });
    }
  } catch (err: any) {
    console.warn('[Attendance] Mongo checkOut error, using local fallback:', err.message);
  }

  try {
    const record = db.markCheckOut(req.user!.id, today, checkOutTime, note);
    return res.json(record);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function addManualAttendance(req: AuthenticatedRequest, res: Response) {
  const { employeeId, date, checkIn, checkOut, status, note, hoursWorked } = req.body;

  if (!employeeId || !date || !status) {
    return res.status(400).json({ error: 'Employee, date, and status are required.' });
  }

  const user = db.getUserById(employeeId);
  if (!user) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  try {
    if (isMongoConnected()) {
      const created = await Attendance.create({
        employeeId,
        employeeName: user.name,
        employeeEmail: user.email,
        department: user.department,
        date,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        status,
        note: note || '',
        hoursWorked: hoursWorked || (checkIn && checkOut ? calculateWorkDuration(checkIn, checkOut) : '0h 00m'),
      });

      return res.status(201).json({
        id: created._id.toString(),
        employeeId: created.employeeId.toString(),
        employeeName: created.employeeName,
        employeeEmail: created.employeeEmail,
        department: created.department,
        date: created.date,
        checkIn: created.checkIn,
        checkOut: created.checkOut,
        status: created.status,
        note: created.note,
        hoursWorked: created.hoursWorked,
      });
    }
  } catch (err: any) {
    console.warn('[Attendance] Mongo manual attendance error:', err.message);
  }

  const record = db.saveManualAttendance({
    employeeId,
    employeeName: user.name,
    employeeEmail: user.email,
    department: user.department,
    date,
    checkIn: checkIn || null,
    checkOut: checkOut || null,
    status,
    note: note || '',
    hoursWorked: hoursWorked || (checkIn && checkOut ? '8h 00m' : '0h 00m'),
  });

  return res.status(201).json(record);
}
