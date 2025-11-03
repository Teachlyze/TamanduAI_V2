import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';
import redisCache from '@/shared/services/redis';
import monitoringService from '@/shared/services/monitoring';

/**
 * Enhanced Smart Cache Service
 * Advanced caching with event-based invalidation, distributed cache, and intelligent prefetching
 */
export class EnhancedSmartCache {
  constructor() {
    this.cache = new Map();
    this.dependencies = new Map(); // Track dependencies between cache keys
    this.eventListeners = new Map(); // Event-based invalidation
    this.prefetchQueue = new Set(); // URLs to prefetch
    this.isProcessingPrefetch = false;
    this.maxCacheSize = 1000;
    this.defaultTTL = 300000; // 5 minutes
    this.prefetchTTL = 600000; // 10 minutes for prefetched data

    this.setupEventListeners();
    this.startPrefetchProcessor();
    this.startCacheCleanup();
  }

  /**
   * Set up event listeners for automatic cache invalidation
   */
  setupEventListeners() {
    // Listen for database changes via Supabase real-time
    this.setupRealtimeSubscriptions();

    // Listen for custom cache invalidation events
    window.addEventListener('cache:invalidate', this.handleCacheInvalidation.bind(this));
    window.addEventListener('cache:invalidatePattern', this.handlePatternInvalidation.bind(this));
    window.addEventListener('cache:clear', this.clear.bind(this));
  }

