import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardExecutive, FieldsPage, CustomReports } from '@/pages/dashboard/admin/analytics';

interface AnalyticsDashboardWrapperProps {
  basePath: string;
}

/**
 * Wrapper genérico para rutas de analytics
 * Puede ser usado por Admin, Instructor y Aprendiz
 */
const AnalyticsDashboardWrapper: React.FC<AnalyticsDashboardWrapperProps> = ({ basePath }) => {
  return (
    <Routes>
      <Route index element={<DashboardExecutive />} />
      <Route path="/executive" element={<DashboardExecutive />} />
      <Route path="/fields" element={<FieldsPage />} />
      <Route path="/reports" element={<CustomReports />} />
      <Route path="*" element={<Navigate to={basePath} replace />} />
    </Routes>
  );
};

export default AnalyticsDashboardWrapper;
