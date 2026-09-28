import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea, CustomSelect } from '../ui/Input.jsx';
import { db } from '../../services/db.js';
import { Calendar, Wrench, User, Building2, Cpu } from 'lucide-react';
import { toast } from 'sonner';

export const ScheduleServiceModal = ({ isOpen, onClose, onServiceCreated }) => {
  const [customers, setCustomers] = useState([]);
  const [engineers, setEngineers] = useState([]);
  
  // Direct text input fields
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [company, setCompany] = useState('');
  const [product, setProduct] = useState('');
  
  const [serviceType, setServiceType] = useState('Routine Preventative Maintenance');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedEngineer, setAssignedEngineer] = useState('Sanjay Patel');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
      const [custs, profs] = await Promise.all([
        db.getCustomers(),
        db.getProfiles()
      ]);
      setCustomers(custs || []);
      const engs = (profs || []).filter(p => p.role === 'Engineer');
      setEngineers(engs);
      if (engs.length > 0) {
        setAssignedEngineer(engs[0].name);
      }
    };
    if (isOpen) {
      loadInit();
      // Reset fields on open
      setCustomerId('');
      setCustomerName('');
      setCompany('');
      setProduct('');
      setNotes('');
      setScheduledDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const handleSelectCustomer = (e) => {
    const selectedId = e.target.value;
    setCustomerId(selectedId);
    if (!selectedId) {
      return;
    }
    const found = customers.find(c => c.id === selectedId);
    if (found) {
      setCustomerName(found.customerName || '');
      setCompany(found.company || '');
      setProduct(found.purchasedProduct || '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error('Please enter customer / contact name.');
      return;
    }
    if (!company.trim()) {
      toast.error('Please enter company / factory name.');
      return;
    }
    if (!product.trim()) {
      toast.error('Please enter machine / product model.');
      return;
    }

    const finalServiceName = (serviceType || '').trim();
    if (!finalServiceName) {
      toast.error('Please enter a service title/purpose.');
      return;
    }

    setSubmitting(true);
    try {
      await db.addService({
        customerId: customerId || `CUST-${Date.now().toString().slice(-4)}`,
        customerName: customerName.trim(),
        company: company.trim(),
        product: product.trim(),
        serviceName: finalServiceName,
        scheduledDate,
        assignedEngineer,
        notes
      });
      toast.success(`Service scheduled for ${customerName} (${company}) on ${scheduledDate}`);
      onServiceCreated();
      onClose();
    } catch (err) {
      toast.error('Failed to schedule service');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Field Engineer Service" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Optional Quick Autofill from Registered Customers */}
        {customers.length > 0 && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <CustomSelect
              label="Quick Autofill from Existing Customer (Optional)"
              value={customerId}
              onChange={handleSelectCustomer}
              placeholder="Search or select existing customer..."
              allowCustom={false}
              maxDropdownHeight={350}
              options={customers.map(c => ({
                value: c.id,
                label: `${c.customerName} (${c.company}) — ${c.purchasedProduct}`
              }))}
            />
          </div>
        )}

        {/* Text Input Fields for Customer, Company, and Machine */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
              Customer / Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Dharmesh Joshi"
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] text-gray-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
              Company / Factory Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Surat Diamond Craft"
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] text-gray-900 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
            Machine / Equipment Model <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="e.g. 50 HP Screw Air Compressor"
            className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] text-gray-900 bg-white"
          />
        </div>

        <CustomSelect
          label="Service Title / Purpose"
          name="serviceType"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          options={[
            'Routine Preventative Maintenance',
            'Air Filter & Oil Filter Replacement',
            'Major Compressor Overhaul & AMC Inspection',
            'Breakdown / Emergency Repair Call',
            'Initial Machine Commissioning Check',
            'Oil Cooler Cleaning & Electrical Panel Servicing'
          ]}
          customPlaceholder="e.g. Custom valve replacement & pressure test"
          allowCustom={true}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Scheduled Target Date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
          />

          <CustomSelect
            label="Assign Field Engineer"
            name="assignedEngineer"
            value={assignedEngineer}
            onChange={(e) => setAssignedEngineer(e.target.value)}
            options={
              engineers.length > 0
                ? engineers.map(eng => ({ value: eng.name, label: eng.name }))
                : [
                    { value: 'Sanjay Patel', label: 'Sanjay Patel' },
                    { value: 'Ramesh Kumar', label: 'Ramesh Kumar' }
                  ]
            }
            customPlaceholder="Enter custom engineer name..."
            allowCustom={true}
          />
        </div>

        <Textarea
          label="Service Instructions / Notes"
          placeholder="e.g. Inspect air filter and pressure valves; check compressor oil level."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={Calendar} disabled={submitting}>
            {submitting ? 'Scheduling...' : 'Schedule Service'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
