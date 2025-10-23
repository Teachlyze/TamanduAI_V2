// src/components/ui/ResponsiveHelpers.jsx
import React, { LoadingScreen, useEffect, useState } from 'react';

/**
 * Helpers específicos para melhorar responsividade
 */

/**
 * Container que ajusta automaticamente para diferentes telas
 */
export const [loading, setLoading] = useState(true);
  const AdaptiveContainer = ({
  children,
  className = '',
  maxWidth = '7xl',
}) => {
  return (
    <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className={`mx-auto ${maxWidth === 'none' ? 'max-w-none' : `max-w-${maxWidth}`}`}>
        {children}
      </div>
    </div>
  );
};

/**
 * Layout responsivo para seções de conteúdo
 */
export const ResponsiveSection = ({
  children,
  title,
  subtitle,
  actions,
  className = '',
}) => {
  return (
    <section className={`py-6 sm:py-8 lg:py-12 ${className}`}>
      <AdaptiveContainer>
        {(title || subtitle || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="space-y-1">
              {title && (
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 sm:gap-3">
                {actions}
              </div>
            )}
          </div>
        )}
        {children}
      </AdaptiveContainer>
    </section>
  );
};

/**
 * Grid que se adapta automaticamente ao conteúdo
 */
export const AdaptiveGrid = ({
  children,
  minItemWidth = '280px',
  gap = 'gap-4 sm:gap-6',
  className = '',
}) => {
  return (
    <div
      className={`grid ${gap} ${className}`}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Stack responsivo (vertical no mobile, horizontal no desktop)
 */
export const ResponsiveStack = ({
  children,
  spacing = 'space-y-4 sm:space-y-0 sm:space-x-6',
  align = 'items-center',
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row ${spacing} ${align} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Texto que se adapta ao tamanho da tela
 */
export const AdaptiveText = ({
  children,
  size = 'base',
  className = '',
  as: Component = 'p',
}) => {
  const sizeClasses = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl lg:text-2xl',
    xl: 'text-xl sm:text-2xl lg:text-3xl',
    '2xl': 'text-2xl sm:text-3xl lg:text-4xl',
    '3xl': 'text-3xl sm:text-4xl lg:text-5xl',
  };
  return (
    <Component className={`${sizeClasses[size]} text-gray-900 dark:text-white ${className}`}>
      {children}
    </Component>
  );
};

/**
 * Espaçamento responsivo
 */
export const ResponsiveSpacing = ({
  children,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    xs: 'space-y-2 sm:space-y-3',
    sm: 'space-y-3 sm:space-y-4',
    md: 'space-y-4 sm:space-y-6',
    lg: 'space-y-6 sm:space-y-8',
    xl: 'space-y-8 sm:space-y-12',
    '2xl': 'space-y-12 sm:space-y-16',
  };
  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Card responsivo com melhor layout móvel
 */
export const ResponsiveCard = ({
  children,
  title,
  subtitle,
  actions,
  padding = 'p-4 sm:p-6',
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${padding} ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
          <div className="space-y-1 min-w-0 flex-1">
            {title && (
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
 * Hook para detectar orientação do dispositivo
 */
export const useDeviceOrientation = () => {
  const [orientation, setOrientation] = React.useState({
    isPortrait: true,
    isLandscape: false,
  });

  React.useEffect(() => {
    const updateOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setOrientation({
        isPortrait,
        isLandscape: !isPortrait,
      }, []); // TODO: Add dependencies
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
  return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
};

/**
 * Container com altura responsiva
 */
export const ResponsiveHeightContainer = ({
  children,
  minHeight = 'min-h-screen',
  className = '',
}) => {
  return (
    <div className={`${minHeight} flex flex-col ${className}`}>
      {children}
    </div>
  );
};

/**
 * Layout para tabelas responsivas
 */
export const ResponsiveTableWrapper = ({
  children,
  className = '',
}) => {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div className="min-w-full">
        {children}
      </div>
    </div>
  );
};

export default AdaptiveContainer;
