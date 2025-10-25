import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StudentLayout } from './layouts/StudentLayout';

// Lazy load pages
const StudentDashboard = React.lazy(() => import('./pages/Dashboard/StudentDashboard'));
const StudentClassesPage = React.lazy(() => import('./pages/Classes/StudentClassesPage'));
const StudentClassDetailsPage = React.lazy(() => import('./pages/Classes/StudentClassDetailsPage'));
const StudentActivitiesPage = React.lazy(() => import('./pages/Activities/StudentActivitiesPage'));
const StudentActivityDetailsPage = React.lazy(() => import('./pages/Activities/StudentActivityDetailsPage'));
const StudentPerformancePage = React.lazy(() => import('./pages/Performance/StudentPerformancePage'));
const StudentHistoryPage = React.lazy(() => import('./pages/Performance/StudentHistoryPage'));
const StudentGamificationPage = React.lazy(() => import('./pages/Gamification/StudentGamificationPage'));
const StudentMissionsPage = React.lazy(() => import('./pages/Gamification/StudentMissionsPage'));
const StudentRankingPage = React.lazy(() => import('./pages/Social/StudentRankingPage'));
const StudentCalendarPage = React.lazy(() => import('./pages/Calendar/StudentCalendarPage'));
const StudentDiscussionPage = React.lazy(() => import('./pages/Social/StudentDiscussionPage'));
const StudentPublicQuizzesPage = React.lazy(() => import('./pages/Social/StudentPublicQuizzesPage'));
const StudentQuizPlayPage = React.lazy(() => import('./pages/Social/StudentQuizPlayPage'));
const StudentProfilePage = React.lazy(() => import('./pages/Profile/StudentProfilePage'));
const StudentFeedbackPage = React.lazy(() => import('./pages/Profile/StudentFeedbackPage'));
const StudentSettingsPage = React.lazy(() => import('./pages/Settings/StudentSettingsPage'));

const StudentRoutes = () => {
  return (
    <StudentLayout>
      <Routes>
      <Route index element={<StudentDashboard />} />
      <Route path="dashboard" element={<Navigate to="/students" replace />} />
      
      {/* Classes */}
      <Route path="classes" element={<StudentClassesPage />} />
      <Route path="classes/:classId" element={<StudentClassDetailsPage />} />
      
      {/* Activities */}
      <Route path="activities" element={<StudentActivitiesPage />} />
      <Route path="activities/:activityId" element={<StudentActivityDetailsPage />} />
      
      {/* Performance */}
      <Route path="performance" element={<StudentPerformancePage />} />
      <Route path="history" element={<StudentHistoryPage />} />
      
      {/* Gamification */}
      <Route path="gamification" element={<StudentGamificationPage />} />
      <Route path="missions" element={<StudentMissionsPage />} />
      
      {/* Social */}
      <Route path="ranking" element={<StudentRankingPage />} />
      <Route path="calendar" element={<StudentCalendarPage />} />
      <Route path="discussion" element={<StudentDiscussionPage />} />
      <Route path="quizzes" element={<StudentPublicQuizzesPage />} />
      <Route path="quiz/:quizId" element={<StudentQuizPlayPage />} />
      
      {/* Profile */}
      <Route path="profile" element={<StudentProfilePage />} />
      <Route path="feedback" element={<StudentFeedbackPage />} />
      <Route path="settings" element={<StudentSettingsPage />} />
      
      <Route path="*" element={<Navigate to="/students" replace />} />
    </Routes>
    </StudentLayout>
  );
};

export default StudentRoutes;
