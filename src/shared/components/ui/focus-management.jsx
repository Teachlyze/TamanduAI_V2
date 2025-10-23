import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';

// Contexto para gerenciar focus trap global
const FocusTrapContext = createContext({
  activeTrap: null,
  registerTrap: () => {},
  unregisterTrap: () => {},
});

// Hook para usar focus trap
export const useFocusTrap = (options = {}) => {
  const {
    isActive = false,
    restoreFocus = true,
    loop = true,
  } = options;

  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  const context = useContext(FocusTrapContext);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Salvar foco anterior
    previousFocusRef.current = document.activeElement;

    // Focar primeiro elemento focusable
    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Adicionar event listeners para navegação por teclado
    const handleKeyDown = (e) => {
      if (!loop && e.key === 'Tab') {
        const focusableElements = getFocusableElements(containerRef.current);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // Focar elemento anterior se disponível
        if (previousFocusRef.current && restoreFocus) {
          previousFocusRef.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleEscape);
  return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleEscape);

      // Restaurar foco se necessário
      if (previousFocusRef.current && restoreFocus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, restoreFocus, loop]);

  return containerRef;
};

// Função utilitária para obter elementos focusables
const getFocusableElements = (container) => {
  if (!container) return [];

  const focusableSelectors = [
    'button:not([disabled]):not([aria-hidden="true"])',
    'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
    'select:not([disabled]):not([aria-hidden="true"])',
    'textarea:not([disabled]):not([aria-hidden="true"])',
    'a[href]:not([aria-hidden="true"])',
    '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
    '[contenteditable="true"]:not([aria-hidden="true"])',
  ];

  return Array.from(container.querySelectorAll(focusableSelectors.join(', ')));
};

// Componente FocusTrap
export const FocusTrap = ({
  children,
  isActive = true,
  className = '',
  ...props
}) => {
  const containerRef = useFocusTrap({ isActive });
  return (
    <div
      ref={containerRef}
      className={`focus-trap ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Hook para gerenciar focus automático
export const useAutoFocus = (options = {}) => {
  const {
    selector = null,
    delay = 0,
    condition = true,
  } = options;

  useEffect(() => {
    if (!condition) return;

    const timer = setTimeout(() => {
      if (selector) {
        const element = document.querySelector(selector);
        if (element) {
          element.focus();
        }
      }
    }, delay);
  return () => clearTimeout(timer);
  }, [selector, delay, condition]);
};

// Hook para gerenciar rolagem para elementos focados
export const useScrollToFocus = (options = {}) => {
  const {
    behavior = 'smooth',
    block = 'center',
    inline = 'nearest',
  } = options;

  const scrollToElement = (element) => {
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({
        behavior,
        block,
        inline,
      });
    }
  };

  return scrollToElement;
};

// Hook para gerenciar navegação por teclado em listas
export const useKeyboardListNavigation = (items = [], options = {}) => {
  const {
    orientation = 'vertical',
    loop = true,
    onSelect = () => {},
    onFocus = () => {},
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = (e) => {
    let newIndex = focusedIndex;

    switch (e.key) {
      case 'ArrowUp':
        if (orientation === 'vertical') {
          e.preventDefault();
          newIndex = loop
            ? (focusedIndex - 1 + items.length) % items.length
            : Math.max(0, focusedIndex - 1);
        }
        break;

      case 'ArrowDown':
        if (orientation === 'vertical') {
          e.preventDefault();
          newIndex = loop
            ? (focusedIndex + 1) % items.length
            : Math.min(items.length - 1, focusedIndex + 1);
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          e.preventDefault();
          newIndex = loop
            ? (focusedIndex - 1 + items.length) % items.length
            : Math.max(0, focusedIndex - 1);
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal') {
          e.preventDefault();
          newIndex = loop
            ? (focusedIndex + 1) % items.length
            : Math.min(items.length - 1, focusedIndex + 1);
        }
        break;

      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        e.preventDefault();
        newIndex = items.length - 1;
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (items[focusedIndex]) {
          onSelect(items[focusedIndex], focusedIndex);
        }
        break;

      default:
        return;
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      onFocus(items[newIndex], newIndex);
    }
  };

  return {
    focusedIndex,
    handleKeyDown,
    setFocusedIndex,
  };
};

// Provider para focus trap global
export const FocusTrapProvider = ({ children }) => {
  const [activeTrap, setActiveTrap] = useState(null);

  const registerTrap = (id) => {
    setActiveTrap(id);
  };

  const unregisterTrap = (id) => {
    if (activeTrap === id) {
      setActiveTrap(null);
    }
  };
  return (
    <FocusTrapContext.Provider value={{
      activeTrap,
      registerTrap,
      unregisterTrap,
    }}>
      {children}
    </FocusTrapContext.Provider>
  );
};

// Componente para anunciar mudanças dinâmicas
export const LiveAnnouncer = ({
  message,
  priority = 'polite',
  children,
  className = '',
  ...props
}) => {
  return (
    <>
      <div
        aria-live={priority}
        aria-atomic="true"
        className={`sr-only ${className}`}
        {...props}
      >
        {message}
      </div>
      {children}
    </>
  );
};

export default {
  FocusTrap,
  FocusTrapProvider,
  useFocusTrap,
  useAutoFocus,
  useScrollToFocus,
  useKeyboardListNavigation,
  LiveAnnouncer,
};
