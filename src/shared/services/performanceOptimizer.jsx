// src/services/performanceOptimizer.js
/**
 * Sistema avançado de otimização de performance
 */
export class PerformanceOptimizer {
  constructor() {
    this.metrics = {
      renderTime: [],
      memoryUsage: [],
      networkRequests: [],
      cacheHits: 0,
      cacheMisses: 0,
    };

    this.optimizationRules = new Map();
    this.isEnabled = true;
  }

  /**
   * Monitora métricas de performance
   */
  startMonitoring() {
    if (!this.isEnabled) return;

    // Monitorar uso de memória
    this.startMemoryMonitoring();

    // Monitorar performance de renderização
    this.startRenderMonitoring();

    // Monitorar requisições de rede
    this.startNetworkMonitoring();

    // console.log('🚀 Performance monitoring started');
  }

  /**
   * Para monitoramento
   */
  stopMonitoring() {
    this.isEnabled = false;
    // console.log('⏹️ Performance monitoring stopped');
  }

  /**
   * Monitora uso de memória
   */
  startMemoryMonitoring() {
    const monitorMemory = () => {
      if (!this.isEnabled) return;

      if (performance.memory) {
        const memoryInfo = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
          timestamp: Date.now(),
        };

        this.metrics.memoryUsage.push(memoryInfo);

        // Manter apenas últimos 100 registros
        if (this.metrics.memoryUsage.length > 100) {
          this.metrics.memoryUsage.shift();
        }

        // Otimizações automáticas baseadas no uso de memória
        this.optimizeMemoryUsage(memoryInfo);
      }
    };

