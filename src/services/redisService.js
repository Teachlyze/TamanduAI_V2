import { logger } from '@/shared/utils/logger';
// src/services/redisService.js
// This file provides a unified interface for Redis in both browser and server environments

// Browser-compatible in-memory cache implementation
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

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create the appropriate cache instance
let redisCache;

if (isBrowser) {
  // In browser, use the in-memory cache
  redisCache = new BrowserCache();
} else {
  // In Node.js, use the real Redis client
  try {
    const { redisCache: serverRedisCache } = await import('./redis');
    redisCache = serverRedisCache;
  } catch (error) {
    logger.error('Failed to load server-side Redis client, falling back to in-memory cache')
    redisCache = new BrowserCache();
  }
}

// Export the cache instance
export { redisCache };
export default redisCache;
