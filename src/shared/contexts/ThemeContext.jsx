import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storageManager } from '@/shared/services/storageManager';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

// Hook para usar o tema
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [theme, setTheme] = useState('light');
  
  // Inicializar o tema
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Se o usuário não estiver autenticado, forçar tema claro
    if (!isAuthenticated) {
      setTheme('light');
      storageManager.setTheme('light');
      return;
    }
    
    // Tenta carregar do storageManager
    const savedTheme = storageManager.getTheme();
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      return;
    }
    
    // Fallback para a preferência do sistema
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, [isAuthenticated]);

  const [highContrast, setHighContrast] = useState(false);

  // Aplicar tema ao documento
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Limpar classes antigas
    root.classList.remove('light', 'dark', 'high-contrast');
    
    // Aplicar tema atual
    root.classList.add(theme);
    
    // Configurar atributo para acessibilidade
    root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'tamanduai');
    
    // Adicionar alto contraste se ativado
    if (highContrast) {
      root.classList.add('high-contrast');
    }
    
    // Salvar preferência usando o storageManager
    if (isAuthenticated) {
      storageManager.setTheme(theme);
      storageManager.setHighContrast(highContrast);
    }
  }, [theme, highContrast, isAuthenticated]);

  // Ouvir mudanças no tema do sistema
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // Apenas atualizar se o usuário não tiver definido uma preferência
      if (isAuthenticated) {
        const saved = storageManager.getTheme();
        if (!saved || saved === 'light') {
          setTheme(e.matches ? 'dark' : 'light');
        }
      } else {
        // Se não estiver autenticado, seguir o tema do sistema
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [isAuthenticated]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);
  
  const toggleHighContrast = useCallback(() => {
    setHighContrast(prev => !prev);
  }, []);
  
  const setLightTheme = useCallback(() => setTheme('light'), []);
  const setDarkTheme = useCallback(() => setTheme('dark'), []);

  // Criando o valor do contexto diretamente para evitar problemas com useMemo
  const value = {
    theme,
    highContrast,
    toggleTheme,
    toggleHighContrast,
    setLightTheme,
    setDarkTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Exportar o contexto para uso em outros arquivos
export default ThemeContext;
