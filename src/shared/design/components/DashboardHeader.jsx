import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { patterns, getRoleGradient } from '../tokens';

/**
 * DashboardHeader - Header animado para dashboards
 * Otimizado com React.memo para evitar re-renders desnecessários
 */
const DashboardHeader = memo(({ 
  title, 
  subtitle, 
  role = 'teacher',
  gradient,
  actions // Suporte para actions (botões no header)
}) => {
  const headerGradient = useMemo(
    () => gradient || getRoleGradient(role),
    [gradient, role]
  );

  return (
    <div className={`relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r ${headerGradient} p-8 text-white`}>
      {/* Background Pattern */}
      <div className={`absolute inset-0 ${patterns.dots}`} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">
              {title}
            </h1>
            <p className="text-blue-100">
              {subtitle}
            </p>
          </div>
          {/* Actions (botões) no header */}
          {actions && (
            <div className="flex gap-2 ml-4">
              {actions}
            </div>
          )}
        </div>
      </motion.div>

      {/* Decorative Blobs */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
    </div>
  );
});
DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;
