import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Client, PackageTier, PaymentStatus } from '../../types.ts';
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const ClientsView: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    clientName: '',
    packageTier: 'Premium' as PackageTier,
    monthlyFee: 25000,
    contractStart: '2026-09-01',
    renewalDate: '2027-08-31',
    namedApprover: '',
    billingContact: '',
    deliveryLead: '',
    baselineMetrics: 'Website / Leads / Social',
    seuLoad: '40 hrs',
    paymentStatus: 'Paid' as PaymentStatus,
    notes: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      clientName: '',
      packageTier: 'Premium',
      monthlyFee: 25000,
      contractStart: '2026-09-01',
      renewalDate: '2027-08-31',
      namedApprover: '',
      billingContact: '',
      deliveryLead: 'Arun Kumar',
      baselineMetrics: 'Website / Leads / Social',
      seuLoad: '40 hrs',
      paymentStatus: 'Paid',
      notes: '',
    });
    setEditingClient(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setFormData({
      clientName: c.clientName,
      packageTier: c.packageTier,
      monthlyFee: c.monthlyFee,
      contractStart: c.contractStart,
      renewalDate: c.renewalDate,
      namedApprover: c.namedApprover,
      billingContact: c.billingContact,
      deliveryLead: c.deliveryLead,
      baselineMetrics: c.baselineMetrics,
      seuLoad: c.seuLoad,
      paymentStatus: c.paymentStatus,
      notes: c.notes || '',
    });
    setShowAddModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, formData);
        setFeedbackMsg(`Client "${formData.clientName}" updated successfully.`);
      } else {
        await api.createClient(formData);
        setFeedbackMsg(`New Client Master Record created for "${formData.clientName}".`);
      }
      setShowAddModal(false);
      setEditingClient(null);
      await loadClients();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save client');
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete client record "${name}"?`)) return;
    try {
      await api.deleteClient(id);
      setFeedbackMsg(`Client "${name}" deleted.`);
      await loadClients();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete client');
    }
  };

  const exportCSV = () => {
    const headers = [
      'Client Name',
      'Package Tier',
      'Monthly Fee (INR)',
      'Contract Start',
      'Renewal Date',
      'Named Approver',
      'Billing Contact',
      'Delivery Lead',
      'Baseline Metrics',
      'SEU Load',
      'Payment Status',
    ];
    const rows = clients.map((c) => [
      `"${c.clientName}"`,
      `"${c.packageTier}"`,
      c.monthlyFee,
      `"${c.contractStart}"`,
      `"${c.renewalDate}"`,
      `"${c.namedApprover}"`,
      `"${c.billingContact}"`,
      `"${c.deliveryLead}"`,
      `"${c.baselineMetrics}"`,
      `"${c.seuLoad}"`,
      `"${c.paymentStatus}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Client_Master_Record_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredClients = clients.filter((c) => {
    const matchSearch =
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.namedApprover.toLowerCase().includes(search.toLowerCase()) ||
      c.deliveryLead.toLowerCase().includes(search.toLowerCase()) ||
      c.billingContact.toLowerCase().includes(search.toLowerCase());

    const matchTier = filterTier === 'all' || c.packageTier === filterTier;
    const matchPayment = filterPayment === 'all' || c.paymentStatus === filterPayment;

    return matchSearch && matchTier && matchPayment;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <span>3.1 Client Master Record</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin master registry for client retainers, SLA deliverables, named approvers, and billing metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Add Client Record</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, approver, billing email, or delivery lead..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Tiers</option>
            <option value="Starter">Starter</option>
            <option value="Growth">Growth</option>
            <option value="Premium">Premium</option>
            <option value="Enterprise">Enterprise</option>
          </select>

          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Client Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Client Name</th>
                <th className="py-3 px-4 font-semibold">Tier</th>
                <th className="py-3 px-4 font-semibold font-mono text-right">Monthly Fee</th>
                <th className="py-3 px-4 font-semibold font-mono">Contract Term</th>
                <th className="py-3 px-4 font-semibold">Named Approver</th>
                <th className="py-3 px-4 font-semibold">Delivery Lead</th>
                <th className="py-3 px-4 font-semibold font-mono">SEU Load</th>
                <th className="py-3 px-4 font-semibold">Payment</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No client records match your search query.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{client.clientName}</div>
                      <div className="text-[11px] text-slate-400">{client.billingContact}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{client.packageTier}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      ₹{client.monthlyFee.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600 text-[11px]">
                      <div>{client.contractStart}</div>
                      <div className="text-slate-400 text-[10px]">to {client.renewalDate}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {client.namedApprover || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {client.deliveryLead || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {client.seuLoad}
                    </td>
                    <td className="py-3 px-4">
                      {client.paymentStatus === 'Paid' && (
                        <span className="font-semibold text-emerald-600">Paid</span>
                      )}
                      {client.paymentStatus === 'Pending' && (
                        <span className="font-semibold text-amber-600">Pending</span>
                      )}
                      {client.paymentStatus === 'Overdue' && (
                        <span className="font-semibold text-red-600">Overdue</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingClient(client)}
                          className="p-1 text-slate-500 hover:text-indigo-600 transition-colors"
                          title="View Full Client Master Record"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(client)}
                          className="p-1 text-slate-500 hover:text-slate-900 transition-colors"
                          title="Edit Client"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClient(client.id, client.clientName)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete Client"
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

      {/* Add / Edit Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-300 max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingClient ? 'Edit Client Master Record' : 'Add New Client Master Record'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="e.g. ABC Digital"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Package Tier *
                  </label>
                  <select
                    value={formData.packageTier}
                    onChange={(e) => setFormData({ ...formData, packageTier: e.target.value as PackageTier })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Growth">Growth</option>
                    <option value="Premium">Premium</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Monthly Fee (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={500}
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                    placeholder="25000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Contract Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.contractStart}
                    onChange={(e) => setFormData({ ...formData, contractStart: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Contract Renewal Date
                  </label>
                  <input
                    type="date"
                    value={formData.renewalDate}
                    onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Named Approver
                  </label>
                  <input
                    type="text"
                    value={formData.namedApprover}
                    onChange={(e) => setFormData({ ...formData, namedApprover: e.target.value })}
                    placeholder="e.g. Mr. Kumar"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Billing Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.billingContact}
                    onChange={(e) => setFormData({ ...formData, billingContact: e.target.value })}
                    placeholder="e.g. billing@abc.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Delivery Lead (Employee)
                  </label>
                  <input
                    type="text"
                    value={formData.deliveryLead}
                    onChange={(e) => setFormData({ ...formData, deliveryLead: e.target.value })}
                    placeholder="e.g. Arun Kumar"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    SEU Load (Hours)
                  </label>
                  <input
                    type="text"
                    value={formData.seuLoad}
                    onChange={(e) => setFormData({ ...formData, seuLoad: e.target.value })}
                    placeholder="e.g. 40 hrs"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Baseline Metrics
                </label>
                <input
                  type="text"
                  value={formData.baselineMetrics}
                  onChange={(e) => setFormData({ ...formData, baselineMetrics: e.target.value })}
                  placeholder="e.g. Website / Leads / Social"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Operational Notes & SLA Agreements
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Weekly creative turnarounds, primary contact hours, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
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
                  {editingClient ? 'Save Changes' : 'Create Client Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Client Record Modal */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-300 max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingClient.clientName}</h3>
                <span className="text-xs text-indigo-600 font-medium">{viewingClient.packageTier} Tier Retainer</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingClient(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <div className="text-slate-400 uppercase text-[10px] font-semibold">Monthly Retainer Fee</div>
                  <div className="font-mono text-base font-bold text-slate-900">
                    ₹{viewingClient.monthlyFee.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 uppercase text-[10px] font-semibold">Payment Status</div>
                  <div className="font-semibold text-emerald-600 mt-1">{viewingClient.paymentStatus}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <strong className="text-slate-800 block text-[11px]">Named Approver:</strong>
                  <span>{viewingClient.namedApprover || 'Not specified'}</span>
                </div>
                <div>
                  <strong className="text-slate-800 block text-[11px]">Billing Contact:</strong>
                  <span className="font-mono text-[11px]">{viewingClient.billingContact}</span>
                </div>
                <div>
                  <strong className="text-slate-800 block text-[11px]">Delivery Lead:</strong>
                  <span>{viewingClient.deliveryLead || 'Unassigned'}</span>
                </div>
                <div>
                  <strong className="text-slate-800 block text-[11px]">SEU Allocation:</strong>
                  <span className="font-mono">{viewingClient.seuLoad}</span>
                </div>
                <div>
                  <strong className="text-slate-800 block text-[11px]">Contract Start:</strong>
                  <span className="font-mono">{viewingClient.contractStart}</span>
                </div>
                <div>
                  <strong className="text-slate-800 block text-[11px]">Renewal Date:</strong>
                  <span className="font-mono">{viewingClient.renewalDate}</span>
                </div>
              </div>

              <div className="pt-2">
                <strong className="text-slate-800 block text-[11px] mb-0.5">Baseline Metrics:</strong>
                <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  {viewingClient.baselineMetrics}
                </p>
              </div>

              {viewingClient.notes && (
                <div>
                  <strong className="text-slate-800 block text-[11px] mb-0.5">Notes:</strong>
                  <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    {viewingClient.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewingClient(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
