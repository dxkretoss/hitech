import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { db } from '../../services/db.js';
import { Calendar, Wrench, User } from 'lucide-react';
import { toast } from 'sonner';

export const ScheduleServiceModal = ({ isOpen, onClose, onServiceCreated }) => {
  const [customers, setCustomers] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [serviceType, setServiceType] = useState('Routine Preventative Maintenance');
  const [customServiceName, setCustomServiceName] = useState('');
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
      if (custs && custs.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custs[0].id);
      }
      const engs = (profs || []).filter(p => p.role === 'Engineer');
      setEngineers(engs);
      if (engs.length > 0) {
        setAssignedEngineer(engs[0].name);
      }
    };
    if (isOpen) {
      loadInit();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      toast.error('Please select a valid customer.');
      return;
    }

    const finalServiceName = serviceType === 'Other' ? customServiceName.trim() : serviceType;
    if (serviceType === 'Other' && !finalServiceName) {
      toast.error('Please enter a custom service title/purpose.');
      return;
    }

    setSubmitting(true);
    try {
      await db.addService({
        customerId: customer.id,
        customerName: customer.customerName,
        company: customer.company,
        product: customer.purchasedProduct,
        serviceName: finalServiceName,
        scheduledDate,
        assignedEngineer,
        notes
      });
      toast.success(`Service scheduled for ${customer.customerName} on ${scheduledDate}`);
      onServiceCreated();
      onClose();
    } catch (err) {
      toast.error('Failed to schedule service');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Field Engineer Service" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            <span>Select Customer / Machine</span> <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] font-semibold text-gray-800"
            required
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.customerName} ({c.company}) — {c.purchasedProduct}
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-[#3B318A] flex justify-between items-center">
            <span>Equipment: <strong>{selectedCustomer.purchasedProduct}</strong></span>
            <span>Installed: <strong>{selectedCustomer.installationDate}</strong></span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            Service Title / Purpose
          </label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A]"
          >
            <option value="Routine Preventative Maintenance">Routine Preventative Maintenance</option>
            <option value="Air Filter & Oil Filter Replacement">Air Filter & Oil Filter Replacement</option>
            <option value="Major Compressor Overhaul & AMC Inspection">Major Compressor Overhaul & AMC Inspection</option>
            <option value="Breakdown / Emergency Repair Call">Breakdown / Emergency Repair Call</option>
            <option value="Initial Machine Commissioning Check">Initial Machine Commissioning Check</option>
            <option value="Other">Other (Custom Service Purpose)</option>
          </select>
        </div>

        {/* Custom Service Title Text Field when "Other" is selected */}
        {serviceType === 'Other' && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
            <Input
              label="Enter Custom Service Title / Purpose"
              placeholder="e.g. Oil Cooler Cleaning & Electrical Panel Servicing"
              value={customServiceName}
              onChange={(e) => setCustomServiceName(e.target.value)}
              required
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Scheduled Target Date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Assign Field Engineer
            </label>
            <select
              value={assignedEngineer}
              onChange={(e) => setAssignedEngineer(e.target.value)}
              className="w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A]"
            >
              {engineers.length > 0 ? (
                engineers.map(eng => (
                  <option key={eng.id} value={eng.name}>{eng.name}</option>
                ))
              ) : (
                <>
                  <option value="Sanjay Patel">Sanjay Patel</option>
                  <option value="Ramesh Kumar">Ramesh Kumar</option>
                </>
              )}
            </select>
          </div>
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
