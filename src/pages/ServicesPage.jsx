import React, { useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { CheckCircle2, Calendar, Search, Wrench, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const loadServices = async () => {
    setLoading(true);
    const data = await db.getServices();
    setServices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleMarkComplete = async (serviceId) => {
    await db.updateServiceStatus(serviceId, 'Completed');
    toast.success('Service marked as completed! Engineer site report logged.');
    await loadServices();
  };

  const filteredServices = services.filter(s => {
    if (activeTab !== 'All' && s.status !== activeTab) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (s.customerName || '').toLowerCase().includes(q) ||
        (s.company || '').toLowerCase().includes(q) ||
        (s.product || '').toLowerCase().includes(q) ||
        (s.serviceName || '').toLowerCase().includes(q) ||
        (s.assignedEngineer || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed': return <Badge variant="success">Completed</Badge>;
      case 'In Progress': return <Badge variant="warning">In Progress</Badge>;
      case 'Upcoming': return <Badge variant="info">Upcoming Reminder</Badge>;
      default: return <Badge>{status}</Badge>;
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
      header: 'Purchased Item & Service Stage',
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
      header: 'Engineer Due Date',
      cell: (row) => (
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg w-fit">
          <Calendar className="w-3.5 h-3.5 text-[#3B318A]" />
          {row.scheduledDate}
        </span>
      )
    },
    {
      header: 'Field Engineer',
      cell: (row) => (
        <span className="text-xs font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
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
        <div>
          {row.status !== 'Completed' ? (
            <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => handleMarkComplete(row.id)}>
              Mark Complete
            </Button>
          ) : (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Done
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Engineer Service Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            Field Engineer Automated Service Reminders
          </h1>
          <p className="text-xs text-emerald-100 mt-1">
            Automated 3-Stage Service Engine: <strong>Service 1 (2 Months)</strong>, <strong>Service 2 (6 Months)</strong>, and <strong>Service 3 (10 Months)</strong> automatically generated upon purchase.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl border border-white/20 text-xs font-bold">
          <Clock className="w-4 h-4 text-amber-300" />
          <span>Intervals: 2M • 6M • 10M</span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        {['All', 'Upcoming', 'In Progress', 'Completed'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-[#3B318A] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab} Services
          </button>
        ))}
      </div>

      <Card className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search service schedule by customer, company, product, engineer..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading service schedules...</div>
        ) : (
          <Table columns={columns} data={filteredServices} emptyMessage="No service schedule records found." />
        )}
      </Card>
    </div>
  );
};

