/**
 * Notification types for the application
 * These are used to categorize different types of notifications
 * and provide consistent type checking throughout the app
 */

export const NOTIFICATION_TYPES = {
  // Meeting related notifications
  MEETING_CREATED: 'meeting_created',
  MEETING_UPDATED: 'meeting_updated',
  MEETING_CANCELLED: 'meeting_cancelled',
  MEETING_REMINDER: 'meeting_reminder',
  MEETING_STARTING_SOON: 'meeting_starting_soon',
  
  // Assignment related notifications
  ASSIGNMENT_CREATED: 'assignment_created',
  ASSIGNMENT_UPDATED: 'assignment_updated',
  ASSIGNMENT_DELETED: 'assignment_deleted',
  ASSIGNMENT_SUBMITTED: 'assignment_submitted',
  ASSIGNMENT_GRADED: 'assignment_graded',
  ASSIGNMENT_DEADLINE: 'assignment_deadline',
  
  // System notifications
  SYSTEM_ALERT: 'system_alert',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_UPDATE: 'system_update',
  
  // User related notifications
  USER_MENTION: 'user_mention',
  USER_MESSAGE: 'user_message',
  USER_FOLLOW: 'user_follow',
  
  // Class related notifications
  CLASS_INVITE: 'class_invite',
  CLASS_UPDATE: 'class_update',
  CLASS_CANCELLED: 'class_cancelled',
};

/**
 * Notification categories for grouping similar types of notifications
 */
export const NOTIFICATION_CATEGORIES = {
  MEETING: 'meeting',
  ASSIGNMENT: 'assignment',
  SYSTEM: 'system',
  USER: 'user',
  CLASS: 'class'
};

/**
 * Notification priorities for sorting and display
 */
export const NOTIFICATION_PRIORITIES = {
  URGENT: 'urgent',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
};

/**
 * Default notification settings for new users
 */
export const DEFAULT_NOTIFICATION_SETTINGS = {
  // Email notifications
  email: {
    meeting: true,
    assignment: true,
    system: true,
    user: true,
    class: true,
  },
  
  // Push notifications
  push: {
    meeting: true,
    assignment: true,
    system: true,
    user: true,
    class: true,
  },
  
  // In-app notifications
  inApp: {
    meeting: true,
    assignment: true,
    system: true,
    user: true,
    class: true,
  },
};

/**
 * Notification icons for different types
 */
export const NOTIFICATION_ICONS = {
  // Meeting icons
  [NOTIFICATION_TYPES.MEETING_CREATED]: 'calendar-plus',
  [NOTIFICATION_TYPES.MEETING_UPDATED]: 'calendar-edit',
  [NOTIFICATION_TYPES.MEETING_CANCELLED]: 'calendar-x',
  [NOTIFICATION_TYPES.MEETING_REMINDER]: 'bell',
  [NOTIFICATION_TYPES.MEETING_STARTING_SOON]: 'clock',
  
  // Assignment icons
  [NOTIFICATION_TYPES.ASSIGNMENT_CREATED]: 'file-plus',
  [NOTIFICATION_TYPES.ASSIGNMENT_UPDATED]: 'file-edit',
  [NOTIFICATION_TYPES.ASSIGNMENT_DELETED]: 'file-x',
  [NOTIFICATION_TYPES.ASSIGNMENT_SUBMITTED]: 'upload',
  [NOTIFICATION_TYPES.ASSIGNMENT_GRADED]: 'award',
  [NOTIFICATION_TYPES.ASSIGNMENT_DEADLINE]: 'alert-circle',
  
  // System icons
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: 'alert-triangle',
  [NOTIFICATION_TYPES.SYSTEM_MAINTENANCE]: 'tool',
  [NOTIFICATION_TYPES.SYSTEM_UPDATE]: 'refresh-cw',
  
  // User icons
  [NOTIFICATION_TYPES.USER_MENTION]: 'at-sign',
  [NOTIFICATION_TYPES.USER_MESSAGE]: 'message-square',
  [NOTIFICATION_TYPES.USER_FOLLOW]: 'user-plus',
  
  // Class icons
  [NOTIFICATION_TYPES.CLASS_INVITE]: 'users',
  [NOTIFICATION_TYPES.CLASS_UPDATE]: 'edit-2',
  [NOTIFICATION_TYPES.CLASS_CANCELLED]: 'x-octagon',
};

/**
 * Notification colors for different priorities
 */
export const NOTIFICATION_COLORS = {
  [NOTIFICATION_PRIORITIES.URGENT]: 'red',
  [NOTIFICATION_PRIORITIES.HIGH]: 'orange',
  [NOTIFICATION_PRIORITIES.NORMAL]: 'blue',
  [NOTIFICATION_PRIORITIES.LOW]: 'gray',
};
