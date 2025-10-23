// src/hooks/useAccessibility.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gerenciar configurações de acessibilidade
 * Implementa recursos WCAG 2.1 avançados
 */
export const useAccessibility = () => {
  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
    focusVisible: true,
    announcements: true,
  });

  // Aplicar configurações de acessibilidade ao DOM
  const applyAccessibilitySettings = useCallback((prefs) => {
    const root = document.documentElement;

    // Reduced motion
    if (prefs.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.classList.add('reduce-motion');
    } else {
      root.style.removeProperty('--animation-duration');
      root.classList.remove('reduce-motion');
    }

    // High contrast
    if (prefs.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Large text
    if (prefs.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Focus visible
    if (prefs.focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }
  }, []);

  // Carregar preferências salvas
  useEffect(() => {
    try {
      const saved = localStorage.getItem('accessibility_preferences');
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error);
    }
  }, []);

  // Salvar preferências
  const savePreferences = useCallback((newPreferences) => {
    try {
      const updated = { ...preferences, ...newPreferences };

      // Evitar atualizações desnecessárias que causam re-render em loop
      const prev = preferences;
      const keys = Object.keys(updated);
      let changed = false;
      for (const k of keys) {
        if (updated[k] !== prev[k]) {
          changed = true;
          break;
        }
      }
      if (!changed) return; // nada mudou

      setPreferences(updated);
      localStorage.setItem('accessibility_preferences', JSON.stringify(updated));

      // Aplicar mudanças imediatamente
      applyAccessibilitySettings(updated);
    } catch (error) {
      console.warn('Failed to save accessibility preferences:', error);
    }
  }, [preferences, applyAccessibilitySettings]);

  // Detectar se usuário prefere reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)', []); // TODO: Add dependencies

    const handleChange = (e) => {
      if (preferences.reducedMotion !== e.matches) {
        savePreferences({ reducedMotion: e.matches }, []); // TODO: Add dependencies
      }
    };

    // Aplicar preferência inicial somente se diferente
    if (preferences.reducedMotion !== mediaQuery.matches) {
      savePreferences({ reducedMotion: mediaQuery.matches });
    }

    // Ouvir mudanças
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences.reducedMotion, savePreferences]);

  return {
    preferences,
    savePreferences,
    isReducedMotion: preferences.reducedMotion,
    isHighContrast: preferences.highContrast,
    isLargeText: preferences.largeText,
  };
};

/**
 * Hook para gerenciar navegação por teclado
 */
export const useKeyboardNavigation = () => {
  const [focusStack, setFocusStack] = useState([]);

  const pushFocus = useCallback((element) => {
    setFocusStack(prev => [...prev, element]);
  }, []);

  const popFocus = useCallback(() => {
    setFocusStack(prev => prev.slice(0, -1));
  }, []);

  const clearFocus = useCallback(() => {
    setFocusStack([]);
  }, []);

  return {
    focusStack,
    pushFocus,
    popFocus,
    clearFocus,
  };
};

/**
 * Hook para anúncios de tela para screen readers
 */
export const useScreenReader = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);

  // Detectar se há screen reader ativo
  useEffect(() => {
    const checkScreenReader = () => {
      // Verificar se há indicadores comuns de screen reader
      const hasScreenReader =
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver') ||
        window.speechSynthesis !== undefined ||
        document.querySelector('[role="application"]') !== null;

      setIsEnabled(hasScreenReader);
    };

    checkScreenReader();

    // Verificar periodicamente
    const interval = setInterval(checkScreenReader, 10000);

    return () => clearInterval(interval);
  }, []);

  const announce = useCallback((message, priority = 'polite') => {
    if (!isEnabled) return;

    const announcement = {
      id: Date.now() + Math.random(),
      message,
      priority,
      timestamp: new Date(),
    };

    setAnnouncements(prev => [...prev, announcement]);

    // Remover anúncio após 5 segundos
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 5000);

    // Anunciar para screen readers
    if ('speechSynthesis' in window && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      // Usar voz em português se disponível
      const voices = window.speechSynthesis.getVoices();
      const portugueseVoice = voices.find(voice =>
        voice.lang.includes('pt') || voice.name.includes('Portuguese')
      );

      if (portugueseVoice) {
        utterance.voice = portugueseVoice;
        utterance.lang = 'pt-BR';
      }

      window.speechSynthesis.speak(utterance);
    }
  }, [isEnabled]);

  return {
    announce,
    announcements,
    isEnabled,
  };
};

/**
 * Hook para gerenciar foco e navegação
 */
export const useFocusManagement = () => {
  const [focusedElement, setFocusedElement] = useState(null);

  const focusElement = useCallback((element) => {
    if (element && typeof element.focus === 'function') {
      element.focus();
      setFocusedElement(element);
    }
  }, []);

  const trapFocus = useCallback((container) => {
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    // Focus first element
    if (firstFocusable) {
      firstFocusable.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  return {
    focusedElement,
    focusElement,
    trapFocus,
  };
};

/**
 * Hook para validação de acessibilidade WCAG 2.1
 */
export const useAccessibilityValidator = () => {
  const [violations, setViolations] = useState([]);

  const validateElement = useCallback((element) => {
    const issues = [];

    // Verificar se imagens têm alt text
    const images = element.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.alt && !img.hasAttribute('aria-hidden')) {
        issues.push({
          type: 'missing-alt',
          element: img,
          message: `Imagem ${index + 1} sem texto alternativo`,
          severity: 'error',
        });
      }
    });

    // Verificar se botões têm texto acessível
    const buttons = element.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const hasText = button.textContent.trim();
      const hasAriaLabel = button.hasAttribute('aria-label');
      const hasAriaLabelledBy = button.hasAttribute('aria-labelledby');

      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push({
          type: 'missing-button-text',
          element: button,
          message: `Botão ${index + 1} sem texto acessível`,
          severity: 'error',
        });
      }
    });

    // Verificar contraste de cores (simplificado)
    const textElements = element.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
    textElements.forEach((el) => {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // Verificação básica de contraste (pode ser aprimorada)
      if (color === backgroundColor || styles.fontSize === '0px') {
        issues.push({
          type: 'contrast-issue',
          element: el,
          message: 'Possível problema de contraste',
          severity: 'warning',
        });
      }
    });

    return issues;
  }, []);

  const scanPage = useCallback(() => {
    const pageIssues = validateElement(document.body);
    setViolations(pageIssues);
    return pageIssues;
  }, [validateElement]);

  return {
    violations,
    scanPage,
    validateElement,
  };
};

export default useAccessibility;
