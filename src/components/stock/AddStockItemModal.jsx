import React, { useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea, CustomSelect } from '../ui/Input.jsx';
import { Package, Plus, Sparkles, Building2, Wrench, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export const AddStockItemModal = ({
  isOpen,
  onClose,
  onStockAdded,
  defaultBranch = 'Surat',
  initialCategory = 'Spare Part'
}) => {
  const [formData, setFormData] = useState({
    itemName: '',
    category: initialCategory || 'Spare Part', // 'Machine' (Sales) | 'Spare Part' (Service)
    partNumber: '',
    branch: defaultBranch,
    quantity: initialCategory === 'Machine' ? 2 : 10,
    unit: 'Units',
    minAlertLevel: initialCategory === 'Machine' ? 2 : 4,
    annualConsumption: initialCategory === 'Machine' ? 12 : 50,
    unitPrice: '',
    compatibleModels: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        itemName: '',
        category: initialCategory || 'Spare Part',
        partNumber: '',
        branch: defaultBranch,
        quantity: initialCategory === 'Machine' ? 2 : 10,
        unit: 'Units',
        minAlertLevel: initialCategory === 'Machine' ? 2 : 4,
        annualConsumption: initialCategory === 'Machine' ? 12 : 50,
        unitPrice: '',
        compatibleModels: '',
        notes: ''
      });
    }
  }, [isOpen, initialCategory, defaultBranch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName.trim()) {
      toast.error('Please enter the item name.');
      return;
    }
    if (!formData.partNumber.trim()) {
      toast.error('Please enter the part number / SKU.');
      return;
    }

    setSubmitting(true);
    try {
      await onStockAdded({
        ...formData,
        quantity: Number(formData.quantity) || 0,
        minAlertLevel: Number(formData.minAlertLevel) || 0,
        annualConsumption: Number(formData.annualConsumption) || 0,
        unitPrice: Number(formData.unitPrice) || 0
      });
      toast.success(`${formData.category === 'Machine' ? 'Machine' : 'Spare Part'} added to ${formData.branch} branch inventory!`);
      onClose();
    } catch (err) {
      toast.error('Failed to add stock item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Stock / Inventory Item" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Choice: Sales Machine vs Service Spare Part */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            <span>Inventory Classification</span> <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, category: 'Machine', unit: 'Units', minAlertLevel: 2 })}
              className={`p-3 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                formData.category === 'Machine'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${formData.category === 'Machine' ? 'bg-[#3B318A] text-white' : 'bg-gray-100 text-gray-500'}`}>
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black">Machine (Sales)</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Air Compressors, Dryers, Chillers</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, category: 'Spare Part', unit: 'Units', minAlertLevel: 8 })}
              className={`p-3 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${
                formData.category === 'Spare Part'
                  ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${formData.category === 'Spare Part' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black">Spare Part (Service)</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Filters, Oil, Belts, Valves</p>
              </div>
            </button>
          </div>
        </div>

        {/* Branch Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            <span>Branch Location</span> <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Surat', 'Morbi', 'Rajkot'].map((br) => (
              <button
                key={br}
                type="button"
                onClick={() => setFormData({ ...formData, branch: br })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  formData.branch === br
                    ? 'bg-[#3B318A] text-white border-[#3B318A] shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                {br} Branch
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Item / Product Name"
            placeholder={formData.category === 'Machine' ? 'e.g. 50 HP Screw Air Compressor' : 'e.g. Air Filter Cartridge 50 HP'}
            value={formData.itemName}
            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
            required
          />

          <Input
            label="Part Number / SKU Code"
            placeholder="e.g. HT-AF-50HP-NF"
            value={formData.partNumber}
            onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Available Qty"
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
          />

          <CustomSelect
            label="Unit"
            name="unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            options={[
              'Units',
              'Pails (20L)',
              'Liters',
              'Sets',
              'Kits',
              'Meters',
              'Bottles',
              'Drums',
              'Rolls',
              'Bags'
            ]}
            customPlaceholder="e.g. Kg, Box, Cans..."
            allowCustom={true}
            required
          />

          <Input
            label="Min Reorder Alert"
            type="number"
            min="0"
            value={formData.minAlertLevel}
            onChange={(e) => setFormData({ ...formData, minAlertLevel: e.target.value })}
            required
          />
        </div>

        {/* 1-Year Annual Consumption Rate Field */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              1-Year Annual Consumption (Usage Rate)
            </label>
            <span className="text-[11px] font-bold text-amber-800">
              Avg: {(Number(formData.annualConsumption || 0) / 12).toFixed(1)} / month
            </span>
          </div>
          <Input
            type="number"
            min="0"
            placeholder="e.g. 140 (units used / sold in past 12 months)"
            value={formData.annualConsumption}
            onChange={(e) => setFormData({ ...formData, annualConsumption: e.target.value })}
            required
          />
          <p className="text-[11px] text-amber-800">
            Helps track high-consumption fast-moving items vs slow-moving inventory to optimize branch reordering.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Estimated Unit Price (₹)"
            type="number"
            min="0"
            placeholder="e.g. 2800"
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
          />

          <Input
            label="Compatible Equipment Models"
            placeholder="e.g. 50 HP, 60 HP, 75 HP Rotary Screw"
            value={formData.compatibleModels}
            onChange={(e) => setFormData({ ...formData, compatibleModels: e.target.value })}
          />
        </div>

        <Textarea
          label="Item Specifications & Warehouse Notes"
          placeholder="e.g. Store in clean dry rack. High-demand for Surat textile units."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={Plus} disabled={submitting}>
            {submitting ? 'Adding Item...' : 'Save Stock Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
