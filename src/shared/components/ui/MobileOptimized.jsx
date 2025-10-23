// src/components/ui/MobileOptimized.jsx
import React, { LoadingScreen, useEffect, useState } from 'react';

/**
 * Componentes otimizados especificamente para mobile
 */

/**
 * Header mobile-friendly
 */
export const [loading, setLoading] = useState(true);
  const MobileHeader = ({
  title,
  subtitle,
  actions,
  className = '',
}) => {
  return (
    <header className={`sticky top-0 z-50 bg-base-100/95 backdrop-blur-sm border-b border-base-200 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          {title && (
            <h1 className="text-lg font-semibold text-base-content truncate">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-sm text-base-content/70 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};

/**
 * Card otimizado para mobile
 */
export const MobileCard = ({
  children,
  title,
  subtitle,
  actions,
  padding = 'p-4',
  className = '',
}) => {
  return (
    <div className={`bg-base-100 rounded-lg border border-base-200 shadow-sm ${padding} ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="font-semibold text-base-content text-base leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-base-content/70 mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

/**
 * Grid responsivo otimizado para mobile-first
 */
export const MobileGrid = ({
  children,
  cols = 1,
  gap = 'gap-4',
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-${cols} sm:grid-cols-${Math.min(cols + 1, 4)} ${gap} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Lista otimizada para mobile
 */
export const MobileList = ({
  items,
  renderItem,
  className = '',
  divider = true,
}) => {
  return (
    <div className={`divide-y divide-base-200 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className={divider && index < items.length - 1 ? 'pb-4 mb-4' : ''}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

/**
 * Formulário otimizado para mobile
 */
export const MobileForm = ({
  children,
  onSubmit,
  className = '',
}) => {
  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${className}`}>
      {children}
    </form>
  );
};

/**
 * Container com scroll horizontal para mobile
 */
export const MobileScrollContainer = ({
  children,
  className = '',
}) => {
  return (
    <div className={`overflow-x-auto -mx-4 px-4 ${className}`}>
      <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
        {children}
      </div>
    </div>
  );
};

/**
 * Badge responsivo
 */
export const MobileBadge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const variants = {
    default: 'bg-base-200 text-base-content',
    primary: 'bg-primary text-primary-content',
    secondary: 'bg-secondary text-secondary-content',
    accent: 'bg-accent text-accent-content',
    success: 'bg-success text-success-content',
    warning: 'bg-warning text-warning-content',
    error: 'bg-error text-error-content',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1 text-sm',
  };
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};

/**
 * Menu dropdown otimizado para mobile
 */
export const MobileDropdown = ({
  trigger,
  items,
  className = '',
}) => {
  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <div tabIndex={0} className="btn btn-ghost btn-sm">
        {trigger}
      </div>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 mt-2">
        {items.map((item, index) => (
          <li key={index}>
            <button
              onClick={item.onClick}
              className="flex items-center gap-2 p-2 text-sm"
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Hook para detectar se é dispositivo móvel
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

/**
 * Componente de texto responsivo otimizado
 */
export const MobileText = ({
  children,
  size = 'base',
  className = '',
  truncate = false,
}) => {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };
  return (
    <p className={`${sizeClasses[size]} text-base-content ${truncate ? 'truncate' : ''} ${className}`}>
      {children}
    </p>
  );
};

export default MobileHeader;
