import { logger } from '@/shared/utils/logger';
import React, { lazy, useEffect, useMemo, useRef, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';

/**
 * Enhanced Lazy Loading wrapper with intelligent preloading and error boundaries
 */
export const [loading, setLoading] = useState(true);
  const LazyWrapper = ({
  children,
  fallback = null,
  errorFallback = null,
  preload = false,
  ...suspenseProps
}) => {
  const defaultFallback = useMemo(() => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-3 text-sm text-muted-foreground">Carregando...</span>
    </div>
  ), []);

  const defaultErrorFallback = useMemo(() => (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-sm text-muted-foreground">Erro ao carregar componente</p>
        <button
          className="mt-2 text-xs text-primary hover:underline"
          onClick={() => window.location.reload()}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  ), []);
  return (
    <Suspense
      fallback={fallback || defaultFallback}
      {...suspenseProps}
    >
      {children}
    </Suspense>
  );
};

/**
 * Lazy load a component with optional preloading
 */
export const lazyLoad = (importFunc, options = {}) => {
  const {
    preload = false,
    chunkName,
    retries = 3,
  } = options;

  const LazyComponent = lazy(async () => {
    try {
      return await importFunc();
    } catch (error) {
      logger.error(`Error loading component ${chunkName || 'unknown'}:`, error)

      if (retries > 0) {
        logger.debug(`Retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return lazyLoad(importFunc, { ...options, retries: retries - 1 })();
      }

      throw error;
    }
  });

  // Preload the component if requested
  if (preload) {
    importFunc().catch(error => {
      logger.warn('Preload failed for component:', error)
    });
  }

  return LazyComponent;
};

/**
 * Preload a component in the background
 */
export const preloadComponent = (importFunc) => {
  return importFunc().catch(error => {
    logger.warn('Preload failed:', error)
    return null;
  });
};

/**
 * Smart lazy loading for pages with route-based preloading
 */
export const createLazyPage = (importFunc, routePath) => {
  const LazyPage = lazyLoad(importFunc, {
    chunkName: routePath,
    preload: false, // Don't preload by default
  });

  // Add display name for debugging
  LazyPage.displayName = `LazyPage(${routePath})`;

  return LazyPage;
};

/**
 * Batch preload multiple components
 */
export const preloadComponents = (components) => {
  const promises = components.map(({ importFunc, priority = 'normal' }) => {
    const delay = priority === 'high' ? 0 : priority === 'low' ? 2000 : 1000;
    return new Promise(resolve => {
      setTimeout(() => {
        preloadComponent(importFunc).then(resolve);
      }, delay);
    });
  });

  return Promise.allSettled(promises);
};

/**
 * Component for intersection observer-based lazy loading
 */
export const IntersectionLazyLoad = ({
  children,
  fallback,
  rootMargin = '50px',
  threshold = 0.1,
  ...props
}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const ref = React.useRef();

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsIntersecting(true);
          setHasLoaded(true);
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
  return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [rootMargin, threshold, hasLoaded]);
  return (
    <div ref={ref} {...props}>
      {isIntersecting ? children : (fallback || <div className="h-32 bg-muted animate-pulse rounded" />)}
    </div>
  );
};

export default LazyWrapper;
