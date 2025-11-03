import { logger } from '@/shared/utils/logger';
// src/components/ui/AdvancedThemeSystem.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Sistema avançado de temas com múltiplas opções visuais
 */
  const ThemeContext = createContext({
  currentTheme: 'auto',
  availableThemes: [],
  setTheme: () => {},
  themeConfig: {},
  customColors: {},
  setCustomColors: () => {},
});

export const AdvancedThemeProvider = ({
  children,
  defaultTheme = 'auto',
  enableCustomColors = true,
}) => {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);
  const [customColors, setCustomColors] = useState({});
  const [themeConfig, setThemeConfig] = useState({});

  // Temas disponíveis
  const availableThemes = [
    {
      id: 'light',
      name: 'Claro',
      icon: '☀️',
      description: 'Tema claro padrão',
      colors: {
        primary: '#16A34A',
        secondary: '#F97316',
        accent: '#0EA5E9',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#0F172A',
        'text-secondary': '#64748B',
        border: '#E2E8F0',
      },
    },
    {
      id: 'dark',
      name: 'Escuro',
      icon: '🌙',
      description: 'Tema escuro confortável',
      colors: {
        primary: '#22C55E',
        secondary: '#FB923C',
        accent: '#38BDF8',
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F8FAFC',
        'text-secondary': '#94A3B8',
        border: '#334155',
      },
    },
    {
      id: 'auto',
      name: 'Automático',
      icon: '🖥️',
      description: 'Segue preferência do sistema',
      colors: null, // Será determinado dinamicamente
    },
    {
      id: 'blue',
      name: 'Azul',
      icon: '💙',
      description: 'Tema azul profissional',
      colors: {
        primary: '#3B82F6',
        secondary: '#1D4ED8',
        accent: '#60A5FA',
        background: '#FFFFFF',
        surface: '#F1F5F9',
        text: '#1E293B',
        'text-secondary': '#64748B',
        border: '#CBD5E1',
      },
    },
    {
      id: 'green',
      name: 'Verde',
      icon: '💚',
      description: 'Tema verde natural',
      colors: {
        primary: '#16A34A',
        secondary: '#15803D',
        accent: '#4ADE80',
        background: '#FFFFFF',
        surface: '#F0FDF4',
        text: '#14532D',
        'text-secondary': '#166534',
        border: '#BBF7D0',
      },
    },
    {
      id: 'purple',
      name: 'Roxo',
      icon: '💜',
      description: 'Tema roxo elegante',
      colors: {
        primary: '#8B5CF6',
        secondary: '#7C3AED',
        accent: '#A78BFA',
        background: '#FFFFFF',
        surface: '#FAF5FF',
        text: '#581C87',
        'text-secondary': '#7C2D12',
        border: '#E9D5FF',
      },
    },
    {
      id: 'warm',
      name: 'Quente',
      icon: '🧡',
      description: 'Tema com tons quentes',
      colors: {
        primary: '#F59E0B',
        secondary: '#D97706',
        accent: '#FCD34D',
        background: '#FFFFFF',
        surface: '#FFFBEB',
        text: '#78350F',
        'text-secondary': '#92400E',
        border: '#FEF3C7',
      },
    },
    {
      id: 'cool',
      name: 'Frio',
      icon: '💙',
      description: 'Tema com tons frios',
      colors: {
        primary: '#06B6D4',
        secondary: '#0891B2',
        accent: '#67E8F9',
        background: '#FFFFFF',
        surface: '#ECFEFF',
        text: '#164E63',
        'text-secondary': '#155E75',
        border: '#CFFAFE',
      },
    },
  ];

  // Detectar tema automático baseado no sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateAutoTheme = () => {
      if (currentTheme === 'auto') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        applyTheme(systemTheme);
      } else {
        applyTheme(currentTheme);
      }
    };

    updateAutoTheme();
    mediaQuery.addEventListener('change', updateAutoTheme);
  return () => mediaQuery.removeEventListener('change', updateAutoTheme);
  }, [currentTheme, customColors]);

  // Aplicar tema ao DOM
  const applyTheme = (themeId) => {
    const theme = availableThemes.find(t => t.id === themeId);
    if (!theme) return;

    const colors = theme.colors || (themeId === 'dark' ?
      availableThemes.find(t => t.id === 'dark').colors :
      availableThemes.find(t => t.id === 'light').colors
    );

    // Aplicar cores customizadas se houver
    const finalColors = { ...colors, ...customColors };

    // Aplicar variáveis CSS
    const root = document.documentElement;
    Object.entries(finalColors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Aplicar classe de tema
    root.className = root.className.replace(/theme-\w+/g, '');
    if (themeId !== 'auto') {
      root.classList.add(`theme-${themeId}`);
    }

    setThemeConfig({ ...theme, colors: finalColors });
  };

  // Aplicar cores customizadas
  useEffect(() => {
    if (Object.keys(customColors).length > 0) {
      applyTheme(currentTheme);
    }
  }, [customColors]);

  // Carregar tema salvo
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('tamanduai-advanced-theme');
      const savedCustomColors = localStorage.getItem('tamanduai-custom-colors');

      if (savedTheme && availableThemes.some(t => t.id === savedTheme)) {
        setCurrentTheme(savedTheme);
      }

      if (savedCustomColors && enableCustomColors) {
        setCustomColors(JSON.parse(savedCustomColors));
      }
    } catch (error) {
      logger.warn('Failed to load theme preferences:', error)
    }
  }, []);

  // Salvar tema selecionado
  const handleSetTheme = (themeId) => {
    setCurrentTheme(themeId);
    try {
      localStorage.setItem('tamanduai-advanced-theme', themeId);
    } catch (error) {
      logger.warn('Failed to save theme:', error)
    }
  };

  // Salvar cores customizadas
  const handleSetCustomColors = (colors) => {
    setCustomColors(colors);
    try {
      localStorage.setItem('tamanduai-custom-colors', JSON.stringify(colors));
    } catch (error) {
      logger.warn('Failed to save custom colors:', error)
    }
  };

  const value = {
    currentTheme,
    availableThemes,
    setTheme: handleSetTheme,
    themeConfig,
    customColors,
    setCustomColors: handleSetCustomColors,
    enableCustomColors,
  };
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook para usar temas avançados
 */
