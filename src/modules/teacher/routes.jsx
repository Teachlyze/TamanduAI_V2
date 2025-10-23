import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages
const TeacherDashboard = React.lazy(() => import('./pages/Dashboard/TeacherDashboard'));
const ClassroomsListPage = React.lazy(() => import('./pages/Classes/ClassroomsListPage'));
const ClassMembersPage = React.lazy(() => import('./pages/Classes/ClassMembersPage'));
const ActivitiesListPage = React.lazy(() => import('./pages/Activities/ActivitiesListPage'));
const ActivitySubmissionsPage = React.lazy(() => import('./pages/Activities/ActivitySubmissionsPage'));
const GradingPage = React.lazy(() => import('./pages/Grading/GradingPage'));

const TeacherRoutes = () => {
  return (
    <Routes>
      <Route index element={<TeacherDashboard />} />
      <Route path="dashboard" element={<Navigate to="/dashboard" replace />} />
      
      {/* Classes */}
      <Route path="classes" element={<ClassroomsListPage />} />
      <Route path="classes/:classId/members" element={<ClassMembersPage />} />
      {/* <Route path="classes/:id" element={<ClassDetailPage />} /> */}
      
      {/* Activities */}
      <Route path="activities" element={<ActivitiesListPage />} />
      <Route path="activities/:activityId/submissions" element={<ActivitySubmissionsPage />} />
      
      {/* Grading */}
      <Route path="grading/:submissionId" element={<GradingPage />} />
      
      {/* TODO: Adicionar outras rotas do teacher */}
      {/* <Route path="students" element={<StudentsPage />} />
      <Route path="analytics" element={<AnalyticsPage />} /> */}
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default TeacherRoutes;
