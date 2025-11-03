/**
 * Cache Service com Upstash Redis
 * 
 * Serviço de cache para otimizar performance de páginas pesadas.
 * Usa Upstash Redis REST API para cache distribuído.
 * 
 * Setup:
 * 1. Criar conta em https://upstash.com
 * 2. Criar Redis database
 * 3. Adicionar credenciais no .env:
 *    VITE_UPSTASH_REDIS_REST_URL=https://...
 *    VITE_UPSTASH_REDIS_REST_TOKEN=...
 */

class CacheService {
  constructor() {
    this.enabled = false;
    this.url = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
    this.token = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;
    
    // Verificar se credenciais estão configuradas
    if (this.url && this.token) {
      this.enabled = true;
      console.log('[Cache] ✅ Upstash Redis configurado');
    } else {
      console.warn('[Cache] ⚠️  Upstash Redis não configurado - cache desabilitado');
      console.warn('[Cache] Configure VITE_UPSTASH_REDIS_REST_URL e VITE_UPSTASH_REDIS_REST_TOKEN');
    }
  }

  /**
   * Busca valor do cache
   * @param {string} key - Chave do cache
   * @returns {Promise<any|null>} - Valor cacheado ou null
   */
  async get(key) {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.result === null) {
        console.log(`[Cache] ❌ Miss: ${key}`);
        return null;
      }

      console.log(`[Cache] ✅ Hit: ${key}`);
      
      // Upstash retorna string, precisamos parsear JSON
      try {
        return JSON.parse(data.result);
      } catch {
        return data.result;
      }
    } catch (error) {
      console.error(`[Cache] Erro ao buscar ${key}:`, error);
      return null;
    }
  }

  /**
   * Salva valor no cache
   * @param {string} key - Chave do cache
   * @param {any} value - Valor a ser cacheado
   * @param {number} ttl - Tempo de vida em segundos (padrão: 300s = 5min)
   * @returns {Promise<boolean>} - true se salvou com sucesso
   */
  async set(key, value, ttl = 300) {
    if (!this.enabled) return false;

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      
      const response = await fetch(`${this.url}/set/${encodeURIComponent(key)}/${encodeURIComponent(serialized)}?EX=${ttl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`[Cache] 💾 Saved: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error(`[Cache] Erro ao salvar ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove valor do cache
   * @param {string} key - Chave do cache
   * @returns {Promise<boolean>} - true se removeu com sucesso
   */
  async del(key) {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.url}/del/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`[Cache] 🗑️  Deleted: ${key}`);
      return true;
    } catch (error) {
      console.error(`[Cache] Erro ao deletar ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove múltiplas chaves que correspondem a um padrão
   * @param {string} pattern - Padrão das chaves (ex: "teacher:reports:*")
   * @returns {Promise<boolean>} - true se removeu com sucesso
   */
  async invalidatePattern(pattern) {
    if (!this.enabled) return false;

    try {
      // 1. Buscar todas as chaves que correspondem ao padrão
      const keysResponse = await fetch(`${this.url}/keys/${encodeURIComponent(pattern)}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!keysResponse.ok) {
        throw new Error(`HTTP error! status: ${keysResponse.status}`);
      }

      const keysData = await keysResponse.json();
      const keys = keysData.result || [];

      if (keys.length === 0) {
        console.log(`[Cache] 🔍 No keys found for pattern: ${pattern}`);
        return true;
      }

      // 2. Deletar todas as chaves encontradas
      const deletePromises = keys.map(key => this.del(key));
      await Promise.all(deletePromises);

      console.log(`[Cache] 🧹 Invalidated ${keys.length} keys matching: ${pattern}`);
      return true;
    } catch (error) {
      console.error(`[Cache] Erro ao invalidar padrão ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Wrapper para cache de consultas
   * Tenta buscar do cache, se não encontrar executa a função e cacheia
   * 
   * @param {string} key - Chave do cache
   * @param {Function} fetchFn - Função que busca os dados
   * @param {number} ttl - Tempo de vida em segundos
   * @returns {Promise<any>} - Dados cacheados ou buscados
   */
  async remember(key, fetchFn, ttl = 300) {
    // Tentar buscar do cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Se não encontrou, executar função e cachear
    const data = await fetchFn();
    await this.set(key, data, ttl);
    
    return data;
  }

  /**
   * Limpa todo o cache (usar com cuidado!)
   * @returns {Promise<boolean>}
   */
  async flush() {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.url}/flushdb`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('[Cache] 🚨 Cache completamente limpo (FLUSH)');
      return true;
    } catch (error) {
      console.error('[Cache] Erro ao limpar cache:', error);
      return false;
    }
  }

  /**
   * Retorna informações sobre o cache
   * @returns {object} - Status do cache
   */
  getStatus() {
    return {
      enabled: this.enabled,
      hasCredentials: !!(this.url && this.token),
      url: this.url ? this.url.replace(/https?:\/\//, '').split('.')[0] + '...' : 'não configurado'
    };
  }
}

// Criar instância única (Singleton)
export const cacheService = new CacheService();

// Exportar classe para testes
export { CacheService };

// Exportar como default
export default cacheService;
