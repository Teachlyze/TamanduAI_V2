import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/shared/utils/cn';

/**
 * Premium Card Component - Award-winning design
 * Features: Hover effects, glass morphism, gradient borders
 */
export const PremiumCard = ({ 
  children, 
  className = '',
  variant = 'default', // 'default' | 'glass' | 'gradient' | 'elevated'
  hover = true,
  onClick,
  as: Component = 'div'
}) => {
  const baseStyles = "relative rounded-2xl transition-all duration-300";
  
  const variants = {
    default: "bg-card border border-border shadow-soft",
    glass: "glass backdrop-blur-xl border border-border/30",
    gradient: "bg-gradient-to-br from-card to-card/80 border-gradient-primary",
    elevated: "bg-card border border-border shadow-themed-lg"
  };

  const hoverStyles = hover ? "hover-lift hover:shadow-themed-lg cursor-pointer" : "";

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.19, 1, 0.22, 1]
      }
    },
    hover: hover ? {
      y: -4,
      transition: {
        duration: 0.3,
        ease: [0.19, 1, 0.22, 1]
      }
    } : {}
  };

  return (
    <motion.div
      as={Component}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
      onClick={onClick}
      className={cn(
        baseStyles,
        variants[variant],
        hoverStyles,
        className
      )}
    >
      {children}
    </motion.div>
  );
};

/**
 * Premium Card Header
 */
export const PremiumCardHeader = ({ children, className = '' }) => (
  <div className={cn("p-6 border-b border-border", className)}>
    {children}
  </div>
);

/**
 * Premium Card Content
 */
export const PremiumCardContent = ({ children, className = '' }) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);

/**
 * Premium Card Footer
 */
export const PremiumCardFooter = ({ children, className = '' }) => (
  <div className={cn("p-6 border-t border-border", className)}>
    {children}
  </div>
);

/**
 * Premium Card Title
 */
export const PremiumCardTitle = ({ children, className = '' }) => (
  <h3 className={cn("text-xl font-bold text-foreground mb-2", className)}>
    {children}
  </h3>
);

/**
 * Premium Card Description
 */
export const PremiumCardDescription = ({ children, className = '' }) => (
  <p className={cn("text-muted-foreground leading-relaxed", className)}>
    {children}
  </p>
);

/**
 * Stats Card - For metrics and KPIs
 */
export const StatsCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'up',
  className = '' 
}) => {
  const trendColor = trend === 'up' ? 'text-success' : 'text-destructive';
  const trendBg = trend === 'up' ? 'bg-success/10' : 'bg-destructive/10';

  return (
    <PremiumCard variant="elevated" hover className={className}>
      <PremiumCardContent>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-foreground">{value}</h3>
          </div>
          {Icon && (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          )}
        </div>
        {change && (
          <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", trendBg, trendColor)}>
            {trend === 'up' ? '↑' : '↓'} {change}
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
};

/**
 * Feature Card - For showcasing features
 */
export const FeatureCard = ({ 
  title, 
  description, 
  icon: Icon,
  gradient = "from-blue-500 to-purple-500",
  className = '' 
}) => (
  <PremiumCard variant="glass" hover className={className}>
    <PremiumCardContent className="space-y-4">
      <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", gradient)}>
        {Icon && <Icon className="w-7 h-7 text-slate-900 dark:text-white" />}
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </PremiumCardContent>
  </PremiumCard>
);

/**
 * Testimonial Card
 */
export const TestimonialCard = ({ 
  quote, 
  author, 
  role, 
  avatar,
  rating = 5,
  className = '' 
}) => (
  <PremiumCard variant="elevated" className={className}>
    <PremiumCardContent className="space-y-4">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={cn("w-5 h-5", i < rating ? "text-yellow-400 fill-current" : "text-muted stroke-current fill-none")}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <p className="text-foreground leading-relaxed italic">"{quote}"</p>
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        {avatar && (
          <img 
            src={avatar} 
            alt={author} 
            className="w-12 h-12 rounded-full object-cover border-2 border-border"
          />
        )}
        <div>
          <p className="font-semibold text-foreground">{author}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
    </PremiumCardContent>
  </PremiumCard>
);

export default PremiumCard;
