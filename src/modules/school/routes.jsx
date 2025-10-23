import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages
const SchoolDashboard = React.lazy(() => import('./pages/Dashboard/SchoolDashboard'));

const SchoolRoutes = () => {
  return (
    <Routes>
      <Route index element={<SchoolDashboard />} />
      <Route path="dashboard" element={<Navigate to="/dashboard/school" replace />} />
      
      {/* TODO: Adicionar outras rotas da school */}
      {/* <Route path="teachers" element={<TeachersPage />} />
      <Route path="students" element={<StudentsPage />} />
      <Route path="classes" element={<ClassesPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="settings" element={<SettingsPage />} /> */}
      
      <Route path="*" element={<Navigate to="/dashboard/school" replace />} />
    </Routes>
  );
};

export default SchoolRoutes;
