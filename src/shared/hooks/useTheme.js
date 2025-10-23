import { useContext } from 'react';
import ThemeContext from '@/shared/contexts/ThemeContext';

/**
 * Hook para acessar o tema atual e funções relacionadas
 * @returns {Object} - Objeto contendo o tema atual e funções para manipulá-lo
 * @property {string} theme - O tema atual ('light' ou 'dark')
 * @property {function} toggleTheme - Função para alternar entre temas
 * @property {boolean} isDark - Verdadeiro se o tema atual for escuro
 * @property {boolean} isLight - Verdadeiro se o tema atual for claro
 */
const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default useTheme;
