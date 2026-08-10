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
  Key
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadStaffProfiles = async () => {
    setLoading(true);
    const profiles = await db.getProfiles();
    setStaffList(profiles || []);
    setLoading(false);
  };

  useEffect(() => {
    loadStaffProfiles();
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
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      await loadStaffProfiles();
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Loading Registered Staff Profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Accounts</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">{staffList.length}</span>
          <span className="text-[11px] text-gray-400">Registered Staff</span>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Sales Representatives</span>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">
            {staffList.filter((s) => s.role === 'Sales').length}
          </span>
          <span className="text-[11px] text-gray-400">CRM & Leads Managers</span>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Field Engineers</span>
            <Wrench className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">
            {staffList.filter((s) => s.role === 'Engineer').length}
          </span>
          <span className="text-[11px] text-gray-400">Site Maintenance Team</span>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">System Role Control</span>
            <Key className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-gray-900 mt-2 block">Sales / Engineer</span>
          <span className="text-[11px] text-gray-400">2 Primary Roles</span>
        </Card>
      </div>

      {/* Staff User Management Table */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#3B318A]" />
              Staff Accounts & Access Management
            </h3>
            <p className="text-xs text-gray-500">Create new Sales or Engineer accounts with custom credentials</p>
          </div>
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => setShowAddModal(true)}
            className="bg-[#3B318A] hover:bg-[#2F2770] text-white"
          >
            Create Staff Account
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffList.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900">{user.name}</td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <Badge variant={user.role === 'Engineer' ? 'info' : user.role === 'Owner' || user.role === 'SuperAdmin' ? 'warning' : 'primary'}>
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
            <h3 className="text-base font-bold text-gray-900 border-b pb-2">Create Staff Account</h3>
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
                    Sales
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('Engineer')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border ${newRole === 'Engineer' ? 'bg-[#3B318A] text-white border-[#3B318A]' : 'bg-gray-50 text-gray-700'}`}
                  >
                    Engineer
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/2">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} variant="primary" className="w-1/2 bg-[#3B318A]">
                  {submitting ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
