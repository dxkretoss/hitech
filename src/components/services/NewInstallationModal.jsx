import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea, CustomSelect } from '../ui/Input.jsx';
import { db } from '../../services/db.js';
import { Wrench, ShoppingBag, Building2, ShieldCheck, CheckCircle2, PackageCheck, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const ReactPhoneInput = PhoneInput.default || PhoneInput;

export const NewInstallationModal = ({
  isOpen,
  onClose,
  onInstallationCreated,
  defaultBranch = 'Surat',
  initialMachine = null
}) => {
  const { currentUser } = useAuth();
  const [engineers, setEngineers] = useState([]);
  const [machineStock, setMachineStock] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    customerName: '',
    company: '',
    phone: '',
    dispatchBranch: defaultBranch || 'Surat',
    selectedProduct: initialMachine?.itemName || '',
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
        dispatchBranch: initialMachine?.branch || defaultBranch || 'Surat',
        selectedProduct: initialMachine?.itemName || '',
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
        if (machines.length > 0 && !initialMachine) {
          setFormData((prev) => ({
            ...prev,
            selectedProduct: machines[0].itemName,
            dispatchBranch: machines[0].branch || prev.dispatchBranch
          }));
        }
      };
      loadData();
    }
  }, [isOpen, defaultBranch, initialMachine]);

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
      // 1. Check stock availability in database
      const matchingStock = machineStock.find(
        (s) =>
          s.branch === formData.dispatchBranch &&
          (s.itemName.toLowerCase() === finalProduct.toLowerCase() ||
            s.itemName.toLowerCase().includes(finalProduct.toLowerCase()) ||
            finalProduct.toLowerCase().includes(s.itemName.toLowerCase()))
      );

      if (matchingStock && Number(matchingStock.quantity) <= 0) {
        toast.error(`"${finalProduct}" is currently OUT OF STOCK in ${formData.dispatchBranch} warehouse (0 Units available).`);
        setSubmitting(false);
        return;
      }

      // 2. Record customer & machine installation (also triggers initial commissioning service)
      const newRecord = await db.addCustomerSale({
        customerName: formData.customerName,
        company: formData.company,
        phone: formData.phone,
        purchasedProduct: finalProduct,
        category: 'Machine',
        quantity: 1,
        dispatchBranch: formData.dispatchBranch,
        installationDate: formData.installationDate,
        nextServiceDate: formData.nextServiceDate || formData.installationDate,
        assignedEngineer: formData.assignedEngineer,
        address: formData.address || `${formData.company} Plant, Gujarat`,
        serialNumber: formData.serialNumber,
        notes: formData.notes
      }, currentUser);

      // 3. If matching machine stock is found in dispatch branch, deduct 1 unit
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

  // Build dynamic options STRICTLY filtered by the selected branch warehouse
  const dynamicMachineOptions = React.useMemo(() => {
    const branchMachines = machineStock.filter((m) => m.branch === formData.dispatchBranch);
    if (branchMachines.length > 0) {
      return branchMachines.map((m) => {
        const qty = Number(m.quantity) || 0;
        return {
          value: m.itemName,
          label: `${m.itemName} (${m.partNumber}) • ${qty > 0 ? `[${qty} In Stock]` : '[OUT OF STOCK (0 Units)]'}`,
          group: `${formData.dispatchBranch} Branch Warehouse (${branchMachines.length} Models)`
        };
      });
    }
    return []; // STRICTLY EMPTY if no items in this branch
  }, [machineStock, formData.dispatchBranch]);

  const currentSelectedStock = machineStock.find(
    (s) => s.branch === formData.dispatchBranch && s.itemName === formData.selectedProduct
  );
  const currentStockQty = currentSelectedStock ? Number(currentSelectedStock.quantity) || 0 : null;

  const handleBranchSelect = (br) => {
    const branchMachines = machineStock.filter((m) => m.branch === br);
    const hasCurrentModel = branchMachines.some((m) => m.itemName === formData.selectedProduct);

    setFormData((prev) => ({
      ...prev,
      dispatchBranch: br,
      selectedProduct: hasCurrentModel ? prev.selectedProduct : (branchMachines.length > 0 ? branchMachines[0].itemName : '')
    }));
  };

  const handleProductChange = (e) => {
    const selected = e.target.value;
    const matchingItem = machineStock.find((m) => m.itemName === selected && m.branch === formData.dispatchBranch);
    setFormData((prev) => ({
      ...prev,
      selectedProduct: selected,
      dispatchBranch: matchingItem?.branch || prev.dispatchBranch
    }));
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

        {/* Dynamic Branch Warehouse Selection (Moved to TOP) */}
        <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            <span>Dispatch / Installation Branch Warehouse</span> <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {['Surat', 'Morbi', 'Rajkot'].map((br) => {
              const { totalBranchMachines, modelQty, hasMatchedModel } = getBranchMachineInfo(br);
              const isSelected = formData.dispatchBranch === br;

              return (
                <button
                  key={br}
                  type="button"
                  onClick={() => handleBranchSelect(br)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${isSelected
                      ? 'bg-[#3B318A] text-white border-[#3B318A] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                >
                  <span className="block">{br} Branch</span>
                  <span
                    className={`text-[10px] font-semibold block mt-0.5 ${isSelected
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

        {/* Zero Stock Alert Banner when no machines have been added by Admin */}
        {machineStock.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>No machines in warehouse inventory:</strong> Admin has not entered any machine stock yet.
            </span>
          </div>
        )}

        {/* Machine Product & Serial Tag */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <CustomSelect
            label="Machine"
            name="selectedProduct"
            value={formData.selectedProduct}
            onChange={handleProductChange}
            options={dynamicMachineOptions}
            placeholder={
              dynamicMachineOptions.length === 0
                ? `No machines in ${formData.dispatchBranch} warehouse stock`
                : `Select ${formData.dispatchBranch} machine model...`
            }
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

        {/* Real-Time Live Stock Verification Status Indicator */}
        {formData.selectedProduct && (
          <div>
            {currentSelectedStock ? (
              currentStockQty > 0 ? (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Stock Verified:</strong> <span className="font-bold text-emerald-700">{currentStockQty} {currentSelectedStock.unit || 'Units'} available</span> in {formData.dispatchBranch} branch warehouse.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong className="text-rose-700">Out of Stock Alert:</strong> 0 units available in {formData.dispatchBranch} warehouse. Please select another model or switch branch.
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Custom / Non-catalog machine equipment entry.</span>
              </div>
            )}
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
