import React, { useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { CompleteServiceModal } from '../components/services/CompleteServiceModal.jsx';
import { ScheduleServiceModal } from '../components/services/ScheduleServiceModal.jsx';
import {
  CheckCircle2,
  Calendar,
  Search,
  Wrench,
  Clock,
  ShieldCheck,
  Plus,
  FileText,
  User,
  ArrowRight,
  PackageCheck
} from 'lucide-react';
import { toast } from 'sonner';

export const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedServiceToComplete, setSelectedServiceToComplete] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [viewReportService, setViewReportService] = useState(null);

  const loadServices = async () => {
    setLoading(true);
    const data = await db.getServices();
    setServices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleOpenCompleteModal = (service) => {
    setSelectedServiceToComplete(service);
    setCompleteModalOpen(true);
  };

  const handleServiceCompleted = async (serviceId, report) => {
    await db.completeService(serviceId, report);
    toast.success(`Service report saved! Next service scheduled for ${report.nextServiceDate}.`);
    await loadServices();
  };

  const filteredServices = services.filter((s) => {
    if (activeTab !== 'All' && s.status !== activeTab) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (s.customerName || '').toLowerCase().includes(q) ||
        (s.company || '').toLowerCase().includes(q) ||
        (s.product || '').toLowerCase().includes(q) ||
        (s.serviceName || '').toLowerCase().includes(q) ||
        (s.assignedEngineer || '').toLowerCase().includes(q) ||
        (s.workDone || '').toLowerCase().includes(q) ||
        (s.partsReplaced || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success">Completed</Badge>;
      case 'In Progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'Upcoming':
        return <Badge variant="info">Upcoming Service</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Customer & Company',
      cell: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.customerName}</p>
          <p className="text-xs text-gray-500">{row.company || 'Industrial Client'}</p>
        </div>
      )
    },
    {
      header: 'Equipment & Service Title',
      cell: (row) => (
        <div>
          <p className="font-bold text-[#3B318A] text-xs flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-[#3B318A]" />
            {row.serviceName}
          </p>
          <p className="text-[11px] text-gray-500">{row.product || '50 HP Screw Air Compressor'}</p>
        </div>
      )
    },
    {
      header: 'Service Date',
      cell: (row) => (
        <div className="text-xs">
          {row.status === 'Completed' ? (
            <div>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Done: {row.completionDate || row.scheduledDate}
              </span>
              {row.nextServiceDate && (
                <span className="text-[11px] text-indigo-700 block mt-0.5 font-semibold">
                  Next Due: {row.nextServiceDate}
                </span>
              )}
            </div>
          ) : (
            <span className="font-bold text-slate-800 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg w-fit">
              <Calendar className="w-3.5 h-3.5 text-[#3B318A]" />
              Due: {row.scheduledDate}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Work Done / Parts Changed',
      cell: (row) => (
        <div className="max-w-[200px]">
          {row.status === 'Completed' ? (
            <div>
              {row.partsReplaced ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[190px]">
                  <PackageCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  {row.partsReplaced}
                </span>
              ) : row.workDone ? (
                <p className="text-xs text-gray-700 truncate" title={row.workDone}>
                  {row.workDone}
                </p>
              ) : (
                <span className="text-xs text-gray-400">Standard Service</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">Pending service execution</span>
          )}
        </div>
      )
    },
    {
      header: 'Field Engineer',
      cell: (row) => (
        <span className="text-xs font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
          <User className="w-3 h-3 text-emerald-700" />
          {row.assignedEngineer || 'Sanjay Patel'}
        </span>
      )
    },
    {
      header: 'Status',
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status !== 'Completed' ? (
            <Button
              size="sm"
              variant="success"
              icon={CheckCircle2}
              onClick={() => handleOpenCompleteModal(row)}
            >
              Log Work & Complete
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              icon={FileText}
              onClick={() => setViewReportService(row)}
            >
              View Report
            </Button>
          )}
        </div>
      )
    }
  ];

  const countUpcoming = services.filter((s) => s.status === 'Upcoming').length;
  const countInProgress = services.filter((s) => s.status === 'In Progress').length;
  const countCompleted = services.filter((s) => s.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Engineer Service Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-400" />
            Field Engineer Service & Maintenance Log
          </h1>
          <p className="text-xs text-emerald-100 mt-1">
            Engineers record work performed, parts replaced (e.g. Air filter, Oil filter), and set the <strong>Next Service Date</strong> upon completion.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => setScheduleModalOpen(true)} variant="white" icon={Plus}>
            Schedule Service
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('All')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'All'
              ? 'bg-[#3B318A] text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          All Services ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('Upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'Upcoming'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Upcoming ({countUpcoming})
        </button>
        <button
          onClick={() => setActiveTab('Completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'Completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Completed Reports ({countCompleted})
        </button>
      </div>

      <Card className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search service schedule by customer, company, parts changed, work done..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading service schedules...</div>
        ) : (
          <Table columns={columns} data={filteredServices} emptyMessage="No service schedule records found." />
        )}
      </Card>

      {/* Engineer Complete Service Modal */}
      <CompleteServiceModal
        isOpen={completeModalOpen}
        onClose={() => {
          setCompleteModalOpen(false);
          setSelectedServiceToComplete(null);
        }}
        service={selectedServiceToComplete}
        onServiceCompleted={handleServiceCompleted}
      />

      {/* Schedule Service Modal */}
      <ScheduleServiceModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onServiceCreated={loadServices}
      />

      {/* View Service Report Details Modal */}
      {viewReportService && (
        <Modal
          isOpen={!!viewReportService}
          onClose={() => setViewReportService(null)}
          title="Field Engineer Completed Service Report"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {viewReportService.serviceName}
                </h4>
                <Badge variant="success">Completed</Badge>
              </div>
              <p className="text-xs text-emerald-800">
                Customer: <strong>{viewReportService.customerName}</strong> ({viewReportService.company})
              </p>
              <p className="text-xs text-emerald-800">
                Equipment: <strong>{viewReportService.product}</strong>
              </p>
            </div>

            <div className="space-y-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-500 font-bold uppercase block">Work Done / Actions Performed:</span>
                <p className="text-gray-900 font-medium text-sm mt-0.5">{viewReportService.workDone || 'General maintenance check.'}</p>
              </div>

              {viewReportService.partsReplaced && (
                <div>
                  <span className="text-gray-500 font-bold uppercase block">Parts & Consumables Replaced:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md mt-0.5">
                    <PackageCheck className="w-3.5 h-3.5" />
                    {viewReportService.partsReplaced}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                <div>
                  <span className="text-gray-500 font-bold uppercase block">Completion Date:</span>
                  <span className="text-gray-900 font-bold">{viewReportService.completionDate || viewReportService.scheduledDate}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold uppercase block">Next Scheduled Service Date:</span>
                  <span className="text-[#3B318A] font-black">{viewReportService.nextServiceDate || 'Not specified'}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-bold uppercase block">Servicing Engineer:</span>
                <span className="text-gray-900 font-semibold">{viewReportService.assignedEngineer}</span>
              </div>

              {viewReportService.engineerNotes && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500 font-bold uppercase block">Engineer Site Notes / Advice:</span>
                  <p className="text-gray-800 italic mt-0.5">{viewReportService.engineerNotes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setViewReportService(null)}>
                Close Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
