// src/hooks/useAccessibilityAdvanced.js
import { useState, useEffect, useCallback } from 'react';
import { useAccessibility } from './useAccessibility';

/**
 * Hook avançado para gerenciar configurações de acessibilidade
 * Inclui suporte completo para alto contraste e dark mode aprimorado
 */
export const useAccessibilityAdvanced = () => {
  const baseAccessibility = useAccessibility();

  // Estados adicionais para acessibilidade avançada
  const [advancedPreferences, setAdvancedPreferences] = useState({
    fontFamily: 'inter', // 'inter', 'dyslexia', 'system'
    lineHeight: 'normal', // 'tight', 'normal', 'relaxed'
    letterSpacing: 'normal', // 'tight', 'normal', 'wide'
    wordSpacing: 'normal', // 'tight', 'normal', 'wide'
    saturation: 'normal', // 'low', 'normal', 'high'
    brightness: 'normal', // 'low', 'normal', 'high'
  });

  // Carregar preferências avançadas
  useEffect(() => {
    try {
      const saved = localStorage.getItem('accessibility_advanced_preferences');
      if (saved) {
        setAdvancedPreferences(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (error) {
      console.warn('Failed to load advanced accessibility preferences:', error);
    }
  }, []);

  // Aplicar configurações avançadas ao DOM
  const applyAdvancedSettings = useCallback((prefs) => {
    const root = document.documentElement;

    // Família de fonte
    switch (prefs.fontFamily) {
      case 'dyslexia':
        root.style.setProperty('--font-family-primary', 'OpenDyslexic, Inter, system-ui, sans-serif');
        root.classList.add('font-dyslexia');
        break;
      case 'system':
        root.style.setProperty('--font-family-primary', 'system-ui, -apple-system, sans-serif');
        root.classList.remove('font-dyslexia');
        break;
      default:
        root.style.setProperty('--font-family-primary', 'Inter, system-ui, -apple-system, sans-serif');
        root.classList.remove('font-dyslexia');
    }

    // Altura da linha
    switch (prefs.lineHeight) {
      case 'tight':
        root.style.setProperty('--line-height', '1.2');
        break;
      case 'relaxed':
        root.style.setProperty('--line-height', '1.8');
        break;
      default:
        root.style.setProperty('--line-height', '1.6');
    }

    // Espaçamento entre letras
    switch (prefs.letterSpacing) {
      case 'tight':
        root.style.setProperty('--letter-spacing', '-0.02em');
        break;
      case 'wide':
        root.style.setProperty('--letter-spacing', '0.05em');
        break;
      default:
        root.style.setProperty('--letter-spacing', '0');
    }

    // Espaçamento entre palavras
    switch (prefs.wordSpacing) {
      case 'tight':
        root.style.setProperty('--word-spacing', '-0.1em');
        break;
      case 'wide':
        root.style.setProperty('--word-spacing', '0.2em');
        break;
      default:
        root.style.setProperty('--word-spacing', '0');
    }

    // Saturação
    switch (prefs.saturation) {
      case 'low':
        root.style.setProperty('--saturation', '0.5');
        break;
      case 'high':
        root.style.setProperty('--saturation', '1.5');
        break;
      default:
        root.style.setProperty('--saturation', '1');
    }

    // Brilho
    switch (prefs.brightness) {
      case 'low':
        root.style.setProperty('--brightness', '0.8');
        break;
      case 'high':
        root.style.setProperty('--brightness', '1.2');
        break;
      default:
        root.style.setProperty('--brightness', '1');
    }

    // Aplicar filtros visuais
    const saturation = prefs.saturation === 'normal' ? 1 : parseFloat(prefs.saturation);
    const brightness = prefs.brightness === 'normal' ? 1 : parseFloat(prefs.brightness);

    if (saturation !== 1 || brightness !== 1) {
      root.style.setProperty('--visual-filter', `saturate(${saturation}) brightness(${brightness})`);
      root.classList.add('visual-adjustments');
    } else {
      root.style.removeProperty('--visual-filter');
      root.classList.remove('visual-adjustments');
    }
  }, []);

  // Salvar preferências avançadas
  const saveAdvancedPreferences = useCallback((newPreferences) => {
    try {
      const updated = { ...advancedPreferences, ...newPreferences };
      setAdvancedPreferences(updated);
      localStorage.setItem('accessibility_advanced_preferences', JSON.stringify(updated));
      applyAdvancedSettings(updated);
    } catch (error) {
      console.warn('Failed to save advanced accessibility preferences:', error);
    }
  }, [advancedPreferences, applyAdvancedSettings]);

  // Inicializar configurações avançadas
  useEffect(() => {
    applyAdvancedSettings(advancedPreferences);
  }, [advancedPreferences, applyAdvancedSettings]);

  return {
    ...baseAccessibility,
    advancedPreferences,
    saveAdvancedPreferences,
    setFontFamily: (font) => saveAdvancedPreferences({ fontFamily: font }),
    setLineHeight: (height) => saveAdvancedPreferences({ lineHeight: height }),
    setLetterSpacing: (spacing) => saveAdvancedPreferences({ letterSpacing: spacing }),
    setVisualAdjustments: (saturation, brightness) =>
      saveAdvancedPreferences({ saturation, brightness }),
  };
};

/**
 * Hook para gerenciar temas visuais avançados
 */
export const useAdvancedTheme = () => {
  const { preferences, savePreferences, isDarkMode } = useAccessibility();
  const [currentTheme, setCurrentTheme] = useState('default');

  const themes = {
    default: {
      name: 'Padrão',
      colors: {
        primary: '16A34A',
        secondary: 'F97316',
        accent: '0EA5E9',
      },
    },
    protanopia: {
      name: 'Protanopia',
      colors: {
        primary: '0066CC',
        secondary: 'FF6600',
        accent: '009900',
      },
    },
    deuteranopia: {
      name: 'Deuteranopia',
      colors: {
        primary: '0066CC',
        secondary: 'FF6600',
        accent: '009900',
      },
    },
    tritanopia: {
      name: 'Tritanopia',
      colors: {
        primary: 'CC6600',
        secondary: '0066CC',
        accent: 'CC0099',
      },
    },
    highContrast: {
      name: 'Alto Contraste',
      colors: {
        primary: '000000',
        secondary: 'FFFFFF',
        accent: 'FF0000',
      },
    },
  };

  const applyTheme = useCallback((themeName) => {
    const theme = themes[themeName];
    if (theme) {
      setCurrentTheme(themeName);

      // Aplicar cores CSS customizadas
      const root = document.documentElement;
      root.style.setProperty('--theme-primary', theme.colors.primary);
      root.style.setProperty('--theme-secondary', theme.colors.secondary);
      root.style.setProperty('--theme-accent', theme.colors.accent);

      // Atualizar variáveis CSS
      root.style.setProperty('--p', `#${theme.colors.primary}`);
      root.style.setProperty('--s', `#${theme.colors.secondary}`);
      root.style.setProperty('--a', `#${theme.colors.accent}`);
    }
  }, []);

  // Aplicar tema inicial
  useEffect(() => {
    if (preferences.highContrast) {
      applyTheme('highContrast');
    } else {
      applyTheme('default');
    }
  }, [preferences.highContrast, applyTheme]);

  return {
    currentTheme,
    themes: Object.keys(themes),
    applyTheme,
    getThemeInfo: (themeName) => themes[themeName],
  };
};

/**
 * Componente de seletor de tema avançado
 */
export const AdvancedThemeSelector = ({ isOpen, onClose }) => {
  const { applyTheme, currentTheme, themes, getThemeInfo } = useAdvancedTheme();
  const { advancedPreferences, saveAdvancedPreferences } = useAccessibilityAdvanced();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Configurações Visuais Avançadas</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Fechar painel"
          >
            ✕
          </button>
        </div>

        <div className="space-y-8">
          {/* Temas de cores */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Temas de Cores</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {themes.map((themeName) => {
                const theme = getThemeInfo(themeName);
                return (
                  <button
                    key={themeName}
                    onClick={() => applyTheme(themeName)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      currentTheme === themeName
                        ? 'border-primary bg-primary/10'
                        : 'border-base-200 hover:border-base-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="font-semibold">{theme.name}</div>
                      <div className="flex gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: `#${theme.colors.primary}` }}
                        />
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: `#${theme.colors.secondary}` }}
                        />
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: `#${theme.colors.accent}` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Família de fonte */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Família de Fonte</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'inter', label: 'Inter' },
                { value: 'dyslexia', label: 'Dislexia' },
                { value: 'system', label: 'Sistema' },
              ].map((font) => (
                <button
                  key={font.value}
                  onClick={() => saveAdvancedPreferences({ fontFamily: font.value })}
                  className={`btn btn-sm ${
                    advancedPreferences.fontFamily === font.value
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* Espaçamento */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Espaçamento</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Altura da Linha</label>
                <select
                  className="select select-bordered w-full"
                  value={advancedPreferences.lineHeight}
                  onChange={(e) => saveAdvancedPreferences({ lineHeight: e.target.value })}
                >
                  <option value="tight">Apertada</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Relaxada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Espaço entre Letras</label>
                <select
                  className="select select-bordered w-full"
                  value={advancedPreferences.letterSpacing}
                  onChange={(e) => saveAdvancedPreferences({ letterSpacing: e.target.value })}
                >
                  <option value="tight">Apertado</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Largo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ajustes visuais */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Ajustes Visuais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Saturação</label>
                <select
                  className="select select-bordered w-full"
                  value={advancedPreferences.saturation}
                  onChange={(e) => saveAdvancedPreferences({ saturation: e.target.value })}
                >
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Brilho</label>
                <select
                  className="select select-bordered w-full"
                  value={advancedPreferences.brightness}
                  onChange={(e) => saveAdvancedPreferences({ brightness: e.target.value })}
                >
                  <option value="low">Baixo</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alto</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button onClick={onClose} className="btn btn-primary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook para validação WCAG 2.1 aprimorado
 */
export const useWCAGValidator = () => {
  const [violations, setViolations] = useState([]);
  const [isValidating, setIsValidating] = useState(false);

  const validateWCAG = useCallback(async () => {
    setIsValidating(true);

    try {
      const issues = [];

      // Verificar contraste de cores
      await checkColorContrast(issues);

      // Verificar estrutura de headings
      checkHeadingStructure(issues);

      // Verificar textos alternativos
      checkAltTexts(issues);

      // Verificar labels de formulários
      checkFormLabels(issues);

      // Verificar navegação por teclado
      checkKeyboardNavigation(issues);

      // Verificar ARIA
      checkARIA(issues);

      setViolations(issues);
      return issues;
    } catch (error) {
      console.error('WCAG validation error:', error);
      return [];
    } finally {
      setIsValidating(false);
    }
  }, []);

  const checkColorContrast = async (issues) => {
    // Implementação básica de verificação de contraste
    const elements = document.querySelectorAll('*');
    elements.forEach((el, index) => {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        // Verificação simplificada - em produção usar biblioteca como axe-core
        if (styles.fontSize === '0px' || styles.opacity === '0') {
          issues.push({
            type: 'invisible-element',
            element: el,
            message: 'Elemento invisível encontrado',
            severity: 'warning',
            wcag: '1.4.3',
          });
        }
      }
    });
  };

  const checkHeadingStructure = (issues) => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map(h => parseInt(h.tagName[1]));

    // Verificar se há h1
    if (!levels.includes(1)) {
      issues.push({
        type: 'missing-h1',
        message: 'Página deve ter pelo menos um heading H1',
        severity: 'error',
        wcag: '2.4.1',
      });
    }

    // Verificar ordem lógica
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i-1] > 1) {
        issues.push({
          type: 'heading-order',
          message: 'Headings devem seguir ordem lógica (H1, H2, H3...)',
          severity: 'warning',
          wcag: '2.4.1',
        });
        break;
      }
    }
  };

  const checkAltTexts = (issues) => {
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.alt && !img.hasAttribute('aria-hidden') && !img.hasAttribute('role')) {
        issues.push({
          type: 'missing-alt',
          element: img,
          message: `Imagem ${index + 1} sem texto alternativo`,
          severity: 'error',
          wcag: '1.1.1',
        });
      }
    });
  };

  const checkFormLabels = (issues) => {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input, index) => {
      const hasLabel = input.labels && input.labels.length > 0;
      const hasAriaLabel = input.hasAttribute('aria-label');
      const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');

      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push({
          type: 'missing-label',
          element: input,
          message: `Campo ${index + 1} sem label acessível`,
          severity: 'error',
          wcag: '3.3.2',
        });
      }
    });
  };

  const checkKeyboardNavigation = (issues) => {
    const interactiveElements = document.querySelectorAll('button, a, input, textarea, select, [tabindex]');
    let negativeTabIndex = 0;

    interactiveElements.forEach((el) => {
      const tabIndex = el.getAttribute('tabindex');
      if (tabIndex === '-1') {
        negativeTabIndex++;
      }
    });

    if (negativeTabIndex > interactiveElements.length * 0.3) {
      issues.push({
        type: 'too-many-negative-tabindex',
        message: 'Muitos elementos com tabindex="-1" podem confundir navegação',
        severity: 'warning',
        wcag: '2.4.3',
      });
    }
  };

  const checkARIA = (issues) => {
    // Verificar atributos ARIA válidos
    const elementsWithARIA = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');

    elementsWithARIA.forEach((el) => {
      const ariaLabel = el.getAttribute('aria-label');
      const ariaLabelledBy = el.getAttribute('aria-labelledby');
      const ariaDescribedBy = el.getAttribute('aria-describedby');

      if (ariaLabel && ariaLabel.trim().length === 0) {
        issues.push({
          type: 'empty-aria-label',
          element: el,
          message: 'aria-label vazio',
          severity: 'error',
          wcag: '4.1.2',
        });
      }

      if (ariaLabelledBy && !document.getElementById(ariaLabelledBy)) {
        issues.push({
          type: 'invalid-aria-labelledby',
          element: el,
          message: `Elemento referenciado em aria-labelledby não encontrado: ${ariaLabelledBy}`,
          severity: 'error',
          wcag: '4.1.2',
        });
      }
    });
  };

  return {
    violations,
    isValidating,
    validateWCAG,
    getViolationsBySeverity: (severity) =>
      violations.filter(v => v.severity === severity),
    getViolationsByWCAG: (wcag) =>
      violations.filter(v => v.wcag === wcag),
  };
};
