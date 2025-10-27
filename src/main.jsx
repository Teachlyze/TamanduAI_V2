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

// StrictMode removido para evitar renderizações duplicadas
// que causavam problemas com múltiplas instâncias do Supabase
const AppWrapper = React.Fragment;

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
