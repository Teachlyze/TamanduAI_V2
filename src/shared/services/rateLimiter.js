import { Redis } from '@upstash/redis';

/**
 * Rate Limiter usando Upstash Redis
 * Implementa sliding window para controle preciso de rate limits
 */

// Configurar Upstash Redis
const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Configurações de rate limit por recurso
 */
export const RATE_LIMITS = {
  // Chatbot
  CHATBOT_FREE: {
    max: 10,
    window: 24 * 60 * 60, // 24 horas
    message: 'Limite de 10 mensagens/dia atingido (Plano Free)',
  },
  CHATBOT_BASIC: {
    max: 50,
    window: 24 * 60 * 60,
    message: 'Limite de 50 mensagens/dia atingido (Plano Basic)',
  },
  CHATBOT_PRO: {
    max: 200,
    window: 24 * 60 * 60,
    message: 'Limite de 200 mensagens/dia atingido (Plano Pro)',
  },
  CHATBOT_ENTERPRISE: {
    max: 10000,
    window: 24 * 60 * 60,
    message: 'Sem limite (Enterprise)',
  },

  // Antiplágio
  PLAGIARISM_CHECK: {
    max: 100,
    window: 60 * 60, // 1 hora
    message: 'Limite de 100 verificações/hora atingido',
  },

  // APIs gerais
  API_GENERAL: {
    max: 1000,
    window: 60 * 60, // 1 hora
    message: 'Limite de 1000 requisições/hora atingido',
  },

  // Upload de arquivos
  FILE_UPLOAD: {
    max: 50,
    window: 60 * 60, // 1 hora
    message: 'Limite de 50 uploads/hora atingido',
  },

  // Criação de turmas
  CREATE_CLASS: {
    max: 10,
    window: 24 * 60 * 60, // 24 horas
    message: 'Limite de 10 turmas criadas/dia atingido',
  },

  // Envio de convites
  SEND_INVITATION: {
    max: 50,
    window: 60 * 60, // 1 hora
    message: 'Limite de 50 convites/hora atingido',
  },

  // Submissões de atividades
  SUBMIT_ACTIVITY: {
    max: 100,
    window: 60 * 60, // 1 hora
    message: 'Limite de 100 submissões/hora atingido',
  },
};

/**
 * Verifica rate limit usando sliding window
 * @param {string} key - Identificador único (ex: "chatbot:user123")
 * @param {Object} limit - Configuração do limite
 * @returns {Promise<Object>} - { allowed: boolean, remaining: number, resetAt: Date }
 */
export async function checkRateLimit(key, limit) {
  const now = Date.now();
  const windowStart = now - limit.window * 1000;

  try {
    // Pipeline para operações atômicas
    const pipeline = redis.pipeline();

    // 1. Remover entradas antigas da janela
    pipeline.zremrangebyscore(key, 0, windowStart);

    // 2. Contar requests na janela atual
    pipeline.zcard(key);

    // 3. Adicionar request atual
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });

    // 4. Definir expiração
    pipeline.expire(key, limit.window);

    const results = await pipeline.exec();
    const count = results[1]; // Resultado do zcard

    const allowed = count < limit.max;
    const remaining = Math.max(0, limit.max - count - 1);
    const resetAt = new Date(now + limit.window * 1000);

    return {
      allowed,
      remaining,
      resetAt,
      limit: limit.max,
      message: allowed ? null : limit.message,
    };
  } catch (error) {
    console.error('[RateLimiter] Error checking rate limit:', error);
    // Em caso de erro, permitir a requisição (fail-open)
    return {
      allowed: true,
      remaining: limit.max,
      resetAt: new Date(now + limit.window * 1000),
      limit: limit.max,
      error: true,
    };
  }
}

/**
 * Middleware de rate limiting para chatbot
 */
export async function checkChatbotLimit(userId, userPlan = 'free') {
  const planLimits = {
    free: RATE_LIMITS.CHATBOT_FREE,
    basic: RATE_LIMITS.CHATBOT_BASIC,
    pro: RATE_LIMITS.CHATBOT_PRO,
    enterprise: RATE_LIMITS.CHATBOT_ENTERPRISE,
  };

  const limit = planLimits[userPlan] || RATE_LIMITS.CHATBOT_FREE;
  const key = `chatbot:${userId}`;

  return await checkRateLimit(key, limit);
}

/**
 * Middleware de rate limiting para antiplágio
 */
