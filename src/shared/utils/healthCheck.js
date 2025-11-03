import { logger } from '@/shared/utils/logger';
// src/utils/healthCheck.js
/**
 * Sistema de Health Checks para monitoramento da aplicação
 */
export class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.results = new Map();
    this.isRunning = false;
  }

  /**
   * Registra um novo health check
   */
  register(name, checkFunction, options = {}) {
    this.checks.set(name, {
      check: checkFunction,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      interval: options.interval || 30000,
    });
  }

  /**
   * Executa todos os health checks
   */
  async runAll() {
    if (this.isRunning) {
      return this.results;
    }

    this.isRunning = true;
    const promises = [];

    for (const [name, config] of this.checks.entries()) {
      const promise = this.runCheck(name, config)
        .catch(error => ({
          name,
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString(),
        }));
      promises.push(promise);
    }

    const results = await Promise.all(promises);
    results.forEach(result => {
      this.results.set(result.name, result);
    });

    this.isRunning = false;
    return this.results;
  }

  /**
   * Executa um health check específico
   */
  async runCheck(name, config) {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        config.check(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), config.timeout)
        ),
      ]);

      const duration = Date.now() - startTime;

      return {
        name,
        status: 'healthy',
        data: result,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        name,
        status: 'unhealthy',
        message: error.message,
        duration,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Obtém o status geral da aplicação
   */
  getOverallStatus() {
    const results = Array.from(this.results.values());
    const criticalChecks = results.filter(r => this.checks.get(r.name)?.critical);

    if (criticalChecks.some(check => check.status !== 'healthy')) {
      return 'unhealthy';
    }

    if (results.some(check => check.status !== 'healthy')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Obtém métricas detalhadas
   */
  getMetrics() {
    const results = Array.from(this.results.values());
    const totalChecks = results.length;
    const healthyChecks = results.filter(r => r.status === 'healthy').length;
    const unhealthyChecks = results.filter(r => r.status === 'unhealthy').length;

    return {
      overall_status: this.getOverallStatus(),
      total_checks: totalChecks,
      healthy_checks: healthyChecks,
      unhealthy_checks: unhealthyChecks,
      success_rate: totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0,
      last_check: Math.max(...results.map(r => new Date(r.timestamp).getTime())),
      checks: results,
    };
  }
}

/**
 * Instância global do health checker
 */
export const healthChecker = new HealthChecker();

/**
 * Health checks padrão
 */
export const registerDefaultChecks = () => {
  // Check de conectividade com Supabase
  healthChecker.register('supabase', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );

    const { error } = await supabase.from('profiles').select('count').limit(1);
    if (error) throw new Error(`Supabase error: ${error.message}`);

    return { status: 'connected', timestamp: new Date().toISOString() };
  }, { critical: true });

  // Check de conectividade com Redis (se configurado)
  if (import.meta.env.VITE_UPSTASH_REDIS_REST_URL) {
    healthChecker.register('redis', async () => {
      const response = await fetch(import.meta.env.VITE_UPSTASH_REDIS_REST_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cmd: 'PING' }),
      });

      if (!response.ok) {
        throw new Error(`Redis error: ${response.status}`);
      }

      return { status: 'connected', timestamp: new Date().toISOString() };
    }, { critical: true });
  }

  // Check de Winston AI (se configurado)
  if (import.meta.env.VITE_WINSTON_AI_API_KEY) {
    healthChecker.register('winston-ai', async () => {
      const response = await fetch('https://api.gowinston.ai/v2/predict', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_WINSTON_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Test text for health check',
          version: '2024-03-06',
        }),
      });

      if (!response.ok) {
        throw new Error(`Winston AI error: ${response.status}`);
      }

      return { status: 'connected', timestamp: new Date().toISOString() };
    });
  }

  // Check de memória disponível
  healthChecker.register('memory', () => {
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = performance.memory;
      const usedPercentage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

      if (usedPercentage > 90) {
        throw new Error(`High memory usage: ${usedPercentage.toFixed(1)}%`);
      }

      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: usedPercentage,
      };
    }

    return { status: 'not_available' };
  });

  // Check de conectividade de rede
  healthChecker.register('network', async () => {
    const response = await fetch('https://httpbin.org/status/200', {
      method: 'HEAD',
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    return { status: 'connected', latency: Date.now() - performance.now() };
  });
};

/**
 * Hook React para usar health checks
 */
export const useHealthCheck = () => {
  const [healthStatus, setHealthStatus] = React.useState('unknown');
  const [metrics, setMetrics] = React.useState(null);

  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthChecker.runAll();
        const currentMetrics = healthChecker.getMetrics();
        setMetrics(currentMetrics);
        setHealthStatus(currentMetrics.overall_status);
      } catch (error) {
        setHealthStatus('error');
        logger.error('Health check error:', error)
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check a cada 30s

    return () => clearInterval(interval);
  }, []);

  return { healthStatus, metrics };
};

// Inicializar checks padrão
if (typeof window !== 'undefined') {
  registerDefaultChecks();
}
