import { useEffect, useState, useCallback, useContext } from 'react';
import { THEME_LIGHT, THEME_DARK } from '../constants/theme';
import { storageManager } from '../services/storageManager';
import { AuthContext } from '../contexts/AuthContext';

export function useTheme() {
  const { isAuthenticated } = useContext(AuthContext);
  const [theme, setTheme] = useState(THEME_LIGHT);

  // Inicializar o tema
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Se o usuário não estiver autenticado, forçar tema claro
    if (!isAuthenticated) {
      setTheme(THEME_LIGHT);
      storageManager.setTheme(THEME_LIGHT);
      return;
    }
    
    // Tenta carregar do storageManager
    const savedTheme = storageManager.getTheme();
    if (savedTheme === THEME_LIGHT || savedTheme === THEME_DARK) {
      setTheme(savedTheme);
      return;
    }
    
    // Fallback para a preferência do sistema
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme(THEME_DARK);
    } else {
      setTheme(THEME_LIGHT);
    }
  }, [isAuthenticated]);

  // Aplicar tema ao documento
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Limpar classes antigas
    root.classList.remove(THEME_LIGHT, THEME_DARK);
    
    // Aplicar tema atual
    root.classList.add(theme);
    
    // Salvar preferência usando o storageManager
    storageManager.setTheme(theme);
    
    // Configurar atributo para acessibilidade
    root.setAttribute('data-theme', theme === THEME_DARK ? 'dark' : 'tamanduai');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === THEME_LIGHT ? THEME_DARK : THEME_LIGHT);
  }, []);

  return { 
    theme, 
    setTheme, 
    toggleTheme,
    isDark: theme === THEME_DARK,
    isLight: theme === THEME_LIGHT
  };
}

export default useTheme;
