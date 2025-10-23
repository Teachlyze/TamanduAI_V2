import React, { useMemo } from 'react';
import { Loader2, Loader, RefreshCw } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

/**
 * Enhanced LoadingSpinner component with multiple variants and animations
 */
const LoadingSpinner = ({
  className,
  size = 'md',
  text = 'Carregando...',
  showText = true,
  fullScreen = false,
  variant = 'default',
  speed = 'normal',
  overlay = false,
  center = false,
  ...props
}) => {
  const sizeClasses = useMemo(() => ({
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
    '2xl': 'h-12 w-12',
  }), []);

  const speedClasses = useMemo(() => ({
    slow: 'animate-spin-slow',
    normal: 'animate-spin',
    fast: 'animate-spin-fast',
  }), []);

  const variantClasses = useMemo(() => ({
    default: 'text-primary',
    primary: 'text-primary',
    secondary: 'text-muted-foreground',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    white: 'text-white',
  }), []);

  const SpinnerIcon = useMemo(() => {
    switch (variant) {
      case 'dots':
        return <div className="flex space-x-1">
          <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>;
      case 'pulse':
        return <div className="w-full h-full bg-current rounded-full animate-pulse"></div>;
      case 'refresh':
        return <RefreshCw className={cn(speedClasses[speed], sizeClasses[size])} />;
      case 'loader':
        return <Loader className={cn(speedClasses[speed], sizeClasses[size])} />;
      default:
        return <Loader2 className={cn(speedClasses[speed], sizeClasses[size])} />;
    }
  }, [variant, speed, size, sizeClasses, speedClasses]);

  const spinnerContent = useMemo(() => (
    <div className={cn(
      'flex items-center justify-center',
      center ? 'w-full h-full' : '',
      className
    )} {...props}>
      <div className={cn(
        'flex flex-col items-center space-y-3',
        variant === 'dots' ? 'space-y-2' : 'space-y-3'
      )}>
        <div className={cn(
          'flex items-center justify-center',
          variant === 'dots' ? 'space-x-0' : ''
        )}>
          <div className={cn(
            variantClasses[variant] || variantClasses.default,
            variant === 'dots' ? 'flex items-center' : ''
          )}>
            {SpinnerIcon}
          </div>
        </div>
        {showText && text && (
          <span className={cn(
            'text-sm font-medium',
            variant === 'white' ? 'text-white' : 'text-muted-foreground'
          )}>
            {text}
          </span>
        )}
      </div>
    </div>
  ), [className, center, showText, text, variant, variantClasses, SpinnerIcon, props]);

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        {spinnerContent}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;