export async function checkPlagiarismLimit(userId) {
  const key = `plagiarism:${userId}`;
  return await checkRateLimit(key, RATE_LIMITS.PLAGIARISM_CHECK);
}

/**
 * Middleware de rate limiting para upload de arquivos
 */
export async function checkFileUploadLimit(userId) {
  const key = `upload:${userId}`;
  return await checkRateLimit(key, RATE_LIMITS.FILE_UPLOAD);
}

/**
 * Middleware de rate limiting para APIs gerais
 */
export async function checkAPILimit(identifier) {
  const key = `api:${identifier}`;
  return await checkRateLimit(key, RATE_LIMITS.API_GENERAL);
}

/**
 * Middleware de rate limiting para criação de turmas
 */
export async function checkCreateClassLimit(userId) {
  const key = `create_class:${userId}`;
  return await checkRateLimit(key, RATE_LIMITS.CREATE_CLASS);
}

/**
 * Middleware de rate limiting para envio de convites
 */
export async function checkInvitationLimit(userId) {
  const key = `invitation:${userId}`;
  return await checkRateLimit(key, RATE_LIMITS.SEND_INVITATION);
}

/**
 * Middleware de rate limiting para submissões
 */
export async function checkSubmissionLimit(userId) {
  const key = `submission:${userId}`;
  return await checkRateLimit(key, RATE_LIMITS.SUBMIT_ACTIVITY);
}

/**
 * Reseta rate limit de um usuário (admin only)
 */
export async function resetRateLimit(key) {
  try {
    await redis.del(key);
    return { success: true };
  } catch (error) {
    console.error('[RateLimiter] Error resetting rate limit:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtém estatísticas de rate limiting
 */
export async function getRateLimitStats(userId) {
  try {
    const keys = [
      `chatbot:${userId}`,
      `plagiarism:${userId}`,
      `upload:${userId}`,
      `api:${userId}`,
      `create_class:${userId}`,
      `invitation:${userId}`,
      `submission:${userId}`,
    ];

    const stats = {};
    const now = Date.now();

    for (const key of keys) {
      const type = key.split(':')[0];
      const count = await redis.zcard(key);
      const limit = RATE_LIMITS[type.toUpperCase()] || RATE_LIMITS.API_GENERAL;

      stats[type] = {
        used: count || 0,
        limit: limit.max,
        remaining: Math.max(0, limit.max - (count || 0)),
        percentage: ((count || 0) / limit.max) * 100,
      };
    }

    return stats;
  } catch (error) {
    console.error('[RateLimiter] Error getting stats:', error);
    return {};
  }
}

/**
 * Limpa rate limits expirados (manutenção)
 */
export async function cleanupExpiredLimits() {
  try {
    // Redis já faz isso automaticamente com EXPIRE
    // Esta função é apenas para logging
    console.log('[RateLimiter] Cleanup não necessário - Redis TTL automático');
    return { success: true };
  } catch (error) {
    console.error('[RateLimiter] Cleanup error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Incrementa contador customizado (genérico)
 */
export async function incrementCounter(key, amount = 1, ttl = 3600) {
  try {
    const newValue = await redis.incrby(key, amount);
    await redis.expire(key, ttl);
    return { success: true, value: newValue };
  } catch (error) {
    console.error('[RateLimiter] Error incrementing counter:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Hook React para verificar rate limit
 */
export function useRateLimit(type, identifier) {
  const [limit, setLimit] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const check = async () => {
    setLoading(true);
    try {
      let result;
      switch (type) {
        case 'chatbot':
          result = await checkChatbotLimit(identifier.userId, identifier.plan);
          break;
        case 'plagiarism':
          result = await checkPlagiarismLimit(identifier);
          break;
        case 'upload':
          result = await checkFileUploadLimit(identifier);
          break;
        case 'api':
          result = await checkAPILimit(identifier);
          break;
        default:
          throw new Error('Unknown rate limit type');
      }
      setLimit(result);
      return result;
    } catch (error) {
      console.error('[useRateLimit] Error:', error);
      return { allowed: true, error: true };
    } finally {
      setLoading(false);
    }
  };

  return { limit, loading, check };
}

export default {
  checkRateLimit,
  checkChatbotLimit,
  checkPlagiarismLimit,
  checkFileUploadLimit,
  checkAPILimit,
  checkCreateClassLimit,
  checkInvitationLimit,
  checkSubmissionLimit,
  resetRateLimit,
  getRateLimitStats,
  cleanupExpiredLimits,
  incrementCounter,
  RATE_LIMITS,
};
