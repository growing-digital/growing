import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Task, Client, User, TaskPriority, TaskStatus } from '../../types.ts';
import {
  CheckSquare,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Download,
  AlertCircle,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    clientId: '',
    assignedTo: '',
    dueDate: '2026-09-30',
    definitionOfDone: '',
    dependency: 'Client images',
    priority: 'Medium' as TaskPriority,
    status: 'Pending' as TaskStatus,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, cData, eData] = await Promise.all([
        api.getTasks(),
        api.getClients(),
        api.getEmployees(),
      ]);
      setTasks(tData);
      setClients(cData);
      setEmployees(eData);
    } catch (err) {
      console.error('Error loading task management data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      clientId: clients[0]?.id || '',
      assignedTo: employees[0]?.id || '',
      dueDate: '2026-09-30',
      definitionOfDone: '',
      dependency: '',
      priority: 'Medium',
      status: 'Pending',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (t: Task) => {
    setEditingTask(t);
    setFormData({
      title: t.title,
      clientId: t.clientId,
      assignedTo: t.assignedTo,
      dueDate: t.dueDate,
      definitionOfDone: t.definitionOfDone,
      dependency: t.dependency,
      priority: t.priority,
      status: t.status,
    });
    setShowAddModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, formData);
      } else {
        await api.createTask(formData);
      }
      setShowAddModal(false);
      setEditingTask(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save task');
    }
  };

  const handleDeleteTask = async (id: string, title: string) => {
    if (!window.confirm(`Delete task "${title}"?`)) return;
    try {
      await api.deleteTask(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const handleQuickStatusCycle = async (t: Task) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      'Pending': 'In Progress',
      'In Progress': 'Completed',
      'Completed': 'Pending',
    };
    try {
      await api.updateTaskStatus(t.id, nextStatus[t.status]);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const exportCSV = () => {
    const headers = ['Task', 'Client', 'Owner', 'Due Date', 'Definition of Done', 'Dependency', 'Priority', 'Status'];
    const rows = tasks.map((t) => [
      `"${t.title}"`,
      `"${t.clientName}"`,
      `"${t.assignedToName}"`,
      `"${t.dueDate}"`,
      `"${t.definitionOfDone}"`,
      `"${t.dependency}"`,
      `"${t.priority}"`,
      `"${t.status}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Weekly_Task_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedToName.toLowerCase().includes(search.toLowerCase()) ||
      t.clientName.toLowerCase().includes(search.toLowerCase()) ||
      t.definitionOfDone.toLowerCase().includes(search.toLowerCase()) ||
      t.dependency.toLowerCase().includes(search.toLowerCase());

    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchAssignee = filterAssignee === 'all' || t.assignedTo === filterAssignee;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;

    return matchSearch && matchStatus && matchAssignee && matchPriority;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <span>4. Weekly Task Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin task dispatch board, client milestone ownership, Definition of Done, and dependency tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Log</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, deliverables, dependencies, or owners..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Owners</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Task Log Table (Matching Table 4 in Brief) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Task</th>
                <th className="py-3 px-4 font-semibold">Owner</th>
                <th className="py-3 px-4 font-semibold">Client</th>
                <th className="py-3 px-4 font-semibold font-mono">Due</th>
                <th className="py-3 px-4 font-semibold">Definition of Done</th>
                <th className="py-3 px-4 font-semibold">Dependency</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No tasks found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-[200px]">
                      <div>{task.title}</div>
                      {task.completionNotes && (
                        <div className="text-[10px] text-slate-400 font-normal italic mt-0.5 truncate">
                          "{task.completionNotes}"
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {task.assignedToName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {task.clientName}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {task.dueDate}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      {task.definitionOfDone || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[150px]">
                      {task.dependency || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {task.priority === 'Urgent' && (
                        <span className="font-semibold text-red-600">Urgent</span>
                      )}
                      {task.priority === 'High' && (
                        <span className="font-semibold text-amber-600">High</span>
                      )}
                      {task.priority === 'Medium' && (
                        <span className="font-medium text-slate-700">Medium</span>
                      )}
                      {task.priority === 'Low' && (
                        <span className="text-slate-500">Low</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleQuickStatusCycle(task)}
                        title="Click to advance status (Pending → In Progress → Completed)"
                        className="group flex items-center gap-1.5 cursor-pointer text-left"
                      >
                        {task.status === 'Pending' && (
                          <span className="font-semibold text-amber-600 group-hover:underline">
                            Pending
                          </span>
                        )}
                        {task.status === 'In Progress' && (
                          <span className="font-semibold text-blue-600 group-hover:underline">
                            In Progress
                          </span>
                        )}
                        {task.status === 'Completed' && (
                          <span className="font-semibold text-emerald-600 group-hover:underline">
                            Completed
                          </span>
                        )}
                        <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(task)}
                          className="p-1 text-slate-500 hover:text-slate-900 transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-300 max-w-lg w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingTask ? 'Edit Task' : 'Create Weekly Task'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Create Instagram posts"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Assign Owner *
                  </label>
                  <select
                    required
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department?.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Client *
                  </label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Client...</option>
                    {clients.map((cli) => (
                      <option key={cli.id} value={cli.id}>
                        {cli.clientName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Definition of Done *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.definitionOfDone}
                  onChange={(e) => setFormData({ ...formData, definitionOfDone: e.target.value })}
                  placeholder="e.g. 5 posts published with approved carousel copy"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Dependency
                </label>
                <input
                  type="text"
                  value={formData.dependency}
                  onChange={(e) => setFormData({ ...formData, dependency: e.target.value })}
                  placeholder="e.g. Client images, approval on wireframes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                >
                  {editingTask ? 'Save Changes' : 'Dispatch Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
