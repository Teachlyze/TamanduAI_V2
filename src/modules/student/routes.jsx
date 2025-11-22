import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StudentLayout } from './layouts/StudentLayout';

// Lazy load pages - USANDO VERSÕES REDESIGNED
const StudentDashboard = React.lazy(() => import('./pages/Dashboard/StudentDashboardRedesigned'));
const StudentClassesPage = React.lazy(() => import('./pages/Classes/StudentClassesPageRedesigned'));
const StudentClassDetailsPage = React.lazy(() => import('./pages/Classes/StudentClassDetailsPageRedesigned'));
const StudentActivitiesPage = React.lazy(() => import('./pages/Activities/StudentActivitiesPageRedesigned'));
const StudentActivityDetailsPage = React.lazy(() => import('./pages/Activities/StudentActivityDetailsPageRedesigned'));
const StudentPerformancePage = React.lazy(() => import('./pages/Performance/StudentPerformancePageRedesigned'));
const StudentHistoryPage = React.lazy(() => import('./pages/Performance/StudentHistoryPageRedesigned'));
const StudentGamificationPage = React.lazy(() => import('./pages/Gamification/StudentGamificationPage'));
const StudentMissionsPage = React.lazy(() => import('./pages/Gamification/StudentMissionsPage'));
const StudentRankingPage = React.lazy(() => import('./pages/Social/StudentRankingPage'));
const StudentCalendarPage = React.lazy(() => import('./pages/Calendar/StudentCalendarPageRedesigned'));
const StudentDiscussionPage = React.lazy(() => import('./pages/Social/StudentDiscussionPage'));
const StudentPublicQuizzesPage = React.lazy(() => import('./pages/Social/StudentPublicQuizzesPage'));
const StudentQuizPlayPage = React.lazy(() => import('./pages/Social/StudentQuizPlayPage'));
const StudentProfilePage = React.lazy(() => import('./pages/Profile/StudentProfilePage'));
const StudentFeedbackPage = React.lazy(() => import('./pages/Profile/StudentFeedbackPage'));
const StudentSettingsPage = React.lazy(() => import('./pages/Settings/StudentSettingsPage'));

// Flashcards
const FlashcardsPage = React.lazy(() => import('./pages/Flashcards/FlashcardsPage'));
const FlashcardsStatsPage = React.lazy(() => import('./pages/Flashcards/FlashcardsStatsPage'));
const CreateDeckPage = React.lazy(() => import('./pages/Flashcards/CreateDeckPage'));
const DeckDetailPage = React.lazy(() => import('./pages/Flashcards/DeckDetailPage'));
const ReviewPage = React.lazy(() => import('./pages/Flashcards/ReviewPage'));
const CramModePage = React.lazy(() => import('./pages/Flashcards/CramModePage'));
const CardEditorPage = React.lazy(() => import('./pages/Flashcards/CardEditorPage'));
const FlashcardsSettingsPage = React.lazy(() => import('./pages/Flashcards/FlashcardsSettingsPage'));
const DeckSettingsPage = React.lazy(() => import('./pages/Flashcards/DeckSettingsPage'));

const StudentRoutes = () => {
  useEffect(() => {
    // Prefetch de código das principais páginas do módulo de aluno em background
    const timeout = setTimeout(() => {
      // Páginas de classes
      import('./pages/Classes/StudentClassesPageRedesigned');
      import('./pages/Classes/StudentClassDetailsPageRedesigned');

      // Páginas de atividades
      import('./pages/Activities/StudentActivitiesPageRedesigned');
      import('./pages/Activities/StudentActivityDetailsPageRedesigned');

      // Desempenho
      import('./pages/Performance/StudentPerformancePageRedesigned');
      import('./pages/Performance/StudentHistoryPageRedesigned');

      // Gamificação e social
      import('./pages/Gamification/StudentGamificationPage');
      import('./pages/Gamification/StudentMissionsPage');
      import('./pages/Social/StudentRankingPage');
      import('./pages/Social/StudentDiscussionPage');
      import('./pages/Social/StudentPublicQuizzesPage');
      import('./pages/Social/StudentQuizPlayPage');

      // Calendário e perfil/configurações
      import('./pages/Calendar/StudentCalendarPageRedesigned');
      import('./pages/Profile/StudentProfilePage');
      import('./pages/Profile/StudentFeedbackPage');
      import('./pages/Settings/StudentSettingsPage');

      // Flashcards
      import('./pages/Flashcards/FlashcardsPage');
      import('./pages/Flashcards/FlashcardsStatsPage');
      import('./pages/Flashcards/CreateDeckPage');
      import('./pages/Flashcards/DeckDetailPage');
      import('./pages/Flashcards/ReviewPage');
      import('./pages/Flashcards/CramModePage');
      import('./pages/Flashcards/CardEditorPage');
      import('./pages/Flashcards/FlashcardsSettingsPage');
      import('./pages/Flashcards/DeckSettingsPage');
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

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
      
      {/* Flashcards */}
      <Route path="flashcards" element={<FlashcardsPage />} />
      <Route path="flashcards/settings" element={<FlashcardsSettingsPage />} />
      <Route path="flashcards/stats" element={<FlashcardsStatsPage />} />
      <Route path="flashcards/decks/new" element={<CreateDeckPage />} />
      <Route path="flashcards/decks/:deckId" element={<DeckDetailPage />} />
      <Route path="flashcards/decks/:deckId/settings" element={<DeckSettingsPage />} />
      <Route path="flashcards/decks/:deckId/review" element={<ReviewPage />} />
      <Route path="flashcards/decks/:deckId/cram" element={<CramModePage />} />
      <Route path="flashcards/decks/:deckId/cards/new" element={<CardEditorPage />} />
      <Route path="flashcards/decks/:deckId/cards/:cardId/edit" element={<CardEditorPage />} />
      
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
