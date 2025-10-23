// src/services/errorMonitoring.js
/**
 * Sistema avançado de monitoramento de erros e alertas
 */
// Feature flag to control admin alert notifications in dev/prod
const ENABLE_ALERT_NOTIFICATIONS = (import.meta?.env?.VITE_ENABLE_ALERT_NOTIFICATIONS || '').toString().toLowerCase() === 'true';

export class ErrorMonitor {
  constructor() {
    this.errors = new Map();
    this.alerts = [];
    this.metrics = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsByUser: new Map(),
      responseTime: [],
      uptime: 0,
    };

    this.lastErrorTime = null;
    this.errorThreshold = 10; // Número de erros antes de alertar
    this.timeWindow = 300000; // 5 minutos
  }

  /**
   * Registra um erro no sistema
   */
  recordError(error, context = {}) {
    const errorId = this.generateErrorId(error);
    const timestamp = Date.now();

    const errorRecord = {
      id: errorId,
      message: error.message || error.toString(),
      stack: error.stack,
      type: error.name || 'Unknown',
      timestamp,
      context,
      userId: context.userId,
      url: context.url || window.location?.href,
      userAgent: navigator.userAgent,
      resolved: false,
    };

    // Adicionar ao buffer de erros
    this.errors.set(errorId, errorRecord);
    this.metrics.totalErrors++;

    // Atualizar métricas por tipo
    const currentCount = this.metrics.errorsByType.get(errorRecord.type) || 0;
    this.metrics.errorsByType.set(errorRecord.type, currentCount + 1);

    // Atualizar métricas por usuário
    if (errorRecord.userId) {
      const userCount = this.metrics.errorsByUser.get(errorRecord.userId) || 0;
      this.metrics.errorsByUser.set(errorRecord.userId, userCount + 1);
    }

    // Verificar se devemos gerar alerta
    this.checkAlertThreshold(errorRecord);

    // Enviar para serviço externo (Sentry, etc.)
    this.sendToExternalService(errorRecord);

    // Log local
    console.error('Error recorded:', errorRecord);

    return errorId;
  }

  /**
   * Marca erro como resolvido
   */
  resolveError(errorId) {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = Date.now();
    }
  }

  /**
   * Gera ID único para o erro
   */
  generateErrorId(error) {
    const errorString = `${error.name || 'Unknown'}:${error.message || error.toString()}`;
    const hash = this.simpleHash(errorString + (error.stack || ''));
    return `err_${Date.now()}_${hash}`;
  }

  /**
   * Hash simples para gerar ID único
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Verifica se devemos gerar alerta baseado no threshold
   */
  checkAlertThreshold(errorRecord) {
    const now = Date.now();
    const windowStart = now - this.timeWindow;

    // Contar erros no período
    let recentErrors = 0;
    for (const [id, error] of this.errors.entries()) {
      if (error.timestamp >= windowStart && !error.resolved) {
        recentErrors++;
      }
    }

    if (recentErrors >= this.errorThreshold) {
      this.generateAlert('error_threshold_exceeded', {
        errorCount: recentErrors,
        threshold: this.errorThreshold,
        timeWindow: this.timeWindow,
        recentErrors: Array.from(this.errors.values())
          .filter(e => e.timestamp >= windowStart && !e.resolved)
          .slice(-5), // Últimos 5 erros
      });
    }

    // Alertas por tipo de erro
    const typeCount = this.metrics.errorsByType.get(errorRecord.type) || 0;
    if (typeCount >= 5) {
      this.generateAlert('error_type_spike', {
        errorType: errorRecord.type,
        count: typeCount,
      });
    }
  }

  /**
   * Gera alerta interno
   */
  generateAlert(type, data) {
    const alert = {
      id: `alert_${Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Enviar notificação para administradores
    if (ENABLE_ALERT_NOTIFICATIONS) {
      this.sendAlertNotification(alert);
    }

    // Log do alerta
    console.warn('Alert generated:', alert);
  }

  /**
   * Envia alerta para administradores
   */
  async sendAlertNotification(alert) {
    try {
      // Enviar para serviço de notificações interno (habilitado por flag)
      if (!ENABLE_ALERT_NOTIFICATIONS) return;
      await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'system_alert',
          title: `Alerta: ${alert.type}`,
          message: `Erro crítico detectado no sistema`,
          data: alert,
          priority: 'high',
        }),
      });
    } catch (error) {
      console.error('Failed to send alert notification:', error);
    }
  }

  /**
   * Envia erro para serviço externo (Sentry, etc.)
   */
  async sendToExternalService(errorRecord) {
    try {
      // Enviar para Sentry se configurado
      if (window.Sentry) {
        window.Sentry.captureException(new Error(errorRecord.message), {
          tags: {
            errorId: errorRecord.id,
            type: errorRecord.type,
            userId: errorRecord.userId,
          },
          contexts: {
            error_context: errorRecord.context,
            user: {
              id: errorRecord.userId,
            },
          },
        });
      }

      // Enviar métricas para serviço de analytics
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: errorRecord.message,
          fatal: false,
        });
      }
    } catch (error) {
      console.error('Failed to send to external service:', error);
    }
  }

  /**
   * Obtém métricas de erro
   */
  getMetrics() {
    const now = Date.now();
    const windowStart = now - this.timeWindow;

    const recentErrors = Array.from(this.errors.values())
      .filter(e => e.timestamp >= windowStart);

    const errorsByHour = this.groupErrorsByHour(recentErrors);
    const topErrors = this.getTopErrors(5);

    return {
      ...this.metrics,
      recentErrors: recentErrors.length,
      errorRate: this.calculateErrorRate(),
      errorsByHour,
      topErrors,
      alerts: this.alerts.filter(a => !a.acknowledged),
      timestamp: now,
    };
  }

  /**
   * Calcula taxa de erro por minuto
   */
  calculateErrorRate() {
    const now = Date.now();
    const windowStart = now - this.timeWindow;

    const errorsInWindow = Array.from(this.errors.values())
      .filter(e => e.timestamp >= windowStart).length;

    const minutes = this.timeWindow / 60000;
    return (errorsInWindow / minutes).toFixed(2);
  }

  /**
   * Agrupa erros por hora
   */
  groupErrorsByHour(errors) {
    const hours = {};

    errors.forEach(error => {
      const hour = new Date(error.timestamp).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });

    return hours;
  }

  /**
   * Obtém erros mais frequentes
   */
  getTopErrors(limit = 5) {
    const errorCounts = new Map();

    this.errors.forEach(error => {
      const key = `${error.type}:${error.message}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });

    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => ({ key, count }));
  }

  /**
   * Limpa erros antigos (mais de 24h)
   */
  cleanupOldErrors() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 horas

    for (const [id, error] of this.errors.entries()) {
      if (error.timestamp < cutoff) {
        this.errors.delete(id);
      }
    }

    // Limpar alertas antigos
    this.alerts = this.alerts.filter(alert =>
      alert.timestamp > cutoff
    );
  }
}

