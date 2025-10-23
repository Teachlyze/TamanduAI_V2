import { lazy } from 'react';

// Lazy load heavy components for better performance

// Pages
export const LandingPage = lazy(() => import('@/pages/LandingPage'));
export const DocumentationPage = lazy(() => import('@/pages/docs/DocumentationPage'));
export const LoginPage = lazy(() => import('@/pages/LoginPage'));
export const RegisterPage = lazy(() => import('@/pages/RegisterPage'));

// Dashboard & Main Features
export const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
export const ClassesPage = lazy(() => import('@/pages/classes/ClassesPage'));
export const ActivitiesPage = lazy(() => import('@/pages/activities/ActivitiesPage'));
export const MaterialsPage = lazy(() => import('@/pages/materials/MaterialsPage'));
export const MeetingsPage = lazy(() => import('@/pages/meetings/MeetingsPage'));

// Heavy Components
export const ActivityBuilder = lazy(() => import('@/components/ActivityBuilder'));
export const SubmissionManager = lazy(() => import('@/components/activities/SubmissionManager'));
export const WeightedGradeDisplay = lazy(() => import('@/components/grades/WeightedGradeDisplay'));
export const StudentAlertsPanel = lazy(() => import('@/components/alerts/StudentAlertsPanel'));
export const PerformanceIndicators = lazy(() => import('@/components/dashboard/PerformanceIndicators'));

// Video/Media
export const VideoMeetingPage = lazy(() => import('@/pages/meetings/VideoMeetingPage'));
export const ChatbotPage = lazy(() => import('@/pages/chatbot/ChatbotPage'));

// Admin
export const SpecCoveragePage = lazy(() => import('@/pages/admin/SpecCoveragePage'));

// Loading component for Suspense fallback
export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="mt-4 text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

export const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);
