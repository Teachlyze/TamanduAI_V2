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
        className={`p-6 border border-border bg-card text-card-foreground ${components.card.hover} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${bgColor || 'bg-primary/10'} ${gradient ? `bg-gradient-to-r ${gradient}` : ''} text-primary-foreground`}> 
            {Icon && (
              <Icon className="w-6 h-6" />
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
        
        <h3 className="text-3xl font-bold">
          {formattedValue}
        </h3>
        
        <p className="text-sm text-muted-foreground">
          {title}
        </p>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
