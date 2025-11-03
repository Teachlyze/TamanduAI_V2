import { logger } from '@/shared/utils/logger';
// src/services/monitoring.js
import redisCache from './redis';

/**
 * Sistema de monitoramento e métricas para a aplicação Tamanduí
 */
class MonitoringService {
  constructor() {
    this.metrics = {
      performance: {},
      errors: {},
      userInteractions: {},
      apiCalls: {},
      cache: {},
      system: {},
      security: {},
      business: {},
    };

    this.isEnabled = true;
    this.flushInterval = 30000; // 30 segundos
    this.maxMetricsAge = 3600000; // 1 hora
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 5000, // 5 seconds
      memoryUsage: 0.8, // 80% memory usage
      cacheHitRate: 0.7, // 70% cache hit rate
    };

    this.startPeriodicFlush();
    this.startMemoryMonitoring();
    this.startHealthChecks();
    this.setupGlobalErrorHandling();
  }

  /**
   * Registrar métrica de performance
   */
  recordPerformance(name, value, tags = {}) {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const key = `perf:${name}:${timestamp}`;

    const metric = {
      value,
      timestamp,
      tags,
      type: 'performance',
    };

    this.metrics.performance[key] = metric;

    // Também armazenar no cache Redis para persistência
    this.storeMetricInCache('performance', name, metric);
  }

  /**
   * Registrar erro
   */
  recordError(error, context = {}, severity = 'error') {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const errorId = `err:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;

    const errorMetric = {
      message: error.message || error.toString(),
      stack: error.stack,
      timestamp,
      context,
      severity,
      userAgent: navigator?.userAgent,
      url: window?.location?.href,
      type: 'error',
    };

    this.metrics.errors[errorId] = errorMetric;

    // Store in Redis cache
    this.storeMetricInCache('errors', errorId, errorMetric);

    // Check if error rate exceeds threshold
    this.checkErrorRate();
  }

  /**
   * Registrar interação do usuário
   */
  recordUserInteraction(action, element, metadata = {}) {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const key = `ui:${action}:${timestamp}`;

    const interaction = {
      action,
      element,
      timestamp,
      metadata,
      userAgent: navigator?.userAgent,
      url: window?.location?.href,
      type: 'user_interaction',
    };

    this.metrics.userInteractions[key] = interaction;
    this.storeMetricInCache('user_interactions', action, interaction);
  }

  /**
   * Registrar chamada de API
   */
  recordApiCall(endpoint, method, duration, status, metadata = {}) {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const key = `api:${method}:${endpoint}:${timestamp}`;

    const apiCall = {
      endpoint,
      method,
      duration,
      status,
      timestamp,
      metadata,
      type: 'api_call',
    };

    this.metrics.apiCalls[key] = apiCall;
    this.storeMetricInCache('api_calls', `${method}:${endpoint}`, apiCall);

    // Check response time threshold
    if (duration > this.alertThresholds.responseTime) {
      this.triggerAlert('high_response_time', {
        endpoint,
        method,
        duration,
        threshold: this.alertThresholds.responseTime,
      });
    }
  }

  /**
   * Registrar métrica de cache
   */
  recordCacheOperation(operation, key, hit = true, duration = 0) {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const cacheKey = `cache:${operation}:${key}:${timestamp}`;

    const cacheMetric = {
      operation,
      key,
      hit,
      duration,
      timestamp,
      type: 'cache',
    };

    this.metrics.cache[cacheKey] = cacheMetric;
    this.storeMetricInCache('cache', operation, cacheMetric);

    // Update cache statistics
    this.updateCacheStats(operation, hit);
  }

  /**
   * Registrar evento de segurança
   */
  recordSecurityEvent(event, userId, details = {}) {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const key = `sec:${event}:${userId}:${timestamp}`;

    const securityEvent = {
      event,
      userId,
      timestamp,
      details,
      ip: this.getClientIP(),
      userAgent: navigator?.userAgent,
      type: 'security',
    };

    this.metrics.security[key] = securityEvent;
    this.storeMetricInCache('security', event, securityEvent);

    // Check for suspicious patterns
    this.analyzeSecurityEvent(securityEvent);
  }

  /**
   * Registrar métrica de negócio
   */
  recordBusinessMetric(metric, value, tags = {}) {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const key = `biz:${metric}:${timestamp}`;

    const businessMetric = {
      metric,
      value,
      timestamp,
      tags,
      type: 'business',
    };

    this.metrics.business[key] = businessMetric;
    this.storeMetricInCache('business', metric, businessMetric);
  }

  /**
   * Obter estatísticas agregadas
   */
  async getAggregatedStats(timeRange = 3600000) { // 1 hour default
    const cutoff = Date.now() - timeRange;

    const stats = {
      performance: this.aggregateMetrics(this.metrics.performance, cutoff),
      errors: this.aggregateErrorMetrics(this.metrics.errors, cutoff),
      userInteractions: this.aggregateMetrics(this.metrics.userInteractions, cutoff),
      apiCalls: this.aggregateApiMetrics(this.metrics.apiCalls, cutoff),
      cache: this.aggregateCacheMetrics(this.metrics.cache, cutoff),
      security: this.aggregateSecurityMetrics(this.metrics.security, cutoff),
      business: this.aggregateBusinessMetrics(this.metrics.business, cutoff),
      system: await this.getSystemMetrics(),
    };

    return stats;
  }

  /**
   * Obter relatório de saúde do sistema
   */
  async getHealthReport() {
    const stats = await this.getAggregatedStats();
    const now = Date.now();

    return {
      timestamp: now,
      status: this.calculateOverallHealth(stats),
      uptime: this.getUptime(),
      memory: this.getMemoryUsage(),
      errors: {
        total: stats.errors.total,
        rate: stats.errors.rate,
        recent: stats.errors.recent,
      },
      performance: {
        avgResponseTime: stats.performance.avgResponseTime,
        slowRequests: stats.performance.slowRequests,
      },
      cache: {
        hitRate: stats.cache.hitRate,
        totalOperations: stats.cache.total,
      },
      alerts: this.getActiveAlerts(),
    };
  }

  /**
   * Armazenar métrica no cache Redis
   */
  async storeMetricInCache(category, name, metric) {
    try {
      const key = `metrics:${category}:${name}`;
      await redisCache.set(key, metric, 3600); // 1 hour TTL
    } catch (error) {
      logger.warn('Failed to store metric in cache:', error)
    }
  }

  /**
   * Agregar métricas de performance
   */
  aggregateMetrics(metrics, cutoff) {
    const recent = Object.values(metrics).filter(m => m.timestamp > cutoff);

    if (recent.length === 0) {
      return { total: 0, average: 0, min: 0, max: 0 };
    }

    const values = recent.map(m => m.value);
    return {
      total: recent.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      recent: recent.slice(-10),
    };
  }

  /**
   * Agregar métricas de erro
   */
  aggregateErrorMetrics(errors, cutoff) {
    const recent = Object.values(errors).filter(e => e.timestamp > cutoff);
    const total = recent.length;
    const lastHour = Object.values(errors).filter(e => e.timestamp > Date.now() - 3600000).length;

    return {
      total,
      rate: lastHour / Math.max(1, (Date.now() - cutoff) / 3600000),
      recent: recent.slice(-10),
      bySeverity: this.groupBy(recent, 'severity'),
      byContext: this.groupBy(recent, 'context'),
    };
  }

  /**
   * Agregar métricas de API
   */
  aggregateApiMetrics(apiCalls, cutoff) {
    const recent = Object.values(apiCalls).filter(c => c.timestamp > cutoff);

    return {
      total: recent.length,
      avgResponseTime: recent.length > 0
        ? recent.reduce((sum, call) => sum + call.duration, 0) / recent.length
        : 0,
      slowRequests: recent.filter(call => call.duration > this.alertThresholds.responseTime).length,
      byEndpoint: this.groupBy(recent, 'endpoint'),
      byMethod: this.groupBy(recent, 'method'),
      byStatus: this.groupBy(recent, 'status'),
    };
  }

  /**
   * Agregar métricas de cache
   */
  aggregateCacheMetrics(cacheMetrics, cutoff) {
    const recent = Object.values(cacheMetrics).filter(c => c.timestamp > cutoff);
    const hits = recent.filter(c => c.hit).length;

    return {
      total: recent.length,
      hitRate: recent.length > 0 ? hits / recent.length : 0,
      hits,
      misses: recent.length - hits,
      avgDuration: recent.length > 0
        ? recent.reduce((sum, c) => sum + c.duration, 0) / recent.length
        : 0,
    };
  }

  /**
   * Agregar métricas de segurança
   */
  aggregateSecurityMetrics(securityEvents, cutoff) {
    const recent = Object.values(securityEvents).filter(s => s.timestamp > cutoff);

    return {
      total: recent.length,
      byEvent: this.groupBy(recent, 'event'),
      byUser: this.groupBy(recent, 'userId'),
      suspiciousPatterns: this.detectSuspiciousPatterns(recent),
    };
  }

  /**
   * Agregar métricas de negócio
   */
  aggregateBusinessMetrics(businessMetrics, cutoff) {
    const recent = Object.values(businessMetrics).filter(b => b.timestamp > cutoff);

    return {
      total: recent.length,
      byMetric: this.groupBy(recent, 'metric'),
      values: recent.reduce((acc, metric) => {
        acc[metric.metric] = (acc[metric.metric] || []).concat(metric.value);
        return acc;
      }, {}),
    };
  }

  /**
   * Obter métricas do sistema
   */
  async getSystemMetrics() {
    return {
      memoryUsage: this.getMemoryUsage(),
      uptime: this.getUptime(),
      timestamp: Date.now(),
      userAgent: navigator?.userAgent,
      url: window?.location?.href,
    };
  }

  /**
   * Calcular saúde geral do sistema
   */
  calculateOverallHealth(stats) {
    let healthScore = 100;

    // Penalize high error rate
    if (stats.errors.rate > this.alertThresholds.errorRate) {
      healthScore -= 30;
    }

    // Penalize slow response times
    if (stats.apiCalls.avgResponseTime > this.alertThresholds.responseTime) {
      healthScore -= 20;
    }

    // Penalize low cache hit rate
    if (stats.cache.hitRate < this.alertThresholds.cacheHitRate) {
      healthScore -= 15;
    }

    // Penalize high memory usage
    if (stats.system.memoryUsage > this.alertThresholds.memoryUsage) {
      healthScore -= 10;
    }

    return Math.max(0, Math.min(100, healthScore));
  }

  /**
   * Obter uso de memória
   */
  getMemoryUsage() {
    if ('memory' in performance) {
      const memInfo = performance.memory;
      return memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
    }
    return 0;
  }

  /**
   * Obter uptime (aproximado)
   */
  getUptime() {
    return Date.now() - (performance.timing?.navigationStart || Date.now());
  }

  /**
   * Verificar taxa de erro
   */
  checkErrorRate() {
    const recentErrors = Object.values(this.metrics.errors).filter(
      e => e.timestamp > Date.now() - 300000 // Last 5 minutes
    );

    if (recentErrors.length > 10) {
      this.triggerAlert('high_error_rate', {
        count: recentErrors.length,
        threshold: 10,
      });
    }
  }

  /**
   * Disparar alerta
   */
  triggerAlert(type, data) {
    logger.warn(`🚨 ALERT: ${type}`, data)

    // Store alert in metrics
    const alertKey = `alert:${type}:${Date.now()}`;
    this.metrics.system[alertKey] = {
      type,
      data,
      timestamp: Date.now(),
    };

    // TODO: Send alert to monitoring service (e.g., Sentry, DataDog)
  }

  /**
   * Obter alertas ativos
   */
  getActiveAlerts() {
    return Object.values(this.metrics.system).filter(
      alert => alert.timestamp > Date.now() - 300000 // Last 5 minutes
    );
  }

  /**
   * Atualizar estatísticas de cache
   */
  updateCacheStats(operation, hit) {
    const cacheStats = this.metrics.cache._stats || { hits: 0, misses: 0, total: 0 };
    cacheStats.total++;
    if (hit) cacheStats.hits++;
    else cacheStats.misses++;
    this.metrics.cache._stats = cacheStats;
  }

  /**
   * Analisar evento de segurança
   */
  analyzeSecurityEvent(event) {
    // Check for multiple failed logins
    if (event.event === 'failed_login') {
      const recentFailures = Object.values(this.metrics.security).filter(
        s => s.event === 'failed_login' &&
        s.userId === event.userId &&
        s.timestamp > Date.now() - 300000 // Last 5 minutes
      );

      if (recentFailures.length >= 5) {
        this.triggerAlert('multiple_failed_logins', {
          userId: event.userId,
          attempts: recentFailures.length,
        });
      }
    }

    // Check for suspicious IP activity
    if (event.event === 'suspicious_activity') {
      this.triggerAlert('suspicious_activity', event);
    }
  }

  /**
   * Detectar padrões suspeitos
   */
  detectSuspiciousPatterns(events) {
    const patterns = [];

    // Multiple requests from same IP in short time
    const ipGroups = this.groupBy(events, 'ip');
    Object.entries(ipGroups).forEach(([ip, ipEvents]) => {
      if (ipEvents.length > 50) { // More than 50 events per IP per hour
        patterns.push({
          type: 'high_ip_activity',
          ip,
          count: ipEvents.length,
        });
      }
    });

    return patterns;
  }

  /**
   * Agrupar métricas por campo
   */
  groupBy(array, field) {
    return array.reduce((groups, item) => {
      const key = item[field] || 'unknown';
      groups[key] = (groups[key] || []).concat(item);
      return groups;
    }, {});
  }

  /**
   * Configurar monitoramento de memória
   */
  startMemoryMonitoring() {
    if (!('memory' in performance)) return;

    setInterval(() => {
      const usage = this.getMemoryUsage();
      this.recordPerformance('memory_usage', usage);

      if (usage > this.alertThresholds.memoryUsage) {
        this.triggerAlert('high_memory_usage', {
          usage: Math.round(usage * 100),
          threshold: Math.round(this.alertThresholds.memoryUsage * 100),
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Configurar verificações de saúde
   */
  startHealthChecks() {
    setInterval(async () => {
      try {
        // Check database connectivity
        await this.checkDatabaseHealth();

        // Check cache connectivity
        await this.checkCacheHealth();

        // Check API endpoints
        await this.checkApiHealth();
      } catch (error) {
        this.recordError(error, { context: 'health_check' });
      }
    }, 60000); // Check every minute
  }

  /**
   * Verificar saúde do banco de dados
   */
  async checkDatabaseHealth() {
    const start = Date.now();
    try {
      // Simple query to check DB health
      const { error } = await window.supabase?.from('profiles').select('id').limit(1);
      const duration = Date.now() - start;

      this.recordPerformance('db_health_check', duration);

      if (error) throw error;
    } catch (error) {
      this.recordError(error, { context: 'database_health' });
    }
  }

  /**
   * Verificar saúde do cache
   */
  async checkCacheHealth() {
    const start = Date.now();
    try {
      await redisCache.get('health_check');
      const duration = Date.now() - start;

      this.recordPerformance('cache_health_check', duration);
    } catch (error) {
      this.recordError(error, { context: 'cache_health' });
    }
  }

  /**
   * Verificar saúde da API
   */
  async checkApiHealth() {
    const start = Date.now();
    try {
      // Check a simple API endpoint
      const response = await fetch('/api/health', {
        method: 'GET',
        timeout: 5000,
      });

      const duration = Date.now() - start;
      this.recordApiCall('/api/health', 'GET', duration, response.status);
    } catch (error) {
      this.recordError(error, { context: 'api_health' });
    }
  }

  /**
   * Configurar tratamento global de erros
   */
  setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
      this.recordError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(event.reason, { context: 'unhandled_promise_rejection' });
    });
  }

  /**
   * Iniciar flush periódico
   */
  startPeriodicFlush() {
    setInterval(() => {
      this.flushOldMetrics();
    }, this.flushInterval);
  }

  /**
   * Remover métricas antigas
   */
  flushOldMetrics() {
    const cutoff = Date.now() - this.maxMetricsAge;

    Object.keys(this.metrics).forEach(category => {
      Object.keys(this.metrics[category]).forEach(key => {
        if (this.metrics[category][key].timestamp < cutoff) {
          delete this.metrics[category][key];
        }
      });
    });
  }

  /**
   * Obter IP do cliente (aproximado)
   */
  getClientIP() {
    return 'client-side'; // Real IP detection should be done server-side
  }
}

// Singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;
