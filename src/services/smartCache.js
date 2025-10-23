// src/services/smartCache.js
import redisCache from './redis';
import monitoringService from './monitoring';

/**
 * Sistema de cache inteligente com invalidação automática
 */
class SmartCache {
  constructor() {
    this.invalidationRules = new Map();
    this.dependencyGraph = new Map();
    this.cacheTags = new Map();
    this.isEnabled = true;

    this.setupDefaultInvalidationRules();
  }

  /**
   * Configurar regras padrão de invalidação
   */
  setupDefaultInvalidationRules() {
    // Regra: Quando um usuário é atualizado, invalidar todos os caches relacionados ao usuário
    this.addInvalidationRule('user:update', [
      'user:*',
      'users:list',
      'dashboard:user:*',
    ]);

    // Regra: Quando uma atividade é criada/atualizada/excluída, invalidar listas de atividades
    this.addInvalidationRule('activity:create', [
      'activities:list',
      'activities:recent',
      'dashboard:activities',
    ]);

    this.addInvalidationRule('activity:update', [
      'activities:list',
      'activities:recent',
      'activity:*',
      'dashboard:activities',
    ]);

    this.addInvalidationRule('activity:delete', [
      'activities:list',
      'activities:recent',
      'dashboard:activities',
    ]);

    // Regra: Quando uma reunião é criada/atualizada/excluída
    this.addInvalidationRule('meeting:create', [
      'meetings:list',
      'meetings:upcoming',
      'dashboard:meetings',
    ]);

    this.addInvalidationRule('meeting:update', [
      'meetings:list',
      'meetings:upcoming',
      'meeting:*',
      'dashboard:meetings',
    ]);

    this.addInvalidationRule('meeting:delete', [
      'meetings:list',
      'meetings:upcoming',
      'dashboard:meetings',
    ]);

    // Regra: Quando dados de turma são alterados
    this.addInvalidationRule('class:update', [
      'classes:list',
      'class:*',
      'dashboard:class:*',
    ]);

    // Regra: Logout - limpar todos os caches do usuário
    this.addInvalidationRule('auth:logout', [
      'user:*',
      'dashboard:*',
      'notifications:*',
    ]);
  }

  /**
   * Adicionar regra de invalidação
   */
  addInvalidationRule(event, patterns) {
    this.invalidationRules.set(event, patterns);
  }

  /**
   * Registrar dependência entre chaves de cache
   */
  addDependency(parentKey, childKey) {
    if (!this.dependencyGraph.has(parentKey)) {
      this.dependencyGraph.set(parentKey, new Set());
    }
    this.dependencyGraph.get(parentKey).add(childKey);
  }

