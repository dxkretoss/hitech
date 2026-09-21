import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
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

    const finalProduct =
      formData.selectedProduct === 'OTHER_CUSTOM'
        ? formData.customProduct.trim()
        : formData.selectedProduct;

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

        {/* Branch Warehouse Selection */}
        <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            <span>Dispatch / Installation Branch Warehouse</span> <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Surat', 'Morbi', 'Rajkot'].map((br) => {
              const branchMachinesCount = machineStock
                .filter((m) => m.branch === br)
                .reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);

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
                      isSelected ? 'text-indigo-200' : 'text-emerald-700'
                    }`}
                  >
                    {branchMachinesCount} Machines in Stock
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Machine Product & Serial Tag */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Installed Machine Model <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.selectedProduct}
              onChange={(e) => setFormData({ ...formData, selectedProduct: e.target.value })}
              className="w-full h-[38px] px-3 py-2 text-xs font-semibold border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] bg-white text-gray-900"
            >
              <optgroup label="Standard Air Compressors">
                <option value="50 HP Screw Air Compressor">50 HP Screw Air Compressor</option>
                <option value="75 HP VFD Screw Compressor">75 HP VFD Screw Compressor</option>
                <option value="100 HP Heavy-Duty Screw Air Compressor">100 HP Heavy-Duty Screw Air Compressor</option>
                <option value="30 HP Compact Rotary Screw Compressor">30 HP Compact Rotary Screw Compressor</option>
                <option value="HT-PET 40 Bar Compressor">HT-PET 40 Bar Compressor</option>
                <option value="HT-20 HP Oil Free Compressor">HT-20 HP Oil Free Compressor</option>
              </optgroup>
              <optgroup label="Chillers & Dryers">
                <option value="10-Ton Industrial Water Chiller">10-Ton Industrial Water Chiller</option>
                <option value="Refrigerated Air Dryer 100 CFM">Refrigerated Air Dryer 100 CFM</option>
                <option value="Refrigerated Air Dryer 150 CFM">Refrigerated Air Dryer 150 CFM</option>
              </optgroup>
              <optgroup label="Custom / Other">
                <option value="OTHER_CUSTOM">+ Other / Custom Machine Model</option>
              </optgroup>
            </select>
          </div>

          <Input
            label="Machine Serial No. / Asset Tag (Optional)"
            placeholder="e.g. HT-2026-SRT-9401"
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
          />
        </div>

        {/* Custom Machine Input (Shown when OTHER_CUSTOM is selected) */}
        {isCustomProduct && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <Input
              label="Specify Custom Machine Model Name"
              placeholder="e.g. HT-150 HP Direct Drive Variable Screw Compressor"
              value={formData.customProduct}
              onChange={(e) => setFormData({ ...formData, customProduct: e.target.value })}
              required
              className="bg-white"
            />
          </div>
        )}

        {/* Next Service Due Date & Assigned Field Engineer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Next / 1st Service Due Date"
            type="date"
            value={formData.nextServiceDate}
            onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
            placeholder="Select date"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Assigned Field Engineer <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assignedEngineer}
              onChange={(e) => setFormData({ ...formData, assignedEngineer: e.target.value })}
              className="w-full h-[38px] px-3 py-2 text-xs font-medium border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] bg-white text-gray-900 truncate"
            >
              {engineers.length > 0 ? (
                engineers.map((eng) => (
                  <option key={eng.id} value={eng.name}>
                    {eng.name} ({eng.branch || 'Gujarat'})
                  </option>
                ))
              ) : (
                <>
                  <option value="Sanjay Patel">Sanjay Patel (Surat)</option>
                  <option value="Rameshwar Joshi">Rameshwar Joshi (Morbi)</option>
                  <option value="Ketan Solanki">Ketan Solanki (Rajkot)</option>
                </>
              )}
            </select>
          </div>
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
