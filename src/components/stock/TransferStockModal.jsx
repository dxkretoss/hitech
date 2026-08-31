import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { ArrowRightLeft, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const TransferStockModal = ({ isOpen, onClose, item, onStockTransferred }) => {
  const [targetBranch, setTargetBranch] = useState('Morbi');
  const [transferQty, setTransferQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const branches = ['Surat', 'Morbi', 'Rajkot'];

  useEffect(() => {
    if (item) {
      const otherBranch = branches.find((b) => b !== item.branch) || 'Morbi';
      setTargetBranch(otherBranch);
      setTransferQty(1);
      setNotes('');
    }
  }, [item, isOpen]);

  if (!item) return null;

  const currentAvailable = Number(item.quantity) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(transferQty) || 0;
    if (qty <= 0) {
      toast.error('Please enter a valid transfer quantity.');
      return;
    }
    if (qty > currentAvailable) {
      toast.error(`Cannot transfer more than available stock (${currentAvailable} ${item.unit}).`);
      return;
    }
    if (item.branch === targetBranch) {
      toast.error('Source and destination branches cannot be the same.');
      return;
    }

    setSubmitting(true);
    try {
      await onStockTransferred(item.id, {
        fromBranch: item.branch,
        toBranch: targetBranch,
        quantity: qty,
        notes: notes.trim()
      });
      toast.success(`Successfully transferred ${qty} ${item.unit} of ${item.itemName} from ${item.branch} to ${targetBranch}!`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to transfer stock.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inter-Branch Stock Transfer" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Item Summary */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
          <span className="text-[11px] font-bold text-[#3B318A] uppercase">{item.partNumber}</span>
          <h4 className="text-sm font-bold text-gray-900">{item.itemName}</h4>
          <p className="text-xs text-gray-600">
            Source Branch: <strong className="text-gray-900">{item.branch}</strong> | In Stock: <strong className="text-emerald-700">{currentAvailable} {item.unit}</strong>
          </p>
        </div>

        {/* From -> To Branch Route */}
        <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex-1 text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Source (From)</span>
            <span className="text-xs font-bold text-gray-800 flex items-center justify-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-[#3B318A]" />
              {item.branch} Branch
            </span>
          </div>

          <ArrowRightLeft className="w-4 h-4 text-indigo-400 shrink-0" />

          <div className="flex-1 text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Destination (To)</span>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="mt-0.5 text-xs font-bold text-[#3B318A] bg-white border border-indigo-200 rounded-lg px-2 py-1 outline-none"
            >
              {branches
                .filter((b) => b !== item.branch)
                .map((b) => (
                  <option key={b} value={b}>
                    {b} Branch
                  </option>
                ))}
            </select>
          </div>
        </div>

        <Input
          label="Transfer Quantity"
          type="number"
          min="1"
          max={currentAvailable}
          value={transferQty}
          onChange={(e) => setTransferQty(e.target.value)}
          required
        />

        <Textarea
          label="Transfer Reason / Dispatch Note"
          placeholder="e.g. Urgent requirement for customer service in Morbi ceramic plant"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={ArrowRightLeft} disabled={submitting}>
            {submitting ? 'Transferring...' : `Transfer to ${targetBranch}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
