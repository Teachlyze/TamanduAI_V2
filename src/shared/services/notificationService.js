import { supabase } from '@/shared/services/supabaseClient';
import { 
  createAndSendNotification,
  processNotificationsBatch 
} from '@/shared/services/edgeFunctions';

/**
 * Notification Service
 * Handles all notification-related operations
 */
class NotificationService {
  // ============================================
  // CONSTANTS & CONFIGURATION
  // ============================================

  static NotificationType = Object.freeze({
    EVENT: 'event',
    ASSIGNMENT: 'assignment',
    ANNOUNCEMENT: 'announcement',
    SYSTEM: 'system',
    FEEDBACK: 'feedback',
    REMINDER: 'reminder'
  });

  static NotificationPriority = Object.freeze({
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
  });

  static NotificationCategory = Object.freeze({
    // General
    SYSTEM_UPDATE: 'system_update',
    ACCOUNT: 'account',

    // Academic
    COURSE: 'course',
    ASSIGNMENT: 'assignment',
    EXAM: 'exam',
    GRADE: 'grade',

    // Social
    MENTION: 'mention',
    COMMENT: 'comment',
    MESSAGE: 'message',

    // Administrative
    ANNOUNCEMENT: 'announcement',
    REMINDER: 'reminder',
    ALERT: 'alert',
    
    // Plagiarism & AI Detection
    PLAGIARISM_ALERT: 'plagiarism_alert',
    AI_DETECTION: 'ai_detection'
  });

  /**
   * Send multiple notifications in batch using Edge Functions
   * @param {Array<Object>} notifications - Array of notifications to send
   * @returns {Promise<Object>} - Result of batch operation
   */
  static async sendNotificationsBatch(notifications) {
    try {
      const result = await processNotificationsBatch(notifications);
      return result;
    } catch (error) {
      console.error('Error sending notifications in batch:', error);
      throw error;
    }
  }

