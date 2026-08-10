import React, { useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Search, Plus, Edit, Trash2, UserCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [futureModalOpen, setFutureModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLeadForFuture, setSelectedLeadForFuture] = useState(null);

  const [formData, setFormData] = useState({
    customerName: '',
    company: '',
    phone: '',
    requirement: '',
    interestedProduct: '',
    followUpDate: '',
    status: 'New',
    notes: ''
  });

  const [futureFormData, setFutureFormData] = useState({
    expectedPurchaseMonth: 'After 6 Months',
    reminderDate: '',
    notes: ''
  });

  const loadLeads = async () => {
    setLoading(true);
    const data = await db.getLeads();
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleOpenAdd = () => {
    setEditingLead(null);
    setFormData({
      customerName: '',
      company: '',
      phone: '',
      requirement: '',
      interestedProduct: '',
      followUpDate: new Date().toISOString().split('T')[0],
      status: 'New',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (lead) => {
    setEditingLead(lead);
    setFormData(lead);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      await db.deleteLead(id);
      toast.success('Lead deleted successfully');
      await loadLeads();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingLead) {
      await db.updateLead(editingLead.id, formData);
      toast.success('Lead updated successfully');
    } else {
      await db.addLead(formData);
      toast.success('New lead created successfully');
    }
    setModalOpen(false);
    await loadLeads();
  };

  const handleConvert = async (leadId) => {
    if (window.confirm('Convert this lead into a Customer? (Auto-generates 3 recurring service schedules)')) {
      await db.convertLeadToCustomer(leadId);
      toast.success('Lead converted to Customer! 3 services auto-scheduled.');
      await loadLeads();
    }
  };

  const handleOpenFutureModal = (lead) => {
    setSelectedLeadForFuture(lead);
    setFutureFormData({
      expectedPurchaseMonth: 'After 6 Months',
      reminderDate: new Date().toISOString().split('T')[0],
      notes: lead.notes || ''
    });
    setFutureModalOpen(true);
  };

  const handleSaveFutureOpp = async (e) => {
    e.preventDefault();
    if (selectedLeadForFuture) {
      await db.saveLeadToFutureOpportunity(
        selectedLeadForFuture.id,
        futureFormData.expectedPurchaseMonth,
        futureFormData.reminderDate
      );
      toast.success('Lead saved to Future Opportunities (Owner Vault)!');
      setFutureModalOpen(false);
      await loadLeads();
    }
  };

  const filteredLeads = leads.filter(l =>
    (l.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.phone || '').includes(searchTerm) ||
    (l.requirement || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New': return <Badge variant="primary">New</Badge>;
      case 'Future Requirement': return <Badge variant="warning">Future Req</Badge>;
      case 'Won': return <Badge variant="success font-bold">Won</Badge>;
      case 'Lost': return <Badge variant="danger">Lost</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

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
    { header: 'Interested Product', accessor: 'interestedProduct' },
    { header: 'Follow Up Date', accessor: 'followUpDate' },
    {
      header: 'Status',
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status !== 'Won' && (
            <Button size="sm" variant="success" icon={UserCheck} onClick={() => handleConvert(row.id)}>
              Convert
            </Button>
          )}
          {row.status !== 'Won' && row.status !== 'Future Requirement' && (
            <Button size="sm" variant="secondary" icon={Sparkles} onClick={() => handleOpenFutureModal(row)}>
              Future Opp
            </Button>
          )}
          <button onClick={() => handleOpenEdit(row)} className="p-1.5 text-gray-500 hover:text-indigo-600">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-500 hover:text-red-600">
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
          <h1 className="text-2xl font-black text-gray-900">Lead Management</h1>
          <p className="text-xs text-gray-500 mt-1">Track prospective client inquiries, set follow-ups, and convert leads to customers.</p>
        </div>
        <Button onClick={handleOpenAdd} icon={Plus}>Add New Lead</Button>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads by customer, company, phone, requirement..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading leads from Supabase...</div>
        ) : (
          <Table columns={columns} data={filteredLeads} emptyMessage="No leads found matching criteria." />
        )}
      </Card>

      {/* Add / Edit Lead Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingLead ? 'Edit Lead Details' : 'Add New Lead'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Customer Name"
            name="customerName"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
          />
          <Input
            label="Company Name"
            name="company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
          />
          <Input
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input
            label="Requirement"
            name="requirement"
            value={formData.requirement}
            onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
            required
          />
          <Input
            label="Interested Product"
            name="interestedProduct"
            value={formData.interestedProduct}
            onChange={(e) => setFormData({ ...formData, interestedProduct: e.target.value })}
          />
          <Input
            label="Follow Up Date"
            type="date"
            name="followUpDate"
            value={formData.followUpDate}
            onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none"
            >
              <option value="New">New</option>
              <option value="Future Requirement">Future Requirement</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
          <Textarea
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Lead</Button>
          </div>
        </form>
      </Modal>

      {/* Save to Future Opportunity Vault Modal */}
      <Modal isOpen={futureModalOpen} onClose={() => setFutureModalOpen(false)} title="Move to Future Opportunities (Owner Vault)">
        <form onSubmit={handleSaveFutureOpp} className="space-y-4">
          <p className="text-xs text-gray-500">
            Client indicated they don't need the product right now (e.g. "Call after 6 months"). Save this record into the Owner Future Opportunities vault.
          </p>
          <Input
            label="Expected Purchase Month / Timeline"
            value={futureFormData.expectedPurchaseMonth}
            onChange={(e) => setFutureFormData({ ...futureFormData, expectedPurchaseMonth: e.target.value })}
            placeholder="e.g. Dec 2026 / After 6 Months"
            required
          />
          <Input
            label="Reminder Date"
            type="date"
            value={futureFormData.reminderDate}
            onChange={(e) => setFutureFormData({ ...futureFormData, reminderDate: e.target.value })}
            required
          />
          <Textarea
            label="Client Remarks / Notes"
            value={futureFormData.notes}
            onChange={(e) => setFutureFormData({ ...futureFormData, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setFutureModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="secondary" icon={Sparkles}>Save to Owner Vault</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
