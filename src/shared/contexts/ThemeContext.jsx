import { createContext, useContext, useState, useEffect } from 'react';
import { storageManager } from '@/shared/services/storageManager';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Usar storageManager para recuperar preferência
    return storageManager.getTheme();
  });

  const [highContrast, setHighContrast] = useState(() => {
    return storageManager.getHighContrast();
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'high-contrast');
    
    // Add current theme
    root.classList.add(theme);
    // Set daisyUI theme for visual tokens
    // light -> 'tamanduai' (custom); dark -> 'dark'
    root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'tamanduai');
    
    // Add high contrast if enabled
    if (highContrast) {
      root.classList.add('high-contrast');
    }
    
    // Save to localStorage using storageManager (persiste após logout)
    storageManager.setTheme(theme);
    storageManager.setHighContrast(highContrast);
  }, [theme, highContrast]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // Only update if user hasn't manually set a preference
      const saved = storageManager.getTheme();
      if (!saved || saved === 'light') { // Se não tem preferência salva ou está no padrão
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleHighContrast = () => {
    setHighContrast(prev => !prev);
  };

  const setLightTheme = () => setTheme('light');
  const setDarkTheme = () => setTheme('dark');

  return (
    <ThemeContext.Provider
      value={{
        theme,
        highContrast,
        toggleTheme,
        toggleHighContrast,
        setLightTheme,
        setDarkTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
