import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Client, Task, AttendanceRecord, User } from '../../types.ts';
import { BarChart3, TrendingUp, Users, Clock, Briefcase, CheckCircle2 } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, t, a, e] = await Promise.all([
        api.getClients(),
        api.getTasks(),
        api.getAttendance(),
        api.getEmployees(),
      ]);
      setClients(c);
      setTasks(t);
      setAttendance(a);
      setEmployees(e);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalFee = clients.reduce((acc, curr) => acc + curr.monthlyFee, 0);
  const paidFee = clients.filter((c) => c.paymentStatus === 'Paid').reduce((acc, curr) => acc + curr.monthlyFee, 0);
  const pendingFee = totalFee - paidFee;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalAttendanceEntries = attendance.length;
  const onTimeCount = attendance.filter((a) => a.status === 'Present').length;
  const punctualityRate = totalAttendanceEntries > 0 ? Math.round((onTimeCount / totalAttendanceEntries) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <span>Operational Reports & Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Executive performance synthesis across revenue retainers, task throughput, and department attendance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 mb-1">Monthly Retainer Volume</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            ₹{totalFee.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
            <span className="text-emerald-600 font-semibold font-mono">₹{paidFee.toLocaleString('en-IN')} collected</span>
            <span>·</span>
            <span className="text-amber-600 font-mono">₹{pendingFee.toLocaleString('en-IN')} pending</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 mb-1">Task Completion Velocity</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {taskCompletionRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span className="font-mono">{completedTasks}</span> of <span className="font-mono">{totalTasks}</span> deliverables finalized
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 mb-1">Staff Punctuality Benchmark</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {punctualityRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Standard 09:15 AM check-in compliance across all departments
          </div>
        </div>
      </div>

      {/* Breakdown grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retainer by Client Tier */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Client Retainer Breakdown</h2>
          <div className="space-y-3 text-xs">
            {clients.map((c) => (
              <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{c.clientName}</div>
                  <div className="text-[11px] text-slate-500">
                    Tier: {c.packageTier} · Delivery Lead: {c.deliveryLead}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900">₹{c.monthlyFee.toLocaleString('en-IN')}</div>
                  <span className={`text-[10px] font-semibold ${c.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {c.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEU Load & Hours Allocation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 mb-3">SEU Load Allocation</h2>
          <div className="space-y-3 text-xs">
            {clients.map((c) => (
              <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{c.clientName}</div>
                  <div className="text-[11px] text-slate-500">Named Approver: {c.namedApprover}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-indigo-600">{c.seuLoad}</div>
                  <div className="text-[10px] text-slate-400">Committed Hours</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
