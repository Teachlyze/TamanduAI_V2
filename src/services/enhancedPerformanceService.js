import { logger } from '@/shared/utils/logger';
// src/services/enhancedPerformanceService.js
/**
 * Serviço avançado de monitoramento de performance
 * Implementa métricas detalhadas e análise de bottlenecks
 */

import monitoringService from './monitoring';

class EnhancedPerformanceService {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.baselines = new Map();
    this.isEnabled = true;

    // Inicializar observadores de performance
    this.initPerformanceObservers();

    // Carregar baselines históricos
    this.loadBaselines();
  }

  /**
   * Inicializar observadores de performance do navegador
   */
  initPerformanceObservers() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    try {
      // Observer para métricas de navegação
      if ('PerformanceObserver' in window) {
        // Observer para recursos (CSS, JS, imagens)
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordResourceMetric(entry);
          }
        });

        try {
          resourceObserver.observe({ entryTypes: ['resource'] });
          this.observers.set('resource', resourceObserver);
        } catch (e) {
          logger.warn('Resource observer not supported')
        }

        // Observer para medidas de pintura
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordPaintMetric(entry);
          }
        });

        try {
          paintObserver.observe({ entryTypes: ['paint'] });
          this.observers.set('paint', paintObserver);
        } catch (e) {
          logger.warn('Paint observer not supported')
        }

        // Observer para largest contentful paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordLCPMetric(lastEntry);
        });

        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          this.observers.set('lcp', lcpObserver);
        } catch (e) {
          logger.warn('LCP observer not supported')
        }

        // Observer para first input delay
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordFIDMetric(entry);
          }
        });

        try {
          fidObserver.observe({ entryTypes: ['first-input'] });
          this.observers.set('fid', fidObserver);
        } catch (e) {
          logger.warn('FID observer not supported')
        }

        // Observer para layout shifts
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          this.recordCLSMetric(clsValue);
        });

        try {
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          this.observers.set('cls', clsObserver);
        } catch (e) {
          logger.warn('CLS observer not supported')
        }
      }
    } catch (error) {
      logger.warn('Performance observers initialization failed:', error)
    }
  }

  /**
   * Registrar métrica de recurso (CSS, JS, imagens)
   */
  recordResourceMetric(entry) {
    const metric = {
      name: entry.name,
      type: 'resource',
      duration: entry.duration,
      size: entry.transferSize || 0,
      startTime: entry.startTime,
      endTime: entry.responseEnd,
      timestamp: Date.now(),
    };

    this.storeMetric(`resource:${entry.name}`, metric);

    // Registrar métricas específicas por tipo
    if (entry.name.endsWith('.js')) {
      monitoringService.recordBusinessMetric('js_load_time', entry.duration, {
        script: entry.name,
        size: entry.transferSize,
      });
    } else if (entry.name.endsWith('.css')) {
      monitoringService.recordBusinessMetric('css_load_time', entry.duration, {
        stylesheet: entry.name,
        size: entry.transferSize,
      });
    }
  }

  /**
   * Registrar métrica de pintura (FP, FCP)
   */
  recordPaintMetric(entry) {
    const metric = {
      name: entry.name,
      type: 'paint',
      startTime: entry.startTime,
      timestamp: Date.now(),
    };

    this.storeMetric(`paint:${entry.name}`, metric);

    if (entry.name === 'first-contentful-paint') {
      monitoringService.recordBusinessMetric('fcp_time', entry.startTime);
    }
  }

  /**
   * Registrar Largest Contentful Paint
   */
  recordLCPMetric(entry) {
    const metric = {
      type: 'lcp',
      value: entry.startTime,
      element: entry.element?.tagName,
      timestamp: Date.now(),
    };

    this.storeMetric('lcp', metric);
    monitoringService.recordBusinessMetric('lcp_time', entry.startTime);
  }

  /**
   * Registrar First Input Delay
   */
  recordFIDMetric(entry) {
    const metric = {
      type: 'fid',
      value: entry.processingStart - entry.startTime,
      timestamp: Date.now(),
    };

    this.storeMetric('fid', metric);
    monitoringService.recordBusinessMetric('fid_delay', metric.value);
  }

  /**
   * Registrar Cumulative Layout Shift
   */
  recordCLSMetric(value) {
    const metric = {
      type: 'cls',
      value,
      timestamp: Date.now(),
    };

    this.storeMetric('cls', metric);
    monitoringService.recordBusinessMetric('cls_score', value);
  }

  /**
   * Armazenar métrica com limite de retenção
   */
  storeMetric(key, metric) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metrics = this.metrics.get(key);
    metrics.push(metric);

    // Manter apenas as últimas 100 métricas por tipo
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Registrar tempo de execução personalizado
   */
  recordExecutionTime(name, startTime, endTime = performance.now()) {
    const duration = endTime - startTime;
    const metric = {
      name,
      type: 'execution',
      duration,
      startTime,
      endTime,
      timestamp: Date.now(),
    };

    this.storeMetric(`execution:${name}`, metric);
    monitoringService.recordBusinessMetric('execution_time', duration, {
      operation: name,
    });

    return duration;
  }

  /**
   * Registrar uso de memória
   */
  recordMemoryUsage(label = 'general') {
    if ('memory' in performance) {
      const memory = performance.memory;
      const metric = {
        type: 'memory',
        label,
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        timestamp: Date.now(),
      };

      this.storeMetric(`memory:${label}`, metric);
      monitoringService.recordBusinessMetric('memory_usage', metric.usage, {
        label,
        used: metric.used,
        total: metric.total,
      });

      return metric;
    }

    return null;
  }

  /**
   * Obter métricas agregadas
   */
  getAggregatedMetrics(timeRange = 60000) { // 1 minute default
    const cutoff = Date.now() - timeRange;
    const aggregated = {};

    for (const [key, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(m => m.timestamp > cutoff);

      if (recentMetrics.length > 0) {
        const values = recentMetrics.map(m => m.duration || m.value || 0);
        aggregated[key] = {
          count: recentMetrics.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          p95: this.calculatePercentile(values, 0.95),
          latest: recentMetrics[recentMetrics.length - 1],
        };
      }
    }

    return aggregated;
  }

  /**
   * Calcular percentil
   */
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * Comparar com baselines históricos
   */
  compareWithBaselines(currentMetrics) {
    const comparisons = {};

    for (const [key, current] of Object.entries(currentMetrics)) {
      const baseline = this.baselines.get(key);

      if (baseline) {
        const change = ((current.avg - baseline.avg) / baseline.avg) * 100;
        const isRegression = change > 10; // 10% piora
        const isImprovement = change < -10; // 10% melhora

        comparisons[key] = {
          current: current.avg,
          baseline: baseline.avg,
          change: change.toFixed(2) + '%',
          status: isRegression ? 'regression' : isImprovement ? 'improvement' : 'stable',
        };
      }
    }

    return comparisons;
  }

  /**
   * Carregar baselines históricos
   */
  async loadBaselines() {
    try {
      // Em produção, isso viria de uma API ou localStorage
      const stored = localStorage.getItem('performance_baselines');
      if (stored) {
        this.baselines = new Map(JSON.parse(stored));
      }
    } catch (error) {
      logger.warn('Failed to load performance baselines:', error)
    }
  }

  /**
   * Salvar baselines atuais
   */
  async saveBaselines() {
    try {
      const baselinesObj = Object.fromEntries(this.baselines);
      localStorage.setItem('performance_baselines', JSON.stringify(baselinesObj));
    } catch (error) {
      logger.warn('Failed to save performance baselines:', error)
    }
  }

  /**
   * Estabelecer baseline atual
   */
  establishBaseline(name, metrics) {
    this.baselines.set(name, {
      ...metrics,
      establishedAt: Date.now(),
    });
    this.saveBaselines();
  }

  /**
   * Gerar relatório de performance
   */
  generatePerformanceReport() {
    const currentMetrics = this.getAggregatedMetrics();
    const comparisons = this.compareWithBaselines(currentMetrics);

    return {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE || 'production',
      userAgent: navigator.userAgent,
      url: window.location.href,
      metrics: currentMetrics,
      comparisons,
      summary: {
        totalMetrics: Object.keys(currentMetrics).length,
        regressions: Object.values(comparisons).filter(c => c.status === 'regression').length,
        improvements: Object.values(comparisons).filter(c => c.status === 'improvement').length,
        stable: Object.values(comparisons).filter(c => c.status === 'stable').length,
      },
    };
  }

  /**
   * Monitorar componente específico
   */
  monitorComponent(componentName, renderCallback) {
    const startTime = performance.now();

    const result = renderCallback();

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    monitoringService.recordBusinessMetric('component_render_time', renderTime, {
      component: componentName,
    });

    return result;
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        logger.warn('Failed to disconnect observer:', error)
      }
    });
    this.observers.clear();
    this.metrics.clear();
  }
}

// Singleton instance
const enhancedPerformanceService = new EnhancedPerformanceService();

// Hook para usar o serviço de performance no React
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = React.useState({});

  React.useEffect(() => {
    const interval = setInterval(() => {
      const currentMetrics = enhancedPerformanceService.getAggregatedMetrics(30000); // Últimos 30s
      setMetrics(currentMetrics);
    }, 5000); // Atualizar a cada 5s

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    recordExecutionTime: enhancedPerformanceService.recordExecutionTime.bind(enhancedPerformanceService),
    monitorComponent: enhancedPerformanceService.monitorComponent.bind(enhancedPerformanceService),
  };
};

export default enhancedPerformanceService;
