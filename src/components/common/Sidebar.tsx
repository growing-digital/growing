import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Users,
  Clock,
  BarChart3,
  Settings,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, isAdmin } = useAuth();

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Briefcase },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const employeeNavItems = [
    { id: 'attendance', label: "Today's Attendance", icon: Clock },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'profile', label: 'My Profile', icon: UserCheck },
  ];

  const items = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <aside className="w-56 sm:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 select-none border-r border-slate-800">
      <div className="py-4">
        {/* Workspace Brand / Header */}
        <div className="px-5 mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {isAdmin ? 'ADMINISTRATOR PORTAL' : 'EMPLOYEE PORTAL'}
          </div>
          <div className="text-sm font-bold text-white tracking-tight mt-0.5">
            Office Workspace
          </div>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1 px-3">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Role permission info banner at bottom */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400">
        {isAdmin ? (
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-white font-semibold flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Full Admin Access
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Full control over clients, billing, task distribution, and employee attendance.
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-amber-300 font-semibold flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Restricted Staff Access
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Client contracts, fees & admin settings are protected and locked from view.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
