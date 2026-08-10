import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import {
  Briefcase,
  Sparkles,
  Users,
  Wrench,
  Clock,
  CheckCircle2,
  Phone,
  CheckSquare,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export const DashboardPage = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [futureOpps, setFutureOpps] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [lData, cData, foData, sData] = await Promise.all([
      db.getLeads(),
      db.getCustomers(),
      db.getFutureOpportunities(),
      db.getServices()
    ]);
    setLeads(lData || []);
    setCustomers(cData || []);
    setFutureOpps(foData || []);
    setServices(sData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingServices = services.filter(s => s.status === 'Upcoming');
  const todaysServices = services.filter(s => s.scheduledDate === todayStr || s.status === 'Pending');
  const completedServices = services.filter(s => s.status === 'Completed');
  const todaysFollowups = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').slice(0, 5);
  const recentCustomers = customers.slice(0, 5);

  const handleMarkComplete = async (serviceId) => {
    await db.updateServiceStatus(serviceId, 'Completed');
    toast.success('Service marked as completed!');
    await loadData();
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-[#3B318A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Loading Live Database Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            {role === 'Engineer' ? 'Field Engineer Service Dashboard' : 'Hi-Tech Air CRM Dashboard'}
            <Badge variant="primary">{role}</Badge>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time overview of sales leads, future customer opportunities, and auto-scheduled services.
          </p>
        </div>
      </div>

      {/* Simple Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="hover:border-[#3B318A]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Total Leads</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-[#3B318A]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{leads.length}</span>
          <span className="text-[10px] text-gray-400">Active Pipeline</span>
        </Card>

        {(role === 'Owner' || role === 'SuperAdmin') && (
          <Card className="hover:border-[#3B318A]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-600 uppercase">Future Opps</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-black text-gray-900 mt-2 block">{futureOpps.length}</span>
            <span className="text-[10px] text-purple-600 font-medium">Owner Vault</span>
          </Card>
        )}

        <Card className="hover:border-[#3B318A]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Customers</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{customers.length}</span>
          <span className="text-[10px] text-gray-400">Active Accounts</span>
        </Card>

        <Card className="hover:border-[#3B318A]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Upcoming</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{upcomingServices.length}</span>
          <span className="text-[10px] text-gray-400">Services Scheduled</span>
        </Card>

        <Card className="hover:border-[#3B318A]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase">Today's</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{todaysServices.length}</span>
          <span className="text-[10px] text-amber-600 font-medium">Site Visits</span>
        </Card>

        <Card className="hover:border-[#3B318A]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Completed</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{completedServices.length}</span>
          <span className="text-[10px] text-gray-400">Services Verified</span>
        </Card>
      </div>

      {/* Engineer Dashboard Specific Action Section */}
      {role === 'Engineer' && (
        <Card className="bg-gradient-to-r from-[#3B318A] to-[#2F2770] text-white p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Field Service Dispatch Center</h2>
              <p className="text-xs text-indigo-100 mt-0.5">Manage today's site inspections and mark work completed.</p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/services')}>
              Open Service Scheduler
            </Button>
          </div>
        </Card>
      )}

      {/* Below Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Follow Ups */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#3B318A]" />
              Today's Follow Ups
            </h3>
            <Badge variant="warning">{todaysFollowups.length} Leads</Badge>
          </div>

          <div className="space-y-3">
            {todaysFollowups.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No active follow ups today.</p>
            ) : (
              todaysFollowups.map(l => (
                <div key={l.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-900">{l.customerName}</span>
                    <span className="text-[10px] text-gray-400">{l.followUpDate}</span>
                  </div>
                  <p className="text-xs text-gray-600">{l.company} • {l.phone}</p>
                  <p className="text-[11px] text-[#3B318A] font-medium">{l.requirement || l.interestedProduct}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Services */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#3B318A]" />
              Upcoming Services
            </h3>
            <Badge variant="info">{upcomingServices.length} Scheduled</Badge>
          </div>

          <div className="space-y-3">
            {upcomingServices.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No upcoming services.</p>
            ) : (
              upcomingServices.slice(0, 5).map(s => (
                <div key={s.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-900">{s.customerName}</span>
                    <Badge variant="primary">{s.scheduledDate}</Badge>
                  </div>
                  <p className="text-xs text-gray-600">{s.serviceName}</p>
                  <p className="text-[11px] text-gray-500">Eng: {s.assignedEngineer}</p>
                  {role === 'Engineer' && (
                    <Button size="sm" variant="success" icon={CheckSquare} onClick={() => handleMarkComplete(s.id)}>
                      Mark Complete
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Customers */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#3B318A]" />
              Recent Customers
            </h3>
            <Badge variant="success">Installed</Badge>
          </div>

          <div className="space-y-3">
            {recentCustomers.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No customer records yet.</p>
            ) : (
              recentCustomers.map(c => (
                <div key={c.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-900">{c.company}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">{c.installationDate}</span>
                  </div>
                  <p className="text-xs text-gray-600">{c.customerName} ({c.phone})</p>
                  <p className="text-[11px] font-semibold text-[#3B318A]">{c.purchasedProduct}</p>
                  <button
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="text-xs text-[#3B318A] font-bold flex items-center gap-1 hover:underline pt-1"
                  >
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
