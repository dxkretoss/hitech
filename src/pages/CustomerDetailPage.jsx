import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleMarkComplete = async (serviceId) => {
    await db.updateServiceStatus(serviceId, 'Completed');
    toast.success('Service marked as completed');
    await loadData();
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-gray-400">
        Loading customer details from Supabase...
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
      case 'Completed': return <Badge variant="success">Completed</Badge>;
      case 'Pending': return <Badge variant="warning">Pending</Badge>;
      case 'Upcoming': return <Badge variant="info">Upcoming</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#3B318A]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Customers List
      </button>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900">{customer.company}</h1>
            <Badge variant="primary">Customer 360</Badge>
          </div>
          <p className="text-sm font-semibold text-gray-600 mt-1">Contact: {customer.customerName} ({customer.phone})</p>
          <p className="text-xs text-gray-400 mt-0.5">{customer.address}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Information Card */}
        <Card className="space-y-4">
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
            <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-[11px] text-[#3B318A]">
              <strong>Auto Service Schedule Active:</strong> 3 recurring services generated automatically (+2m, +6m, +10m).
            </div>
          </div>
        </Card>

        {/* Service Summary Stats */}
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-2 border-gray-100 uppercase tracking-wider">
            Service Schedule Summary
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
              <span className="text-xl font-black block">{services.filter(s => s.status === 'Completed').length}</span>
              <span className="text-[10px] font-bold uppercase">Completed</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 text-sky-700">
              <span className="text-xl font-black block">{services.filter(s => s.status !== 'Completed').length}</span>
              <span className="text-[10px] font-bold uppercase">Upcoming / Pending</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Auto Service Schedule Timeline */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Auto 3-Stage Service Schedule Timeline</h2>
            <p className="text-xs text-gray-500">Calculated automatically from Installation Date ({customer.installationDate})</p>
          </div>
        </div>

        <div className="relative pl-6 border-l-2 border-indigo-200 space-y-6 py-2">
          {services.map((srv, idx) => (
            <div key={srv.id} className="relative group">
              <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white ${
                srv.status === 'Completed' ? 'border-emerald-500 bg-emerald-500' : 'border-[#3B318A]'
              }`} />

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#3B318A]">Stage {idx + 1}</span>
                    <h4 className="text-sm font-bold text-gray-900">{srv.serviceName}</h4>
                    {getStatusBadge(srv.status)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Scheduled Target Date: <strong>{srv.scheduledDate}</strong></p>
                </div>

                {srv.status !== 'Completed' && (
                  <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => handleMarkComplete(srv.id)}>
                    Mark Completed
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
