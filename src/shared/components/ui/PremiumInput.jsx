import React, { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/utils/cn';
import { Eye, EyeOff, AlertCircle, CheckCircle2, X } from 'lucide-react';

/**
 * Premium Input Component - Award-winning form inputs
 * Features: Floating labels, validation states, icons, masks
 */
export const PremiumInput = React.forwardRef(({ 
  label,
  type = 'text',
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  error,
  success,
  helperText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  disabled = false,
  required = false,
  clearable = false,
  className = '',
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState(value ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hasValue = internalValue.length > 0;
  const isPassword = type === 'password';

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e) => {
    setInternalValue(e.target.value);
    onChange?.(e);
  };

  const handleClear = () => {
    setInternalValue('');
    onChange?.({ target: { value: '' } });
  };

  const baseStyles = "w-full px-4 py-3 rounded-xl border-2 bg-background text-foreground transition-all duration-300 focus:outline-none";
  
  const stateStyles = error
    ? "border-destructive focus:border-destructive focus:ring-4 focus:ring-destructive/20"
    : success
    ? "border-success focus:border-success focus:ring-4 focus:ring-success/20"
    : "border-border focus:border-primary focus:ring-4 focus:ring-primary/20";

  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed bg-muted" : "";

  return (
    <div className={cn("relative", className)}>
      {/* Floating Label */}
      {label && (
        <motion.label
          animate={{
            top: isFocused || hasValue ? '0px' : '12px',
            fontSize: isFocused || hasValue ? '0.75rem' : '1rem',
            fontWeight: isFocused || hasValue ? 600 : 400
          }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            "absolute left-3 px-1 bg-background pointer-events-none z-10",
            isFocused ? "text-primary" : error ? "text-destructive" : success ? "text-success" : "text-muted-foreground"
          )}
        >
          {label} {required && <span className="text-destructive">*</span>}
        </motion.label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
            <LeftIcon className="w-5 h-5" />
          </div>
        )}

        {/* Input Field */}
        <input
          type={isPassword && showPassword ? 'text' : type}
          value={internalValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isFocused || !label ? placeholder : ''}
          autoComplete={props?.autoComplete ?? (isPassword ? 'current-password' : undefined)}
          disabled={disabled}
          ref={ref}
          className={cn(
            baseStyles,
            stateStyles,
            disabledStyles,
            LeftIcon && "pl-11",
            (RightIcon || isPassword || clearable || error || success) && "pr-11"
          )}
          {...props}
        />

        {/* Right Icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {/* Clear Button */}
          {clearable && hasValue && !disabled && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded-full"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}

          {/* Password Toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}

          {/* Status Icons */}
          {error && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-destructive"
            >
              <AlertCircle className="w-5 h-5" />
            </motion.div>
          )}
          {success && !error && (
            <motion.div
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-success"
            >
              <CheckCircle2 className="w-5 h-5" />
            </motion.div>
          )}

          {/* Custom Right Icon */}
          {RightIcon && !error && !success && (
            <RightIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Helper Text / Error Message */}
      <AnimatePresence>
        {(helperText || error) && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "mt-2 text-sm",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {error || helperText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Premium Textarea
 */
export const PremiumTextarea = ({
  label,
  value,
  onChange,
  rows = 4,
  error,
  helperText,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value?.length > 0;

  return (
    <div className={cn("relative", className)}>
      {label && (
        <motion.label
          animate={{
            top: isFocused || hasValue ? '0px' : '12px',
            fontSize: isFocused || hasValue ? '0.75rem' : '1rem',
            fontWeight: isFocused || hasValue ? 600 : 400
          }}
          className={cn(
            "absolute left-3 px-1 bg-background pointer-events-none z-10",
            isFocused ? "text-primary" : error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {label}
        </motion.label>
      )}

      <textarea
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={rows}
        className={cn(
          "w-full px-4 py-3 rounded-xl border-2 bg-background text-foreground transition-all duration-300 focus:outline-none resize-none",
          error
            ? "border-destructive focus:border-destructive focus:ring-4 focus:ring-destructive/20"
            : "border-border focus:border-primary focus:ring-4 focus:ring-primary/20"
        )}
        {...props}
      />

      {(helperText || error) && (
        <p className={cn("mt-2 text-sm", error ? "text-destructive" : "text-muted-foreground")}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

/**
 * Premium Select
 */
export const PremiumSelect = ({
  label,
  value,
  onChange,
  options = [],
  error,
  placeholder = 'Selecione...',
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== '' && value !== null && value !== undefined;

  return (
    <div className={cn("relative", className)}>
      {label && (
        <motion.label
          animate={{
            top: isFocused || hasValue ? '0px' : '12px',
            fontSize: isFocused || hasValue ? '0.75rem' : '1rem',
            fontWeight: isFocused || hasValue ? 600 : 400
          }}
          className={cn(
            "absolute left-3 px-1 bg-background pointer-events-none z-10",
            isFocused ? "text-primary" : error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {label}
        </motion.label>
      )}

      <select
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "w-full px-4 py-3 rounded-xl border-2 bg-background text-foreground transition-all duration-300 focus:outline-none appearance-none cursor-pointer",
          error
            ? "border-destructive focus:border-destructive focus:ring-4 focus:ring-destructive/20"
            : "border-border focus:border-primary focus:ring-4 focus:ring-primary/20"
        )}
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Dropdown Arrow */}
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default PremiumInput;
