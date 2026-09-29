/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { Header } from './components/common/Header.tsx';
import { Sidebar } from './components/common/Sidebar.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { ClientsView } from './components/admin/ClientsView.tsx';
import { TasksView } from './components/admin/TasksView.tsx';
import { EmployeesView } from './components/admin/EmployeesView.tsx';
import { AttendanceView } from './components/admin/AttendanceView.tsx';
import { ReportsView } from './components/admin/ReportsView.tsx';
import { SettingsView } from './components/admin/SettingsView.tsx';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard.tsx';
import { EmployeeProfileView } from './components/employee/EmployeeProfileView.tsx';
import { ShieldAlert } from 'lucide-react';

// function OfficeSystem() {
//   const { user, loading, isAdmin, isEmployee } = useAuth();
//   const [adminTab, setAdminTab] = useState<string>('dashboard');
//   const [employeeTab, setEmployeeTab] = useState<string>('attendance');

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
//         <div className="flex flex-col items-center gap-3">
//           <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
//           <span className="text-xs font-mono text-slate-400">Loading Office System...</span>
//         </div>
//       </div>
//     );
//   }

//   // Common Login Page if not authenticated
//   if (!user) {
//     return <LoginPage />;
//   }

//   const currentTab = isAdmin ? adminTab : employeeTab;
//   const onSelectTab = (tab: string) => {
//     if (isAdmin) {
//       setAdminTab(tab);
//     } else {
//       // Prevent employee from navigating to admin tabs
//       const allowedEmployeeTabs = ['attendance', 'tasks', 'profile'];
//       if (allowedEmployeeTabs.includes(tab)) {
//         setEmployeeTab(tab);
//       }
//     }
//   };

//   return (
//     <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
//       {/* 3-zone Header Contract */}
//       <Header currentTab={currentTab} />

//       {/* Main Single Page Workspace */}
//       <div className="flex-1 flex overflow-hidden">
//         {/* Role-tailored Sidebar */}
//         <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} />

//         {/* Dynamic Content Viewport */}
//         <main className="flex-1 overflow-y-auto">
//           {isAdmin ? (
//             <>
//               {adminTab === 'dashboard' && <AdminDashboard onNavigate={setAdminTab} />}
//               {adminTab === 'clients' && <ClientsView />}
//               {adminTab === 'tasks' && <TasksView />}
//               {adminTab === 'employees' && <EmployeesView />}
//               {adminTab === 'attendance' && <AttendanceView />}
//               {adminTab === 'reports' && <ReportsView />}
//               {adminTab === 'settings' && <SettingsView />}
//             </>
//           ) : (
//             <>
//               {/* Employee Restricted Views */}
//               {employeeTab === 'attendance' && <EmployeeDashboard currentTab={employeeTab} />}
//               {employeeTab === 'tasks' && <EmployeeDashboard currentTab={employeeTab} />}
//               {employeeTab === 'profile' && <EmployeeProfileView />}
//             </>
//           )}
//         </main>
//       </div>
//     </div>
//   );
// }

function OfficeSystem() {
const { user, loading, isAdmin } = useAuth();
  const [adminTab, setAdminTab] = useState<string>('dashboard');
  const [employeeTab, setEmployeeTab] = useState<string>('attendance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">
            Loading Office System...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const currentTab = isAdmin ? adminTab : employeeTab;

  const onSelectTab = (tab: string) => {
    if (isAdmin) {
      setAdminTab(tab);
    } else {
      const allowedEmployeeTabs = ['attendance', 'tasks', 'profile'];

      if (allowedEmployeeTabs.includes(tab)) {
        setEmployeeTab(tab);
      }
    }

    // Close mobile menu after selecting a page
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 overflow-x-hidden">
      <Header
        currentTab={currentTab}
        onMenuClick={() => setMobileMenuOpen(true)}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          {isAdmin ? (
            <>
              {adminTab === 'dashboard' && (
                <AdminDashboard onNavigate={setAdminTab} />
              )}
              {adminTab === 'clients' && <ClientsView />}
              {adminTab === 'tasks' && <TasksView />}
              {adminTab === 'employees' && <EmployeesView />}
              {adminTab === 'attendance' && <AttendanceView />}
              {adminTab === 'reports' && <ReportsView />}
              {adminTab === 'settings' && <SettingsView />}
            </>
          ) : (
            <>
              {employeeTab === 'attendance' && (
                <EmployeeDashboard currentTab={employeeTab} />
              )}
              {employeeTab === 'tasks' && (
                <EmployeeDashboard currentTab={employeeTab} />
              )}
              {employeeTab === 'profile' && <EmployeeProfileView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OfficeSystem />
    </AuthProvider>
  );
}
