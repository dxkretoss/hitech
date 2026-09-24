import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea, CustomSelect } from '../ui/Input.jsx';
import { db } from '../../services/db.js';
import { Wrench, ShoppingBag, Building2, ShieldCheck, CheckCircle2, PackageCheck, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const ReactPhoneInput = PhoneInput.default || PhoneInput;

export const NewInstallationModal = ({ isOpen, onClose, onInstallationCreated, defaultBranch = 'Surat' }) => {
  const [engineers, setEngineers] = useState([]);
  const [machineStock, setMachineStock] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    customerName: '',
    company: '',
    phone: '',
    dispatchBranch: defaultBranch || 'Surat',
    selectedProduct: '50 HP Screw Air Compressor',
    customProduct: '',
    serialNumber: '',
    installationDate: todayStr,
    nextServiceDate: '',
    assignedEngineer: 'Sanjay Patel',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setFormData((prev) => ({
        ...prev,
        customerName: '',
        company: '',
        phone: '',
        dispatchBranch: defaultBranch || 'Surat',
        selectedProduct: '50 HP Screw Air Compressor',
        customProduct: '',
        serialNumber: '',
        installationDate: today,
        nextServiceDate: '',
        address: '',
        notes: ''
      }));

      const loadData = async () => {
        const [profiles, allStock] = await Promise.all([
          db.getProfiles(),
          db.getStockItems()
        ]);
        const engs = (profiles || []).filter((p) => p.role === 'Engineer');
        setEngineers(engs);
        if (engs.length > 0) {
          setFormData((prev) => ({ ...prev, assignedEngineer: engs[0].name }));
        }
        const machines = (allStock || []).filter((s) => s.category === 'Machine');
        setMachineStock(machines);
      };
      loadData();
    }
  }, [isOpen, defaultBranch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName || !formData.company) {
      toast.error('Please enter customer and company name');
      return;
    }

    const finalProduct = (formData.selectedProduct || '').trim();

    if (!finalProduct) {
      toast.error('Please specify the machine model');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Record customer & machine installation (also triggers initial commissioning service)
      const newRecord = await db.addCustomerSale({
        customerName: formData.customerName,
        company: formData.company,
        phone: formData.phone,
        purchasedProduct: finalProduct,
        dispatchBranch: formData.dispatchBranch,
        installationDate: formData.installationDate,
        nextServiceDate: formData.nextServiceDate || formData.installationDate,
        assignedEngineer: formData.assignedEngineer,
        address: formData.address || `${formData.company} Plant, Gujarat`,
        serialNumber: formData.serialNumber,
        notes: formData.notes
      });

      // 2. If matching machine stock is found in dispatch branch, deduct 1 unit
      const matchingStock = machineStock.find(
        (s) =>
          s.branch === formData.dispatchBranch &&
          (s.itemName.toLowerCase().includes(finalProduct.toLowerCase()) ||
            finalProduct.toLowerCase().includes(s.itemName.toLowerCase()))
      );

      if (matchingStock && matchingStock.quantity > 0) {
        await db.adjustStockQuantity(matchingStock.id, {
          adjustmentType: 'DEDUCT',
          quantity: 1,
          reason: 'Machine Installation & Field Commissioning',
          notes: `Installed for ${formData.customerName} (${formData.company}) by ${formData.assignedEngineer}`
        });
        toast.success(`Machine installation recorded! 1 unit deducted from ${formData.dispatchBranch} warehouse.`);
      } else {
        toast.success(`Machine installation recorded! 1st Service scheduled.`);
      }

      if (onInstallationCreated) {
        await onInstallationCreated(newRecord);
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to register machine installation.');
    } finally {
      setSubmitting(false);
    }
  };

  const isCustomProduct = formData.selectedProduct === 'OTHER_CUSTOM';

  const getBranchMachineInfo = (branchName) => {
    const selected = (formData.selectedProduct || '').trim().toLowerCase();
    const branchItems = machineStock.filter((m) => m.branch === branchName);
    const totalBranchMachines = branchItems.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);

    const matchedItem = branchItems.find(
      (m) =>
        selected &&
        (m.itemName.toLowerCase().includes(selected) || selected.includes(m.itemName.toLowerCase()))
    );

    const modelQty = matchedItem ? Number(matchedItem.quantity) || 0 : 0;

    return {
      totalBranchMachines,
      modelQty,
      hasMatchedModel: !!matchedItem
    };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Machine Installation" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Commissioning Notice Banner */}
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            Field Engineering Commissioning Cycle:
          </p>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Registering a new installation logs the customer machine record, automatically generates the <strong>Stage 1 Commissioning Service</strong> with your specified next service date, and updates branch stock.
          </p>
        </div>

        {/* Customer & Company Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Customer / Buyer Contact Name"
            placeholder="e.g. Ramesh Patel"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
          />

          <Input
            label="Company / Industrial Plant Name"
            placeholder="e.g. Surat Polyfab Industries"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
          />
        </div>

        {/* Phone & Installation Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5 w-full">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              <span>Contact Phone</span> <span className="text-red-500">*</span>
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

          <Input
            label="Installation / Commissioning Date"
            type="date"
            value={formData.installationDate}
            onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
            required
          />
        </div>

        {/* Machine Product & Serial Tag */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <CustomSelect
            label="Installed Machine Model"
            name="selectedProduct"
            value={formData.selectedProduct}
            onChange={(e) => setFormData({ ...formData, selectedProduct: e.target.value })}
            options={[
              { value: '50 HP Screw Air Compressor', label: '50 HP Screw Air Compressor', group: 'Standard Air Compressors' },
              { value: '75 HP VFD Screw Compressor', label: '75 HP VFD Screw Compressor', group: 'Standard Air Compressors' },
              { value: '100 HP Heavy-Duty Screw Air Compressor', label: '100 HP Heavy-Duty Screw Air Compressor', group: 'Standard Air Compressors' },
              { value: '30 HP Compact Rotary Screw Compressor', label: '30 HP Compact Rotary Screw Compressor', group: 'Standard Air Compressors' },
              { value: 'HT-PET 40 Bar Compressor', label: 'HT-PET 40 Bar Compressor', group: 'Standard Air Compressors' },
              { value: 'HT-20 HP Oil Free Compressor', label: 'HT-20 HP Oil Free Compressor', group: 'Standard Air Compressors' },
              { value: '10-Ton Industrial Water Chiller', label: '10-Ton Industrial Water Chiller', group: 'Chillers & Dryers' },
              { value: 'Refrigerated Air Dryer 100 CFM', label: 'Refrigerated Air Dryer 100 CFM', group: 'Chillers & Dryers' },
              { value: 'Refrigerated Air Dryer 150 CFM', label: 'Refrigerated Air Dryer 150 CFM', group: 'Chillers & Dryers' }
            ]}
            customPlaceholder="e.g. HT-150 HP Direct Drive Variable Screw Compressor"
            allowCustom={true}
            required
          />

          <Input
            label="Machine Serial No. / Asset Tag (Optional)"
            placeholder="e.g. HT-2026-SRT-9401"
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
          />
        </div>

        {/* Dynamic Branch Warehouse Selection */}
        <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            <span>Dispatch / Installation Branch Warehouse</span> <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Surat', 'Morbi', 'Rajkot'].map((br) => {
              const { totalBranchMachines, modelQty, hasMatchedModel } = getBranchMachineInfo(br);
              const isSelected = formData.dispatchBranch === br;

              return (
                <button
                  key={br}
                  type="button"
                  onClick={() => setFormData({ ...formData, dispatchBranch: br })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-[#3B318A] text-white border-[#3B318A] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className="block">{br} Branch</span>
                  <span
                    className={`text-[10px] font-semibold block mt-0.5 ${
                      isSelected
                        ? 'text-indigo-200'
                        : hasMatchedModel && modelQty > 0
                        ? 'text-emerald-700'
                        : hasMatchedModel && modelQty === 0
                        ? 'text-rose-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {hasMatchedModel
                      ? `${modelQty} in Stock • ${totalBranchMachines} Total`
                      : `${totalBranchMachines} Machines in Stock`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Next Service Due Date & Assigned Field Engineer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Next / 1st Service Due Date"
            type="date"
            value={formData.nextServiceDate}
            onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
            placeholder="Select date"
          />

          <CustomSelect
            label="Assigned Field Engineer"
            name="assignedEngineer"
            value={formData.assignedEngineer}
            onChange={(e) => setFormData({ ...formData, assignedEngineer: e.target.value })}
            options={
              engineers.length > 0
                ? engineers.map((eng) => ({
                    value: eng.name,
                    label: `${eng.name} (${eng.branch || 'Gujarat'})`
                  }))
                : [
                    { value: 'Sanjay Patel', label: 'Sanjay Patel (Surat)' },
                    { value: 'Rameshwar Joshi', label: 'Rameshwar Joshi (Morbi)' },
                    { value: 'Ketan Solanki', label: 'Ketan Solanki (Rajkot)' }
                  ]
            }
            customPlaceholder="Enter custom engineer / contractor name..."
            allowCustom={true}
            required
          />
        </div>

        {/* Plant Site / Installation Address */}
        <Input
          label="Plant Site / Installation Address"
          placeholder="e.g. Plot No. 88, GIDC Sachin, Surat"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />

        {/* Notes */}
        <Textarea
          label="Commissioning Instructions & Site Notes"
          placeholder="e.g. Electrical wiring completed, 3-phase connection verified, scheduled for first load test."
          rows={2}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            icon={Wrench}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
          >
            {submitting ? 'Registering...' : 'Register Machine & Generate 1st Service'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
