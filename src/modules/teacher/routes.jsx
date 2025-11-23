import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TeacherLayout } from './layouts/TeacherLayout';

// Lazy load pages
const TeacherDashboard = React.lazy(() => import('./pages/Dashboard/TeacherDashboard'));
const TeacherProfilePage = React.lazy(() => import('./pages/Profile/TeacherProfilePage'));
const TeacherCalendarPage = React.lazy(() => import('./pages/Calendar/TeacherCalendarPage'));
const TeacherClassesPage = React.lazy(() => import('./pages/Classes/TeacherClassesPage'));
const ClassMembersPage = React.lazy(() => import('./pages/Classes/ClassMembersPage'));
const ClassActivitiesPage = React.lazy(() => import('./pages/Classes/ClassActivitiesPage'));
const EditClassPage = React.lazy(() => import('./pages/Classes/EditClassPage'));
const ClassGradingPage = React.lazy(() => import('./pages/Classes/ClassGradingPage'));
const ClassGradesPage = React.lazy(() => import('./pages/Classes/ClassGradesPage'));
const ClassMaterialsPage = React.lazy(() => import('./pages/Classes/ClassMaterialsPage'));
const ActivitiesListPage = React.lazy(() => import('./pages/Activities/ActivitiesListPage'));
const TeacherActivitiesPage = React.lazy(() => import('./pages/Activities/TeacherActivitiesPage'));
const TeacherActivityCreatePage = React.lazy(() => import('./pages/Activities/TeacherActivityCreatePage'));
const TeacherProjectActivitiesPage = React.lazy(() => import('./pages/Activities/TeacherProjectActivitiesPage'));
const ActivitySubmissionsPage = React.lazy(() => import('./pages/Activities/ActivitySubmissionsPage'));
const GradingPage = React.lazy(() => import('./pages/Grading/GradingPage'));
const TeacherStudentsPage = React.lazy(() => import('./pages/Students/TeacherStudentsPage'));
const StudentDetailPage = React.lazy(() => import('./pages/Students/StudentDetailPage'));
const ClassDetailsPage = React.lazy(() => import('./pages/Classes/ClassDetailsPage'));
const ClassSchedulePage = React.lazy(() => import('./pages/Classes/ClassSchedulePage'));
const ClassAttendancePage = React.lazy(() => import('./pages/Classes/ClassAttendancePage'));
const TeacherRankingPage = React.lazy(() => import('./pages/Ranking/TeacherRankingPage'));
const TeacherChatbotPage = React.lazy(() => import('./pages/Chatbot/TeacherChatbotPage'));
const ChatbotConfigPage = React.lazy(() => import('./pages/Chatbot/ChatbotConfigPage'));
const ChatbotAnalyticsPage = React.lazy(() => import('./pages/Chatbot/ChatbotAnalyticsPage'));
const TeacherCorrectionsPage = React.lazy(() => import('./pages/Corrections/TeacherCorrectionsPage'));
const TeacherAnalyticsPage = React.lazy(() => import('./pages/Analytics/TeacherAnalyticsPage'));
const TeacherReportsPage = React.lazy(() => import('./pages/Reports/TeacherReportsPage'));

const TeacherRoutes = () => {
  useEffect(() => {
    // Prefetch de código das principais páginas do módulo de professor em background
    const timeout = setTimeout(() => {
      // Dashboard e páginas principais
      import('./pages/Dashboard/TeacherDashboard');
      import('./pages/Profile/TeacherProfilePage');
      import('./pages/Calendar/TeacherCalendarPage');

      // Turmas
      import('./pages/Classes/TeacherClassesPage');
      import('./pages/Classes/ClassDetailsPage');
      import('./pages/Classes/ClassMembersPage');
      import('./pages/Classes/ClassActivitiesPage');
      import('./pages/Classes/EditClassPage');
      import('./pages/Classes/ClassGradingPage');
      import('./pages/Classes/ClassGradesPage');
      import('./pages/Classes/ClassMaterialsPage');
      import('./pages/Classes/ClassSchedulePage');
      import('./pages/Classes/ClassAttendancePage');

      // Atividades
      import('./pages/Activities/ActivitiesListPage');
      import('./pages/Activities/TeacherActivitiesPage');
      import('./pages/Activities/TeacherActivityCreatePage');
      import('./pages/Activities/TeacherProjectActivitiesPage');
      import('./pages/Activities/ActivitySubmissionsPage');

      // Correções e avaliação
      import('./pages/Grading/GradingPage');
      import('./pages/Corrections/TeacherCorrectionsPage');

      // Alunos
      import('./pages/Students/TeacherStudentsPage');
      import('./pages/Students/StudentDetailPage');

      // Ranking e chatbot
      import('./pages/Ranking/TeacherRankingPage');
      import('./pages/Chatbot/TeacherChatbotPage');
      import('./pages/Chatbot/ChatbotConfigPage');
      import('./pages/Chatbot/ChatbotAnalyticsPage');

      // Analytics e reports
      import('./pages/Analytics/TeacherAnalyticsPage');
      import('./pages/Reports/TeacherReportsPage');
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <TeacherLayout>
      <Routes>
      <Route index element={<TeacherDashboard />} />
      <Route path="dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="profile" element={<TeacherProfilePage />} />
      <Route path="calendar" element={<TeacherCalendarPage />} />
      
      {/* Classes */}
      <Route path="classes" element={<TeacherClassesPage />} />
      <Route path="classes/:classId" element={<ClassDetailsPage />} />
      <Route path="classes/:classId/members" element={<ClassMembersPage />} />
      <Route path="classes/:classId/activities" element={<ClassActivitiesPage />} />
      <Route path="classes/:classId/edit" element={<EditClassPage />} />
      <Route path="classes/:classId/grading" element={<ClassGradingPage />} />
      <Route path="classes/:classId/grades" element={<ClassGradesPage />} />
      <Route path="classes/:classId/materials" element={<ClassMaterialsPage />} />
      <Route path="classes/:classId/schedule" element={<ClassSchedulePage />} />
      <Route path="classes/:classId/attendance" element={<ClassAttendancePage />} />
      
      {/* Activities */}
      <Route path="activities" element={<TeacherActivitiesPage />} />
      <Route path="activities/create" element={<TeacherActivityCreatePage />} />
      <Route path="activities/:id/edit" element={<TeacherActivityCreatePage />} />
      <Route path="activities/projects" element={<TeacherProjectActivitiesPage />} />
      <Route path="activities/:activityId/submissions" element={<ActivitySubmissionsPage />} />
      
      {/* Grading */}
      <Route path="grading/:submissionId" element={<GradingPage />} />
      
      {/* Corrections */}
      <Route path="corrections" element={<TeacherCorrectionsPage />} />
      
      {/* Analytics & Reports */}
      <Route path="analytics" element={<TeacherAnalyticsPage />} />
      <Route path="reports" element={<TeacherReportsPage />} />
      
      {/* Students */}
      <Route path="students" element={<TeacherStudentsPage />} />
      <Route path="students/:studentId" element={<StudentDetailPage />} />
      
      {/* Ranking */}
      <Route path="ranking" element={<TeacherRankingPage />} />
      
      {/* Chatbot */}
      <Route path="chatbot" element={<TeacherChatbotPage />} />
      <Route path="chatbot/:classId/config" element={<ChatbotConfigPage />} />
      <Route path="chatbot/:classId/analytics" element={<ChatbotAnalyticsPage />} />
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </TeacherLayout>
  );
};

export default TeacherRoutes;
