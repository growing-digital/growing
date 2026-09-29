// import React, { useState } from 'react';
// import { useAuth } from '../../context/AuthContext.tsx';
// // import { LogOut, UserCircle2, ArrowLeftRight, Shield, User as UserIcon } from 'lucide-react';
// import {
//   LogOut,
//   UserCircle2,
//   Shield,
//   Menu,
// } from 'lucide-react';


// // interface HeaderProps {
// //   currentTab: string;
// // }

// interface HeaderProps {
//   currentTab: string;
//   onMenuClick: () => void;
// }



// export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
//   const { user, logout, switchUser, isAdmin } = useAuth();
//   const [showSwitchMenu, setShowSwitchMenu] = useState(false);

//   const getTabLabel = (tab: string) => {
//     switch (tab) {
//       case 'dashboard':
//         return 'Overview Dashboard';
//       case 'clients':
//         return 'Client Master Records';
//       case 'tasks':
//         return isAdmin ? 'Weekly Task Board' : 'My Assigned Tasks';
//       case 'employees':
//         return 'Employee Directory & Permissions';
//       case 'attendance':
//         return isAdmin ? 'Staff Attendance Register' : "Today's Attendance & Clock";
//       case 'reports':
//         return 'Operational Reports';
//       case 'settings':
//         return 'System Configuration';
//       case 'profile':
//         return 'Employee Profile';
//       default:
//         return 'Workspace';
//     }
//   };

// //   return (
// //     <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
// //       {/* Zone 1 & 2: Single element Brand & Context Breadcrumb */}
// //       <div className="flex items-center gap-3">
// //         <span className="font-bold text-slate-900 tracking-tight text-sm uppercase">
// //           Office Management System
// //         </span>
// //         <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
// //         <span className="text-xs font-medium text-slate-600 hidden sm:inline">
// //           {getTabLabel(currentTab)}
// //         </span>
// //       </div>

// //       {/* Zone 3: Actions & Role Info */}
// //       <div className="flex items-center gap-3">
// //         {/* Role perspective indicator */}
// //         {!isAdmin && (
// //           <button
// //             type="button"
// //             onClick={() => switchUser('admin@company.com')}
// //             className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
// //             title="Switch back to Admin"
// //           >
// //             <Shield className="w-3.5 h-3.5 text-indigo-600" />
// //             <span>Switch to Admin</span>
// //           </button>
// //         )}

// //         {/* User Profile display */}
// //         <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
// //           {user?.avatarUrl ? (
// //             <img
// //               src={user.avatarUrl}
// //               alt={user.name}
// //               className="w-7 h-7 rounded-full object-cover border border-slate-300"
// //               referrerPolicy="no-referrer"
// //             />
// //           ) : (
// //             <UserCircle2 className="w-7 h-7 text-slate-400" />
// //           )}
// //           <div className="hidden lg:block text-left">
// //             <div className="text-xs font-semibold text-slate-900 leading-tight">
// //               {user?.name}
// //             </div>
// //             <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
// //               <span className={isAdmin ? 'text-indigo-600 font-semibold' : 'text-emerald-600 font-semibold'}>
// //                 {isAdmin ? 'ADMIN' : 'EMPLOYEE'}
// //               </span>
// //               <span>·</span>
// //               <span>{user?.department?.split('&')[0]}</span>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Logout */}
// //         <button
// //           type="button"
// //           onClick={() => logout()}
// //           className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
// //           title="Sign out of system"
// //         >
// //           <LogOut className="w-4 h-4" />
// //         </button>
// //       </div>
// //     </header>
// //   );

// return (
//   <header className="h-14 shrink-0 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40">
//     <div className="flex items-center gap-2 min-w-0">
//       {/* Mobile menu */}
//       <button
//         type="button"
//         onClick={onMenuClick}
//         className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
//         aria-label="Open navigation"
//       >
//         <Menu className="w-5 h-5" />
//       </button>

//       <div className="flex items-center gap-3 min-w-0">
//         <span className="font-bold text-slate-900 tracking-tight text-sm uppercase truncate">
//           <span className="hidden sm:inline">
//             Office Management System
//           </span>
//           <span className="sm:hidden">OMS</span>
//         </span>

