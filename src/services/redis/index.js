// src/services/redis/index.js
import { Logger } from '../logger';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Upstash Redis Edge Function URL
const UPSTASH_REDIS_URL = import.meta.env?.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redis-cache`
  : null;

// Simple in-memory cache for browser environment
class BrowserCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
  }

  async get(key, parse = true) {
    const value = this.cache.get(key);
    if (!value) return null;

    // Check if the value has expired
    const { data, expiresAt } = value;
    if (expiresAt && Date.now() > expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return parse && typeof data === 'string' ? JSON.parse(data) : data;
  }

  async set(key, value, ttl = 300) {
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;

    this.cache.set(key, { data, expiresAt });

    // Set timeout to clean up expired items
    if (ttl) {
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
      }

      const timeout = setTimeout(() => {
        this.cache.delete(key);
        this.timeouts.delete(key);
      }, ttl * 1000);

      this.timeouts.set(key, timeout);
    }

    return true;
  }

  async del(key) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
    return this.cache.delete(key);
  }

  async deletePattern(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        await this.del(key);
        count++;
      }
    }

    return count;
  }

  async clear() {
    this.cache.clear();
    this.timeouts.forEach(clearTimeout);
    this.timeouts.clear();
    return true;
  }

  async healthCheck() {
    return {
      status: 'healthy',
      message: 'Using browser in-memory cache',
      timestamp: new Date().toISOString()
    };
  }

  async getStats() {
    return {
      connected: true,
      mode: 'browser',
      stats: {
        keys: this.cache.size,
        memoryUsage: 0,
        uptime: 0
      }
    };
  }
}

// Upstash Redis Edge Function Cache
class UpstashRedisCache extends BrowserCache {
  constructor() {
    super();
    this.edgeFunctionUrl = UPSTASH_REDIS_URL;
    this.enabled = !!this.edgeFunctionUrl;
  }

  async makeEdgeFunctionRequest(action, key, value = null, ttl = null) {
    if (!this.enabled) {
      throw new Error('Upstash Redis edge function not available');
    }

    const payload = { action, key };
    if (value !== null) payload.value = value;
    if (ttl !== null) payload.ttl = ttl;

    const response = await fetch(this.edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env?.VITE_SUPABASE_ANON_KEY || ''}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Edge function error: ${response.status} ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Redis operation failed: ${data.error}`);
    }

    return data.result;
  }

  async get(key, parse = true) {
    try {
      // Try edge function first
      if (this.enabled) {
        const value = await this.makeEdgeFunctionRequest('get', key);

        if (value !== null) {
          // Also store in local cache for faster subsequent access
          await super.set(key, value);
          return parse ? JSON.parse(value) : value;
        }
      }

      // Fallback to local cache
      return super.get(key, parse);
    } catch (error) {
      Logger.warn('Upstash Redis get failed, using local cache:', error);
      return super.get(key, parse);
    }
  }

  async set(key, value, ttl = 300) {
    try {
      // Try edge function first
      if (this.enabled) {
        const strValue = typeof value === 'string' ? value : JSON.stringify(value);
        await this.makeEdgeFunctionRequest('set', key, strValue, ttl);
      }

      // Always update local cache
      await super.set(key, value, ttl);
      return true;
    } catch (error) {
      Logger.warn('Upstash Redis set failed, using local cache only:', error);
      return super.set(key, value, ttl);
    }
  }

  async del(key) {
    try {
      // Try edge function first
      if (this.enabled) {
        await this.makeEdgeFunctionRequest('del', key);
      }
    } catch (error) {
      Logger.warn('Upstash Redis del failed:', error);
    }

    // Always update local cache
    return super.del(key);
  }

  async deletePattern(pattern) {
    try {
      // Try edge function first
      if (this.enabled) {
        await this.makeEdgeFunctionRequest('keys', pattern);
        // Note: This would need a proper deletePattern implementation in the edge function
      }
    } catch (error) {
      Logger.warn('Upstash Redis deletePattern failed:', error);
    }

    // Fallback to local implementation
    return super.deletePattern(pattern);
  }

  async clear() {
    try {
      // Try edge function first
      if (this.enabled) {
        await this.makeEdgeFunctionRequest('flush');
      }
    } catch (error) {
      Logger.warn('Upstash Redis clear failed:', error);
    }

    // Always clear local cache
    return super.clear();
  }

  async healthCheck() {
    try {
      if (this.enabled) {
        await this.makeEdgeFunctionRequest('ping');
        return {
          status: 'healthy',
          message: 'Upstash Redis edge function is responding',
          mode: 'upstash-edge',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      Logger.warn('Upstash Redis health check failed:', error);
    }

    return super.healthCheck();
  }
}

// Determine which cache implementation to use
let cacheInstance;
if (isBrowser) {
  // Browser: use in-memory cache with optional Upstash edge function
  cacheInstance = new UpstashRedisCache();
} else {
  // Node.js: use in-memory cache only (no Redis server dependency)
  cacheInstance = new BrowserCache();
}

// Export the cache instance as both named and default export
const redisCache = cacheInstance;
export { redisCache };
export default redisCache;
