import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { AttendanceRecord, Task, TaskStatus } from '../../types.ts';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Send,
  FileCheck2,
  History,
} from 'lucide-react';

interface EmployeeDashboardProps {
  currentTab: string;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ currentTab }) => {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Check In / Check Out form state
  const [customNote, setCustomNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Task note modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskNote, setTaskNote] = useState('');

  // Fixed simulated current date for office demo
  const DEMO_DATE = '2026-09-28';

  useEffect(() => {
    loadEmployeeData();
  }, [user?.id]);

  const loadEmployeeData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [todayAtt, tasks, history] = await Promise.all([
        api.getTodayAttendance(DEMO_DATE),
        api.getTasks(),
        api.getAttendance({ employeeId: user.id }),
      ]);
      setTodayRecord(todayAtt || null);
      setMyTasks(tasks || []);
      setAttendanceHistory(history || []);
    } catch (err: any) {
      console.warn('Employee data fetch status:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const record = await api.checkIn(DEMO_DATE, timeStr, customNote || 'Present at workstation');
      setTodayRecord(record);
      setCustomNote('');
      setFeedback(`Attendance logged at ${timeStr}. Status: ${record.status}`);
      await loadEmployeeData();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const record = await api.checkOut(DEMO_DATE, timeStr, customNote || 'Shift completed');
      setTodayRecord(record);
      setCustomNote('');
      setFeedback(`Shift checked out at ${timeStr}. Total duration: ${record.hoursWorked}`);
      await loadEmployeeData();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (task: Task, nextStatus: TaskStatus) => {
    try {
      await api.updateTaskStatus(task.id, nextStatus);
      await loadEmployeeData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleSaveTaskNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      await api.updateTaskStatus(selectedTask.id, selectedTask.status, taskNote);
      setSelectedTask(null);
      setTaskNote('');
      await loadEmployeeData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task notes');
    }
  };

  const isCheckedIn = !!todayRecord?.checkIn;
  const isCheckedOut = !!todayRecord?.checkOut;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Welcome & Role Verification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.name || 'Employee'}
          </h1>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span>{user?.department}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-700">Emp ID: {user?.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Shift Active</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Feature: Today's Attendance Card (Matching Section 5 ASCII Blueprint) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>Employee Attendance Terminal</span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
          Today's Attendance
        </h2>
        <div className="text-xs text-slate-500 font-mono mb-6">
          Date: 28 September 2026
        </div>

        {/* Attendance State Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-left space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <span className="text-xs font-medium text-slate-600">Login / Check-in Time:</span>
            <span className="font-mono font-bold text-sm text-slate-900">
              {todayRecord?.checkIn || '— : —'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <span className="text-xs font-medium text-slate-600">Check-out Time:</span>
            <span className="font-mono font-bold text-sm text-slate-900">
              {todayRecord?.checkOut || (isCheckedIn ? 'Active at Work' : '— : —')}
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <span className="text-xs font-medium text-slate-600">Calculated Hours:</span>
            <span className="font-mono font-bold text-sm text-slate-900">
              {todayRecord?.hoursWorked || (isCheckedIn ? 'In Progress' : '0h 00m')}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Attendance Status:</span>
            <span className="text-xs font-bold uppercase tracking-wider">
              {todayRecord?.status === 'Present' && (
                <span className="text-emerald-600">PRESENT</span>
              )}
              {todayRecord?.status === 'Late' && (
                <span className="text-amber-600">LATE</span>
              )}
              {!todayRecord && (
                <span className="text-slate-400">NOT MARKED</span>
              )}
            </span>
          </div>

          {todayRecord?.note && (
            <div className="pt-2 text-xs text-slate-500 italic">
              Note: "{todayRecord.note}"
            </div>
          )}
        </div>

        {/* Optional note input */}
        <div className="mb-5 text-left">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Optional Attendance Note (Work location / Meeting note)
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. In-office regular shift / Client presentation scheduled"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Action Button: MARK ATTENDANCE */}
        <div className="space-y-2">
          {!isCheckedIn ? (
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>[ MARK ATTENDANCE ]</span>
            </button>
          ) : !isCheckedOut ? (
            <button
              type="button"
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Clock className="w-5 h-5 text-amber-400" />
              <span>[ CHECK OUT (END SHIFT) ]</span>
            </button>
          ) : (
            <div className="py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Full Shift Recorded for Today (28 Sep 2026)</span>
            </div>
          )}
        </div>
      </div>

      {/* Assigned Tasks Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              <span>My Assigned Deliverables & Tasks ({myTasks.length})</span>
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
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="font-bold text-slate-900 text-sm">{t.title}</div>
                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">{t.clientName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500 font-mono">Due: {t.dueDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className={t.priority === 'Urgent' ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                        {t.priority} Priority
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="text-[11px] font-semibold text-slate-700">Definition of Done:</div>
                      <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200/80 mt-0.5">
                        {t.definitionOfDone || 'None specified'}
                      </div>
                    </div>

                    {t.dependency && (
                      <div className="text-[11px] text-slate-500">
                        <strong className="text-slate-700">Dependency:</strong> {t.dependency}
                      </div>
                    )}

                    {t.completionNotes && (
                      <div className="text-[11px] text-slate-600 italic">
                        <strong className="text-slate-700 not-italic">Update Note:</strong> "{t.completionNotes}"
                      </div>
                    )}
                  </div>

                  {/* Status Toggle & Note button */}
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateTaskStatus(t, 'Pending')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          t.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTaskStatus(t, 'In Progress')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          t.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800 font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTaskStatus(t, 'Completed')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          t.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Completed
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTask(t);
                        setTaskNote(t.completionNotes || '');
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Add Progress Note</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance History Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <span>My Attendance History</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Personal Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3 font-semibold font-mono">Date</th>
                <th className="py-2.5 px-3 font-semibold font-mono">Check In</th>
                <th className="py-2.5 px-3 font-semibold font-mono">Check Out</th>
                <th className="py-2.5 px-3 font-semibold font-mono">Duration</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceHistory.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{rec.date}</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">{rec.checkIn || '—'}</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">{rec.checkOut || '—'}</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">{rec.hoursWorked || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`font-semibold ${rec.status === 'Present' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{rec.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Enforcement Statement (Section 6 Compliance) */}
      <div className="p-4 bg-slate-900 rounded-xl text-slate-300 text-xs flex items-start gap-3 border border-slate-800">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-white mb-0.5">Role-Based Permission Boundary Enforced</div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Your account is authenticated with standard Employee credentials. Client commercial contracts, retainer fee balances, employee administrative records, and task creation controls are restricted and shielded on the backend.
          </p>
        </div>
      </div>

      {/* Progress Note Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-300 max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Add Task Progress Note</h3>
            <p className="text-xs text-slate-500 mb-3">{selectedTask.title}</p>

            <form onSubmit={handleSaveTaskNotes} className="space-y-3">
              <textarea
                rows={3}
                required
                value={taskNote}
                onChange={(e) => setTaskNote(e.target.value)}
                placeholder="e.g. Completed initial design carousels; shared proof with lead."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
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
