import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminUsersPage from './users/index';
import UserHistory from './UserHistory';
import UserDetail from './UserDetail';
import { DashboardExecutive, FieldsPage, CustomReports } from '@/pages/analytics';
import AdminDashboardOverview from './AdminDashboardOverview';

const AdminHome: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboardOverview />} />
      <Route path="/users" element={<AdminUsersPage />} />
      <Route path="/user-history/:userId" element={<UserHistory />} />
      <Route path="/user-detail/:userId" element={<UserDetail />} />

      {/* Analytics Routes */}
      <Route path="/analytics" element={<DashboardExecutive />} />
      <Route path="/analytics/executive" element={<DashboardExecutive />} />
      <Route path="/analytics/fields" element={<FieldsPage />} />
      <Route path="/analytics/reports" element={<CustomReports />} />

      <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
    </Routes>
  );
};

export default AdminHome;
