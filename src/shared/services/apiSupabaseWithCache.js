// src/services/apiSupabaseWithCache.js
import { supabase } from '@/shared/services/supabaseClient';

// Enhanced API service with client-side caching
class CachedSupabaseService {
  constructor() {
    this.supabase = supabase;
    this.cache = new Map();
    this.expiry = new Map();
  }

  // Helper methods for cache management
  getCacheKey(prefix, ...params) {
    return `${prefix}:${params.join(':')}`;
  }

  isExpired(key) {
    const expiry = this.expiry.get(key);
    return expiry && Date.now() > expiry;
  }

  getFromCache(key) {
    if (this.isExpired(key)) {
      this.cache.delete(key);
      this.expiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  setInCache(key, value, ttlSeconds) {
    this.cache.set(key, value);
    if (ttlSeconds) {
      this.expiry.set(key, Date.now() + (ttlSeconds * 1000));
    }
  }

  // Get current user with cache
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }

  // Get user profile with cache
  async getUserProfile(userId) {
    const cacheKey = this.getCacheKey('user:profile', userId);

    try {
      // Try cache first
      const cachedProfile = this.getFromCache(cacheKey);
      if (cachedProfile) {
        return cachedProfile;
      }

      // Fetch from API
      const response = await fetch(`/api/user/profile/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user profile');
      const data = await response.json();

      // Cache the result
      this.setInCache(cacheKey, data, 30 * 60); // 30 minutes

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Get user classes with cache
  async getUserClasses(userId, role = 'student') {
    const cacheKey = this.getCacheKey('user:classes', userId, role);

    try {
      // Try cache first
      const cachedClasses = this.getFromCache(cacheKey);
      if (cachedClasses) {
        return cachedClasses;
      }

      // Fetch from API
      const response = await fetch(`/api/user/classes/${userId}?role=${role}`);
      if (!response.ok) throw new Error('Failed to fetch user classes');
      const data = await response.json();

      // Cache the result
      this.setInCache(cacheKey, data || [], 10 * 60); // 10 minutes

      return data || [];
    } catch (error) {
      console.error('Error fetching user classes:', error);
      throw error;
    }
  }

  // Get class activities with cache
  async getClassActivities(classId) {
    const cacheKey = this.getCacheKey('class:activities', classId);

    try {
      // Try cache first
      const cachedActivities = this.getFromCache(cacheKey);
      if (cachedActivities) {
        return cachedActivities;
      }

      // Fetch from API
      const response = await fetch(`/api/classes/${classId}/activities`);
      if (!response.ok) throw new Error('Failed to fetch class activities');
      const data = await response.json();

      // Cache the result
      this.setInCache(cacheKey, data || [], 5 * 60); // 5 minutes

      return data || [];
    } catch (error) {
      console.error('Error fetching class activities:', error);
      throw error;
    }
  }

  // Get activity template with cache
  async getActivityTemplate(templateId) {
    const cacheKey = this.getCacheKey('activity:template', templateId);

    try {
      // Try cache first
      const cachedTemplate = this.getFromCache(cacheKey);
      if (cachedTemplate) {
        return cachedTemplate;
      }

      // Fetch from API
      const response = await fetch(`/api/activities/template/${templateId}`);
      if (!response.ok) throw new Error('Failed to fetch activity template');
      const data = await response.json();

      // Cache the result
      this.setInCache(cacheKey, data, 15 * 60); // 15 minutes

      return data;
    } catch (error) {
      console.error('Error fetching activity template:', error);
      throw error;
    }
  }

  // Get user meetings with cache
  async getUserMeetings(userId) {
    const cacheKey = this.getCacheKey('user:meetings', userId);

    try {
      // Try cache first
      const cachedMeetings = this.getFromCache(cacheKey);
      if (cachedMeetings) {
        return cachedMeetings;
      }

      // Fetch from API
      const response = await fetch(`/api/user/meetings/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user meetings');
      const data = await response.json();

      // Cache the result
      this.setInCache(cacheKey, data || [], 10 * 60); // 10 minutes

      return data || [];
    } catch (error) {
      console.error('Error fetching user meetings:', error);
      throw error;
    }
  }

  // Get class students with cache
  async getClassStudents(classId) {
    const cacheKey = this.getCacheKey('class:students', classId);

    try {
      // Try cache first
      const cachedStudents = this.getFromCache(cacheKey);
      if (cachedStudents) {
        return cachedStudents;
      }

      // Fetch from API
      const response = await fetch(`/api/classes/${classId}/students`);
      if (!response.ok) throw new Error('Failed to fetch class students');
      const data = await response.json();

      // Cache the result
      this.setInCache(cacheKey, data || [], 10 * 60); // 10 minutes

      return data || [];
    } catch (error) {
      console.error('Error fetching class students:', error);
      throw error;
    }
  }

  // Get notifications with cache
  async getUserNotifications(userId, limit = 20) {
    const cacheKey = this.getCacheKey('notifications', userId, limit);

    try {
      // Try cache first
      const cachedNotifications = this.getFromCache(cacheKey);
      if (cachedNotifications) {
        return cachedNotifications;
      }

      // Fetch from API
      const response = await fetch(`/api/notifications/${userId}?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();

      // Cache the result
      this.setInCache(cacheKey, data || [], 5 * 60); // 5 minutes

      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Get class statistics with cache
  async getClassStatistics(classId) {
    const cacheKey = this.getCacheKey('class:statistics', classId);

    try {
      // Try cache first
      const cachedStats = this.getFromCache(cacheKey);
      if (cachedStats) {
        return cachedStats;
      }

      // Fetch from API
      const response = await fetch(`/api/classes/${classId}/statistics`);
      if (!response.ok) throw new Error('Failed to fetch class statistics');
      const data = await response.json();

      // Cache the result
      this.setInCache(cacheKey, data || {}, 60 * 60); // 1 hour

      return data || {};
    } catch (error) {
      console.error('Error fetching class statistics:', error);
      throw error;
    }
  }

  // Get student performance summary with cache
  async getStudentPerformanceSummary(studentId) {
    const cacheKey = this.getCacheKey('student:performance', studentId);

    try {
      // Try cache first
      const cachedPerformance = this.getFromCache(cacheKey);
      if (cachedPerformance) {
        return cachedPerformance;
      }

      // Fetch from API
      const response = await fetch(`/api/students/${studentId}/performance`);
      if (!response.ok) throw new Error('Failed to fetch student performance');
      const data = await response.json();

      // Cache the result
      this.setInCache(cacheKey, data || [], 60 * 60); // 1 hour

      return data || [];
    } catch (error) {
      console.error('Error fetching student performance:', error);
      throw error;
    }
  }

  // Get activity submissions with cache
  async getActivitySubmissions(activityId) {
    const cacheKey = this.getCacheKey('activity:submissions', activityId);

    try {
      // Try cache first
      const cachedSubmissions = this.getFromCache(cacheKey);
      if (cachedSubmissions) {
        return cachedSubmissions;
      }

      // Fetch from API
      const response = await fetch(`/api/activities/${activityId}/submissions`);
      if (!response.ok) throw new Error('Failed to fetch activity submissions');
      const data = await response.json();

      // Cache the result
      this.setInCache(cacheKey, data || [], 15 * 60); // 15 minutes

      return data || [];
    } catch (error) {
      console.error('Error fetching activity submissions:', error);
      throw error;
    }
  }

  // Cache invalidation methods
  invalidateUserCache(userId) {
    // Clear all user-related cache entries
    for (const [key] of this.cache.entries()) {
      if (key.includes(`user:${userId}`)) {
        this.cache.delete(key);
        this.expiry.delete(key);
      }
    }
  }

  invalidateClassCache(classId) {
    // Clear all class-related cache entries
    for (const [key] of this.cache.entries()) {
      if (key.includes(`class:${classId}`)) {
        this.cache.delete(key);
        this.expiry.delete(key);
      }
    }
  }

  invalidateActivityCache(activityId) {
    // Clear all activity-related cache entries
    for (const [key] of this.cache.entries()) {
      if (key.includes(`activity:${activityId}`)) {
        this.cache.delete(key);
        this.expiry.delete(key);
      }
    }
  }

  invalidateMeetingCache(meetingId) {
    // Clear all meeting-related cache entries
    for (const [key] of this.cache.entries()) {
      if (key.includes(`meeting:${meetingId}`)) {
        this.cache.delete(key);
        this.expiry.delete(key);
      }
    }
  }

  // Health check
  async healthCheck() {
    try {
      return {
        service: 'Supabase with Client Cache',
        status: 'healthy',
        cacheType: 'client-side',
        cacheSize: this.cache.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'Supabase with Client Cache',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const cachedSupabase = new CachedSupabaseService();
export default cachedSupabase;
