import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { sanitizeText, validateTextSafety, SafeHtml } from '@/shared/utils/securityUtils';

/**
 * Input component with built-in XSS protection and sanitization
 */
const SecureInput = React.forwardRef(({
  value,
  onChange,
  sanitize = true,
  maxLength = 1000,
  validate = false,
  onValidationChange,
  className = '',
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = React.useState(
    sanitize && value ? sanitizeText(value, { maxLength }) : value || ''
  );
  const [isValid, setIsValid] = React.useState(true);

  // Update internal value when prop changes
  React.useEffect(() => {
    if (value !== internalValue) {
      const sanitized = sanitize && value ? sanitizeText(value, { maxLength }) : value || '';
      setInternalValue(sanitized);

      if (validate) {
        const validation = validateTextSafety(sanitized);
        setIsValid(validation.isSafe);
        onValidationChange?.(validation.isSafe, validation.reason);
      }
    }
  }, [value, sanitize, maxLength, validate, onValidationChange]);

  const handleChange = (e) => {
    const newValue = e.target.value;

    if (sanitize) {
      const sanitized = sanitizeText(newValue, { maxLength });
      setInternalValue(sanitized);

      if (validate) {
        const validation = validateTextSafety(sanitized);
        setIsValid(validation.isSafe);
        onValidationChange?.(validation.isSafe, validation.reason);
      }

      // Call onChange with sanitized value
      onChange?.(sanitized);
    } else {
      setInternalValue(newValue);
      onChange?.(newValue);
    }
  };

  return (
    <input
      ref={ref}
      value={internalValue}
      onChange={handleChange}
      className={`${className} ${!isValid ? 'border-red-500' : ''}`}
      {...props}
    />
  );
});

SecureInput.displayName = 'SecureInput';

/**
 * Textarea component with built-in XSS protection
 */
export const SecureTextarea = React.forwardRef(({
  value,
  onChange,
  sanitize = true,
  maxLength = 5000,
  validate = false,
  onValidationChange,
  className = '',
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = React.useState(
    sanitize && value ? sanitizeText(value, { maxLength }) : value || ''
  );
  const [isValid, setIsValid] = React.useState(true);

  React.useEffect(() => {
    if (value !== internalValue) {
      const sanitized = sanitize && value ? sanitizeText(value, { maxLength }) : value || '';
      setInternalValue(sanitized);

      if (validate) {
        const validation = validateTextSafety(sanitized);
        setIsValid(validation.isSafe);
        onValidationChange?.(validation.isSafe, validation.reason);
      }
    }
  }, [value, sanitize, maxLength, validate, onValidationChange]);

  const handleChange = (e) => {
    const newValue = e.target.value;

    if (sanitize) {
      const sanitized = sanitizeText(newValue, { maxLength });
      setInternalValue(sanitized);

      if (validate) {
        const validation = validateTextSafety(sanitized);
        setIsValid(validation.isSafe);
        onValidationChange?.(validation.isSafe, validation.reason);
      }

      onChange?.(sanitized);
    } else {
      setInternalValue(newValue);
      onChange?.(newValue);
    }
  };

  return (
    <textarea
      ref={ref}
      value={internalValue}
      onChange={handleChange}
      className={`${className} ${!isValid ? 'border-red-500' : ''}`}
      {...props}
    />
  );
});

SecureTextarea.displayName = 'SecureTextarea';

/**
 * Content display component with XSS protection
 */
export const SecureContent = ({
  content,
  allowHtml = false,
  className = '',
  ...props
}) => {
  const safeContent = React.useMemo(() => {
    if (!content) return '';

    if (allowHtml) {
      // For HTML content, use SafeHtml component
      return content;
    } else {
      // For plain text, sanitize
      return sanitizeText(content, { stripAllHtml: true });
    }
  }, [content, allowHtml]);

  if (allowHtml) {
    // Use SafeHtml for HTML content
    return <SafeHtml html={safeContent} className={className} {...props} />;
  }

  return (
    <div className={className} {...props}>
      {safeContent}
    </div>
  );
};

/**
 * Form field wrapper with security validation
 */
export const SecureFormField = ({
  name,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  sanitize = true,
  validate = false,
  maxLength,
  className = '',
  error,
  ...props
}) => {
  const [fieldValue, setFieldValue] = React.useState(value || '');
  const [validationError, setValidationError] = React.useState('');

  const handleChange = (newValue) => {
    setFieldValue(newValue);
    onChange?.(newValue);

    if (validate && newValue) {
      const validation = validateTextSafety(newValue);
      setValidationError(validation.isSafe ? '' : validation.reason);
    }
  };

  const InputComponent = type === 'textarea' ? SecureTextarea : SecureInput;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <InputComponent
        value={fieldValue}
        onChange={handleChange}
        sanitize={sanitize}
        validate={validate}
        maxLength={maxLength}
        className={`w-full ${error || validationError ? 'border-red-500 focus:ring-red-500' : ''}`}
        {...props}
      />

      {(error || validationError) && (
        <p className="text-sm text-red-600">
          {error || validationError}
        </p>
      )}
    </div>
  );
};

/**
 * Hook for secure form handling
 */
export const useSecureForm = (initialValues = {}) => {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const setValue = React.useCallback((field, value) => {
    setValues(prev => ({
      ...prev,
      [field]: sanitizeText(value, { maxLength: 1000 })
    }));
  }, []);

  const setError = React.useCallback((field, error) => {
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, []);

  const setFieldTouched = React.useCallback((field, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [field]: isTouched
    }));
  }, []);

  const validateField = React.useCallback((field, value) => {
    const validation = validateTextSafety(value);
    if (!validation.isSafe) {
      setError(field, validation.reason);
      return false;
    }
    setError(field, '');
    return true;
  }, [setError]);

  const validateForm = React.useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(values).forEach(field => {
      const validation = validateTextSafety(values[field]);
      if (!validation.isSafe) {
        newErrors[field] = validation.reason;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values]);

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    setFieldTouched,
    validateField,
    validateForm,
    isValid: Object.keys(errors).length === 0
  };
};

export default {
  SecureInput,
  SecureTextarea,
  SecureContent,
  SecureFormField,
  useSecureForm
};