//         <span
//           className="text-slate-300 hidden sm:inline"
//           aria-hidden="true"
//         >
//           /
//         </span>

//         <span className="text-xs font-medium text-slate-600 hidden sm:inline truncate">
//           {getTabLabel(currentTab)}
//         </span>
//       </div>
//     </div>

//     <div className="flex items-center gap-2 sm:gap-3 shrink-0">
//       {!isAdmin && (
//         <button
//           type="button"
//           onClick={() => switchUser('admin@company.com')}
//           className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
//           title="Switch back to Admin"
//         >
//           <Shield className="w-3.5 h-3.5 text-indigo-600" />
//           <span className="hidden sm:inline">Switch to Admin</span>
//         </button>
//       )}

//       <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
//         {user?.avatarUrl ? (
//           <img
//             src={user.avatarUrl}
//             alt={user.name}
//             className="w-7 h-7 rounded-full object-cover border border-slate-300"
//             referrerPolicy="no-referrer"
//           />
//         ) : (
//           <UserCircle2 className="w-7 h-7 text-slate-400" />
//         )}

//         <div className="hidden lg:block text-left">
//           <div className="text-xs font-semibold text-slate-900 leading-tight">
//             {user?.name}
//           </div>

//           <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
//             <span
//               className={
//                 isAdmin
//                   ? 'text-indigo-600 font-semibold'
//                   : 'text-emerald-600 font-semibold'
//               }
//             >
//               {isAdmin ? 'ADMIN' : 'EMPLOYEE'}
//             </span>
//             <span>·</span>
//             <span>{user?.department?.split('&')[0]}</span>
//           </div>
//         </div>
//       </div>

//       <button
//         type="button"
//         onClick={() => logout()}
//         className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
//         title="Sign out of system"
//       >
//         <LogOut className="w-4 h-4" />
//       </button>
//     </div>
//   </header>
// );

// };


import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LogOut,
  UserCircle2,
  Shield,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onMenuClick,
}) => {
  const { user, logout, switchUser, isAdmin } = useAuth();

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
        return isAdmin
          ? 'Staff Attendance Register'
          : "Today's Attendance & Clock";

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
    <header className="h-14 shrink-0 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* =====================================================
          LEFT SIDE
          ===================================================== */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand + Current Page */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Desktop Brand */}
          <span className="hidden sm:block font-bold text-slate-900 tracking-tight text-sm uppercase truncate">
            Office Management System
          </span>

          {/* Mobile Brand */}
          <span className="sm:hidden font-bold text-slate-900 tracking-tight text-sm uppercase">
            OMS
          </span>

          {/* Separator */}
          <span
            className="hidden sm:inline text-slate-300"
            aria-hidden="true"
          >
            /
          </span>

          {/* Current Page */}
          <span className="hidden sm:block text-xs font-medium text-slate-600 truncate max-w-[280px]">
            {getTabLabel(currentTab)}
          </span>
        </div>
      </div>

      {/* =====================================================
          RIGHT SIDE
          ===================================================== */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Employee -> Admin Switch */}
        {!isAdmin && (
          <button
            type="button"
            onClick={() => switchUser('admin@company.com')}
            className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-md transition-colors"
            title="Switch back to Admin"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />

            <span className="hidden sm:inline">
              Switch to Admin
            </span>
          </button>
        )}

        {/* =====================================================
            USER PROFILE
            ===================================================== */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-2 border-l border-slate-200">
          {/* Avatar */}
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-300 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserCircle2 className="w-7 h-7 text-slate-400 shrink-0" />
          )}

          {/* User Details - desktop/tablet */}
          <div className="hidden md:block text-left min-w-0">
            <div className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
              {user?.name}
            </div>

            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
              <span
                className={
                  isAdmin
                    ? 'text-indigo-600 font-semibold'
                    : 'text-emerald-600 font-semibold'
                }
              >
                {isAdmin ? 'ADMIN' : 'EMPLOYEE'}
              </span>

              <span>·</span>

              <span className="truncate max-w-[100px]">
                {user?.department?.split('&')[0]}
              </span>
            </div>
          </div>
        </div>

        {/* =====================================================
            LOGOUT
            ===================================================== */}
        <button
          type="button"
          onClick={() => logout()}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md text-slate-500 hover:text-red-600 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
          title="Sign out of system"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};