import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminUsersPage from './users/index';
import UserHistory from './UserHistory';
import UserDetail from './UserDetail';

const AdminHome: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard/admin/users" replace />} />
      <Route path="/users" element={<AdminUsersPage />} />
      <Route path="/user-history/:userId" element={<UserHistory />} />
      <Route path="/user-detail/:userId" element={<UserDetail />} />
      <Route path="*" element={<Navigate to="/dashboard/admin/users" replace />} />
    </Routes>
  );
};

export default AdminHome;
