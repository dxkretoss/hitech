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
  PhoneCall,
  CheckSquare,
  ChevronRight,
  Plus,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Calendar,
  Building2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export const DashboardPage = () => {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [futureOpps, setFutureOpps] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwner = role === 'Owner' || role === 'SuperAdmin' || role === 'Admin';

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
    if (isOwner) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    loadData();
  }, [role]);

  const todayStr = new Date().toISOString().split('T')[0];

  // --- SALES SPECIFIC DATA ---
  const activeLeads = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost');
  const todaysFollowups = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost');
  const wonDeals = leads.filter(l => l.status === 'Won').length + customers.length;
  const totalPipelineCount = leads.length;
  const recentSalesCustomers = customers.slice(0, 5);
  const futureReqCount = futureOpps.length + leads.filter(l => l.status === 'Future Requirement').length;

  // --- ENGINEER SPECIFIC DATA ---
  // Filter services assigned to current engineer or all services if engineer
  const myServices = services.filter(s => {
    if (!currentUser?.name) return true;
    return (
      !s.assignedEngineer ||
      s.assignedEngineer.toLowerCase().includes(currentUser.name.toLowerCase()) ||
      currentUser.name.toLowerCase().includes(s.assignedEngineer.toLowerCase())
    );
  });
  const engineerServiceList = myServices.length > 0 ? myServices : services;
  const upcomingServices = engineerServiceList.filter(s => s.status === 'Upcoming');
  const todaysSiteVisits = engineerServiceList.filter(s => s.scheduledDate === todayStr || s.status === 'Pending' || s.status === 'In Progress');
  const completedServices = engineerServiceList.filter(s => s.status === 'Completed');

  const handleMarkComplete = async (serviceId) => {
    await db.updateServiceStatus(serviceId, 'Completed');
    toast.success('Service marked as completed! Maintenance log updated.');
    await loadData();
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center items-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#3B318A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-semibold">Loading live workspace data...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // 1. FIELD ENGINEER DASHBOARD
  // ==========================================
  if (role === 'Engineer') {
    return (
      <div className="space-y-6">
        {/* Engineer Header */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">Field Engineering & Service Center</h1>
              <Badge variant="success">Engineer Workspace</Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Welcome back, <strong>{currentUser?.name || 'Field Engineer'}</strong>. Manage your scheduled machine inspections, preventative maintenance, and client site visits.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="primary"
              icon={Wrench}
              onClick={() => navigate('/services')}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black shadow-lg"
            >
              Full Service Scheduler
            </Button>
            <Button
              variant="primary"
              icon={Users}
              onClick={() => navigate('/customers')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg"
            >
              Customer Machine List
            </Button>
          </div>
        </div>

        {/* Engineer Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="hover:border-teal-500 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Today's Site Visits</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-black text-gray-900 mt-2 block">{todaysSiteVisits.length}</span>
            <span className="text-[10px] text-amber-600 font-bold">Action Required</span>
          </Card>

          <Card className="hover:border-teal-500 border-l-4 border-l-sky-500">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Upcoming Maintenance</span>
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-black text-gray-900 mt-2 block">{upcomingServices.length}</span>
            <span className="text-[10px] text-gray-400">Scheduled Reminders</span>
          </Card>

          <Card className="hover:border-teal-500 border-l-4 border-l-teal-500">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Completed Services</span>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-black text-gray-900 mt-2 block">{completedServices.length}</span>
            <span className="text-[10px] text-teal-600 font-bold">Verified & Serviced</span>
          </Card>

          <Card className="hover:border-teal-500 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Machine Accounts</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-[#3B318A]">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-black text-gray-900 mt-2 block">{customers.length}</span>
            <span className="text-[10px] text-gray-400">Installed Equipment</span>
          </Card>
        </div>

        {/* Engineer Two-Column Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Today's Work Orders & Upcoming Maintenance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's / Pending Site Visits */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Today's Field Work Orders & Site Visits
                </h3>
                <Badge variant="warning">{todaysSiteVisits.length} Assigned</Badge>
              </div>

              <div className="space-y-3">
                {todaysSiteVisits.length === 0 ? (
                  <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <CheckCircle2 className="w-8 h-8 text-teal-500 mx-auto mb-1.5 opacity-80" />
                    <p className="text-xs font-bold text-gray-700">All Site Visits Up to Date</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">No overdue or pending maintenance tasks for today.</p>
                  </div>
                ) : (
                  todaysSiteVisits.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-teal-500 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900">{s.customerName}</span>
                          <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                            {s.company || 'Direct Client'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5 text-teal-600" />
                          {s.serviceName}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Equipment: <strong className="text-gray-700">{s.product || 'Screw Air Compressor'}</strong> • Due: <strong className="text-amber-600">{s.scheduledDate}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="success"
                          icon={CheckSquare}
                          onClick={() => handleMarkComplete(s.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Upcoming Scheduled Reminders */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  Upcoming Auto-Generated Preventative Schedule (+2m, +6m, +10m)
                </h3>
                <Badge variant="info">{upcomingServices.length} In Queue</Badge>
              </div>

              <div className="space-y-2.5">
                {upcomingServices.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No upcoming scheduled services in queue.</p>
                ) : (
                  upcomingServices.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 flex justify-between items-center text-xs"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{s.customerName} <span className="text-gray-400 font-normal">({s.company})</span></p>
                        <p className="text-[11px] text-gray-600">{s.serviceName}</p>
                      </div>
                      <Badge variant="primary">{s.scheduledDate}</Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right Column (1 col): Installed Customer Machine Base & Protocol */}
          <div className="space-y-6">
            {/* Installed Customer Machine Directory */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b pb-2 border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#3B318A]" />
                  Active Customer Accounts
                </h3>
                <span className="text-[10px] text-gray-400 font-bold">{customers.length} Accounts</span>
              </div>

              <div className="space-y-2">
                {recentSalesCustomers.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                    <p className="font-bold text-gray-900">{c.company}</p>
                    <p className="text-[11px] text-[#3B318A] font-semibold">{c.purchasedProduct}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Installed: {c.installationDate}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Engineer Quality Protocol Card */}
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-teal-800">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Service Protocol Reminder:
              </p>
              <p className="text-[11px] text-teal-700 leading-relaxed">
                Ensure compressor oil level, air filter cleanliness, and belt tension are tested during every scheduled 2-month, 6-month, and 10-month visit.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. SALES PERSON DASHBOARD
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Sales Header Banner */}
      <div className="bg-gradient-to-r from-[#3B318A] via-indigo-900 to-[#2F2770] text-white p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black">Sales Pipeline & Opportunity Workspace</h1>
            <Badge variant="warning">Sales Representative</Badge>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            Welcome, <strong>{currentUser?.name || 'Sales Representative'}</strong>. Track customer requirements, manage follow-up calls, and close equipment deals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate('/leads')}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-lg"
          >
            Quick Add Lead
          </Button>
          <Button
            variant="primary"
            icon={ShoppingBag}
            onClick={() => navigate('/customers')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg"
          >
            Record Item Sale
          </Button>
        </div>
      </div>

      {/* Sales Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="hover:border-[#3B318A] border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Active Leads Pipeline</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-[#3B318A]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{totalPipelineCount}</span>
          <span className="text-[10px] text-gray-400">Total Inquiries</span>
        </Card>

        <Card className="hover:border-[#3B318A] border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Today's Follow-Ups</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{todaysFollowups.length}</span>
          <span className="text-[10px] text-amber-600 font-bold">Calls Scheduled</span>
        </Card>

        <Card className="hover:border-[#3B318A] border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Future Requirements</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{futureReqCount}</span>
          <span className="text-[10px] text-purple-600 font-medium">Deferred Client Needs</span>
        </Card>

        <Card className="hover:border-[#3B318A] border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Deals Won / Converted</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{wonDeals}</span>
          <span className="text-[10px] text-emerald-600 font-bold">Closed Sales</span>
        </Card>
      </div>

      {/* Sales Two-Column Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Today's Follow-Ups & Active Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Follow Ups */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#3B318A]" />
                  Today's Scheduled Client Follow-Ups
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Direct contacts requiring follow-up discussions today</p>
              </div>
              <Badge variant="warning">{todaysFollowups.length} Leads</Badge>
            </div>

            <div className="space-y-3">
              {todaysFollowups.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-xs font-bold text-gray-700">No Pending Follow-Ups Today</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Great job! All customer follow-ups have been addressed.</p>
                </div>
              ) : (
                todaysFollowups.map((l) => (
                  <div
                    key={l.id}
                    className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 hover:border-[#3B318A] transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{l.customerName}</span>
                        <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                          {l.company || 'Individual'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span className="font-semibold text-gray-800">{l.phone}</span>
                        {l.notes && <span className="text-[11px] text-gray-400 truncate max-w-xs">• "{l.notes}"</span>}
                      </p>
                      <p className="text-[11px] text-[#3B318A] font-bold">
                        Requirement: {l.requirement || l.interestedProduct}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={`tel:${l.phone}`}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate('/leads')}
                        className="text-xs"
                      >
                        View in Leads
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Active Sales Leads Directory */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Active Sales Pipeline
              </h3>
              <button
                onClick={() => navigate('/leads')}
                className="text-xs text-[#3B318A] font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                View Full Lead Table <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-100">
                    <th className="py-2.5 px-3">Client Name</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Product Interest</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Follow-Up Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.slice(0, 6).map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{lead.customerName}</td>
                      <td className="py-2.5 px-3 text-gray-600">{lead.company}</td>
                      <td className="py-2.5 px-3 text-[#3B318A] font-semibold">{lead.interestedProduct || lead.requirement}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={lead.status === 'Won' ? 'success' : lead.status === 'Future Requirement' ? 'warning' : 'primary'}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 font-medium">{lead.followUpDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column (1 col): Recent Converted Accounts & Sales Tips */}
        <div className="space-y-6">
          {/* Recent Converted Customers */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                Recent Converted Customers
              </h3>
              <Badge variant="success">Closed</Badge>
            </div>

            <div className="space-y-2.5">
              {recentSalesCustomers.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">No customer records yet.</p>
              ) : (
                recentSalesCustomers.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">{c.company}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">{c.installationDate}</span>
                    </div>
                    <p className="text-gray-600">{c.customerName} ({c.phone})</p>
                    <p className="text-[11px] font-semibold text-[#3B318A]">{c.purchasedProduct}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Sales Tip */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-[#3B318A]">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Future Requirement Vault:
            </p>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              When a client indicates they don't need equipment immediately (e.g. 6 or 10 months later), save it as <strong>Future Requirement</strong> so it is automatically queued for future re-engagement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

