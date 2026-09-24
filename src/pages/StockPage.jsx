import React, { useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { AddStockItemModal } from '../components/stock/AddStockItemModal.jsx';
import { AdjustStockModal } from '../components/stock/AdjustStockModal.jsx';
import { TransferStockModal } from '../components/stock/TransferStockModal.jsx';
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
  TrendingUp,
  Package,
  Clock,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

export const StockPage = () => {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [branchFilter, setBranchFilter] = useState('ALL'); // 'ALL' | 'Surat' | 'Morbi' | 'Rajkot'
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'Machine' | 'Spare Part' | 'FAST_MOVING' | 'LOW_STOCK'

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadStock = async () => {
    setLoading(true);
    const items = await db.getStockItems();
    setStockItems(items || []);
    setLoading(false);
  };

  useEffect(() => {
    loadStock();
  }, []);

  const handleStockAdded = async (newItemData) => {
    await db.addStockItem(newItemData);
    await loadStock();
  };

  const handleStockAdjusted = async (id, adjustment) => {
    await db.adjustStockQuantity(id, adjustment);
    await loadStock();
  };

  const handleStockTransferred = async (id, transferData) => {
    await db.transferStock(id, transferData);
    await loadStock();
  };

  const handleConfirmDelete = async () => {
    if (selectedItem) {
      await db.deleteStockItem(selectedItem.id);
      toast.success('Stock item deleted.');
      setDeleteConfirmOpen(false);
      setSelectedItem(null);
      await loadStock();
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

  // Filter items
  const filteredItems = stockItems.filter((item) => {
    if (branchFilter !== 'ALL' && item.branch !== branchFilter) return false;

    const velocity = getConsumptionVelocity(item);
    if (categoryFilter === 'Machine' && item.category !== 'Machine') return false;
    if (categoryFilter === 'Spare Part' && item.category !== 'Spare Part') return false;
    if (categoryFilter === 'FAST_MOVING' && !velocity.isFastMoving) return false;
    if (categoryFilter === 'LOW_STOCK' && !velocity.isLowStock) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
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

  // Calculate summary metrics
  const totalMachines = stockItems.filter((s) => s.category === 'Machine').reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const totalSpareParts = stockItems.filter((s) => s.category === 'Spare Part').reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  const lowStockCount = stockItems.filter((s) => getConsumptionVelocity(s).isLowStock).length;
  const suratCount = stockItems.filter((s) => s.branch === 'Surat').length;
  const morbiCount = stockItems.filter((s) => s.branch === 'Morbi').length;
  const rajkotCount = stockItems.filter((s) => s.branch === 'Rajkot').length;

  const columns = [
    {
      header: 'Item & Part Number',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{row.itemName}</span>
            {row.category === 'Machine' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                <ShoppingBag className="w-3 h-3 text-[#3B318A]" />
                Sales Machine
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <Wrench className="w-3 h-3 text-emerald-600" />
                Service Spare
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            <strong className="text-gray-700">{row.partNumber}</strong>
            {row.compatibleModels && <span className="ml-2 text-gray-400">({row.compatibleModels})</span>}
          </p>
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
              Avg Demand: <strong>~{vel.monthlyRate} {row.unit}/mo</strong> | Stock Cover: <strong>{vel.monthsRunway} mo</strong>
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
              setSelectedItem(row);
              setAdjustModalOpen(true);
            }}
            title="Adjust Quantity (Restock / Issue)"
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
            title="Transfer Stock to another Branch"
          >
            Transfer
          </Button>

          <button
            onClick={() => {
              setSelectedItem(row);
              setDeleteConfirmOpen(true);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Stock Item"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#3B318A] via-[#2F2770] to-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-indigo-300" />
            Branch Stock & Inventory Portal
          </h1>
          <p className="text-xs text-indigo-100 mt-1 max-w-2xl">
            Multi-branch tracking for <strong>Surat, Morbi, and Rajkot</strong>. Monitor Sales Machines, Service Spare Parts, and <strong>1-Year Annual Consumption</strong> to prevent stockouts on high-demand items.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => setAddModalOpen(true)} variant="white" icon={Plus}>
            Add New Item
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-indigo-50/60 border border-indigo-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#3B318A] uppercase">Machines in Stock</span>
            <ShoppingBag className="w-4 h-4 text-[#3B318A]" />
          </div>
          <span className="text-2xl font-black text-indigo-950 block mt-1">{totalMachines}</span>
          <span className="text-[10px] text-gray-500">Compressors, Dryers, Chillers</span>
        </Card>

        <Card className="p-4 bg-emerald-50/60 border border-emerald-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase">Service Spare Parts</span>
            <Wrench className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-950 block mt-1">{totalSpareParts}</span>
          <span className="text-[10px] text-gray-500">Filters, Oil, Belts, Valves</span>
        </Card>

        <Card className="p-4 bg-amber-50/60 border border-amber-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase">Branch Distribution</span>
            <Building2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-bold text-amber-950">
            <span>Surat: {suratCount}</span>
            <span>•</span>
            <span>Morbi: {morbiCount}</span>
            <span>•</span>
            <span>Rajkot: {rajkotCount}</span>
          </div>
          <span className="text-[10px] text-gray-500">Active branch catalog</span>
        </Card>

        <Card className="p-4 bg-rose-50/60 border border-rose-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase">Reorder Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl font-black text-rose-700 block mt-1">{lowStockCount}</span>
          <span className="text-[10px] text-rose-600 font-semibold">Items below safety runway</span>
        </Card>
      </div>

      {/* Main Stock Table Card */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stock by item name, part number, branch, compatible models..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
            />
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
          >
            <option value="ALL">All Branches ({stockItems.length})</option>
            <option value="Surat">Surat Branch ({suratCount})</option>
            <option value="Morbi">Morbi Branch ({morbiCount})</option>
            <option value="Rajkot">Rajkot Branch ({rajkotCount})</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-[38px] px-3.5 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white text-[#3B318A] outline-none focus:ring-2 focus:ring-[#3B318A] cursor-pointer"
          >
            <option value="ALL">All Items ({stockItems.length})</option>
            <option value="Machine">Machines (Sales)</option>
            <option value="Spare Part">Spare Parts (Service)</option>
            <option value="FAST_MOVING">High 1-Yr Consumption (Fast Moving)</option>
            <option value="LOW_STOCK">Reorder Needed ({lowStockCount})</option>
          </select>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading branch inventory database...</div>
        ) : (
          <Table columns={columns} data={filteredItems} emptyMessage="No stock items found matching filter criteria." />
        )}
      </Card>

      {/* Add Stock Item Modal */}
      <AddStockItemModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onStockAdded={handleStockAdded}
        defaultBranch={branchFilter !== 'ALL' ? branchFilter : 'Surat'}
      />

      {/* Adjust Quantity Modal */}
      <AdjustStockModal
        isOpen={adjustModalOpen}
        onClose={() => {
          setAdjustModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onStockAdjusted={handleStockAdjusted}
      />

      {/* Inter-Branch Transfer Modal */}
      <TransferStockModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onStockTransferred={handleStockTransferred}
      />

      {/* Delete Item Confirmation Modal */}
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
    </div>
  );
};
