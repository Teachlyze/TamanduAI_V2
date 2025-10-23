import React from 'react';
import { motion } from 'framer-motion';
import { patterns, getRoleGradient } from '../tokens';

/**
 * DashboardHeader - Header animado para dashboards
 */
const DashboardHeader = ({ 
  title, 
  subtitle, 
  role = 'teacher',
  gradient 
}) => {
  const headerGradient = gradient || getRoleGradient(role);

  return (
    <div className={`relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r ${headerGradient} p-8 text-white`}>
      {/* Background Pattern */}
      <div className={`absolute inset-0 ${patterns.dots}`} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10"
      >
        <h1 className="text-4xl font-bold mb-2">
          {title}
        </h1>
        <p className="text-blue-100">
          {subtitle}
        </p>
      </motion.div>

      {/* Decorative Blobs */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
    </div>
  );
};

export default DashboardHeader;