/**
 * Hook para usar monitoramento de erros em componentes
 */
export const useErrorMonitoring = () => {
  const monitor = React.useRef(new ErrorMonitor());

  React.useEffect(() => {
    // Monitorar erros não tratados
    const handleUnhandledError = (event) => {
      monitor.current.recordError(event.error || event.reason, {
        type: 'unhandled',
        url: window.location.href,
      }, []); // TODO: Add dependencies
    };

    const handleUnhandledRejection = (event) => {
      monitor.current.recordError(event.reason, {
        type: 'unhandled_promise_rejection',
        url: window.location.href,
      });
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup periódica
    const cleanupInterval = setInterval(() => {
      monitor.current.cleanupOldErrors();
    }, 60 * 60 * 1000); // A cada hora

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      clearInterval(cleanupInterval);
    };
  }, []);

  const recordError = React.useCallback((error, context = {}) => {
    return monitor.current.recordError(error, context);
  }, []);

  const getMetrics = React.useCallback(() => {
    return monitor.current.getMetrics();
  }, []);

  const resolveError = React.useCallback((errorId) => {
    monitor.current.resolveError(errorId);
  }, []);

  return {
    recordError,
    getMetrics,
    resolveError,
  };
};

/**
 * Componente para exibir métricas de erro
 */
export const ErrorMetricsDashboard = ({ className = '' }) => {
  const { getMetrics } = useErrorMonitoring();
  const [metrics, setMetrics] = React.useState(null);

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(getMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Atualizar a cada 30s

    return () => clearInterval(interval);
  }, [getMetrics]);

  if (!metrics) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {metrics.totalErrors}
          </div>
          <div className="text-sm text-red-600">Total de Erros</div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {metrics.recentErrors}
          </div>
          <div className="text-sm text-yellow-600">Últimas 5min</div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {metrics.errorRate}
          </div>
          <div className="text-sm text-blue-600">Erros/min</div>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {metrics.alerts.length}
          </div>
          <div className="text-sm text-green-600">Alertas</div>
        </div>
      </div>

      {metrics.topErrors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Erros Mais Frequentes</h4>
          <div className="space-y-1">
            {metrics.topErrors.map((error, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm truncate flex-1 mr-2">
                  {error.key.split(':').slice(-1)[0]}
                </span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-300">
                  {error.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Middleware para capturar erros de API
 */
export const apiErrorMiddleware = (error, context = {}) => {
  const monitor = new ErrorMonitor();

  monitor.recordError(error, {
    type: 'api_error',
    ...context,
    timestamp: Date.now(),
  });

  return error;
};

/**
 * Instância global do monitor de erros
 */
export const errorMonitor = new ErrorMonitor();

// Inicializar monitoramento global
if (typeof window !== 'undefined') {
  // Monitorar erros não tratados
  window.addEventListener('error', (event) => {
    errorMonitor.recordError(event.error || event.message, {
      type: 'global_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorMonitor.recordError(event.reason, {
      type: 'unhandled_promise_rejection',
    });
  });
}

export default errorMonitor;