export const useAdvancedTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAdvancedTheme must be used within AdvancedThemeProvider');
  }
  return context;
};

/**
 * Seletor avançado de temas
 */
export const AdvancedThemeSelector = ({
  showCustomColors = true,
  showPreview = true,
  className = '',
}) => {
  const {
    currentTheme,
    availableThemes,
    setTheme,
    customColors,
    setCustomColors,
    enableCustomColors,
  } = useAdvancedTheme();

  const [showCustomizer, setShowCustomizer] = useState(false);
  const [tempColors, setTempColors] = useState(customColors);

  const colorKeys = ['primary', 'secondary', 'accent', 'background', 'surface'];

  const handleColorChange = (key, value) => {
    setTempColors(prev => ({ ...prev, [key]: value }));
  };

  const applyCustomColors = () => {
    setCustomColors(tempColors);
    setShowCustomizer(false);
  };
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Seletor de temas predefinidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {availableThemes.map((theme) => (
          <motion.button
            key={theme.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme(theme.id)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              currentTheme === theme.id
                ? 'border-primary bg-primary/10'
                : 'border-base-200 hover:border-base-300'
            }`}
          >
            <div className="text-center space-y-2">
              <div className="text-2xl">{theme.icon}</div>
              <div className="font-medium text-sm">{theme.name}</div>
              <div className="text-xs text-base-content/60">{theme.description}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Botão para cores customizadas */}
      {enableCustomColors && showCustomColors && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowCustomizer(!showCustomizer)}
            className="btn btn-outline btn-sm"
          >
            🎨 Cores Personalizadas
          </button>
        </div>
      )}

      {/* Customizador de cores */}
      <AnimatePresence>
        {showCustomizer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-base-200 rounded-lg p-6 space-y-4"
          >
            <h3 className="font-semibold text-lg">Personalizar Cores</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {colorKeys.map((key) => (
                <div key={key} className="space-y-2">
                  <label className="form-label capitalize">{key}</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={tempColors[key] || '#000000'}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-12 h-10 rounded border border-base-300"
                    />
                    <input
                      type="text"
                      value={tempColors[key] || ''}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      placeholder="#000000"
                      className="input input-bordered input-sm flex-1"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Preview das cores */}
            {showPreview && (
              <div className="space-y-2">
                <h4 className="font-medium">Preview</h4>
                <div className="flex gap-2">
                  {colorKeys.map((key) => (
                    <div
                      key={key}
                      className="w-8 h-8 rounded border-2 border-base-200"
                      style={{ backgroundColor: tempColors[key] }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={applyCustomColors} className="btn btn-primary btn-sm">
                Aplicar Cores
              </button>
              <button
                onClick={() => setShowCustomizer(false)}
                className="btn btn-ghost btn-sm"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Indicador visual do tema atual
 */
export const ThemeIndicator = ({ showDetails = false, className = '' }) => {
  const { currentTheme, themeConfig } = useAdvancedTheme();

  const theme = availableThemes.find(t => t.id === currentTheme);
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`w-4 h-4 rounded-full border-2 border-base-200 ${
        currentTheme === 'auto' ? 'bg-gradient-to-r from-yellow-400 to-blue-500' :
        currentTheme === 'dark' ? 'bg-gray-800' :
        'bg-white'
      }`} />

      <div className="flex flex-col">
        <span className="font-medium text-sm">
          {theme?.name || 'Tema personalizado'}
        </span>
        {showDetails && (
          <span className="text-xs text-base-content/60">
            {theme?.description || 'Cores customizadas'}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Componente de preview de tema
 */
export const ThemePreview = ({
  theme,
  onSelect,
  className = '',
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect?.(theme.id)}
      className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 ${
        'border-base-200 hover:border-primary/50'
      } ${className}`}
    >
      {/* Preview visual do tema */}
      <div
        className="h-20 relative"
        style={{
          background: `linear-gradient(135deg, ${theme.colors?.primary} 0%, ${theme.colors?.secondary} 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-2 left-2 text-white text-lg">
          {theme.icon}
        </div>
        <div className="absolute bottom-2 left-2 text-white text-xs font-medium">
          {theme.name}
        </div>
      </div>

      {/* Paleta de cores */}
      <div className="p-3 bg-base-100">
        <div className="flex gap-1">
          {theme.colors && Object.entries(theme.colors).slice(0, 5).map(([key, value]) => (
            <div
              key={key}
              className="w-4 h-4 rounded border border-base-200"
              style={{ backgroundColor: value }}
            />
          ))}
        </div>
        <p className="text-xs text-base-content/70 mt-2">{theme.description}</p>
      </div>
    </motion.button>
  );
};

/**
 * Hook para animações temáticas
 */
export const useThemeAnimations = () => {
  const { currentTheme, themeConfig } = useAdvancedTheme();

  const getAnimationForTheme = (animationType) => {
    const animations = {
      light: {
        hover: { scale: 1.02, transition: { duration: 0.2 } },
        tap: { scale: 0.98, transition: { duration: 0.1 } },
        entrance: { opacity: 1, y: 0, transition: { duration: 0.3 } },
      },
      dark: {
        hover: { scale: 1.02, transition: { duration: 0.2 } },
        tap: { scale: 0.98, transition: { duration: 0.1 } },
        entrance: { opacity: 1, y: 0, transition: { duration: 0.3 } },
      },
    };

    return animations[currentTheme] || animations.light;
  };

  return {
    getAnimationForTheme,
    currentTheme,
    themeConfig,
  };
};

/**
 * Componente de transições temáticas
 */
export const ThemeTransition = ({ children }) => {
  const { currentTheme } = useAdvancedTheme();
  return (
    <motion.div
      key={currentTheme}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Exportar contexto para uso externo
 */
export { ThemeContext };
