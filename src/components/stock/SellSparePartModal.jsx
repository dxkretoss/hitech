import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea, CustomSelect } from '../ui/Input.jsx';
import { db } from '../../services/db.js';
import { Wrench, ShoppingBag, Building2, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ReactPhoneInput = PhoneInput.default || PhoneInput;

export const SellSparePartModal = ({
  isOpen,
  onClose,
  onSparePartSold,
  selectedPart = null,
  allSpareParts = [],
  defaultBranch = 'Surat'
}) => {
  const { currentUser } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedBranch, setSelectedBranch] = useState(defaultBranch || 'Surat');
  const [partId, setPartId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saleDate, setSaleDate] = useState(todayStr);
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initialBranch = selectedPart?.branch || defaultBranch || 'Surat';
      setSelectedBranch(initialBranch);

      const branchParts = allSpareParts.filter((p) => p.branch === initialBranch);
      const activePart = selectedPart || (branchParts.length > 0 ? branchParts[0] : null);

      setPartId(activePart?.id || '');
      setCustomerName('');
      setCompany('');
      setPhone('');
      setQuantity(1);
      setSaleDate(todayStr);
      setUnitPrice(activePart?.unitPrice ? String(activePart.unitPrice) : '');
      setNotes('');
    }
  }, [isOpen, selectedPart, allSpareParts, defaultBranch]);

  // When branch is changed by user
  const handleBranchChange = (branch) => {
    setSelectedBranch(branch);
    const branchParts = allSpareParts.filter((p) => p.branch === branch);
    if (branchParts.length > 0) {
      setPartId(branchParts[0].id);
      setUnitPrice(branchParts[0].unitPrice ? String(branchParts[0].unitPrice) : '');
    } else {
      setPartId('');
      setUnitPrice('');
    }
  };

  const branchSpareParts = allSpareParts.filter((p) => p.branch === selectedBranch);
  const currentPart = allSpareParts.find((p) => p.id === partId) || (branchSpareParts.length > 0 ? branchSpareParts[0] : null);
  const maxAvailable = Number(currentPart?.quantity) || 0;

  const getBranchStockCount = (br) => {
    return allSpareParts
      .filter((p) => p.branch === br)
      .reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
  };

  const handlePartChange = (e) => {
    const newId = e.target.value;
    setPartId(newId);
    const chosen = allSpareParts.find((p) => p.id === newId);
    if (chosen && chosen.unitPrice) {
      setUnitPrice(String(chosen.unitPrice));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !company.trim()) {
      toast.error('Please enter customer and company name');
      return;
    }

    if (!currentPart) {
      toast.error('Please select a spare part to sell');
      return;
    }

    const sellQty = Number(quantity) || 1;
    if (sellQty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (sellQty > maxAvailable) {
      toast.error(`Cannot sell ${sellQty} units. Only ${maxAvailable} available in stock!`);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Deduct stock quantity
      await db.adjustStockQuantity(currentPart.id, {
        adjustmentType: 'DEDUCT',
        quantity: sellQty,
        reason: 'Customer Spare Part Sale',
        notes: `Sold to ${customerName} (${company}) by ${currentUser?.name || 'Sales Rep'}`
      });

      // 2. Add customer sale record for tracking
      await db.addCustomerSale({
        customerName,
        company,
        phone,
        purchasedProduct: `${currentPart.itemName} (${sellQty} ${currentPart.unit || 'Units'})`,
        category: 'Spare Part',
        quantity: sellQty,
        unitPrice: Number(unitPrice) || Number(currentPart.unitPrice) || 0,
        dispatchBranch: currentPart.branch || selectedBranch,
        installationDate: saleDate,
        assignedEngineer: 'Direct Spare Part Sale',
        address: `${company} Site, Gujarat`,
        notes: `Spare part sale: ${currentPart.partNumber} x ${sellQty} @ ₹${unitPrice || currentPart.unitPrice}. ${notes}`
      }, currentUser);

      toast.success(`Successfully sold ${sellQty} ${currentPart.unit || 'units'} of ${currentPart.itemName}! Stock updated.`);

      if (onSparePartSold) {
        await onSparePartSold();
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record spare part sale.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = (Number(unitPrice) || 0) * (Number(quantity) || 1);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sell Spare Part from Stock" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Notice Banner */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Selling spare parts directly reduces warehouse stock and logs the sale under your sales representative account.
          </span>
        </div>

        {/* Branch Selection at TOP */}
        <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            <span>Dispatch / Warehouse Branch</span> <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Surat', 'Morbi', 'Rajkot'].map((br) => {
              const branchUnits = getBranchStockCount(br);
              const isSelected = selectedBranch === br;

              return (
                <button
                  key={br}
                  type="button"
                  onClick={() => handleBranchChange(br)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${isSelected
                      ? 'bg-[#3B318A] text-white border-[#3B318A] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                >
                  <span className="block">{br} Branch</span>
                  <span
                    className={`text-[10px] font-semibold block mt-0.5 ${isSelected
                        ? 'text-indigo-200'
                        : branchUnits > 0
                          ? 'text-emerald-700'
                          : 'text-gray-500'
                      }`}
                  >
                    {branchUnits} Units in Stock
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zero Stock Alert Banner for the Selected Branch */}
        {branchSpareParts.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>No spare parts in {selectedBranch} warehouse:</strong> Admin has not entered any spare part stock for {selectedBranch} yet.
            </span>
          </div>
        )}

        {/* Select Spare Part Item */}
        <CustomSelect
          label={`Select Spare Part from ${selectedBranch} Warehouse`}
          value={partId}
          onChange={handlePartChange}
          placeholder={branchSpareParts.length === 0 ? `No spare parts in ${selectedBranch} stock` : "Search or select spare part..."}
          disabled={branchSpareParts.length === 0}
          allowCustom={false}
          maxDropdownHeight={350}
          required
          options={branchSpareParts.map((part) => ({
            value: part.id,
            label: `${part.itemName} (${part.partNumber}) • ${part.quantity} ${part.unit || 'Units'} Available`
          }))}
        />

        {/* Selected Part Quick Info Pill */}
        {currentPart && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-gray-900">{currentPart.itemName}</p>
              <p className="text-[11px] text-gray-500 font-mono">{currentPart.partNumber} • {currentPart.branch} Warehouse</p>
            </div>
            <div className="text-right">
              <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                maxAvailable > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {maxAvailable} {currentPart.unit || 'Units'} in Stock
              </span>
            </div>
          </div>
        )}

        {/* Customer & Company Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Customer / Buyer Name"
            placeholder="e.g. Ketan Shah"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />

          <Input
            label="Company / Plant Name"
            placeholder="e.g. Royal Textile Mills"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
        </div>

        {/* Phone & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5 w-full">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              <span>Contact Phone</span> <span className="text-red-500">*</span>
            </label>
            <ReactPhoneInput
              country={'in'}
              enableSearch={true}
              searchPlaceholder="Search country..."
              value={phone}
              onChange={(p, country, e, formattedValue) => setPhone(formattedValue || p)}
              inputProps={{
                required: true,
                name: 'phone'
              }}
            />
          </div>

          <Input
            label="Sale Date"
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            required
          />
        </div>

        {/* Quantity & Unit Price */}
        <div className="grid grid-cols-2 gap-3.5">
          <Input
            label={`Quantity to Sell (Max: ${maxAvailable})`}
            type="number"
            min="1"
            max={maxAvailable > 0 ? maxAvailable : 1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />

          <Input
            label="Unit Price (₹)"
            type="number"
            min="0"
            placeholder="e.g. 2800"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
        </div>

        {/* Total Price preview */}
        {totalPrice > 0 && (
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs font-bold text-[#3B318A]">
            <span>Total Sale Value:</span>
            <span className="text-sm font-black">₹{totalPrice.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Notes */}
        <Textarea
          label="Sale Notes / Invoice Reference"
          placeholder="e.g. Emergency spare replacement, paid via UPI / Cheque."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || maxAvailable <= 0}
            icon={ShoppingBag}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
          >
            {submitting ? 'Recording Sale...' : 'Confirm Spare Part Sale'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
