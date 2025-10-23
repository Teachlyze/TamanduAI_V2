import { useEffect } from 'react';

// Componente para aplicar configurações de acessibilidade globalmente
export const GlobalAccessibility = () => {
  useEffect(() => {
    const applyAccessibilitySettings = () => {
      try {
        const settings = localStorage.getItem('accessibility-settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          // console.log('Aplicando configurações globais:', parsed);

          // Aplicar configurações no documentElement
          const root = document.documentElement;

          if (parsed.fontSize && parsed.fontSize !== 16) {
            root.style.fontSize = `${parsed.fontSize}px`;
            // console.log('GlobalAccessibility: Aplicado fontSize:', parsed.fontSize);
          } else {
            root.style.fontSize = '16px';
          }

          if (parsed.lineSpacing && parsed.lineSpacing !== 1.5) {
            root.style.lineHeight = parsed.lineSpacing.toString();
            // console.log('GlobalAccessibility: Aplicado lineHeight:', parsed.lineSpacing);
          } else {
            root.style.lineHeight = '1.5';
          }

          if (parsed.letterSpacing !== undefined && parsed.letterSpacing !== 0) {
            root.style.letterSpacing = `${parsed.letterSpacing}px`;
            // console.log('GlobalAccessibility: Aplicado letterSpacing:', parsed.letterSpacing);
          } else {
            root.style.letterSpacing = '0px';
          }

          if (parsed.highContrast) {
            root.classList.add('high-contrast');
            // console.log('GlobalAccessibility: Aplicado highContrast: true');
          } else {
            root.classList.remove('high-contrast');
          }

          // Aplicar também no body
          const body = document.body;
          if (body) {
            if (parsed.fontSize && parsed.fontSize !== 16) {
              body.style.fontSize = `${parsed.fontSize}px`;
            } else {
              body.style.fontSize = '16px';
            }

            if (parsed.lineSpacing && parsed.lineSpacing !== 1.5) {
              body.style.lineHeight = parsed.lineSpacing.toString();
            } else {
              body.style.lineHeight = '1.5';
            }

            if (parsed.letterSpacing !== undefined && parsed.letterSpacing !== 0) {
              body.style.letterSpacing = `${parsed.letterSpacing}px`;
            } else {
              body.style.letterSpacing = '0px';
            }

            if (parsed.highContrast) {
              body.classList.add('high-contrast');
            } else {
              body.classList.remove('high-contrast');
            }
          }

          // Aplicar em elementos existentes
          const allElements = document.querySelectorAll('*');
          allElements.forEach(element => {
            if (parsed.fontSize && parsed.fontSize !== 16) {
              element.style.fontSize = `${parsed.fontSize}px`;
            }

            if (parsed.lineSpacing && parsed.lineSpacing !== 1.5) {
              element.style.lineHeight = parsed.lineSpacing.toString();
            }

            if (parsed.letterSpacing !== undefined && parsed.letterSpacing !== 0) {
              element.style.letterSpacing = `${parsed.letterSpacing}px`;
            }
          });

          // console.log('GlobalAccessibility: Configurações aplicadas com sucesso');
        }
      } catch (error) {
        console.warn('GlobalAccessibility: Erro ao aplicar configurações:', error);
      }
    };

    // Aplicar configurações iniciais
    applyAccessibilitySettings();

    // Ouvir mudanças no localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'accessibility-settings') {
        applyAccessibilitySettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('accessibilitySettingsChanged', applyAccessibilitySettings);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('accessibilitySettingsChanged', applyAccessibilitySettings);
    };
  }, []);

  return null;
};

export default GlobalAccessibility;
