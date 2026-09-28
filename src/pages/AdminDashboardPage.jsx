import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { AdminAnalyticsCharts } from '../components/admin/AdminAnalyticsCharts.jsx';
import {
  Briefcase,
  Wrench,
  TrendingUp,
  UserCheck,
  Sparkles
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const navigate = useNavigate();

  const [staffList, setStaffList] = useState([]);
  const [leads, setLeads] = useState([]);
  const [futureOpps, setFutureOpps] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [salesSummary, setSalesSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    const [profilesData, leadsData, oppsData, custsData, summaryData, servicesData] = await Promise.all([
      db.getProfiles(),
      db.getLeads(),
      db.getFutureOpportunities(),
      db.getCustomers(),
      db.getSalesPerformanceSummary(),
      db.getServices()
    ]);

    setStaffList(profilesData || []);
    setLeads(leadsData || []);
    setFutureOpps(oppsData || []);
    setCustomers(custsData || []);
    setSalesSummary(summaryData || []);
    setServices(servicesData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const salesRepsList = staffList.filter(s => s.role === 'Sales');
  const fieldEngineersList = staffList.filter(s => s.role === 'Engineer');

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-[#3B318A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Loading Admin Analytics & Sales Person Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            Admin Master Dashboard
            <Badge variant="warning">Executive Control</Badge>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Complete visibility of Sales Team Lead Submissions, Deferred Future Requirements, and Field Engineer Service Reminders.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-600 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/team')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Sales Persons</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{salesRepsList.length}</span>
          <span className="text-[11px] text-gray-400">Added Sales Reps</span>
        </Card>

        <Card className="border-l-4 border-l-indigo-600 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/leads')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Sales Leads</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{leads.length}</span>
          <span className="text-[11px] text-gray-400">Captured by Sales Team</span>
        </Card>

        <Card className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/future-opportunities')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Future Requirements</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{futureOpps.length}</span>
          <span className="text-[11px] text-amber-700 font-medium">Deferred Client Needs</span>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/customers')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Deals Sold</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{customers.length}</span>
          <span className="text-[11px] text-emerald-600 font-bold">Converted Customers</span>
        </Card>

        <Card className="border-l-4 border-l-teal-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/services')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Field Engineers</span>
            <Wrench className="w-4 h-4 text-teal-500" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{fieldEngineersList.length}</span>
          <span className="text-[11px] text-gray-400">Service Reminders Active</span>
        </Card>
      </div>

      {/* Visual Analytics Graphs for Sales, Customer Machine Base, and Services */}
      <AdminAnalyticsCharts
        leads={leads}
        customers={customers}
        services={services}
        salesSummary={salesSummary}
      />
    </div>
  );
};
