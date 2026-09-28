import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.jsx';
import {
  Users,
  Briefcase,
  Wrench,
  CheckCircle2,
  Search,
  Calendar,
  TrendingUp,
  Boxes,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Package,
  Layers,
  Sparkles,
  Building2,
  ShieldCheck,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export const TeamPage = () => {
  const navigate = useNavigate();

  const [staffList, setStaffList] = useState([]);
  const [leads, setLeads] = useState([]);
  const [futureOpps, setFutureOpps] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [salesSummary, setSalesSummary] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [activeTab, setActiveTab] = useState('All'); // 'Sales' | 'Engineer' | 'All'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState(null);
  const [stockCategoryFilter, setStockCategoryFilter] = useState('ALL'); // 'ALL' | 'Machine' | 'Spare Part'
  const [stockBranchFilter, setStockBranchFilter] = useState('ALL'); // 'ALL' | 'Surat' | 'Morbi' | 'Rajkot'
  const [loading, setLoading] = useState(true);
  const [updatingStockId, setUpdatingStockId] = useState(null);
  const [toggleConfirmModal, setToggleConfirmModal] = useState({
    isOpen: false,
    member: null,
    newStatus: false
  });

  const loadData = async () => {
    setLoading(true);
    const [profilesData, leadsData, oppsData, custsData, summaryData, servicesData, stockData] = await Promise.all([
      db.getProfiles(),
      db.getLeads(),
      db.getFutureOpportunities(),
      db.getCustomers(),
      db.getSalesPerformanceSummary(),
      db.getServices(),
      db.getStockItems()
    ]);

    setStaffList(profilesData || []);
    setLeads(leadsData || []);
    setFutureOpps(oppsData || []);
    setCustomers(custsData || []);
    setSalesSummary(summaryData || []);
    setServices(servicesData || []);
    setStockItems(stockData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStockAccess = async (profileId, memberName, newStatus) => {
    setUpdatingStockId(profileId);
    try {
      await db.updateProfileStockAccess(profileId, newStatus);
      setStaffList(prev => prev.map(p => p.id === profileId ? { ...p, canViewStock: newStatus, can_view_stock: newStatus } : p));

      if (newStatus) {
        toast.success(`Stock & Spare Parts inventory visibility ENABLED for ${memberName}`);
      } else {
        toast.info(`Stock & Spare Parts inventory visibility DISABLED for ${memberName}`);
      }
    } catch (err) {
      toast.error('Failed to update stock permission. Please try again.');
    } finally {
      setUpdatingStockId(null);
    }
  };

  const requestToggleStockAccess = (member) => {
    setToggleConfirmModal({
      isOpen: true,
      member,
      newStatus: !(member.canViewStock === true)
    });
  };

  const handleConfirmToggle = async () => {
    if (!toggleConfirmModal.member) return;
    const { id, name } = toggleConfirmModal.member;
    const newStatus = toggleConfirmModal.newStatus;
    await handleToggleStockAccess(id, name, newStatus);
    setToggleConfirmModal({ isOpen: false, member: null, newStatus: false });
  };

  const salesRepsList = staffList.filter(s => s.role === 'Sales');
  const fieldEngineersList = staffList.filter(s => s.role === 'Engineer');

  // Filter staff by tab and search query
  const filteredStaff = staffList.filter(staff => {
    const matchesTab =
      activeTab === 'All' ? true :
        activeTab === 'Sales' ? staff.role === 'Sales' :
          activeTab === 'Engineer' ? staff.role === 'Engineer' : true;

    if (!matchesTab) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      staff.name?.toLowerCase().includes(query) ||
      staff.email?.toLowerCase().includes(query) ||
      staff.role?.toLowerCase().includes(query) ||
      staff.branch?.toLowerCase().includes(query)
    );
  });

  // Calculate engineer metrics
  const getEngineerStats = (engineerName) => {
    if (!engineerName) return { total: 0, completed: 0, pending: 0 };
    const nameLower = engineerName.toLowerCase();
    const engineerServices = services.filter(s =>
      s.assignedEngineer && (s.assignedEngineer.toLowerCase() === nameLower || s.assignedEngineer === engineerName)
    );
    const completed = engineerServices.filter(s => s.status === 'Completed').length;
    const pending = engineerServices.filter(s => s.status === 'Upcoming' || s.status === 'Pending' || s.status === 'Overdue').length;
    return {
      total: engineerServices.length,
      completed,
      pending
    };
  };

  // Calculate sales rep metrics
  const getSalesStats = (repName, repId) => {
    const fromSummary = salesSummary.find(s => s.id === repId || s.name === repName);
    if (fromSummary) {
      return {
        totalLeads: fromSummary.totalLeads,
        futureOpps: fromSummary.futureOpps,
        wonDeals: fromSummary.wonDeals
      };
    }
    const repLeads = leads.filter(l => l.salesPersonName === repName || l.salesPersonId === repId);
    const repFuture = futureOpps.filter(o => o.salesPersonName === repName || o.salesPersonId === repId);
    const repCusts = customers.filter(c => c.salesPersonName === repName || c.salesPersonId === repId);
    return {
      totalLeads: repLeads.length,
      futureOpps: repFuture.length,
      wonDeals: repCusts.length
    };
  };

  // Filter stock items for dropdown preview
  const filteredStockForMember = (memberBranch) => {
    return stockItems.filter(item => {
      const matchCat = stockCategoryFilter === 'ALL' || item.category === stockCategoryFilter;
      const matchBranch = stockBranchFilter === 'ALL' || item.branch === stockBranchFilter;
      return matchCat && matchBranch;
    });
  };

  const machinesCount = stockItems.filter(i => i.category === 'Machine').length;
  const sparePartsCount = stockItems.filter(i => i.category === 'Spare Part').length;

  if (loading) {
    return (
      <div className="py-16 flex justify-center items-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-[#3B318A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Loading Team & Staff Directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            Team & Staff Directory
            <Badge variant="warning">Executive Control</Badge>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Complete roster of Field Engineers & Sales Representatives, including live operational output and configurable Stock & Inventory visibility permissions.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Sales Representatives</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{salesRepsList.length}</span>
          <span className="text-[11px] text-gray-400">Active Sales Reps</span>
        </Card>

        <Card className="border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Field Engineers</span>
            <Wrench className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{fieldEngineersList.length}</span>
          <span className="text-[11px] text-gray-400">Service & Installation Techs</span>
        </Card>

        <Card className="border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Sales Leads</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{leads.length}</span>
          <span className="text-[11px] text-gray-400">Captured by Sales Team</span>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Stock & Spare Parts</span>
            <Boxes className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{stockItems.length}</span>
          <span className="text-[11px] text-purple-700 font-medium">
            {machinesCount} Machines • {sparePartsCount} Spare Parts
          </span>
        </Card>
      </div>

      {/* Main Tabbed Staff Section */}
      <Card className="p-6 space-y-5">
        {/* Tab & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4 border-gray-100">
          {/* Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('All')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'All'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Staff</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'All' ? 'bg-slate-200 text-gray-900' : 'bg-gray-200 text-gray-600'
                }`}>
                {staffList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('Sales')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'Sales'
                ? 'bg-white text-[#3B318A] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Sales Team</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'Sales' ? 'bg-indigo-100 text-[#3B318A]' : 'bg-gray-200 text-gray-600'
                }`}>
                {salesRepsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('Engineer')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'Engineer'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Wrench className="w-3.5 h-3.5 text-teal-600" />
              <span>Field Engineers</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'Engineer' ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-600'
                }`}>
                {fieldEngineersList.length}
              </span>
            </button>


          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, role, or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Tab Content: Render List */}
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  {activeTab === 'Sales' && (
                    <>
                      <th className="py-3 px-4 text-center">Total Leads</th>
                      <th className="py-3 px-4 text-center">Future Req</th>
                      <th className="py-3 px-4 text-center">Won Deals</th>
                    </>
                  )}
                  {activeTab === 'Engineer' && (
                    <>
                      <th className="py-3 px-4 text-center">Services Assigned</th>
                      <th className="py-3 px-4 text-center">Completed</th>
                      <th className="py-3 px-4 text-center">Pending</th>
                    </>
                  )}
                  {activeTab === 'All' && (
                    <th className="py-3 px-4">Performance Activity</th>
                  )}
                  <th className="py-3 px-4 text-center">Stock & Inventory Access</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'All' ? 6 : 8} className="py-8 text-center text-xs text-gray-400">
                      No team members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => {
                    const isSales = member.role === 'Sales';
                    const isEng = member.role === 'Engineer';
                    const isOwner = member.role === 'Owner' || member.role === 'Admin' || member.role === 'SuperAdmin';
                    const salesStats = isSales ? getSalesStats(member.name, member.id) : null;
                    const engStats = isEng ? getEngineerStats(member.name) : null;
                    const isExpanded = expandedMemberId === member.id;
                    const hasStockAccess = isOwner || member.canViewStock === true;

                    return (
                      <React.Fragment key={member.id}>
                        <tr className={`transition-colors ${isExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'}`}>
                          {/* Member Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs shrink-0 shadow-xs border ${isSales ? 'bg-indigo-100 text-[#3B318A] border-indigo-200' :
                                isEng ? 'bg-teal-100 text-teal-800 border-teal-200' :
                                  'bg-purple-100 text-purple-900 border-purple-200'
                                }`}>
                                {member.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-gray-900">{member.name}</p>
                                  {member.branch && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-gray-600 font-medium border border-slate-200">
                                      {member.branch}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500">{member.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            <Badge variant={isEng ? 'info' : isOwner ? 'warning' : 'primary'}>
                              {member.role}
                            </Badge>
                          </td>

                          {/* Sales Columns */}
                          {activeTab === 'Sales' && (
                            <>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 font-black text-indigo-900 border border-indigo-100">
                                  {salesStats?.totalLeads || 0}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 font-black text-amber-700 border border-amber-200">
                                  {salesStats?.futureOpps || 0}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 font-black text-emerald-700 border border-emerald-200">
                                  {salesStats?.wonDeals || 0}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Engineer Columns */}
                          {activeTab === 'Engineer' && (
                            <>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-teal-50 font-black text-teal-900 border border-teal-200">
                                  {engStats?.total || 0}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 font-black text-emerald-700 border border-emerald-200">
                                  {engStats?.completed || 0}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 font-black text-amber-700 border border-amber-200">
                                  {engStats?.pending || 0}
                                </span>
                              </td>
                            </>
                          )}

                          {/* All Staff Column */}
                          {activeTab === 'All' && (
                            <td className="py-3.5 px-4 text-gray-700">
                              {isSales && (
                                <div className="flex items-center gap-3 text-[11px]">
                                  <span><strong className="text-indigo-900">{salesStats?.totalLeads}</strong> Leads</span>
                                  <span><strong className="text-amber-600">{salesStats?.futureOpps}</strong> Future</span>
                                  <span><strong className="text-emerald-600">{salesStats?.wonDeals}</strong> Deals</span>
                                </div>
                              )}
                              {isEng && (
                                <div className="flex items-center gap-3 text-[11px]">
                                  <span><strong className="text-teal-900">{engStats?.total}</strong> Services</span>
                                  <span><strong className="text-emerald-600">{engStats?.completed}</strong> Done</span>
                                </div>
                              )}
                              {isOwner && (
                                <span className="text-xs text-gray-400 font-medium">Full Executive Master Admin</span>
                              )}
                            </td>
                          )}

                          {/* Stock & Inventory Permission Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {isOwner ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Admin Default
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={member.canViewStock === true}
                                  disabled={updatingStockId === member.id}
                                  onClick={() => requestToggleStockAccess(member)}
                                  className="relative inline-flex items-center cursor-pointer select-none group focus:outline-none"
                                  title={`Click to ${member.canViewStock ? 'disable' : 'enable'} stock & inventory visibility`}
                                >
                                  <div className={`w-9 h-5 rounded-full transition-colors relative ${member.canViewStock ? 'bg-emerald-600' : 'bg-gray-200 group-hover:bg-gray-300'
                                    }`}>
                                    <div className={`absolute top-[2px] bg-white rounded-full h-4 w-4 transition-transform shadow-xs ${member.canViewStock ? 'right-[2px]' : 'left-[2px]'
                                      }`} />
                                  </div>
                                  <span className={`ml-2 text-[11px] font-bold transition-colors ${member.canViewStock ? 'text-emerald-700' : 'text-gray-400'}`}>
                                    {member.canViewStock ? 'Visible' : 'Hidden'}
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Active
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/admin/team/${member.id}`)}
                                className="h-8 px-3 text-xs font-bold border-indigo-200 text-[#3B318A] hover:bg-indigo-50 hover:border-[#3B318A] flex items-center gap-1.5 cursor-pointer rounded-xl"
                              >
                                <span>Details</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Confirmation Modal for Stock & Inventory Access Toggle */}
      <ConfirmModal
        isOpen={toggleConfirmModal.isOpen}
        onClose={() => setToggleConfirmModal({ isOpen: false, member: null, newStatus: false })}
        onConfirm={handleConfirmToggle}
        title={
          toggleConfirmModal.newStatus
            ? `Enable Stock Access for ${toggleConfirmModal.member?.name}?`
            : `Disable Stock Access for ${toggleConfirmModal.member?.name}?`
        }
        description={
          toggleConfirmModal.newStatus ? (
            <div className="space-y-2 text-left">
              <p className="text-gray-600">
                Granting Stock & Inventory access will allow <strong className="text-gray-900">{toggleConfirmModal.member?.name}</strong> (
                <span className="text-indigo-600 font-semibold">{toggleConfirmModal.member?.role}</span> • {toggleConfirmModal.member?.branch || 'Surat'}) to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
                <li>View warehouse machines (compressors, dryers, chillers) and spare parts stock levels.</li>
                <li>Access the <strong>New Machine Installation</strong> tab to sell machines directly from stock and record customer details.</li>
                <li>Select from live inventory items in service and installation records.</li>
                <li className="text-purple-700 font-semibold">Note: Adding new stock items, manual quantity adjustments, and deletions remain strictly Admin-only.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2 text-left">
              <p className="text-gray-600">
                Are you sure you want to revoke Stock & Inventory access from <strong className="text-gray-900">{toggleConfirmModal.member?.name}</strong>?
              </p>
              <p className="text-xs text-gray-500">
                They will no longer see stock quantities, warehouse inventory listings, or unit details.
              </p>
            </div>
          )
        }
        confirmText={toggleConfirmModal.newStatus ? 'Yes, Enable Access' : 'Yes, Disable Access'}
        cancelText="Cancel"
        variant={toggleConfirmModal.newStatus ? 'primary' : 'warning'}
        icon={toggleConfirmModal.newStatus ? Eye : EyeOff}
        loading={updatingStockId !== null}
      />
    </div>
  );
};
