import React, { useEffect, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';

// Importar diagnóstico em dev mode
if (import.meta.env.DEV) {
  import('@/utils/diagnoseSupabase');
}

const AppContent = ({ children }) => {
  const { pathname } = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Helmet>
        <title>TamanduAI — Plataforma EdTech Inteligente</title>
        <meta name="description" content="Plataforma educacional com IA para alunos, professores e escolas" />
      </Helmet>

      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
};

const App = ({ children }) => {
  return <AppContent>{children}</AppContent>;
};

export default App;
