import { logger } from '@/shared/utils/logger';
// src/components/ui/ThemeProvider.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';

/**
 * Contexto para gerenciamento de temas
 * Suporta modo automático, claro e escuro
 */
  const ThemeContext = createContext({
  theme: 'auto',
  setTheme: () => {},
  resolvedTheme: 'light',
});

/**
 * Provider de tema aprimorado
 */
export const TamanduAIThemeProvider = ({ children, defaultTheme = 'auto' }) => {
  const [theme, setTheme] = useState(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState('light');

  // Detectar tema do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateResolvedTheme = () => {
      if (theme === 'auto') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme);
      }
    };

    updateResolvedTheme();
    mediaQuery.addEventListener('change', updateResolvedTheme);
  return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
  }, [theme]);

  // Aplicar tema ao DOM
  useEffect(() => {
    const root = document.documentElement;

    // Remover classes de tema anteriores
    root.classList.remove('light', 'dark');

    // Aplicar novo tema
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }

    // Atualizar variável CSS para animações condicionais
    root.style.setProperty('--animation-duration', resolvedTheme === 'dark' ? '0.2s' : '0.3s');
  }, [resolvedTheme]);

  // Carregar tema salvo
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('tamanduai-theme');
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setTheme(savedTheme);
      }
    } catch (error) {
      logger.warn('Failed to load saved theme:', error)
    }
  }, []);

  // Salvar tema selecionado
  const handleSetTheme = (newTheme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('tamanduai-theme', newTheme);
    } catch (error) {
      logger.warn('Failed to save theme:', error)
    }
  };

  const value = {
    theme,
    setTheme: handleSetTheme,
    resolvedTheme,
    toggle: () => handleSetTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
    setLight: () => handleSetTheme('light'),
    setDark: () => handleSetTheme('dark'),
    setAuto: () => handleSetTheme('auto'),
  };
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook para usar contexto de tema
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within TamanduAIThemeProvider');
  }
  return context;
};

/**
 * Componente de seletor de tema
 */
export const ThemeSelector = ({ className = '' }) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes = [
    { value: 'light', label: 'Claro', icon: '☀️' },
    { value: 'auto', label: 'Automático', icon: '🖥️' },
    { value: 'dark', label: 'Escuro', icon: '🌙' },
  ];
  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <button tabIndex={0} className="btn btn-ghost btn-sm">
        <span className="text-lg">
          {themes.find(t => t.value === theme)?.icon}
        </span>
        <span className="hidden sm:inline">
          {themes.find(t => t.value === theme)?.label}
        </span>
      </button>

      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-40">
        {themes.map((themeOption) => (
          <li key={themeOption.value}>
            <button
              onClick={() => setTheme(themeOption.value)}
              className={`flex items-center gap-2 ${
                theme === themeOption.value ? 'bg-primary text-primary-content' : ''
              }`}
            >
              <span>{themeOption.icon}</span>
              <span>{themeOption.label}</span>
              {theme === themeOption.value && (
                <span className="ml-auto">✓</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Componente de indicador de tema atual
 */
export const ThemeIndicator = ({ showLabel = true, className = '' }) => {
  const { resolvedTheme } = useTheme();
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${
        resolvedTheme === 'dark' ? 'bg-yellow-400' : 'bg-gray-400'
      }`} />
      {showLabel && (
        <span className="text-sm text-base-content/70 capitalize">
          {resolvedTheme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
        </span>
      )}
    </div>
  );
};

export default TamanduAIThemeProvider;
