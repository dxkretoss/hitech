import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getAuthCookie } from '../services/cookieService.js';

export const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const token = getAuthCookie();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-[#3B318A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Verifying Session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser && !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
