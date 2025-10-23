// src/services/browserCache.js
import { Logger } from './logger';

// In-memory cache for browser environment
class BrowserCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
  }

  // Get a value from cache
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
      Logger.error('BrowserCache get error:', { error });
      return null;
    }
  }

  // Set a value in cache
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
      Logger.error('BrowserCache set error:', { error });
      return false;
    }
  }

  // Delete a key from cache
  async del(key) {
    try {
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
        this.timeouts.delete(key);
      }
      return this.cache.delete(key);
    } catch (error) {
      Logger.error('BrowserCache del error:', { error });
      return false;
    }
  }

  // Delete all keys matching a pattern
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
      Logger.error('BrowserCache deletePattern error:', { error });
      return 0;
    }
  }

  // Clear the entire cache
  async clear() {
    try {
      this.cache.clear();
      this.timeouts.forEach(clearTimeout);
      this.timeouts.clear();
      return true;
    } catch (error) {
      Logger.error('BrowserCache clear error:', { error });
      return false;
    }
  }

  // Get cache stats
  async getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export a singleton instance
export const browserCache = new BrowserCache();

export default {
  get: browserCache.get.bind(browserCache),
  set: browserCache.set.bind(browserCache),
  del: browserCache.del.bind(browserCache),
  deletePattern: browserCache.deletePattern.bind(browserCache),
  clear: browserCache.clear.bind(browserCache),
  getStats: browserCache.getStats.bind(browserCache)
};
