import { logger } from '@/shared/utils/logger';
// src/middleware/cacheMiddleware.js
import redisCache from '@/services/redisService';

// Cache middleware for API routes
export const cacheMiddleware = (keyGenerator, ttl = 300) => {
  return async (req, res, next) => {
    try {
      // Generate cache key
      const cacheKey = typeof keyGenerator === 'function'
        ? keyGenerator(req)
        : `${req.method}:${req.originalUrl}`;

      // Try to get from cache
      const cachedResponse = await redisCache.get(cacheKey);

      if (cachedResponse) {
        // Return cached response
        return res.json({
          ...cachedResponse,
          cached: true,
          cachedAt: new Date().toISOString()
        });
      }

      // Store original send method
      const originalSend = res.send;
      const originalJson = res.json;

      // Override response methods to cache the response
      let responseData = null;

      res.send = function(data) {
        responseData = data;
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        responseData = data;

        // Cache the response if it's successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisCache.set(cacheKey, {
            statusCode: res.statusCode,
            data: data,
            headers: res.getHeaders()
          }, ttl).catch(err => {
            logger.error('Cache set error:', err)
          });
        }

        return originalJson.call(this, data);
      };

      // Continue to next middleware
      next();

    } catch (error) {
      logger.error('Cache middleware error:', error)
      // Continue without cache on error
      next();
    }
  };
};

// Specific cache configurations for different endpoints
export const userCache = (req) => `user:${req.params.userId || req.user?.id}`;
export const classCache = (req) => `class:${req.params.classId}`;
export const activityCache = (req) => `activity:${req.params.activityId}`;
export const meetingCache = (req) => `meeting:${req.params.meetingId}`;

// Cache TTL configurations
export const CACHE_TTL = {
  USER_PROFILE: 30 * 60,        // 30 minutes
  USER_CLASSES: 10 * 60,        // 10 minutes
  CLASS_ACTIVITIES: 5 * 60,     // 5 minutes
  ACTIVITY_DETAILS: 15 * 60,    // 15 minutes
  MEETING_DETAILS: 10 * 60,     // 10 minutes
  CLASS_STUDENTS: 10 * 60,      // 10 minutes
  NOTIFICATIONS: 5 * 60,        // 5 minutes
  STATISTICS: 60 * 60,          // 1 hour
  PERFORMANCE: 60 * 60,         // 1 hour
};

// Cache invalidation middleware
export const invalidateCache = async (patterns) => {
  try {
    const deletePromises = patterns.map(pattern =>
      redisCache.deletePattern(pattern)
    );
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    logger.error('Cache invalidation error:', error)
    return false;
  }
};

// Cache decorator for functions
export const withCache = (fn, keyGenerator, ttl = 300) => {
  return async (...args) => {
    const cacheKey = typeof keyGenerator === 'function'
      ? keyGenerator(...args)
      : `${fn.name}:${JSON.stringify(args)}`;

    // Try cache first
    const cachedResult = await redisCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Execute function
    const result = await fn(...args);

    // Cache result
    if (result) {
      await redisCache.set(cacheKey, result, ttl);
    }

    return result;
  };
};

// Batch cache operations
export const batchCacheGet = async (keys) => {
  return await redisCache.batchGet(keys);
};

export const batchCacheSet = async (keyValuePairs, ttl = 300) => {
  return await redisCache.batchSet(keyValuePairs, ttl);
};

// Cache warming utility
export const warmCache = async (cacheWarmer) => {
  try {
    const results = await cacheWarmer();
    logger.debug('Cache warmed successfully:', results)
    return results;
  } catch (error) {
    logger.error('Cache warming error:', error)
    throw error;
  }
};

// Cache analytics
export const getCacheAnalytics = async () => {
  const stats = await redisCache.getCacheStats();

  // Get cache hit/miss stats if available
  const cacheInfo = await redisCache.redis.info('commandstats');
  const lines = cacheInfo.split('\n');

  let hits = 0;
  let misses = 0;

  lines.forEach(line => {
    if (line.includes('cmdstat_get')) {
      const match = line.match(/calls:(\d+),usec:(\d+),usec_per_call:(\d+)/);
      if (match) {
        hits += parseInt(match[1]);
      }
    }
  });

  return {
    ...stats,
    cacheHits: hits,
    cacheMisses: misses,
    hitRate: hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0
  };
};

export default {
  cacheMiddleware,
  withCache,
  invalidateCache,
  batchCacheGet,
  batchCacheSet,
  warmCache,
  getCacheAnalytics,
  CACHE_TTL
};
