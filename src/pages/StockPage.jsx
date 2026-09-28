import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { AddStockItemModal } from '../components/stock/AddStockItemModal.jsx';
import { AdjustStockModal } from '../components/stock/AdjustStockModal.jsx';
import { TransferStockModal } from '../components/stock/TransferStockModal.jsx';
import { NewInstallationModal } from '../components/services/NewInstallationModal.jsx';
import { SellSparePartModal } from '../components/stock/SellSparePartModal.jsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.jsx';
import {
  Boxes,
  Plus,
  Search,
  Building2,
  Wrench,
  ShoppingBag,
  Flame,
  AlertTriangle,
  ArrowRightLeft,
  SlidersHorizontal,
  Trash2,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Calendar,
  Phone,
  Layers,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export const StockPage = () => {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === 'Owner' || role === 'SuperAdmin' || role === 'Admin';
  const isSales = role === 'Sales';
  const userBranch = currentUser?.branch || 'Surat';
  const canAddMachine = isAdmin || currentUser?.canViewStock === true || currentUser?.canAddMachine === true;

  // EXACTLY 2 TABS: 'MACHINES' | 'SPARE_PARTS'
  const [activeTab, setActiveTab] = useState('MACHINES');

  // Stock Items state (for Admin stock & warehouse data)
  const [stockItems, setStockItems] = useState([]);
  // Customer Sales state (for Sales Reps' sold items list)
  const [customerSales, setCustomerSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Machines Tab
  const [machineSearchTerm, setMachineSearchTerm] = useState('');
  const [machineBranchFilter, setMachineBranchFilter] = useState('ALL');

  // Filters for Spare Parts Tab
  const [spareSearchTerm, setSpareSearchTerm] = useState('');
  const [spareBranchFilter, setSpareBranchFilter] = useState('ALL');
  const [spareVelocityFilter, setSpareVelocityFilter] = useState('ALL'); // 'ALL' | 'FAST_MOVING' | 'LOW_STOCK'

  // Modals for Admin Stock Management (Add, Adjust, Transfer, Delete)
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalCategory, setAddModalCategory] = useState('Machine');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Modals for Sales Person (Sell Machine & Sell Spare Part)
  const [machineSellModalOpen, setMachineSellModalOpen] = useState(false);
  const [preselectedMachine, setPreselectedMachine] = useState(null);

  const [spareSellModalOpen, setSpareSellModalOpen] = useState(false);
  const [preselectedSparePart, setPreselectedSparePart] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const [items, customers] = await Promise.all([
      db.getStockItems(),
      db.getCustomers()
    ]);
    setStockItems(items || []);
    setCustomerSales(customers || []);
    setLoading(false);
  };

  useEffect(() => {
    if (role === 'Engineer') {
      navigate('/services', { replace: true });
      return;
    }
    loadData();
  }, [role]);

  const handleStockAdded = async (newItemData) => {
    await db.addStockItem(newItemData);
    await loadData();
  };

  const handleStockAdjusted = async (id, adjustment) => {
    await db.adjustStockQuantity(id, adjustment);
    await loadData();
  };

  const handleStockTransferred = async (id, transferData) => {
    await db.transferStock(id, transferData);
    await loadData();
  };

  const handleConfirmDelete = async () => {
    if (selectedItem) {
      await db.deleteStockItem(selectedItem.id);
      toast.success('Stock item deleted.');
      setDeleteConfirmOpen(false);
      setSelectedItem(null);
      await loadData();
    }
  };

  // Helper for consumption velocity calculations (Admin View)
  const getConsumptionVelocity = (item) => {
    const annual = Number(item.annualConsumption) || 0;
    const monthlyRate = annual / 12;
    const currentQty = Number(item.quantity) || 0;
    const monthsRunway = monthlyRate > 0 ? (currentQty / monthlyRate).toFixed(1) : '∞';

    let velocityLabel = 'Steady Demand';
    let velocityColor = 'bg-slate-100 text-slate-700 border-slate-200';
    let isFastMoving = false;

    if (item.category === 'Spare Part' && annual >= 80) {
      velocityLabel = 'Fast Moving';
      velocityColor = 'bg-rose-50 text-rose-700 border-rose-200';
      isFastMoving = true;
    } else if (item.category === 'Machine' && annual >= 18) {
      velocityLabel = 'High Demand Machine';
      velocityColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
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

  // ==========================================
  // 1. ADMIN DATA SLICES (WAREHOUSE INVENTORY)
  // ==========================================
  const allMachines = stockItems.filter((s) => s.category === 'Machine');
  const allSpareParts = stockItems.filter((s) => s.category === 'Spare Part');

  const filteredMachines = allMachines.filter((item) => {
    if (machineBranchFilter !== 'ALL' && item.branch !== machineBranchFilter) return false;
    if (machineSearchTerm) {
      const q = machineSearchTerm.toLowerCase();
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

  const filteredSpareParts = allSpareParts.filter((item) => {
    if (spareBranchFilter !== 'ALL' && item.branch !== spareBranchFilter) return false;

    const vel = getConsumptionVelocity(item);
    if (spareVelocityFilter === 'FAST_MOVING' && !vel.isFastMoving) return false;
    if (spareVelocityFilter === 'LOW_STOCK' && !vel.isLowStock) return false;

    if (spareSearchTerm) {
      const q = spareSearchTerm.toLowerCase();
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

  // Admin Metrics
  const totalMachineUnits = allMachines.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const suratMachines = allMachines.filter((s) => s.branch === 'Surat').reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const morbiMachines = allMachines.filter((s) => s.branch === 'Morbi').reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const rajkotMachines = allMachines.filter((s) => s.branch === 'Rajkot').reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const lowStockMachinesCount = allMachines.filter((s) => getConsumptionVelocity(s).isLowStock).length;

  const totalSpareUnits = allSpareParts.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const suratSpares = allSpareParts.filter((s) => s.branch === 'Surat').length;
  const morbiSpares = allSpareParts.filter((s) => s.branch === 'Morbi').length;
  const rajkotSpares = allSpareParts.filter((s) => s.branch === 'Rajkot').length;
  const lowStockSparesCount = allSpareParts.filter((s) => getConsumptionVelocity(s).isLowStock).length;
  const fastMovingSparesCount = allSpareParts.filter((s) => getConsumptionVelocity(s).isFastMoving).length;

  // ==================================================
  // 2. SALES PERSON DATA SLICES (ITEMS SOLD BY USER)
  // ==================================================
  const isItemSpareSale = (c) => {
    return (
      c.category === 'Spare Part' ||
      c.assignedEngineer === 'Direct Spare Part Sale' ||
      (c.purchasedProduct && (
        c.purchasedProduct.toLowerCase().includes('filter') ||
        c.purchasedProduct.toLowerCase().includes('oil') ||
        c.purchasedProduct.toLowerCase().includes('spare') ||
        c.purchasedProduct.toLowerCase().includes('valve') ||
        c.purchasedProduct.toLowerCase().includes('belt')
      ))
    );
  };

  const mySalesList = customerSales.filter((c) => {
    if (isAdmin) return true;
    return (
      c.salesPersonId === currentUser?.id ||
      c.salesPersonName === currentUser?.name ||
      isSales
    );
  });

  const mySoldMachines = mySalesList.filter((c) => !isItemSpareSale(c));
  const mySoldSpareParts = mySalesList.filter((c) => isItemSpareSale(c));

  const filteredMySoldMachines = mySoldMachines.filter((item) => {
    if (machineBranchFilter !== 'ALL' && item.branch !== machineBranchFilter) return false;
    if (machineSearchTerm) {
      const q = machineSearchTerm.toLowerCase();
      return (
        (item.customerName || '').toLowerCase().includes(q) ||
        (item.company || '').toLowerCase().includes(q) ||
        (item.purchasedProduct || '').toLowerCase().includes(q) ||
        (item.branch || '').toLowerCase().includes(q) ||
        (item.phone || '').toLowerCase().includes(q) ||
        (item.assignedEngineer || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredMySoldSpares = mySoldSpareParts.filter((item) => {
    if (spareBranchFilter !== 'ALL' && item.branch !== spareBranchFilter) return false;
    if (spareSearchTerm) {
      const q = spareSearchTerm.toLowerCase();
      return (
        (item.customerName || '').toLowerCase().includes(q) ||
        (item.company || '').toLowerCase().includes(q) ||
        (item.purchasedProduct || '').toLowerCase().includes(q) ||
        (item.branch || '').toLowerCase().includes(q) ||
        (item.phone || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sales Person Metrics
  const myTotalMachineCount = mySoldMachines.length;
  const mySuratMachinesCount = mySoldMachines.filter((m) => m.branch === 'Surat').length;
  const myMorbiMachinesCount = mySoldMachines.filter((m) => m.branch === 'Morbi').length;
  const myRajkotMachinesCount = mySoldMachines.filter((m) => m.branch === 'Rajkot').length;

  const myTotalSpareCount = mySoldSpareParts.reduce((acc, s) => acc + (Number(s.quantity) || 1), 0);
  const myTotalSpareRevenue = mySoldSpareParts.reduce((acc, s) => {
    const qty = Number(s.quantity) || 1;
    const price = Number(s.unitPrice) || 0;
    return acc + (price > 0 ? price * qty : 0);
  }, 0);

  // ==========================================
  // 3. PAGINATION (STRICTLY 10 ITEMS PER PAGE)
  // ==========================================
  const ITEMS_PER_PAGE = 10;
  const [machinePage, setMachinePage] = useState(1);
  const [sparePage, setSparePage] = useState(1);

  useEffect(() => {
    setMachinePage(1);
  }, [machineSearchTerm, machineBranchFilter, activeTab]);

  useEffect(() => {
    setSparePage(1);
  }, [spareSearchTerm, spareBranchFilter, spareVelocityFilter, activeTab]);

  // Active data arrays based on user role
  const activeMachinesList = isAdmin ? filteredMachines : filteredMySoldMachines;
  const activeSparePartsList = isAdmin ? filteredSpareParts : filteredMySoldSpares;

  const totalMachinePages = Math.ceil(activeMachinesList.length / ITEMS_PER_PAGE) || 1;
  const paginatedMachines = activeMachinesList.slice(
    (machinePage - 1) * ITEMS_PER_PAGE,
    machinePage * ITEMS_PER_PAGE
  );

  const totalSparePages = Math.ceil(activeSparePartsList.length / ITEMS_PER_PAGE) || 1;
  const paginatedSpareParts = activeSparePartsList.slice(
    (sparePage - 1) * ITEMS_PER_PAGE,
    sparePage * ITEMS_PER_PAGE
  );

  // Reusable Pagination Bar
  const renderPaginationControls = (currentPage, totalPages, totalItems, onPageChange) => {
    if (totalItems <= ITEMS_PER_PAGE) return null;
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endIdx = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
        <span className="text-gray-500 font-medium">
          Showing <strong className="text-gray-900">{startIdx} - {endIdx}</strong> of <strong className="text-gray-900">{totalItems}</strong> items
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="h-8 px-2.5 text-xs cursor-pointer disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === p
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
            onClick={() => onPageChange(currentPage + 1)}
            className="h-8 px-2.5 text-xs cursor-pointer disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  // ==========================================
  // 4. COLUMNS: ADMIN WAREHOUSE STOCK TABLES
  // ==========================================
  const adminMachineColumns = [
    {
      header: 'Machine Model & SKU',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{row.itemName}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
              <ShoppingBag className="w-3 h-3 text-[#3B318A]" />
              Machine
            </span>
          </div>
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
              <span className="text-xs font-semibold text-gray-500">{row.unit || 'Units'}</span>
              {vel.isLowStock && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Low Stock
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 block">Min Threshold: {row.minAlertLevel || 0}</span>
          </div>
        );
      }
    },
    {
      header: '1-Yr Sales Demand & Cover',
      cell: (row) => {
        const vel = getConsumptionVelocity(row);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">
                {vel.annual} {row.unit || 'Units'}/yr
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${vel.velocityColor} flex items-center gap-0.5`}>
                {vel.isFastMoving && <Flame className="w-3 h-3 text-rose-500 shrink-0" />}
                {vel.velocityLabel}
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Avg: <strong>~{vel.monthlyRate} {row.unit || 'Units'}/mo</strong> | Cover: <strong>{vel.monthsRunway} mo</strong>
            </p>
          </div>
        );
      }
    },
    {
      header: 'Unit Price',
      cell: (row) => (
        <span className="text-xs font-bold text-gray-900">
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
              setSelectedItem(row);
              setAdjustModalOpen(true);
            }}
            title="Adjust Machine Stock Quantity"
          >
            Adjust
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={ArrowRightLeft}
            onClick={() => {
              setSelectedItem(row);
              setTransferModalOpen(true);
            }}
            title="Transfer Machine to another Branch"
          >
            Transfer
          </Button>

          <button
            onClick={() => {
              setSelectedItem(row);
              setDeleteConfirmOpen(true);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Delete Machine Item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const adminSpareColumns = [
    {
      header: 'Spare Part & SKU Code',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{row.itemName}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <Wrench className="w-3 h-3 text-emerald-600" />
              Spare Part
            </span>
          </div>
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
            <span className="text-[10px] text-gray-400 block">Min Alert: {row.minAlertLevel || 0}</span>
          </div>
        );
      }
    },
    {
      header: '1-Yr Consumption & Demand',
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
      header: 'Unit Price',
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
              setSelectedItem(row);
              setAdjustModalOpen(true);
            }}
            title="Adjust Quantity"
          >
            Adjust
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={ArrowRightLeft}
            onClick={() => {
              setSelectedItem(row);
              setTransferModalOpen(true);
            }}
            title="Transfer to another Branch"
          >
            Transfer
          </Button>

          <button
            onClick={() => {
              setSelectedItem(row);
              setDeleteConfirmOpen(true);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Delete Spare Part"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // ===============================================
  // 5. COLUMNS: SALES PERSON'S SOLD ITEMS TABLES
  // ===============================================
  const salesPersonMachineColumns = [
    {
      header: 'Customer & Industrial Plant',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{row.customerName}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Machine Installed
            </span>
          </div>
          <p className="text-xs text-gray-600 font-medium mt-0.5">{row.company}</p>
          {row.address && <p className="text-[11px] text-gray-400 truncate max-w-xs">{row.address}</p>}
        </div>
      )
    },
    {
      header: 'Sold Machine Model & Tag',
      cell: (row) => (
        <div>
          <span className="font-bold text-indigo-950 text-xs block">{row.purchasedProduct}</span>
          {row.serialNumber ? (
            <span className="text-[11px] text-gray-500 font-mono">Serial: {row.serialNumber}</span>
          ) : (
            <span className="text-[11px] text-gray-400 italic">No Serial Logged</span>
          )}
        </div>
      )
    },
    {
      header: 'Dispatch Branch',
      cell: (row) => {
        const colors = {
          Surat: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          Morbi: 'bg-amber-50 text-amber-900 border-amber-200',
          Rajkot: 'bg-teal-50 text-teal-800 border-teal-200'
        };
        return (
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${colors[row.branch] || 'bg-gray-50'}`}>
            <Building2 className="w-3.5 h-3.5" />
            {row.branch || 'Surat'}
          </span>
        );
      }
    },
    {
      header: 'Installation Date',
      cell: (row) => (
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{row.installationDate || '—'}</span>
        </div>
      )
    },
    {
      header: 'Field Engineer (Commissioning)',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] flex items-center justify-center">
            {(row.assignedEngineer || 'S')[0]}
          </div>
          <span className="text-xs font-medium text-gray-800">{row.assignedEngineer || 'Sanjay Patel'}</span>
        </div>
      )
    },
    {
      header: 'Contact Phone',
      cell: (row) => (
        <span className="text-xs font-semibold text-gray-700 font-mono">
          {row.phone || '—'}
        </span>
      )
    }
  ];

  const salesPersonSpareColumns = [
    {
      header: 'Customer / Buyer Name',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{row.customerName}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <Wrench className="w-3 h-3 text-emerald-600" />
              Spare Sold
            </span>
          </div>
          <p className="text-xs text-gray-600 font-medium mt-0.5">{row.company}</p>
        </div>
      )
    },
    {
      header: 'Sold Spare Part & Item',
      cell: (row) => (
        <span className="font-bold text-gray-900 text-xs block">
          {row.purchasedProduct}
        </span>
      )
    },
    {
      header: 'Quantity & Value',
      cell: (row) => {
        const qty = Number(row.quantity) || 1;
        const price = Number(row.unitPrice) || 0;
        const total = price > 0 ? price * qty : 0;

        return (
          <div>
            <span className="text-xs font-black text-gray-900">{qty} Units Sold</span>
            {total > 0 && (
              <span className="text-[11px] font-bold text-emerald-700 block">
                ₹{total.toLocaleString('en-IN')} Total
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Dispatch Branch',
      cell: (row) => {
        const colors = {
          Surat: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          Morbi: 'bg-amber-50 text-amber-900 border-amber-200',
          Rajkot: 'bg-teal-50 text-teal-800 border-teal-200'
        };
        return (
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${colors[row.branch] || 'bg-gray-50'}`}>
            <Building2 className="w-3.5 h-3.5" />
            {row.branch || 'Surat'}
          </span>
        );
      }
    },
    {
      header: 'Sale Date',
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
        <span className="text-xs font-semibold text-gray-700 font-mono">
          {row.phone || '—'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#3B318A] via-[#2F2770] to-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-black flex items-center gap-2.5">
              {isAdmin ? (
                <Boxes className="w-6 h-6 text-indigo-300" />
              ) : (
                <ShoppingBag className="w-6 h-6 text-emerald-300" />
              )}
              {isAdmin ? 'Branch Stock & Inventory Portal' : 'Sold Items & Sales Records'}
            </h1>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                Executive Stock Master
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                <UserCheck className="w-3.5 h-3.5" />
                Sales Representative Portal
              </span>
            )}
          </div>
          <p className="text-xs text-indigo-100 max-w-2xl">
            {isAdmin
              ? 'Multi-branch warehouse management for Surat, Morbi, and Rajkot. Add machine and spare part stocks, manage reorder thresholds, and adjust inventory quantities.'
              : 'Log customer machine installations and direct spare part sales from warehouse stock. Track your personal sales history and dispatched client base.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Admin adds stock */}
          {isAdmin ? (
            <Button
              onClick={() => {
                setAddModalCategory(activeTab === 'SPARE_PARTS' ? 'Spare Part' : 'Machine');
                setAddModalOpen(true);
              }}
              variant="white"
              icon={Plus}
            >
              {activeTab === 'SPARE_PARTS' ? 'Add Spare Part Stock' : 'Add Machine Stock'}
            </Button>
          ) : (
            /* Sales Rep records customer sale */
            (activeTab === 'SPARE_PARTS' || canAddMachine) && (
              <Button
                onClick={() => {
                  if (activeTab === 'MACHINES') {
                    setPreselectedMachine(null);
                    setMachineSellModalOpen(true);
                  } else {
                    setPreselectedSparePart(null);
                    setSpareSellModalOpen(true);
                  }
                }}
                variant="white"
                icon={Plus}
              >
                {activeTab === 'MACHINES' ? 'Sell Machine (Installation)' : 'Sell Spare Part'}
              </Button>
            )
          )}
        </div>
      </div>

      {/* EXACTLY 2 MAIN WORKSPACE TABS */}
      <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit">
        {/* Tab 1: Machines */}
        <button
          type="button"
          onClick={() => setActiveTab('MACHINES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'MACHINES'
            ? 'bg-[#3B318A] text-white shadow-md'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <Cpu className="w-4 h-4" />
          <span>{isAdmin ? 'Machine Stocks' : 'Sold Machines'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'MACHINES' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
            {isAdmin ? allMachines.length : mySoldMachines.length}
          </span>
        </button>

        {/* Tab 2: Spare Parts */}
        <button
          type="button"
          onClick={() => setActiveTab('SPARE_PARTS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'SPARE_PARTS'
            ? 'bg-[#3B318A] text-white shadow-md'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <Wrench className="w-4 h-4" />
          <span>{isAdmin ? 'Spare Part Stocks' : 'Sold Spare Parts'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'SPARE_PARTS' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
            {isAdmin ? allSpareParts.length : mySoldSpareParts.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. MACHINE TAB (Admin: Stock / Sales: Sold Machines)      */}
      {/* ======================================================== */}
      {activeTab === 'MACHINES' && (
        <div className="space-y-6">
          {/* Machine KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {isAdmin ? (
              <>
                <Card className="p-4 bg-indigo-50/60 border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#3B318A] uppercase">Total Machines in Stock</span>
                    <ShoppingBag className="w-4 h-4 text-[#3B318A]" />
                  </div>
                  <span className="text-2xl font-black text-indigo-950 block mt-1">{totalMachineUnits} Units</span>
                  <span className="text-[10px] text-gray-500">Compressors, Dryers, Chillers</span>
                </Card>

                <Card className="p-4 bg-amber-50/60 border border-amber-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 uppercase">Branch Distribution</span>
                    <Building2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs font-bold text-amber-950">
                    <span>Surat: {suratMachines}</span>
                    <span>•</span>
                    <span>Morbi: {morbiMachines}</span>
                    <span>•</span>
                    <span>Rajkot: {rajkotMachines}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Warehouse stock breakdown</span>
                </Card>

                <Card className="p-4 bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase">Machine Catalog Models</span>
                    <Cpu className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-2xl font-black text-emerald-950 block mt-1">{allMachines.length} Models</span>
                  <span className="text-[10px] text-gray-500">Industrial configurations</span>
                </Card>

              </>
            ) : (
              <>
                <Card className="p-4 bg-indigo-50/60 border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#3B318A] uppercase">Machines Sold by Me</span>
                    <ShoppingBag className="w-4 h-4 text-[#3B318A]" />
                  </div>
                  <span className="text-2xl font-black text-indigo-950 block mt-1">{myTotalMachineCount} Units</span>
                  <span className="text-[10px] text-gray-500">Successfully commissioned</span>
                </Card>

                <Card className="p-4 bg-amber-50/60 border border-amber-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 uppercase">Branch Distribution</span>
                    <Building2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs font-bold text-amber-950">
                    <span>Surat: {mySuratMachinesCount}</span>
                    <span>•</span>
                    <span>Morbi: {myMorbiMachinesCount}</span>
                    <span>•</span>
                    <span>Rajkot: {myRajkotMachinesCount}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">My regional client sales</span>
                </Card>

                <Card className="p-4 bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase">Warehouse Machines In-Stock</span>
                    <Cpu className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-2xl font-black text-emerald-950 block mt-1">{totalMachineUnits} Units</span>
                  <span className="text-[10px] text-gray-500">Available to sell across branches</span>
                </Card>
              </>
            )}
          </div>

          {/* Machine Table Card */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={machineSearchTerm}
                    onChange={(e) => setMachineSearchTerm(e.target.value)}
                    placeholder={
                      isAdmin
                        ? 'Search machines by model name, SKU, branch, compatible equipment...'
                        : 'Search sold machines by customer name, company, model, phone...'
                    }
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
                  />
                </div>

                <select
                  value={machineBranchFilter}
                  onChange={(e) => setMachineBranchFilter(e.target.value)}
                  className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
                >
                  <option value="ALL">All Branches ({isAdmin ? allMachines.length : mySoldMachines.length})</option>
                  <option value="Surat">Surat Branch ({isAdmin ? allMachines.filter((m) => m.branch === 'Surat').length : mySuratMachinesCount})</option>
                  <option value="Morbi">Morbi Branch ({isAdmin ? allMachines.filter((m) => m.branch === 'Morbi').length : myMorbiMachinesCount})</option>
                  <option value="Rajkot">Rajkot Branch ({isAdmin ? allMachines.filter((m) => m.branch === 'Rajkot').length : myRajkotMachinesCount})</option>
                </select>
              </div>

              {isAdmin ? (
                <Button
                  onClick={() => {
                    setAddModalCategory('Machine');
                    setAddModalOpen(true);
                  }}
                  variant="primary"
                  icon={Plus}
                  className="bg-[#3B318A] hover:bg-[#322A77] text-white shrink-0 cursor-pointer"
                >
                  Add Machine Stock
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setPreselectedMachine(null);
                    setMachineSellModalOpen(true);
                  }}
                  variant="primary"
                  icon={Plus}
                  className="bg-[#3B318A] hover:bg-[#322A77] text-white shrink-0 cursor-pointer"
                >
                  Sell Machine (Installation)
                </Button>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading machine records...</div>
            ) : (
              <>
                <Table
                  columns={isAdmin ? adminMachineColumns : salesPersonMachineColumns}
                  data={paginatedMachines}
                  emptyMessage={
                    isAdmin
                      ? 'No machine items found matching filter criteria.'
                      : 'You have not registered any machine installations yet. Click "+ Sell Machine (Installation)" to record a sale.'
                  }
                />
                {renderPaginationControls(
                  machinePage,
                  totalMachinePages,
                  activeMachinesList.length,
                  setMachinePage
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SPARE PARTS TAB (Admin: Stock / Sales: Sold Spares)    */}
      {/* ======================================================== */}
      {activeTab === 'SPARE_PARTS' && (
        <div className="space-y-6">
          {/* Spare Parts KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {isAdmin ? (
              <>
                <Card className="p-4 bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase">Total Spare Part Units</span>
                    <Wrench className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-2xl font-black text-emerald-950 block mt-1">{totalSpareUnits} Units</span>
                  <span className="text-[10px] text-gray-500">Filters, Oil, Belts, Valves</span>
                </Card>

                <Card className="p-4 bg-indigo-50/60 border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#3B318A] uppercase">Branch Distribution</span>
                    <Building2 className="w-4 h-4 text-[#3B318A]" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-indigo-950">
                    <span>Surat: {suratSpares}</span>
                    <span>•</span>
                    <span>Morbi: {morbiSpares}</span>
                    <span>•</span>
                    <span>Rajkot: {rajkotSpares}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Active branch spare items</span>
                </Card>

                <Card className="p-4 bg-rose-50/60 border border-rose-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-800 uppercase">Fast-Moving Items</span>
                    <Flame className="w-4 h-4 text-rose-600" />
                  </div>
                  <span className="text-2xl font-black text-rose-700 block mt-1">{fastMovingSparesCount}</span>
                  <span className="text-[10px] text-rose-600 font-semibold">High 1-Yr consumption</span>
                </Card>
              </>
            ) : (
              <>
                <Card className="p-4 bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase">Spare Parts Sold by Me</span>
                    <Wrench className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-2xl font-black text-emerald-950 block mt-1">{myTotalSpareCount} Units</span>
                  <span className="text-[10px] text-gray-500">Total units dispatched to clients</span>
                </Card>

                <Card className="p-4 bg-indigo-50/60 border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#3B318A] uppercase">Total Spare Revenue</span>
                    <ShoppingBag className="w-4 h-4 text-[#3B318A]" />
                  </div>
                  <span className="text-2xl font-black text-indigo-950 block mt-1">
                    ₹{myTotalSpareRevenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-gray-500">Spare parts order volume</span>
                </Card>

                <Card className="p-4 bg-amber-50/60 border border-amber-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 uppercase">Warehouse Spares In-Stock</span>
                    <Layers className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-2xl font-black text-amber-950 block mt-1">{totalSpareUnits} Units</span>
                  <span className="text-[10px] text-gray-500">Available across warehouses</span>
                </Card>
              </>
            )}
          </div>

          {/* Spare Parts Table Card */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={spareSearchTerm}
                    onChange={(e) => setSpareSearchTerm(e.target.value)}
                    placeholder={
                      isAdmin
                        ? 'Search spare parts by name, SKU, branch, compatible models...'
                        : 'Search sold spare parts by customer, company, item name, phone...'
                    }
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
                  />
                </div>

                <select
                  value={spareBranchFilter}
                  onChange={(e) => setSpareBranchFilter(e.target.value)}
                  className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
                >
                  <option value="ALL">All Branches ({isAdmin ? allSpareParts.length : mySoldSpareParts.length})</option>
                  <option value="Surat">Surat Branch ({isAdmin ? suratSpares : mySoldSpareParts.filter((s) => s.branch === 'Surat').length})</option>
                  <option value="Morbi">Morbi Branch ({isAdmin ? morbiSpares : mySoldSpareParts.filter((s) => s.branch === 'Morbi').length})</option>
                  <option value="Rajkot">Rajkot Branch ({isAdmin ? rajkotSpares : mySoldSpareParts.filter((s) => s.branch === 'Rajkot').length})</option>
                </select>

                {isAdmin && (
                  <select
                    value={spareVelocityFilter}
                    onChange={(e) => setSpareVelocityFilter(e.target.value)}
                    className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-[#3B318A] outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
                  >
                    <option value="ALL">All Demand Velocity</option>
                    <option value="FAST_MOVING">High 1-Yr (Fast Moving)</option>
                    <option value="LOW_STOCK">Reorder Needed ({lowStockSparesCount})</option>
                  </select>
                )}
              </div>

              {isAdmin ? (
                <Button
                  onClick={() => {
                    setAddModalCategory('Spare Part');
                    setAddModalOpen(true);
                  }}
                  variant="primary"
                  icon={Plus}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                >
                  Add Spare Part Stock
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setPreselectedSparePart(null);
                    setSpareSellModalOpen(true);
                  }}
                  variant="primary"
                  icon={Plus}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                >
                  Sell Spare Part
                </Button>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading spare part records...</div>
            ) : (
              <>
                <Table
                  columns={isAdmin ? adminSpareColumns : salesPersonSpareColumns}
                  data={paginatedSpareParts}
                  emptyMessage={
                    isAdmin
                      ? 'No spare parts found matching filter criteria.'
                      : 'You have not recorded any spare part sales yet. Click "+ Sell Spare Part" to record a sale.'
                  }
                />
                {renderPaginationControls(
                  sparePage,
                  totalSparePages,
                  activeSparePartsList.length,
                  setSparePage
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS                                                   */}
      {/* ======================================================== */}

      {/* Add Stock Item Modal (ADMIN ONLY) */}
      {isAdmin && (
        <AddStockItemModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onStockAdded={handleStockAdded}
          defaultBranch={userBranch || 'Surat'}
          initialCategory={addModalCategory}
        />
      )}

      {/* Adjust Quantity Modal (ADMIN ONLY) */}
      {isAdmin && (
        <AdjustStockModal
          isOpen={adjustModalOpen}
          onClose={() => {
            setAdjustModalOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onStockAdjusted={handleStockAdjusted}
        />
      )}

      {/* Inter-Branch Transfer Modal (ADMIN ONLY) */}
      {isAdmin && (
        <TransferStockModal
          isOpen={transferModalOpen}
          onClose={() => {
            setTransferModalOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onStockTransferred={handleStockTransferred}
        />
      )}

      {/* Sell Machine / Register Installation Modal (SALES PERSON) */}
      {!isAdmin && (
        <NewInstallationModal
          isOpen={machineSellModalOpen}
          onClose={() => {
            setMachineSellModalOpen(false);
            setPreselectedMachine(null);
          }}
          onInstallationCreated={loadData}
          defaultBranch={userBranch}
          initialMachine={preselectedMachine}
        />
      )}

      {/* Sell Spare Part Modal (SALES PERSON) */}
      {!isAdmin && (
        <SellSparePartModal
          isOpen={spareSellModalOpen}
          onClose={() => {
            setSpareSellModalOpen(false);
            setPreselectedSparePart(null);
          }}
          onSparePartSold={loadData}
          selectedPart={preselectedSparePart}
          allSpareParts={allSpareParts}
          defaultBranch={userBranch}
        />
      )}

      {/* Delete Item Confirmation Modal (ADMIN ONLY) */}
      {isAdmin && (
        <ConfirmModal
          isOpen={deleteConfirmOpen}
          onClose={() => {
            setDeleteConfirmOpen(false);
            setSelectedItem(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Stock Item?"
          description={
            selectedItem ? (
              <span>
                Are you sure you want to remove <strong className="text-gray-900">{selectedItem.itemName}</strong> ({selectedItem.partNumber}) from {selectedItem.branch} branch inventory?
              </span>
            ) : (
              'Delete this item?'
            )
          }
          confirmText="Yes, Delete Item"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  );
};
