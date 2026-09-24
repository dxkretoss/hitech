import React from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { User, Mail, Shield, Building2 } from 'lucide-react';

export const ProfilePage = () => {
  const { currentUser, role } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-gray-900">User Profile</h1>
        <p className="text-xs text-gray-500 mt-1">Current active user account session and role capabilities.</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4 border-b pb-6 border-gray-100">
          <div className="w-16 h-16 rounded-full bg-[#3B318A] text-white font-black text-2xl flex items-center justify-center shadow-md select-none shrink-0">
            {(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">{currentUser?.name}</h2>
            <p className="text-xs text-gray-500">{currentUser?.email}</p>
            <Badge variant="primary" className="mt-2">{role} Role</Badge>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#3B318A]" /> Access Level
            </span>
            <strong className="text-gray-900">{role} Authorized</strong>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#3B318A]" /> Organization
            </span>
            <strong className="text-gray-900">Hi-Tech Air Technology Pvt Ltd</strong>
          </div>
        </div>
      </Card>
    </div>
  );
};