  static NotificationStatus = Object.freeze({
    UNREAD: 'unread',
    READ: 'read',
    ARCHIVED: 'archived'
  });

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Sleep utility for retry delays
   */
  static sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Retry wrapper for Supabase operations
   */
  static withRetry = async (operation, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;
        await NotificationService.sleep(1000 * (i + 1)); // Exponential backoff
      }
    }
  };

  // ============================================
  // NOTIFICATION OPERATIONS
  // ============================================

  /**
   * Get notifications for the current user
   * @param {Object} options - Query options
   * @param {boolean} options.unreadOnly - Return only unread notifications
   * @param {number} options.limit - Maximum number of notifications to return
   * @param {number} options.offset - Offset for pagination
   * @param {string} options.type - Filter by notification type
   * @param {string} options.category - Filter by notification category
   * @returns {Promise<Array>} - Array of notifications
   */
  static async getNotifications({
    unreadOnly = false,
    limit = 50,
    offset = 0,
    type = null,
    category = null
  } = {}) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const userId = userData.user?.id;
    if (!userId) throw new Error('No user is currently signed in');

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

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  }

  /**
   * Mark one or more notifications as read
   * @param {string|string[]} notificationIds - Single ID or array of notification IDs
   * @param {Object} options - Additional options
   * @param {string} options.userId - Optional user ID for security check
   * @returns {Promise<{success: boolean, message: string, affected: number}>} - Result of the operation
   */
  static async markAsRead(notificationIds, { userId } = {}) {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

    try {
      let query = supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', ids);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        message: 'Notifications marked as read successfully',
        affected: data?.length || 0
      };

    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return {
        success: false,
        message: error.message,
        affected: 0
      };
    }
  }

  /**
   * Mark all notifications as read
   * @returns {Promise<boolean>} - True if successful
   */
  static async markAllAsRead() {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    return true;
  }

  /**
   * Delete one or more notifications
   * @param {string|string[]} notificationIds - Single ID or array of notification IDs to delete
   * @param {Object} options - Additional options
   * @param {string} options.userId - Optional user ID for additional security check
   * @returns {Promise<{success: boolean, message: string, deleted: number}>} - Result of the operation
   */
  static async deleteNotification(notificationIds, { userId } = {}) {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

    try {
      let query = supabase
        .from('notifications')
        .delete()
        .in('id', ids);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        message: 'Notifications deleted successfully',
        deleted: data?.length || 0
      };

    } catch (error) {
      console.error('Error deleting notifications:', error);
      return {
        success: false,
        message: error.message,
        deleted: 0
      };
    }
  }

  /**
   * Send a notification immediately using Edge Functions
   * @param {Object} notification - The notification to send
   * @param {string} notification.title - Notification title
   * @param {string} notification.message - Notification message
   * @param {string} notification.type - Notification type (from NotificationType)
   * @param {string} notification.category - Notification category (from NotificationCategory)
   * @param {string} notification.priority - Priority level (from NotificationPriority)
   * @param {string} notification.referenceId - ID of the referenced item
   * @param {string} notification.referenceType - Type of the referenced item
   * @param {string} notification.actionUrl - URL to navigate to when clicked
   * @param {Object} notification.metadata - Additional metadata for the notification
   * @param {string} userId - Optional user ID (defaults to current user)
   * @returns {Promise<Object>} - The created notification
   */
  static async sendNotification({
    title,
    message,
    type,
    category,
    priority = NotificationService.NotificationPriority.NORMAL,
    referenceId,
    referenceType,
    actionUrl,
    metadata = {}
  }, userId = null) {
    // Validate type
    if (!Object.values(NotificationService.NotificationType).includes(type)) {
      throw new Error(`Invalid notification type: ${type}`);
    }

    // Validate priority
    if (priority && !Object.values(NotificationService.NotificationPriority).includes(priority)) {
      throw new Error(`Invalid priority: ${priority}`);
    }

    if (!userId) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      userId = userData.user?.id;
      if (!userId) throw new Error('No user is currently signed in');
    }

    // Usar Edge Function para criar e enviar notificação
    const notificationData = {
      type,
      title,
      message,
      data: {
        category: category || null,
        priority,
        referenceId: referenceId || null,
        referenceType: referenceType || null,
        actionUrl: actionUrl || null,
        ...metadata
      }
    };

    try {
      const result = await createAndSendNotification(userId, notificationData);
      return result;
    } catch (error) {
      console.error('Error using Edge Function, falling back to direct insert:', error);
      
      // Fallback: inserir diretamente no banco
      const { data, error: insertError } = await supabase
        .from('notifications')
        .insert({
          ...notificationData,
          user_id: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    }
  }

  /**
   * Get the count of unread notifications
   * @returns {Promise<number>} - Count of unread notifications
   */
  static async getUnreadCount() {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const userId = userData.user?.id;
    if (!userId) return 0;

    // Use GET-based approach to avoid HEAD issues under strict RLS
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('is_read', false)
      .range(0, 999);

    if (error) throw error;

    return data?.length || 0;
  }

  /**
   * Subscribe to real-time notifications
   * @param {Function} callback - Function to call when a new notification is received
   * @returns {Function} - Function to unsubscribe
   */
  static async subscribeToNotifications(callback) {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return { unsubscribe: () => {} };
    }

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (typeof callback === 'function') {
            callback(payload.new);
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        try { supabase.removeChannel(subscription); } catch (e) { /* noop */ }
      }
    };
  }

  async subscribeToNotifications(callback) {
    return await NotificationService.subscribeToNotifications(callback);
  }

  // Instance wrappers for compatibility with default instance export
  async getNotifications(options = {}) {
    const data = await NotificationService.getNotifications(options);
    return { data };
  }

  async markAsRead(notificationIds, opts = {}) {
    return await NotificationService.markAsRead(notificationIds, opts);
  }

  async deleteNotification(notificationIds, opts = {}) {
    return await NotificationService.deleteNotification(notificationIds, opts);
  }

  async markAllAsRead() {
    return await NotificationService.markAllAsRead();
  }

  async getUnreadCount() {
    return await NotificationService.getUnreadCount();
  }

  async sendNotification(payload, userId = null) {
    return await NotificationService.sendNotification(payload, userId);
  }
}

export default new NotificationService();
