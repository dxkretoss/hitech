import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { Badge } from '../ui/Badge.jsx';
import { db } from '../../services/db.js';
import {
  Wrench,
  CheckCircle2,
  Calendar,
  Plus,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  Package,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * CompleteServiceModal
 * Dedicated engineer service completion workflow:
 * - Logs Work Done & Maintenance Performed
 * - Records Parts Replaced (integrated with Branch Spare Parts Stock: Surat, Morbi, Rajkot)
 * - Sets Completion Date
 * - Allows Field Engineer to specify the NEXT Service Due Date (with quick presets)
 * - Automatically queues the next service in the continuous maintenance cycle
 */
export const CompleteServiceModal = ({
  isOpen,
  onClose,
  service,
  onServiceCompleted
}) => {
  const [completionDate, setCompletionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [workDone, setWorkDone] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [engineerNotes, setEngineerNotes] = useState('');
  const [assignedEngineer, setAssignedEngineer] = useState('Sanjay Patel');
  const [selectedBranch, setSelectedBranch] = useState('Surat');
  const [availableSpareParts, setAvailableSpareParts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Common quick-pick maintenance tasks for compressors & equipment
  const commonTasks = [
    'Air Filter Replaced',
    'Oil Filter Replaced',
    'Compressor Oil Changed / Topped Up',
    'Air-Oil Separator Replaced',
    'Drive Belt Tension Inspected',
    'Condensate Auto-Drain Serviced',
    'Operating Pressure & Temp Tested',
    'Cooling Radiator Fins Cleaned',
    'Electrical Connections Checked'
  ];

  // Helper to add months to a given date
  const calculatePresetDate = (months) => {
    const base = completionDate ? new Date(completionDate) : new Date();
    const d = new Date(base);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    const loadStock = async () => {
      const allStock = await db.getStockItems();
      const spareParts = (allStock || []).filter(s => s.category === 'Spare Part');
      setAvailableSpareParts(spareParts);
    };
    if (isOpen) {
      loadStock();
    }
  }, [isOpen]);

  useEffect(() => {
    if (service) {
      setCompletionDate(new Date().toISOString().split('T')[0]);
      setWorkDone(service.workDone || '');
      setPartsReplaced(service.partsReplaced || '');
      setEngineerNotes(service.engineerNotes || '');
      setAssignedEngineer(service.assignedEngineer || 'Sanjay Patel');
      
      // Default next service date to +3 months from today
      const defaultNext = calculatePresetDate(3);
      setNextServiceDate(service.nextServiceDate || defaultNext);
    }
  }, [service, isOpen]);

  const handleSelectStockPart = (part) => {
    const partLabel = `${part.itemName} (${part.partNumber})`;
    if (!partsReplaced.includes(part.itemName)) {
      setPartsReplaced(prev => prev ? `${prev}, ${partLabel}` : partLabel);
      setWorkDone(prev => prev ? `${prev}, Replaced ${part.itemName}` : `Replaced ${part.itemName}`);
      toast.success(`Selected ${part.itemName} (${part.branch} Branch stock: ${part.quantity} ${part.unit})`);
    }
  };

  const handleToggleTaskChip = (task) => {
    if (workDone.includes(task)) {
      // Remove task
      const updated = workDone
        .split(',')
        .map(t => t.trim())
        .filter(t => t && t !== task)
        .join(', ');
      setWorkDone(updated);
    } else {
      // Add task
      const updated = workDone ? `${workDone}, ${task}` : task;
      setWorkDone(updated);
    }

    // Auto-update parts replaced if filter was changed
    if (task.includes('Air Filter') && !partsReplaced.includes('Air Filter')) {
      setPartsReplaced(prev => prev ? `${prev}, Air Filter Element` : 'Air Filter Element');
    }
    if (task.includes('Oil Filter') && !partsReplaced.includes('Oil Filter')) {
      setPartsReplaced(prev => prev ? `${prev}, Oil Filter Cartridge` : 'Oil Filter Cartridge');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workDone.trim()) {
      toast.error('Please describe what work was completed or parts replaced during this service.');
      return;
    }
    if (!nextServiceDate) {
      toast.error('Please select the Next Service Date for this machine.');
      return;
    }

    setSubmitting(true);
    try {
      await onServiceCompleted(service.id, {
        completionDate,
        workDone: workDone.trim(),
        partsReplaced: partsReplaced.trim(),
        nextServiceDate,
        engineerNotes: engineerNotes.trim(),
        assignedEngineer
      });
      onClose();
    } catch (err) {
      toast.error('Failed to complete service report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!service) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Field Engineer Service Report & Next Date Scheduling"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Service / Machine Summary Card */}
        <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-indigo-200 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-indigo-400" />
              {service.serviceName}
            </h4>
            <Badge variant="warning">{service.status}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1 border-t border-slate-800">
            <p>Customer: <strong className="text-white">{service.customerName}</strong> ({service.company})</p>
            <p>Equipment: <strong className="text-white">{service.product}</strong></p>
            <p>Scheduled Due Date: <strong className="text-white">{service.scheduledDate}</strong></p>
            <p>Engineer: <strong className="text-emerald-400">{assignedEngineer}</strong></p>
          </div>
        </div>

        {/* 1. Quick Task Selection Chips */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            Quick Maintenance Actions Checklist
          </label>
          <div className="flex flex-wrap gap-1.5">
            {commonTasks.map((task) => {
              const isSelected = workDone.includes(task);
              return (
                <button
                  key={task}
                  type="button"
                  onClick={() => handleToggleTaskChip(task)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {task}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Detailed Work Done & Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            <span>Detailed Work Done / Maintenance Log</span> <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={workDone}
            onChange={(e) => setWorkDone(e.target.value)}
            placeholder="e.g. Replaced air filter cartridge, checked discharge pressure (8.5 bar), flushed condensate line, inspected motor bearings."
            required
            rows={3}
          />
        </div>

        {/* 3. Specific Parts Replaced with Branch Stock Integration */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Parts / Consumables Replaced
            </label>
            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <Package className="w-3 h-3" />
              Branch Stock Quick-Pick
            </span>
          </div>

          {availableSpareParts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-emerald-50/50 rounded-xl border border-emerald-100 max-h-24 overflow-y-auto">
              {availableSpareParts.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => handleSelectStockPart(part)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-100 transition-all flex items-center gap-1 shadow-2xs"
                  title={`${part.itemName} - ${part.branch} Branch: ${part.quantity} in stock`}
                >
                  <span>+ {part.itemName}</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">
                    {part.branch}: {part.quantity} {part.unit}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Input
            placeholder="e.g. Air Filter Cartridge (HT-AF-50HP), Spin-On Oil Filter, Synthetic Oil (5L)"
            value={partsReplaced}
            onChange={(e) => setPartsReplaced(e.target.value)}
          />
        </div>

        {/* 4. Service Completion Date & Next Service Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
          <Input
            label="Service Completion Date"
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              <span>Next Service Due Date</span> <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={nextServiceDate}
              onChange={(e) => setNextServiceDate(e.target.value)}
              className="w-full h-[38px] px-3 py-2 text-sm font-bold text-[#3B318A] border border-indigo-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] bg-white outline-none"
              required
            />
            {/* Quick Presets for Next Date */}
            <div className="flex items-center gap-1 pt-1 overflow-x-auto">
              <span className="text-[10px] text-gray-500 font-bold uppercase mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => setNextServiceDate(calculatePresetDate(1))}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-50"
              >
                +1 Mo
              </button>
              <button
                type="button"
                onClick={() => setNextServiceDate(calculatePresetDate(2))}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-50"
              >
                +2 Mo
              </button>
              <button
                type="button"
                onClick={() => setNextServiceDate(calculatePresetDate(3))}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-50"
              >
                +3 Mo
              </button>
              <button
                type="button"
                onClick={() => setNextServiceDate(calculatePresetDate(6))}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-50"
              >
                +6 Mo
              </button>
            </div>
          </div>
        </div>

        {/* 5. Engineer Notes & Site Remarks */}
        <Textarea
          label="Engineer Site Observations & Advice for Customer"
          placeholder="e.g. Ambient room temperature high; advised customer to maintain proper ventilation. Next visit: inspect air-oil separator."
          value={engineerNotes}
          onChange={(e) => setEngineerNotes(e.target.value)}
          rows={2}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-500 flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Next service queued on: <strong>{nextServiceDate || 'selected date'}</strong></span>
          </p>
          <div className="flex items-center gap-2 shrink-0 justify-end">
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 font-bold whitespace-nowrap"
              icon={CheckCircle2}
              disabled={submitting}
            >
              {submitting ? 'Logging Service...' : 'Complete & Schedule Next Date'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
