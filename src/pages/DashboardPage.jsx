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
  ArrowRight,
  Eye
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
  const hasStockAccess = isOwner || currentUser?.canViewStock === true;

  const loadData = async () => {
    setLoading(true);
    const [lData, cData, foData, sData] = await Promise.all([
      db.getLeads(currentUser),
      db.getCustomers(currentUser),
      db.getFutureOpportunities(currentUser),
      db.getServices(currentUser)
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
  }, [currentUser, role]);

  const todayStr = new Date().toISOString().split('T')[0];

  const currentUserName = (currentUser?.name || '').toLowerCase();
  const currentUserId = currentUser?.id;

  // --- SALES SPECIFIC DATA ---
  const mySalesItems = customers.filter(c => {
    if (!currentUserName && !currentUserId) return false;
    const sName = (c.salesPersonName || '').toLowerCase();
    return (
      c.salesPersonId === currentUserId ||
      (sName && (sName.includes(currentUserName) || currentUserName.includes(sName)))
    );
  });

  const activeLeads = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost');
  const todaysFollowups = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost');
  const wonDeals = leads.filter(l => l.status === 'Won').length;
  const totalPipelineCount = leads.length;
  const recentWonDeals = leads.filter(l => l.status === 'Won').slice(0, 5);
  const futureReqCount = futureOpps.length + leads.filter(l => l.status === 'Future Requirement').length;

  // --- ENGINEER SPECIFIC DATA ---
  // Filter services strictly assigned to current engineer (no fallback to all services)
  const engineerServiceList = services.filter(s => {
    if (!currentUserName) return false;
    const assigned = (s.assignedEngineer || '').toLowerCase();
    return assigned && (assigned.includes(currentUserName) || currentUserName.includes(assigned));
  });

  const myEngineerSoldItems = customers.filter(c => {
    if (!currentUserName && !currentUserId) return false;
    const sName = (c.salesPersonName || '').toLowerCase();
    return (
      c.salesPersonId === currentUserId ||
      (sName && (sName.includes(currentUserName) || currentUserName.includes(sName)))
    );
  });

  const upcomingServices = engineerServiceList.filter(s => s.status === 'Upcoming' && s.scheduledDate > todayStr);
  const todaysSiteVisits = engineerServiceList.filter(s => s.status !== 'Completed' && (s.scheduledDate <= todayStr || s.status === 'Pending' || s.status === 'In Progress'));
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
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-white/10 shrink-0 mt-0.5 sm:mt-1">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-2xl font-black text-white leading-snug">
                  Field Engineering & Service Center
                </h1>
                <Badge variant="success" className="shrink-0 text-[10px] sm:text-xs">Engineer Workspace</Badge>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Welcome back, <strong>{currentUser?.name || 'Field Engineer'}</strong>. Manage your scheduled machine inspections, preventative maintenance, and client site visits.
              </p>
            </div>
          </div>
        </div>

        {/* Engineer Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="hover:border-teal-500 border-l-4 border-l-amber-500 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Today's Site Visits</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-black text-gray-900 mt-2 block">{todaysSiteVisits.length}</span>
            <span className="text-[10px] text-amber-600 font-bold">Action Required</span>
          </Card>

          <Card className="hover:border-teal-500 border-l-4 border-l-sky-500 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Upcoming Maintenance</span>
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-black text-gray-900 mt-2 block">{upcomingServices.length}</span>
            <span className="text-[10px] text-gray-400">Scheduled Reminders</span>
          </Card>

          <Card className="hover:border-teal-500 border-l-4 border-l-teal-500 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Completed Services</span>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-black text-gray-900 mt-2 block">{completedServices.length}</span>
            <span className="text-[10px] text-teal-600 font-bold">Verified & Serviced</span>
          </Card>

          <Card className="hover:border-teal-500 border-l-4 border-l-indigo-500 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Assigned Services</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-[#3B318A]">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-black text-gray-900 mt-2 block">{engineerServiceList.length}</span>
            <span className="text-[10px] text-gray-400">Total Work Orders</span>
          </Card>
        </div>

        {/* Engineer Two-Column Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Today's Work Orders & Upcoming Maintenance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's / Pending Site Visits */}
            <Card className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b pb-3 border-gray-100">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5 min-w-0">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate sm:whitespace-normal">Today's Field Work Orders & Site Visits</span>
                </h3>
                <Badge variant="warning" className="shrink-0 text-[10px] sm:text-xs">{todaysSiteVisits.length} Assigned</Badge>
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
                        <div className="flex items-center gap-2 flex-wrap">
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
                          variant="outline"
                          icon={Eye}
                          onClick={() => navigate('/services')}
                          className="font-bold text-xs text-[#3B318A] hover:bg-indigo-50 border-indigo-200"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Upcoming Scheduled Reminders */}
            <Card className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b pb-3 border-gray-100">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5 min-w-0">
                  <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                  <span className="truncate sm:whitespace-normal">Upcoming Scheduled Maintenance</span>
                </h3>
                <Badge variant="info" className="shrink-0 text-[10px] sm:text-xs">{upcomingServices.length} In Queue</Badge>
              </div>

              <div className="space-y-2.5">
                {upcomingServices.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No upcoming scheduled services in queue.</p>
                ) : (
                  upcomingServices.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 flex justify-between items-center gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{s.customerName} <span className="text-gray-400 font-normal">({s.company})</span></p>
                        <p className="text-[11px] text-gray-600 truncate">{s.serviceName}</p>
                      </div>
                      <Badge variant="primary" className="shrink-0 text-[10px]">{s.scheduledDate}</Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right Column (1 col): Service Overview & Quality Protocol */}
          <div className="space-y-6">

            {/* Recent Service Assignments */}
            <Card className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b pb-2 border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 min-w-0">
                  <Wrench className="w-3.5 h-3.5 text-[#3B318A] shrink-0" />
                  <span className="truncate">My Service Work Orders</span>
                </h3>
                <span className="text-[10px] text-gray-400 font-bold shrink-0">{engineerServiceList.length} Tasks</span>
              </div>

              <div className="space-y-2">
                {engineerServiceList.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No service tasks currently assigned.</p>
                ) : (
                  engineerServiceList.slice(0, 5).map((s) => (
                    <div key={s.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                      <p className="font-bold text-gray-900 truncate">{s.customerName} <span className="text-gray-400 font-normal">({s.company})</span></p>
                      <p className="text-[11px] text-teal-700 font-semibold truncate">{s.serviceName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Date: {s.scheduledDate}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Engineer Quality Protocol Card */}
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-teal-800">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
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
      <div className="bg-gradient-to-r from-[#3B318A] via-indigo-900 to-[#2F2770] text-white p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/10 shrink-0 mt-0.5 sm:mt-1">
            <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-2xl font-black text-white leading-snug">
                Sales Pipeline & Opportunity Workspace
              </h1>
              <Badge variant="warning" className="shrink-0 text-[10px] sm:text-xs">Sales Representative</Badge>
            </div>
            <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
              Welcome, <strong>{currentUser?.name || 'Sales Representative'}</strong>. Track customer requirements, manage follow-up calls, and close equipment deals.
            </p>
          </div>
        </div>
      </div>

      {/* Sales Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:border-[#3B318A] border-l-4 border-l-indigo-600 p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Active Leads Pipeline</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-[#3B318A]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{totalPipelineCount}</span>
          <span className="text-[10px] text-gray-400">Total Inquiries</span>
        </Card>

        <Card className="hover:border-[#3B318A] border-l-4 border-l-amber-500 p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Today's Follow-Ups</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{todaysFollowups.length}</span>
          <span className="text-[10px] text-amber-600 font-bold">Calls Scheduled</span>
        </Card>

        <Card className="hover:border-[#3B318A] border-l-4 border-l-purple-500 p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Future Requirements</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{futureReqCount}</span>
          <span className="text-[10px] text-purple-600 font-medium">Deferred Client Needs</span>
        </Card>

        <Card className="hover:border-[#3B318A] border-l-4 border-l-emerald-500 p-3.5 sm:p-4">
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
          <Card className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b pb-3 border-gray-100">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5 min-w-0">
                  <Phone className="w-4 h-4 text-[#3B318A] shrink-0" />
                  <span className="truncate sm:whitespace-normal">Today's Scheduled Client Follow-Ups</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate sm:whitespace-normal">Direct contacts requiring follow-up discussions today</p>
              </div>
              <Badge variant="warning" className="shrink-0 text-[10px] sm:text-xs">{todaysFollowups.length} Leads</Badge>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900">{l.customerName}</span>
                        <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                          {l.company || 'Individual'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
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
          <Card className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b pb-3 border-gray-100">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5 min-w-0">
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate sm:whitespace-normal">Active Sales Pipeline</span>
              </h3>
              <button
                onClick={() => navigate('/leads')}
                className="text-xs text-[#3B318A] font-bold flex items-center gap-1 hover:underline cursor-pointer shrink-0"
              >
                <span>View Full Table</span> <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
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
          {/* My Sold Items & Machine Deals (Only if granted access by Admin) */}
          {hasStockAccess && (
            <Card className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b pb-2 border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 min-w-0">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">My Sold Items & Machines</span>
                </h3>
                <Badge variant="success" className="shrink-0 text-[10px]">{mySalesItems.length} Sold</Badge>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {mySalesItems.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No sales records registered yet.</p>
                ) : (
                  mySalesItems.map((sale) => (
                    <div key={sale.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                      <div className="flex justify-between items-center gap-1">
                        <span className="font-bold text-gray-900 truncate">{sale.company || sale.customerName}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                          {sale.branch}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#3B318A] font-semibold truncate">{sale.purchasedProduct}</p>
                      <p className="text-[10px] text-gray-400">{sale.installationDate || 'Recent'} • Qty: {sale.quantity || 1}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Recent Won Deals */}
          <Card className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b pb-2 border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 min-w-0">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Recent Won Deals</span>
              </h3>
              <Badge variant="success" className="shrink-0 text-[10px]">Closed</Badge>
            </div>

            <div className="space-y-2.5">
              {recentWonDeals.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">No won deals yet.</p>
              ) : (
                recentWonDeals.map((lead) => (
                  <div key={lead.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                    <div className="flex justify-between items-center gap-1">
                      <span className="font-bold text-gray-900 truncate">{lead.company || lead.customerName}</span>
                      <span className="text-[10px] text-emerald-600 font-bold shrink-0">{lead.followUpDate || 'Converted'}</span>
                    </div>
                    <p className="text-gray-600 truncate">{lead.customerName} ({lead.phone})</p>
                    <p className="text-[11px] font-semibold text-[#3B318A] truncate">{lead.requirement || lead.interestedProduct}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Sales Tip */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-[#3B318A]">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
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

