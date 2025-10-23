import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { THEME_DARK, THEME_LIGHT, THEME_STORAGE_KEY } from '@/shared/constants/theme';
import ThemeContext from './ThemeContext';

/**
 * Provedor de tema que envolve a aplicação
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {React.ReactNode} props.children - Componentes filhos que terão acesso ao tema
 */
const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return THEME_LIGHT;
    // Prefer unified key 'appTheme', then fallback to legacy THEME_STORAGE_KEY
    const savedPrimary = localStorage.getItem('appTheme');
    if (savedPrimary === THEME_LIGHT || savedPrimary === THEME_DARK) return savedPrimary;
    const savedLegacy = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedLegacy === THEME_LIGHT || savedLegacy === THEME_DARK) return savedLegacy;
    // Default to light, do NOT auto-apply system preference
    return THEME_LIGHT;
  });

  // Aplicar classe de tema ao elemento raiz
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remover classes de tema existentes
    root.classList.remove(THEME_LIGHT, THEME_DARK);
    
    // Adicionar a classe do tema atual
    root.classList.add(theme);
    
    // Salvar no localStorage (unificado + legado para compatibilidade)
    localStorage.setItem('appTheme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    
    // Para o modo escuro do Tailwind
    if (theme === THEME_DARK) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Definir atributo data-theme para outras bibliotecas
    root.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Ouvir mudanças no tema do sistema quando não houver preferência salva
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Não alterar automaticamente se houver preferência salva em qualquer chave
      const savedPrimary = localStorage.getItem('appTheme');
      const savedLegacy = localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedPrimary && !savedLegacy) {
        setTheme(mediaQuery.matches ? THEME_DARK : THEME_LIGHT);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Função para alternar entre temas
  const toggleTheme = useCallback(() => {
    const newTheme = theme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
    setTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, [theme]);

  // Valor do contexto
  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    isDark: theme === THEME_DARK,
    isLight: theme === THEME_LIGHT,
  }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
