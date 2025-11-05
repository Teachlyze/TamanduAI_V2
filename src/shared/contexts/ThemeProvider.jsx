import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { THEME_DARK, THEME_LIGHT, THEME_STORAGE_KEY } from '@/shared/constants/theme';
import { storageManager } from '@/shared/services/storageManager';
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
      
      // Usar storageManager para recuperar o tema
      const savedTheme = storageManager.getTheme();
      if (savedTheme === THEME_LIGHT || savedTheme === THEME_DARK) {
        return savedTheme;
      }
      
      // Usar preferência do sistema se não houver tema salvo
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return THEME_DARK;
      }
      
      // Default para light
      return THEME_LIGHT;
    });

  // Aplicar classe de tema ao elemento raiz
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remover classes de tema existentes
    root.classList.remove(THEME_LIGHT, THEME_DARK);
    
    // Adicionar a classe do tema atual
    root.classList.add(theme);
    
    // Salvar preferência usando o storageManager
    storageManager.setTheme(theme);
    
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
      // Não alterar automaticamente se houver preferência salva
      const savedTheme = storageManager.getTheme();
      if (!savedTheme) {
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
    storageManager.setTheme(newTheme);
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
