import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { PremiumButton } from './PremiumButton';

/**
 * Premium Modal Component - Award-winning modal dialogs
 */
export const PremiumModal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant = 'default', // 'default' | 'centered' | 'slideUp'
  showCloseButton = true,
  closeOnBackdrop = true,
  className = ''
}) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: variant === 'slideUp' ? 1 : 0.95,
      y: variant === 'slideUp' ? 100 : 0
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      scale: variant === 'slideUp' ? 1 : 0.95,
      y: variant === 'slideUp' ? 100 : 0,
      transition: {
        duration: 0.2
      }
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeOnBackdrop ? onClose : undefined}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`relative w-full ${sizes[size]} pointer-events-auto`}
            >
              <div className={`bg-card rounded-2xl shadow-themed-lg border border-border overflow-hidden ${className}`}>
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-start justify-between p-6 border-b border-border">
                    <div>
                      {title && (
                        <h3 className="text-xl font-bold text-foreground mb-1">
                          {title}
                        </h3>
                      )}
                      {description && (
                        <p className="text-sm text-muted-foreground">
                          {description}
                        </p>
                      )}
                    </div>
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        aria-label="Fechar"
                      >
                        <X className="w-5 h-5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="p-6 border-t border-border bg-muted/30">
                    {footer}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * Confirmation Modal - For destructive actions
 */
export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "destructive", // 'destructive' | 'primary'
  loading = false
}) => {
  return (
    <PremiumModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <PremiumButton
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </PremiumButton>
          <PremiumButton
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </PremiumButton>
        </div>
      }
    />
  );
};

/**
 * Form Modal - For forms
 */
export const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  children,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  loading = false,
  size = 'md'
}) => {
  return (
    <PremiumModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      footer={
        <div className="flex justify-end gap-3">
          <PremiumButton
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </PremiumButton>
          <PremiumButton
            variant="primary"
            onClick={onSubmit}
            loading={loading}
          >
            {submitLabel}
          </PremiumButton>
        </div>
      }
    >
      {children}
    </PremiumModal>
  );
};

export default PremiumModal;
