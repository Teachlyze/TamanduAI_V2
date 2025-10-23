import React from 'react';
import { Toaster, toast as hotToast } from 'react-hot-toast';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Premium Toast Configuration
 */
export const PremiumToaster = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          maxWidth: '420px'
        },
        success: {
          iconTheme: {
            primary: 'hsl(var(--success))',
            secondary: 'white',
          },
        },
        error: {
          iconTheme: {
            primary: 'hsl(var(--destructive))',
            secondary: 'white',
          },
        },
      }}
    />
  );
};

/**
 * Custom Toast Component
 */
const ToastContent = ({ type, title, message, onClose }) => {
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  };

  const colors = {
    success: 'text-success',
    error: 'text-destructive',
    warning: 'text-warning',
    info: 'text-info'
  };

  const bgColors = {
    success: 'bg-success/10',
    error: 'bg-destructive/10',
    warning: 'bg-warning/10',
    info: 'bg-info/10'
  };

  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="flex items-start gap-3 w-full"
    >
      <div className={`w-10 h-10 rounded-xl ${bgColors[type]} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${colors[type]}`} />
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold text-foreground mb-1">
            {title}
          </h4>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
};

/**
 * Premium Toast API
 */
export const toast = {
  success: (message, title = 'Sucesso!', options = {}) => {
    return hotToast.custom(
      (t) => (
        <ToastContent
          type="success"
          title={title}
          message={message}
          onClose={() => hotToast.dismiss(t.id)}
        />
      ),
      options
    );
  },

  error: (message, title = 'Erro!', options = {}) => {
    return hotToast.custom(
      (t) => (
        <ToastContent
          type="error"
          title={title}
          message={message}
          onClose={() => hotToast.dismiss(t.id)}
        />
      ),
      { ...options, duration: 5000 }
    );
  },

  warning: (message, title = 'Atenção!', options = {}) => {
    return hotToast.custom(
      (t) => (
        <ToastContent
          type="warning"
          title={title}
          message={message}
          onClose={() => hotToast.dismiss(t.id)}
        />
      ),
      options
    );
  },

  info: (message, title = 'Informação', options = {}) => {
    return hotToast.custom(
      (t) => (
        <ToastContent
          type="info"
          title={title}
          message={message}
          onClose={() => hotToast.dismiss(t.id)}
        />
      ),
      options
    );
  },

  promise: (promise, messages, options = {}) => {
    return hotToast.promise(
      promise,
      {
        loading: (
          <ToastContent
            type="info"
            title="Carregando..."
            message={messages.loading || 'Processando...'}
          />
        ),
        success: (data) => (
          <ToastContent
            type="success"
            title="Sucesso!"
            message={messages.success || 'Operação concluída!'}
          />
        ),
        error: (err) => (
          <ToastContent
            type="error"
            title="Erro!"
            message={messages.error || err?.message || 'Algo deu errado!'}
          />
        ),
      },
      options
    );
  },

  custom: (component, options = {}) => {
    return hotToast.custom(component, options);
  },

  dismiss: (toastId) => {
    hotToast.dismiss(toastId);
  },

  remove: (toastId) => {
    hotToast.remove(toastId);
  }
};

export default toast;
