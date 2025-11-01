import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { components, animations, valueOrEmpty, formatNumber } from '../tokens';

/**
 * StatsCard - Card de estatísticas reutilizável
 */
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  gradient, 
  bgColor,
  delay = 0,
  onClick,
  format = 'number' // 'number', 'text', 'percentage'
}) => {
  const formattedValue = format === 'number' 
    ? formatNumber(value) 
    : valueOrEmpty(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card 
        className={`p-6 border border-border bg-white dark:bg-slate-900 ${components.card.hover} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${gradient ? `bg-gradient-to-r ${gradient}` : bgColor || 'bg-primary/10'}`}> 
            {Icon && (
              <Icon className="w-6 h-6 text-white" />
            )}
          </div>
          {onClick && <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
        </div>
        
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
          {formattedValue}
        </h3>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {title}
        </p>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
