import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { THEME_STORAGE_KEY, THEME_LIGHT, THEME_DARK } from '../shared/constants/theme';
import { storageManager } from '../shared/services/storageManager';

const ThemeContext = createContext();

// Função para migrar temas antigos para o novo formato
const migrateLegacyThemes = () => {
  if (typeof window === 'undefined') return null;

  // Verificar se já temos um tema salvo no storageManager
  const currentTheme = storageManager.getTheme();
  if (currentTheme === THEME_LIGHT || currentTheme === THEME_DARK) {
    return currentTheme;
  }

  // Tentar migrar de chaves antigas
  const legacyKeys = ['appTheme', 'theme', 'user_theme'];
  for (const key of legacyKeys) {
    const value = localStorage.getItem(key);
    if (value === THEME_LIGHT || value === THEME_DARK) {
      // Migrar para o storageManager e remover a chave antiga
      storageManager.setTheme(value);
      localStorage.removeItem(key);
      return value;
    }
  }
  
  return null;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Migrar temas antigos se necessário
    const migratedTheme = migrateLegacyThemes();
    if (migratedTheme) return migratedTheme;
    
    // Usar preferência do sistema como fallback
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEME_DARK;
    }
    
    // Default para light
    return THEME_LIGHT;
  });

  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return storageManager.getHighContrast();
  });

  // Função para alternar entre temas
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
      return newTheme;
    });
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrast(prev => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        storageManager.setHighContrast(newValue);
      }
      return newValue;
    });
  }, []);

  const setLightTheme = useCallback(() => setTheme(THEME_LIGHT), []);
  const setDarkTheme = useCallback(() => setTheme(THEME_DARK), []);

  // Efeito para aplicar o tema ao documento
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Remover classes antigas
    root.classList.remove('light', 'dark', 'high-contrast');
    
    // Aplicar tema atual
    root.classList.add(theme);
    
    // Configurar atributos para acessibilidade
    // light -> 'tamanduai' (custom); dark -> 'dark'
    root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'tamanduai');
    
    // Adicionar alto contraste se habilitado
    if (highContrast) {
      root.classList.add('high-contrast');
    }
    
    // Salvar preferências usando o storageManager
    storageManager.setTheme(theme);
  }, [theme, highContrast]);

  // Ouvir mudanças no tema do sistema
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // Só atualiza se o usuário não tiver definido uma preferência manual
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (!saved) {
        setTheme(e.matches ? THEME_DARK : THEME_LIGHT);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        highContrast,
        toggleTheme,
        toggleHighContrast,
        setLightTheme,
        setDarkTheme,
        isDark: theme === THEME_DARK,
        isLight: theme === THEME_LIGHT,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
