// src/services/metrics.js
import { supabase } from '@/shared/services/supabaseClient';
import Logger from './logger';

// Feature flag to control DB metrics writes (avoid 404 when table doesn't exist)
const ENABLE_DB_METRICS = (import.meta?.env?.VITE_ENABLE_DB_METRICS || '').toString().toLowerCase() === 'true';

/**
 * Service for tracking application metrics including API calls, cache performance,
 * and user interactions.
 */
class MetricsService {
  constructor() {
    // Initialize metrics with all required counters
    this.metrics = {
      cache: {
        hits: 0,
        misses: 0,
        errors: 0,
        sets: 0,
        deletes: 0,
        stale: 0,
        invalidations: 0
      },
      api: {
        calls: 0,
        errors: 0,
        latency: [],
        byEndpoint: {}
      },
      auth: {
        login: { success: 0, errors: 0 },
        sessionChecks: 0,
        permissionChecks: 0,
        tokenRefreshes: 0,
        tokenErrors: 0
      },
      performance: {
        pageLoad: [],
        apiCall: [],
        render: []
      },
      errors: []
    };
    
    this.initialized = false;
    this.pageLoadStart = Date.now();
    
    // Initialize on import
    this.init();
  }

  /**
   * Initialize metrics collection
   */
  init() {
    if (this.initialized || typeof window === 'undefined') return;
    
    // Log metrics periodically (every 5 minutes)
    this.interval = setInterval(() => this.logMetrics(), 5 * 60 * 1000);
    this.initialized = true;
    
    // Track page load time
    window.addEventListener('load', () => {
      const loadTime = Date.now() - this.pageLoadStart;
      this.recordPageLoad(loadTime);
    });
    
    // Log on page unload
    window.addEventListener('beforeunload', () => this.logMetrics());
    
    // Track unhandled errors
    this.setupErrorHandling();
    
    // Track performance metrics
    this.setupPerformanceMonitoring();
  }