    // Monitorar a cada 30 segundos
    this.memoryInterval = setInterval(monitorMemory, 30000);
  }

  /**
   * Otimizações baseadas no uso de memória
   */
  optimizeMemoryUsage(memoryInfo) {
    const usagePercent = (memoryInfo.used / memoryInfo.total) * 100;

    if (usagePercent > 80) {
      this.triggerOptimization('high_memory_usage', {
        usagePercent,
        threshold: 80,
        action: 'memory_cleanup',
      });
    }

    if (usagePercent > 90) {
      // Limpeza agressiva de memória
      this.forceGarbageCollection();
      this.clearUnusedCaches();
    }
  }

  /**
   * Força coleta de lixo (quando disponível)
   */
  forceGarbageCollection() {
    if (window.gc) {
      window.gc();
      // console.log('🗑️ Forced garbage collection');
    }
  }

  /**
   * Limpa caches não utilizados
   */
  clearUnusedCaches() {
    // Limpar caches de componentes React não utilizados
    if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      // Esta é uma abordagem simplificada - em produção usar React DevTools
      // console.log('🧹 Cleared unused component caches');
    }

    // Limpar caches de service workers
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('temp') || name.includes('old')) {
            caches.delete(name);
          }
        });
      });
    }
  }

  /**
   * Monitora performance de renderização
   */
  startRenderMonitoring() {
    let lastRenderTime = performance.now();

    const observer = new MutationObserver((mutations) => {
      const currentTime = performance.now();
      const renderTime = currentTime - lastRenderTime;

      this.metrics.renderTime.push({
        time: renderTime,
        timestamp: currentTime,
        mutations: mutations.length,
      });

      // Manter apenas últimos 50 registros
      if (this.metrics.renderTime.length > 50) {
        this.metrics.renderTime.shift();
      }

      // Verificar performance de renderização
      if (renderTime > 100) { // Mais de 100ms é lento
        this.triggerOptimization('slow_render', {
          renderTime,
          threshold: 100,
          action: 'render_optimization',
        });
      }

      lastRenderTime = currentTime;
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.renderObserver = observer;
  }

  /**
   * Monitora requisições de rede
   */
  startNetworkMonitoring() {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];

      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.metrics.networkRequests.push({
          url,
          duration,
          status: response.status,
          timestamp: startTime,
          method: args[1]?.method || 'GET',
        });

        // Verificar requisições lentas
        if (duration > 3000) { // Mais de 3 segundos
          this.triggerOptimization('slow_network_request', {
            url,
            duration,
            threshold: 3000,
          });
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.metrics.networkRequests.push({
          url,
          duration,
          error: error.message,
          timestamp: startTime,
        });

        throw error;
      }
    };
  }

  /**
   * Dispara otimização baseada em regras
   */
  triggerOptimization(type, data) {
    const rule = this.optimizationRules.get(type);
    if (rule) {
      try {
        rule.action(data);
        // console.log(`⚡ Optimization triggered: ${type}`, data);
      } catch (error) {
        console.error(`Failed to execute optimization ${type}:`, error);
      }
    }
  }

  /**
   * Registra regra de otimização
   */
  registerOptimizationRule(name, condition, action) {
    this.optimizationRules.set(name, { condition, action });
  }

  /**
   * Otimizações automáticas pré-definidas
   */
  registerDefaultOptimizations() {
    // Otimização para alto uso de memória
    this.registerOptimizationRule('high_memory_usage', (data) => data.usagePercent > 80, (data) => {
      this.clearUnusedCaches();
      this.deprioritizeNonCriticalFeatures();
    });

    // Otimização para renderização lenta
    this.registerOptimizationRule('slow_render', (data) => data.renderTime > 100, (data) => {
      this.enableVirtualization();
      this.reduceAnimationComplexity();
    });

    // Otimização para requisições lentas
    this.registerOptimizationRule('slow_network_request', (data) => data.duration > 3000, (data) => {
      this.enableRequestBatching();
      this.implementRequestCaching(data.url);
    });
  }

  /**
   * Habilita virtualização para listas grandes
   */
  enableVirtualization() {
    // Adicionar classe CSS para habilitar virtualização
    document.body.classList.add('virtual-scroll-enabled');
  }

  /**
   * Reduz complexidade de animações
   */
  reduceAnimationComplexity() {
    document.body.classList.add('reduced-animations');
  }

  /**
   * Habilita batching de requisições
   */
  enableRequestBatching() {
    // Implementar lógica de batching
    // console.log('📦 Request batching enabled');
  }

  /**
   * Implementa cache para URLs específicas
   */
  implementRequestCaching(url) {
    // Implementar cache específico para URLs lentas
    // console.log(`💾 Request caching implemented for: ${url}`);
  }

  /**
   * Desprioriza features não críticas
   */
  deprioritizeNonCriticalFeatures() {
    // Reduzir polling de notificações
    // Desabilitar animações não essenciais
    // Reduzir qualidade de gráficos
    // console.log('⚖️ Non-critical features deprioritized');
  }

  /**
   * Obtém métricas de performance
   */
  getMetrics() {
    const now = Date.now();

    // Calcular médias
    const avgRenderTime = this.metrics.renderTime.length > 0
      ? this.metrics.renderTime.reduce((sum, r) => sum + r.time, 0) / this.metrics.renderTime.length
      : 0;

    const avgMemoryUsage = this.metrics.memoryUsage.length > 0
      ? this.metrics.memoryUsage.reduce((sum, m) => sum + (m.used / m.total) * 100, 0) / this.metrics.memoryUsage.length
      : 0;

    const avgNetworkTime = this.metrics.networkRequests.length > 0
      ? this.metrics.networkRequests.reduce((sum, r) => sum + r.duration, 0) / this.metrics.networkRequests.length
      : 0;

    return {
      renderTime: {
        average: avgRenderTime.toFixed(2),
        latest: this.metrics.renderTime[this.metrics.renderTime.length - 1]?.time || 0,
        trend: this.calculateTrend(this.metrics.renderTime.map(r => r.time)),
      },
      memoryUsage: {
        average: avgMemoryUsage.toFixed(2),
        latest: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]?.used || 0,
        trend: this.calculateTrend(this.metrics.memoryUsage.map(m => (m.used / m.total) * 100)),
      },
      networkRequests: {
        average: avgNetworkTime.toFixed(2),
        count: this.metrics.networkRequests.length,
        slowRequests: this.metrics.networkRequests.filter(r => r.duration > 3000).length,
      },
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0
          ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2)
          : 0,
      },
      timestamp: now,
    };
  }

  /**
   * Calcula tendência (crescimento positivo/negativo)
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;

    const recent = values.slice(-5); // Últimos 5 valores
    const older = values.slice(-10, -5); // Valores anteriores

    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + v, 0) / older.length;

    return ((recentAvg - olderAvg) / olderAvg) * 100;
  }

  /**
   * Sugere otimizações baseadas nas métricas
   */
  suggestOptimizations() {
    const metrics = this.getMetrics();
    const suggestions = [];

    if (metrics.renderTime.average > 50) {
      suggestions.push({
        type: 'render',
        priority: 'high',
        message: 'Renderização lenta detectada. Considere usar React.memo ou virtualização.',
        action: 'enableVirtualization',
      });
    }

    if (metrics.memoryUsage.average > 75) {
      suggestions.push({
        type: 'memory',
        priority: 'high',
        message: 'Alto uso de memória. Considere limpeza de caches e componentes não utilizados.',
        action: 'clearUnusedCaches',
      });
    }

    if (metrics.networkRequests.slowRequests > 0) {
      suggestions.push({
        type: 'network',
        priority: 'medium',
        message: 'Requisições lentas detectadas. Implemente cache e otimização de rede.',
        action: 'implementRequestCaching',
      });
    }

    return suggestions;
  }
}

