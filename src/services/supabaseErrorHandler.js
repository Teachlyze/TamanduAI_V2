// src/services/supabaseErrorHandler.js
/**
 * Tratador avançado de erros do Supabase com classificação e recuperação
 */
import { errorMonitor } from './errorMonitoring.jsx';

export class SupabaseErrorHandler {
  constructor() {
    this.errorPatterns = new Map();
    this.recoveryStrategies = new Map();
    this.initializeErrorPatterns();
    this.initializeRecoveryStrategies();
  }

  /**
   * Inicializa padrões de erro conhecidos
   */
  initializeErrorPatterns() {
    this.errorPatterns.set('auth_error', {
      patterns: [
        'JWT expired',
        'invalid_grant',
        'Invalid login credentials',
        'Email not confirmed',
        'User not found',
        'Password should be at least',
      ],
      category: 'authentication',
      severity: 'high',
      userMessage: 'Problema de autenticação. Faça login novamente.',
    });

    this.errorPatterns.set('network_error', {
      patterns: [
        'NetworkError',
        'Failed to fetch',
        'ERR_NETWORK',
        'ECONNREFUSED',
        'ENOTFOUND',
        'timeout',
        'Connection timeout',
      ],
      category: 'network',
      severity: 'medium',
      userMessage: 'Problema de conexão. Verifique sua internet.',
    });

    this.errorPatterns.set('rate_limit', {
      patterns: [
        'rate limit',
        'too many requests',
        '429',
        'quota exceeded',
      ],
      category: 'rate_limiting',
      severity: 'medium',
      userMessage: 'Muitas tentativas. Aguarde um momento.',
    });

    this.errorPatterns.set('database_error', {
      patterns: [
        'relation .* does not exist',
        'column .* does not exist',
        'violates foreign key constraint',
        'violates unique constraint',
        'violates check constraint',
        'deadlock detected',
      ],
      category: 'database',
      severity: 'high',
      userMessage: 'Erro interno. Tente novamente.',
    });

    this.errorPatterns.set('permission_error', {
      patterns: [
        'permission denied',
        'access denied',
        'forbidden',
        'unauthorized',
        '403',
        'insufficient privileges',
        'RLS policy',
      ],
      category: 'permissions',
      severity: 'medium',
      userMessage: 'Você não tem permissão para esta ação.',
    });

    this.errorPatterns.set('data_validation', {
      patterns: [
        'invalid input syntax',
        'value too long',
        'violates not-null constraint',
        'invalid format',
        'malformed',
      ],
      category: 'validation',
      severity: 'low',
      userMessage: 'Dados inválidos. Verifique os campos.',
    });
  }

  /**
   * Inicializa estratégias de recuperação
   */
  initializeRecoveryStrategies() {
    this.recoveryStrategies.set('network_error', {
      strategy: 'retry_with_backoff',
      maxRetries: 3,
      baseDelay: 1000,
    });

    this.recoveryStrategies.set('auth_error', {
      strategy: 'token_refresh',
      fallback: 're_authenticate',
    });

    this.recoveryStrategies.set('rate_limit', {
      strategy: 'wait_and_retry',
      waitTime: 60000, // 1 minuto
    });

    this.recoveryStrategies.set('database_error', {
      strategy: 'retry_once',
      maxRetries: 1,
    });

    this.recoveryStrategies.set('permission_error', {
      strategy: 'no_retry',
      action: 'show_permission_error',
    });
  }

  /**
   * Classifica erro baseado em padrões
   */
  classifyError(error) {
    const errorMessage = (error.message || error.toString()).toLowerCase();
    const errorCode = error.code || '';
    const statusCode = error.status || error.statusCode;

    // Verificar por código de status primeiro
    if (statusCode === 401) {
      return this.errorPatterns.get('auth_error');
    }

    if (statusCode === 429) {
      return this.errorPatterns.get('rate_limit');
    }

    if (statusCode >= 500) {
      return this.errorPatterns.get('database_error');
    }

    if (statusCode === 403) {
      return this.errorPatterns.get('permission_error');
    }

    // Verificar por padrões de texto
    for (const [key, pattern] of this.errorPatterns.entries()) {
      const matches = pattern.patterns.some(p =>
        errorMessage.includes(p.toLowerCase()) || errorCode.includes(p)
      );

      if (matches) {
        return pattern;
      }
    }

    // Erro não classificado
    return {
      category: 'unknown',
      severity: 'medium',
      userMessage: 'Ocorreu um erro inesperado. Tente novamente.',
    };
  }

