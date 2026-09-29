import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserCheck, Mail, Phone, Calendar, Building, ShieldCheck, UserCircle2 } from 'lucide-react';

export const EmployeeProfileView: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-indigo-600" />
          <span>My Profile & Employee Credentials</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Account details and organizational placement.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-100">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100 shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserCircle2 className="w-16 h-16 text-slate-400" />
          )}

          <div className="text-center sm:text-left">
            <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
            <div className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{user?.status} Staff Member</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
            <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>Department</span>
            </div>
            <div className="font-semibold text-slate-900">{user?.department}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
            <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Contact Phone</span>
            </div>
            <div className="font-mono font-semibold text-slate-900">{user?.phone || '+91 98410 00000'}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
            <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Joining Date</span>
            </div>
            <div className="font-mono font-semibold text-slate-900">{user?.joiningDate}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
            <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>System Role</span>
            </div>
            <div className="font-semibold text-indigo-700 capitalize">{user?.role}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
