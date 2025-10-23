import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRing,
  X,
  Check,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';

/**
 * Enhanced Notification System for TamanduAI
 * Provides real-time notifications with rich interactions
 */

// ============================================
// NOTIFICATION TYPES AND CONFIGURATION
// ============================================

export const [loading, setLoading] = useState(true);
  const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  SYSTEM: 'system',
  ACHIEVEMENT: 'achievement',
  REMINDER: 'reminder',
};

export const NOTIFICATION_POSITIONS = {
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
  TOP_CENTER: 'top-center',
  BOTTOM_CENTER: 'bottom-center',
};

const NOTIFICATION_CONFIG = {
  DEFAULT_DURATION: 5000,
  MAX_NOTIFICATIONS: 10,
  ANIMATION_DURATION: 300,
  SOUND_ENABLED: true,
  VIBRATION_ENABLED: false,
};

// ============================================
// NOTIFICATION MANAGER
// ============================================

/**
 * Notification Manager Class
 * Handles notification lifecycle and storage
 */
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.listeners = new Set();
    this.soundEnabled = NOTIFICATION_CONFIG.SOUND_ENABLED;
    this.vibrationEnabled = NOTIFICATION_CONFIG.VIBRATION_ENABLED;
  }

  // Subscribe to notification changes
  subscribe(callback) {
    this.listeners.add(callback);
  return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notify() {
    this.listeners.forEach(callback => callback([...this.notifications]));
  }

  // Add notification
  add(notification) {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = {
      id,
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    this.notifications.unshift(newNotification);

    // Limit notifications
    if (this.notifications.length > NOTIFICATION_CONFIG.MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(0, NOTIFICATION_CONFIG.MAX_NOTIFICATIONS);
    }

    this.notify();

    // Play sound and vibration
    this.playNotificationSound(notification.type);
    this.triggerVibration(notification.priority);

    // Auto-remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        this.remove(id);
      }, notification.duration || NOTIFICATION_CONFIG.DEFAULT_DURATION);
    }

    return id;
  }

  // Remove notification
  remove(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notify();
  }

  // Mark as read
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notify();
    }
  }

  // Mark all as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notify();
  }

  // Clear all notifications
  clearAll() {
    this.notifications = [];
    this.notify();
  }

  // Get unread count
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Play notification sound
  playNotificationSound(type) {
    if (!this.soundEnabled) return;

    // Different sounds for different types
    const sounds = {
      [NOTIFICATION_TYPES.SUCCESS]: '/sounds/success.mp3',
      [NOTIFICATION_TYPES.ERROR]: '/sounds/error.mp3',
      [NOTIFICATION_TYPES.WARNING]: '/sounds/warning.mp3',
      [NOTIFICATION_TYPES.INFO]: '/sounds/info.mp3',
    };

    const soundFile = sounds[type];
    if (soundFile && 'Audio' in window) {
      try {
        const audio = new Audio(soundFile);
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio play errors (browser policies)
        });
      } catch (error) {
        console.warn('Error playing notification sound:', error);
      }
    }
  }

  // Trigger vibration
  triggerVibration(priority) {
    if (!this.vibrationEnabled || !('vibrate' in navigator)) return;

    const patterns = {
      low: [100],
      normal: [200],
      high: [300, 100, 300],
      urgent: [500, 100, 500, 100, 500],
    };

    const pattern = patterns[priority] || patterns.normal;
    navigator.vibrate(pattern);
  }

  // Update settings
  updateSettings(settings) {
    this.soundEnabled = settings.sound ?? this.soundEnabled;
    this.vibrationEnabled = settings.vibration ?? this.vibrationEnabled;
  }
}

// Global notification manager instance
export const notificationManager = new NotificationManager();

// ============================================
// NOTIFICATION HOOKS
// ============================================

/**
 * Hook for using notifications in components
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const addNotification = useCallback((notification) => {
    return notificationManager.add(notification);
  }, []);

  const removeNotification = useCallback((id) => {
    notificationManager.remove(id);
  }, []);

  const markAsRead = useCallback((id) => {
    notificationManager.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationManager.markAllAsRead();
  }, []);

  const clearAll = useCallback(() => {
    notificationManager.clearAll();
  }, []);

  const unreadCount = useMemo(() => {
    return notificationManager.getUnreadCount();
  }, [notifications]);

  return {
    notifications,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    unreadCount,
  };
};

/**
 * Hook for notification settings
 */
export const useNotificationSettings = () => {
  const [settings, setSettings] = useState({
    sound: NOTIFICATION_CONFIG.SOUND_ENABLED,
    vibration: NOTIFICATION_CONFIG.VIBRATION_ENABLED,
    position: NOTIFICATION_POSITIONS.BOTTOM_RIGHT,
    duration: NOTIFICATION_CONFIG.DEFAULT_DURATION,
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('notification-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Error loading notification settings:', error);
      }
    }
  }, []);

  const updateSettings = useCallback((newSettings) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('notification-settings', JSON.stringify(updatedSettings));
    notificationManager.updateSettings(updatedSettings);
  }, [settings]);

  return { settings, updateSettings };
};

// ============================================
// NOTIFICATION COMPONENTS
// ============================================

/**
 * Individual Notification Item
 */
