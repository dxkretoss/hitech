import React, { useState } from 'react';
import { Card } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  Wrench,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

export const AdminAnalyticsCharts = ({ leads = [], customers = [], services = [], salesSummary = [] }) => {
  const [activeChartTab, setActiveChartTab] = useState('ALL'); // 'ALL' | 'SALES' | 'CUSTOMERS' | 'SERVICES'
  const [hoveredBar, setHoveredBar] = useState(null);

  // Helper to parse date to YYYY-MM
  const parseYearMonth = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr === 'string' && dateStr.length >= 7 && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 2 && parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}`;
      }
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    } catch (e) {}
    return null;
  };

  // Helper to generate dynamic past 6 months from current date
  const getPastMonths = (count = 6) => {
    const result = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        key: yearMonth,
        month: monthName,
        year: d.getFullYear()
      });
    }
    return result;
  };

  const pastMonths = getPastMonths(6);

  // -------------------------------------------------------------
  // 1. SALES ANALYTICS DATA (100% Dynamically Computed from Real Leads)
  // -------------------------------------------------------------
  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.status === 'Won').length;
  const activeLeads = leads.filter((l) => l.status !== 'Won' && l.status !== 'Lost' && l.status !== 'Future Requirement').length;
  const futureReqs = leads.filter((l) => l.status === 'Future Requirement').length;
  const lostLeads = leads.filter((l) => l.status === 'Lost').length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Real Monthly Sales Leads aggregation
  const monthlySalesData = pastMonths.map((m) => {
    const monthLeads = leads.filter((l) => {
      const dStr = l.date || l.createdAt || l.created_at || l.followUpDate || '';
      const ym = parseYearMonth(dStr);
      return ym === m.key;
    });

    const wonCount = monthLeads.filter((l) => l.status === 'Won').length;

    return {
      month: m.month,
      year: m.year,
      yearMonth: m.key,
      leads: monthLeads.length,
      won: wonCount
    };
  });

  const maxLeadCount = Math.max(...monthlySalesData.map((d) => d.leads), 5);

  // -------------------------------------------------------------
  // 2. CUSTOMER & INSTALLATION DATA (100% Dynamically Computed from Real Customers)
  // -------------------------------------------------------------
  const totalInstallations = customers.length;
  const suratCustomers = customers.filter((c) => (c.branch || 'Surat').toLowerCase() === 'surat').length;
  const morbiCustomers = customers.filter((c) => (c.branch || '').toLowerCase() === 'morbi').length;
  const rajkotCustomers = customers.filter((c) => (c.branch || '').toLowerCase() === 'rajkot').length;

  // Dynamically group machine models from real customer records
  const categoryMap = {};
  customers.forEach((c) => {
    const prod = c.purchasedProduct || 'Screw Air Compressor';
    categoryMap[prod] = (categoryMap[prod] || 0) + 1;
  });

  const categoryColors = [
    'bg-[#3B318A]',
    'bg-emerald-600',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-amber-500',
    'bg-sky-500',
    'bg-purple-500'
  ];

  const machineCategories = Object.entries(categoryMap).map(([name, count], idx) => ({
    name,
    count,
    color: categoryColors[idx % categoryColors.length]
  }));

  // -------------------------------------------------------------
  // 3. SERVICE OPERATIONS DATA (100% Dynamically Computed from Real Services)
  // -------------------------------------------------------------
  const totalServices = services.length;
  const completedServices = services.filter((s) => s.status === 'Completed').length;
  const upcomingServices = services.filter((s) => s.status === 'Upcoming').length;
  const inProgressServices = services.filter((s) => s.status === 'In Progress' || s.status === 'Pending').length;
  const serviceCompletionRate = totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;

  // Real Monthly Service Trend aggregation
  const serviceTrend = pastMonths.map((m) => {
    const scheduled = services.filter((s) => {
      const ym = parseYearMonth(s.scheduledDate || s.scheduled_date || s.created_at);
      return ym === m.key;
    }).length;

    const completed = services.filter((s) => {
      const ym = parseYearMonth(s.completionDate || s.completion_date || s.scheduledDate || s.scheduled_date);
      return ym === m.key && s.status === 'Completed';
    }).length;

    return {
      month: m.month,
      year: m.year,
      yearMonth: m.key,
      scheduled,
      completed
    };
  });

  const maxServiceCount = Math.max(...serviceTrend.map((s) => s.scheduled), 5);

  return (
    <div className="space-y-6">
      {/* Analytics Navigation Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#3B318A] shrink-0" />
            <span>Business Analytics & Live Visual Performance Graphs</span>
          </h2>
          <p className="text-xs text-gray-500">
            Real-time analytics computed directly from live database records for Sales, Customer Base, and Service Operations.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto max-w-full scrollbar-none">
          <button
            onClick={() => setActiveChartTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeChartTab === 'ALL'
                ? 'bg-[#3B318A] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Graphs
          </button>
          <button
            onClick={() => setActiveChartTab('SALES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeChartTab === 'SALES'
                ? 'bg-[#3B318A] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sales Pipeline
          </button>
          <button
            onClick={() => setActiveChartTab('CUSTOMERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeChartTab === 'CUSTOMERS'
                ? 'bg-[#3B318A] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Customer Machines
          </button>
          <button
            onClick={() => setActiveChartTab('SERVICES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeChartTab === 'SERVICES'
                ? 'bg-[#3B318A] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Service Center
          </button>
        </div>
      </div>

      {/* GRAPH 1: SALES PERFORMANCE & MONTHLY LEAD TREND */}
      {(activeChartTab === 'ALL' || activeChartTab === 'SALES') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bar / Trend Graph (2 cols) */}
          <Card className="p-4 sm:p-6 lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 border-gray-100">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#3B318A] shrink-0" />
                  <span>Sales Inquiries vs. Closed Conversions (Live 6-Month Trend)</span>
                </h3>
                <p className="text-[11px] text-gray-400">Total inquiries captured by sales team vs closed deals by month</p>
              </div>
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="flex items-center gap-1.5 font-bold text-gray-600">
                  <span className="w-3 h-3 rounded bg-indigo-200 inline-block" /> Total Inquiries ({totalLeads})
                </span>
                <span className="flex items-center gap-1.5 font-bold text-[#3B318A]">
                  <span className="w-3 h-3 rounded bg-[#3B318A] inline-block" /> Deals Won ({wonLeads})
                </span>
              </div>
            </div>

            {/* Interactive SVG Bar Chart */}
            <div className="pt-2 overflow-x-auto">
              <div className="h-52 min-w-[280px] flex items-end justify-between gap-2 sm:gap-3 px-1 sm:px-2 border-b border-gray-200">

                {monthlySalesData.map((d, idx) => {
                  const leadHeight = maxLeadCount > 0 ? (d.leads / maxLeadCount) * 100 : 0;
                  const wonHeight = maxLeadCount > 0 ? (d.won / maxLeadCount) * 100 : 0;
                  const isHovered = hoveredBar === `sales-${idx}`;

                  return (
                    <div
                      key={d.yearMonth}
                      className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                      onMouseEnter={() => setHoveredBar(`sales-${idx}`)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Floating Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-14 z-20 bg-gray-900 text-white p-2.5 rounded-xl text-[10px] shadow-xl whitespace-nowrap pointer-events-none animate-fade-in">
                          <p className="font-bold">{d.month} {d.year}</p>
                          <p className="text-indigo-300">Total Leads Captured: {d.leads}</p>
                          <p className="text-emerald-300">Closed Deals: {d.won}</p>
                        </div>
                      )}

                      {/* Side by side bars */}
                      <div className="w-full flex items-end justify-center gap-1.5 h-44">
                        {/* Leads bar */}
                        <div
                          style={{ height: `${d.leads > 0 ? Math.max(leadHeight, 10) : 4}%` }}
                          className={`w-1/2 max-w-[24px] ${d.leads > 0 ? 'bg-indigo-200 group-hover:bg-indigo-300 text-indigo-900' : 'bg-gray-100'} rounded-t-md transition-all duration-300 flex items-center justify-center text-[10px] font-bold`}
                        >
                          {d.leads > 0 && (
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity -mt-4 text-[9px]">
                              {d.leads}
                            </span>
                          )}
                        </div>
                        {/* Won Deals bar */}
                        <div
                          style={{ height: `${d.won > 0 ? Math.max(wonHeight, 10) : 4}%` }}
                          className={`w-1/2 max-w-[24px] ${d.won > 0 ? 'bg-[#3B318A] group-hover:bg-[#2A2363] text-white shadow-xs' : 'bg-gray-100'} rounded-t-md transition-all duration-300 flex items-center justify-center text-[10px] font-bold`}
                        >
                          {d.won > 0 && (
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity -mt-4 text-[9px]">
                              {d.won}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Month label */}
                      <span className="text-[11px] font-bold text-gray-600 mt-2">{d.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Sales Pipeline Funnel Breakdown (1 col) */}
          <Card className="p-6 space-y-4">
            <div className="border-b pb-3 border-gray-100">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                Live Sales Conversion Funnel
              </h3>
              <p className="text-[11px] text-gray-400">Status breakdown of all {totalLeads} client inquiries</p>
            </div>

            <div className="space-y-3">
              {/* Funnel items */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">Active Pipeline Leads</span>
                  <span className="text-indigo-700">{activeLeads} ({totalLeads > 0 ? Math.round((activeLeads / totalLeads) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalLeads > 0 ? (activeLeads / totalLeads) * 100 : 0}%` }}
                    className="h-full bg-[#3B318A] rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">Deals Closed / Won</span>
                  <span className="text-emerald-700">{wonLeads} ({conversionRate}%)</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${conversionRate}%` }}
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">Future Requirements Vault</span>
                  <span className="text-amber-700">{futureReqs} ({totalLeads > 0 ? Math.round((futureReqs / totalLeads) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalLeads > 0 ? (futureReqs / totalLeads) * 100 : 0}%` }}
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">Lost / Inactive Deals</span>
                  <span className="text-rose-700">{lostLeads} ({totalLeads > 0 ? Math.round((lostLeads / totalLeads) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalLeads > 0 ? (lostLeads / totalLeads) * 100 : 0}%` }}
                    className="h-full bg-rose-400 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Overall Conversion Rate</span>
                <span className="text-lg font-black text-[#3B318A]">{conversionRate}%</span>
              </div>
              <Badge variant={conversionRate >= 30 ? 'success' : 'primary'}>
                {conversionRate >= 30 ? 'High Performing' : 'Live Status'}
              </Badge>
            </div>
          </Card>
        </div>
      )}

      {/* GRAPH 2 & 3: CUSTOMER INSTALLATIONS & SERVICE OPERATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 2: CUSTOMER MACHINE INSTALLATIONS GRAPH */}
        {(activeChartTab === 'ALL' || activeChartTab === 'CUSTOMERS') && (
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 border-gray-100">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Live Customer Machine Accounts ({totalInstallations} Machines)
                </h3>
                <p className="text-[11px] text-gray-400">Live installed machines distribution across Surat, Morbi, and Rajkot</p>
              </div>
            </div>

            {/* Branch Distribution Progress Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-indigo-900">
                    <Building2 className="w-3.5 h-3.5 text-[#3B318A]" />
                    Surat Branch Warehouse & Region
                  </span>
                  <span className="text-[#3B318A] font-black">
                    {suratCustomers} Machines ({totalInstallations > 0 ? Math.round((suratCustomers / totalInstallations) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalInstallations > 0 ? (suratCustomers / totalInstallations) * 100 : 0}%` }}
                    className="h-full bg-[#3B318A] rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-amber-900">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    Morbi Ceramic & Industrial Cluster
                  </span>
                  <span className="text-amber-700 font-black">
                    {morbiCustomers} Machines ({totalInstallations > 0 ? Math.round((morbiCustomers / totalInstallations) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalInstallations > 0 ? (morbiCustomers / totalInstallations) * 100 : 0}%` }}
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-teal-900">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    Rajkot Engineering & Casting Hub
                  </span>
                  <span className="text-teal-700 font-black">
                    {rajkotCustomers} Machines ({totalInstallations > 0 ? Math.round((rajkotCustomers / totalInstallations) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalInstallations > 0 ? (rajkotCustomers / totalInstallations) * 100 : 0}%` }}
                    className="h-full bg-teal-600 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>

            {/* Product Category Share */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <span className="text-xs font-bold text-gray-700 block uppercase tracking-wide">
                Installed Equipment Breakdown
              </span>
              {machineCategories.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No machine installation records found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {machineCategories.slice(0, 6).map((cat) => (
                    <div key={cat.name} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                        <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[150px]" title={cat.name}>
                          {cat.name}
                        </span>
                      </div>
                      <span className="text-xs font-black text-gray-900">{cat.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* GRAPH 3: SERVICE OPERATIONS & MAINTENANCE FULFILLMENT GRAPH */}
        {(activeChartTab === 'ALL' || activeChartTab === 'SERVICES') && (
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 border-gray-100">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-teal-600" />
                  Field Engineering Service Fulfillment Trend ({totalServices} Work Orders)
                </h3>
                <p className="text-[11px] text-gray-400">Live service completions vs scheduled preventative inspections</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">{serviceCompletionRate}% Fulfilled</Badge>
              </div>
            </div>

            {/* Monthly Service Execution Chart */}
            <div className="pt-2 overflow-x-auto">
              <div className="h-44 min-w-[280px] flex items-end justify-between gap-2 sm:gap-3 px-1 sm:px-2 border-b border-gray-200">
                {serviceTrend.map((s, idx) => {
                  const schedHeight = maxServiceCount > 0 ? (s.scheduled / maxServiceCount) * 100 : 0;
                  const compHeight = maxServiceCount > 0 ? (s.completed / maxServiceCount) * 100 : 0;

                  return (
                    <div key={s.yearMonth} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full flex items-end justify-center gap-1.5 h-36">
                        {/* Scheduled bar */}
                        <div
                          style={{ height: `${s.scheduled > 0 ? Math.max(schedHeight, 10) : 4}%` }}
                          className={`w-1/2 max-w-[20px] ${s.scheduled > 0 ? 'bg-slate-200 group-hover:bg-slate-300' : 'bg-gray-100'} rounded-t transition-all duration-300`}
                          title={`Scheduled: ${s.scheduled}`}
                        />
                        {/* Completed bar */}
                        <div
                          style={{ height: `${s.completed > 0 ? Math.max(compHeight, 10) : 4}%` }}
                          className={`w-1/2 max-w-[20px] ${s.completed > 0 ? 'bg-teal-600 group-hover:bg-teal-700 shadow-xs' : 'bg-gray-100'} rounded-t transition-all duration-300`}
                          title={`Completed: ${s.completed}`}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-gray-600 mt-2">{s.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service Status KPI Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-center">
                <span className="text-[10px] text-teal-700 font-bold uppercase block">Completed</span>
                <span className="text-base font-black text-teal-900">{completedServices}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-center">
                <span className="text-[10px] text-sky-700 font-bold uppercase block">Upcoming</span>
                <span className="text-base font-black text-sky-900">{upcomingServices}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
                <span className="text-[10px] text-amber-700 font-bold uppercase block">In Progress</span>
                <span className="text-base font-black text-amber-900">{inProgressServices}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
