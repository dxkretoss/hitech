import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import {
  Users,
  Briefcase,
  Wrench,
  UserPlus,
  CheckCircle,
  Key,
  Filter,
  Sparkles,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

export const AdminDashboardPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Sales');
  
  const [staffList, setStaffList] = useState([]);
  const [leads, setLeads] = useState([]);
  const [futureOpps, setFutureOpps] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesSummary, setSalesSummary] = useState([]);
  
  const [selectedSalesRepFilter, setSelectedSalesRepFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    const [profilesData, leadsData, oppsData, custsData, summaryData] = await Promise.all([
      db.getProfiles(),
      db.getLeads(),
      db.getFutureOpportunities(),
      db.getCustomers(),
      db.getSalesPerformanceSummary()
    ]);

    setStaffList(profilesData || []);
    setLeads(leadsData || []);
    setFutureOpps(oppsData || []);
    setCustomers(custsData || []);
    setSalesSummary(summaryData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const { user, error } = await signup({
      name: newName,
      email: newEmail,
      password: newPassword,
      role: newRole
    });

    setSubmitting(false);

    if (user || !error) {
      toast.success(`New ${newRole} staff account created successfully!`);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      await loadAdminData();
    }
  };

  const salesRepsList = staffList.filter(s => s.role === 'Sales');
  const fieldEngineersList = staffList.filter(s => s.role === 'Engineer');

  // Filter leads based on selected sales person
  const displayedLeads = leads.filter(l => {
    if (selectedSalesRepFilter === 'All') return true;
    return l.salesPersonName === selectedSalesRepFilter;
  });

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
        <Button
          variant="primary"
          icon={UserPlus}
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg"
        >
          Add New Sales / Engineer Staff
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Sales Persons</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{salesRepsList.length}</span>
          <span className="text-[11px] text-gray-400">Added Sales Reps</span>
        </Card>

        <Card className="border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Sales Leads</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{leads.length}</span>
          <span className="text-[11px] text-gray-400">Captured by Sales Team</span>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Future Requirements</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{futureOpps.length}</span>
          <span className="text-[11px] text-amber-700 font-medium">Deferred Client Needs</span>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Deals Sold</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{customers.length}</span>
          <span className="text-[11px] text-emerald-600 font-bold">Converted Customers</span>
        </Card>

        <Card className="border-l-4 border-l-teal-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Field Engineers</span>
            <Wrench className="w-4 h-4 text-teal-500" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{fieldEngineersList.length}</span>
          <span className="text-[11px] text-gray-400">Service Reminders Active</span>
        </Card>
      </div>

      {/* REQUIREMENT CHECK: Sales Person Performance & Data Breakdown */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#3B318A]" />
              Sales Representative Performance & Lead Data Attribution
            </h3>
            <p className="text-xs text-gray-500">
              Breakdown of how many sales persons are added and which lead/future requirement data was captured by which sales person.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {salesSummary.map((rep) => (
            <div key={rep.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs hover:border-[#3B318A] transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{rep.name}</h4>
                  <p className="text-xs text-gray-500">{rep.email}</p>
                </div>
                <Badge variant="primary">Sales Rep</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-gray-500 block uppercase font-bold">Leads</span>
                  <span className="text-base font-black text-indigo-900">{rep.totalLeads}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-gray-500 block uppercase font-bold">Future Req</span>
                  <span className="text-base font-black text-amber-600">{rep.futureOpps}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-gray-500 block uppercase font-bold">Won Deals</span>
                  <span className="text-base font-black text-emerald-600">{rep.wonDeals}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Detailed Lead Breakdown by Sales Representative */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#3B318A]" />
              Detailed Lead Data Feed (Filtered by Sales Person)
            </h3>
            <p className="text-xs text-gray-500">Inspect exact client requirements submitted by each sales team member</p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedSalesRepFilter}
              onChange={(e) => setSelectedSalesRepFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] bg-white text-gray-800"
            >
              <option value="All">Show All Sales Persons Data</option>
              {salesRepsList.map(rep => (
                <option key={rep.id} value={rep.name}>{rep.name} ({rep.email})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Customer & Company</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Requirement / Product</th>
                <th className="py-3 px-4">Captured By (Sales Person)</th>
                <th className="py-3 px-4">Requirement Status</th>
                <th className="py-3 px-4">Follow Up / Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-gray-400">
                    No lead records found for selected sales person filter.
                  </td>
                </tr>
              ) : (
                displayedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900">{lead.customerName}</p>
                      <p className="text-[11px] text-gray-500">{lead.company}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{lead.phone}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{lead.requirement || lead.interestedProduct}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#3B318A] bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {lead.salesPersonName || 'Vikram Mehta'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={lead.status === 'Won' ? 'success' : lead.status === 'Future Requirement' ? 'warning' : 'primary'}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-semibold">{lead.followUpDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Staff Accounts Management List */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#3B318A]" />
              Registered Staff Accounts ({staffList.length})
            </h3>
            <p className="text-xs text-gray-500">Active credentials for Sales Representatives & Field Engineers</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Staff Member Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffList.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900">{user.name}</td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <Badge variant={user.role === 'Engineer' ? 'info' : user.role === 'Owner' || user.role === 'Admin' ? 'warning' : 'primary'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{user.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal for Creating Staff Account */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 bg-white shadow-2xl rounded-2xl">
            <h3 className="text-base font-bold text-gray-900 border-b pb-2">Create New Staff Account</h3>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ramesh@hitechair.in"
                  className="w-full px-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Assign Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('Sales')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border ${newRole === 'Sales' ? 'bg-[#3B318A] text-white border-[#3B318A]' : 'bg-gray-50 text-gray-700'}`}
                  >
                    Sales Representative
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('Engineer')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border ${newRole === 'Engineer' ? 'bg-[#3B318A] text-white border-[#3B318A]' : 'bg-gray-50 text-gray-700'}`}
                  >
                    Field Engineer
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/2">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} variant="primary" className="w-1/2 bg-[#3B318A]">
                  {submitting ? 'Creating...' : 'Create Staff Account'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

