import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { CompleteServiceModal } from '../components/services/CompleteServiceModal.jsx';
import { ScheduleServiceModal } from '../components/services/ScheduleServiceModal.jsx';
import { NewInstallationModal } from '../components/services/NewInstallationModal.jsx';
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
  Layers,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';

export const ServicesPage = () => {
  const { currentUser, role } = useAuth();
  const userBranch = currentUser?.branch || 'Surat';
  const isAdmin = role === 'Owner' || role === 'SuperAdmin' || role === 'Admin';
  const hasStockAccess = isAdmin || currentUser?.canViewStock === true;
  const canAddMachine = isAdmin || currentUser?.canViewStock === true || currentUser?.canAddMachine === true;

  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');

  // Derive initial mainView from URL search param (?tab=schedules | installations | spare-parts)
  const getInitialView = () => {
    if (currentTabParam === 'installations') return 'INSTALLATIONS';
    if ((currentTabParam === 'spare-parts' || currentTabParam === 'spares' || currentTabParam === 'stock') && hasStockAccess) return 'SPARE_PARTS_STOCK';
    return 'SCHEDULES';
  };

  // Main View: 'SCHEDULES' | 'INSTALLATIONS' | 'SPARE_PARTS_STOCK'
  const [mainView, setMainView] = useState(getInitialView);

  // Sync state if URL query param changes
  useEffect(() => {
    if (currentTabParam === 'installations') {
      setMainView('INSTALLATIONS');
    } else if ((currentTabParam === 'spare-parts' || currentTabParam === 'spares' || currentTabParam === 'stock') && hasStockAccess) {
      setMainView('SPARE_PARTS_STOCK');
    } else if (currentTabParam === 'schedules') {
      setMainView('SCHEDULES');
    }
  }, [currentTabParam, hasStockAccess]);

  const handleTabChange = (viewKey) => {
    setMainView(viewKey);
    let tabSlug = 'schedules';
    if (viewKey === 'INSTALLATIONS') tabSlug = 'installations';
    if (viewKey === 'SPARE_PARTS_STOCK') tabSlug = 'spare-parts';

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabSlug);
      return next;
    }, { replace: true });
  };

  // Service Schedules state
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');

  // Machine Installations state
  const [installations, setInstallations] = useState([]);
  const [loadingInstallations, setLoadingInstallations] = useState(true);
  const [installationSearchTerm, setInstallationSearchTerm] = useState('');
  const [installationBranchFilter, setInstallationBranchFilter] = useState('ALL');
  const [installationStatusFilter, setInstallationStatusFilter] = useState('ALL'); // 'ALL' | 'COMMISSIONED' | 'PENDING'

  // Spare Parts Stock state
  const [spareParts, setSpareParts] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [velocityFilter, setVelocityFilter] = useState('ALL'); // 'ALL' | 'FAST_MOVING' | 'LOW_STOCK'

  // Modals state
  const [selectedServiceToComplete, setSelectedServiceToComplete] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [newInstallationModalOpen, setNewInstallationModalOpen] = useState(false);
  const [viewReportService, setViewReportService] = useState(null);

  // Machine Installation Delete Modal
  const [deleteInstallationModalOpen, setDeleteInstallationModalOpen] = useState(false);
  const [selectedInstallationToDelete, setSelectedInstallationToDelete] = useState(null);

  // Stock Modals
  const [addPartModalOpen, setAddPartModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [deletePartModalOpen, setDeletePartModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);

  const loadServices = async () => {
    setLoadingServices(true);
    const data = await db.getServices(currentUser);
    setServices(data || []);
    setLoadingServices(false);
  };

  const loadInstallations = async () => {
    setLoadingInstallations(true);
    const data = await db.getCustomers(currentUser);
    setInstallations(data || []);
    setLoadingInstallations(false);
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
    loadInstallations();
    loadSparePartsStock();
  }, [currentUser, role]);

  const handleOpenCompleteModal = (service) => {
    setSelectedServiceToComplete(service);
    setCompleteModalOpen(true);
  };

  const handleServiceCompleted = async (serviceId, report) => {
    await db.completeService(serviceId, report);
    toast.success(`Service report saved! Next service scheduled for ${report.nextServiceDate}.`);
    await loadServices();
    await loadInstallations();
    await loadSparePartsStock();
  };

  const handleInstallationCreated = async () => {
    await loadInstallations();
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

  const handleConfirmDeleteInstallation = async () => {
    if (selectedInstallationToDelete) {
      await db.deleteCustomer(selectedInstallationToDelete.id);
      toast.success(`Machine installation details for ${selectedInstallationToDelete.customerName} deleted.`);
      setDeleteInstallationModalOpen(false);
      setSelectedInstallationToDelete(null);
      await loadInstallations();
      await loadServices();
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

  // Helper for service date urgency (<=3 days = Red, <=7 days = Orange)
  const getServiceDateUrgency = (dateStr) => {
    if (!dateStr) {
      return {
        color: 'slate',
        text: 'No Date',
        days: null,
        isRed: false,
        isOrange: false,
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        pillClass: 'bg-slate-200 text-slate-700'
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    if (isNaN(target.getTime())) {
      return {
        color: 'slate',
        text: dateStr,
        days: null,
        isRed: false,
        isOrange: false,
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        pillClass: 'bg-slate-200 text-slate-700'
      };
    }

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        color: 'red',
        text: `${Math.abs(diffDays)}d Overdue`,
        days: diffDays,
        isRed: true,
        isOrange: false,
        badgeClass: 'bg-red-50 text-red-700 border-red-300 shadow-xs',
        pillClass: 'bg-red-100 text-red-800'
      };
    } else if (diffDays === 0) {
      return {
        color: 'red',
        text: 'Due Today',
        days: 0,
        isRed: true,
        isOrange: false,
        badgeClass: 'bg-red-50 text-red-700 border-red-300 shadow-xs',
        pillClass: 'bg-red-100 text-red-800'
      };
    } else if (diffDays <= 3) {
      return {
        color: 'red',
        text: `${diffDays} Day${diffDays === 1 ? '' : 's'} Left`,
        days: diffDays,
        isRed: true,
        isOrange: false,
        badgeClass: 'bg-red-50 text-red-700 border-red-300 shadow-xs',
        pillClass: 'bg-red-100 text-red-800'
      };
    } else if (diffDays <= 7) {
      return {
        color: 'orange',
        text: `${diffDays} Days Left (1 Wk)`,
        days: diffDays,
        isRed: false,
        isOrange: true,
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs',
        pillClass: 'bg-amber-100 text-amber-900'
      };
    } else {
      return {
        color: 'slate',
        text: `In ${diffDays} Days`,
        days: diffDays,
        isRed: false,
        isOrange: false,
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        pillClass: 'bg-slate-200 text-slate-700'
      };
    }
  };

  // Filtered Services (Newest data always shows first)
  const filteredServices = services
    .filter((s) => {
      if (activeTab === 'Urgent') {
        if (s.status === 'Completed' || !s.scheduledDate) return false;
        return getServiceDateUrgency(s.scheduledDate).isRed;
      }
      if (activeTab === 'Week') {
        if (s.status === 'Completed' || !s.scheduledDate) return false;
        return getServiceDateUrgency(s.scheduledDate).isOrange;
      }
      if (activeTab !== 'All' && s.status !== activeTab) return false;

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
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

  // Base machine installations (show ONLY data added/recorded by this user; for Admin: show all)
  const userInstallations = installations
    .filter((inst) => {
      if (isAdmin) return true;
      if (!currentUser) return false;
      const name = (currentUser.name || '').toLowerCase();
      const salesName = (inst.salesPersonName || '').toLowerCase();
      const salesId = inst.salesPersonId || '';
      return (
        salesId === currentUser.id ||
        (salesName && (salesName.includes(name) || name.includes(salesName)))
      );
    })
    .sort((a, b) => {
      const timeA = a.installationDate ? new Date(a.installationDate).getTime() : 0;
      const timeB = b.installationDate ? new Date(b.installationDate).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

  // Filtered Machine Installations
  const filteredInstallations = userInstallations.filter((inst) => {
    if (installationBranchFilter !== 'ALL') {
      if ((inst.branch || 'Surat') !== installationBranchFilter) return false;
    }

    // Status filter
    const initialSrv = services.find((s) => s.customerId === inst.id || s.customerName === inst.customerName);
    const isCompleted = initialSrv?.status === 'Completed';

    if (installationStatusFilter === 'COMMISSIONED' && !isCompleted) return false;
    if (installationStatusFilter === 'PENDING' && isCompleted) return false;

    if (installationSearchTerm) {
      const q = installationSearchTerm.toLowerCase();
      return (
        (inst.customerName || '').toLowerCase().includes(q) ||
        (inst.company || '').toLowerCase().includes(q) ||
        (inst.purchasedProduct || '').toLowerCase().includes(q) ||
        (inst.assignedEngineer || '').toLowerCase().includes(q) ||
        (inst.phone || '').includes(q) ||
        (inst.address || '').toLowerCase().includes(q) ||
        (inst.branch || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Base spare parts (Engineer only sees their branch warehouse spare parts; Admin sees all)
  const userSpareParts = spareParts.filter((item) => {
    if (isAdmin) return true;
    return item.branch === userBranch;
  });

  // Filtered Spare Parts Stock
  const filteredSpareParts = userSpareParts.filter((item) => {
    if (isAdmin && branchFilter !== 'ALL') {
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
  const countUrgentRed = services.filter((s) => s.status !== 'Completed' && s.scheduledDate && getServiceDateUrgency(s.scheduledDate).isRed).length;
  const countOneWeekOrange = services.filter((s) => s.status !== 'Completed' && s.scheduledDate && getServiceDateUrgency(s.scheduledDate).isOrange).length;

  const totalSpareUnits = userSpareParts.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
  const lowStockPartsCount = userSpareParts.filter((p) => getConsumptionVelocity(p).isLowStock).length;
  const fastMovingPartsCount = userSpareParts.filter((p) => getConsumptionVelocity(p).isFastMoving).length;
  const suratPartsCount = userSpareParts.filter((p) => p.branch === 'Surat').length;
  const morbiPartsCount = userSpareParts.filter((p) => p.branch === 'Morbi').length;
  const rajkotPartsCount = userSpareParts.filter((p) => p.branch === 'Rajkot').length;

  // Installation metrics
  const suratInstallCount = userInstallations.filter((i) => (i.branch || 'Surat') === 'Surat').length;
  const morbiInstallCount = userInstallations.filter((i) => i.branch === 'Morbi').length;
  const rajkotInstallCount = userInstallations.filter((i) => i.branch === 'Rajkot').length;
  const commissionedCount = userInstallations.filter((i) => {
    const srv = services.find((s) => s.customerId === i.id || s.customerName === i.customerName);
    return srv?.status === 'Completed';
  }).length;

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
      cell: (row) => {
        if (row.status === 'Completed') {
          const nextUrgency = row.nextServiceDate ? getServiceDateUrgency(row.nextServiceDate) : null;
          return (
            <div className="text-xs space-y-1">
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Done: {row.completionDate || row.scheduledDate}
              </span>
              {row.nextServiceDate && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${nextUrgency ? nextUrgency.badgeClass : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                  Next Due: {row.nextServiceDate} {nextUrgency ? `(${nextUrgency.text})` : ''}
                </span>
              )}
            </div>
          );
        }

        const urgency = getServiceDateUrgency(row.scheduledDate);
        return (
          <div className="text-xs space-y-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold ${urgency.badgeClass}`}>
              {urgency.isRed ? (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              ) : urgency.isOrange ? (
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              ) : (
                <Calendar className="w-3.5 h-3.5 text-[#3B318A] shrink-0" />
              )}
              Due: {row.scheduledDate}
            </span>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] uppercase font-black tracking-wide px-1.5 py-0.5 rounded ${urgency.pillClass}`}>
                {urgency.text}
              </span>
            </div>
          </div>
        );
      }
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

  const installationColumns = [
    {
      header: 'Customer & Plant Site',
      cell: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.customerName}</p>
          <p className="text-xs text-[#3B318A] font-semibold">{row.company}</p>
          {row.address && (
            <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[220px]" title={row.address}>
              {row.address}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Installed Machine Model',
      cell: (row) => (
        <div>
          <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-emerald-600" />
            {row.purchasedProduct || '50 HP Screw Air Compressor'}
          </span>
          {row.serialNumber && (
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">S/N: {row.serialNumber}</p>
          )}
        </div>
      )
    },
    {
      header: 'Branch',
      cell: (row) => {
        const colors = {
          Surat: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          Morbi: 'bg-amber-50 text-amber-900 border-amber-200',
          Rajkot: 'bg-teal-50 text-teal-800 border-teal-200'
        };
        const branchName = row.branch || 'Surat';
        return (
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${colors[branchName] || 'bg-gray-50'}`}>
            <Building2 className="w-3.5 h-3.5" />
            {branchName}
          </span>
        );
      }
    },
    {
      header: 'Contact Phone',
      cell: (row) => <span className="text-xs font-semibold text-gray-700">{row.phone}</span>
    },
    {
      header: 'Installation Date',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-[#3B318A]" />
          {row.installationDate}
        </span>
      )
    },
    {
      header: 'Assigned Field Engineer',
      cell: (row) => (
        <span className="text-xs font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
          <User className="w-3 h-3 text-emerald-700" />
          {row.assignedEngineer || 'Sanjay Patel'}
        </span>
      )
    },
    {
      header: 'Commissioning Status',
      cell: (row) => {
        const initialSrv = services.find((s) => s.customerId === row.id || s.customerName === row.customerName);
        const isCompleted = initialSrv?.status === 'Completed';

        if (isCompleted) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Commissioned
            </span>
          );
        }

        const srvDate = initialSrv?.scheduledDate || row.nextServiceDate || row.installationDate;
        const urgency = getServiceDateUrgency(srvDate);

        return (
          <div className="space-y-1">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold border px-2.5 py-0.5 rounded-full ${urgency.badgeClass}`}>
              {urgency.isRed ? (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              ) : urgency.isOrange ? (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              )}
              1st Inspection Due
            </span>
            <span className={`text-[10px] font-bold block ${urgency.isRed ? 'text-red-600' : urgency.isOrange ? 'text-amber-700' : 'text-gray-500'}`}>
              {urgency.text} ({srvDate})
            </span>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      cell: (row) => {
        const initialSrv = services.find((s) => s.customerId === row.id || s.customerName === row.customerName);
        const isCompleted = initialSrv?.status === 'Completed';

        return (
          <div className="flex items-center gap-1.5">
            {initialSrv && !isCompleted ? (
              <Button
                size="sm"
                variant="success"
                icon={CheckCircle2}
                onClick={() => handleOpenCompleteModal(initialSrv)}
              >
                Log 1st Service
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                icon={Plus}
                onClick={() => setScheduleModalOpen(true)}
              >
                Schedule Service
              </Button>
            )}

            <button
              onClick={() => {
                setSelectedInstallationToDelete(row);
                setDeleteInstallationModalOpen(true);
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Delete Machine Details"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
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
            <strong className="text-gray-700">{row.partNumber}</strong>
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
      cell: (row) => {
        if (isAdmin) {
          return (
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
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Delete Part"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        }

        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Stock Available
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/10 shrink-0 mt-0.5 sm:mt-1">
            <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-black text-white leading-snug">
              Field Engineering, Installations & Spares Center
            </h1>
            <p className="text-xs text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              Register <strong>New Machine Installations</strong>, record commissioning & service reports, schedule preventative maintenance, and manage branch spare parts inventory.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          {mainView === 'SCHEDULES' && (
            <Button onClick={() => setScheduleModalOpen(true)} variant="white" icon={Plus} className="w-full sm:w-auto">
              Schedule Service
            </Button>
          )}
          {mainView === 'INSTALLATIONS' && canAddMachine && (
            <Button onClick={() => setNewInstallationModalOpen(true)} variant="white" icon={Plus} className="w-full sm:w-auto">
              Record New Installation
            </Button>
          )}
          {mainView === 'SPARE_PARTS_STOCK' && isAdmin && (
            <Button onClick={() => setAddPartModalOpen(true)} variant="white" icon={Plus} className="w-full sm:w-auto">
              Add Spare Part
            </Button>
          )}
        </div>
      </div>

      {/* Primary Workspace View Switcher Tabs (3 tabs) */}
      <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto max-w-full scrollbar-none">
        <button
          onClick={() => handleTabChange('SCHEDULES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            mainView === 'SCHEDULES'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Service Schedules & Work History ({services.length})
        </button>

        <button
          onClick={() => handleTabChange('INSTALLATIONS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            mainView === 'INSTALLATIONS'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          New Machine Installations ({userInstallations.length})
        </button>

        {hasStockAccess && (
          <button
            onClick={() => handleTabChange('SPARE_PARTS_STOCK')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              mainView === 'SPARE_PARTS_STOCK'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            {isAdmin ? 'Branch Spare Parts Stock & 1-Yr Consumption' : `${userBranch} Branch Spare Parts Stock`} ({userSpareParts.length})
          </button>
        )}
      </div>

      {/* VIEW 1: SERVICE SCHEDULES */}
      {mainView === 'SCHEDULES' && (
        <div className="space-y-4">
          {/* Quick Schedule Urgency Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Card
              onClick={() => setActiveTab('All')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'All' ? 'ring-2 ring-emerald-600 bg-emerald-50/70 border-emerald-300' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Total Services</span>
                <Calendar className="w-4 h-4 text-emerald-700" />
              </div>
              <span className="text-2xl font-black text-gray-900 block mt-1">{services.length}</span>
              <span className="text-[10px] text-gray-400">All registered schedules</span>
            </Card>

            <Card
              onClick={() => setActiveTab('Urgent')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'Urgent' ? 'ring-2 ring-red-600 bg-red-100/80 border-red-300' : 'bg-red-50/60 border-red-200 hover:bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-red-800 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                  Urgent (≤3 Days)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              </div>
              <span className="text-2xl font-black text-red-700 block mt-1">{countUrgentRed}</span>
              <span className="text-[10px] font-semibold text-red-600">Due today or within 3 days</span>
            </Card>

            <Card
              onClick={() => setActiveTab('Week')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'Week' ? 'ring-2 ring-amber-600 bg-amber-100/80 border-amber-300' : 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Due in 1 Week
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <span className="text-2xl font-black text-amber-800 block mt-1">{countOneWeekOrange}</span>
              <span className="text-[10px] font-semibold text-amber-700">Due within 4-7 days</span>
            </Card>

            <Card
              onClick={() => setActiveTab('Completed')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'Completed' ? 'ring-2 ring-emerald-600 bg-emerald-100/80 border-emerald-300' : 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Completed Reports</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-800 block mt-1">{countCompleted}</span>
              <span className="text-[10px] text-gray-500">Service logs recorded</span>
            </Card>
          </div>

          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={serviceSearchTerm}
                  onChange={(e) => setServiceSearchTerm(e.target.value)}
                  placeholder="Search service schedule by customer, company, parts changed, work done..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
                />
              </div>

              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-[#3B318A] outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer shadow-2xs"
              >
                <option value="All">All Services ({services.length})</option>
                <option value="Urgent">Urgent Due (≤3 Days) ({countUrgentRed})</option>
                <option value="Week">Due in 1 Week ({countOneWeekOrange})</option>
                <option value="Upcoming">Upcoming ({countUpcoming})</option>
                <option value="Completed">Completed Reports ({countCompleted})</option>
              </select>
            </div>

            {loadingServices ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading service schedules...</div>
            ) : (
              <Table columns={serviceColumns} data={filteredServices} emptyMessage="No service schedule records found." />
            )}
          </Card>
        </div>
      )}

      {/* VIEW 2: NEW MACHINE INSTALLATIONS */}
      {mainView === 'INSTALLATIONS' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">Total Machine Installations</span>
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-950 block mt-1">{userInstallations.length}</span>
              <span className="text-[10px] text-gray-500">{isAdmin ? 'Across all branch accounts' : 'Registered by you'}</span>
            </Card>

            <Card className="p-4 bg-indigo-50/60 border border-indigo-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#3B318A] uppercase">Branch Distribution</span>
                <Building2 className="w-4 h-4 text-[#3B318A]" />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-indigo-950">
                <span>Surat: {suratInstallCount}</span>
                <span>•</span>
                <span>Morbi: {morbiInstallCount}</span>
                <span>•</span>
                <span>Rajkot: {rajkotInstallCount}</span>
              </div>
              <span className="text-[10px] text-gray-500">Client plant sites</span>
            </Card>

            <Card className="p-4 bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">Commissioned Units</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-700 block mt-1">{commissionedCount}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">1st inspection verified</span>
            </Card>

            <Card className="p-4 bg-amber-50/60 border border-amber-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase">Pending 1st Service</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-black text-amber-700 block mt-1">{userInstallations.length - commissionedCount}</span>
              <span className="text-[10px] text-amber-600 font-semibold">Action needed</span>
            </Card>
          </div>

          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={installationSearchTerm}
                  onChange={(e) => setInstallationSearchTerm(e.target.value)}
                  placeholder="Search installations by customer, company, machine model, engineer, address..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
                />
              </div>

              <select
                value={installationBranchFilter}
                onChange={(e) => setInstallationBranchFilter(e.target.value)}
                className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
              >
                <option value="ALL">All Branches ({userInstallations.length})</option>
                <option value="Surat">Surat ({suratInstallCount})</option>
                <option value="Morbi">Morbi ({morbiInstallCount})</option>
                <option value="Rajkot">Rajkot ({rajkotInstallCount})</option>
              </select>

              <select
                value={installationStatusFilter}
                onChange={(e) => setInstallationStatusFilter(e.target.value)}
                className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-[#3B318A] outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="COMMISSIONED">Commissioned & Serviced ({commissionedCount})</option>
                <option value="PENDING">Pending 1st Service ({userInstallations.length - commissionedCount})</option>
              </select>
            </div>

            {loadingInstallations ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading machine installation registry...</div>
            ) : (
              <Table
                columns={installationColumns}
                data={filteredInstallations}
                emptyMessage="No machine installation records found matching the filter."
              />
            )}
          </Card>
        </div>
      )}

      {/* VIEW 3: BRANCH SPARE PARTS STOCK & 1-YEAR CONSUMPTION */}
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
                {fastMovingPartsCount}
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

          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={stockSearchTerm}
                  onChange={(e) => setStockSearchTerm(e.target.value)}
                  placeholder="Search spare parts by name, SKU, branch, compatible models..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
                />
              </div>

              {isAdmin ? (
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
                >
                  <option value="ALL">All Branches ({spareParts.length})</option>
                  <option value="Surat">Surat ({spareParts.filter(p => p.branch === 'Surat').length})</option>
                  <option value="Morbi">Morbi ({spareParts.filter(p => p.branch === 'Morbi').length})</option>
                  <option value="Rajkot">Rajkot ({spareParts.filter(p => p.branch === 'Rajkot').length})</option>
                </select>
              ) : (
                <div className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-emerald-200 rounded-xl bg-emerald-50 text-emerald-800 flex items-center gap-1.5 shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{userBranch} Warehouse ({userSpareParts.length})</span>
                </div>
              )}

              <select
                value={velocityFilter}
                onChange={(e) => setVelocityFilter(e.target.value)}
                className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-[#3B318A] outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
              >
                <option value="ALL">All Velocity / Demand</option>
                <option value="FAST_MOVING">High 1-Yr (Fast Moving)</option>
                <option value="LOW_STOCK">Reorder Alerts ({lowStockPartsCount})</option>
              </select>
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
        onServiceCreated={async () => {
          await loadServices();
          await loadInstallations();
        }}
      />

      {/* New Machine Installation Modal */}
      <NewInstallationModal
        isOpen={newInstallationModalOpen}
        onClose={() => setNewInstallationModalOpen(false)}
        onInstallationCreated={handleInstallationCreated}
        defaultBranch={installationBranchFilter !== 'ALL' ? installationBranchFilter : userBranch}
      />

      {/* Add Spare Part Modal (ADMIN ONLY) */}
      {isAdmin && (
        <AddStockItemModal
          isOpen={addPartModalOpen}
          onClose={() => setAddPartModalOpen(false)}
          onStockAdded={handlePartAdded}
          defaultBranch={branchFilter !== 'ALL' ? branchFilter : 'Surat'}
        />
      )}

      {/* Adjust Spare Part Quantity Modal (ADMIN ONLY) */}
      {isAdmin && (
        <AdjustStockModal
          isOpen={adjustModalOpen}
          onClose={() => {
            setAdjustModalOpen(false);
            setSelectedPart(null);
          }}
          item={selectedPart}
          onStockAdjusted={handlePartAdjusted}
        />
      )}

      {/* Inter-Branch Transfer Modal (ADMIN ONLY) */}
      {isAdmin && (
        <TransferStockModal
          isOpen={transferModalOpen}
          onClose={() => {
            setTransferModalOpen(false);
            setSelectedPart(null);
          }}
          item={selectedPart}
          onStockTransferred={handlePartTransferred}
        />
      )}

      {/* Delete Spare Part Confirmation Modal (ADMIN ONLY) */}
      {isAdmin && (
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
      )}

      {/* Delete Machine Installation Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteInstallationModalOpen}
        onClose={() => {
          setDeleteInstallationModalOpen(false);
          setSelectedInstallationToDelete(null);
        }}
        onConfirm={handleConfirmDeleteInstallation}
        title="Delete Machine Installation Details?"
        description={
          selectedInstallationToDelete ? (
            <span>
              Are you sure you want to delete the machine installation details for <strong className="text-gray-900">{selectedInstallationToDelete.customerName}</strong> ({selectedInstallationToDelete.purchasedProduct || 'Machine'}) at <strong className="text-gray-900">{selectedInstallationToDelete.company || 'Client Site'}</strong>? This will also remove any linked service schedules.
            </span>
          ) : (
            'Delete this machine installation?'
          )
        }
        confirmText="Yes, Delete Machine Details"
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
