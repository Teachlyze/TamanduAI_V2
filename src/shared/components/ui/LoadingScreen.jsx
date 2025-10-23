import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Loader2 } from 'lucide-react';

/**
 * Premium Loading Screen - Beautiful loading state
 */
export const LoadingScreen = ({ message = 'Carregando...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background">
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Loading Content */}
      <div className="relative text-center">
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
          className="mb-8"
        >
          <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-themed-lg">
            <BookOpen className="w-10 h-10 text-slate-900 dark:text-white" />
          </div>
        </motion.div>

        {/* Loading Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mx-auto mb-6"
        >
          <Loader2 className="w-12 h-12 text-primary" />
        </motion.div>

        {/* Loading Text */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg"
        >
          {message}
        </motion.p>

        {/* Loading Dots */}
        <div className="flex justify-center gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Inline Loading - For use inside components
 */
export const InlineLoading = ({ message, size = 'md' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className={`${sizes[size]} text-primary animate-spin mb-3`} />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
};

/**
 * Skeleton Screen - For content loading
 */
export const SkeletonScreen = ({ type = 'card' }) => {
  if (type === 'card') {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-start gap-4">
              <div className="skeleton skeleton-circle w-12 h-12" />
              <div className="flex-1 space-y-3">
                <div className="skeleton skeleton-title w-3/4" />
                <div className="skeleton skeleton-text" />
                <div className="skeleton skeleton-text w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    );
  }

  return null;
};

export default LoadingScreen;
