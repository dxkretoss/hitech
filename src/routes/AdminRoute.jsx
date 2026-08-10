import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { isSuperAdminUser } from '../services/authService.js';
import { getAuthCookie } from '../services/cookieService.js';
import { toast } from 'sonner';

export const AdminRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const token = getAuthCookie();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Verifying Admin Privileges...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  if (!isSuperAdminUser(currentUser)) {
    toast.error('Access Denied: Super Admin privileges required to view Admin Panel');
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
