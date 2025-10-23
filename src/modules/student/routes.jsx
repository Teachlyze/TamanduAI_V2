import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

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

const StudentRoutes = () => {
  return (
    <Routes>
      <Route index element={<StudentDashboard />} />
      <Route path="dashboard" element={<Navigate to="/student" replace />} />
      
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
      
      <Route path="*" element={<Navigate to="/student" replace />} />
    </Routes>
  );
};

export default StudentRoutes;
