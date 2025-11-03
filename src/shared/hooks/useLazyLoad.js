import { logger } from '@/shared/utils/logger';
// src/hooks/useLazyLoad.js
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook personalizado para lazy loading de componentes
 * Implementa intersection observer para carregamento sob demanda
 */
export const useLazyLoad = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
    delay = 0,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef(null);

  const handleIntersection = useCallback((entries) => {
    const [entry] = entries;

    if (entry.isIntersecting) {
      setIsVisible(true);

      if (delay > 0) {
        setTimeout(() => {
          setHasLoaded(true);
        }, delay);
      } else {
        setHasLoaded(true);
      }

      if (triggerOnce && elementRef.current) {
        observer.disconnect();
      }
    } else if (!triggerOnce) {
      setIsVisible(false);
    }
  }, [delay, triggerOnce]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    }, []); // TODO: Add dependencies

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection, threshold, rootMargin]);

  return {
    elementRef,
    isVisible,
    hasLoaded,
  };
};

/**
 * Hook para lazy loading de imagens com blur placeholder
 */
export const useLazyImage = (src, placeholder = '') => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { elementRef, hasLoaded } = useLazyLoad();

  useEffect(() => {
    if (hasLoaded && src && !hasError) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setHasError(true);
        setIsLoaded(true);
      };
      img.src = src;
    }
  }, [hasLoaded, src, hasError]);

  return {
    elementRef,
    imageSrc,
    isLoaded,
    hasError,
  };
};

/**
 * Hook para carregamento progressivo de listas
 */
export const useProgressiveLoad = (items = [], pageSize = 10) => {
  const [displayedItems, setDisplayedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // Simulate async loading
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = currentPage * pageSize;
      const endIndex = Math.min(startIndex + pageSize, items.length);
      const newItems = items.slice(startIndex, endIndex);

      setDisplayedItems(prev => [...prev, ...newItems]);
      setCurrentPage(nextPage);
      setHasMore(endIndex < items.length);
      setIsLoading(false);
    }, 300); // Simulate network delay
  }, [currentPage, items, pageSize, isLoading, hasMore]);

  const reset = useCallback(() => {
    setDisplayedItems([]);
    setCurrentPage(0);
    setHasMore(true);
  }, []);

  // Load initial items
  useEffect(() => {
    if (items.length > 0 && displayedItems.length === 0) {
      loadMore();
    }
  }, [items, displayedItems.length, loadMore]);

  return {
    displayedItems,
    isLoading,
    hasMore,
    loadMore,
    reset,
    totalItems: items.length,
    loadedCount: displayedItems.length,
  };
};

/**
 * Hook para prefetching de dados relacionados
 */
export const usePrefetch = (urls = [], enabled = true) => {
  const [prefetchedData, setPrefetchedData] = useState(new Map());

  useEffect(() => {
    if (!enabled || urls.length === 0) return;

    const prefetchPromises = urls.map(async (url) => {
      try {
        // Skip if already prefetched
        if (prefetchedData.has(url)) return;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPrefetchedData(prev => new Map(prev.set(url, data)));
        }
      } catch (error) {
        logger.warn(`Failed to prefetch ${url}:`, error)
      }
    });

    // Execute prefetching in background
    Promise.all(prefetchPromises);
  }, [urls, enabled, prefetchedData]);

  const getPrefetchedData = useCallback((url) => {
    return prefetchedData.get(url);
  }, [prefetchedData]);

  return {
    getPrefetchedData,
    hasPrefetched: (url) => prefetchedData.has(url),
    prefetchedCount: prefetchedData.size,
  };
};

export default useLazyLoad;