  /**
   * Set up real-time subscriptions for cache invalidation
   */
  setupRealtimeSubscriptions() {
    const tables = [
      'classes',
      'class_members',
      'activities',
      'submissions',
      'notifications',
      'profiles',
    ];

    tables.forEach(table => {
      const channel = supabase
        .channel(`cache_invalidation:${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          (payload) => {
            this.handleDatabaseChange(table, payload);
          }
        )
        .subscribe();

      this.eventListeners.set(table, channel);
    });
  }

  /**
   * Handle database changes for cache invalidation
   */
  handleDatabaseChange(table, payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Invalidate related cache entries
    switch (table) {
      case 'classes':
        this.invalidateClassRelatedCache(newRecord?.id || oldRecord?.id);
        break;
      case 'class_members':
        this.invalidateClassMemberCache(newRecord, oldRecord);
        break;
      case 'activities':
        this.invalidateActivityRelatedCache(newRecord?.id || oldRecord?.id);
        break;
      case 'submissions':
        this.invalidateSubmissionRelatedCache(newRecord?.id || oldRecord?.id);
        break;
      case 'profiles':
        this.invalidateProfileRelatedCache(newRecord?.id || oldRecord?.id);
        break;
      case 'notifications':
        this.invalidateNotificationRelatedCache(newRecord?.id || oldRecord?.id);
        break;
    }

    // Record cache invalidation metric
    monitoringService.recordBusinessMetric('cache_invalidated', 1, {
      reason: 'database_change',
      table,
      event: eventType,
    });
  }

  /**
   * Smart set with dependency tracking and event-based invalidation
   */
  async smartSet(key, data, options = {}) {
    const {
      ttl = this.defaultTTL,
      dependencies = [],
      tags = [],
      prefetch = false,
      invalidateOn = [],
    } = options;

    try {
      // Store in memory cache
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl,
        dependencies,
        tags,
        accessCount: 0,
        lastAccessed: Date.now(),
      };

      this.cache.set(key, cacheEntry);

      // Track dependencies
      dependencies.forEach(dep => {
        if (!this.dependencies.has(dep)) {
          this.dependencies.set(dep, new Set());
        }
        this.dependencies.get(dep).add(key);
      });

      // Track tags for bulk invalidation
      tags.forEach(tag => {
        if (!this.dependencies.has(`tag:${tag}`)) {
          this.dependencies.set(`tag:${tag}`, new Set());
        }
        this.dependencies.get(`tag:${tag}`).add(key);
      });

      // Set up event-based invalidation
      invalidateOn.forEach(event => {
        if (!this.dependencies.has(`event:${event}`)) {
          this.dependencies.set(`event:${event}`, new Set());
        }
        this.dependencies.get(`event:${event}`).add(key);
      });

      // Store in Redis for distributed cache
      await redisCache.set(key, data, Math.floor(ttl / 1000));

      // Prefetch related data if requested
      if (prefetch && Array.isArray(prefetch)) {
        prefetch.forEach(url => this.prefetchQueue.add(url));
      }

      monitoringService.recordCacheOperation('set', key, true, 0);

      return data;
    } catch (error) {
      monitoringService.recordError(error, { context: 'smart_cache_set' });
      throw error;
    }
  }

  /**
   * Smart get with cache warming and dependency checking
   */
  async smartGet(key, options = {}) {
    const {
      fallback = null,
      refresh = false,
      warmRelated = true,
    } = options;

    try {
      // Check memory cache first
      const memoryEntry = this.cache.get(key);
      if (memoryEntry && !this.isExpired(memoryEntry) && !refresh) {
        memoryEntry.accessCount++;
        memoryEntry.lastAccessed = Date.now();
        monitoringService.recordCacheOperation('get', key, true, 0);
        return memoryEntry.data;
      }

      // Check Redis cache
      const redisData = await redisCache.get(key);
      if (redisData && !refresh) {
        // Warm memory cache
        await this.smartSet(key, redisData, { ttl: this.defaultTTL });
        monitoringService.recordCacheOperation('get', key, true, 0);
        return redisData;
      }

      // Cache miss - try fallback
      if (fallback) {
        const fallbackData = await fallback();
        if (fallbackData) {
          await this.smartSet(key, fallbackData, { ttl: this.defaultTTL });
        }
        monitoringService.recordCacheOperation('get', key, false, 0);
        return fallbackData;
      }

      monitoringService.recordCacheOperation('get', key, false, 0);
      return null;
    } catch (error) {
      monitoringService.recordError(error, { context: 'smart_cache_get' });
      return fallback ? fallback() : null;
    }
  }

  /**
   * Invalidate cache entries based on pattern
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    let invalidatedCount = 0;

    // Invalidate memory cache
    for (const [key, entry] of this.cache.entries()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    // Invalidate Redis cache
    this.invalidateRedisPattern(pattern);

    monitoringService.recordBusinessMetric('cache_pattern_invalidated', invalidatedCount, {
      pattern,
    });

    return invalidatedCount;
  }

  /**
   * Invalidate Redis cache by pattern (placeholder for actual implementation)
   */
  async invalidateRedisPattern(pattern) {
    try {
      // In a real implementation, you would:
      // 1. Get all keys matching the pattern
      // 2. Delete them in batch
      logger.debug(`Invalidating Redis cache pattern: ${pattern}`)
    } catch (error) {
      monitoringService.recordError(error, { context: 'redis_pattern_invalidation' });
    }
  }

  /**
   * Invalidate cache by tags
   */
  invalidateByTags(tags) {
    let invalidatedCount = 0;

    tags.forEach(tag => {
      const tagKey = `tag:${tag}`;
      const dependentKeys = this.dependencies.get(tagKey);

      if (dependentKeys) {
        dependentKeys.forEach(key => {
          this.cache.delete(key);
          invalidatedCount++;
        });
        this.dependencies.delete(tagKey);
      }
    });

    return invalidatedCount;
  }

  /**
   * Prefetch related data for better UX
   */
  async prefetch(urls) {
    if (!Array.isArray(urls)) return;

    urls.forEach(url => this.prefetchQueue.add(url));

    if (!this.isProcessingPrefetch) {
      this.processPrefetchQueue();
    }
  }

  /**
   * Process prefetch queue
   */
  async processPrefetchQueue() {
    if (this.isProcessingPrefetch || this.prefetchQueue.size === 0) return;

    this.isProcessingPrefetch = true;

    for (const url of this.prefetchQueue) {
      try {
        // Check if already cached
        const cached = await this.smartGet(`prefetch:${url}`);
        if (cached) continue;

        // Prefetch data (placeholder for actual fetch)
        const data = await this.prefetchData(url);

        if (data) {
          await this.smartSet(`prefetch:${url}`, data, {
            ttl: this.prefetchTTL,
            tags: ['prefetched'],
          });
        }
      } catch (error) {
        monitoringService.recordError(error, { context: 'prefetch', url });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.prefetchQueue.clear();
    this.isProcessingPrefetch = false;
  }

  /**
   * Prefetch data (placeholder for actual implementation)
   */
  async prefetchData(url) {
    // This would make actual API calls to prefetch data
    // For now, return mock data
    return { prefetched: true, url, timestamp: new Date().toISOString() };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());

    const stats = {
      totalEntries: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
      hitRate: this.calculateHitRate(),
      averageAge: entries.length > 0
        ? entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length
        : 0,
      oldestEntry: entries.length > 0
        ? Math.min(...entries.map(e => e.timestamp))
        : 0,
      newestEntry: entries.length > 0
        ? Math.max(...entries.map(e => e.timestamp))
        : 0,
      byType: this.groupBy(entries, 'type'),
    };

    return stats;
  }

  /**
   * Calculate cache hit rate (placeholder for actual implementation)
   */
  calculateHitRate() {
    // In a real implementation, you'd track hits/misses
    return 0.85; // Mock hit rate
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // Rough estimate for key
      totalSize += JSON.stringify(entry.data).length * 2; // Rough estimate for data
    }

    return totalSize;
  }

  /**
   * Group entries by field
   */
  groupBy(array, field) {
    return array.reduce((groups, item) => {
      const key = item[field] || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    monitoringService.recordBusinessMetric('cache_entries_cleaned', cleanedCount);
    return cleanedCount;
  }

  /**
   * Clear all cache
   */
  clear() {
    const entryCount = this.cache.size;
    this.cache.clear();
    this.dependencies.clear();

    monitoringService.recordBusinessMetric('cache_cleared', entryCount);
    return entryCount;
  }

  /**
   * Handle cache invalidation events
   */
  handleCacheInvalidation(event) {
    const { key } = event.detail;
    if (key && this.cache.has(key)) {
      this.cache.delete(key);
      monitoringService.recordBusinessMetric('cache_invalidated', 1, {
        reason: 'manual_invalidation',
        key,
      });
    }
  }

  /**
   * Handle pattern invalidation events
   */
  handlePatternInvalidation(event) {
    const { pattern } = event.detail;
    this.invalidatePattern(pattern);
  }

  /**
   * Invalidate class-related cache
   */
  invalidateClassRelatedCache(classId) {
    this.invalidatePattern(`class:${classId}:*`);
    this.invalidatePattern(`*classId:${classId}*`);
  }

  /**
   * Invalidate class member cache
   */
  invalidateClassMemberCache(newRecord, oldRecord) {
    if (newRecord?.class_id) {
      this.invalidateClassRelatedCache(newRecord.class_id);
    }
    if (oldRecord?.class_id) {
      this.invalidateClassRelatedCache(oldRecord.class_id);
    }
  }

  /**
   * Invalidate activity-related cache
   */
  invalidateActivityRelatedCache(activityId) {
    this.invalidatePattern(`activity:${activityId}:*`);
    this.invalidatePattern(`*activityId:${activityId}*`);
  }

  /**
   * Invalidate submission-related cache
   */
  invalidateSubmissionRelatedCache(submissionId) {
    this.invalidatePattern(`submission:${submissionId}:*`);
    this.invalidatePattern(`*submissionId:${submissionId}*`);
  }

  /**
   * Invalidate profile-related cache
   */
  invalidateProfileRelatedCache(profileId) {
    this.invalidatePattern(`profile:${profileId}:*`);
    this.invalidatePattern(`*userId:${profileId}*`);
  }

  /**
   * Invalidate notification-related cache
   */
  invalidateNotificationRelatedCache(notificationId) {
    this.invalidatePattern(`notification:${notificationId}:*`);
    this.invalidatePattern(`*notificationId:${notificationId}*`);
  }

  /**
   * Start periodic cache cleanup
   */
  startCacheCleanup() {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Clean every minute
  }

  /**
   * Start prefetch processor
   */
  startPrefetchProcessor() {
    setInterval(() => {
      if (this.prefetchQueue.size > 0) {
        this.processPrefetchQueue();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get specific data types with smart caching
   */
  async getUserProfile(userId, options = {}) {
    const cacheKey = `profile:${userId}`;

    return this.smartGet(cacheKey, {
      fallback: () => this.fetchUserProfile(userId),
      dependencies: [`user:${userId}`],
      tags: ['profile', 'user'],
      ...options,
    });
  }

  async getClassData(classId, options = {}) {
    const cacheKey = `class:${classId}`;

    return this.smartGet(cacheKey, {
      fallback: () => this.fetchClassData(classId),
      dependencies: [`class:${classId}`],
      tags: ['class', 'class_members'],
      prefetch: [
        `/api/classes/${classId}/activities`,
        `/api/classes/${classId}/members`,
      ],
      ...options,
    });
  }

  async getActivityData(activityId, options = {}) {
    const cacheKey = `activity:${activityId}`;

    return this.smartGet(cacheKey, {
      fallback: () => this.fetchActivityData(activityId),
      dependencies: [`activity:${activityId}`],
      tags: ['activity', 'submissions'],
      prefetch: [
        `/api/activities/${activityId}/submissions`,
        `/api/activities/${activityId}/grades`,
      ],
      ...options,
    });
  }

  async getNotifications(userId, options = {}) {
    const cacheKey = `notifications:${userId}:${Date.now()}`;

    return this.smartGet(cacheKey, {
      fallback: () => this.fetchNotifications(userId),
      dependencies: [`user:${userId}`],
      tags: ['notifications'],
      ttl: 60000, // Short TTL for notifications
      ...options,
    });
  }

  /**
   * Fetch methods (placeholders for actual API calls)
   */
  async fetchUserProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async fetchClassData(classId) {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        members:class_members(*, user:profiles(*)),
        activities(*)
      `)
      .eq('id', classId)
      .single();

    if (error) throw error;
    return data;
  }

  async fetchActivityData(activityId) {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        class:classes(id, name),
        submissions(*, user:profiles(full_name))
      `)
      .eq('id', activityId)
      .single();

    if (error) throw error;
    return data;
  }

  async fetchNotifications(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  }
}

// Singleton instance
const enhancedSmartCache = new EnhancedSmartCache();

export default enhancedSmartCache;
