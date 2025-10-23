import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import Loading from '../components/Loading';
import ErrorBoundary from '../components/ui/ErrorBoundary';

// Helper function for dynamic imports with error handling
const lazyLoad = (importFunction) => {
  return lazy(() => importFunction().catch(() => ({
    default: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error loading component</h2>
          <p className="mt-2">Please try refreshing the page.</p>
        </div>
      </div>
    )
  })));
};

// Lazy load route components
const MeetingRoutes = lazyLoad(() => import('./meetingRoutes'));
// Whiteboard removido - não faz parte do sistema
// const WhiteboardRoutes = lazyLoad(() => import('./whiteboardRoutes'));

// Lazy load components for better performance
const Dashboard = lazyLoad(() => import('../pages/DashboardHome'));
const LandingPage = lazyLoad(() => import('../pages/LandingPage'));
const LoginPage = lazyLoad(() => import('../pages/LoginPagePremium'));
const RegisterPage = lazyLoad(() => import('../pages/RegisterPagePremium'));
const RegisterTeacherPage = lazyLoad(() => import('../pages/RegisterTeacherPage'));
const ForgotPasswordPage = lazyLoad(() => import('../pages/auth/ForgotPasswordPagePremium'));
const ResetPasswordPage = lazyLoad(() => import('../pages/auth/ResetPasswordPagePremium'));
const EmailConfirmationPage = lazyLoad(() => import('../pages/EmailConfirmationPage'));
const PricingPage = lazyLoad(() => import('../pages/PricingPage'));
const PrivacyPolicy = lazyLoad(() => import('../pages/PrivacyPolicy'));
const TermsOfUse = lazyLoad(() => import('../pages/TermsOfUse'));
const ImprovedDocumentationPage = lazyLoad(() => import('../pages/docs/DocumentationPage'));
const SpecCoveragePage = lazyLoad(() => import('../pages/admin/SpecCoveragePage'));
const ContactPage = lazyLoad(() => import('../pages/ContactPage'));
const BetaPage = lazyLoad(() => import('../pages/BetaPage'));
const LogoutPage = lazyLoad(() => import('../pages/LogoutPage'));
const JoinClassPage = lazyLoad(() => import('../pages/JoinClassPage'));
const JoinClassWithCodePage = lazyLoad(() => import('../pages/JoinClassWithCodePage'));
const UserProfilePage = lazyLoad(() => import('../pages/UserProfilePagePremium'));
const StrategicPlanPage = lazyLoad(() => import('../pages/StrategicPlanPage'));