  /**
   * Trata erro e aplica estratégia de recuperação
   */
  async handleError(error, context = {}) {
    const classification = this.classifyError(error);
    const strategy = this.recoveryStrategies.get(classification.category);

    // Registrar erro
    errorMonitor.recordError(error, {
      ...context,
      category: classification.category,
      severity: classification.severity,
      classification,
    });

    // Aplicar estratégia de recuperação
    if (strategy) {
      return await this.applyRecoveryStrategy(error, classification, strategy, context);
    }

    // Sem estratégia específica - retornar erro tratado
    return this.createUserFriendlyError(error, classification);
  }

  /**
   * Aplica estratégia de recuperação
   */
  async applyRecoveryStrategy(error, classification, strategy, context) {
    switch (strategy.strategy) {
      case 'retry_with_backoff':
        return await this.retryWithBackoff(error, strategy, context);

      case 'token_refresh':
        return await this.refreshToken(error, strategy, context);

      case 'wait_and_retry':
        return await this.waitAndRetry(error, strategy, context);

      case 'retry_once':
        return await this.retryOnce(error, strategy, context);

      case 'no_retry':
        return this.createUserFriendlyError(error, classification);

      default:
        return this.createUserFriendlyError(error, classification);
    }
  }

  /**
   * Estratégia de retry com backoff exponencial
   */
  async retryWithBackoff(error, strategy, context) {
    let attempt = 0;
    const maxRetries = strategy.maxRetries || 3;

    while (attempt < maxRetries) {
      try {
        // Aguardar com jitter
        const delay = strategy.baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await this.delay(delay);

        // Tentar novamente a operação original
        if (context.retryFunction) {
          const result = await context.retryFunction();
          return { success: true, result };
        }

        return { success: true, message: 'Operação recuperada' };

      } catch (retryError) {
        attempt++;

        if (attempt >= maxRetries) {
          return this.createUserFriendlyError(error, classification);
        }

        // Log de tentativa de retry
        errorMonitor.recordError(retryError, {
          ...context,
          retryAttempt: attempt,
          maxRetries,
        });
      }
    }
  }

  /**
   * Estratégia de refresh de token
   */
  async refreshToken(error, strategy, context) {
    try {
      // Tentar refresh do token
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { data, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        throw refreshError;
      }

      if (data.session) {
        // Token renovado - tentar operação novamente
        if (context.retryFunction) {
          const result = await context.retryFunction();
          return { success: true, result, tokenRefreshed: true };
        }

        return { success: true, tokenRefreshed: true };
      }

      throw new Error('Falha ao renovar token');

    } catch (refreshError) {
      // Fallback para re-autenticação
      if (strategy.fallback === 're_authenticate') {
        return this.createUserFriendlyError(error, {
          ...classification,
          requiresReauth: true,
        });
      }

      return this.createUserFriendlyError(error, classification);
    }
  }

  /**
   * Estratégia de aguardar e tentar novamente
   */
  async waitAndRetry(error, strategy, context) {
    try {
      await this.delay(strategy.waitTime || 60000);

      if (context.retryFunction) {
        const result = await context.retryFunction();
        return { success: true, result };
      }

      return { success: true };

    } catch (retryError) {
      return this.createUserFriendlyError(error, classification);
    }
  }

  /**
   * Estratégia de retry único
   */
  async retryOnce(error, strategy, context) {
    try {
      if (context.retryFunction) {
        const result = await context.retryFunction();
        return { success: true, result };
      }

      return { success: true };

    } catch (retryError) {
      return this.createUserFriendlyError(error, classification);
    }
  }

  /**
   * Cria erro amigável para o usuário
   */
  createUserFriendlyError(originalError, classification) {
    return {
      success: false,
      error: originalError,
      userMessage: classification.userMessage,
      category: classification.category,
      severity: classification.severity,
      requiresReauth: classification.category === 'auth_error',
      canRetry: ['network_error', 'database_error'].includes(classification.category),
    };
  }

  /**
   * Delay utilitário
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Middleware para operações Supabase
   */
  async withErrorHandling(operation, context = {}) {
    try {
      const result = await operation();
      return { success: true, result };

    } catch (error) {
      return await this.handleError(error, {
        ...context,
        operation: operation.toString(),
      });
    }
  }

  /**
   * Hook para usar tratamento de erros em componentes React
   */
  useErrorHandler() {
    const [lastError, setLastError] = React.useState(null);

    const handleError = React.useCallback(async (error, context = {}) => {
      const result = await this.handleError(error, context);
      setLastError(result);
      return result;
    }, []);

    const clearError = React.useCallback(() => {
      setLastError(null);
    }, []);

    return {
      handleError,
      lastError,
      clearError,
      hasError: !!lastError,
    };
  }
}

// Instância singleton
export const supabaseErrorHandler = new SupabaseErrorHandler();

// Hook React para tratamento de erros
export const useSupabaseErrorHandler = () => {
  return supabaseErrorHandler.useErrorHandler();
};

export default supabaseErrorHandler;
