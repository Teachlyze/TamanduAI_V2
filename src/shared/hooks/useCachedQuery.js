import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/shared/services/supabaseClient';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached items

// Simple LRU cache implementation
class SimpleCache {
  constructor(maxSize = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if item has expired
    if (Date.now() - item.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key, data) {
    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    return this.cache.delete(key);
  }

  size() {
    return this.cache.size;
  }
}

// Global cache instance
const queryCache = new SimpleCache();

// Custom hook for cached Supabase queries
export const useCachedQuery = (queryKey, queryFn, options = {}) => {
  const {
    enabled = true,
    staleTime = CACHE_DURATION,
    refetchOnWindowFocus = false
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  const abortControllerRef = useRef(null);
  const isInitialMount = useRef(true);

  // Check cache first
  const checkCache = useCallback((key) => {
    const cachedData = queryCache.get(key);
    if (cachedData) {
      setData(cachedData);
      return true;
    }
    return false;
  }, []);

  // Execute query
  const executeQuery = useCallback(async (key, force = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      if (!force && checkCache(key)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      const result = await queryFn(abortControllerRef.current.signal);

      // Only update if request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setData(result);
        queryCache.set(key, result);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
        console.error('[useCachedQuery] Query error:', err);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [checkCache, queryFn]);

  // Initial fetch
  useEffect(() => {
    if (!enabled || !queryKey) return;

    executeQuery(queryKey);
  }, [queryKey, enabled, executeQuery]);

  // Refetch function
  const refetch = useCallback(() => {
    setIsRefetching(true);
    executeQuery(queryKey, true).finally(() => {
      setIsRefetching(false);
    });
  }, [queryKey, executeQuery]);

  // Invalidate cache
  const invalidate = useCallback((key = queryKey) => {
    queryCache.delete(key);
    if (key === queryKey) {
      setData(null);
    }
  }, [queryKey]);

  // Clear all cache
  const clearCache = useCallback(() => {
    queryCache.clear();
    setData(null);
  }, []);

  // Handle window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cachedData = queryCache.get(queryKey);
      const isStale = cachedData && (Date.now() - cachedData.timestamp > staleTime);

      if (isStale) {
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, staleTime, queryKey, refetch]);

  return {
    data,
    error,
    isLoading: isLoading || isRefetching,
    isRefetching,
    refetch,
    invalidate,
    clearCache,
  };
};

// Utility function to generate cache keys
export const generateCacheKey = (table, filters = {}) => {
  const filterStr = Object.entries(filters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join('|');

  return `${table}|${filterStr}`;
};

// Predefined cache keys for common queries
export const CACHE_KEYS = {
  classes: 'classes',
  students: 'students',
  activities: 'activities',
  user: (userId) => `user_${userId}`,
  classActivities: (classId) => `class_activities_${classId}`,
  studentProfile: (studentId) => `student_profile_${studentId}`,
};

// Query helpers with automatic caching
export const useCachedClasses = (options = {}) => {
  return useCachedQuery(
    CACHE_KEYS.classes,
    async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
    options
  );
};

export const useCachedUser = (userId, options = {}) => {
  return useCachedQuery(
    CACHE_KEYS.user(userId),
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    options
  );
};

export const useCachedClassActivities = (classId, options = {}) => {
  return useCachedQuery(
    CACHE_KEYS.classActivities(classId),
    async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    { ...options, enabled: !!classId }
  );
};
