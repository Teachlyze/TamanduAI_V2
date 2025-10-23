// src/components/ui/EnhancedNotifications.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
} from 'lucide-react';

/**
 * Sistema de notificações visuais aprimorado
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);

  // Gerenciar notificações
  const showNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      position: 'top-right',
      closable: true,
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remover após duração
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Tipos de notificação predefinidos
  const showSuccess = (message, options = {}) => {
    return showNotification({
      type: 'success',
      message,
      icon: CheckCircle,
      ...options,
    });
  };

  const showError = (message, options = {}) => {
    return showNotification({
      type: 'error',
      message,
      icon: AlertCircle,
      duration: 0, // Permanente para erros
      ...options,
    });
  };

  const showWarning = (message, options = {}) => {
    return showNotification({
      type: 'warning',
      message,
      icon: AlertTriangle,
      ...options,
    });
  };

  const showInfo = (message, options = {}) => {
    return showNotification({
      type: 'info',
      message,
      icon: Info,
      ...options,
    });
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      showNotification,
      removeNotification,
      clearAll,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      isEnabled,
      setIsEnabled,
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

/**
 * Contexto para notificações
 */
const NotificationContext = React.createContext();

/**
 * Hook para usar notificações
 */
export const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

/**
 * Container de notificações
 */
const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();

  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Object.entries(positions).map(([position, classes]) => (
        <div key={position} className={`absolute ${classes}`}>
          <div className="flex flex-col gap-2 max-w-sm">
            <AnimatePresence>
              {notifications
                .filter(n => n.position === position)
                .map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClose={() => removeNotification(notification.id)}
                  />
                ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Item individual de notificação
 */
const NotificationItem = ({ notification, onClose }) => {
  const { type, title, message, icon: Icon, closable, actions } = notification;

  const types = {
    success: {
      bg: 'bg-success/10',
      border: 'border-success',
      text: 'text-success',
      iconBg: 'bg-success/20',
      iconColor: 'text-success',
    },
    error: {
      bg: 'bg-error/10',
      border: 'border-error',
      text: 'text-error',
      iconBg: 'bg-error/20',
      iconColor: 'text-error',
    },
    warning: {
      bg: 'bg-warning/10',
      border: 'border-warning',
      text: 'text-warning',
      iconBg: 'bg-warning/20',
      iconColor: 'text-warning',
    },
    info: {
      bg: 'bg-info/10',
      border: 'border-info',
      text: 'text-info',
      iconBg: 'bg-info/20',
      iconColor: 'text-info',
    },
  };

  const typeConfig = types[type] || types.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
      className={`pointer-events-auto ${typeConfig.bg} ${typeConfig.border} border-l-4 rounded-lg shadow-lg p-4 max-w-sm`}
    >
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className={`${typeConfig.iconBg} ${typeConfig.iconColor} p-2 rounded-full`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-semibold text-sm ${typeConfig.text}`}>
              {title}
            </h4>
          )}
          <p className={`text-sm text-base-content mt-1 ${title ? '' : 'font-medium'}`}>
            {message}
          </p>

          {/* Ações */}
          {actions && actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`btn btn-xs ${action.variant === 'primary' ? 'btn-primary' : 'btn-outline'}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botão de fechar */}
        {closable && (
          <button
            onClick={onClose}
            className="text-base-content/60 hover:text-base-content transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Centro de notificações (notification center)
 */
export const NotificationCenter = ({
  isOpen,
  onClose,
  className = '',
}) => {
  const { notifications, clearAll, removeNotification } = useNotifications();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className={`fixed right-0 top-0 h-full w-80 bg-base-100 shadow-xl z-50 ${className}`}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-base-200">
                <h3 className="font-semibold text-lg">Notificações</h3>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-sm text-base-content/70 hover:text-base-content"
                    >
                      Limpar todas
                    </button>
                  )}
                  <button onClick={onClose}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto p-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-base-content/60">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClose={() => removeNotification(notification.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * Botão de toggle de notificações
 */
export const NotificationToggle = ({
  unreadCount = 0,
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`btn btn-ghost btn-sm relative ${className}`}
    >
      {unreadCount > 0 ? (
        <BellRing className="h-5 w-5" />
      ) : (
        <Bell className="h-5 w-5" />
      )}

      {unreadCount > 0 && (
        <span className="badge badge-error badge-xs absolute -top-1 -right-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

/**
 * Componente de feedback visual para ações
 */
export const ActionFeedback = ({
  isVisible,
  type = 'success',
  message,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const types = {
    success: {
      icon: CheckCircle,
      bg: 'bg-success/10',
      border: 'border-success',
      text: 'text-success',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-error/10',
      border: 'border-error',
      text: 'text-error',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-warning/10',
      border: 'border-warning',
      text: 'text-warning',
    },
    info: {
      icon: Info,
      bg: 'bg-info/10',
      border: 'border-info',
      text: 'text-info',
    },
  };

  const typeConfig = types[type] || types.success;
  const Icon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 ${typeConfig.bg} ${typeConfig.border} border rounded-lg shadow-lg p-4 z-50`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${typeConfig.text}`} />
        <span className={`font-medium ${typeConfig.text}`}>
          {message}
        </span>
        <button
          onClick={onClose}
          className="text-base-content/60 hover:text-base-content"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Hook para feedback de ações
 */
export const useActionFeedback = () => {
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message, duration });

    if (duration > 0) {
      setTimeout(() => {
        setFeedback(null);
      }, duration);
    }
  };

  const hideFeedback = () => {
    setFeedback(null);
  };

  return {
    feedback,
    showFeedback,
    hideFeedback,
    showSuccess: (message, duration) => showFeedback('success', message, duration),
    showError: (message, duration) => showFeedback('error', message, duration),
    showWarning: (message, duration) => showFeedback('warning', message, duration),
    showInfo: (message, duration) => showFeedback('info', message, duration),
  };
};

/**
 * Componente de indicador de status
 */
export const StatusIndicator = ({
  status,
  label,
  size = 'md',
  animated = true,
  className = '',
}) => {
  const sizes = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const statuses = {
    online: 'bg-success',
    offline: 'bg-base-content/30',
    away: 'bg-warning',
    busy: 'bg-error',
    loading: 'bg-primary animate-pulse',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.div
        className={`${sizes[size]} ${statuses[status]} rounded-full`}
        animate={animated ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {label && (
        <span className="text-sm text-base-content/70 capitalize">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * Componente de progresso com feedback visual
 */
export const ProgressWithFeedback = ({
  progress,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'primary',
  className = '',
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progress]);

  const sizes = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const variants = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="font-medium">{label}</span>
          {showPercentage && (
            <span className="text-base-content/70">{Math.round(progress)}%</span>
          )}
        </div>
      )}

      <div className={`${sizes[size]} bg-base-200 rounded-full overflow-hidden`}>
        <motion.div
          className={`${sizes[size]} ${variants[variant]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${animatedProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

/**
 * Componente de badge com estados
 */
export const StatusBadge = ({
  status,
  children,
  variant = 'default',
  size = 'md',
  animated = false,
  className = '',
}) => {
  const statusConfig = {
    active: { color: 'success', label: 'Ativo' },
    inactive: { color: 'base', label: 'Inativo' },
    pending: { color: 'warning', label: 'Pendente' },
    completed: { color: 'success', label: 'Concluído' },
    cancelled: { color: 'error', label: 'Cancelado' },
    draft: { color: 'info', label: 'Rascunho' },
    published: { color: 'success', label: 'Publicado' },
    archived: { color: 'base', label: 'Arquivado' },
  };

  const config = statusConfig[status] || { color: 'base', label: status };

  return (
    <motion.span
      initial={animated ? { scale: 0 } : {}}
      animate={animated ? { scale: 1 } : {}}
      className={`badge badge-${config.color} badge-${size} ${className}`}
    >
      {children || config.label}
    </motion.span>
  );
};

/**
 * Hook para gerenciar estado de loading com feedback
 */
export const useLoadingState = (initialLoading = false) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [loadingMessage, setLoadingMessage] = useState('Carregando...');
  const [progress, setProgress] = useState(0);

  const startLoading = (message = 'Carregando...', initialProgress = 0) => {
    setIsLoading(true);
    setLoadingMessage(message);
    setProgress(initialProgress);
  };

  const updateProgress = (newProgress, newMessage) => {
    setProgress(newProgress);
    if (newMessage) {
      setLoadingMessage(newMessage);
    }
  };

  const stopLoading = () => {
    setIsLoading(false);
    setLoadingMessage('Carregando...');
    setProgress(0);
  };

  return {
    isLoading,
    loadingMessage,
    progress,
    startLoading,
    updateProgress,
    stopLoading,
  };
};

/**
 * Componente de loading com feedback visual
 */
export const LoadingWithFeedback = ({
  isLoading,
  message = 'Carregando...',
  progress,
  variant = 'spinner',
  size = 'md',
  className = '',
}) => {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col items-center justify-center p-8 ${className}`}
    >
      {/* Spinner/Loading animation */}
      <div className={`loading loading-${variant} loading-${size} mb-4`} />

      {/* Message */}
      <p className="text-base-content/70 text-center mb-4">
        {message}
      </p>

      {/* Progress bar se fornecido */}
      {progress !== undefined && (
        <div className="w-full max-w-xs">
          <ProgressWithFeedback
            progress={progress}
            size="sm"
            variant="primary"
          />
        </div>
      )}
    </motion.div>
  );
};

/**
 * Hook para feedback de formulário
 */
export const useFormFeedback = () => {
  const [feedback, setFeedback] = useState({
    type: null,
    message: '',
    field: null,
  });

  const showFieldError = (field, message) => {
    setFeedback({
      type: 'error',
      message,
      field,
    });
  };

  const showFieldSuccess = (field, message) => {
    setFeedback({
      type: 'success',
      message,
      field,
    });
  };

  const showFormSuccess = (message) => {
    setFeedback({
      type: 'success',
      message,
      field: null,
    });
  };

  const showFormError = (message) => {
    setFeedback({
      type: 'error',
      message,
      field: null,
    });
  };

  const clearFeedback = () => {
    setFeedback({
      type: null,
      message: '',
      field: null,
    });
  };

  return {
    feedback,
    showFieldError,
    showFieldSuccess,
    showFormSuccess,
    showFormError,
    clearFeedback,
  };
};

/**
 * Componente de feedback de formulário
 */
export const FormFeedback = ({ feedback, className = '' }) => {
  if (!feedback.type) return null;

  const types = {
    success: {
      icon: CheckCircle,
      bg: 'bg-success/10',
      border: 'border-success',
      text: 'text-success',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-error/10',
      border: 'border-error',
      text: 'text-error',
    },
  };

  const typeConfig = types[feedback.type] || types.error;
  const Icon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${typeConfig.bg} ${typeConfig.border} border rounded-lg p-3 ${className}`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${typeConfig.text}`} />
        <span className={`text-sm ${typeConfig.text}`}>
          {feedback.message}
        </span>
      </div>
    </motion.div>
  );
};
