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
import { DataPrivacyShield } from '../components/common/DataPrivacyShield.jsx';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  Sparkles,
  User,
  Flame,
  Snowflake,
  XCircle,
  ShieldCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const ReactPhoneInput = PhoneInput.default || PhoneInput;

export const LeadsPage = () => {
  const { currentUser, role } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'HOT' | 'COLD' | 'WON' | 'LOST' | 'FUTURE'

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [futureModalOpen, setFutureModalOpen] = useState(false);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLeadForFuture, setSelectedLeadForFuture] = useState(null);
  const [leadToMarkLost, setLeadToMarkLost] = useState(null);

  // Custom Delete & Convert confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [convertConfirmOpen, setConvertConfirmOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState(null);

  // Sales Form State (with Lead Type: Hot / Cold)
  const [formData, setFormData] = useState({
    customerName: '',
    company: '',
    phone: '',
    leadType: 'Hot Lead',
    requirement: '',
    interestedProduct: '50 HP Screw Air Compressor',
    followUpDate: '',
    status: 'New',
    notes: '',
    expectedPurchaseMonth: 'After 3 Months'
  });

  // Future Opportunity Form State
  const [futureFormData, setFutureFormData] = useState({
    expectedPurchaseMonth: 'After 6 Months',
    reminderDate: '',
    notes: ''
  });

  // Loss Reason & Mandatory Remark Form State
  const [lossFormData, setLossFormData] = useState({
    lossReason: 'Price too high / Competitor cheaper',
    lossRemark: ''
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
      leadType: 'Hot Lead',
      requirement: '',
      interestedProduct: '50 HP Screw Air Compressor',
      followUpDate: new Date().toISOString().split('T')[0],
      status: 'New',
      notes: '',
      expectedPurchaseMonth: 'After 3 Months'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (lead) => {
    setEditingLead(lead);
    setFormData({
      customerName: lead.customerName || '',
      company: lead.company || '',
      phone: lead.phone || '',
      leadType: lead.leadType || 'Hot Lead',
      requirement: lead.requirement || '',
      interestedProduct: lead.interestedProduct || '50 HP Screw Air Compressor',
      followUpDate: lead.followUpDate || new Date().toISOString().split('T')[0],
      status: lead.status || 'New',
      notes: lead.notes || '',
      expectedPurchaseMonth: lead.expectedPurchaseMonth || 'After 3 Months'
    });
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
      toast.success(
        formData.status === 'Future Requirement'
          ? 'Future Requirement stored! Visible on Admin Dashboard.'
          : `${formData.leadType} added to sales pipeline`
      );
    }
    setModalOpen(false);
    await loadLeads();
  };

  const handleOpenConvert = (lead) => {
    setLeadToConvert(lead);
    setConvertConfirmOpen(true);
  };

  const handleConfirmConvert = async () => {
    if (leadToConvert) {
      await db.convertLeadToCustomer(leadToConvert.id);
      toast.success('Lead converted to Customer Sale! Initial Commissioning Service assigned to Field Engineer.');
      setConvertConfirmOpen(false);
      setLeadToConvert(null);
      await loadLeads();
    }
  };

  // Open Lead Loss Modal
  const handleOpenLossModal = (lead) => {
    setLeadToMarkLost(lead);
    setLossFormData({
      lossReason: 'Price too high / Competitor cheaper',
      lossRemark: ''
    });
    setLossModalOpen(true);
  };

  // Submit Lead Loss with Mandatory Remark
  const handleConfirmLoss = async (e) => {
    e.preventDefault();
    if (!lossFormData.lossRemark.trim()) {
      toast.error('Please provide a mandatory remark explaining why the lead was lost.');
      return;
    }

    if (leadToMarkLost) {
      await db.markLeadAsLost(leadToMarkLost.id, {
        lossReason: lossFormData.lossReason,
        lossRemark: lossFormData.lossRemark.trim()
      });
      toast.success('Lead marked as Lost. Loss reason and remarks recorded.');
      setLossModalOpen(false);
      setLeadToMarkLost(null);
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

  // Filtering by search term and status/type pills
  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      (l.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.phone || '').includes(searchTerm) ||
      (l.requirement || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.salesPersonName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.lossReason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.lossRemark || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'HOT') return l.leadType === 'Hot Lead' && l.status !== 'Won' && l.status !== 'Lost';
    if (statusFilter === 'COLD') return l.leadType === 'Cold Lead' && l.status !== 'Won' && l.status !== 'Lost';
    if (statusFilter === 'WON') return l.status === 'Won';
    if (statusFilter === 'LOST') return l.status === 'Lost';
    if (statusFilter === 'FUTURE') return l.status === 'Future Requirement';

    return true;
  });

  const getStatusBadge = (row) => {
    switch (row.status) {
      case 'New':
        return <Badge variant="primary">Active Lead</Badge>;
      case 'Future Requirement':
        return <Badge variant="warning">Future Req</Badge>;
      case 'Won':
        return <Badge variant="success">Sold / Won</Badge>;
      case 'Lost':
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant="danger">Lead Lost</Badge>
            {row.lossReason && (
              <span className="text-[10px] text-rose-700 font-medium max-w-[140px] truncate" title={`${row.lossReason}: ${row.lossRemark}`}>
                {row.lossReason}
              </span>
            )}
          </div>
        );
      default:
        return <Badge>{row.status}</Badge>;
    }
  };

  const getLeadTypeBadge = (leadType) => {
    if (leadType === 'Cold Lead') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
          <Snowflake className="w-3.5 h-3.5 text-sky-500" />
          Cold Lead
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 shadow-xs">
        <Flame className="w-3.5 h-3.5 text-rose-600" />
        Hot Lead
      </span>
    );
  };

  const columns = [
    {
      header: 'Customer & Company',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900">{row.customerName}</p>
            {getLeadTypeBadge(row.leadType)}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{row.company}</p>
        </div>
      )
    },
    { header: 'Contact Phone', accessor: 'phone' },
    {
      header: 'Requirement / Item',
      cell: (row) => (
        <div>
          <p className="font-semibold text-gray-800 text-xs">{row.requirement}</p>
          {row.interestedProduct && row.interestedProduct !== row.requirement && (
            <p className="text-[11px] text-indigo-700">{row.interestedProduct}</p>
          )}
        </div>
      )
    },
    {
      header: 'Logged By (Sales Rep)',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
          <User className="w-3.5 h-3.5 text-[#3B318A]" />
          {row.salesPersonName || 'Vikram Mehta'}
        </span>
      )
    },
    {
      header: 'Follow Up / Timeline',
      cell: (row) => (
        <div className="text-xs text-gray-600">
          {row.followUpDate ? (
            <span className="inline-flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3 text-gray-400" />
              {row.followUpDate}
            </span>
          ) : (
            'N/A'
          )}
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => getStatusBadge(row)
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {/* Sell / Convert Button */}
          {row.status !== 'Won' && row.status !== 'Lost' && (
            <Button size="sm" variant="success" icon={UserCheck} onClick={() => handleOpenConvert(row)} title="Convert lead to customer purchase">
              Sell / Convert
            </Button>
          )}

          {/* Lead Loss Button with Required Remark */}
          {row.status !== 'Won' && row.status !== 'Lost' && (
            <Button size="sm" variant="danger" icon={XCircle} onClick={() => handleOpenLossModal(row)} title="Mark lead as Lost with mandatory reason">
              Lead Loss
            </Button>
          )}

          {/* Future Requirement Button */}
          {row.status !== 'Won' && row.status !== 'Lost' && row.status !== 'Future Requirement' && (
            <Button size="sm" variant="secondary" icon={Sparkles} onClick={() => handleOpenFutureModal(row)} title="Move to future requirements vault">
              Future Req
            </Button>
          )}

          {/* Edit / Delete Buttons */}
          <button onClick={() => handleOpenEdit(row)} className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors" title="Edit Lead">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleOpenDelete(row)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Delete Lead">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const countHot = leads.filter((l) => l.leadType === 'Hot Lead' && l.status !== 'Won' && l.status !== 'Lost').length;
  const countCold = leads.filter((l) => l.leadType === 'Cold Lead' && l.status !== 'Won' && l.status !== 'Lost').length;
  const countWon = leads.filter((l) => l.status === 'Won').length;
  const countLost = leads.filter((l) => l.status === 'Lost').length;
  const countFuture = leads.filter((l) => l.status === 'Future Requirement').length;

  return (
    <DataPrivacyShield currentUser={currentUser} role={role}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#3B318A] to-[#2F2770] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-20">
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-black">
                Sales Leads & Pipeline Portal
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                Data Privacy & Anti-Screenshot Active
              </span>
            </div>
            <p className="text-xs text-indigo-100">
              Logged in as <strong>{currentUser?.name || 'Sales Representative'}</strong> ({role}). Classify leads as Hot or Cold, manage conversions, and track lost opportunities.
            </p>
          </div>
          <div className="relative z-20 flex items-center gap-2.5">
            <Button onClick={handleOpenAdd} variant="white" icon={Plus}>
              Quick Add Lead
            </Button>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-[#3B318A] text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All Leads ({leads.length})
          </button>
          <button
            onClick={() => setStatusFilter('HOT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'HOT'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            Hot Leads ({countHot})
          </button>
          <button
            onClick={() => setStatusFilter('COLD')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'COLD'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5 text-sky-500" />
            Cold Leads ({countCold})
          </button>
          <button
            onClick={() => setStatusFilter('WON')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'WON'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            Sold / Won ({countWon})
          </button>
          <button
            onClick={() => setStatusFilter('LOST')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'LOST'
                ? 'bg-red-700 text-white shadow-md'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            Lost Deals ({countLost})
          </button>
          <button
            onClick={() => setStatusFilter('FUTURE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'FUTURE'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Future Req ({countFuture})
          </button>
        </div>

        {/* Main Leads Table Card */}
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search leads by customer, company, phone, requirement, loss reason..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading leads database...</div>
          ) : (
            <Table columns={columns} data={filteredLeads} emptyMessage="No sales lead records found matching filter." />
          )}
        </Card>

        {/* Add / Edit Lead Modal with Hot Lead / Cold Lead Selection */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingLead ? 'Edit Lead Record' : 'Add New Sales Lead'}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs text-[#3B318A] font-semibold flex items-center justify-between">
              <span>
                Sales Person Tag: <strong>{currentUser?.name || 'Vikram Mehta'}</strong>
              </span>
              <Badge variant="primary">{role}</Badge>
            </div>

            {/* Lead Type Selection (Hot Lead vs Cold Lead) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                <span>Select Lead Type (Urgency & Probability)</span> <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, leadType: 'Hot Lead' })}
                  className={`p-3 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                    formData.leadType === 'Hot Lead'
                      ? 'border-rose-500 bg-rose-50/70 text-rose-950 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${formData.leadType === 'Hot Lead' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black">Hot Lead</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">High urgency, active budget, immediate follow up</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, leadType: 'Cold Lead' })}
                  className={`p-3 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                    formData.leadType === 'Cold Lead'
                      ? 'border-sky-500 bg-sky-50/70 text-sky-950 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${formData.leadType === 'Cold Lead' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Snowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black">Cold Lead</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Early inquiry, low urgency, needs long-term nurturing</p>
                  </div>
                </button>
              </div>
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interestedProduct: e.target.value,
                      requirement: formData.requirement || e.target.value
                    })
                  }
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
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Pipeline Stage / Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] font-bold text-[#3B318A]"
                >
                  <option value="New">Immediate Lead (Active Follow-up)</option>
                  <option value="Future Requirement">Future Requirement (Need Later)</option>
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
                  label="Next Follow-Up Date"
                  type="date"
                  name="followUpDate"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  required
                />
              )}
            </div>

            <Textarea
              label="Sales Notes / Remarks"
              name="notes"
              placeholder="e.g. Discussed 75 HP screw compressor specs. Client will confirm budget approval next week."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-[#3B318A]">
                Save Lead Record
              </Button>
            </div>
          </form>
        </Modal>

        {/* Lead Loss Modal with Mandatory Remark Field */}
        <Modal
          isOpen={lossModalOpen}
          onClose={() => {
            setLossModalOpen(false);
            setLeadToMarkLost(null);
          }}
          title="Record Lead Loss / Lost Opportunity"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleConfirmLoss} className="space-y-4">
            {leadToMarkLost && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-red-950 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-600" />
                    {leadToMarkLost.customerName} ({leadToMarkLost.company || 'N/A'})
                  </p>
                  <Badge variant="danger">{leadToMarkLost.leadType || 'Hot Lead'}</Badge>
                </div>
                <p className="text-gray-600 text-[11px]">
                  Requirement: <strong>{leadToMarkLost.requirement || leadToMarkLost.interestedProduct}</strong>
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                <span>Primary Reason for Loss</span> <span className="text-red-500 select-none">*</span>
              </label>
              <select
                value={lossFormData.lossReason}
                onChange={(e) => setLossFormData({ ...lossFormData, lossReason: e.target.value })}
                className="w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-semibold text-gray-800"
                required
              >
                <option value="Price too high / Competitor cheaper">Price too high / Competitor cheaper</option>
                <option value="Client purchased competitor brand">Client purchased competitor brand</option>
                <option value="Project cancelled / Postponed indefinitely">Project cancelled / Postponed indefinitely</option>
                <option value="Unresponsive / Contact unreachable">Unresponsive / Contact unreachable</option>
                <option value="Machine specification / CFM capacity mismatch">Machine specification / CFM capacity mismatch</option>
                <option value="Client opted for second-hand / rental compressor">Client opted for second-hand / rental compressor</option>
                <option value="Other">Other Reasons</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                <span>Detailed Remark / Why Lead Lost</span> <span className="text-red-500 select-none">* (Required)</span>
              </label>
              <Textarea
                name="lossRemark"
                placeholder="Explain the specific reason why this deal fell through (e.g., Competitor offered 15% discount and free maintenance for 1 year; client decided on price point)."
                value={lossFormData.lossRemark}
                onChange={(e) => setLossFormData({ ...lossFormData, lossRemark: e.target.value })}
                required
                className="min-h-[100px] border-red-300 focus:ring-red-500"
              />
              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                This field is mandatory so the sales management team can analyze loss trends and adjust pricing/strategy.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setLossModalOpen(false);
                  setLeadToMarkLost(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger" icon={XCircle}>
                Confirm Mark as Lost
              </Button>
            </div>
          </form>
        </Modal>

        {/* Save to Future Opportunity Vault Modal */}
        <Modal
          isOpen={futureModalOpen}
          onClose={() => setFutureModalOpen(false)}
          title="Move to Future Requirements Vault (Admin Visible)"
          maxWidth="max-w-xl"
        >
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
              <Button variant="outline" onClick={() => setFutureModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary" icon={Sparkles}>
                Save Future Req
              </Button>
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
                Are you sure you want to delete the lead for <strong className="text-gray-900">{leadToDelete.customerName}</strong> (
                {leadToDelete.company || 'N/A'})? This action cannot be undone.
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
                Convert lead for <strong className="text-gray-900">{leadToConvert.customerName}</strong> into a Customer Sale? Initial service will be assigned to Field Engineer who logs parts replaced & sets the next service date.
              </span>
            ) : (
              'Convert this lead into a Customer Purchase?'
            )
          }
          confirmText="Convert & Schedule Service"
          cancelText="Cancel"
          variant="primary"
          icon={UserCheck}
        />
      </div>
    </DataPrivacyShield>
  );
};
