import { supabase } from '@/shared/services/supabaseClient';
import monitoringService from '@/shared/services/monitoring';

/**
 * Enhanced Notification Service with Real-time Support
 * Handles notifications, preferences, and real-time delivery
 */
export class EnhancedNotificationService {
  constructor() {
    this.subscriptions = new Map();
    this.realtimeChannels = new Map();
    this.notificationQueue = [];
    this.isProcessingQueue = false;
    this.maxRetries = 3;
    this.retryDelay = 1000;

    this.initializeRealtimeSubscriptions();
    this.startQueueProcessor();
  }

  /**
   * Initialize real-time subscriptions for notifications
   */
  async initializeRealtimeSubscriptions() {
    try {
      // Subscribe to notification changes for current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            this.handleNewNotification(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            this.handleNotificationUpdate(payload.new);
          }
        )
        .subscribe();

      this.realtimeChannels.set(`notifications:${user.id}`, channel);

      monitoringService.recordUserInteraction('realtime_notifications_subscribed', 'notifications');
    } catch (error) {
      monitoringService.recordError(error, { context: 'notification_realtime_setup' });
    }
  }

  /**
   * Handle new notification received via real-time
   */
  handleNewNotification(notification) {
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      this.showBrowserNotification(notification);
    }

    // Trigger custom event for components to listen
    window.dispatchEvent(new CustomEvent('newNotification', {
      detail: notification
    }));

    // Record metric
    monitoringService.recordBusinessMetric('notification_received', 1, {
      type: notification.type,
      priority: notification.priority,
    });
  }

  /**
   * Handle notification update via real-time
   */
  handleNotificationUpdate(notification) {
    window.dispatchEvent(new CustomEvent('notificationUpdated', {
      detail: notification
    }));
  }

  /**
   * Show browser notification
   */
  showBrowserNotification(notification) {
    try {
      const options = {
        body: notification.message,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: `tamanduai-${notification.id}`,
        requireInteraction: notification.priority === 'urgent',
        silent: notification.priority === 'low',
        data: {
          notificationId: notification.id,
          url: notification.action_url,
        },
      };

      const browserNotification = new Notification(notification.title, options);

      browserNotification.onclick = () => {
        if (notification.action_url) {
          window.open(notification.action_url, '_blank');
        }
        browserNotification.close();
      };

      // Auto-close after 5 seconds for non-urgent notifications
      if (notification.priority !== 'urgent') {
        setTimeout(() => browserNotification.close(), 5000);
      }
    } catch (error) {
      monitoringService.recordError(error, { context: 'browser_notification' });
    }
  }

  /**
   * Send notification with enhanced features
   */
  async sendNotification(notification, userId = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        throw new Error('No user ID provided and no authenticated user');
      }

      // Get user preferences
      const preferences = await this.getUserNotificationPreferences(targetUserId);

      // Check if user wants this type of notification
      const userPreference = preferences.find(
        p => p.notification_type === notification.type &&
             p.channel === 'in_app' &&
             p.enabled
      );

      if (!userPreference) {
        return { skipped: true, reason: 'User disabled this notification type' };
      }

      // Create notification record
      const notificationRecord = {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        category: notification.category || null,
        priority: notification.priority || 'normal',
        reference_id: notification.referenceId || null,
        reference_type: notification.referenceType || null,
        action_url: notification.actionUrl || null,
        metadata: notification.metadata || {},
        user_id: targetUserId,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationRecord])
        .select()
        .single();

      if (error) throw error;

      // Send push notification if enabled and supported
      if (userPreference.channel === 'push' && 'serviceWorker' in navigator) {
        await this.sendPushNotification(data);
      }

      // Send email if enabled
      if (notification.email && preferences.find(p => p.channel === 'email' && p.enabled)) {
        this.addToEmailQueue(data);
      }

      // Record metrics
      monitoringService.recordBusinessMetric('notification_sent', 1, {
        type: notification.type,
        channel: 'in_app',
        priority: notification.priority,
      });

      return data;
    } catch (error) {
      monitoringService.recordError(error, { context: 'send_notification' });
      throw error;
    }
  }

  /**
   * Send push notification via service worker
   */
  async sendPushNotification(notification) {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;

        await registration.showNotification(notification.title, {
          body: notification.message,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: `tamanduai-${notification.id}`,
          data: {
            notificationId: notification.id,
            url: notification.action_url,
          },
        });
      }
    } catch (error) {
      monitoringService.recordError(error, { context: 'push_notification' });
    }
  }

  /**
   * Add notification to email queue
   */
  addToEmailQueue(notification) {
    this.notificationQueue.push({
      type: 'email',
      notification,
      attempts: 0,
      createdAt: new Date(),
    });

    if (!this.isProcessingQueue) {
      this.processEmailQueue();
    }
  }

  /**
   * Process email notification queue
   */
  async processEmailQueue() {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.notificationQueue.length > 0) {
      const item = this.notificationQueue.shift();

      try {
        await this.sendEmailNotification(item.notification);
        monitoringService.recordBusinessMetric('email_notification_sent', 1);
      } catch (error) {
        item.attempts++;

        if (item.attempts < this.maxRetries) {
          // Re-queue with exponential backoff
          setTimeout(() => {
            this.notificationQueue.unshift(item);
          }, this.retryDelay * Math.pow(2, item.attempts - 1));
        } else {
          monitoringService.recordError(error, {
            context: 'email_notification_failed',
            attempts: item.attempts,
          });
        }
      }

      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Send email notification (placeholder for actual email service)
   */
  async sendEmailNotification(notification) {
    // This would integrate with your email service (SendGrid, SES, etc.)
    console.log('Sending email notification:', notification.title);

    // For now, just mark as sent in metadata
    await supabase
      .from('notifications')
      .update({
        metadata: {
          ...notification.metadata,
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        },
      })
      .eq('id', notification.id);
  }

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      monitoringService.recordError(error, { context: 'get_notification_preferences' });
      return [];
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      const preferencesData = preferences.map(pref => ({
        user_id: userId,
        notification_type: pref.type,
        channel: pref.channel,
        enabled: pref.enabled,
        frequency: pref.frequency || 'immediate',
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(preferencesData)
        .select();

      if (error) throw error;

      return data;
    } catch (error) {
      monitoringService.recordError(error, { context: 'update_notification_preferences' });
      throw error;
    }
  }

  /**
   * Get notifications for user with pagination
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        unreadOnly = false,
        type = null,
        category = null,
      } = options;

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      if (type) {
        query = query.eq('type', type);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        notifications: data || [],
        total: count || 0,
        hasMore: (offset + limit) < (count || 0),
      };
    } catch (error) {
      monitoringService.recordError(error, { context: 'get_user_notifications' });
      return { notifications: [], total: 0, hasMore: false };
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds, userId = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        throw new Error('No user ID provided and no authenticated user');
      }

      const updates = {
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('notifications')
        .update(updates)
        .in('id', Array.isArray(notificationIds) ? notificationIds : [notificationIds])
        .eq('user_id', targetUserId)
        .select();

      if (error) throw error;

      // Record metric
      monitoringService.recordBusinessMetric('notifications_marked_read', data?.length || 0);

      return data;
    } catch (error) {
      monitoringService.recordError(error, { context: 'mark_notifications_read' });
      throw error;
    }
  }

  /**
   * Delete notifications
   */
  async deleteNotifications(notificationIds, userId = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        throw new Error('No user ID provided and no authenticated user');
      }

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .in('id', Array.isArray(notificationIds) ? notificationIds : [notificationIds])
        .eq('user_id', targetUserId);

      if (error) throw error;

      // Record metric
      monitoringService.recordBusinessMetric('notifications_deleted', data?.length || 0);

      return data;
    } catch (error) {
      monitoringService.recordError(error, { context: 'delete_notifications' });
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId, timeRange = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeRange);

      const { data, error } = await supabase
        .from('notifications')
        .select('type, priority, is_read, created_at')
        .eq('user_id', userId)
        .gte('created_at', cutoffDate.toISOString());

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        unread: data?.filter(n => !n.is_read).length || 0,
        byType: {},
        byPriority: {},
        recent: data?.slice(0, 5) || [],
      };

      // Aggregate by type and priority
      data?.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      });

      return stats;
    } catch (error) {
      monitoringService.recordError(error, { context: 'get_notification_stats' });
      return {
        total: 0,
        unread: 0,
        byType: {},
        byPriority: {},
        recent: [],
      };
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return { granted: false, reason: 'Not supported' };
    }

    if (Notification.permission === 'granted') {
      return { granted: true };
    }

    if (Notification.permission === 'denied') {
      return { granted: false, reason: 'Denied by user' };
    }

    const permission = await Notification.requestPermission();

    monitoringService.recordBusinessMetric('notification_permission_requested', 1, {
      result: permission,
    });

    return {
      granted: permission === 'granted',
      permission,
    };
  }

  /**
   * Clean up subscriptions and channels
   */
  cleanup() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.realtimeChannels.forEach(channel => channel.unsubscribe());
    this.subscriptions.clear();
    this.realtimeChannels.clear();
  }
}

// Singleton instance
const enhancedNotificationService = new EnhancedNotificationService();

// Request notification permission on module load if not already requested
if (typeof window !== 'undefined' && 'Notification' in window) {
  if (Notification.permission === 'default') {
    // Request permission after a delay to avoid annoying users immediately
    setTimeout(() => {
      enhancedNotificationService.requestNotificationPermission();
    }, 5000);
  }
}

export default enhancedNotificationService;
