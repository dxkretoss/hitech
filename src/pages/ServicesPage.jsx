import React, { useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { CompleteServiceModal } from '../components/services/CompleteServiceModal.jsx';
import { ScheduleServiceModal } from '../components/services/ScheduleServiceModal.jsx';
import { AddStockItemModal } from '../components/stock/AddStockItemModal.jsx';
import { AdjustStockModal } from '../components/stock/AdjustStockModal.jsx';
import { TransferStockModal } from '../components/stock/TransferStockModal.jsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  CheckCircle2,
  Calendar,
  Search,
  Wrench,
  Clock,
  ShieldCheck,
  Plus,
  FileText,
  User,
  ArrowRight,
  PackageCheck,
  Boxes,
  Building2,
  Flame,
  AlertTriangle,
  ArrowRightLeft,
  SlidersHorizontal,
  Trash2,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

export const ServicesPage = () => {
  const { currentUser, role } = useAuth();
  const userBranch = currentUser?.branch || 'Surat';
  const isAdmin = role === 'Owner' || role === 'SuperAdmin' || role === 'Admin';

  // Main View: 'SCHEDULES' | 'SPARE_PARTS_STOCK'
  const [mainView, setMainView] = useState('SCHEDULES');

  // Service Schedules state
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');

  // Spare Parts Stock state
  const [spareParts, setSpareParts] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState(isAdmin ? 'ALL' : userBranch);
  const [velocityFilter, setVelocityFilter] = useState('ALL'); // 'ALL' | 'FAST_MOVING' | 'LOW_STOCK'

  // Modals state
  const [selectedServiceToComplete, setSelectedServiceToComplete] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [viewReportService, setViewReportService] = useState(null);

  // Stock Modals
  const [addPartModalOpen, setAddPartModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [deletePartModalOpen, setDeletePartModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);

  const loadServices = async () => {
    setLoadingServices(true);
    const data = await db.getServices();
    setServices(data || []);
    setLoadingServices(false);
  };

  const loadSparePartsStock = async () => {
    setLoadingStock(true);
    const allStock = await db.getStockItems();
    const partsOnly = (allStock || []).filter((s) => s.category === 'Spare Part');
    setSpareParts(partsOnly);
    setLoadingStock(false);
  };

  useEffect(() => {
    loadServices();
    loadSparePartsStock();
  }, []);

  const handleOpenCompleteModal = (service) => {
    setSelectedServiceToComplete(service);
    setCompleteModalOpen(true);
  };

  const handleServiceCompleted = async (serviceId, report) => {
    await db.completeService(serviceId, report);
    toast.success(`Service report saved! Next service scheduled for ${report.nextServiceDate}.`);
    await loadServices();
    await loadSparePartsStock();
  };

  const handlePartAdded = async (newItemData) => {
    await db.addStockItem(newItemData);
    await loadSparePartsStock();
  };

  const handlePartAdjusted = async (id, adjustment) => {
    await db.adjustStockQuantity(id, adjustment);
    await loadSparePartsStock();
  };

  const handlePartTransferred = async (id, transferData) => {
    await db.transferStock(id, transferData);
    await loadSparePartsStock();
  };

  const handleConfirmDeletePart = async () => {
    if (selectedPart) {
      await db.deleteStockItem(selectedPart.id);
      toast.success('Spare part item deleted.');
      setDeletePartModalOpen(false);
      setSelectedPart(null);
      await loadSparePartsStock();
    }
  };

  // Helper for consumption velocity calculations
  const getConsumptionVelocity = (item) => {
    const annual = Number(item.annualConsumption) || 0;
    const monthlyRate = annual / 12;
    const currentQty = Number(item.quantity) || 0;
    const monthsRunway = monthlyRate > 0 ? (currentQty / monthlyRate).toFixed(1) : '∞';

    let velocityLabel = 'Steady Demand';
    let velocityColor = 'bg-slate-100 text-slate-700 border-slate-200';
    let isFastMoving = false;

    if (annual >= 75) {
      velocityLabel = 'Fast Moving (High Demand)';
      velocityColor = 'bg-rose-50 text-rose-700 border-rose-200';
      isFastMoving = true;
    } else if (annual < 20) {
      velocityLabel = 'Low Turnover';
      velocityColor = 'bg-gray-100 text-gray-500 border-gray-200';
    }

    const isLowStock = currentQty <= Number(item.minAlertLevel || 0) || (monthlyRate > 0 && currentQty / monthlyRate < 1);

    return {
      annual,
      monthlyRate: monthlyRate.toFixed(1),
      monthsRunway,
      velocityLabel,
      velocityColor,
      isFastMoving,
      isLowStock
    };
  };

  // Filtered Services
  const filteredServices = services.filter((s) => {
    if (activeTab !== 'All' && s.status !== activeTab) return false;
    if (!isAdmin && s.branch && s.branch !== userBranch && s.assignedEngineer !== currentUser?.name) return false;

    if (serviceSearchTerm) {
      const q = serviceSearchTerm.toLowerCase();
      return (
        (s.customerName || '').toLowerCase().includes(q) ||
        (s.company || '').toLowerCase().includes(q) ||
        (s.branch || '').toLowerCase().includes(q) ||
        (s.product || '').toLowerCase().includes(q) ||
        (s.serviceName || '').toLowerCase().includes(q) ||
        (s.assignedEngineer || '').toLowerCase().includes(q) ||
        (s.workDone || '').toLowerCase().includes(q) ||
        (s.partsReplaced || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Spare Parts Stock
  const filteredSpareParts = spareParts.filter((item) => {
    if (!isAdmin) {
      if (item.branch !== userBranch) return false;
    } else if (branchFilter !== 'ALL') {
      if (item.branch !== branchFilter) return false;
    }

    const vel = getConsumptionVelocity(item);
    if (velocityFilter === 'FAST_MOVING' && !vel.isFastMoving) return false;
    if (velocityFilter === 'LOW_STOCK' && !vel.isLowStock) return false;

    if (stockSearchTerm) {
      const q = stockSearchTerm.toLowerCase();
      return (
        (item.itemName || '').toLowerCase().includes(q) ||
        (item.partNumber || '').toLowerCase().includes(q) ||
        (item.branch || '').toLowerCase().includes(q) ||
        (item.compatibleModels || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countUpcoming = services.filter((s) => s.status === 'Upcoming').length;
  const countCompleted = services.filter((s) => s.status === 'Completed').length;

  const totalSpareUnits = spareParts.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
  const lowStockPartsCount = spareParts.filter((p) => getConsumptionVelocity(p).isLowStock).length;
  const suratPartsCount = spareParts.filter((p) => p.branch === 'Surat').length;
  const morbiPartsCount = spareParts.filter((p) => p.branch === 'Morbi').length;
  const rajkotPartsCount = spareParts.filter((p) => p.branch === 'Rajkot').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success">Completed</Badge>;
      case 'In Progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'Upcoming':
        return <Badge variant="info">Upcoming Service</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const serviceColumns = [
    {
      header: 'Customer & Company',
      cell: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.customerName}</p>
          <p className="text-xs text-gray-500">{row.company || 'Industrial Client'}</p>
        </div>
      )
    },
    {
      header: 'Equipment & Service Title',
      cell: (row) => (
        <div>
          <p className="font-bold text-[#3B318A] text-xs flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-[#3B318A]" />
            {row.serviceName}
          </p>
          <p className="text-[11px] text-gray-500">{row.product || '50 HP Screw Air Compressor'}</p>
        </div>
      )
    },
    {
      header: 'Service Date',
      cell: (row) => (
        <div className="text-xs">
          {row.status === 'Completed' ? (
            <div>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Done: {row.completionDate || row.scheduledDate}
              </span>
              {row.nextServiceDate && (
                <span className="text-[11px] text-indigo-700 block mt-0.5 font-semibold">
                  Next Due: {row.nextServiceDate}
                </span>
              )}
            </div>
          ) : (
            <span className="font-bold text-slate-800 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg w-fit">
              <Calendar className="w-3.5 h-3.5 text-[#3B318A]" />
              Due: {row.scheduledDate}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Work Done / Parts Changed',
      cell: (row) => (
        <div className="max-w-[200px]">
          {row.status === 'Completed' ? (
            <div>
              {row.partsReplaced ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[190px]">
                  <PackageCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  {row.partsReplaced}
                </span>
              ) : row.workDone ? (
                <p className="text-xs text-gray-700 truncate" title={row.workDone}>
                  {row.workDone}
                </p>
              ) : (
                <span className="text-xs text-gray-400">Standard Service</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">Pending service execution</span>
          )}
        </div>
      )
    },
    {
      header: 'Field Engineer',
      cell: (row) => (
        <span className="text-xs font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
          <User className="w-3 h-3 text-emerald-700" />
          {row.assignedEngineer || 'Sanjay Patel'}
        </span>
      )
    },
    {
      header: 'Status',
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status !== 'Completed' ? (
            <Button
              size="sm"
              variant="success"
              icon={CheckCircle2}
              onClick={() => handleOpenCompleteModal(row)}
            >
              Log Work & Complete
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              icon={FileText}
              onClick={() => setViewReportService(row)}
            >
              View Report
            </Button>
          )}
        </div>
      )
    }
  ];

  const stockColumns = [
    {
      header: 'Spare Part & SKU Code',
      cell: (row) => (
        <div>
          <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-emerald-600" />
            {row.itemName}
          </span>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            SKU: <strong className="text-gray-700">{row.partNumber}</strong>
            {row.compatibleModels && <span className="ml-2 text-gray-400">({row.compatibleModels})</span>}
          </p>
        </div>
      )
    },
    {
      header: 'Branch Warehouse',
      cell: (row) => {
        const colors = {
          Surat: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          Morbi: 'bg-amber-50 text-amber-900 border-amber-200',
          Rajkot: 'bg-teal-50 text-teal-800 border-teal-200'
        };
        return (
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${colors[row.branch] || 'bg-gray-50'}`}>
            <Building2 className="w-3.5 h-3.5" />
            {row.branch}
          </span>
        );
      }
    },
    {
      header: 'Available Stock',
      cell: (row) => {
        const vel = getConsumptionVelocity(row);
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-base font-black ${vel.isLowStock ? 'text-rose-600' : 'text-gray-900'}`}>
                {row.quantity}
              </span>
              <span className="text-xs font-semibold text-gray-500">{row.unit}</span>
              {vel.isLowStock && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Low Stock
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 block">Min Alert Level: {row.minAlertLevel || 0}</span>
          </div>
        );
      }
    },
    {
      header: '1-Year Consumption & Velocity',
      cell: (row) => {
        const vel = getConsumptionVelocity(row);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">
                {vel.annual} {row.unit}/yr
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${vel.velocityColor} flex items-center gap-0.5`}>
                {vel.isFastMoving && <Flame className="w-3 h-3 text-rose-500 shrink-0" />}
                {vel.velocityLabel}
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Avg: <strong>~{vel.monthlyRate} {row.unit}/mo</strong> | Runway: <strong>{vel.monthsRunway} mo</strong>
            </p>
          </div>
        );
      }
    },
    {
      header: 'Est. Unit Price',
      cell: (row) => (
        <span className="text-xs font-bold text-gray-700">
          {row.unitPrice ? `₹${Number(row.unitPrice).toLocaleString('en-IN')}` : '—'}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            icon={SlidersHorizontal}
            onClick={() => {
              setSelectedPart(row);
              setAdjustModalOpen(true);
            }}
            title="Adjust Stock Qty"
          >
            Adjust
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={ArrowRightLeft}
            onClick={() => {
              setSelectedPart(row);
              setTransferModalOpen(true);
            }}
            title="Transfer to another Branch"
          >
            Transfer
          </Button>

          <button
            onClick={() => {
              setSelectedPart(row);
              setDeletePartModalOpen(true);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Part"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-400" />
            Field Engineer Service & Branch Spare Parts Stock
          </h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-2xl">
            Engineers record service work done, parts replaced (e.g. Air filter), next service dates, and track <strong>Surat, Morbi, Rajkot Branch Spare Parts Stock & 1-Year Consumption Velocity</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {mainView === 'SCHEDULES' ? (
            <Button onClick={() => setScheduleModalOpen(true)} variant="white" icon={Plus}>
              Schedule Service
            </Button>
          ) : (
            <Button onClick={() => setAddPartModalOpen(true)} variant="white" icon={Plus}>
              Add Spare Part
            </Button>
          )}
        </div>
      </div>

      {/* Primary Workspace View Switcher Tabs */}
      <div className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setMainView('SCHEDULES')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            mainView === 'SCHEDULES'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Service Schedules & Work History ({services.length})
        </button>

        <button
          onClick={() => setMainView('SPARE_PARTS_STOCK')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            mainView === 'SPARE_PARTS_STOCK'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Branch Spare Parts Stock & 1-Yr Consumption ({spareParts.length})
        </button>
      </div>

      {/* VIEW 1: SERVICE SCHEDULES */}
      {mainView === 'SCHEDULES' && (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('All')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'All'
                  ? 'bg-[#3B318A] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Services ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('Upcoming')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'Upcoming'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Upcoming ({countUpcoming})
            </button>
            <button
              onClick={() => setActiveTab('Completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'Completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Completed Reports ({countCompleted})
            </button>
          </div>

          <Card className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={serviceSearchTerm}
                onChange={(e) => setServiceSearchTerm(e.target.value)}
                placeholder="Search service schedule by customer, company, parts changed, work done..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
              />
            </div>

            {loadingServices ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading service schedules...</div>
            ) : (
              <Table columns={serviceColumns} data={filteredServices} emptyMessage="No service schedule records found." />
            )}
          </Card>
        </div>
      )}

      {/* VIEW 2: BRANCH SPARE PARTS STOCK & 1-YEAR CONSUMPTION */}
      {mainView === 'SPARE_PARTS_STOCK' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">Total Spare Parts</span>
                <Wrench className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-950 block mt-1">{totalSpareUnits}</span>
              <span className="text-[10px] text-gray-500">Filters, Oil, Belts, Valves</span>
            </Card>

            <Card className="p-4 bg-indigo-50/60 border border-indigo-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#3B318A] uppercase">Branch Distribution</span>
                <Building2 className="w-4 h-4 text-[#3B318A]" />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-indigo-950">
                <span>Surat: {suratPartsCount}</span>
                <span>•</span>
                <span>Morbi: {morbiPartsCount}</span>
                <span>•</span>
                <span>Rajkot: {rajkotPartsCount}</span>
              </div>
              <span className="text-[10px] text-gray-500">Stock per branch warehouse</span>
            </Card>

            <Card className="p-4 bg-rose-50/60 border border-rose-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-800 uppercase">Fast-Moving Items</span>
                <Flame className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-2xl font-black text-rose-700 block mt-1">
                {spareParts.filter((p) => getConsumptionVelocity(p).isFastMoving).length}
              </span>
              <span className="text-[10px] text-rose-600 font-semibold">High 1-Yr consumption</span>
            </Card>

            <Card className="p-4 bg-red-50/60 border border-red-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-red-800 uppercase">Reorder Alerts</span>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-2xl font-black text-red-700 block mt-1">{lowStockPartsCount}</span>
              <span className="text-[10px] text-red-600 font-semibold">Below safety runway</span>
            </Card>
          </div>

          {/* Branch & Velocity Filter Tabs */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
              <button
                onClick={() => setBranchFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  branchFilter === 'ALL'
                    ? 'bg-[#3B318A] text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                All Branches ({spareParts.length})
              </button>
              <button
                onClick={() => setBranchFilter('Surat')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  branchFilter === 'Surat'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Surat ({suratPartsCount})
              </button>
              <button
                onClick={() => setBranchFilter('Morbi')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  branchFilter === 'Morbi'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Morbi ({morbiPartsCount})
              </button>
              <button
                onClick={() => setBranchFilter('Rajkot')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  branchFilter === 'Rajkot'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Rajkot ({rajkotPartsCount})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setVelocityFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  velocityFilter === 'ALL'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Parts
              </button>
              <button
                onClick={() => setVelocityFilter('FAST_MOVING')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  velocityFilter === 'FAST_MOVING'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <Flame className="w-3 h-3 text-rose-500" />
                High 1-Yr Consumption (Fast Moving)
              </button>
              <button
                onClick={() => setVelocityFilter('LOW_STOCK')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  velocityFilter === 'LOW_STOCK'
                    ? 'bg-red-700 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-red-600" />
                Reorder Alerts ({lowStockPartsCount})
              </button>
            </div>
          </div>

          <Card className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={stockSearchTerm}
                onChange={(e) => setStockSearchTerm(e.target.value)}
                placeholder="Search spare parts by name, SKU, branch, compatible models..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
              />
            </div>

            {loadingStock ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading branch spare parts inventory...</div>
            ) : (
              <Table columns={stockColumns} data={filteredSpareParts} emptyMessage="No spare parts found matching filter criteria." />
            )}
          </Card>
        </div>
      )}

      {/* Engineer Complete Service Modal */}
      <CompleteServiceModal
        isOpen={completeModalOpen}
        onClose={() => {
          setCompleteModalOpen(false);
          setSelectedServiceToComplete(null);
        }}
        service={selectedServiceToComplete}
        onServiceCompleted={handleServiceCompleted}
      />

      {/* Schedule Service Modal */}
      <ScheduleServiceModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onServiceCreated={loadServices}
      />

      {/* Add Spare Part Modal */}
      <AddStockItemModal
        isOpen={addPartModalOpen}
        onClose={() => setAddPartModalOpen(false)}
        onStockAdded={handlePartAdded}
        defaultBranch={branchFilter !== 'ALL' ? branchFilter : 'Surat'}
      />

      {/* Adjust Spare Part Quantity Modal */}
      <AdjustStockModal
        isOpen={adjustModalOpen}
        onClose={() => {
          setAdjustModalOpen(false);
          setSelectedPart(null);
        }}
        item={selectedPart}
        onStockAdjusted={handlePartAdjusted}
      />

      {/* Inter-Branch Transfer Modal */}
      <TransferStockModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setSelectedPart(null);
        }}
        item={selectedPart}
        onStockTransferred={handlePartTransferred}
      />

      {/* Delete Spare Part Confirmation Modal */}
      <ConfirmModal
        isOpen={deletePartModalOpen}
        onClose={() => {
          setDeletePartModalOpen(false);
          setSelectedPart(null);
        }}
        onConfirm={handleConfirmDeletePart}
        title="Delete Spare Part?"
        description={
          selectedPart ? (
            <span>
              Are you sure you want to delete <strong className="text-gray-900">{selectedPart.itemName}</strong> ({selectedPart.partNumber}) from {selectedPart.branch} branch inventory?
            </span>
          ) : (
            'Delete this item?'
          )
        }
        confirmText="Yes, Delete Part"
        cancelText="Cancel"
        variant="danger"
      />

      {/* View Service Report Details Modal */}
      {viewReportService && (
        <Modal
          isOpen={!!viewReportService}
          onClose={() => setViewReportService(null)}
          title="Field Engineer Completed Service Report"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {viewReportService.serviceName}
                </h4>
                <Badge variant="success">Completed</Badge>
              </div>
              <p className="text-xs text-emerald-800">
                Customer: <strong>{viewReportService.customerName}</strong> ({viewReportService.company})
              </p>
              <p className="text-xs text-emerald-800">
                Equipment: <strong>{viewReportService.product}</strong>
              </p>
            </div>

            <div className="space-y-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-500 font-bold uppercase block">Work Done / Actions Performed:</span>
                <p className="text-gray-900 font-medium text-sm mt-0.5">{viewReportService.workDone || 'General maintenance check.'}</p>
              </div>

              {viewReportService.partsReplaced && (
                <div>
                  <span className="text-gray-500 font-bold uppercase block">Parts & Consumables Replaced:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md mt-0.5">
                    <PackageCheck className="w-3.5 h-3.5" />
                    {viewReportService.partsReplaced}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                <div>
                  <span className="text-gray-500 font-bold uppercase block">Completion Date:</span>
                  <span className="text-gray-900 font-bold">{viewReportService.completionDate || viewReportService.scheduledDate}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold uppercase block">Next Scheduled Service Date:</span>
                  <span className="text-[#3B318A] font-black">{viewReportService.nextServiceDate || 'Not specified'}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-bold uppercase block">Servicing Engineer:</span>
                <span className="text-gray-900 font-semibold">{viewReportService.assignedEngineer}</span>
              </div>

              {viewReportService.engineerNotes && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500 font-bold uppercase block">Engineer Site Notes / Advice:</span>
                  <p className="text-gray-800 italic mt-0.5">{viewReportService.engineerNotes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setViewReportService(null)}>
                Close Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
