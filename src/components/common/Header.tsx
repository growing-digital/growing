import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { LogOut, UserCircle2, ArrowLeftRight, Shield, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
}

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const { user, logout, switchUser, isAdmin } = useAuth();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Overview Dashboard';
      case 'clients':
        return 'Client Master Records';
      case 'tasks':
        return isAdmin ? 'Weekly Task Board' : 'My Assigned Tasks';
      case 'employees':
        return 'Employee Directory & Permissions';
      case 'attendance':
        return isAdmin ? 'Staff Attendance Register' : "Today's Attendance & Clock";
      case 'reports':
        return 'Operational Reports';
      case 'settings':
        return 'System Configuration';
      case 'profile':
        return 'Employee Profile';
      default:
        return 'Workspace';
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Zone 1 & 2: Single element Brand & Context Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="font-bold text-slate-900 tracking-tight text-sm uppercase">
          Office Management System
        </span>
        <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
        <span className="text-xs font-medium text-slate-600 hidden sm:inline">
          {getTabLabel(currentTab)}
        </span>
      </div>

      {/* Zone 3: Actions & Role Info */}
      <div className="flex items-center gap-3">
        {/* Role perspective indicator */}
        {!isAdmin && (
          <button
            type="button"
            onClick={() => switchUser('admin@company.com')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            title="Switch back to Admin"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Switch to Admin</span>
          </button>
        )}

        {/* User Profile display */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-300"
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserCircle2 className="w-7 h-7 text-slate-400" />
          )}
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.name}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
              <span className={isAdmin ? 'text-indigo-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                {isAdmin ? 'ADMIN' : 'EMPLOYEE'}
              </span>
              <span>·</span>
              <span>{user?.department?.split('&')[0]}</span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={() => logout()}
          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
          title="Sign out of system"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