  /**
   * Associar tags a uma chave de cache
   */
  tagCacheKey(key, tags) {
    if (!this.cacheTags.has(key)) {
      this.cacheTags.set(key, new Set());
    }

    tags.forEach(tag => {
      this.cacheTags.get(key).add(tag);

      // Também adicionar à lista de tags
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag).add(key);
    });
  }

  /**
   * Invalidar cache por evento
   */
  async invalidateByEvent(event, context = {}) {
    if (!this.isEnabled) return;

    const patterns = this.invalidationRules.get(event);
    if (!patterns) return;

    const startTime = Date.now();
    let invalidatedCount = 0;

    monitoringService.recordCacheOperation('invalidation', event, 0, true);

    for (const pattern of patterns) {
      try {
        // Substituir placeholders no padrão
        const processedPattern = this.processPattern(pattern, context);

        // Invalidar chaves que correspondem ao padrão
        const keys = await this.findKeysByPattern(processedPattern);
        invalidatedCount += keys.length;

        for (const key of keys) {
          await redisCache.del(key);

          // Invalidar dependentes
          await this.invalidateDependents(key);
        }

        // Invalidar por tags se aplicável
        await this.invalidateByTags(processedPattern);

      } catch (error) {
        monitoringService.recordError(error, { event, pattern }, 'warning');
      }
    }

    const duration = Date.now() - startTime;
    monitoringService.recordCacheOperation('invalidation', event, duration, true, invalidatedCount);

    console.log(`Invalidated ${invalidatedCount} cache keys for event: ${event}`);
  }

  /**
   * Invalidar dependentes de uma chave
   */
  async invalidateDependents(parentKey) {
    const dependents = this.dependencyGraph.get(parentKey);
    if (!dependents) return;

    for (const dependentKey of dependents) {
      try {
        await redisCache.del(dependentKey);
      } catch (error) {
        console.warn(`Failed to invalidate dependent key: ${dependentKey}`, error);
      }
    }
  }

  /**
   * Invalidar por tags
   */
  async invalidateByTags(pattern) {
    // Extrair tags do padrão se for uma operação específica
    const tags = this.extractTagsFromPattern(pattern);

    for (const tag of tags) {
      const tagKeys = this.tagIndex.get(tag);
      if (tagKeys) {
        for (const key of tagKeys) {
          try {
            await redisCache.del(key);
          } catch (error) {
            console.warn(`Failed to invalidate tagged key: ${key}`, error);
          }
        }
      }
    }
  }

  /**
   * Processar padrão com placeholders
   */
  processPattern(pattern, context) {
    let processed = pattern;

    // Substituir {userId} pelo ID do usuário do contexto
    if (context.userId) {
      processed = processed.replace(/\{userId\}/g, context.userId);
    }

    // Substituir {classId} pelo ID da turma do contexto
    if (context.classId) {
      processed = processed.replace(/\{classId\}/g, context.classId);
    }

    // Substituir {activityId} pelo ID da atividade do contexto
    if (context.activityId) {
      processed = processed.replace(/\{activityId\}/g, context.activityId);
    }

    return processed;
  }

  /**
   * Encontrar chaves por padrão
   */
  async findKeysByPattern(pattern) {
    try {
      // Para padrões simples, podemos usar KEYS diretamente
      if (pattern.includes('*') || pattern.includes('?')) {
        return await redisCache.getKeys ? await redisCache.getKeys(pattern) : [];
      }

      // Para chaves específicas, verificar se existem
      const exists = await redisCache.exists(pattern);
      return exists ? [pattern] : [];
    } catch (error) {
      console.warn('Failed to find keys by pattern:', pattern, error);
      return [];
    }
  }

  /**
   * Extrair tags de um padrão
   */
  extractTagsFromPattern(pattern) {
    // Implementação simples - em produção você poderia ter uma lógica mais sofisticada
    const tags = [];

    if (pattern.includes('user:')) tags.push('user');
    if (pattern.includes('activity:')) tags.push('activity');
    if (pattern.includes('meeting:')) tags.push('meeting');
    if (pattern.includes('class:')) tags.push('class');
    if (pattern.includes('dashboard:')) tags.push('dashboard');

    return tags;
  }

  /**
   * Cache inteligente com invalidação automática
   */
  async smartSet(key, value, ttl = 300, tags = [], dependencies = []) {
    try {
      // Armazenar no cache
      await redisCache.set(key, value, ttl);

      // Registrar tags
      if (tags.length > 0) {
        this.tagCacheKey(key, tags);
      }

      // Registrar dependências
      if (dependencies.length > 0) {
        for (const dep of dependencies) {
          this.addDependency(dep, key);
        }
      }

      monitoringService.recordCacheOperation('set', key, 0, true);
      return true;
    } catch (error) {
      monitoringService.recordCacheOperation('set', key, 0, false);
      throw error;
    }
  }

  /**
   * Obter do cache com monitoramento
   */
  async smartGet(key) {
    const startTime = Date.now();
    try {
      const value = await redisCache.get(key);
      const duration = Date.now() - startTime;

      const hit = value !== null;
      monitoringService.recordCacheOperation('get', key, duration, true, hit ? 1 : 0);

      return value;
    } catch (error) {
      const duration = Date.now() - startTime;
      monitoringService.recordCacheOperation('get', key, duration, false);
      throw error;
    }
  }

  /**
   * Definir dados de usuário com invalidação automática
   */
  async setUserData(userId, data, additionalData = {}) {
    const context = { userId, ...additionalData };

    // Primeiro, invalidar caches antigos relacionados ao usuário
    await this.invalidateByEvent('user:update', context);

    // Depois, definir novos dados
    await this.smartSet(
      `user:${userId}`,
      data,
      1800, // 30 minutos
      ['user', `user:${userId}`],
      []
    );

    // Dados específicos do perfil
    await this.smartSet(
      `user:${userId}:profile`,
      data.profile,
      3600, // 1 hora
      ['user', 'profile', `user:${userId}`],
      [`user:${userId}`]
    );

    // Configurações do usuário
    await this.smartSet(
      `user:${userId}:settings`,
      data.settings,
      7200, // 2 horas
      ['user', 'settings', `user:${userId}`],
      [`user:${userId}`]
    );
  }

  /**
   * Definir dados de atividade com invalidação automática
   */
  async setActivityData(activityId, data, additionalData = {}) {
    const context = { activityId, ...additionalData };

    // Invalidar listas de atividades
    await this.invalidateByEvent('activity:update', context);

    // Definir dados da atividade específica
    await this.smartSet(
      `activity:${activityId}`,
      data,
      900, // 15 minutos
      ['activity', `activity:${activityId}`],
      []
    );

    // Metadados da atividade
    await this.smartSet(
      `activity:${activityId}:metadata`,
      data.metadata,
      3600, // 1 hora
      ['activity', 'metadata', `activity:${activityId}`],
      [`activity:${activityId}`]
    );
  }

  /**
   * Limpar sessão do usuário
   */
  async clearUserSession(userId) {
    await this.invalidateByEvent('auth:logout', { userId });

    // Limpar dados específicos da sessão
    const sessionPatterns = [
      `session:${userId}:*`,
      `temp:${userId}:*`,
      `upload:${userId}:*`,
    ];

    for (const pattern of sessionPatterns) {
      try {
        const keys = await this.findKeysByPattern(pattern);
        for (const key of keys) {
          await redisCache.del(key);
        }
      } catch (error) {
        console.warn(`Failed to clear session pattern: ${pattern}`, error);
      }
    }
  }

  /**
   * Obter estatísticas do cache inteligente
   */
  async getStats() {
    try {
      const cacheStats = await redisCache.getStats();

      return {
        rules: this.invalidationRules.size,
        dependencies: this.dependencyGraph.size,
        taggedKeys: this.cacheTags.size,
        tags: this.tagIndex.size,
        cache: cacheStats,
      };
    } catch (error) {
      console.warn('Failed to get smart cache stats:', error);
      return null;
    }
  }

  /**
   * Habilitar/desabilitar cache inteligente
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }
}

// Índice de tags (simplificado - em produção seria mais eficiente)
const tagIndex = new Map();

// Singleton instance
const smartCache = new SmartCache();

export default smartCache;
export { SmartCache };