  /**
   * Setup global error handling
   */
  setupErrorHandling() {
    // Handle uncaught errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.trackError({
        type: 'unhandled_error',
        message: error?.message || message,
        stack: error?.stack,
        source,
        lineno,
        colno
      });
      return false; // Allow default handler to run
    };
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'unhandled_rejection',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack
      });
    });
  }
  
  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    if (!window.performance) return;
    
    // Track navigation timing
    const navigationTiming = performance.getEntriesByType('navigation')[0];
    if (navigationTiming) {
      const { 
        domComplete, 
        loadEventEnd, 
        domInteractive,
        domContentLoadedEventEnd
      } = navigationTiming;
      
      this.recordPageLoad(loadEventEnd);
      
      Logger.info('Page load metrics', {
        domLoad: domComplete,
        pageLoad: loadEventEnd,
        domInteractive,
        domContentLoaded: domContentLoadedEventEnd
      });
    }
    
    // Track resource loading
    const resources = performance.getEntriesByType('resource');
    resources.forEach(resource => {
      Logger.debug('Resource loaded', {
        name: resource.name,
        duration: resource.duration,
        initiatorType: resource.initiatorType,
        transferSize: resource.transferSize
      });
    });
  }

  /**
   * Record page load time
   */
  recordPageLoad(duration) {
    this.metrics.performance.pageLoad.push(duration);
    
    // Keep only the last 100 measurements
    if (this.metrics.performance.pageLoad.length > 100) {
      this.metrics.performance.pageLoad.shift();
    }
    
    return duration;
  }

  /**
   * Record API call metrics
   */
  apiCall(endpoint, duration, metadata = {}) {
    this.metrics.api.calls++;
    this.metrics.api.latency.push(duration);
    
    // Track by endpoint
    if (!this.metrics.api.byEndpoint[endpoint]) {
      this.metrics.api.byEndpoint[endpoint] = {
        calls: 0,
        errors: 0,
        totalLatency: 0,
        avgLatency: 0
      };
    }
    
    const endpointStats = this.metrics.api.byEndpoint[endpoint];
    endpointStats.calls++;
    endpointStats.totalLatency += duration;
    endpointStats.avgLatency = endpointStats.totalLatency / endpointStats.calls;
    
    // Log the API call
    Logger.info('API Call', {
      endpoint,
      duration,
      ...metadata
    });
    
    return duration;
  }
  
  /**
   * Record an API error
   */
  apiError(endpoint, error) {
    this.metrics.api.errors++;
    
    if (this.metrics.api.byEndpoint[endpoint]) {
      this.metrics.api.byEndpoint[endpoint].errors++;
    }
    
    this.trackError({
      type: 'api_error',
      endpoint,
      message: error?.message || 'Unknown API error',
      stack: error?.stack,
      status: error?.status,
      code: error?.code
    });
    
    return error;
  }
  
  /**
   * Track an error
   */
  trackError(error) {
    const timestamp = new Date().toISOString();
    const errorData = {
      ...error,
      timestamp,
      userAgent: navigator?.userAgent,
      url: window.location?.href
    };
    
    // Add to error log
    this.metrics.errors.push(errorData);
    
    // Keep only the last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
    
    // Log the error
    Logger.error('Error occurred', errorData);
    
    return errorData;
  }
  
  /**
   * Record a cache hit
   */
  cacheHit(endpoint) {
    this.metrics.cache.hits++;
    Logger.debug('Cache hit', { endpoint });
    return this.metrics.cache.hits;
  }
  
  /**
   * Record a cache miss
   */
  cacheMiss(endpoint) {
    this.metrics.cache.misses++;
    Logger.debug('Cache miss', { endpoint });
    return this.metrics.cache.misses;
  }
  
  /**
   * Record a stale cache hit
   */
  cacheStale(endpoint) {
    this.metrics.cache.stale++;
    Logger.debug('Cache stale', { endpoint });
    return this.metrics.cache.stale;
  }
  
  /**
   * Record a cache error
   */
  cacheError(error) {
    this.metrics.cache.errors++;
    this.trackError({
      type: 'cache_error',
      message: error?.message || 'Cache error',
      stack: error?.stack
    });
    return this.metrics.cache.errors;
  }
  
  /**
   * Record a cache set operation
   */
  cacheSet(key) {
    this.metrics.cache.sets++;
    Logger.debug('Cache set', { key });
    return this.metrics.cache.sets;
  }
  
  /**
   * Record a cache delete operation
   */
  cacheDelete(key) {
    this.metrics.cache.deletes++;
    Logger.debug('Cache delete', { key });
    return this.metrics.cache.deletes;
  }
  
  /**
   * Record a cache invalidation
   */
  cacheInvalidate(pattern) {
    this.metrics.cache.invalidations++;
    Logger.debug('Cache invalidate', { pattern });
    return this.metrics.cache.invalidations;
  }
  
  /**
   * Record a successful login
   */
  loginSuccess() {
    this.metrics.auth.login.success++;
    return this.metrics.auth.login.success;
  }
  
  /**
   * Record a failed login
   */
  loginError() {
    this.metrics.auth.login.errors++;
    return this.metrics.auth.login.errors;
  }
  
  /**
   * Record a session check
   */
  sessionCheck() {
    this.metrics.auth.sessionChecks++;
    return this.metrics.auth.sessionChecks;
  }
  
  /**
   * Record a permission check
   */
  permissionCheck() {
    this.metrics.auth.permissionChecks++;
    return this.metrics.auth.permissionChecks;
  }

  /**
   * Log metrics to the server
   */
  async logMetrics() {
    try {
      if (!this.initialized) return;
      
      const timestamp = new Date().toISOString();
      const metrics = { 
        ...this.metrics, 
        timestamp,
        pageUrl: window.location?.href,
        userAgent: navigator?.userAgent
      };
      
      // Log to Supabase if enabled and available
      if (ENABLE_DB_METRICS && supabase) {
        const { error } = await supabase
          .from('metrics')
          .insert([metrics]);
          
        if (error) {
          Logger.error('Error saving metrics to Supabase', { error });
        } else {
          Logger.info('Metrics logged successfully');
        }
      }
      
      // Reset counters for the next interval
      this.resetCounters();
      
      return metrics;
    } catch (error) {
      Logger.error('Error in metrics logging', { error });
      return null;
    }
  }

  /**
   * Reset all metric counters
   */
  resetCounters() {
    // Reset counters but keep the structure
    this.metrics.cache.hits = 0;
    this.metrics.cache.misses = 0;
    this.metrics.cache.errors = 0;
    this.metrics.cache.sets = 0;
    this.metrics.cache.deletes = 0;
    this.metrics.cache.stale = 0;
    this.metrics.cache.invalidations = 0;
    
    this.metrics.api.calls = 0;
    this.metrics.api.errors = 0;
    this.metrics.api.latency = [];
    
    // Don't reset byEndpoint to maintain averages
    
    this.metrics.auth.login.success = 0;
    this.metrics.auth.login.errors = 0;
    this.metrics.auth.sessionChecks = 0;
    this.metrics.auth.permissionChecks = 0;
    
    // Keep performance metrics between resets
    // Keep errors between resets
  }

  /**
   * Get current metrics (for debugging)
   * @returns {Object} Current metrics snapshot
   */
  getMetrics() {
    return { ...this.metrics };
  }
}
export const metrics = new MetricsService();

// Initialize metrics collection
if (typeof window !== 'undefined') {
  metrics.init();
}

export default metrics;
