import { createContext, useContext, useState, useCallback } from 'react';

// Simple cache context without external dependencies
const CacheContext = createContext();

// Cache hook for simple state management
export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

// Simple cache implementation
const createSimpleCache = () => {
  const cache = new Map();
  const subscribers = new Map();

  return {
    get: (key) => cache.get(key),
    set: (key, value, ttl = 5 * 60 * 1000) => { // 5 minutes default TTL
      cache.set(key, {
        value,
        timestamp: Date.now(),
        ttl
      });

      // Notify subscribers
      const keySubscribers = subscribers.get(key) || [];
      keySubscribers.forEach(callback => callback(value));
    },
    delete: (key) => {
      cache.delete(key);
      subscribers.delete(key);
    },
    clear: () => {
      cache.clear();
      subscribers.clear();
    },
    subscribe: (key, callback) => {
      if (!subscribers.has(key)) {
        subscribers.set(key, []);
      }
      subscribers.get(key).push(callback);

      // Return unsubscribe function
      return () => {
        const keySubscribers = subscribers.get(key) || [];
        const index = keySubscribers.indexOf(callback);
        if (index > -1) {
          keySubscribers.splice(index, 1);
        }
      };
    },
    // Check if item is expired
    isExpired: (key) => {
      const item = cache.get(key);
      if (!item) return true;
      return Date.now() - item.timestamp > item.ttl;
    }
  };
};

// Query keys for consistent caching (keeping the same interface)
export const QUERY_KEYS = {
  // User related
  userProfile: (userId) => ['userProfile', userId],
  userActivities: (userId) => ['userActivities', userId],

  // Classes
  classes: () => ['classes'],
  classDetails: (classId) => ['classDetails', classId],
  classStudents: (classId) => ['classStudents', classId],
  classActivities: (classId) => ['classActivities', classId],

  // Students
  students: () => ['students'],
  studentProfile: (studentId) => ['studentProfile', studentId],
  studentActivities: (studentId) => ['studentActivities', studentId],

  // Activities
  activities: () => ['activities'],
  activityDetails: (activityId) => ['activityDetails', activityId],
  activitySubmissions: (activityId) => ['activitySubmissions', activityId],

  // Notifications
  notifications: () => ['notifications'],
  unreadNotificationsCount: () => ['unreadNotificationsCount'],
};

export const SmartCacheProvider = ({ children }) => {
  const [cache] = useState(createSimpleCache);

  const invalidateQueries = useCallback((queryKey) => {
    if (Array.isArray(queryKey)) {
      // Invalidate all queries that start with this key pattern
      for (const [key] of cache.entries()) {
        if (Array.isArray(key) && key.length >= queryKey.length) {
          let matches = true;
          for (let i = 0; i < queryKey.length; i++) {
            if (key[i] !== queryKey[i]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            cache.delete(key);
          }
        }
      }
    } else {
      cache.delete(queryKey);
    }
  }, [cache]);

  const getQueryData = useCallback((queryKey) => {
    const data = cache.get(queryKey);
    if (data && !cache.isExpired(queryKey)) {
      return data.value;
    }
    return undefined;
  }, [cache]);

  const setQueryData = useCallback((queryKey, data, ttl) => {
    cache.set(queryKey, data, ttl);
  }, [cache]);

  const value = {
    cache,
    invalidateQueries,
    getQueryData,
    setQueryData,
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
};

export default SmartCacheProvider;