// Dashboard Components
const RoleBasedDashboard = lazyLoad(() => import('../components/dashboard/RoleBasedDashboard'));
const DashboardHome = lazyLoad(() => import('../components/dashboard/DashboardHome'));
const ClassesPage = lazyLoad(() => import('../components/dashboard/ClassesPage'));
// const ClassDetailsPage = lazyLoad(() => import('../components/dashboard/ClassDetailsPage')); // Arquivo deletado
const StudentsPage = lazyLoad(() => import('../components/students/StudentsPage'));
const StudentProfilePage = lazyLoad(() => import('../pages/dashboard/StudentProfilePage'));
const InviteStudentPage = lazyLoad(() => import('../pages/students/InviteStudentPage'));
const ActivitiesPage = lazyLoad(() => import('../components/dashboard/ActivitiesPage'));
const ActivityPage = lazyLoad(() => import('../pages/ActivityPage'));
const ReportsPage = lazyLoad(() => import('../components/dashboard/ReportsPage'));
const ChatbotPage = lazyLoad(() => import('../components/dashboard/ChatbotPageWrapper'));
const NotificationTest = lazyLoad(() => import('../pages/notifications/NotificationTest'));
const AcademicHistoryPage = lazyLoad(() => import('../pages/dashboard/AcademicHistoryPage'));
const PerformanceAnalyticsPage = lazyLoad(() => import('../pages/dashboard/PerformanceAnalyticsPage'));
const SettingsPage = lazyLoad(() => import('../components/dashboard/SettingsPage'));
const AgendaPage = lazyLoad(() => import('../pages/AgendaPagePremium'));
const AnalyticsPage = lazyLoad(() => import('../pages/AnalyticsPagePremium'));
const ActivitySubmissionsPage = lazyLoad(() => import('../pages/classes/ActivitySubmissionsPage'));
const CreateClassroomForm = lazyLoad(() => import('../components/classrooms/CreateClassroomForm'));
const ClassroomsPagePremium = lazyLoad(() => import('../pages/ClassroomsPagePremium'));
const ActivitiesListPage = lazyLoad(() => import('../pages/ActivitiesListPagePremium'));
const CreateActivityPage = lazyLoad(() => import('../pages/CreateActivityPage'));
const ActivityErrorBoundary = lazyLoad(() => import('../components/ui/ActivityErrorBoundary'));
const DraftsPage = lazyLoad(() => import('../pages/activities/DraftsPage'));
const StudentActivitiesPage = lazyLoad(() => import('../pages/student/StudentActivitiesPage'));
const StudentGamificationPage = lazyLoad(() => import('../pages/student/StudentGamificationPage'));
const ActivityDetailsPage = lazyLoad(() => import('../components/activities/ActivityDetailsPage'));
const NotificationCenter = lazyLoad(() => import('../pages/notifications/NotificationCenter'));
const PrivacyPreferences = lazyLoad(() => import('@/components/PrivacyPreferences'));
const OnboardingPage = lazyLoad(() => import('../pages/OnboardingPage'));

// Additional pages
const StudentHistoryPage = lazyLoad(() => import('../pages/StudentHistoryPage'));
const JoinClassInvitationPage = lazyLoad(() => import('../pages/JoinClassInvitationPage'));
const ActivityPublishPage = lazyLoad(() => import('../pages/ActivityPublishPage'));
const VerifyEmailPage = lazyLoad(() => import('../pages/VerifyEmailPage'));
const ActivitySubmissionsPageNew = lazyLoad(() => import('../pages/activities/ActivitySubmissionsPage'));
const ClassActivitiesPage = lazyLoad(() => import('../pages/classes/ClassActivitiesPage'));
const ClassSchedulePage = lazyLoad(() => import('../pages/classes/ClassSchedulePage'));
// CorrectionsPage removido - usar ClassGradingPage dentro de ClassDetailsPage ao invés
// const CorrectionsPage = lazyLoad(() => import('../pages/activities/CorrectionsPage'));
const UserProfileEditPage = lazyLoad(() => import('../pages/profile/UserProfileEditPage'));

// School pages - DISABLED FOR MVP (only teacher and student)
// const SchoolDashboard = lazyLoad(() => import('../pages/school/SchoolDashboard'));
// const SchoolTeachersPage = lazyLoad(() => import('../pages/school/SchoolTeachersPage'));
// const SchoolReportsPage = lazyLoad(() => import('../pages/school/SchoolReportsPage'));
// const SchoolCommsPage = lazyLoad(() => import('../pages/school/SchoolCommsPage'));
// const SchoolRankingPage = lazyLoad(() => import('../pages/school/SchoolRankingPage'));
// const SchoolStudentsPage = lazyLoad(() => import('../pages/school/SchoolStudentsPage'));
// const SchoolClassesPage = lazyLoad(() => import('../pages/school/SchoolClassesPage'));
// const SchoolSettingsPage = lazyLoad(() => import('../pages/school/SchoolSettingsPage'));
// const SchoolAnalyticsPage = lazyLoad(() => import('../components/school/SchoolAnalyticsPage'));
// const SchoolAnalyticsMLPage = lazyLoad(() => import('../pages/school/SchoolAnalyticsMLPage'));
// const SchoolClassMembersPage = lazyLoad(() => import('../components/school/SchoolClassMembersPage'));
// const InviteTeacherPage = lazyLoad(() => import('../pages/school/InviteTeacherPage'));
// const RewardSettingsPage = lazyLoad(() => import('../pages/school/RewardSettingsPage'));

