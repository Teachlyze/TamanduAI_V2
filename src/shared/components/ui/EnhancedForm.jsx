import { logger } from '@/shared/utils/logger';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { cn } from '@/shared/utils/cn';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Select } from './select';
import { Checkbox } from './checkbox';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

/**
 * Enhanced Form Field Component
 * Provides consistent styling and validation for form fields
 */
export const [loading, setLoading] = useState(true);
  const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  disabled = false,
  placeholder,
  helpText,
  icon: Icon,
  rightIcon,
  className,
  children,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef();

  const fieldId = `field-${name}`;
  const errorId = `error-${name}`;
  const helpId = `help-${name}`;

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const hasError = error && touched;
  const isValid = !error && touched && value;

  // Handle change with validation
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(name, newValue);
    }
  }, [name, onChange]);

  // Handle blur with validation
  const handleBlur = useCallback(() => {
    if (onBlur) {
      onBlur(name);
    }
  }, [name, onBlur]);
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label
          htmlFor={fieldId}
          className={cn(
            'text-sm font-semibold',
            required && "after:content-['*'] after:text-red-500 after:ml-1",
            disabled && 'opacity-60'
          )}
        >
          {label}
        </Label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}

        {children || (
          <Input
            ref={inputRef}
            id={fieldId}
            name={name}
            type={inputType}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={cn(
              Icon && 'pl-10',
              (isPassword || rightIcon) && 'pr-10',
              hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              isValid && 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
              'transition-all duration-200'
            )}
            aria-invalid={hasError}
            aria-describedby={cn(
              hasError && errorId,
              helpText && helpId
            )}
            {...props}
          />
        )}

        {/* Right side icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-800 dark:text-gray-300 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Validation icons */}
          {isValid && (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
          {hasError && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}

          {/* Custom right icon */}
          {rightIcon && !hasError && !isValid && (
            <div className="text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {hasError && (
        <div
          id={errorId}
          className="flex items-center space-x-1 text-sm text-red-600"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Help text */}
      {helpText && !hasError && (
        <div
          id={helpId}
          className="text-sm text-gray-700 dark:text-gray-400"
        >
          {helpText}
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced Form Component with validation and state management
 */
export const EnhancedForm = ({
  initialValues = {},
  validationSchema = {},
  onSubmit,
  onChange,
  children,
  className,
  resetOnSubmit = false,
  validateOnChange = false,
  validateOnBlur = true,
  ...props
}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef();

  // Validate a single field
  const validateField = useCallback((name, value) => {
    const validator = validationSchema[name];
    if (!validator) return null;

    try {
      const result = validator(value, values);
      return result || null;
    } catch (error) {
      logger.error(`Validation error for ${name}:`, error)
      return error.message || 'Erro de validação';
    }
  }, [validationSchema, values]);

  // Validate all fields
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validationSchema, values, validateField]);

  // Handle field change
  const handleFieldChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));

    if (validateOnChange) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }

    if (onChange) {
      onChange({ ...values, [name]: value }, { ...errors, [name]: validateField(name, value) });
    }
  }, [values, errors, validateOnChange, validateField, onChange]);

  // Handle field blur
  const handleFieldBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));

    if (validateOnBlur) {
      const error = validateField(name, values[name]);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateOnBlur, validateField, values]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    // Validate form
    const isValid = validateForm();

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(values);

      if (resetOnSubmit) {
        setValues(initialValues);
        setErrors({});
        setTouched({});
      }
    } catch (error) {
      logger.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, onSubmit, resetOnSubmit, initialValues]);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Form context value
  const formContext = useMemo(() => ({
    values,
    errors,
    touched,
    isSubmitting,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    resetForm,
    setValue: (name, value) => handleFieldChange(name, value),
    setError: (name, error) => setErrors(prev => ({ ...prev, [name]: error })),
    validateField,
    validateForm,
  }), [
    values,
    errors,
    touched,
    isSubmitting,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    resetForm,
    validateField,
    validateForm,
  ]);
  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={cn('space-y-6', className)}
      noValidate
      {...props}
    >
      {typeof children === 'function' ? children(formContext) : children}
    </form>
  );
};

/**
 * Form Field Factory for creating consistent form fields
 */
export const createFormField = (FieldComponent) => {
  return ({
    name,
    label,
    type = 'text',
    validation,
    ...props
  }) => {
  return (
      <FormField
        name={name}
        label={label}
        type={type}
        {...props}
      />
    );
  };
};

/**
 * Common form field validators
 */
export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'Este campo é obrigatório';
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'E-mail inválido';
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Deve ter pelo menos ${min} caracteres`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `Deve ter no máximo ${max} caracteres`;
    }
    return null;
  },

  pattern: (regex, message) => (value) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message || 'Formato inválido';
    }
    return null;
  },

  confirmPassword: (passwordField) => (value, values) => {
    if (!value) return null;
    if (value !== values[passwordField]) {
      return 'Senhas não coincidem';
    }
    return null;
  },

  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'URL inválida';
    }
  },

  number: (value) => {
    if (!value) return null;
    if (isNaN(Number(value))) {
      return 'Deve ser um número válido';
    }
    return null;
  },

  min: (min) => (value) => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num < min) {
      return `Deve ser pelo menos ${min}`;
    }
    return null;
  },

  max: (max) => (value) => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num > max) {
      return `Deve ser no máximo ${max}`;
    }
    return null;
  },
};

/**
 * Form submission handler with loading states
 */
export const useFormSubmission = (onSubmit, options = {}) => {
  const {
    validate,
    resetOnSuccess = false,
    showSuccessToast = true,
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = useCallback(async (values) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate if validator provided
      if (validate) {
        const validationResult = validate(values);
        if (!validationResult.isValid) {
          setSubmitError('Por favor, corrija os erros no formulário');
          return { success: false, errors: validationResult.errors };
        }
      }

      // Submit form
      const result = await onSubmit(values);

      // Reset form if specified
      if (resetOnSuccess) {
        // Reset logic would be handled by parent component
      }

      // Show success toast if enabled
      if (showSuccessToast && window.toast) {
        window.toast.success('Dados salvos com sucesso!');
      }

      return { success: true, data: result };
    } catch (error) {
      logger.error('Form submission error:', error)
      setSubmitError(error.message || 'Erro ao enviar formulário');

      if (window.toast) {
        window.toast.error(error.message || 'Erro ao enviar formulário');
      }

      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, validate, resetOnSuccess, showSuccessToast]);

  return {
    isSubmitting,
    submitError,
    handleSubmit,
  };
};

/**
 * Auto-save functionality for forms
 */
export const useAutoSave = (values, onSave, options = {}) => {
  const {
    delay = 2000,
    enabled = true,
  } = options;

  const timeoutRef = useRef();
  const lastSavedRef = useRef();

  const save = useCallback(async () => {
    if (!enabled || !onSave) return;

    try {
      await onSave(values);
      lastSavedRef.current = Date.now();

      if (window.toast) {
        window.toast.success('Alterações salvas automaticamente');
      }
    } catch (error) {
      logger.error('Auto-save error:', error)

      if (window.toast) {
        window.toast.error('Erro ao salvar automaticamente');
      }
    }
  }, [values, onSave, enabled]);

  // Auto-save on value changes
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(save, delay);
  return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [save, delay]);

  const lastSaved = lastSavedRef.current;

  return {
    lastSaved,
    saveNow: save,
  };
};

export default EnhancedForm;
