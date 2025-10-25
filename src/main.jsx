import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App.jsx';
import AppRoutes from './routes.jsx';
import { AuthProvider } from '@/shared/contexts/AuthContext';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';

const root = createRoot(document.getElementById('root'));

// ✅ Usar StrictMode apenas em desenvolvimento
// StrictMode renderiza componentes 2x, causando múltiplas instâncias do Supabase
const AppWrapper = import.meta.env.DEV ? React.StrictMode : React.Fragment;

root.render(
  <AppWrapper>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <App>
              <AppRoutes />
            </App>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </AppWrapper>
)
