import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import {
  ArrowLeft,
  Building2,
  Mail,
  Briefcase,
  Wrench,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  Clock,
  Calendar,
  Phone,
  Boxes,
  ShieldCheck,
  Flame,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export const TeamMemberDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [leads, setLeads] = useState([]);
  const [futureOpps, setFutureOpps] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab for detail view
  const [activeTab, setActiveTab] = useState('MAIN'); // For Sales: 'LEADS' | 'SOLD_ITEMS' | 'FUTURE_OPPS'; For Eng: 'SERVICES' | 'SOLD_ITEMS'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingStock, setUpdatingStock] = useState(false);

  // Pagination (10 per page)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    const [profiles, allLeads, allOpps, allCusts, allServices] = await Promise.all([
      db.getProfiles(),
      db.getLeads(),
      db.getFutureOpportunities(),
      db.getCustomers(),
      db.getServices()
    ]);

    // Match member by id, or fallback
    const targetMember = (profiles || []).find((p) => p.id === id || p.email === id);
    setMember(targetMember || null);

    setLeads(allLeads || []);
    setFutureOpps(allOpps || []);
    setCustomers(allCusts || []);
    setServices(allServices || []);

    if (targetMember) {
      if (targetMember.role === 'Engineer') {
        setActiveTab('SERVICES');
      } else {
        setActiveTab('LEADS');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-gray-400">
        Loading team member profile and performance metrics...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-bold text-gray-600">Team member record not found.</p>
        <Button onClick={() => navigate('/admin/team')} variant="primary">
          Back to Team Directory
        </Button>
      </div>
    );
  }

  const isSales = member.role === 'Sales';
  const isEng = member.role === 'Engineer';
  const isOwner = member.role === 'Owner' || member.role === 'SuperAdmin' || member.role === 'Admin';

  // ========================================================
  // FILTER DATA SPECIFIC TO THIS TEAM MEMBER
  // ========================================================

  // Member's Leads
  const memberLeads = leads.filter((l) => {
    if (l.salesPersonId === member.id) return true;
    if (l.salesPersonName && member.name && l.salesPersonName.toLowerCase() === member.name.toLowerCase()) return true;
    if (isSales && !l.salesPersonId && l.branch === member.branch) return true;
    return false;
  });

  // Member's Future Opportunities
  const memberFutureOpps = futureOpps.filter((o) => {
    if (o.salesPersonId === member.id) return true;
    if (o.salesPersonName && member.name && o.salesPersonName.toLowerCase() === member.name.toLowerCase()) return true;
    if (isSales && !o.salesPersonId && o.branch === member.branch) return true;
    return false;
  });

  // Member's Sold Items (Customers & Dispatches)
  const memberSoldItems = customers.filter((c) => {
    if (isSales) {
      if (c.salesPersonId === member.id) return true;
      if (c.salesPersonName && member.name && c.salesPersonName.toLowerCase() === member.name.toLowerCase()) return true;
      if (!c.salesPersonId && c.branch === member.branch) return true;
      return false;
    }
    if (isEng) {
      if (c.assignedEngineer && member.name && c.assignedEngineer.toLowerCase().includes(member.name.toLowerCase())) return true;
      if (c.branch === member.branch) return true;
      return false;
    }
    return true;
  });

  // Member's Assigned Services
  const memberServices = services.filter((s) => {
    if (isEng) {
      if (s.assignedEngineer && member.name && s.assignedEngineer.toLowerCase().includes(member.name.toLowerCase())) return true;
      if (!s.assignedEngineer && s.branch === member.branch) return true;
      return false;
    }
    return true;
  });

  // Toggle Stock Access
  const handleToggleStock = async () => {
    setUpdatingStock(true);
    const newStatus = !member.canViewStock;
    try {
      await db.updateProfileStockAccess(member.id, newStatus);
      setMember((prev) => ({ ...prev, canViewStock: newStatus, can_view_stock: newStatus }));
      toast.success(`Stock visibility ${newStatus ? 'enabled' : 'disabled'} for ${member.name}`);
    } catch (err) {
      toast.error('Failed to update stock permission');
    } finally {
      setUpdatingStock(false);
    }
  };

  // ========================================================
  // STATS CALCULATIONS
  // ========================================================
  const hotLeadsCount = memberLeads.filter((l) => l.leadType === 'Hot Lead' || l.status === 'In Progress').length;
  const wonLeadsCount = memberLeads.filter((l) => l.status === 'Won' || l.status === 'Converted').length;
  const machinesSold = memberSoldItems.filter((c) => c.category !== 'Spare Part' && c.assignedEngineer !== 'Direct Spare Part Sale');
  const sparesSold = memberSoldItems.filter((c) => c.category === 'Spare Part' || c.assignedEngineer === 'Direct Spare Part Sale');

  const totalSpareRevenue = sparesSold.reduce((acc, s) => {
    const qty = Number(s.quantity) || 1;
    const price = Number(s.unitPrice) || 0;
    return acc + (price > 0 ? price * qty : 0);
  }, 0);

  const completedServicesCount = memberServices.filter((s) => s.status === 'Done' || s.status === 'Completed').length;
  const upcomingServicesCount = memberServices.filter((s) => s.status === 'Upcoming' || s.status === 'Pending').length;

  // ========================================================
  // ACTIVE TABLE DATA FILTERING & PAGINATION
  // ========================================================
  let activeList = [];

  if (activeTab === 'LEADS') {
    activeList = memberLeads.filter((l) => {
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          (l.customerName || '').toLowerCase().includes(q) ||
          (l.company || '').toLowerCase().includes(q) ||
          (l.phone || '').toLowerCase().includes(q) ||
          (l.requirement || '').toLowerCase().includes(q) ||
          (l.interestedProduct || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  } else if (activeTab === 'SOLD_ITEMS') {
    activeList = memberSoldItems.filter((item) => {
      if (statusFilter === 'MACHINES' && (item.category === 'Spare Part' || item.assignedEngineer === 'Direct Spare Part Sale')) return false;
      if (statusFilter === 'SPARES' && item.category !== 'Spare Part' && item.assignedEngineer !== 'Direct Spare Part Sale') return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          (item.customerName || '').toLowerCase().includes(q) ||
          (item.company || '').toLowerCase().includes(q) ||
          (item.purchasedProduct || '').toLowerCase().includes(q) ||
          (item.phone || '').toLowerCase().includes(q) ||
          (item.serialNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  } else if (activeTab === 'FUTURE_OPPS') {
    activeList = memberFutureOpps.filter((o) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.company || '').toLowerCase().includes(q) ||
          (o.phone || '').toLowerCase().includes(q) ||
          (o.requirement || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  } else if (activeTab === 'SERVICES') {
    activeList = memberServices.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          (s.customerName || '').toLowerCase().includes(q) ||
          (s.company || '').toLowerCase().includes(q) ||
          (s.serviceName || '').toLowerCase().includes(q) ||
          (s.product || '').toLowerCase().includes(q) ||
          (s.workDone || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE) || 1;
  const paginatedList = activeList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ========================================================
  // TABLE COLUMNS CONFIGURATIONS
  // ========================================================

  // 1. Leads Table Columns
  const leadColumns = [
    {
      header: 'Customer & Company',
      cell: (row) => (
        <div>
          <span className="font-bold text-gray-900 text-sm block">{row.customerName}</span>
          <span className="text-xs text-gray-500 font-medium">{row.company}</span>
        </div>
      )
    },
    {
      header: 'Contact Phone',
      cell: (row) => (
        <span className="text-xs font-mono font-semibold text-gray-700 flex items-center gap-1">
          <Phone className="w-3 h-3 text-gray-400" />
          {row.phone || '—'}
        </span>
      )
    },
    {
      header: 'Lead Type & Priority',
      cell: (row) => {
        const isHot = row.leadType === 'Hot Lead';
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
            isHot ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-sky-50 text-sky-700 border-sky-200'
          }`}>
            {isHot && <Flame className="w-3 h-3 text-rose-500" />}
            {row.leadType || 'Hot Lead'}
          </span>
        );
      }
    },
    {
      header: 'Interested Product / Requirement',
      cell: (row) => (
        <div className="max-w-xs">
          <span className="text-xs font-bold text-indigo-950 block truncate">
            {row.interestedProduct || row.requirement || 'Air Compressor'}
          </span>
          {row.requirement && row.interestedProduct && (
            <span className="text-[11px] text-gray-500 block truncate">{row.requirement}</span>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => {
        const colors = {
          'New': 'bg-blue-50 text-blue-700 border-blue-200',
          'In Progress': 'bg-amber-50 text-amber-800 border-amber-200',
          'Won': 'bg-emerald-50 text-emerald-800 border-emerald-200',
          'Lost': 'bg-rose-50 text-rose-800 border-rose-200',
          'Future Requirement': 'bg-purple-50 text-purple-800 border-purple-200'
        };
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${colors[row.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
            {row.status || 'New'}
          </span>
        );
      }
    },
    {
      header: 'Follow-Up Date',
      cell: (row) => (
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{row.followUpDate || '—'}</span>
        </div>
      )
    }
  ];

  // 2. Sold Items Table Columns
  const soldItemsColumns = [
    {
      header: 'Customer & Industrial Plant',
      cell: (row) => (
        <div>
          <span className="font-bold text-gray-900 text-sm block">{row.customerName}</span>
          <span className="text-xs text-gray-600 font-medium">{row.company}</span>
          {row.address && <span className="text-[10px] text-gray-400 block truncate max-w-xs">{row.address}</span>}
        </div>
      )
    },
    {
      header: 'Product / Item Dispatched',
      cell: (row) => {
        const isSpare = row.category === 'Spare Part' || row.assignedEngineer === 'Direct Spare Part Sale';
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900 text-xs">{row.purchasedProduct}</span>
              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                isSpare ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                {isSpare ? 'Spare Part' : 'Machine'}
              </span>
            </div>
            {row.serialNumber && (
              <span className="text-[10px] font-mono text-gray-500 block mt-0.5">Serial: {row.serialNumber}</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Quantity & Amount',
      cell: (row) => {
        const qty = Number(row.quantity) || 1;
        const price = Number(row.unitPrice) || 0;
        const total = price > 0 ? price * qty : 0;
        return (
          <div>
            <span className="text-xs font-black text-gray-900 block">{qty} Units</span>
            {total > 0 ? (
              <span className="text-[11px] font-bold text-emerald-700">₹{total.toLocaleString('en-IN')}</span>
            ) : (
              <span className="text-[10px] text-gray-400 font-semibold">Standard Contract</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Branch',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
          <Building2 className="w-3 h-3 text-gray-500" />
          {row.branch || member.branch || 'Surat'}
        </span>
      )
    },
    {
      header: 'Installation / Sale Date',
      cell: (row) => (
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{row.installationDate || '—'}</span>
        </div>
      )
    },
    {
      header: 'Contact Phone',
      cell: (row) => (
        <span className="text-xs font-mono font-semibold text-gray-700">
          {row.phone || '—'}
        </span>
      )
    }
  ];

  // 3. Services Table Columns (for Field Engineers)
  const serviceColumns = [
    {
      header: 'Customer & Machine Location',
      cell: (row) => (
        <div>
          <span className="font-bold text-gray-900 text-sm block">{row.customerName}</span>
          <span className="text-xs text-gray-600 font-medium">{row.company}</span>
          {row.product && <span className="text-[11px] text-indigo-900 font-bold block">{row.product}</span>}
        </div>
      )
    },
    {
      header: 'Service Routine & Title',
      cell: (row) => (
        <div>
          <span className="font-bold text-gray-900 text-xs block">{row.serviceName || 'Periodic Maintenance'}</span>
          {row.workDone ? (
            <p className="text-[11px] text-gray-500 line-clamp-1 max-w-xs mt-0.5">
              <strong className="text-gray-700">Work:</strong> {row.workDone}
            </p>
          ) : (
            <span className="text-[10px] text-gray-400 italic">No work log recorded</span>
          )}
        </div>
      )
    },
    {
      header: 'Parts Replaced',
      cell: (row) => (
        <div>
          {row.partsReplaced ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              <Wrench className="w-3 h-3 text-emerald-600" />
              {row.partsReplaced}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400 italic">None</span>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => {
        const isDone = row.status === 'Done' || row.status === 'Completed';
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${
            isDone ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
            {row.status || 'Upcoming'}
          </span>
        );
      }
    },
    {
      header: 'Scheduled / Done Date',
      cell: (row) => (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1 text-gray-700 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Sched: {row.scheduledDate || '—'}</span>
          </div>
          {row.completionDate && (
            <span className="text-[10px] text-emerald-700 font-bold block">
              Done: {row.completionDate}
            </span>
          )}
        </div>
      )
    }
  ];

  // 4. Future Opportunities Columns
  const futureOppColumns = [
    {
      header: 'Client & Company',
      cell: (row) => (
        <div>
          <span className="font-bold text-gray-900 text-sm block">{row.customerName}</span>
          <span className="text-xs text-gray-600 font-medium">{row.company}</span>
        </div>
      )
    },
    {
      header: 'Contact Phone',
      cell: (row) => (
        <span className="text-xs font-mono font-semibold text-gray-700">
          {row.phone || '—'}
        </span>
      )
    },
    {
      header: 'Expected Purchase Window',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
          <Calendar className="w-3 h-3 text-purple-600" />
          {row.expectedPurchaseMonth || 'Future Quarter'}
        </span>
      )
    },
    {
      header: 'Projected Requirement',
      cell: (row) => (
        <span className="text-xs text-gray-800 font-medium block max-w-xs">
          {row.requirement}
        </span>
      )
    },
    {
      header: 'Reminder Date',
      cell: (row) => (
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{row.reminderDate || '—'}</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate('/admin/team')}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#3B318A] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Team & Staff Directory</span>
      </button>

      {/* Member Hero Profile Banner */}
      <div className="bg-gradient-to-r from-[#3B318A] via-[#2D2570] to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl font-black text-2xl flex items-center justify-center shrink-0 border-2 shadow-inner ${
            isSales ? 'bg-indigo-600/80 text-white border-indigo-400' :
            isEng ? 'bg-teal-600/80 text-white border-teal-400' :
            'bg-purple-600/80 text-white border-purple-400'
          }`}>
            {member.name?.charAt(0) || 'U'}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-white">{member.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                isSales ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40' :
                isEng ? 'bg-teal-500/30 text-teal-200 border border-teal-400/40' :
                'bg-purple-500/30 text-purple-200 border border-purple-400/40'
              }`}>
                {member.role}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20">
                <Building2 className="w-3.5 h-3.5" />
                {member.branch} Branch
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-indigo-100 pt-1">
              <span className="flex items-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5 text-indigo-300" />
                {member.email}
              </span>
              {member.phone && (
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-indigo-300" />
                  {member.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stock Access Permission Widget */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 shrink-0">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-indigo-200 block uppercase tracking-wider">
              Warehouse Stock Access
            </span>
            <span className={`text-xs font-black block ${member.canViewStock ? 'text-emerald-300' : 'text-gray-300'}`}>
              {member.canViewStock ? 'Inventory Visible' : 'Inventory Hidden'}
            </span>
          </div>

          <Button
            size="sm"
            variant="white"
            disabled={updatingStock}
            onClick={handleToggleStock}
            className="text-xs font-bold shrink-0 cursor-pointer"
          >
            {member.canViewStock ? 'Revoke Access' : 'Grant Stock Access'}
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* KPI METRICS OVERVIEW CARDS                               */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isSales ? (
          <>
            <Card className="p-4 bg-indigo-50/60 border border-indigo-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#3B318A] uppercase">Total Leads Captured</span>
                <TrendingUp className="w-4 h-4 text-[#3B318A]" />
              </div>
              <span className="text-2xl font-black text-indigo-950 block mt-1">{memberLeads.length}</span>
              <span className="text-[10px] text-gray-500 font-semibold">{hotLeadsCount} High Priority / Hot Leads</span>
            </Card>

            <Card className="p-4 bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">Machines Sold / Installed</span>
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-950 block mt-1">{machinesSold.length} Units</span>
              <span className="text-[10px] text-emerald-700 font-semibold">Successfully commissioned</span>
            </Card>

            <Card className="p-4 bg-purple-50/60 border border-purple-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-800 uppercase">Spare Parts Dispatched</span>
                <Wrench className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-2xl font-black text-purple-950 block mt-1">
                {sparesSold.reduce((acc, s) => acc + (Number(s.quantity) || 1), 0)} Units
              </span>
              <span className="text-[10px] text-purple-700 font-bold">
                ₹{totalSpareRevenue.toLocaleString('en-IN')} Total Value
              </span>
            </Card>

            <Card className="p-4 bg-amber-50/60 border border-amber-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase">Future Opportunities</span>
                <Calendar className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-black text-amber-950 block mt-1">{memberFutureOpps.length}</span>
              <span className="text-[10px] text-gray-500 font-semibold">Deferred pipeline deals</span>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-4 bg-teal-50/60 border border-teal-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-800 uppercase">Total Assigned Services</span>
                <Wrench className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-2xl font-black text-teal-950 block mt-1">{memberServices.length}</span>
              <span className="text-[10px] text-gray-500 font-semibold">Routine & Breakdowns</span>
            </Card>

            <Card className="p-4 bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">Completed Services</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-950 block mt-1">{completedServicesCount}</span>
              <span className="text-[10px] text-emerald-700 font-semibold">Successfully serviced</span>
            </Card>

            <Card className="p-4 bg-amber-50/60 border border-amber-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase">Pending / Upcoming</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-black text-amber-950 block mt-1">{upcomingServicesCount}</span>
              <span className="text-[10px] text-amber-700 font-semibold">Scheduled client visits</span>
            </Card>

            <Card className="p-4 bg-indigo-50/60 border border-indigo-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#3B318A] uppercase">Machines & Spares Handled</span>
                <Layers className="w-4 h-4 text-[#3B318A]" />
              </div>
              <span className="text-2xl font-black text-indigo-950 block mt-1">{memberSoldItems.length}</span>
              <span className="text-[10px] text-gray-500 font-semibold">Client installations</span>
            </Card>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* WORKSPACE TABS                                           */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit">
        {isSales ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('LEADS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'LEADS'
                  ? 'bg-[#3B318A] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>All Sales Leads</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'LEADS' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {memberLeads.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SOLD_ITEMS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SOLD_ITEMS'
                  ? 'bg-[#3B318A] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Sold Items (Machines & Spares)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'SOLD_ITEMS' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {memberSoldItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FUTURE_OPPS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'FUTURE_OPPS'
                  ? 'bg-[#3B318A] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Future Opportunities</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'FUTURE_OPPS' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {memberFutureOpps.length}
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('SERVICES')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SERVICES'
                  ? 'bg-[#3B318A] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Assigned Services & Maintenance</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'SERVICES' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {memberServices.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SOLD_ITEMS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SOLD_ITEMS'
                  ? 'bg-[#3B318A] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Commissioned Machines & Dispatches</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'SOLD_ITEMS' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {memberSoldItems.length}
              </span>
            </button>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB CONTENT & TABLE CARD                                */}
      {/* ======================================================== */}
      <Card className="space-y-4 p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer, company, phone, model..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
              />
            </div>

            {activeTab === 'LEADS' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
              >
                <option value="ALL">All Statuses ({memberLeads.length})</option>
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
                <option value="Future Requirement">Future Requirement</option>
              </select>
            )}

            {activeTab === 'SERVICES' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
              >
                <option value="ALL">All Services ({memberServices.length})</option>
                <option value="Done">Completed / Done</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Pending">Pending</option>
              </select>
            )}

            {activeTab === 'SOLD_ITEMS' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
              >
                <option value="ALL">All Categories ({memberSoldItems.length})</option>
                <option value="MACHINES">Machines Only ({machinesSold.length})</option>
                <option value="SPARES">Spare Parts Only ({sparesSold.length})</option>
              </select>
            )}
          </div>
        </div>

        {/* Table Render */}
        {activeTab === 'LEADS' && (
          <Table
            columns={leadColumns}
            data={paginatedList}
            emptyMessage={`No leads found for ${member.name}.`}
          />
        )}

        {activeTab === 'SOLD_ITEMS' && (
          <Table
            columns={soldItemsColumns}
            data={paginatedList}
            emptyMessage={`No sold machines or spare parts logged for ${member.name}.`}
          />
        )}

        {activeTab === 'SERVICES' && (
          <Table
            columns={serviceColumns}
            data={paginatedList}
            emptyMessage={`No maintenance services logged for ${member.name}.`}
          />
        )}

        {activeTab === 'FUTURE_OPPS' && (
          <Table
            columns={futureOppColumns}
            data={paginatedList}
            emptyMessage={`No future opportunities logged for ${member.name}.`}
          />
        )}

        {/* Pagination Bar */}
        {activeList.length > ITEMS_PER_PAGE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
            <span className="text-gray-500 font-medium">
              Showing <strong className="text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, activeList.length)}</strong> of <strong className="text-gray-900">{activeList.length}</strong> items
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-8 px-2.5 text-xs cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === p
                        ? 'bg-[#3B318A] text-white shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 px-2.5 text-xs cursor-pointer disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
