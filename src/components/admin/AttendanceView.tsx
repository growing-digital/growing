import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { AttendanceRecord, User, AttendanceStatus } from '../../types.ts';
import {
  Clock,
  Search,
  Download,
  Printer,
  Plus,
  X,
  CheckCircle2,
  Calendar,
  Filter,
} from 'lucide-react';

export const AttendanceView: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDate, setFilterDate] = useState('2026-09-28');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  // Manual Attendance modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualData, setManualData] = useState({
    employeeId: '',
    date: '2026-09-28',
    checkIn: '09:00 AM',
    checkOut: '06:00 PM',
    status: 'Present' as AttendanceStatus,
    note: '',
  });

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [filterDate, filterEmployee, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attData, empData] = await Promise.all([
        api.getAttendance({
          date: filterDate || undefined,
          employeeId: filterEmployee === 'all' ? undefined : filterEmployee,
          status: filterStatus === 'all' ? undefined : filterStatus,
          search: search || undefined,
        }),
        api.getEmployees(),
      ]);
      setAttendance(attData);
      setEmployees(empData);
      if (empData.length > 0 && !manualData.employeeId) {
        setManualData((prev) => ({ ...prev, employeeId: empData[0].id }));
      }
    } catch (err) {
      console.error('Error loading attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addManualAttendance(manualData);
      setFeedbackMsg('Attendance record adjusted successfully.');
      setShowManualModal(false);
      await loadData();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to record attendance');
    }
  };

  const exportCSV = () => {
    const headers = ['Employee Name', 'Department', 'Date', 'Check In', 'Check Out', 'Hours Worked', 'Status', 'Notes'];
    const rows = attendance.map((a) => [
      `"${a.employeeName}"`,
      `"${a.department}"`,
      `"${a.date}"`,
      `"${a.checkIn || '—'}"`,
      `"${a.checkOut || '—'}"`,
      `"${a.hoursWorked || '—'}"`,
      `"${a.status}"`,
      `"${a.note || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Office_Attendance_Register_${filterDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Summary counts
  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const lateCount = attendance.filter((a) => a.status === 'Late').length;
  const absentCount = attendance.filter((a) => a.status === 'Absent').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>8. Staff Attendance Register</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin oversight for daily check-in times, departure stamps, working durations, and attendance audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar (Matching User Specification) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Select Date [ Date ▼ ]
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Employee Filter [ Employee ▼ ]
            </label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Status Filter [ Status ▼ ]
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Search Notes / Staff [ Search ]
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                placeholder="Search..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Date presets:</span>
            <button
              type="button"
              onClick={() => setFilterDate('2026-09-28')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                filterDate === '2026-09-28' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Today (28 Sep)
            </button>
            <button
              type="button"
              onClick={() => setFilterDate('2026-09-27')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                filterDate === '2026-09-27' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Yesterday (27 Sep)
            </button>
            <button
              type="button"
              onClick={() => setFilterDate('')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                filterDate === '' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Records
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
            <span>Present: <strong className="text-emerald-600">{presentCount}</strong></span>
            <span>Late: <strong className="text-amber-600">{lateCount}</strong></span>
            <span>Absent: <strong className="text-red-600">{absentCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Attendance Table (Exact Table Format in Prompt Section 8) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold font-mono">Date</th>
                <th className="py-3 px-4 font-semibold font-mono text-right">Check In</th>
                <th className="py-3 px-4 font-semibold font-mono text-right">Check Out</th>
                <th className="py-3 px-4 font-semibold font-mono">Duration</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Attendance Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No attendance records found for this filter criteria.
                  </td>
                </tr>
              ) : (
                attendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{rec.employeeName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{rec.department}</div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {rec.date}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-800">
                      {rec.checkIn || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-800">
                      {rec.checkOut || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                      {rec.hoursWorked || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {rec.status === 'Present' && (
                        <span className="font-semibold text-emerald-600">Present</span>
                      )}
                      {rec.status === 'Late' && (
                        <span className="font-semibold text-amber-600">Late</span>
                      )}
                      {rec.status === 'Absent' && (
                        <span className="font-semibold text-red-600">Absent</span>
                      )}
                      {rec.status === 'On Leave' && (
                        <span className="font-semibold text-blue-600">On Leave</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {rec.note || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Attendance Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-300 max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Manual Attendance Adjustment</h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Employee *
                </label>
                <select
                  required
                  value={manualData.employeeId}
                  onChange={(e) => setManualData({ ...manualData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={manualData.date}
                  onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Check In Time
                  </label>
                  <input
                    type="text"
                    value={manualData.checkIn}
                    onChange={(e) => setManualData({ ...manualData, checkIn: e.target.value })}
                    placeholder="09:10 AM"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Check Out Time
                  </label>
                  <input
                    type="text"
                    value={manualData.checkOut}
                    onChange={(e) => setManualData({ ...manualData, checkOut: e.target.value })}
                    placeholder="06:05 PM"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Status *
                </label>
                <select
                  value={manualData.status}
                  onChange={(e) => setManualData({ ...manualData, status: e.target.value as AttendanceStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Adjustment Reason / Note
                </label>
                <input
                  type="text"
                  value={manualData.note}
                  onChange={(e) => setManualData({ ...manualData, note: e.target.value })}
                  placeholder="e.g. Approved medical leave or biometric malfunction"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
