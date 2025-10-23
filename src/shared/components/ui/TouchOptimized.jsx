// src/components/ui/TouchOptimized.jsx
import React, { LoadingScreen, useEffect, useState } from 'react';

/**
 * Componentes otimizados para toque em dispositivos móveis
 */

/**
 * Botão otimizado para toque
 */
export const [loading, setLoading] = useState(true);
  const TouchButton = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'min-h-[44px] px-4 py-2 text-sm', // Altura mínima recomendada para toque
    md: 'min-h-[48px] px-6 py-3 text-base',
    lg: 'min-h-[52px] px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-primary text-primary-content hover:bg-primary-focus active:bg-primary-focus/80',
    secondary: 'bg-secondary text-secondary-content hover:bg-secondary-focus active:bg-secondary-focus/80',
    accent: 'bg-accent text-accent-content hover:bg-accent-focus active:bg-accent-focus/80',
    ghost: 'hover:bg-base-200 active:bg-base-300',
    outline: 'border-2 border-base-300 hover:bg-base-100 active:bg-base-200',
  };
  return (
    <button
      className={`btn ${sizeClasses[size]} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} transition-all duration-150 active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Área clicável otimizada para toque
 */
export const TouchTarget = ({
  children,
  onClick,
  className = '',
  minHeight = '44px',
  ...props
}) => {
  return (
    <div
      className={`min-h-[${minHeight}] flex items-center cursor-pointer select-none ${className}`}
      onClick={onClick}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Card otimizado para toque
 */
export const TouchCard = ({
  children,
  onClick,
  className = '',
  padding = 'p-4',
  ...props
}) => {
  return (
    <div
      className={`${padding} bg-base-100 rounded-lg border border-base-200 shadow-sm cursor-pointer select-none transition-all duration-150 active:scale-[0.98] hover:shadow-md ${className}`}
      onClick={onClick}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Input otimizado para toque
 */
export const TouchInput = ({
  className = '',
  ...props
}) => {
  return (
    <input
      className={`input input-bordered min-h-[48px] text-base ${className}`}
      style={{ WebkitAppearance: 'none', fontSize: '16px' }} // Previne zoom no iOS
      {...props}
    />
  );
};

/**
 * Área de scroll otimizada para toque
 */
export const TouchScrollArea = ({
  children,
  height = 'h-64',
  className = '',
  ...props
}) => {
  return (
    <div
      className={`overflow-auto ${height} ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch', // Scroll suave no iOS
        scrollbarWidth: 'thin',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Hook para detectar se o dispositivo suporta toque
 */
export const useTouchSupport = () => {
  const [supportsTouch, setSupportsTouch] = React.useState(false);

  React.useEffect(() => {
    const checkTouchSupport = () => {
      setSupportsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkTouchSupport();
  }, []);

  return supportsTouch;
};

/**
 * Hook para gerenciar gestos de swipe
 */
export const useSwipeGesture = (onSwipeLeft, onSwipeRight, threshold = 50) => {
  const [startX, setStartX] = React.useState(0);
  const [startY, setStartY] = React.useState(0);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Verifica se o movimento foi principalmente horizontal
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
};

/**
 * Container com layout otimizado para toque
 */
export const TouchContainer = ({
  children,
  className = '',
  spacing = 'gap-4',
}) => {
  return (
    <div className={`space-y-4 ${className}`} style={{ touchAction: 'pan-y' }}>
      {children}
    </div>
  );
};

/**
 * Lista otimizada para toque
 */
export const TouchList = ({
  items,
  renderItem,
  className = '',
  itemHeight = 'min-h-[60px]',
}) => {
  return (
    <div className={`divide-y divide-base-200 ${className}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className={`${itemHeight} flex items-center px-4 active:bg-base-200 transition-colors`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

/**
 * Modal otimizado para toque
 */
export const TouchModal = ({
  isOpen,
  onClose,
  children,
  title,
  className = '',
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-md bg-base-100 rounded-t-lg sm:rounded-lg shadow-xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-base-200">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm min-h-[44px] w-[44px] p-0"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default TouchButton;
