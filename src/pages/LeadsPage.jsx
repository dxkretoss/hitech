import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import { useAuth } from '../contexts/AuthContext.jsx';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.jsx';
import { Search, Plus, Edit, Trash2, UserCheck, Sparkles, ShoppingBag, User } from 'lucide-react';
import { toast } from 'sonner';

const ReactPhoneInput = PhoneInput.default || PhoneInput;

export const LeadsPage = () => {
  const { currentUser, role } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [futureModalOpen, setFutureModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLeadForFuture, setSelectedLeadForFuture] = useState(null);

  // Custom Delete & Convert confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [convertConfirmOpen, setConvertConfirmOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState(null);

  // Concise Sales Form State (Only required fields)
  const [formData, setFormData] = useState({
    customerName: '',
    company: '',
    phone: '',
    requirement: '',
    interestedProduct: '50 HP Screw Air Compressor',
    followUpDate: '',
    status: 'New',
    notes: '',
    expectedPurchaseMonth: 'After 3 Months'
  });

  // Direct Customer Sale Form (Generates 3 service reminders)
  const [saleFormData, setSaleFormData] = useState({
    customerName: '',
    company: '',
    phone: '',
    purchasedProduct: '50 HP Screw Air Compressor',
    installationDate: new Date().toISOString().split('T')[0],
    assignedEngineer: 'Sanjay Patel',
    address: ''
  });

  const [futureFormData, setFutureFormData] = useState({
    expectedPurchaseMonth: 'After 6 Months',
    reminderDate: '',
    notes: ''
  });

  const [engineersList, setEngineersList] = useState([]);

  const loadLeads = async () => {
    setLoading(true);
    const [data, profiles] = await Promise.all([
      db.getLeads(),
      db.getProfiles()
    ]);
    setLeads(data || []);
    const engs = (profiles || []).filter(p => p.role === 'Engineer');
    setEngineersList(engs);
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
      interestedProduct: '50 HP Screw Air Compressor',
      followUpDate: new Date().toISOString().split('T')[0],
      status: 'New',
      notes: '',
      expectedPurchaseMonth: 'After 3 Months'
    });
    setModalOpen(true);
  };

  const handleOpenDirectSale = () => {
    setSaleFormData({
      customerName: '',
      company: '',
      phone: '',
      purchasedProduct: '50 HP Screw Air Compressor',
      installationDate: new Date().toISOString().split('T')[0],
      assignedEngineer: 'Sanjay Patel',
      address: ''
    });
    setSaleModalOpen(true);
  };

  const handleOpenEdit = (lead) => {
    setEditingLead(lead);
    setFormData(lead);
    setModalOpen(true);
  };

  const handleOpenDelete = (lead) => {
    setLeadToDelete(lead);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (leadToDelete) {
      await db.deleteLead(leadToDelete.id);
      toast.success('Lead deleted successfully');
      setDeleteConfirmOpen(false);
      setLeadToDelete(null);
      await loadLeads();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingLead) {
      await db.updateLead(editingLead.id, formData);
      toast.success('Lead updated successfully');
    } else {
      await db.addLead(formData, currentUser);
      toast.success(formData.status === 'Future Requirement' 
        ? 'Future Requirement stored! Visible on Admin Dashboard.' 
        : 'New lead added to sales pipeline');
    }
    setModalOpen(false);
    await loadLeads();
  };

  const handleSaveDirectSale = async (e) => {
    e.preventDefault();
    await db.addCustomerSale(saleFormData, currentUser);
    toast.success('🎉 Product Sale Saved! 3 Service Reminders (+2m, +6m, +10m) automatically scheduled for Field Engineer.');
    setSaleModalOpen(false);
    await loadLeads();
  };

  const handleOpenConvert = (lead) => {
    setLeadToConvert(lead);
    setConvertConfirmOpen(true);
  };

  const handleConfirmConvert = async () => {
    if (leadToConvert) {
      await db.convertLeadToCustomer(leadToConvert.id);
      toast.success('Lead converted to Customer Sale! 3 services (+2m, +6m, +10m) auto-scheduled for Field Engineer.');
      setConvertConfirmOpen(false);
      setLeadToConvert(null);
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
      toast.success('Lead saved to Future Requirements Vault (Visible to Admin)!');
      setFutureModalOpen(false);
      await loadLeads();
    }
  };

  const filteredLeads = leads.filter(l =>
    (l.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.phone || '').includes(searchTerm) ||
    (l.requirement || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.salesPersonName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New': return <Badge variant="primary">New Lead</Badge>;
      case 'Future Requirement': return <Badge variant="warning">Future Req</Badge>;
      case 'Won': return <Badge variant="success font-bold">Sold / Won</Badge>;
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
    { header: 'Contact Phone', accessor: 'phone' },
    { header: 'Requirement / Item', accessor: 'requirement' },
    {
      header: 'Logged By (Sales Rep)',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
          <User className="w-3.5 h-3.5 text-[#3B318A]" />
          {row.salesPersonName || 'Vikram Mehta'}
        </span>
      )
    },
    { header: 'Follow Up / Timeline', accessor: 'followUpDate' },
    {
      header: 'Status',
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status !== 'Won' && (
            <Button size="sm" variant="success" icon={UserCheck} onClick={() => handleOpenConvert(row)}>
              Sell / Convert
            </Button>
          )}
          {row.status !== 'Won' && row.status !== 'Future Requirement' && (
            <Button size="sm" variant="secondary" icon={Sparkles} onClick={() => handleOpenFutureModal(row)}>
              Future Req
            </Button>
          )}
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#3B318A] to-[#2F2770] text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            Sales Lead & Future Requirement Portal
          </h1>
          <p className="text-xs text-indigo-100 mt-1">
            Logged in as <strong>{currentUser?.name || 'Sales Representative'}</strong> ({role}). Quick entry for client leads and deferred future needs.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={handleOpenDirectSale} variant="amber" icon={ShoppingBag}>
            Record Item Sale
          </Button>
          <Button onClick={handleOpenAdd} variant="white" icon={Plus}>
            Quick Add Lead / Future Req
          </Button>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads by customer, company, phone, sales rep name..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading leads database...</div>
        ) : (
          <Table columns={columns} data={filteredLeads} emptyMessage="No sales lead records found." />
        )}
      </Card>

      {/* Concise Quick Add Lead / Future Requirement Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingLead ? 'Edit Lead Record' : 'Quick Entry: Lead / Future Requirement'} maxWidth="max-w-xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs text-[#3B318A] font-semibold flex items-center justify-between">
            <span>Sales Person Tag: <strong>{currentUser?.name || 'Vikram Mehta'}</strong></span>
            <Badge variant="primary">{role}</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Client / Contact Name"
              name="customerName"
              placeholder="e.g. Rajesh Shah"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              required
            />
            <Input
              label="Company Name"
              name="company"
              placeholder="e.g. Reliance Textiles"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 w-full">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                <span>Phone Number</span> <span className="text-red-500 select-none">*</span>
              </label>
              <ReactPhoneInput
                country={'in'}
                enableSearch={true}
                searchPlaceholder="Search country..."
                value={formData.phone}
                onChange={(phone, country, e, formattedValue) =>
                  setFormData({ ...formData, phone: formattedValue || phone })
                }
                inputProps={{
                  required: true,
                  name: 'phone'
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Product Category</label>
              <select
                value={formData.interestedProduct}
                onChange={(e) => setFormData({ ...formData, interestedProduct: e.target.value, requirement: e.target.value })}
                className="w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A]"
              >
                <option value="50 HP Screw Air Compressor">50 HP Screw Air Compressor</option>
                <option value="75 HP VFD Screw Compressor">75 HP VFD Screw Compressor</option>
                <option value="10-Ton Industrial Water Chiller">10-Ton Industrial Water Chiller</option>
                <option value="Refrigerated Air Dryer 100 CFM">Refrigerated Air Dryer 100 CFM</option>
                <option value="Annual Maintenance Contract (AMC)">Annual Maintenance Contract (AMC)</option>
              </select>
            </div>
          </div>

          <Input
            label="Specific Requirement Details"
            name="requirement"
            placeholder="e.g. Moisture-free high pressure air line required for new plant"
            value={formData.requirement}
            onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Requirement Type / Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] font-bold text-[#3B318A]"
              >
                <option value="New">Immediate Lead (Active Inquiry)</option>
                <option value="Future Requirement">Future Requirement (Not Now, Need Later)</option>
                <option value="Won">Item Sold / Deal Won</option>
                <option value="Lost">Lost Opportunity</option>
              </select>
            </div>

            {formData.status === 'Future Requirement' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Expected Timeline</label>
                <select
                  value={formData.expectedPurchaseMonth}
                  onChange={(e) => setFormData({ ...formData, expectedPurchaseMonth: e.target.value })}
                  className="w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A]"
                >
                  <option value="After 2 Months">After 2 Months</option>
                  <option value="After 6 Months">After 6 Months</option>
                  <option value="After 10 Months">After 10 Months / Next Year</option>
                </select>
              </div>
            ) : (
              <Input
                label="Follow-Up Date"
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                required
              />
            )}
          </div>

          <Textarea
            label="Quick Remark / Remarks"
            name="notes"
            placeholder="e.g. Client mentioned budget issue now, requested callback after 6 months."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="bg-[#3B318A]">
              Save Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Direct Item Sale Modal (Auto generates 3 service reminders) */}
      <Modal isOpen={saleModalOpen} onClose={() => setSaleModalOpen(false)} title="Record Item / Equipment Sale" maxWidth="max-w-xl">
        <form onSubmit={handleSaveDirectSale} className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              Automatic Maintenance Service Generator:
            </p>
            <p className="text-[11px] text-emerald-700">
              Saving this sale automatically creates <strong>3 Maintenance Service Reminders</strong> (+2 Months, +6 Months, +10 Months) for Field Engineers.
            </p>
          </div>

          <Input
            label="Customer / Buyer Name"
            placeholder="e.g. Dharmesh Joshi"
            value={saleFormData.customerName}
            onChange={(e) => setSaleFormData({ ...saleFormData, customerName: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              placeholder="e.g. Surat Diamond Craft"
              value={saleFormData.company}
              onChange={(e) => setSaleFormData({ ...saleFormData, company: e.target.value })}
              required
            />
            <div className="space-y-1.5 w-full">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                <span>Phone Number</span> <span className="text-red-500 select-none">*</span>
              </label>
              <ReactPhoneInput
                country={'in'}
                enableSearch={true}
                searchPlaceholder="Search country..."
                value={saleFormData.phone}
                onChange={(phone, country, e, formattedValue) =>
                  setSaleFormData({ ...saleFormData, phone: formattedValue || phone })
                }
                inputProps={{
                  required: true,
                  name: 'phone'
                }}
              />
            </div>
          </div>

          <Input
            label="Purchased Item / Product"
            placeholder="e.g. 50 HP Screw Air Compressor"
            value={saleFormData.purchasedProduct}
            onChange={(e) => setSaleFormData({ ...saleFormData, purchasedProduct: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Purchase / Installation Date"
              type="date"
              value={saleFormData.installationDate}
              onChange={(e) => setSaleFormData({ ...saleFormData, installationDate: e.target.value })}
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Assign Engineer</label>
              <select
                value={saleFormData.assignedEngineer}
                onChange={(e) => setSaleFormData({ ...saleFormData, assignedEngineer: e.target.value })}
                className="w-full h-[38px] px-3 py-2 text-xs font-medium border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] bg-white text-gray-900 truncate"
              >
                {engineersList.length > 0 ? (
                  engineersList.map((eng) => (
                    <option key={eng.id} value={eng.name}>
                      {eng.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Sanjay Patel">Sanjay Patel</option>
                    <option value="Ramesh Kumar">Ramesh Kumar</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSaleModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Save Sale & Generate Services
            </Button>
          </div>
        </form>
      </Modal>

      {/* Save to Future Opportunity Vault Modal */}
      <Modal isOpen={futureModalOpen} onClose={() => setFutureModalOpen(false)} title="Move to Future Requirements Vault (Admin Visible)" maxWidth="max-w-xl">
        <form onSubmit={handleSaveFutureOpp} className="space-y-4">
          <p className="text-xs text-gray-500">
            Client indicated they don't need the product right now. Save this record into the Future Requirements database.
          </p>
          <Input
            label="Expected Purchase Month / Timeline"
            value={futureFormData.expectedPurchaseMonth}
            onChange={(e) => setFutureFormData({ ...futureFormData, expectedPurchaseMonth: e.target.value })}
            placeholder="e.g. After 6 Months / Dec 2026"
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
            <Button type="submit" variant="secondary" icon={Sparkles}>Save Future Req</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Lead Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setLeadToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Lead Record?"
        description={
          leadToDelete ? (
            <span>
              Are you sure you want to delete the lead for <strong className="text-gray-900">{leadToDelete.customerName}</strong> ({leadToDelete.company || 'N/A'})? This action cannot be undone.
            </span>
          ) : (
            'Are you sure you want to delete this lead record? This action cannot be undone.'
          )
        }
        confirmText="Yes, Delete Lead"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Convert Lead to Sale Confirmation Modal */}
      <ConfirmModal
        isOpen={convertConfirmOpen}
        onClose={() => {
          setConvertConfirmOpen(false);
          setLeadToConvert(null);
        }}
        onConfirm={handleConfirmConvert}
        title="Convert Lead to Customer Sale?"
        description={
          leadToConvert ? (
            <span>
              Convert lead for <strong className="text-gray-900">{leadToConvert.customerName}</strong> into a Customer Sale? This will automatically schedule <strong>3 maintenance service reminders</strong> (+2m, +6m, +10m) for Field Engineers.
            </span>
          ) : (
            'Convert this lead into a Customer Purchase?'
          )
        }
        confirmText="Convert & Schedule Services"
        cancelText="Cancel"
        variant="primary"
        icon={UserCheck}
      />
    </div>
  );
};

