import React, { useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { CheckCircle2, Calendar, Search } from 'lucide-react';
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
    toast.success('Service marked as completed successfully!');
    await loadServices();
  };

  const filteredServices = services.filter(s => {
    if (activeTab !== 'All' && s.status !== activeTab) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (s.customerName || '').toLowerCase().includes(q) ||
        (s.serviceName || '').toLowerCase().includes(q) ||
        (s.assignedEngineer || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed': return <Badge variant="success">Completed</Badge>;
      case 'Pending': return <Badge variant="warning">Pending Dispatch</Badge>;
      case 'Upcoming': return <Badge variant="info">Upcoming</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Customer',
      cell: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.customerName}</p>
        </div>
      )
    },
    { header: 'Service Stage', accessor: 'serviceName' },
    {
      header: 'Scheduled Date',
      cell: (row) => (
        <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-[#3B318A]" />
          {row.scheduledDate}
        </span>
      )
    },
    { header: 'Assigned Engineer', accessor: 'assignedEngineer' },
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
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            Auto 3-Stage Service Scheduler
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Automatically calculates Service 1 (+2m), Service 2 (+6m), and Service 3 (+10m) from machine installation date.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        {['All', 'Upcoming', 'Pending', 'Completed'].map(tab => (
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
            placeholder="Search service schedule by customer, stage, engineer..."
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
