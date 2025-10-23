// src/components/ui/ResponsiveGrid.jsx
import React, { LoadingScreen, useEffect, useState } from 'react';

/**
 * Grid responsivo aprimorado com breakpoints otimizados
 */
export const [loading, setLoading] = useState(true);
  const ResponsiveGrid = ({
  children,
  cols = { default: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap = 'gap-4',
  className = '',
}) => {
  const getGridCols = () => {
    const breakpoints = [];

    if (cols.default) breakpoints.push(`grid-cols-${cols.default}`);
    if (cols.sm) breakpoints.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) breakpoints.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) breakpoints.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) breakpoints.push(`xl:grid-cols-${cols.xl}`);
    if (cols['2xl']) breakpoints.push(`2xl:grid-cols-${cols['2xl']}`);

    return breakpoints.join(' ');
  };
  return (
    <div className={`grid ${getGridCols()} ${gap} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Layout responsivo para cards
 */
export const ResponsiveCardLayout = ({
  children,
  breakpoint = 'md',
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 ${breakpoint}:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Container responsivo com padding inteligente
 */
export const ResponsiveContainer = ({
  children,
  size = 'default',
  className = '',
  padding = true,
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    default: 'max-w-4xl',
    md: 'max-w-5xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-none',
  };
  return (
    <div className={`w-full mx-auto ${sizeClasses[size]} ${padding ? 'px-4 sm:px-6 lg:px-8' : ''} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Seção responsiva com título e ações
 */
export const ResponsiveSection = ({
  title,
  subtitle,
  children,
  actions,
  className = '',
}) => {
  return (
    <section className={`space-y-6 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            {title && (
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
};

/**
 * Layout responsivo para formulários
 */
export const ResponsiveFormLayout = ({
  children,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      <div className="lg:col-span-2 space-y-6">
        {children}
      </div>
    </div>
  );
};

/**
 * Hook para detectar breakpoints responsivos
 */
export const useResponsiveBreakpoints = () => {
  const [breakpoints, setBreakpoints] = React.useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
  });

  React.useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;

      setBreakpoints({
        isMobile: width < 640,      // sm
        isTablet: width >= 640 && width < 1024,  // sm to lg
        isDesktop: width >= 1024 && width < 1280, // lg to xl
        isLargeDesktop: width >= 1280, // xl+
      }, []); // TODO: Add dependencies
    };

    updateBreakpoints();
    window.addEventListener('resize', updateBreakpoints);
  return () => window.removeEventListener('resize', updateBreakpoints);
  }, []);

  return breakpoints;
};

/**
 * Componente de texto responsivo
 */
export const ResponsiveText = ({
  children,
  size = 'default',
  className = '',
  as: Component = 'p',
}) => {
  const sizeClasses = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    default: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl',
    '2xl': 'text-2xl sm:text-3xl',
    '3xl': 'text-3xl sm:text-4xl',
  };
  return (
    <Component className={`${sizeClasses[size]} ${className}`}>
      {children}
    </Component>
  );
};

/**
 * Espaçamento responsivo
 */
export const ResponsiveSpacing = ({
  children,
  spacing = 'default',
  className = '',
}) => {
  const spacingClasses = {
    none: '',
    xs: 'space-y-2 sm:space-y-3',
    sm: 'space-y-3 sm:space-y-4',
    default: 'space-y-4 sm:space-y-6',
    lg: 'space-y-6 sm:space-y-8',
    xl: 'space-y-8 sm:space-y-12',
  };
  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  );
};

export default ResponsiveGrid;