// Student module routes
const StudentRoutes = lazyLoad(() => import('../modules/student/routes'));

// Teacher pages
const TeacherDashboard = lazyLoad(() => import('../pages/teacher/TeacherDashboard'));
const TeacherClassroomsPage = lazyLoad(() => import('../pages/teacher/TeacherClassroomsPage'));
const TeacherActivitiesPage = lazyLoad(() => import('../pages/teacher/TeacherActivitiesPage'));
const TeacherStudentsPage = lazyLoad(() => import('../pages/teacher/TeacherStudentsPage'));
const TeacherRankingPage = lazyLoad(() => import('../pages/teacher/TeacherRankingPage'));
const TeacherAnalyticsPage = lazyLoad(() => import('../components/teacher/TeacherAnalyticsPage'));
const TeacherClassMembersPage = lazyLoad(() => import('../components/teacher/TeacherClassMembersPage'));
const TeacherChatbotSettingsPage = lazyLoad(() => import('../components/teacher/TeacherChatbotSettingsPage'));
const StudentDetailPage = lazyLoad(() => import('../pages/teacher/StudentDetailPage'));
const MissionsListPage = lazyLoad(() => import('../pages/teacher/MissionsListPage'));
const CreateMissionPage = lazyLoad(() => import('../pages/teacher/CreateMissionPage'));
const MissionDetailPage = lazyLoad(() => import('../pages/teacher/MissionDetailPage'));
const QuestionBankPage = lazyLoad(() => import('../pages/teacher/QuestionBankPage'));
const CreateQuestionPage = lazyLoad(() => import('../pages/teacher/CreateQuestionPage'));
const AnalyticsMLPage = lazyLoad(() => import('../pages/teacher/AnalyticsMLPage'));
const EditClassPage = lazyLoad(() => import('../pages/teacher/EditClassPage'));
const ClassDetailsPage = lazyLoad(() => import('../pages/teacher/ClassDetailsPage'));

// New Class Systems - Janeiro 2025
const ClassFeedPage = lazyLoad(() => import('../pages/classes/ClassFeedPage'));
const GradingQueuePage = lazyLoad(() => import('../pages/teacher/GradingQueuePage'));
const GradingPage = lazyLoad(() => import('../pages/teacher/GradingPage'));
const ClassGradesPage = lazyLoad(() => import('../pages/teacher/ClassGradesPage'));
const ClassMaterialsPage = lazyLoad(() => import('../pages/teacher/ClassMaterialsPage'));
const ClassAnalyticsPage = lazyLoad(() => import('../pages/teacher/ClassAnalyticsPage'));
const ClassAttendancePage = lazyLoad(() => import('../pages/teacher/ClassAttendancePage'));

// Layouts
const StudentLayout = lazyLoad(() => import('../components/student/StudentLayout'));
const TeacherLayout = lazyLoad(() => import('../components/teacher/TeacherLayout'));
// School layout disabled for MVP
// const SchoolLayout = lazyLoad(() => import('../components/school/SchoolLayout'));

// Error pages
const NotFound = lazyLoad(() => import('../pages/errors/NotFound'));
const AccessDenied = lazyLoad(() => import('../pages/errors/AccessDenied'));

