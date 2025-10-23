import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages
const StudentDashboard = React.lazy(() => import('./pages/Dashboard/StudentDashboard'));

const StudentRoutes = () => {
  return (
    <Routes>
      <Route index element={<StudentDashboard />} />
      <Route path="dashboard" element={<Navigate to="/students" replace />} />
      
      {/* TODO: Adicionar outras rotas do student */}
      {/* <Route path="classes" element={<ClassesPage />} />
      <Route path="classes/:id" element={<ClassDetailPage />} />
      <Route path="activities" element={<ActivitiesPage />} />
      <Route path="activities/:id" element={<ActivityDetailPage />} />
      <Route path="performance" element={<PerformancePage />} />
      <Route path="calendar" element={<CalendarPage />} />
      <Route path="ranking" element={<RankingPage />} /> */}
      
      <Route path="*" element={<Navigate to="/students" replace />} />
    </Routes>
  );
};

export default StudentRoutes;
