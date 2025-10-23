import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

/**
 * Linear Progress Bar
 */
export const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  variant = 'primary', // 'primary' | 'success' | 'warning' | 'destructive'
  size = 'md', // 'sm' | 'md' | 'lg'
  showLabel = true,
  label,
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const variants = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive'
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-foreground">
            {label}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-muted rounded-full overflow-hidden ${sizes[size]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          className={`h-full ${variants[variant]} rounded-full`}
        />
      </div>
    </div>
  );
};

/**
 * Circular Progress
 */
export const CircularProgress = ({
  value = 0,
  max = 100,
  size = 120,
  strokeWidth = 8,
  variant = 'primary',
  showLabel = true,
  label,
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const variants = {
    primary: 'stroke-primary',
    success: 'stroke-success',
    warning: 'stroke-warning',
    destructive: 'stroke-destructive'
  };

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress Circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={variants[variant]}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>
        {/* Center Label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-foreground">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      {showLabel && label && (
        <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      )}
    </div>
  );
};

/**
 * Step Progress
 */
export const StepProgress = ({
  steps = [],
  currentStep = 0,
  variant = 'horizontal', // 'horizontal' | 'vertical'
  className = ''
}) => {
  if (variant === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div key={index} className="flex gap-4">
              {/* Step Indicator */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isCompleted
                      ? 'hsl(var(--success))'
                      : isActive
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--muted))'
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                </motion.div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 h-16 bg-muted mt-2" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 pb-8">
                <h4 className={`font-semibold mb-1 ${
                  isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </h4>
                {step.description && (
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              {/* Step Indicator */}
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isCompleted
                    ? 'hsl(var(--success))'
                    : isActive
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted))'
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              >
                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
              </motion.div>

              {/* Step Label */}
              <div className="mt-2 text-center min-w-[100px]">
                <p className={`text-sm font-medium ${
                  isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-muted mx-4 mb-8">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: isCompleted ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-success"
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * Upload Progress
 */
export const UploadProgress = ({
  fileName,
  progress = 0,
  status = 'uploading', // 'uploading' | 'success' | 'error'
  onCancel,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-card rounded-xl border border-border ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {status === 'uploading' && `Enviando... ${Math.round(progress)}%`}
            {status === 'success' && 'Upload concluído!'}
            {status === 'error' && 'Erro no upload'}
          </p>
        </div>
        {status === 'uploading' && onCancel && (
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Cancelar
          </button>
        )}
      </div>

      <ProgressBar
        value={progress}
        variant={status === 'error' ? 'destructive' : status === 'success' ? 'success' : 'primary'}
        size="sm"
        showLabel={false}
      />
    </motion.div>
  );
};

export default ProgressBar;