// HMR test component only in development
const HMRTest = import.meta.env.DEV ? React.lazy(() => import('../hmr-test')) : null;

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rotas Públicas */}
      {/* Redirects para caminhos legados/errados */}
      <Route path="/dashboard/student/*" element={<Navigate to="/student" replace />} />
      <Route path="/students/*" element={<Navigate to="/student" replace />} />
      {/* School routes disabled for MVP */}
      {/* <Route path="/dashboard/school/*" element={<Navigate to="/school" replace />} /> */}
      {/* <Route path="/escola/*" element={<Navigate to="/school" replace />} /> */}
      <Route path="/school/*" element={<Navigate to="/" replace />} />
      <Route path="/escola/*" element={<Navigate to="/" replace />} />
      <Route
        path="/"
        element={
          <Suspense fallback={<Loading />}>
            <LandingPage />
          </Suspense>
        }
      />
      <Route
        path="/login"
        element={
          <Suspense fallback={<Loading />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/register"
        element={
          <Suspense fallback={<Loading />}>
            <RegisterPage />
          </Suspense>
        }
      />
      <Route
        path="/register/teacher"
        element={
          <Suspense fallback={<Loading />}>
            <RegisterTeacherPage />
          </Suspense>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <Suspense fallback={<Loading />}>
            <ForgotPasswordPage />
          </Suspense>
        }
      />
      <Route
        path="/reset-password"
        element={
          <Suspense fallback={<Loading />}>
            <ResetPasswordPage />
          </Suspense>
        }
      />
      <Route
        path="/confirm-email"
        element={
          <Suspense fallback={<Loading />}>
            <EmailConfirmationPage />
          </Suspense>
        }
      />
      <Route
        path="/pricing"
        element={
          <Suspense fallback={<Loading />}>
            <PricingPage />
          </Suspense>
        }
      />
      <Route
        path="/privacy"
        element={
          <Suspense fallback={<Loading />}>
            <PrivacyPolicy />
          </Suspense>
        }
      />
      <Route
        path="/terms"
        element={
          <Suspense fallback={<Loading />}>
            <TermsOfUse />
          </Suspense>
        }
      />
      <Route
        path="/docs"
        element={
          <Suspense fallback={<Loading />}>
            <ImprovedDocumentationPage />
          </Suspense>
        }
      />
      
      <Route
        path="/admin/spec-coverage"
        element={
          <Suspense fallback={<Loading />}>
            <SpecCoveragePage />
          </Suspense>
        }
      />
      <Route
        path="/beta"
        element={
          <Suspense fallback={<Loading />}>
            <BetaPage />
          </Suspense>
        }
      />
      <Route
        path="/contact"
        element={
          <Suspense fallback={<Loading />}>
            <ContactPage />
          </Suspense>
        }
      />
      <Route
        path="/strategic-plan"
        element={
          <Suspense fallback={<Loading />}>
            <StrategicPlanPage />
          </Suspense>
        }
      />
      <Route
        path="/verify-email"
        element={
          <Suspense fallback={<Loading />}>
            <VerifyEmailPage />
          </Suspense>
        }
      />
      <Route
        path="/join-class/:token"
        element={
          <Suspense fallback={<Loading />}>
            <JoinClassInvitationPage />
          </Suspense>
        }
      />
      <Route
        path="/privacy-preferences"
        element={
          <Suspense fallback={<Loading />}>
            <PrivacyPreferences />
          </Suspense>
        }
      />
      <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />

      {/* Profile Edit - Accessible for all authenticated users */}
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <UserProfileEditPage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/logout"
        element={
          <Suspense fallback={<Loading />}>
            <LogoutPage />
          </Suspense>
        }
      />
      <Route
        path="/join/:invitationCode"
        element={
          <Suspense fallback={<Loading />}>
            <JoinClassPage />
          </Suspense>
        }
      />
      <Route
        path="/join-class"
        element={
          <Suspense fallback={<Loading />}>
            <JoinClassWithCodePage />
          </Suspense>
        }
      />
      <Route
        path="/join-class/:code"
        element={
          <Suspense fallback={<Loading />}>
            <JoinClassWithCodePage />
          </Suspense>
        }
      />

      {/* Development-only routes */}
      {import.meta.env.DEV && HMRTest && (
        <Route
          path="/hmr-test"
          element={
            <Suspense fallback={<Loading />}>
              <HMRTest />
            </Suspense>
          }
        />
      )}

      {/* ========================================
          ROTAS DE ESTUDANTES - /student/*
          ======================================== */}
      <Route
        path="/student/*"
        element={
          <RoleProtectedRoute allowedRoles={['student']}>
            <ErrorBoundary errorTitle="Erro" errorMessage="Não foi possível carregar a página. Tente recarregar.">
              <Suspense fallback={<Loading />}>
                <StudentRoutes />
              </Suspense>
            </ErrorBoundary>
          </RoleProtectedRoute>
        }
      />

      {/* ========================================
          ROTAS DE PROFESSORES - /dashboard/*
          ======================================== */}
      <Route
        path="/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={['teacher']}>
            <ErrorBoundary errorTitle="Erro no Dashboard" errorMessage="Não foi possível carregar o dashboard. Tente recarregar a página.">
              <Suspense fallback={<Loading />}>
                <TeacherLayout />
              </Suspense>
            </ErrorBoundary>
          </RoleProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<Loading />}>
              <TeacherDashboard />
            </Suspense>
          }
        />
        <Route
          path="classes"
          element={
            <ErrorBoundary errorTitle="Erro ao carregar Turmas" errorMessage="Não foi possível carregar a página de turmas. Tente recarregar a página.">
              <Suspense fallback={<Loading />}>
                <TeacherClassroomsPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="classes/new"
          element={
            <Suspense fallback={<Loading />}>
              <CreateClassroomForm />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId"
          element={
            <Suspense fallback={<Loading />}>
              <ClassDetailsPage />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId/edit"
          element={
            <Suspense fallback={<Loading />}>
              <EditClassPage />
            </Suspense>
          }
        />
        <Route
          path="students"
          element={
            <Suspense fallback={<Loading />}>
              <TeacherStudentsPage />
            </Suspense>
          }
        />
        <Route
          path="students/:id"
          element={
            <Suspense fallback={<Loading />}>
              <StudentProfilePage />
            </Suspense>
          }
        />
        <Route
          path="students/invite"
          element={
            <Suspense fallback={<Loading />}>
              <InviteStudentPage />
            </Suspense>
          }
        />
        <Route
          path="activities"
          element={
            <Suspense fallback={<Loading />}>
              <TeacherActivitiesPage />
            </Suspense>
          }
        />
        <Route
          path="activities/drafts"
          element={
            <Suspense fallback={<Loading />}>
              <DraftsPage />
            </Suspense>
          }
        />
        <Route
          path="activities/new"
          element={
            <Suspense fallback={<Loading />}>
              <ActivityErrorBoundary>
                <CreateActivityPage />
              </ActivityErrorBoundary>
            </Suspense>
          }
        />
        <Route
          path="activities/:id"
          element={
            <Suspense fallback={<Loading />}>
              <ActivityPage />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId/activities/:activityId/submissions"
          element={
            <Suspense fallback={<Loading />}>
              <ActivitySubmissionsPage />
            </Suspense>
          }
        />
        <Route
          path="activities/edit/:id"
          element={
            <Suspense fallback={<Loading />}>
              <ActivityPage mode="edit" />
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense fallback={<Loading />}>
              <ReportsPage />
            </Suspense>
          }
        />
        <Route
          path="calendar"
          element={
            <Suspense fallback={<Loading />}>
              <AgendaPage />
            </Suspense>
          }
        />
        <Route
          path="analytics"
          element={
            <Suspense fallback={<Loading />}>
              <AnalyticsPage />
            </Suspense>
          }
        />
        <Route
          path="meetings/*"
          element={
            <Suspense fallback={<Loading />}>
              <MeetingRoutes />
            </Suspense>
          }
        />
        <Route
          path="chatbot"
          element={
            <Suspense fallback={<Loading />}>
              <ChatbotPage />
            </Suspense>
          }
        />
        <Route
          path="ranking"
          element={
            <Suspense fallback={<Loading />}>
              <TeacherRankingPage />
            </Suspense>
          }
        />
        <Route
          path="notification-test"
          element={
            <Suspense fallback={<Loading />}>
              <NotificationTest />
            </Suspense>
          }
        />
        <Route
          path="analytics-advanced"
          element={
            <Suspense fallback={<Loading />}>
              <TeacherAnalyticsPage />
            </Suspense>
          }
        />
        {/* New Class Systems Routes - Janeiro 2025 */}
        <Route
          path="classes/:classId/feed"
          element={
            <Suspense fallback={<Loading />}>
              <ClassFeedPage />
            </Suspense>
          }
        />
        <Route
          path="grading"
          element={
            <Suspense fallback={<Loading />}>
              <GradingQueuePage />
            </Suspense>
          }
        />
        <Route
          path="grading/:submissionId"
          element={
            <Suspense fallback={<Loading />}>
              <GradingPage />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId/grades"
          element={
            <Suspense fallback={<Loading />}>
              <ClassGradesPage />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId/materials"
          element={
            <Suspense fallback={<Loading />}>
              <ClassMaterialsPage />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId/analytics"
          element={
            <Suspense fallback={<Loading />}>
              <ClassAnalyticsPage />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId/attendance"
          element={
            <Suspense fallback={<Loading />}>
              <ClassAttendancePage />
            </Suspense>
          }
        />
        <Route
          path="analytics-ml/:classId"
          element={
            <Suspense fallback={<Loading />}>
              <AnalyticsMLPage />
            </Suspense>
          }
        />
        <Route
          path="question-bank"
          element={
            <Suspense fallback={<Loading />}>
              <QuestionBankPage />
            </Suspense>
          }
        />
        <Route
          path="question-bank/create"
          element={
            <Suspense fallback={<Loading />}>
              <CreateQuestionPage />
            </Suspense>
          }
        />
        {/* Rota de correções removida - usar /dashboard/classes/:classId ao invés */}
        {/* <Route
          path="corrections"
          element={
            <Suspense fallback={<Loading />}>
              <CorrectionsPage />
            </Suspense>
          }
        /> */}
        <Route
          path="activities/:activityId/submissions"
          element={
            <Suspense fallback={<Loading />}>
              <ActivitySubmissionsPageNew />
            </Suspense>
          }
        />
        <Route
          path="activities/:activityId/publish"
          element={
            <Suspense fallback={<Loading />}>
              <ActivityPublishPage />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId/activities"
          element={
            <Suspense fallback={<Loading />}>
              <ClassActivitiesPage />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId/schedule"
          element={
            <Suspense fallback={<Loading />}>
              <ClassSchedulePage />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId/members"
          element={
            <Suspense fallback={<Loading />}>
              <TeacherClassMembersPage />
            </Suspense>
          }
        />
        <Route
          path="chatbot/settings"
          element={
            <Suspense fallback={<Loading />}>
              <TeacherChatbotSettingsPage />
            </Suspense>
          }
        />
        <Route
          path="drafts"
          element={
            <Suspense fallback={<Loading />}>
              <DraftsPage />
            </Suspense>
          }
        />
        <Route
          path="students/:studentId"
          element={
            <Suspense fallback={<Loading />}>
              <StudentDetailPage />
            </Suspense>
          }
        />
        <Route
          path="students/profile"
          element={
            <Suspense fallback={<Loading />}>
              <StudentDetailPage />
            </Suspense>
          }
        />
        <Route
          path="missions"
          element={
            <Suspense fallback={<Loading />}>
              <MissionsListPage />
            </Suspense>
          }
        />
        <Route
          path="missions/create"
          element={
            <Suspense fallback={<Loading />}>
              <CreateMissionPage />
            </Suspense>
          }
        />
        <Route
          path="missions/:missionId"
          element={
            <Suspense fallback={<Loading />}>
              <MissionDetailPage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<Loading />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<Loading />}>
              <NotFound />
            </Suspense>
          }
        />
      </Route>

      {/* ========================================
          ROTAS DE ESCOLA - /school/*
          DISABLED FOR MVP - Only teacher and student
          ======================================== */}
      {/* <Route
        path="/school"
        element={
          <RoleProtectedRoute allowedRoles={['school']}>
            <ErrorBoundary errorTitle="Erro" errorMessage="Não foi possível carregar a página. Tente recarregar.">
              <Suspense fallback={<Loading />}>
                <SchoolLayout />
              </Suspense>
            </ErrorBoundary>
          </RoleProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<Loading />}>
              <SchoolDashboard />
            </Suspense>
          }
        />
        <Route
          path=""
          element={
            <Suspense fallback={<Loading />}>
              <SchoolDashboard />
            </Suspense>
          }
        />
        <Route
          path="teachers"
          element={
            <Suspense fallback={<Loading />}>
              <SchoolTeachersPage />
            </Suspense>
          }
        />
        <Route
          path="students"
          element={
            <Suspense fallback={<Loading />}>
              <SchoolStudentsPage />
            </Suspense>
          }
        />
        <Route
          path="classes"
          element={
            <Suspense fallback={<Loading />}>
              <SchoolClassesPage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<Loading />}>
              <SchoolSettingsPage />
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense fallback={<Loading />}>
              <SchoolReportsPage />
            </Suspense>
          }
        />
        <Route
          path="comms"
          element={
            <Suspense fallback={<Loading />}>
              <SchoolCommsPage />
            </Suspense>
          }
        />
        <Route
          path="ranking"
          element={
            <Suspense fallback={<Loading />}>
              <SchoolRankingPage />
            </Suspense>
          }
        />
        <Route
          path="notifications"
          element={
            <Suspense fallback={<Loading />}>
              <NotificationCenter />
            </Suspense>
          }
        />
        <Route
          path="analytics-advanced"
          element={
            <Suspense fallback={<Loading />}>
              <SchoolAnalyticsPage />
            </Suspense>
          }
        />
        <Route
          path="analytics-ml"
          element={
            <Suspense fallback={<Loading />}>
              <SchoolAnalyticsMLPage />
            </Suspense>
          }
        />
        <Route
          path="classes/:classId/members"
          element={
            <Suspense fallback={<Loading />}>
              <SchoolClassMembersPage />
            </Suspense>
          }
        />
        <Route
          path="invite-teacher"
          element={
            <Suspense fallback={<Loading />}>
              <InviteTeacherPage />
            </Suspense>
          }
        />
        <Route
          path="rewards"
          element={
            <Suspense fallback={<Loading />}>
              <RewardSettingsPage />
            </Suspense>
          }
        />
        <Route
          path="students/:studentId"
          element={
            <Suspense fallback={<Loading />}>
              <StudentDetailPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<Loading />}>
              <NotFound />
            </Suspense>
          }
        />
      </Route> */}

      {/* Outras Rotas Protegidas */}
      <Route
        path="/classrooms"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <CreateClassroomForm />
            </Suspense>
          </ProtectedRoute>
        }
      />
      {/* Whiteboard removido - não faz parte do sistema */}
      {/* <Route
        path="/whiteboard/*"
        element={
          <Suspense fallback={<Loading />}>
            <WhiteboardRoutes />
          </Suspense>
        }
      /> */}
      <Route
        path="/aluno/:studentId/historico"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <AcademicHistoryPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/aluno/:studentId/desempenho"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <PerformanceAnalyticsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/classrooms/:roomUuid"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ClassroomsPagePremium />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/atividades"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ActivitiesListPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/atividades/criar"
        element={
          <ProtectedRoute requiredRoles="teacher">
            <Suspense fallback={<Loading />}>
              <ActivityErrorBoundary>
                <CreateActivityPage />
              </ActivityErrorBoundary>
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <UserProfilePage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/atividades/:id"
        element={
          <ProtectedRoute requiredRoles={["teacher", "student"]}>
            <Suspense fallback={<Loading />}>
              <ActivityDetailsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <NotificationCenter />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Rota de Acesso Negado */}
      <Route
        path="/access-denied"
        element={
          <Suspense fallback={<Loading />}>
            <AccessDenied />
          </Suspense>
        }
      />

      {/* 404 - Deve ser a última rota */}
      <Route
        path="*"
        element={
          <Suspense fallback={<Loading />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
