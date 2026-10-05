import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.jsx';
import { Search, Plus, Edit, Trash2, ShieldAlert, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export const FutureOpportunitiesPage = () => {
  const { role } = useAuth();
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [oppToDelete, setOppToDelete] = useState(null);

  const [formData, setFormData] = useState({
    customerName: '',
    company: '',
    phone: '',
    requirement: '',
    expectedPurchaseMonth: '',
    reminderDate: '',
    notes: ''
  });

  const loadOpps = async () => {
    setLoading(true);
    const data = await db.getFutureOpportunities();
    setOpps(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (role === 'Owner' || role === 'SuperAdmin') {
      loadOpps();
    }
  }, [role]);

  if (role !== 'Owner' && role !== 'SuperAdmin') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 my-12">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Owner Exclusive Access Only</h2>
        <p className="text-xs text-gray-500">
          The Future Opportunities Vault stores confidential deferred client requirements (e.g. "Call after 6 months") and is strictly accessible by the <strong>Owner</strong> role.
        </p>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingOpp(null);
    setFormData({
      customerName: '',
      company: '',
      phone: '',
      requirement: '',
      expectedPurchaseMonth: '6 Months Later',
      reminderDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (opp) => {
    setEditingOpp(opp);
    setFormData(opp);
    setModalOpen(true);
  };

  const handleOpenDelete = (opp) => {
    setOppToDelete(opp);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (oppToDelete) {
      await db.deleteFutureOpportunity(oppToDelete.id);
      toast.success('Opportunity record deleted');
      setDeleteConfirmOpen(false);
      setOppToDelete(null);
      await loadOpps();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingOpp) {
      // update
      await db.addFutureOpportunity(formData);
      toast.success('Opportunity updated successfully');
    } else {
      await db.addFutureOpportunity(formData);
      toast.success('New future opportunity added to Owner vault');
    }
    setModalOpen(false);
    await loadOpps();
  };

  const filteredOpps = opps
    .filter(o =>
      (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.phone || '').includes(searchTerm) ||
      (o.requirement || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const timeA = a.reminderDate ? new Date(a.reminderDate).getTime() : 0;
      const timeB = b.reminderDate ? new Date(b.reminderDate).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

  const columns = [
    {
      header: 'Customer & Company',
      cell: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.customerName}</p>
          <p className="text-xs text-gray-500">{row.company}</p>
        </div>
      )
    },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Requirement', accessor: 'requirement' },
    {
      header: 'Expected Purchase',
      cell: (row) => (
        <Badge variant="warning">{row.expectedPurchaseMonth}</Badge>
      )
    },
    {
      header: 'Reminder Date',
      cell: (row) => (
        <span className="text-xs font-semibold text-[#3B318A] flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {row.reminderDate}
        </span>
      )
    },
    { header: 'Notes', accessor: 'notes' },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenEdit(row)} className="p-1.5 text-gray-500 hover:text-indigo-600">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleOpenDelete(row)} className="p-1.5 text-gray-500 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              Future Opportunities Vault
            </h1>
            <Badge variant="primary">Owner Exclusive</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Securely store customer records who said "call me after 6 months" or "contact next year" so business details are never lost.
          </p>
        </div>
        <div className="shrink-0">
          <Button onClick={handleOpenAdd} icon={Plus}>Add Opportunity</Button>
        </div>
      </div>

      <Card className="p-4 sm:p-6 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search future opportunities by customer, company, requirement..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading future opportunities from vault...</div>
        ) : (
          <Table columns={columns} data={filteredOpps} emptyMessage="No future opportunity records found in vault." />
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingOpp ? 'Edit Opportunity' : 'Add Future Opportunity'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Customer Name"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
          />
          <Input
            label="Company Name"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
          />
          <Input
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input
            label="Requirement"
            value={formData.requirement}
            onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
            required
          />
          <Input
            label="Expected Purchase Month"
            value={formData.expectedPurchaseMonth}
            onChange={(e) => setFormData({ ...formData, expectedPurchaseMonth: e.target.value })}
            placeholder="e.g. December 2026 / After 6 Months"
            required
          />
          <Input
            label="Reminder Date"
            type="date"
            value={formData.reminderDate}
            onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
            required
          />
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Opportunity</Button>
          </div>
        </form>
      </Modal>
      {/* Delete Opportunity Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setOppToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Future Opportunity?"
        description={
          oppToDelete ? (
            <span>
              Are you sure you want to delete the future opportunity record for <strong className="text-gray-900">{oppToDelete.customerName}</strong> ({oppToDelete.company || 'N/A'})?
            </span>
          ) : (
            'Are you sure you want to delete this future opportunity record?'
          )
        }
        confirmText="Yes, Delete Record"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
