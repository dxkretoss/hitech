import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { AdminRoute } from './AdminRoute.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { AdminLoginPage } from '../pages/AdminLoginPage.jsx';
import { AdminDashboardPage } from '../pages/AdminDashboardPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { LeadsPage } from '../pages/LeadsPage.jsx';
import { FutureOpportunitiesPage } from '../pages/FutureOpportunitiesPage.jsx';
import { CustomersPage } from '../pages/CustomersPage.jsx';
import { CustomerDetailPage } from '../pages/CustomerDetailPage.jsx';
import { ServicesPage } from '../pages/ServicesPage.jsx';
import { StockPage } from '../pages/StockPage.jsx';
import { NotificationsPage } from '../pages/NotificationsPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Protected Routes (Requires Cookie Authentication) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route
          path="/future-opportunities"
          element={
            <AdminRoute>
              <FutureOpportunitiesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <AdminRoute>
              <CustomersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <AdminRoute>
              <CustomerDetailPage />
            </AdminRoute>
          }
        />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
