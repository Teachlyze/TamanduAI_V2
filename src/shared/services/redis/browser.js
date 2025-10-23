// src/services/redis/browser.js
import { Logger } from '../logger';

// In-memory cache for browser environment
class BrowserRedisCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
  }

  async get(key, parse = true) {
    try {
      const value = this.cache.get(key);
      if (!value) return null;
      
      // Check if the value has expired
      const { data, expiresAt } = value;
      if (expiresAt && Date.now() > expiresAt) {
        this.cache.delete(key);
        return null;
      }
      
      return parse && typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      Logger.error('BrowserRedisCache get error:', { error });
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    try {
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
    } catch (error) {
      Logger.error('BrowserRedisCache set error:', { error });
      return false;
    }
  }

  async del(key) {
    try {
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
        this.timeouts.delete(key);
      }
      return this.cache.delete(key);
    } catch (error) {
      Logger.error('BrowserRedisCache del error:', { error });
      return false;
    }
  }

  async deletePattern(pattern) {
    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      let count = 0;
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          await this.del(key);
          count++;
        }
      }
      
      return count;
    } catch (error) {
      Logger.error('BrowserRedisCache deletePattern error:', { error });
      return 0;
    }
  }

  async clear() {
    try {
      this.cache.clear();
      this.timeouts.forEach(clearTimeout);
      this.timeouts.clear();
      return true;
    } catch (error) {
      Logger.error('BrowserRedisCache clear error:', { error });
      return false;
    }
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

// Export a singleton instance
const redisCache = new BrowserRedisCache();

export default redisCache;
