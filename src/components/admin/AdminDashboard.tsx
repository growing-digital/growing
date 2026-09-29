import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Client, Task, AttendanceRecord, DashboardStats } from '../../types.ts';
import {
  Briefcase,
  CheckSquare,
  Users,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, attData, tasksData, clientsData] = await Promise.all([
        api.getDashboardStats('2026-09-28'),
        api.getTodayAttendance('2026-09-28'),
        api.getTasks(),
        api.getClients(),
      ]);
      setStats(statsData);
      setTodayAttendance(attData || []);
      setRecentTasks((tasksData || []).slice(0, 5));
      setClients(clientsData || []);
    } catch (err: any) {
      console.warn('Dashboard data fetch status:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Bar with Date & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.name || 'Admin'}
          </h1>
          <div className="text-xs text-slate-500 mt-0.5">
            Office Operations Overview · <span className="font-mono font-medium">Monday, 28 September 2026</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Create Task</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('clients')}
            className="px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Clients */}
        <div
          onClick={() => onNavigate('clients')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Clients</span>
            <Briefcase className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats?.totalClients ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
            <span>₹{((stats?.totalMonthlyRevenue ?? 0)).toLocaleString('en-IN')}</span>
            <span>/ mo retainer</span>
          </div>
        </div>

        {/* Tasks */}
        <div
          onClick={() => onNavigate('tasks')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Tasks</span>
            <CheckSquare className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats?.totalTasks ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-amber-600 font-mono tabular-nums">{stats?.inProgressTasks ?? 0} in progress</span>
            <span>·</span>
            <span className="font-mono tabular-nums">{stats?.pendingTasks ?? 0} pending</span>
          </div>
        </div>

        {/* Employees */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Employees</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats?.totalEmployees ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold font-mono tabular-nums">{stats?.activeEmployees ?? 0} active</span>
            <span>staff accounts</span>
          </div>
        </div>

        {/* Present Today */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Present Today</span>
            <Clock className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats?.presentToday ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-red-500 font-medium font-mono tabular-nums">{stats?.absentToday ?? 0} absent</span>
            <span>·</span>
            <span className="text-amber-500 font-mono tabular-nums">{stats?.lateToday ?? 0} late</span>
          </div>
        </div>
      </div>

      {/* Today's Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Today's Attendance</h2>
            <p className="text-[11px] text-slate-500 font-mono">Date: 28 September 2026</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
          >
            <span>Full Attendance Register</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Employee</th>
                <th className="py-2.5 px-4 font-semibold">Department</th>
                <th className="py-2.5 px-4 font-semibold font-mono">Login Time</th>
                <th className="py-2.5 px-4 font-semibold font-mono">Check Out</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todayAttendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No attendance logs recorded for today yet.
                  </td>
                </tr>
              ) : (
                todayAttendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {rec.employeeName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {rec.department}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {rec.checkIn || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {rec.checkOut || '—'}
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
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {rec.note || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Split section: Active Tasks & Client Retainers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Task Management Snapshot */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Weekly Task Management</h2>
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View All Tasks →
            </button>
          </div>

          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No tasks dispatched yet.
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('tasks')}
                    className="text-xs text-indigo-600 font-medium hover:underline"
                  >
                    + Create First Task
                  </button>
                </div>
              </div>
            ) : (
              recentTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900">{t.title}</div>
                    <div className="text-slate-500 flex items-center gap-2">
                      <span>{t.clientName}</span>
                      <span aria-hidden="true">·</span>
                      <span>Assigned: <strong className="text-slate-700 font-medium">{t.assignedToName}</strong></span>
                    </div>
                    {t.definitionOfDone && (
                      <div className="text-[11px] text-slate-400">
                        DoD: {t.definitionOfDone}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-semibold text-[11px] ${
                        t.status === 'Completed'
                          ? 'text-emerald-600'
                          : t.status === 'In Progress'
                          ? 'text-blue-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {t.status}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Due: {t.dueDate}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Client Master Highlights */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Retainer Status & SEU Load</h2>
            <button
              type="button"
              onClick={() => onNavigate('clients')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Client Master Record →
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {clients.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No client records registered yet.
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('clients')}
                    className="text-xs text-indigo-600 font-medium hover:underline"
                  >
                    + Add First Client
                  </button>
                </div>
              </div>
            ) : (
              clients.slice(0, 4).map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{c.clientName}</div>
                    <div className="text-slate-500 text-[11px]">
                      Lead: {c.deliveryLead || 'Unassigned'} · SEU: <span className="font-mono">{c.seuLoad}</span> · Approver: {c.namedApprover || '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">₹{c.monthlyFee.toLocaleString('en-IN')}</div>
                    <div className={`font-semibold text-[10px] ${c.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {c.paymentStatus}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
