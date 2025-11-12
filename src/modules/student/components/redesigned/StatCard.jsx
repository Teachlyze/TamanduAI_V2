import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/shared/components/ui/card';

export const StatCard = ({ icon: Icon, value, label, gradient, trend }) => {
  const gradientClasses = {
    blue: 'from-blue-600 to-cyan-500',
    orange: 'from-orange-600 to-amber-500',
    green: 'from-green-600 to-emerald-500',
    yellow: 'from-yellow-600 to-orange-500',
    purple: 'from-purple-600 to-pink-500',
    slate: 'from-slate-600 to-slate-800'
  };

  const iconBgColors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    orange: 'bg-orange-100 dark:bg-orange-900/30',
    green: 'bg-emerald-100 dark:bg-emerald-900/30',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30',
    purple: 'bg-purple-100 dark:bg-purple-900/30',
    slate: 'bg-slate-100 dark:bg-slate-800'
  };

  const iconColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    orange: 'text-orange-600 dark:text-orange-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    purple: 'text-purple-600 dark:text-purple-400',
    slate: 'text-slate-600 dark:text-slate-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className="p-6 relative overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-xl">
        {/* Gradiente de fundo */}
        <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${gradientClasses[gradient] || gradientClasses.blue}`} />
        
        {/* Conteúdo */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            {Icon && (
              <div className={`p-3 rounded-xl ${iconBgColors[gradient] || iconBgColors.blue}`}>
                <Icon className={`w-6 h-6 ${iconColors[gradient] || iconColors.blue}`} />
              </div>
            )}
            {trend !== undefined && trend !== null && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-sm font-bold px-2 py-1 rounded-full ${
                  trend > 0 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : trend < 0 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
              </motion.span>
            )}
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {value}
          </div>
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {label}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
