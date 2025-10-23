import React, { cloneElement, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/shared/utils/cn';
import { Loader2 } from 'lucide-react';

/**
 * Premium Button Component - Award-winning interactions
 * Features: Ripple effect, loading states, icons, variants
 */
export const PremiumButton = ({ 
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient'
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = '',
  ...props
}) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    if (disabled || loading) return;

    // Create ripple effect
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now()
    };

    setRipples(prev => [...prev, ripple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id));
    }, 600);

    onClick?.(e);
  };

  const baseStyles = "relative overflow-hidden font-medium transition-all duration-300 inline-flex items-center justify-center gap-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-themed active:scale-95",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95",
    outline: "border-2 border-border text-foreground hover:bg-accent hover:border-primary active:scale-95",
    ghost: "text-foreground hover:bg-accent active:scale-95",
    gradient: "bg-gradient-primary text-white shadow-themed hover:shadow-themed-lg active:scale-95",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft active:scale-95",
    success: "bg-success text-success-foreground hover:bg-success/90 shadow-soft active:scale-95"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
    xl: "px-8 py-4 text-xl"
  };

  const buttonVariants = {
    tap: { scale: 0.95 },
    hover: { scale: 1.02 }
  };

  return (
    <motion.button
      whileHover={!disabled && !loading ? "hover" : undefined}
      whileTap={!disabled && !loading ? "tap" : undefined}
      variants={buttonVariants}
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {/* Ripple Effect */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple"
          style={{
            left: ripple.x,
            top: ripple.y
          }}
        />
      ))}

      {/* Loading Spinner */}
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}

      {/* Left Icon */}
      {!loading && LeftIcon && <LeftIcon className="w-5 h-5" />}

      {/* Button Text */}
      <span>{children}</span>

      {/* Right Icon */}
      {!loading && RightIcon && <RightIcon className="w-5 h-5" />}
    </motion.button>
  );
};

/**
 * Icon Button - For icon-only buttons
 */
export const IconButton = ({ 
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  tooltip,
  ...props 
}) => {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  const iconSizeMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <PremiumButton
      variant={variant}
      className={cn("!p-0 rounded-full", sizeMap[size])}
      title={tooltip}
      {...props}
    >
      {Icon && <Icon className={iconSizeMap[size]} />}
    </PremiumButton>
  );
};

/**
 * Button Group
 */
export const ButtonGroup = ({ children, className = '' }) => (
  <div className={cn("inline-flex rounded-xl shadow-soft overflow-hidden", className)}>
    {React.Children.map(children, (child, index) =>
      React.cloneElement(child, {
        className: cn(
          child.props.className,
          "rounded-none",
          index !== 0 && "border-l-0"
        )
      })
    )}
  </div>
);

/**
 * Floating Action Button (FAB)
 */
export const FAB = ({ 
  icon: Icon, 
  onClick, 
  position = 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  className = '' 
}) => {
  const positions = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-20 right-6',
    'top-left': 'fixed top-20 left-6'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        "w-14 h-14 rounded-full bg-gradient-primary text-white shadow-themed-lg hover:shadow-glow z-50",
        positions[position],
        className
      )}
    >
      {Icon && <Icon className="w-6 h-6" />}
    </motion.button>
  );
};

export default PremiumButton;
