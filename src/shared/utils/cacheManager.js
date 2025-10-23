import { redisCache } from '@/shared/services/redis';
import Logger from '@/shared/services/logger';

/**
 * Cache manager utility for handling Redis operations with consistent error handling
 */
const cacheManager = {
  /**
   * Get data from cache by key
   * @param {string} key - Cache key
   * @returns {Promise<object|null>} Cached data or null if not found
   */
  get: async (key) => {
    if (!key) return null;
    
    try {
      return await redisCache.get(key);
    } catch (error) {
      Logger.warn('Cache read error', { 
        key, 
        error: error.message,
        stack: error.stack 
      });
      return null;
    }
  },

  /**
   * Set data in cache with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache (will be JSON.stringified)
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<void>}
   */
  set: async (key, data, ttl = 900) => { // Default 15 minutes
    if (!key) return;
    
    try {
      await redisCache.set(key, { 
        data, 
        timestamp: Date.now() 
      }, ttl);
    } catch (error) {
      Logger.warn('Cache write error', { 
        key, 
        error: error.message,
        stack: error.stack
      });
    }
  },

  /**
   * Delete a key from cache
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  del: async (key) => {
    if (!key) return false;
    
    try {
      await redisCache.del(key);
      return true;
    } catch (error) {
      Logger.warn('Cache delete error', { 
        key, 
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  },

  /**
   * Invalidate cache keys matching a pattern
   * @param {string} pattern - Pattern to match keys against
   * @returns {Promise<number>} Number of keys deleted
   */
  invalidatePattern: async (pattern) => {
    try {
      await redisCache.deletePattern(pattern);
      return 1; // Return 1 to indicate success (actual count not available from deletePattern)
    } catch (error) {
      Logger.warn('Cache pattern invalidation error', {
        pattern,
        error: error.message,
        stack: error.stack
      });
      return 0;
    }
  }
};

export default cacheManager;
