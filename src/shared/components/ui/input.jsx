import React, { forwardRef, useId } from 'react';
import { cn } from '@/shared/utils/cn';

const Input = React.forwardRef(({
  className,
  type = 'text',
  label,
  error,
  success,
  helperText,
  required = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  error: errorProp = false,
  ...props
}, ref) => {
  const inputId = useId();
  const errorId = useId();
  const helperId = useId();

  // Determinar se input é inválido
  const isInvalid = error || errorProp;

  // Construir descrição do input
  const descriptionIds = [];
  if (helperText) descriptionIds.push(helperId);
  if (isInvalid) descriptionIds.push(errorId);

  const inputProps = {
    id: inputId,
    ref,
    type,
    className: cn(
      // Neutral Tailwind styles to match design system (light/dark)
      "w-full h-10 rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground",
      "dark:bg-gray-900 dark:text-gray-100",
      "px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      isInvalid && "border-red-500 focus-visible:outline-red-500",
      success && !isInvalid && "border-green-500 focus-visible:outline-green-500",
      className
    ),
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': descriptionIds.length > 0 ? descriptionIds.join(' ') : ariaDescribedBy,
    'aria-invalid': isInvalid,
    'aria-required': required,
    ...props
  };

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "block text-sm font-medium",
            isInvalid ? "text-red-700 dark:text-red-400" : "text-gray-700 dark:text-gray-300",
            required && "after:content-['*'] after:ml-1 after:text-red-500"
          )}
        >
          {label}
        </label>
      )}

      <input {...inputProps} />

      {/* Helper text */}
      {helperText && (
        <p
          id={helperId}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}

      {/* Error message */}
      {isInvalid && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {/* Success message */}
      {success && !isInvalid && (
        <p
          className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1"
          role="status"
          aria-live="polite"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export { Input };
