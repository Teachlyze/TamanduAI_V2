/**
 * Redis Cache Service - Otimizado para Edge Functions
 * Usar Upstash Redis para cache de dados
 */

import { Redis } from 'https://esm.sh/@upstash/redis@1.25.1';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL') || '',
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '',
});

export interface CacheOptions {
  ttl?: number; // Time to live em segundos
  tags?: string[]; // Tags para invalidação em grupo
}

export class RedisCache {
  private defaultTTL = 300; // 5 minutos

  /**
   * Obtém dados do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;

      return typeof data === 'string' ? JSON.parse(data) : data as T;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Salva dados no cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      const serialized = JSON.stringify(value);

      // Salvar valor principal
      await redis.setex(key, ttl, serialized);

      // Salvar tags para invalidação
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          await redis.sadd(`tag:${tag}`, key);
          await redis.expire(`tag:${tag}`, ttl);
        }
      }

      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  /**
   * Deleta do cache
   */
  async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  /**
   * Invalida cache por tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = await redis.smembers(`tag:${tag}`);
      if (!keys || keys.length === 0) return 0;

      // Deletar todas as keys com essa tag
      await redis.del(...keys);
      await redis.del(`tag:${tag}`);

      return keys.length;
    } catch (error) {
      console.error('Redis INVALIDATE error:', error);
      return 0;
    }
  }

  /**
   * Pattern: Cache-Aside com função de fetch
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Tentar obter do cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Se não encontrou, buscar dados
    const data = await fetchFn();

    // Salvar no cache
    await this.set(key, data, options);

    return data;
  }

  /**
   * Incrementa contador (útil para rate limiting)
   */
  async increment(key: string, ttl: number = 60): Promise<number> {
    try {
      const value = await redis.incr(key);
      await redis.expire(key, ttl);
      return value;
    } catch (error) {
      console.error('Redis INCR error:', error);
      return 0;
    }
  }

  /**
   * Verifica se existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Define TTL
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  /**
   * Flush de padrão (cuidado!)
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (!keys || keys.length === 0) return 0;

      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Redis DELETE PATTERN error:', error);
      return 0;
    }
  }
}

/**
 * Instância singleton
 */
export const cache = new RedisCache();

/**
 * Helper: Gerar chave de cache
 */
export function generateCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

/**
 * Helper: TTLs comuns
 */
export const TTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  TEN_MINUTES: 600,
  THIRTY_MINUTES: 1800,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
};

/**
 * Helper: Invalidação de cache para professor
 */
export async function invalidateTeacherCache(teacherId: string) {
  await cache.invalidateByTag(`teacher:${teacherId}`);
}

/**
 * Helper: Invalidação de cache para turma
 */
export async function invalidateClassCache(classId: string) {
  await cache.invalidateByTag(`class:${classId}`);
}

/**
 * Helper: Invalidação de cache para atividade
 */
export async function invalidateActivityCache(activityId: string) {
  await cache.invalidateByTag(`activity:${activityId}`);
}
