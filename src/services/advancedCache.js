// src/services/advancedCache.js
/**
 * Sistema avançado de cache multi-nível para produção
 */
export class AdvancedCache {
  constructor() {
    this.memoryCache = new Map();
    this.redisClient = null;
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0,
    };
  }

  /**
   * Inicializa cliente Redis
   */
  async initializeRedis() {
    try {
      const Redis = await import('ioredis');
      this.redisClient = new Redis.default({
        host: import.meta.env.VITE_UPSTASH_REDIS_REST_URL?.split('@')[1]?.split(':')[0] || 'localhost',
        port: import.meta.env.VITE_UPSTASH_REDIS_REST_PORT || 6379,
        password: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redisClient.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.cacheStats.errors++;
      });

      console.log('✅ Redis cache initialized');
    } catch (error) {
      console.warn('⚠️ Redis not available, using memory cache only:', error.message);
    }
  }

  /**
   * Define valor no cache com estratégia inteligente
   */
  async set(key, value, options = {}) {
    const {
      ttl = 300, // 5 minutos padrão
      tags = [], // Para invalidação por tags
      compression = false, // Compressão automática
      level = 'memory' // memory, redis, both
    } = options;

    try {
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        ttl,
        tags,
        compressed: compression,
      });

      // Cache na memória sempre
      if (level === 'memory' || level === 'both') {
        this.memoryCache.set(key, serializedValue);
      }

      // Cache no Redis se disponível
      if ((level === 'redis' || level === 'both') && this.redisClient) {
        await this.redisClient.setex(key, ttl, serializedValue);

        // Adicionar tags para invalidação
        if (tags.length > 0) {
          const tagKey = `tag:${key}`;
          await this.redisClient.setex(tagKey, ttl, JSON.stringify(tags));
        }
      }

      this.cacheStats.sets++;
    } catch (error) {
      console.error('Cache set error:', error);
      this.cacheStats.errors++;
    }
  }

  /**
   * Obtém valor do cache
   */
  async get(key) {
    try {
      let value = null;
      let source = null;

      // Tentar memória primeiro (mais rápido)
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue) {
        const parsed = JSON.parse(memoryValue);
        if (this.isValid(parsed)) {
          value = parsed.data;
          source = 'memory';
          this.cacheStats.hits++;
        } else {
          this.memoryCache.delete(key);
        }
      }

      // Tentar Redis se não encontrado na memória
      if (!value && this.redisClient) {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue);
          if (this.isValid(parsed)) {
            value = parsed.data;
            source = 'redis';
            this.cacheStats.hits++;

            // Atualizar cache na memória para próximas consultas
            this.memoryCache.set(key, redisValue);
          } else {
            await this.redisClient.del(key);
          }
        }
      }

      if (!value) {
        this.cacheStats.misses++;
      }

      return { value, source };
    } catch (error) {
      console.error('Cache get error:', error);
      this.cacheStats.errors++;
      return { value: null, source: null };
    }
  }

  /**
   * Remove item do cache
   */
  async delete(key) {
    try {
      this.memoryCache.delete(key);

      if (this.redisClient) {
        await this.redisClient.del(key);
        await this.redisClient.del(`tag:${key}`);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
      this.cacheStats.errors++;
    }
  }

  /**
   * Invalida cache por tags
   */
  async invalidateByTags(tags) {
    try {
      if (!this.redisClient) return;

      const pattern = `tag:*`;
      const keys = await this.redisClient.keys(pattern);

      for (const key of keys) {
        const tagData = await this.redisClient.get(key);
        if (tagData) {
          const keyTags = JSON.parse(tagData);
          const hasMatchingTag = tags.some(tag => keyTags.includes(tag));

          if (hasMatchingTag) {
            const actualKey = key.replace('tag:', '');
            await this.redisClient.del(actualKey);
            await this.redisClient.del(key);
            this.memoryCache.delete(actualKey);
          }
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
      this.cacheStats.errors++;
    }
  }

  /**
   * Limpa todo o cache
   */
  async clear() {
    try {
      this.memoryCache.clear();

      if (this.redisClient) {
        await this.redisClient.flushdb();
      }
    } catch (error) {
      console.error('Cache clear error:', error);
      this.cacheStats.errors++;
    }
  }

  /**
   * Verifica se o item do cache é válido
   */
  isValid(parsedValue) {
    if (!parsedValue || !parsedValue.timestamp || !parsedValue.ttl) {
      return false;
    }

    const now = Date.now();
    const expirationTime = parsedValue.timestamp + (parsedValue.ttl * 1000);

    return now < expirationTime;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? (this.cacheStats.hits / totalRequests) * 100 : 0;

    return {
      ...this.cacheStats,
      totalRequests,
      hitRate: `${hitRate.toFixed(2)}%`,
      memorySize: this.memoryCache.size,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cache inteligente com invalidação automática
   */
  async smartGet(key, fetcher, options = {}) {
    const { value } = await this.get(key);

    if (value !== null) {
      return value;
    }

    try {
      const freshValue = await fetcher();

      await this.set(key, freshValue, {
        ...options,
        tags: options.tags || [],
      });

      return freshValue;
    } catch (error) {
      console.error('Smart cache fetch error:', error);
      throw error;
    }
  }
}

/**
 * Estratégias de cache pré-definidas
 */
export const cacheStrategies = {
  // Cache de curto prazo (dados voláteis)
  short: { ttl: 60, level: 'memory' },

  // Cache médio (dados semi-estáticos)
  medium: { ttl: 300, level: 'both', tags: [] },

  // Cache longo (dados estáticos)
  long: { ttl: 3600, level: 'both', compression: true },

  // Cache de sessão (válido até logout)
  session: { ttl: 1800, level: 'memory' },

  // Cache permanente (dados imutáveis)
  permanent: { ttl: 86400, level: 'both', compression: true },
};

/**
 * Decorador para cache automático
 */
export const withCache = (keyGenerator, options = cacheStrategies.medium) => {
  return (target, propertyName, descriptor) => {
    const method = descriptor.value;

    descriptor.value = async function (...args) {
      const cacheKey = typeof keyGenerator === 'function'
        ? keyGenerator(...args)
        : `${target.constructor.name}_${propertyName}_${keyGenerator}`;

      const cache = this.cache || new AdvancedCache();

      return cache.smartGet(cacheKey, () => method.apply(this, args), options);
    };

    return descriptor;
  };
};

/**
 * Instância global do cache avançado
 */
export const advancedCache = new AdvancedCache();

// Inicializar Redis automaticamente
if (typeof window !== 'undefined') {
  advancedCache.initializeRedis();
}

export default advancedCache;
