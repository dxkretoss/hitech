import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { CompleteServiceModal } from '../components/services/CompleteServiceModal.jsx';
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Wrench,
  PackageCheck,
  Plus,
  ShieldCheck,
  User,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedServiceToComplete, setSelectedServiceToComplete] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const cust = await db.getCustomerById(id);
    setCustomer(cust);
    if (cust) {
      const srvs = await db.getServicesByCustomer(cust.id);
      setServices(srvs || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleOpenCompleteModal = (service) => {
    setSelectedServiceToComplete(service);
    setCompleteModalOpen(true);
  };

  const handleServiceCompleted = async (serviceId, report) => {
    await db.completeService(serviceId, report);
    toast.success(`Service completed! Next service scheduled for ${report.nextServiceDate}.`);
    await loadData();
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-gray-400">
        Loading customer details...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-gray-500">
        Customer record not found.
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success">Completed</Badge>;
      case 'Pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'Upcoming':
        return <Badge variant="info">Upcoming</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#3B318A] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Customers List
      </button>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">{customer.company}</h1>
            <Badge variant="primary">Customer 360</Badge>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
            Contact: {customer.customerName} ({customer.phone})
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{customer.address}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Customer Information Card */}
        <Card className="p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-2 border-gray-100 uppercase tracking-wider">
            Customer Details
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-gray-400 block font-medium">Customer Name</span>
              <span className="font-bold text-gray-900">{customer.customerName}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Company</span>
              <span className="font-bold text-gray-900">{customer.company}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Phone</span>
              <span className="font-bold text-gray-900">{customer.phone}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Assigned Service Engineer</span>
              <span className="font-bold text-[#3B318A]">{customer.assignedEngineer}</span>
            </div>
          </div>
        </Card>

        {/* Machine Product Card */}
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-2 border-gray-100 uppercase tracking-wider">
            Purchased Equipment
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-gray-400 block font-medium">Machine Model</span>
              <span className="font-black text-sm text-[#3B318A]">{customer.purchasedProduct}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Installation Date</span>
              <span className="font-bold text-emerald-600">{customer.installationDate}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800 space-y-1">
              <strong className="block font-bold">Dynamic Service Cycle:</strong>
              Field engineers log parts changed (e.g. Air Filter) and specify the next service date upon completion.
            </div>
          </div>
        </Card>

        {/* Service Summary Stats */}
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-2 border-gray-100 uppercase tracking-wider">
            Maintenance Summary
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
              <span className="text-xl font-black block">
                {services.filter((s) => s.status === 'Completed').length}
              </span>
              <span className="text-[10px] font-bold uppercase">Completed Reports</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 text-sky-700">
              <span className="text-xl font-black block">
                {services.filter((s) => s.status !== 'Completed').length}
              </span>
              <span className="text-[10px] font-bold uppercase">Upcoming Due</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Engineer Service Schedule Timeline */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Equipment Service & Maintenance History</h2>
            <p className="text-xs text-gray-500">
              Continuous maintenance cycle recorded by Field Engineers with work performed & parts replaced.
            </p>
          </div>
        </div>

        {services.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No service records found for this equipment.</p>
        ) : (
          <div className="relative pl-6 border-l-2 border-indigo-200 space-y-6 py-2">
            {services.map((srv, idx) => (
              <div key={srv.id} className="relative group">
                <div
                  className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white ${
                    srv.status === 'Completed' ? 'border-emerald-500 bg-emerald-500' : 'border-[#3B318A]'
                  }`}
                />

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#3B318A]">Stage {idx + 1}</span>
                      <h4 className="text-sm font-bold text-gray-900">{srv.serviceName}</h4>
                      {getStatusBadge(srv.status)}
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      Scheduled Target Date: <strong>{srv.scheduledDate}</strong>
                      {srv.completionDate && (
                        <span className="text-emerald-700 ml-2 font-bold">
                          (Completed on {srv.completionDate})
                        </span>
                      )}
                    </p>

                    {srv.workDone && (
                      <div className="mt-2 text-xs bg-white p-2.5 rounded-xl border border-gray-200">
                        <span className="text-gray-500 font-bold block">Work Performed:</span>
                        <p className="text-gray-800 mt-0.5">{srv.workDone}</p>
                        {srv.partsReplaced && (
                          <div className="mt-1 flex items-center gap-1 text-emerald-800 font-semibold">
                            <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Parts Replaced: {srv.partsReplaced}</span>
                          </div>
                        )}
                        {srv.nextServiceDate && (
                          <div className="mt-1 text-indigo-700 font-bold">
                            Next Service Scheduled for: {srv.nextServiceDate}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {srv.status !== 'Completed' && (
                    <Button
                      size="sm"
                      variant="success"
                      icon={CheckCircle2}
                      onClick={() => handleOpenCompleteModal(srv)}
                    >
                      Log Work & Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Complete Service Modal */}
      <CompleteServiceModal
        isOpen={completeModalOpen}
        onClose={() => {
          setCompleteModalOpen(false);
          setSelectedServiceToComplete(null);
        }}
        service={selectedServiceToComplete}
        onServiceCompleted={handleServiceCompleted}
      />
    </div>
  );
};