export const NotificationItem = ({
  notification,
  onClose,
  onMarkAsRead,
  compact = false,
}) => {
  const {
    id,
    title,
    message,
    type,
    priority = 'normal',
    timestamp,
    actions,
    icon: Icon,
  } = notification;

  const getNotificationStyles = () => {
    const styles = {
      [NOTIFICATION_TYPES.SUCCESS]: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
      [NOTIFICATION_TYPES.ERROR]: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
      [NOTIFICATION_TYPES.WARNING]: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
      [NOTIFICATION_TYPES.INFO]: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-muted/30 dark:border-blue-800 dark:text-blue-200',
      [NOTIFICATION_TYPES.SYSTEM]: 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200',
    };

    return styles[type] || styles[NOTIFICATION_TYPES.INFO];
  };

  const getNotificationIcon = () => {
    if (Icon) return <Icon className="w-5 h-5" />;

    const icons = {
      [NOTIFICATION_TYPES.SUCCESS]: <CheckCircle className="w-5 h-5 text-green-600" />,
      [NOTIFICATION_TYPES.ERROR]: <XCircle className="w-5 h-5 text-red-600" />,
      [NOTIFICATION_TYPES.WARNING]: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
      [NOTIFICATION_TYPES.INFO]: <Info className="w-5 h-5 text-blue-600" />,
      [NOTIFICATION_TYPES.SYSTEM]: <Settings className="w-5 h-5 text-gray-600" />,
    };

    return icons[type] || <Bell className="w-5 h-5 text-gray-600" />;
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;

    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return timestamp.toLocaleDateString();
  };

  if (compact) {
  return (
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border mb-2',
          getNotificationStyles()
        )}
      >
        {getNotificationIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs opacity-75 truncate">{message}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs opacity-60">{formatTimestamp(timestamp)}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onClose(id)}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      className={cn(
        'p-4 rounded-lg border shadow-sm mb-3',
        getNotificationStyles()
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getNotificationIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="text-sm font-semibold">{title}</h4>
              <p className="text-sm mt-1 opacity-90">{message}</p>
              <p className="text-xs mt-2 opacity-60">
                {formatTimestamp(timestamp)}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAsRead(id)}
                  className="h-6 w-6 p-0"
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onClose(id)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          {actions && actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={action.onClick}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Notification Container
 */
export const NotificationContainer = ({
  position = NOTIFICATION_POSITIONS.BOTTOM_RIGHT,
  maxHeight = 400,
}) => {
  const { notifications, removeNotification, markAsRead } = useNotifications();

  const positionStyles = useMemo(() => {
    const positions = {
      [NOTIFICATION_POSITIONS.TOP_LEFT]: 'top-4 left-4',
      [NOTIFICATION_POSITIONS.TOP_RIGHT]: 'top-4 right-4',
      [NOTIFICATION_POSITIONS.BOTTOM_LEFT]: 'bottom-4 left-4',
      [NOTIFICATION_POSITIONS.BOTTOM_RIGHT]: 'bottom-4 right-4',
      [NOTIFICATION_POSITIONS.TOP_CENTER]: 'top-4 left-1/2 transform -translate-x-1/2',
      [NOTIFICATION_POSITIONS.BOTTOM_CENTER]: 'bottom-4 left-1/2 transform -translate-x-1/2',
    };
    return positions[position] || positions[NOTIFICATION_POSITIONS.BOTTOM_RIGHT];
  }, [position]);
  return (
    <div className={cn(
      'fixed z-50 w-96 max-w-sm',
      positionStyles
    )}>
      <ScrollArea style={{ height: maxHeight }}>
        <div className="p-2">
          <AnimatePresence mode="popLayout">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={removeNotification}
                onMarkAsRead={markAsRead}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};

/**
 * Notification Bell Button
 */
export const NotificationBell = ({
  className,
  showBadge = true,
  onClick,
}) => {
  const { unreadCount } = useNotifications();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      onClick={onClick}
    >
      <Bell className="w-5 h-5" />
      {showBadge && unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

/**
 * Notification Settings Panel
 */
export const NotificationSettings = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings } = useNotificationSettings();

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background rounded-lg shadow-xl p-6 w-96 max-w-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Configurações de Notificação</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span>Som</span>
            </div>
            <Button
              variant={settings.sound ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSettings({ sound: !settings.sound })}
            >
              {settings.sound ? 'Ligado' : 'Desligado'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4" />
              <span>Vibração</span>
            </div>
            <Button
              variant={settings.vibration ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSettings({ vibration: !settings.vibration })}
            >
              {settings.vibration ? 'Ligado' : 'Desligado'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// NOTIFICATION UTILITIES
// ============================================

/**
 * Show a toast notification
 */
export const showNotification = (type, title, message, options = {}) => {
  return notificationManager.add({
    type,
    title,
    message,
    priority: options.priority || 'normal',
    duration: options.duration || NOTIFICATION_CONFIG.DEFAULT_DURATION,
    actions: options.actions || [],
    icon: options.icon,
  });
};

/**
 * Show success notification
 */
export const showSuccess = (title, message, options = {}) => {
  return showNotification(NOTIFICATION_TYPES.SUCCESS, title, message, options);
};

/**
 * Show error notification
 */
export const showError = (title, message, options = {}) => {
  return showNotification(NOTIFICATION_TYPES.ERROR, title, message, {
    ...options,
    priority: 'high',
  });
};

/**
 * Show warning notification
 */
export const showWarning = (title, message, options = {}) => {
  return showNotification(NOTIFICATION_TYPES.WARNING, title, message, options);
};

/**
 * Show info notification
 */
export const showInfo = (title, message, options = {}) => {
  return showNotification(NOTIFICATION_TYPES.INFO, title, message, options);
};

