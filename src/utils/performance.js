/**
 * Performance Optimization Utilities
 */

// Debounce function
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit = 100) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Lazy load images
export const lazyLoadImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(imageUrl);
    img.onerror = reject;
    img.src = imageUrl;
  });
};

// Preload critical resources
export const preloadResource = (url, type = 'fetch') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = type;
  document.head.appendChild(link);
};

// Prefetch next page
export const prefetchPage = (url) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
};

// Measure component render time
export const measureRenderTime = (componentName) => {
  const start = performance.now();
  return () => {
    const end = performance.now();
    console.log(`${componentName} rendered in ${(end - start).toFixed(2)}ms`);
  };
};

// Cache manager
class CacheManager {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    const item = this.cache.get(key);
    
    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key, value, ttl = 5 * 60 * 1000) { // 5 minutes default
    // Remove oldest if at max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: ttl ? Date.now() + ttl : null
    });
  }

  has(key) {
    return this.cache.has(key) && this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    this.cache.delete(key);
  }
}

export const cache = new CacheManager();

// Virtual scrolling helper
export const getVisibleRange = (scrollTop, itemHeight, containerHeight, totalItems) => {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    Math.ceil((scrollTop + containerHeight) / itemHeight),
    totalItems - 1
  );
  
  return { startIndex, endIndex };
};

// Batch updates
export const batchUpdates = (updates) => {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
      resolve();
    });
  });
};

// Web Worker helper
export const createWorker = (workerFunction) => {
  const blob = new Blob([`(${workerFunction.toString()})()`], {
    type: 'application/javascript'
  });
  return new Worker(URL.createObjectURL(blob));
};

// Monitor performance
export const monitorPerformance = () => {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('LCP:', entry.renderTime || entry.loadTime);
        }
        if (entry.entryType === 'first-input') {
          console.log('FID:', entry.processingStart - entry.startTime);
        }
        if (entry.entryType === 'layout-shift') {
          console.log('CLS:', entry.value);
        }
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
  }
};

// Optimize images
export const optimizeImage = (url, width, height, quality = 80) => {
  // For external services like Cloudinary, Imgix, etc.
  // This is a placeholder - implement based on your image service
  return `${url}?w=${width}&h=${height}&q=${quality}&auto=format`;
};

// Request idle callback wrapper
export const idleCallback = (callback) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
};

// Intersection Observer helper for lazy loading
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };

  return new IntersectionObserver(callback, defaultOptions);
};

export default {
  debounce,
  throttle,
  lazyLoadImage,
  preloadResource,
  prefetchPage,
  measureRenderTime,
  cache,
  getVisibleRange,
  batchUpdates,
  createWorker,
  monitorPerformance,
  optimizeImage,
  idleCallback,
  createIntersectionObserver
};
