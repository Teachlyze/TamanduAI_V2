import { logger } from '@/shared/utils/logger';
// src/utils/logger.js
/**
 * Sistema de logging avançado para monitoramento e debugging
 */
export class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.enableConsole = options.enableConsole ?? true;
    this.enableRemote = options.enableRemote ?? false;
    this.remoteEndpoint = options.remoteEndpoint;
    this.maxLogSize = options.maxLogSize || 1000;
    this.logs = [];
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
  }

  /**
   * Log de erro
   */
  error(message, data = {}, error = null) {
    this.log('error', message, data, error);
  }

  /**
   * Log de aviso
   */
  warn(message, data = {}) {
    this.log('warn', message, data);
  }

  /**
   * Log de informação
   */
  info(message, data = {}) {
    this.log('info', message, data);
  }

  /**
   * Log de debug
   */
  debug(message, data = {}) {
    this.log('debug', message, data);
  }

  /**
   * Log principal
   */
  log(level, message, data = {}, error = null) {
    if (this.levels[level] > this.levels[this.level]) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: this.sanitizeData(data),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userId: this.getCurrentUserId(),
    };

    // Adicionar ao buffer local
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }

    // Console logging
    if (this.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Remote logging (se habilitado)
    if (this.enableRemote && this.remoteEndpoint) {
      this.logToRemote(logEntry);
    }
  }

  /**
   * Log para console
   */
  logToConsole(logEntry) {
    const { level, message, data, error } = logEntry;
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();

    const prefix = `[${timestamp}] ${level.toUpperCase()}:`;
    const suffix = data || error ? JSON.stringify({ data, error }, null, 2) : '';

    switch (level) {
      case 'error':
        logger.error(prefix, message, suffix)
        break;
      case 'warn':
        logger.warn(prefix, message, suffix)
        break;
      case 'info':
        logger.debug(prefix, message, suffix)
        break;
      case 'debug':
        logger.debug(prefix, message, suffix)
        break;
    }
  }

  /**
   * Log remoto
   */
  async logToRemote(logEntry) {
    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      // Fallback para console se o remote falhar
      logger.error('Failed to send log to remote endpoint:', error)
    }
  }

  /**
   * Sanitiza dados sensíveis
   */
  sanitizeData(data) {
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    const sanitized = { ...data };

    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Obtém ID do usuário atual (se disponível)
   */
  getCurrentUserId() {
    try {
      // Tentar obter do contexto de autenticação
      const user = JSON.parse(localStorage.getItem('tamanduai-user') || 'null');
      return user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Obtém logs recentes
   */
  getLogs(level = null, limit = 50) {
    let filteredLogs = level
      ? this.logs.filter(log => log.level === level)
      : this.logs;

    return filteredLogs.slice(-limit);
  }

  /**
   * Exporta logs
   */
  exportLogs(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'message', 'userId', 'url'];
      const csvRows = [
        headers.join(','),
        ...this.logs.map(log =>
          headers.map(header => {
            const value = log[header] || '';
            return typeof value === 'string' ? `"${value}"` : value;
          }).join(',')
        ),
      ];
      return csvRows.join('\n');
    }

    return this.logs;
  }

  /**
   * Limpa logs
   */
  clearLogs() {
    this.logs = [];
  }
}

/**
 * Instância global do logger
 */
export const logger = new Logger({
  level: import.meta.env.MODE === 'development' ? 'debug' : 'info',
  enableConsole: true,
  enableRemote: import.meta.env.MODE === 'production',
  remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT,
});

/**
 * Middleware para logging de erros não tratados
 */
export const setupGlobalErrorHandler = () => {
  window.addEventListener('error', (event) => {
    logger.error('Unhandled error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }, event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason,
    });
  });
};

/**
 * Hook para usar logger em componentes React
 */
export const useLogger = (componentName) => {
  return {
    error: (message, data, error) =>
      logger.error(`[${componentName}] ${message}`, data, error),
    warn: (message, data) =>
      logger.warn(`[${componentName}] ${message}`, data),
    info: (message, data) =>
      logger.info(`[${componentName}] ${message}`, data),
    debug: (message, data) =>
      logger.debug(`[${componentName}] ${message}`, data),
  };
};

/**
 * Decorator para logging de métodos de classe
 */
export const logMethod = (level = 'info') => {
  return (target, propertyName, descriptor) => {
    const method = descriptor.value;

    descriptor.value = function (...args) {
      const startTime = performance.now();
      logger[level](`Calling ${propertyName}`, { args: args.length });

      try {
        const result = method.apply(this, args);
        const duration = performance.now() - startTime;

        if (result instanceof Promise) {
          return result
            .then(value => {
              logger.debug(`${propertyName} completed`, { duration: `${duration.toFixed(2)}ms` });
              return value;
            })
            .catch(error => {
              logger.error(`${propertyName} failed`, { duration: `${duration.toFixed(2)}ms` }, error);
              throw error;
            });
        } else {
          logger.debug(`${propertyName} completed`, { duration: `${duration.toFixed(2)}ms` });
          return result;
        }
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.error(`${propertyName} failed`, { duration: `${duration.toFixed(2)}ms` }, error);
        throw error;
      }
    };

    return descriptor;
  };
};

/**
 * Classe para métricas de performance
 */
export class PerformanceTracker {
  constructor() {
    this.metrics = new Map();
  }

  startTimer(name) {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      endTime: null,
      duration: null,
    });
  }

  endTimer(name) {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      return metric.duration;
    }
    return null;
  }

  getMetrics() {
    return Array.from(this.metrics.values());
  }

  getAverageTime(name) {
    const metrics = this.getMetrics().filter(m => m.name === name && m.duration);
    if (metrics.length === 0) return null;

    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }
}

export const performanceTracker = new PerformanceTracker();

// Inicializar error handler global
if (typeof window !== 'undefined') {
  setupGlobalErrorHandler();
}
