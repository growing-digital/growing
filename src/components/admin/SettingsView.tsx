import React, { useState } from 'react';
import { api } from '../../services/api.ts';
import { Settings as SettingsIcon, RotateCcw, Building, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!window.confirm('Reset all databases (Users, Clients, Tasks, Attendance) to initial demo state?')) return;
    setResetting(true);
    try {
      await api.resetDemoData();
      setFeedback('Database successfully restored to original seed records.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to reset demo data');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-indigo-600" />
          <span>System Settings & Operational Policies</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          General corporate configuration, shift rules, and system maintenance.
        </p>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Office Policies */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building className="w-4 h-4 text-slate-600" />
          <span>Office Hours & Attendance Rules</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-slate-500 text-[11px]">Daily Shift Hours</div>
            <div className="font-semibold text-slate-900 mt-0.5">09:00 AM – 06:00 PM</div>
            <div className="text-[10px] text-slate-400 mt-1">9.0 hours daily duration (incl. lunch)</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-slate-500 text-[11px]">Grace Period & Cutoff</div>
            <div className="font-semibold text-amber-600 mt-0.5">09:15 AM</div>
            <div className="text-[10px] text-slate-400 mt-1">Check-ins recorded after 09:15 AM marked as "Late"</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-slate-500 text-[11px]">Working Days</div>
            <div className="font-semibold text-slate-900 mt-0.5">Monday – Friday</div>
            <div className="text-[10px] text-slate-400 mt-1">Saturday on-call for client SLA emergencies</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-slate-500 text-[11px]">Standard SEU Load Base</div>
            <div className="font-semibold text-slate-900 mt-0.5">40.0 hrs / month</div>
            <div className="text-[10px] text-slate-400 mt-1">Standard retainer allocation per tier</div>
          </div>
        </div>
      </div>

      {/* Role Enforcement Architecture */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Security & Role Enforcement Architecture</span>
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Access control is strictly validated server-side on Express endpoints. Employee sessions attempting to access client records (<code className="font-mono text-indigo-600">/api/clients</code>), billing logs, employee salaries, or administrative settings receive an immediate <strong className="text-red-600">403 Forbidden</strong> response with no data leaked.
        </p>
      </div>

      {/* Database Reset */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Reset System Database</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Clears all registered clients, dispatched tasks, and attendance registers back to a clean slate.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 font-medium text-xs rounded-lg transition-colors border border-slate-200 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{resetting ? 'Resetting...' : 'Reset Database'}</span>
        </button>
      </div>
    </div>
  );
};
