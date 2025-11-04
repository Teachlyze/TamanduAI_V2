import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  actionLabel,
  variant = 'default' // 'default', 'success', 'info'
}) => {
  const variants = {
    default: {
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      iconColor: 'text-slate-400 dark:text-slate-600',
      titleColor: 'text-slate-900 dark:text-white',
      descColor: 'text-slate-600 dark:text-slate-400'
    },
    success: {
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      titleColor: 'text-green-900 dark:text-green-100',
      descColor: 'text-green-700 dark:text-green-300'
    },
    info: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-900 dark:text-blue-100',
      descColor: 'text-blue-700 dark:text-blue-300'
    }
  };
  
  const colors = variants[variant] || variants.default;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Ícone */}
      {Icon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={`p-6 rounded-full ${colors.iconBg} mb-6`}
        >
          <Icon className={`w-16 h-16 ${colors.iconColor}`} />
        </motion.div>
      )}
      
      {/* Título */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`text-xl font-bold ${colors.titleColor} mb-2 text-center`}
      >
        {title}
      </motion.h3>
      
      {/* Descrição */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className={`${colors.descColor} text-center max-w-md mb-6`}
      >
        {description}
      </motion.p>
      
      {/* Botão de Ação */}
      {action && actionLabel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button 
            onClick={action} 
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
          >
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};
