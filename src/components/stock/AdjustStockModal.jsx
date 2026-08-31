import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { PlusCircle, MinusCircle, RefreshCw, Package, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export const AdjustStockModal = ({ isOpen, onClose, item, onStockAdjusted }) => {
  const [adjustmentType, setAdjustmentType] = useState('ADD'); // 'ADD' | 'DEDUCT' | 'SET'
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('Restocked from Supplier');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setAmount(1);
      setAdjustmentType('ADD');
      setReason('Restocked from Supplier');
      setNotes('');
    }
  }, [item, isOpen]);

  if (!item) return null;

  const currentQty = Number(item.quantity) || 0;
  const changeQty = Number(amount) || 0;
  let previewQty = currentQty;
  if (adjustmentType === 'ADD') previewQty = currentQty + changeQty;
  else if (adjustmentType === 'DEDUCT') previewQty = Math.max(0, currentQty - changeQty);
  else if (adjustmentType === 'SET') previewQty = Math.max(0, changeQty);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (changeQty <= 0 && adjustmentType !== 'SET') {
      toast.error('Please enter a valid quantity.');
      return;
    }

    setSubmitting(true);
    try {
      await onStockAdjusted(item.id, {
        adjustmentType,
        quantity: changeQty,
        reason,
        notes: notes.trim()
      });
      toast.success(`Stock updated for ${item.itemName} (${item.branch} Branch)! New Qty: ${previewQty} ${item.unit}`);
      onClose();
    } catch (err) {
      toast.error('Failed to adjust stock quantity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Branch Stock Quantity" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Item Overview */}
        <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              {item.branch} Branch Inventory
            </span>
            <span className="text-[11px] font-bold text-gray-400">{item.partNumber}</span>
          </div>
          <h4 className="text-sm font-bold text-white">{item.itemName}</h4>
          <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
            <span>Current Available: <strong className="text-emerald-400 font-bold text-sm">{currentQty} {item.unit}</strong></span>
            <span>Annual Consump: <strong className="text-amber-400">{item.annualConsumption || 0} /yr</strong></span>
          </div>
        </div>

        {/* Action Type */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setAdjustmentType('ADD');
              setReason('Restocked from Supplier');
            }}
            className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              adjustmentType === 'ADD'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            + Restock (Add)
          </button>

          <button
            type="button"
            onClick={() => {
              setAdjustmentType('DEDUCT');
              setReason('Used in Field Service');
            }}
            className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              adjustmentType === 'DEDUCT'
                ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-xs'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <MinusCircle className="w-4 h-4 text-rose-600" />
            - Issue (Deduct)
          </button>

          <button
            type="button"
            onClick={() => {
              setAdjustmentType('SET');
              setReason('Physical Inventory Audit Correction');
            }}
            className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              adjustmentType === 'SET'
                ? 'bg-indigo-50 text-indigo-800 border-indigo-400 shadow-xs'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-[#3B318A]" />
            Set Exact Qty
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <Input
            label={adjustmentType === 'SET' ? 'New Exact Quantity' : 'Quantity to Adjust'}
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">New Stock Qty</span>
            <span className="text-xl font-black text-indigo-900 block">{previewQty} <span className="text-xs font-semibold text-gray-500">{item.unit}</span></span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-[38px] px-3 py-2 text-xs font-semibold border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A]"
          >
            {adjustmentType === 'ADD' && (
              <>
                <option value="Restocked from Supplier / Vendor">Restocked from Supplier / Vendor</option>
                <option value="Customer Return / Warranty Repl">Customer Return / Warranty Repl</option>
                <option value="Production Batch Received">Production Batch Received</option>
                <option value="Inventory Correction (Surplus)">Inventory Correction (Surplus)</option>
              </>
            )}
            {adjustmentType === 'DEDUCT' && (
              <>
                <option value="Used in Field Engineer Service">Used in Field Engineer Service</option>
                <option value="Direct Customer Machine Sale">Direct Customer Machine Sale</option>
                <option value="Damaged / Scrap Write-off">Damaged / Scrap Write-off</option>
                <option value="Internal Demo / Testing Unit">Internal Demo / Testing Unit</option>
              </>
            )}
            {adjustmentType === 'SET' && (
              <>
                <option value="Physical Inventory Audit Correction">Physical Inventory Audit Correction</option>
                <option value="Year-End Stock Reconciliation">Year-End Stock Reconciliation</option>
              </>
            )}
          </select>
        </div>

        <Textarea
          label="Adjustment Notes / Reference"
          placeholder="e.g. PO #4501 / Service Job #SRV-101 / Churn audit"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update Quantity'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
