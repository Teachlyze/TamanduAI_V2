import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';

// Public Pages
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const RoadmapPage = React.lazy(() => import('./pages/RoadmapPage'));
const DocumentationPage = React.lazy(() => import('./pages/DocumentationPage'));
const LoginPage = React.lazy(() => import('./features/auth/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./features/auth/pages/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('./features/auth/pages/ForgotPasswordPage'));
const VerifyEmailPage = React.lazy(() => import('./features/auth/pages/VerifyEmailPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));

// Module Routes
const TeacherRoutes = React.lazy(() => import('./modules/teacher/routes'));
const SchoolRoutes = React.lazy(() => import('./modules/school/routes'));
const StudentRoutes = React.lazy(() => import('./modules/student/routes'));

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to correct dashboard based on role
    if (profile.role === 'student') {
      return <Navigate to="/students/dashboard" replace />;
    } else if (profile.role === 'teacher') {
      return <Navigate to="/dashboard" replace />;
    } else if (profile.role === 'school') {
      return <Navigate to="/dashboard/school" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user && profile) {
    // Redirect to correct dashboard based on role
    if (profile.role === 'student') {
      return <Navigate to="/students/dashboard" replace />;
    } else if (profile.role === 'teacher') {
      return <Navigate to="/dashboard" replace />;
    } else if (profile.role === 'school') {
      return <Navigate to="/dashboard/school" replace />;
    }
  }

  return children;
};

// Open Route Component (no auth check, always accessible)
const OpenRoute = ({ children }) => {
  return children;
};

const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Routes>
        {/* Open Routes (No Auth Required) */}
        <Route
          path="/"
          element={
            <OpenRoute>
              <LandingPage />
            </OpenRoute>
          }
        />
        
        <Route
          path="/pricing"
          element={
            <OpenRoute>
              <PricingPage />
            </OpenRoute>
          }
        />
        
        <Route
          path="/docs"
          element={
            <OpenRoute>
              <DocumentationPage />
            </OpenRoute>
          }
        />
        
        <Route
          path="/roadmap"
          element={
            <OpenRoute>
              <RoadmapPage />
            </OpenRoute>
          }
        />
        
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        
        <Route
          path="/verify-email"
          element={
            <PublicRoute>
              <VerifyEmailPage />
            </PublicRoute>
          }
        />
        
        <Route
          path="/contact"
          element={
            <OpenRoute>
              <ContactPage />
            </OpenRoute>
          }
        />

        {/* Protected Routes - Student */}
        <Route
          path="/students/*"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentRoutes />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Teacher */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherRoutes />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - School */}
        <Route
          path="/dashboard/school/*"
          element={
            <ProtectedRoute allowedRoles={['school']}>
              <SchoolRoutes />
            </ProtectedRoute>
          }
        />

        {/* 404 - Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
