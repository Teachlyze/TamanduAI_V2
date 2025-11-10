import { logger } from '@/shared/utils/logger';
/**
 * Redis Cache Service - Client wrapper para Edge Function
 * Otimiza queries pesadas com cache distribuído
 */

const REDIS_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redis-cache`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Configuração de TTL por tipo de dado
const TTL_CONFIG = {
  classStats: 300, // 5 minutos
  students: 600, // 10 minutos
  activities: 300, // 5 minutos
  materials: 900, // 15 minutos
  posts: 180, // 3 minutos
  metrics: 600, // 10 minutos
  default: 300 // 5 minutos
};

class RedisCacheService {
  constructor() {
    this.enabled = true;
  }

  /**
   * Compat: alguns pontos do app chamam invalidatePattern
   */
  async invalidatePattern(pattern) {
    return await this.deletePattern(pattern);
  }

  /**
   * Faz requisição para a edge function de cache
   */
  async request(action, params = {}) {
    if (!this.enabled) return null;

    try {
      const response = await fetch(REDIS_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action,
          ...params
        })
      });
      
      if (!response.ok) {
        // Silenciosamente falha e retorna null (aplicação continua funcionando)
        if (response.status === 500) {
          // Desabilita temporariamente para evitar múltiplas requisições falhadas
          this.enabled = false;
        }
        return null;
      }

      const data = await response.json();
      return data.success ? data.result : null;
    } catch (error) {
      // Erro de rede ou timeout - desabilita cache
      this.enabled = false;
      return null;
    }
  }

  /**
   * Buscar valor do cache
   */
  async get(key) {
    const result = await this.request('get', { key });
    
    if (result) {
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    }
    
    return null;
  }

  /**
   * Salvar valor no cache
   */
  async set(key, value, ttlSeconds = null) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const ttl = ttlSeconds || TTL_CONFIG.default;
    
    return await this.request('set', {
      key,
      value: stringValue,
      ttl
    });
  }

  /**
   * Deletar do cache
   */
  async delete(key) {
    return await this.request('del', { key });
  }

  /**
   * Deletar múltiplas chaves por pattern
   */
  async deletePattern(pattern) {
    try {
      // Buscar todas as chaves que correspondem ao pattern
      const keys = await this.request('keys', { pattern });
      
      if (keys && keys.length > 0) {
        // Deletar em batch
        const operations = keys.map(key => ({
          command: 'DEL',
          args: [key]
        }));
        
        return await this.request('batch', { operations });
      }
    } catch (error) {
      logger.warn('Error deleting pattern:', error)
    }
    
    return null;
  }

  /**
   * Wrapper genérico para cache de queries
   */
  async cacheQuery(cacheKey, queryFn, ttl = null) {
    // Tentar buscar do cache
    const cached = await this.get(cacheKey);
    
    if (cached !== null) {
      return cached;
    }
    
    // Executar query
    const result = await queryFn();
    
    // Salvar no cache
    if (result !== null && result !== undefined) {
      await this.set(cacheKey, result, ttl);
    }
    
    return result;
  }

  /**
   * Gerar chave de cache padronizada
   */
  generateKey(type, ...identifiers) {
    return `${type}:${identifiers.join(':')}`;
  }

  /**
   * Invalidar cache de uma turma específica
   */
  async invalidateClass(classId) {
    await this.deletePattern(`class:${classId}:*`);
    await this.deletePattern(`stats:${classId}:*`);
  }

  /**
   * Invalidar cache de um usuário
   */
  async invalidateUser(userId) {
    await this.deletePattern(`user:${userId}:*`);
  }

  /**
   * Buscar estatísticas da turma (com cache)
   */
  async getClassStats(classId, queryFn) {
    const key = this.generateKey('stats', classId, 'overview');
    return await this.cacheQuery(key, queryFn, TTL_CONFIG.classStats);
  }

  /**
   * Buscar alunos da turma (com cache)
   */
  async getClassStudents(classId, queryFn) {
    const key = this.generateKey('class', classId, 'students');
    return await this.cacheQuery(key, queryFn, TTL_CONFIG.students);
  }

  /**
   * Buscar atividades da turma (com cache)
   */
  async getClassActivities(classId, queryFn) {
    const key = this.generateKey('class', classId, 'activities');
    return await this.cacheQuery(key, queryFn, TTL_CONFIG.activities);
  }

  /**
   * Buscar materiais da turma (com cache)
   */
  async getClassMaterials(classId, queryFn) {
    const key = this.generateKey('class', classId, 'materials');
    return await this.cacheQuery(key, queryFn, TTL_CONFIG.materials);
  }

  /**
   * Buscar posts do mural (com cache)
   */
  async getClassPosts(classId, queryFn) {
    const key = this.generateKey('class', classId, 'posts');
    return await this.cacheQuery(key, queryFn, TTL_CONFIG.posts);
  }

  /**
   * Verificar se cache está funcionando
   */
  async ping() {
    try {
      const result = await this.request('ping');
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Desabilitar cache (para debug)
   */
  disable() {
    this.enabled = false;
    logger.warn('[Cache] Disabled')
  }

  /**
   * Habilitar cache
   */
  enable() {
    this.enabled = true;
  }
}

// Exportar instância singleton
export const redisCache = new RedisCacheService();

// Exportar classe para testes
export default RedisCacheService;
