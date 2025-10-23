import { createContext, forwardRef, useContext, useEffect, useRef, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';

// Contexto para gerenciar acessibilidade global
const AccessibilityContext = createContext({
  announce: () => {},
  setPageTitle: () => {},
  focusElement: () => {},
});

// Hook para usar funcionalidades de acessibilidade
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Provider de acessibilidade
export const AccessibilityProvider = ({ children }) => {
  const announcementRef = useRef(null);

  // Função para anunciar mudanças para screen readers
  const announce = (message, priority = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
      announcementRef.current.setAttribute('aria-live', priority);
    }
  };

  // Função para definir título da página
  const setPageTitle = (title) => {
    document.title = title;
    announce(`Página carregada: ${title}`);
  };

  // Função para focar elemento programaticamente
  const focusElement = (selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
      // Anunciar elemento focado
      const label = element.getAttribute('aria-label') || element.textContent || 'Elemento';
      announce(`Focado em: ${label}`);
    }
  };
  return (
    <AccessibilityContext.Provider value={{
      announce,
      setPageTitle,
      focusElement,
    }}>
      {/* Live region para anúncios */}
      <div
        ref={announcementRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      {children}
    </AccessibilityContext.Provider>
  );
};

// Hook para gerenciar foco automático
export const useFocusManagement = (options = {}) => {
  const {
    autoFocus = false,
    focusSelector = null,
    restoreFocus = true,
    trapFocus = false,
  } = options;

  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (autoFocus && focusSelector) {
      const element = document.querySelector(focusSelector);
      if (element) {
        previousFocusRef.current = document.activeElement;
        element.focus();
      }
    }
  return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [autoFocus, focusSelector, restoreFocus]);

  // Função para trap focus dentro de um container
  const trapFocusInContainer = (container) => {
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
  return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  };

  return {
    trapFocusInContainer,
  };
};

// Hook para gerenciar anúncios live
export const useLiveAnnouncements = () => {
  const { announce } = useAccessibility();

  const announceError = (message) => {
    announce(`Erro: ${message}`, 'assertive');
  };

  const announceSuccess = (message) => {
    announce(`Sucesso: ${message}`, 'polite');
  };

  const announceWarning = (message) => {
    announce(`Aviso: ${message}`, 'polite');
  };

  const announceInfo = (message) => {
    announce(message, 'polite');
  };

  const announceLoading = (message = 'Carregando...') => {
    announce(message, 'polite');
  };

  const announceNavigation = (from, to) => {
    announce(`Navegando de ${from} para ${to}`, 'polite');
  };

  return {
    announceError,
    announceSuccess,
    announceWarning,
    announceInfo,
    announceLoading,
    announceNavigation,
  };
};

// Hook para gerenciar navegação por teclado
export const useKeyboardNavigation = (items = [], options = {}) => {
  const {
    orientation = 'vertical',
    loop = true,
    onSelect = () => {},
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowUp':
        if (orientation === 'vertical') {
          e.preventDefault();
          setFocusedIndex(prev =>
            loop
              ? (prev - 1 + items.length) % items.length
              : Math.max(0, prev - 1)
          );
        }
        break;

      case 'ArrowDown':
        if (orientation === 'vertical') {
          e.preventDefault();
          setFocusedIndex(prev =>
            loop
              ? (prev + 1) % items.length
              : Math.min(items.length - 1, prev + 1)
          );
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          e.preventDefault();
          setFocusedIndex(prev =>
            loop
              ? (prev - 1 + items.length) % items.length
              : Math.max(0, prev - 1)
          );
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal') {
          e.preventDefault();
          setFocusedIndex(prev =>
            loop
              ? (prev + 1) % items.length
              : Math.min(items.length - 1, prev + 1)
          );
        }
        break;

      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (items[focusedIndex]) {
          onSelect(items[focusedIndex], focusedIndex);
        }
        break;

      default:
        break;
    }
  };

  useEffect(() => {
    // Focar o item atualmente selecionado
    if (items[focusedIndex] && items[focusedIndex].ref) {
      items[focusedIndex].ref.focus();
    }
  }, [focusedIndex, items]);

  return {
    focusedIndex,
    handleKeyDown,
    setFocusedIndex,
  };
};

// Hook para gerenciar estados de erro acessíveis
export const useAccessibleErrors = () => {
  const [errors, setErrors] = useState({});
  const { announceError } = useLiveAnnouncements();

  const setError = (field, message) => {
    setErrors(prev => ({ ...prev, [field]: message }));
    if (message) {
      announceError(`Erro no campo ${field}: ${message}`);
    }
  };

  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const clearAllErrors = () => {
    setErrors({});
  };

  const hasErrors = Object.values(errors).some(error => error !== null);

  return {
    errors,
    setError,
    clearError,
    clearAllErrors,
    hasErrors,
  };
};

// Componente para regiões live acessíveis
export const LiveRegion = ({
  children,
  priority = 'polite',
  atomic = true,
  className = '',
  ...props
}) => {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      className={`sr-only ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Componente para anúncios visuais acessíveis
export const AccessibleAlert = ({
  type = 'info',
  title,
  children,
  className = '',
  ...props
}) => {
  const alertClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-muted/30 dark:border-blue-800 dark:text-blue-200',
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
  };
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`p-4 rounded-lg border ${alertClasses[type]} ${className}`}
      {...props}
    >
      {title && <div className="font-semibold mb-1">{title}</div>}
      <div>{children}</div>
    </div>
  );
};

// Componente para botões acessíveis
export const AccessibleButton = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  className = '',
  ...props
}, ref) => {
  const buttonClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100 dark:bg-gray-700 dark:text-gray-100',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300',
    ghost: 'text-blue-600 hover:bg-blue-50 disabled:text-blue-300',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel || (loading ? 'Carregando...' : undefined)}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      className={`
        ${buttonClasses[variant]}
        ${sizeClasses[size]}
        rounded-md font-medium
        focus:outline-none focus:ring-4 focus:ring-blue-500/25
        disabled:cursor-not-allowed disabled:opacity-50
        transition-all duration-200
        ${className}
      `}
      {...props}
    >
      {loading && (
        <span className="inline-flex items-center mr-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
      {children}
    </button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

export default {
  AccessibilityProvider,
  useAccessibility,
  useFocusManagement,
  useLiveAnnouncements,
  useKeyboardNavigation,
  useAccessibleErrors,
  LiveRegion,
  AccessibleAlert,
  AccessibleButton,
};

