import React, { useEffect, useMemo, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { Activity, Zap, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

/**
 * Performance Monitor Component
 * Monitors and displays real-time performance metrics
 */
export const [loading, setLoading] = useState(true);
  const PerformanceMonitor = ({ enabled = false, position = 'bottom-right' }) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memoryUsage: 0,
    loadTime: 0,
    renderTime: 0,
    networkRequests: 0,
  });

  const [isVisible, setIsVisible] = useState(false);

  // Performance monitoring logic
  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;

        setMetrics(prev => ({ ...prev, fps }));
      }

      requestAnimationFrame(measureFPS);
    };

    // Start FPS monitoring
    const fpsInterval = requestAnimationFrame(measureFPS);

    // Monitor memory usage (if available)
    const updateMemoryUsage = () => {
      if (performance.memory) {
        const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        setMetrics(prev => ({ ...prev, memoryUsage: memoryMB }));
      }
    };

    // Monitor network requests
    let requestCount = 0;
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      requestCount++;
      setMetrics(prev => ({ ...prev, networkRequests: requestCount }));
      return originalFetch(...args);
    };

    // Monitor page load time
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      setMetrics(prev => ({ ...prev, loadTime }));
    }

    // Update memory usage periodically
    const memoryInterval = setInterval(updateMemoryUsage, 5000);
  return () => {
      cancelAnimationFrame(fpsInterval);
      clearInterval(memoryInterval);
      window.fetch = originalFetch;
    };
  }, [enabled]);

  // Position styles
  const positionStyles = useMemo(() => {
    const positions = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4',
    };
    return positions[position] || positions['bottom-right'];
  }, [position]);

  if (!enabled || !isVisible) {
  return (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed ${positionStyles} z-50 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors`}
        title="Mostrar métricas de performance"
      >
        <Activity className="w-4 h-4" />
      </button>
    );
  }

  const getPerformanceColor = (value, thresholds) => {
    if (value >= thresholds.high) return 'text-red-500';
    if (value >= thresholds.medium) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getPerformanceIcon = (value, thresholds) => {
    if (value >= thresholds.high) return <AlertTriangle className="w-4 h-4" />;
    if (value >= thresholds.medium) return <TrendingUp className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };
  return (
    <div className={`fixed ${positionStyles} z-50 bg-background border border-border rounded-lg shadow-lg p-4 min-w-48`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Performance</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">FPS</span>
          <div className="flex items-center gap-1">
            {getPerformanceIcon(metrics.fps, { medium: 30, high: 15 })}
            <span className={getPerformanceColor(metrics.fps, { medium: 30, high: 15 })}>
              {metrics.fps}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Memória</span>
          <div className="flex items-center gap-1">
            {getPerformanceIcon(metrics.memoryUsage, { medium: 50, high: 100 })}
            <span className={getPerformanceColor(metrics.memoryUsage, { medium: 50, high: 100 })}>
              {metrics.memoryUsage}MB
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Load Time</span>
          <span className="text-muted-foreground">
            {metrics.loadTime}ms
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Requests</span>
          <span className="text-muted-foreground">
            {metrics.networkRequests}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Web Vitals Monitor Hook
 */
export const useWebVitals = (enabled = false) => {
  const [vitals, setVitals] = useState({
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Web Vitals monitoring would be implemented here
    // This is a placeholder for actual web-vitals integration
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          setVitals(prev => ({
            ...prev,
            [entry.name.toLowerCase()]: entry.duration || entry.startTime,
          }));
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  return () => {
      observer.disconnect();
    };
  }, [enabled]);

  return vitals;
};

/**
 * Network Status Monitor
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState({
    online: navigator.onLine,
    connection: null,
    latency: null,
  });

  useEffect(() => {
    const updateOnlineStatus = () => {
      setStatus(prev => ({ ...prev, online: navigator.onLine }));
    };

    const updateConnectionStatus = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        setStatus(prev => ({
          ...prev,
          connection: {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
          },
        }));
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateConnectionStatus);
      updateConnectionStatus();
    }
  return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);

      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', updateConnectionStatus);
      }
    };
  }, []);

  return status;
};

export default PerformanceMonitor;
