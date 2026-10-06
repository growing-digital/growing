import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import type { AttendanceRecord, Task, TaskStatus } from '../../types.ts';

import {
  Clock,
  CheckCircle2,
  CheckSquare,
  ShieldCheck,
  FileCheck2,
  History,
} from 'lucide-react';

interface EmployeeDashboardProps {
  currentTab: string;
}

/**
 * Returns the browser's current local date as YYYY-MM-DD.
 *
 * Example:
 * 2026-10-01
 */
const getLocalDateKey = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Converts YYYY-MM-DD into a readable date.
 *
 * Example:
 * 2026-10-01
 * -> October 1, 2026
 */
const formatDisplayDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Employee dashboard
 */
export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  currentTab,
}) => {
  const { user } = useAuth();

  // =========================================================
  // CURRENT DATE
  // =========================================================
  const [todayDate, setTodayDate] = useState<string>(getLocalDateKey());

  /**
   * Keep the date updated while the employee portal stays open.
   *
   * This means when the calendar changes at midnight,
   * the dashboard automatically moves to the new day.
   */
  useEffect(() => {
    const timer = window.setInterval(() => {
      const latestDate = getLocalDateKey();

      setTodayDate((previousDate) => {
        return previousDate === latestDate ? previousDate : latestDate;
      });
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // =========================================================
  // STATE
  // =========================================================
  const [todayRecord, setTodayRecord] =
    useState<AttendanceRecord | null>(null);

  const [myTasks, setMyTasks] = useState<Task[]>([]);

  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceRecord[]
  >([]);

  const [loading, setLoading] = useState(true);

  // Check In / Check Out form state
  const [customNote, setCustomNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Task note modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskNote, setTaskNote] = useState('');

  // =========================================================
  // LOAD EMPLOYEE DATA
  // =========================================================
  const loadEmployeeData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [todayAtt, tasks, history] = await Promise.all([
        /**
         * SECURITY:
         * Do not send the employee's device date.
         * The backend decides the current attendance date
         * using the application timezone (Asia/Kolkata).
         */
        api.getTodayAttendance(),

        api.getTasks(),

        /**
         * Employee history:
         * backend should return only this employee's records.
         */
        api.getAttendance({
          employeeId: user.id,
        }),
      ]);

      setTodayRecord(todayAtt || null);

      /**
       * When an attendance record exists, use the date returned
       * by the backend as the authoritative display date.
       */
      if (todayAtt && !Array.isArray(todayAtt) && todayAtt.date) {
        setTodayDate(todayAtt.date);
      }

      setMyTasks(tasks || []);
      setAttendanceHistory(history || []);
    } catch (err: any) {
      console.warn(
        'Employee data fetch status:',
        err?.message || err
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reload whenever:
   * - employee changes
   * - calendar day changes
   */
  useEffect(() => {
    loadEmployeeData();
  }, [user?.id, todayDate]);

  // =========================================================
  // CHECK IN
  // =========================================================
  const handleCheckIn = async () => {
    if (!user) {
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    try {
      /**
       * SECURITY:
       * Never read the employee's device clock here.
       *
       * The backend creates the attendance date/time using
       * its own server-side clock in Asia/Kolkata.
       */
      const record = await api.checkIn(
        customNote || 'Present at workstation'
      );

      setTodayRecord(record);

      /**
       * Sync the UI to the date returned by the server.
       */
      if (record.date) {
        setTodayDate(record.date);
      }

      setCustomNote('');

      setFeedback(
        `Attendance logged by server at ${record.checkIn}. Status: ${record.status}`
      );

      /**
       * Reload latest attendance/history data.
       */
      await loadEmployeeData();

      window.setTimeout(() => {
        setFeedback(null);
      }, 5000);
    } catch (err: any) {
      alert(err?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // CHECK OUT
  // =========================================================
  const handleCheckOut = async () => {
    if (!user) {
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    try {
      /**
       * SECURITY:
       * Never read the employee's device clock here.
       *
       * The backend creates the checkout time using
       * its own server-side clock in Asia/Kolkata.
       */
      const record = await api.checkOut(
        customNote || 'Shift completed'
      );

      setTodayRecord(record);

      /**
       * Sync the UI to the date returned by the server.
       */
      if (record.date) {
        setTodayDate(record.date);
      }

      setCustomNote('');

      setFeedback(
        `Shift checked out by server at ${record.checkOut || '—'}. Total duration: ${
          record.hoursWorked || '—'
        }`
      );

      await loadEmployeeData();

      window.setTimeout(() => {
        setFeedback(null);
      }, 5000);
    } catch (err: any) {
      alert(err?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // TASK STATUS
  // =========================================================
  const handleUpdateTaskStatus = async (
    task: Task,
    nextStatus: TaskStatus
  ) => {
    try {
      await api.updateTaskStatus(task.id, nextStatus);

      await loadEmployeeData();
    } catch (err: any) {
      alert(err?.message || 'Failed to update task status');
    }
  };

  // =========================================================
  // TASK NOTES
  // =========================================================
  const handleSaveTaskNotes = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!selectedTask) {
      return;
    }

    try {
      await api.updateTaskStatus(
        selectedTask.id,
        selectedTask.status,
        taskNote
      );

      setSelectedTask(null);
      setTaskNote('');

      await loadEmployeeData();
    } catch (err: any) {
      alert(err?.message || 'Failed to update task notes');
    }
  };

  // =========================================================
  // ATTENDANCE STATUS
  // =========================================================
  const isCheckedIn = Boolean(todayRecord?.checkIn);

  const isCheckedOut = Boolean(todayRecord?.checkOut);

  const todayDisplayDate = formatDisplayDate(todayDate);

  // =========================================================
  // STATUS BADGE
  // =========================================================
  const getAttendanceStatusElement = () => {
    if (!todayRecord) {
      return (
        <span className="text-slate-400">
          NOT MARKED
        </span>
      );
    }

    if (todayRecord.status === 'Present') {
      return (
        <span className="text-emerald-600">
          PRESENT
        </span>
      );
    }

    if (todayRecord.status === 'Late') {
      return (
        <span className="text-amber-600">
          LATE
        </span>
      );
    }

    if (todayRecord.status === 'Absent') {
      return (
        <span className="text-red-600">
          ABSENT
        </span>
      );
    }

    if (todayRecord.status === 'On Leave') {
      return (
        <span className="text-blue-600">
          ON LEAVE
        </span>
      );
    }

    return (
      <span className="text-slate-500">
        {todayRecord.status}
      </span>
    );
  };

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* =====================================================
          WELCOME
          ===================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.name || 'Employee'}
          </h1>

          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
            <span>
              {user?.department}
            </span>

            <span aria-hidden="true">
              ·
            </span>

            <span className="font-mono text-slate-700 break-all">
              Emp ID: {user?.id}
            </span>
          </div>
        </div>

        {/* Dynamic shift status */}
        <div className="flex items-center gap-2 shrink-0">
          {!todayRecord && (
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Not Checked In</span>
            </div>
          )}

          {todayRecord && !todayRecord.checkOut && (
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Shift Active</span>
            </div>
          )}

          {todayRecord && todayRecord.checkOut && (
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Shift Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          FEEDBACK
          ===================================================== */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />

          <span>{feedback}</span>
        </div>
      )}

      {/* =====================================================
          TODAY'S ATTENDANCE
          ===================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-xl mx-auto text-center">
        {/* Heading badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />

          <span>
            Employee Attendance Terminal
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
          Today's Attendance
        </h2>

        {/* Dynamic current date */}
        <div className="text-xs text-slate-500 font-mono mb-2">
          Date: {todayDisplayDate}
        </div>

        <div className="text-[11px] text-slate-500 mb-6">
          Office Hours: <span className="font-semibold text-slate-700">10:00 AM – 5:00 PM</span>
          <span className="mx-1">·</span>
          Late after <span className="font-semibold text-amber-600">10:30 AM</span>
          <span className="mx-1">·</span>
          Server time controls attendance
        </div>

        {/* =================================================
            ATTENDANCE STATE BOX
            ================================================= */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-left space-y-3">
          {/* Check In */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-3 border-b border-slate-200/80">
            <span className="text-xs font-medium text-slate-600">
              Login / Check-in Time:
            </span>

            <span className="font-mono font-bold text-sm text-slate-900">
              {todayRecord?.checkIn || '— : —'}
            </span>
          </div>

          {/* Check Out */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-3 border-b border-slate-200/80">
            <span className="text-xs font-medium text-slate-600">
              Check-out Time:
            </span>

            <span className="font-mono font-bold text-sm text-slate-900">
              {todayRecord?.checkOut ||
                (isCheckedIn
                  ? 'Active at Work'
                  : '— : —')}
            </span>
          </div>

          {/* Hours */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-3 border-b border-slate-200/80">
            <span className="text-xs font-medium text-slate-600">
              Calculated Hours:
            </span>

            <span className="font-mono font-bold text-sm text-slate-900">
              {todayRecord?.hoursWorked ||
                (isCheckedIn
                  ? 'In Progress'
                  : '0h 00m')}
            </span>
          </div>

          {/* Status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-xs font-medium text-slate-600">
              Attendance Status:
            </span>

            <span className="text-xs font-bold uppercase tracking-wider">
              {getAttendanceStatusElement()}
            </span>
          </div>

          {/* Note */}
          {todayRecord?.note && (
            <div className="pt-2 text-xs text-slate-500 italic break-words">
              Note: "{todayRecord.note}"
            </div>
          )}
        </div>

        {/* =================================================
            OPTIONAL NOTE
            ================================================= */}
        <div className="mb-5 text-left">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Optional Attendance Note (Work location / Meeting note)
          </label>

          <input
            type="text"
            value={customNote}
            onChange={(e) =>
              setCustomNote(e.target.value)
            }
            disabled={actionLoading || isCheckedOut}
            placeholder="e.g. In-office regular shift / Client presentation scheduled"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* =================================================
            ATTENDANCE ACTION
            ================================================= */}
        <div className="space-y-2">
          {/* NOT CHECKED IN */}
          {!isCheckedIn && (
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={actionLoading || loading}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />

              <span>
                {actionLoading
                  ? 'PROCESSING...'
                  : '[ MARK ATTENDANCE ]'}
              </span>
            </button>
          )}

          {/* CHECKED IN BUT NOT OUT */}
          {isCheckedIn && !isCheckedOut && (
            <button
              type="button"
              onClick={handleCheckOut}
              disabled={actionLoading || loading}
              className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Clock className="w-5 h-5 text-amber-400" />

              <span>
                {actionLoading
                  ? 'PROCESSING...'
                  : '[ CHECK OUT (END SHIFT) ]'}
              </span>
            </button>
          )}

          {/* CHECKED OUT */}
          {isCheckedIn && isCheckedOut && (
            <div className="py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />

              <span>
                Full Shift Recorded for Today ({todayDisplayDate})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          ASSIGNED TASKS
          ===================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-600" />

              <span>
                My Assigned Deliverables & Tasks ({myTasks.length})
              </span>
            </h2>

            <p className="text-[11px] text-slate-500 mt-0.5">
              Tasks dispatched by administrator. Review Definition of Done and update your progress.
            </p>
          </div>
        </div>

        {myTasks.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No active tasks currently assigned to you.
          </div>
        ) : (
          <div className="space-y-3">
            {myTasks.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-sm break-words">
                      {t.title}
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">
                        {t.clientName}
                      </span>

                      <span aria-hidden="true">
                        ·
                      </span>

                      <span className="text-slate-500 font-mono">
                        Due: {t.dueDate}
                      </span>

                      <span aria-hidden="true">
                        ·
                      </span>

                      <span
                        className={
                          t.priority === 'Urgent'
                            ? 'text-red-600 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {t.priority} Priority
                      </span>
                    </div>

                    {/* Definition of Done */}
                    <div className="pt-1">
                      <div className="text-[11px] font-semibold text-slate-700">
                        Definition of Done:
                      </div>

                      <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200/80 mt-0.5 break-words">
                        {t.definitionOfDone || 'None specified'}
                      </div>
                    </div>

                    {/* Dependency */}
                    {t.dependency && (
                      <div className="text-[11px] text-slate-500 break-words">
                        <strong className="text-slate-700">
                          Dependency:
                        </strong>{' '}
                        {t.dependency}
                      </div>
                    )}

                    {/* Completion notes */}
                    {t.completionNotes && (
                      <div className="text-[11px] text-slate-600 italic break-words">
                        <strong className="text-slate-700 not-italic">
                          Update Note:
                        </strong>{' '}
                        "{t.completionNotes}"
                      </div>
                    )}
                  </div>

                  {/* STATUS ACTIONS */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Pending */}
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskStatus(
                            t,
                            'Pending'
                          )
                        }
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          t.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Pending
                      </button>

                      {/* In Progress */}
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskStatus(
                            t,
                            'In Progress'
                          )
                        }
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          t.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800 font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        In Progress
                      </button>

                      {/* Completed */}
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskStatus(
                            t,
                            'Completed'
                          )
                        }
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          t.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Completed
                      </button>
                    </div>

                    {/* Progress note */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTask(t);
                        setTaskNote(
                          t.completionNotes || ''
                        );
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />

                      <span>
                        Add Progress Note
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          ATTENDANCE HISTORY
          ===================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />

            <span>
              My Attendance History
            </span>
          </h2>

          <span className="text-xs text-slate-400 font-mono">
            Personal Log
          </span>
        </div>

        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3 font-semibold font-mono">
                  Date
                </th>

                <th className="py-2.5 px-3 font-semibold font-mono">
                  Check In
                </th>

                <th className="py-2.5 px-3 font-semibold font-mono">
                  Check Out
                </th>

                <th className="py-2.5 px-3 font-semibold font-mono">
                  Duration
                </th>

                <th className="py-2.5 px-3 font-semibold">
                  Status
                </th>

                <th className="py-2.5 px-3 font-semibold">
                  Note
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {attendanceHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 px-3 text-center text-slate-400"
                  >
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                attendanceHistory.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/60"
                  >
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                      {rec.date}
                    </td>

                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                      {rec.checkIn || '—'}
                    </td>

                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                      {rec.checkOut || '—'}
                    </td>

                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                      {rec.hoursWorked || '—'}
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`font-semibold ${
                          rec.status === 'Present'
                            ? 'text-emerald-600'
                            : rec.status === 'Late'
                              ? 'text-amber-600'
                              : rec.status === 'Absent'
                                ? 'text-red-600'
                                : 'text-blue-600'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-500 max-w-[260px]">
                      <span className="block truncate">
                        {rec.note || '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          SECURITY NOTICE
          ===================================================== */}
      <div className="p-4 bg-slate-900 rounded-xl text-slate-300 text-xs flex items-start gap-3 border border-slate-800">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />

        <div>
          <div className="font-bold text-white mb-0.5">
            Role-Based Permission Boundary Enforced
          </div>

          <p className="text-slate-400 text-[11px] leading-relaxed">
            Your account is authenticated with standard Employee credentials.
            Client commercial contracts, retainer fee balances, employee
            administrative records, and task creation controls are restricted
            and shielded on the backend.
          </p>

          <p className="text-slate-400 text-[11px] leading-relaxed mt-2">
            Attendance check-in/check-out uses the backend server clock in
            India Standard Time. Changing the date or time on this device
            does not change the recorded attendance time.
          </p>
        </div>
      </div>

      {/* =====================================================
          PROGRESS NOTE MODAL
          ===================================================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-300 max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Add Task Progress Note
            </h3>

            <p className="text-xs text-slate-500 mb-3 break-words">
              {selectedTask.title}
            </p>

            <form
              onSubmit={handleSaveTaskNotes}
              className="space-y-3"
            >
              <textarea
                rows={3}
                required
                value={taskNote}
                onChange={(e) =>
                  setTaskNote(e.target.value)
                }
                placeholder="e.g. Completed initial design carousels; shared proof with lead."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask(null);
                    setTaskNote('');
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};