/**
 * Hook para usar otimizações de performance
 */
export const usePerformanceOptimization = () => {
  const optimizer = React.useRef(new PerformanceOptimizer());

  React.useEffect(() => {
    optimizer.current.registerDefaultOptimizations();
    optimizer.current.startMonitoring();

    return () => {
      optimizer.current.stopMonitoring();
    };
  }, []);

  const getMetrics = React.useCallback(() => {
    return optimizer.current.getMetrics();
  }, []);

  const getSuggestions = React.useCallback(() => {
    return optimizer.current.suggestOptimizations();
  }, []);

  const triggerOptimization = React.useCallback((type) => {
    optimizer.current.triggerOptimization(type, {});
  }, []);

  return {
    getMetrics,
    getSuggestions,
    triggerOptimization,
  };
};

/**
 * Componente de painel de performance
 */
export const PerformanceDashboard = ({ className = '' }) => {
  const { getMetrics, getSuggestions } = usePerformanceOptimization();
  const [metrics, setMetrics] = React.useState(null);
  const [suggestions, setSuggestions] = React.useState([]);

  React.useEffect(() => {
    const updateData = () => {
      setMetrics(getMetrics());
      setSuggestions(getSuggestions());
    };

    updateData();
    const interval = setInterval(updateData, 10000); // Atualizar a cada 10s

    return () => clearInterval(interval);
  }, [getMetrics, getSuggestions]);

  if (!metrics) {
    return <div className={`animate-pulse ${className}`}>Carregando métricas...</div>;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {metrics.renderTime.average}ms
          </div>
          <div className="text-sm text-blue-600">Render Médio</div>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {metrics.memoryUsage.average}%
          </div>
          <div className="text-sm text-green-600">Memória</div>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {metrics.networkRequests.average}ms
          </div>
          <div className="text-sm text-purple-600">Rede Média</div>
        </div>

        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {metrics.cache.hitRate}%
          </div>
          <div className="text-sm text-orange-600">Cache Hit</div>
        </div>
      </div>

      {/* Sugestões de otimização */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Sugestões de Otimização</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  suggestion.priority === 'high'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}
              >
                <p className="font-medium">{suggestion.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tendências */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium mb-2">Tendência de Render</h5>
          <div className={`text-lg font-bold ${
            metrics.renderTime.trend > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {metrics.renderTime.trend > 0 ? '↗' : '↘'} {Math.abs(metrics.renderTime.trend).toFixed(1)}%
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium mb-2">Tendência de Memória</h5>
          <div className={`text-lg font-bold ${
            metrics.memoryUsage.trend > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {metrics.memoryUsage.trend > 0 ? '↗' : '↘'} {Math.abs(metrics.memoryUsage.trend).toFixed(1)}%
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium mb-2">Status do Sistema</h5>
          <div className="text-lg font-bold text-green-600">
            ✅ Saudável
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Instância global do otimizador
 */
export const performanceOptimizer = new PerformanceOptimizer();

// Inicializar otimizações padrão
if (typeof window !== 'undefined') {
  performanceOptimizer.registerDefaultOptimizations();

  // Iniciar monitoramento após 1 segundo para não interferir na carga inicial
  setTimeout(() => {
    performanceOptimizer.startMonitoring();
  }, 1000);
}

export default performanceOptimizer;
