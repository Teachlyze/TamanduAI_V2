import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { colors, typography } from '../tokens';

/**
 * EmptyState - Estado vazio reutilizável
 */
const EmptyState = ({ 
  icon: Icon, 
  title, 
  description,
  action,
  actionLabel,
  actionIcon: ActionIcon
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      {Icon && (
        <div className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-600">
          <Icon className="w-full h-full" />
        </div>
      )}
      
      {title && (
        <h3 className={`${typography.h5} ${colors.text.primary} mb-2`}>
          {title}
        </h3>
      )}
      
      {description && (
        <p className={`${typography.bodySmall} ${colors.text.secondary} mb-6 max-w-md mx-auto`}>
          {description}
        </p>
      )}
      
      {action && actionLabel && (
        <Button onClick={action} className="inline-flex items-center gap-2">
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};

export default EmptyState;
