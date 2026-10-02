import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import type {
  User,
  Role,
  UserStatus,
  Task,
  AttendanceRecord,
} from '../../types.ts';

import {
  Users,
  Plus,
  Search,
  Edit2,
  Key,
  Eye,
  X,
  CheckCircle2,
  Clock,
  Briefcase,
} from 'lucide-react';

// ====================================================
// DATE HELPER
// ====================================================

const getLocalDateKey = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    now.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// ====================================================
// COMPONENT
// ====================================================

export const EmployeesView: React.FC = () => {
  const [employees, setEmployees] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [filterDept, setFilterDept] =
    useState('all');

  const [filterStatus, setFilterStatus] =
    useState('all');

  // ==================================================
  // MODALS
  // ==================================================

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [editingEmployee, setEditingEmployee] =
    useState<User | null>(null);

  const [resettingUser, setResettingUser] =
    useState<User | null>(null);

  const [newPassword, setNewPassword] =
    useState('');

  const [viewingEmployee, setViewingEmployee] =
    useState<User | null>(null);

  const [empTasks, setEmpTasks] =
    useState<Task[]>([]);

  const [empAttendance, setEmpAttendance] =
    useState<AttendanceRecord[]>([]);

  const [feedbackMsg, setFeedbackMsg] =
    useState<string | null>(null);

  // ==================================================
  // FORM STATE
  // ==================================================

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    role: 'employee' as Role,
    department: 'Digital Marketing & Content',
    joiningDate: getLocalDateKey(),
    status: 'Active' as UserStatus,
  });

  // ==================================================
  // LOAD EMPLOYEES
  // ==================================================

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);

    try {
      const data = await api.getEmployees();

      setEmployees(data || []);
    } catch (err) {
      console.error(
        'Error loading employees:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // OPEN ADD MODAL
  // ==================================================

  const handleOpenAdd = () => {
    setEditingEmployee(null);

    setFormData({
      name: '',
      email: '',
      phone: '+91 ',
      username: '',
      password: '',
      role: 'employee',
      department:
        'Digital Marketing & Content',
      joiningDate: getLocalDateKey(),
      status: 'Active',
    });

    setShowAddModal(true);
  };

  // ==================================================
  // OPEN EDIT MODAL
  // ==================================================

  const handleOpenEdit = (u: User) => {
    setEditingEmployee(u);

    setFormData({
      name: u.name,
      email: u.email,
      phone: u.phone,
      username: u.username,
      password: '',
      role: u.role,
      department: u.department,
      joiningDate: u.joiningDate,
      status: u.status,
    });

    setShowAddModal(true);
  };

  // ==================================================
  // SAVE EMPLOYEE
  // ==================================================

  const handleSaveEmployee = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    // Password required when creating a new account
    if (
      !editingEmployee &&
      formData.password.trim().length < 6
    ) {
      alert(
        'Initial password must be at least 6 characters.'
      );
      return;
    }

    try {
      if (editingEmployee) {
        await api.updateEmployee(
          editingEmployee.id,
          formData
        );

        setFeedbackMsg(
          `Employee record for "${formData.name}" updated.`
        );
      } else {
        await api.createEmployee(formData);

        setFeedbackMsg(
          `New employee account created for "${formData.name}".`
        );
      }

      setShowAddModal(false);
      setEditingEmployee(null);

      await loadEmployees();

      setTimeout(() => {
        setFeedbackMsg(null);
      }, 4000);
    } catch (err: any) {
      alert(
        err?.message ||
          'Failed to save employee'
      );
    }
  };

  // ==================================================
  // TOGGLE EMPLOYEE STATUS
  // ==================================================

  const handleToggleStatus = async (
    user: User
  ) => {
    const nextStatus: UserStatus =
      user.status === 'Active'
        ? 'Disabled'
        : 'Active';

    try {
      await api.toggleEmployeeStatus(
        user.id,
        nextStatus
      );

      setFeedbackMsg(
        `Account for "${user.name}" is now ${nextStatus}.`
      );

      await loadEmployees();

      setTimeout(() => {
        setFeedbackMsg(null);
      }, 4000);
    } catch (err: any) {
      alert(
        err?.message ||
          'Failed to toggle status'
      );
    }
  };

  // ==================================================
  // RESET PASSWORD
  // ==================================================

  const handleResetPassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!resettingUser) {
      return;
    }

    if (newPassword.trim().length < 6) {
      alert(
        'New password must be at least 6 characters.'
      );
      return;
    }

    try {
      const res =
        await api.resetEmployeePassword(
          resettingUser.id,
          newPassword
        );

      setFeedbackMsg(res.message);

      setResettingUser(null);
      setNewPassword('');

      setTimeout(() => {
        setFeedbackMsg(null);
      }, 4000);
    } catch (err: any) {
      alert(
        err?.message ||
          'Failed to reset password'
      );
    }
  };

  // ==================================================
  // OPEN EMPLOYEE DETAILS
  // ==================================================

  const handleOpenDetail = async (
    emp: User
  ) => {
    setViewingEmployee(emp);

    try {
      const [allTasks, attList] =
        await Promise.all([
          api.getTasks(),
          api.getAttendance({
            employeeId: emp.id,
          }),
        ]);

      setEmpTasks(
        allTasks.filter(
          (task) =>
            task.assignedTo === emp.id
        )
      );

      setEmpAttendance(attList || []);
    } catch (err) {
      console.error(
        'Error fetching employee details:',
        err
      );
    }
  };

  // ==================================================
  // FILTER EMPLOYEES
  // ==================================================

  const filteredEmployees =
    employees.filter((e) => {
      const matchSearch =
        e.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        e.email
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        e.username
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        e.department
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchDept =
        filterDept === 'all' ||
        e.department === filterDept;

      const matchStatus =
        filterStatus === 'all' ||
        e.status === filterStatus;

      return (
        matchSearch &&
        matchDept &&
        matchStatus
      );
    });

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* ==================================================
          TITLE & ACTIONS
          ================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">

        <div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">

            <Users className="w-5 h-5 text-indigo-600" />

            <span>
              2. Employee Management
            </span>

          </h1>

          <p className="text-xs text-slate-500 mt-0.5">
            Admin directory, role permissions,
            account onboarding, credential resets,
            and activity oversight.
          </p>

        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Add Employee</span>
        </button>

      </div>

      {/* ==================================================
          FEEDBACK
          ================================================== */}

      {feedbackMsg && (

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">

          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />

          <span>{feedbackMsg}</span>

        </div>

      )}

      {/* ==================================================
          FILTER / SEARCH
          ================================================== */}

      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">

        <div className="relative flex-1 w-full">

          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search employee name, email, username, or department..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />

        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value)
            }
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">
              All Statuses
            </option>

            <option value="Active">
              Active
            </option>

            <option value="Disabled">
              Disabled
            </option>
          </select>

        </div>
      </div>

      {/* ==================================================
          EMPLOYEE TABLE
          ================================================== */}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs">

            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">

              <tr>

                <th className="py-3 px-4 font-semibold">
                  Employee
                </th>

                <th className="py-3 px-4 font-semibold font-mono">
                  Email / Username
                </th>

                <th className="py-3 px-4 font-semibold font-mono">
                  Phone
                </th>

                <th className="py-3 px-4 font-semibold">
                  Role
                </th>

                <th className="py-3 px-4 font-semibold">
                  Department
                </th>

                <th className="py-3 px-4 font-semibold font-mono">
                  Joining Date
                </th>

                <th className="py-3 px-4 font-semibold">
                  Status
                </th>

                <th className="py-3 px-4 font-semibold text-center">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {loading ? (

                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-slate-400"
                  >
                    Loading employees...
                  </td>
                </tr>

              ) : filteredEmployees.length === 0 ? (

                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-slate-400"
                  >
                    No employees found.
                  </td>
                </tr>

              ) : (

                filteredEmployees.map((emp) => (

                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >

                    {/* EMPLOYEE */}

                    <td className="py-3 px-4">

                      <div className="flex items-center gap-2.5">

                        {emp.avatarUrl ? (

                          <img
                            src={emp.avatarUrl}
                            alt={emp.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />

                        ) : (

                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {emp.name.charAt(0)}
                          </div>

                        )}

                        <div>

                          <div className="font-bold text-slate-900">
                            {emp.name}
                          </div>

                          <div className="text-[10px] text-slate-400 capitalize">
                            {emp.role}
                          </div>

                        </div>

                      </div>

                    </td>

                    {/* EMAIL / USERNAME */}

                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">

                      <div>
                        {emp.email}
                      </div>

                      <div className="text-[10px] text-slate-400">
                        @{emp.username}
                      </div>

                    </td>

                    {/* PHONE */}

                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                      {emp.phone || '—'}
                    </td>

                    {/* ROLE */}

                    <td className="py-3 px-4">

                      <span
                        className={`font-semibold ${
                          emp.role === 'admin'
                            ? 'text-indigo-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {emp.role === 'admin'
                          ? 'Administrator'
                          : 'Employee'}
                      </span>

                    </td>

                    {/* DEPARTMENT */}

                    <td className="py-3 px-4 text-slate-700">
                      {emp.department}
                    </td>

                    {/* JOINING DATE */}

                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                      {emp.joiningDate}
                    </td>

                    {/* STATUS */}

                    <td className="py-3 px-4">

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleStatus(emp)
                        }
                        className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
                        title="Click to toggle Active / Disabled status"
                      >

                        {emp.status === 'Active' ? (

                          <span className="font-semibold text-emerald-600">
                            Active
                          </span>

                        ) : (

                          <span className="font-semibold text-slate-400">
                            Disabled
                          </span>

                        )}

                      </button>

                    </td>

                    {/* ACTIONS */}

                    <td className="py-3 px-4 text-center">

                      <div className="flex items-center justify-center gap-1.5">

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenDetail(emp)
                          }
                          className="p-1 text-slate-500 hover:text-indigo-600 transition-colors"
                          title="View Attendance & Tasks"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenEdit(emp)
                          }
                          className="p-1 text-slate-500 hover:text-slate-900 transition-colors"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResettingUser(emp);
                            setNewPassword('');
                          }}
                          className="p-1 text-slate-500 hover:text-amber-600 transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ==================================================
          ADD / EDIT EMPLOYEE MODAL
          ================================================== */}

      {showAddModal && (

        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">

          <div className="bg-white rounded-xl border border-slate-300 max-w-lg w-full p-6 shadow-2xl my-8">

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">

              <h3 className="text-base font-bold text-slate-900">

                {editingEmployee
                  ? 'Edit Employee Details'
                  : 'Add Employee Account'}

              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowAddModal(false)
                }
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            <form
              onSubmit={handleSaveEmployee}
              className="mt-4 space-y-3.5 text-xs"
            >

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

                {/* NAME */}

                <div>

                  <label className="block font-medium text-slate-700 mb-1">
                    Employee Name *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g. Arun Kumar"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />

                </div>

                {/* EMAIL */}

                <div>

                  <label className="block font-medium text-slate-700 mb-1">
                    Email Address *
                  </label>

                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                      })
                    }
                    placeholder="arun@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />

                </div>

                {/* USERNAME */}

                <div>

                  <label className="block font-medium text-slate-700 mb-1">
                    Username *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value,
                      })
                    }
                    placeholder="arun"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />

                </div>

                {/* PHONE */}

                <div>

                  <label className="block font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>

                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value,
                      })
                    }
                    placeholder="+91 98410 12345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />

                </div>

                {/* INITIAL PASSWORD */}

                {!editingEmployee && (

                  <div>

                    <label className="block font-medium text-slate-700 mb-1">
                      Initial Password *
                    </label>

                    <input
                      type="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          password:
                            e.target.value,
                        })
                      }
                      placeholder="Enter a password"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                    />

                  </div>

                )}

                {/* ROLE */}

                <div>

                  <label className="block font-medium text-slate-700 mb-1">
                    Role *
                  </label>

                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as Role,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >

                    <option value="employee">
                      Employee
                    </option>

                    <option value="admin">
                      Administrator
                    </option>

                  </select>

                </div>

                {/* DEPARTMENT */}

                <div>

                  <label className="block font-medium text-slate-700 mb-1">
                    Department
                  </label>

                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        department:
                          e.target.value,
                      })
                    }
                    placeholder="Digital Marketing, Web Engineering, etc."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />

                </div>

                {/* JOINING DATE */}

                <div>

                  <label className="block font-medium text-slate-700 mb-1">
                    Joining Date
                  </label>

                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        joiningDate:
                          e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />

                </div>

                {/* STATUS */}

                <div>

                  <label className="block font-medium text-slate-700 mb-1">
                    Status
                  </label>

                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status:
                          e.target.value as UserStatus,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >

                    <option value="Active">
                      Active
                    </option>

                    <option value="Disabled">
                      Disabled
                    </option>

                  </select>

                </div>

              </div>

              {/* BUTTONS */}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">

                <button
                  type="button"
                  onClick={() =>
                    setShowAddModal(false)
                  }
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                >
                  {editingEmployee
                    ? 'Save Changes'
                    : 'Create Account'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ==================================================
          RESET PASSWORD MODAL
          ================================================== */}

      {resettingUser && (

        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">

          <div className="bg-white rounded-xl border border-slate-300 max-w-sm w-full p-6 shadow-2xl">

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Reset Password
            </h3>

            <p className="text-xs text-slate-500 mb-4">

              Set a new password for{' '}

              <strong className="text-slate-800">
                {resettingUser.name}
              </strong>

              {' '}
              ({resettingUser.email}).

            </p>

            <form
              onSubmit={handleResetPassword}
              className="space-y-3"
            >

              <div>

                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Password
                </label>

                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                />

              </div>

              <div className="flex items-center justify-end gap-2 pt-2">

                <button
                  type="button"
                  onClick={() => {
                    setResettingUser(null);
                    setNewPassword('');
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg transition-colors"
                >
                  Update Password
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ==================================================
          EMPLOYEE DETAILS DRAWER
          ================================================== */}

      {viewingEmployee && (

        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">

          <div className="bg-white rounded-xl border border-slate-300 max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* HEADER */}

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">

              <div className="flex items-center gap-3">

                {viewingEmployee.avatarUrl ? (

                  <img
                    src={viewingEmployee.avatarUrl}
                    alt={viewingEmployee.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />

                ) : (

                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm">
                    {viewingEmployee.name.charAt(
                      0
                    )}
                  </div>

                )}

                <div>

                  <h3 className="text-base font-bold text-slate-900">
                    {viewingEmployee.name}
                  </h3>

                  <div className="text-xs text-slate-500 font-mono">
                    {viewingEmployee.email} ·{' '}
                    {viewingEmployee.department}
                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setViewingEmployee(null)
                }
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            <div className="py-4 space-y-5 text-xs">

              {/* ASSIGNED TASKS */}

              <div>

                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">

                  <Briefcase className="w-4 h-4 text-indigo-600" />

                  <span>
                    Assigned Tasks ({empTasks.length})
                  </span>

                </h4>

                {empTasks.length === 0 ? (

                  <p className="text-slate-400 text-xs italic">
                    No active tasks assigned to this employee.
                  </p>

                ) : (

                  <div className="space-y-2">

                    {empTasks.map((task) => (

                      <div
                        key={task.id}
                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between"
                      >

                        <div>

                          <div className="font-semibold text-slate-900">
                            {task.title}
                          </div>

                          <div className="text-[11px] text-slate-500">
                            {task.clientName} · DoD:{' '}
                            {task.definitionOfDone}
                          </div>

                        </div>

                        <span
                          className={`font-semibold ${
                            task.status ===
                            'Completed'
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {task.status}
                        </span>

                      </div>

                    ))}

                  </div>

                )}

              </div>

              {/* ATTENDANCE */}

              <div>

                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">

                  <Clock className="w-4 h-4 text-indigo-600" />

                  <span>
                    Attendance History
                  </span>

                </h4>

                <div className="overflow-x-auto border border-slate-100 rounded-lg">

                  <table className="w-full text-left text-xs">

                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">

                      <tr>

                        <th className="py-2 px-3 font-semibold font-mono">
                          Date
                        </th>

                        <th className="py-2 px-3 font-semibold font-mono">
                          Check In
                        </th>

                        <th className="py-2 px-3 font-semibold font-mono">
                          Check Out
                        </th>

                        <th className="py-2 px-3 font-semibold">
                          Status
                        </th>

                        <th className="py-2 px-3 font-semibold">
                          Note
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {empAttendance
                        .slice(0, 5)
                        .map((att) => (

                          <tr key={att.id}>

                            <td className="py-2 px-3 font-mono">
                              {att.date}
                            </td>

                            <td className="py-2 px-3 font-mono">
                              {att.checkIn || '—'}
                            </td>

                            <td className="py-2 px-3 font-mono">
                              {att.checkOut || '—'}
                            </td>

                            <td className="py-2 px-3 font-semibold text-emerald-600">
                              {att.status}
                            </td>

                            <td className="py-2 px-3 text-slate-500">
                              {att.note || '—'}
                            </td>

                          </tr>

                        ))}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

            {/* CLOSE */}

            <div className="flex justify-end pt-3 border-t border-slate-200">

              <button
                type="button"
                onClick={() =>
                  setViewingEmployee(null)
                }
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};