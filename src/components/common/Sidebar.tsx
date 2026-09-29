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
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  mobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onClose,
}) => {
  const { isAdmin } = useAuth();

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

  const handleSelect = (tab: string) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      {/* ==============================
          DESKTOP SIDEBAR
          ============================== */}
      <aside className="hidden lg:flex w-56 xl:w-64 bg-slate-900 text-slate-300 flex-col justify-between shrink-0 select-none border-r border-slate-800">
        <div className="py-4">
          <div className="px-5 mb-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {isAdmin ? 'ADMINISTRATOR PORTAL' : 'EMPLOYEE PORTAL'}
            </div>

            <div className="text-sm font-bold text-white tracking-tight mt-0.5">
              Office Workspace
            </div>
          </div>

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
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            {isAdmin ? (
              <>
                <div className="text-white font-semibold flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Full Admin Access
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed">
                  Full control over clients, billing, task distribution, and
                  employee attendance.
                </div>
              </>
            ) : (
              <>
                <div className="text-amber-300 font-semibold flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Restricted Staff Access
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed">
                  Client contracts, fees & admin settings are protected and
                  locked from view.
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ==============================
          MOBILE SIDEBAR
          ============================== */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Overlay */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60"
          />

          {/* Drawer */}
          <aside className="relative h-full w-72 max-w-[85vw] bg-slate-900 text-slate-300 shadow-2xl flex flex-col">
            <div className="h-14 shrink-0 px-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {isAdmin ? 'ADMINISTRATOR' : 'EMPLOYEE'}
                </div>

                <div className="text-sm font-bold text-white">
                  Office Workspace
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 leading-relaxed">
                {isAdmin
                  ? 'Full administrative access enabled.'
                  : 'Restricted employee access enabled.'}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};