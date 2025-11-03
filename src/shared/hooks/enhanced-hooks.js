import { logger } from '@/shared/utils/logger';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * Enhanced useState hook with performance optimizations and debugging
 */
export const useEnhancedState = (initialValue, options = {}) => {
  const {
    debug = false,
    persist = false,
    persistKey = null,
    validator = null,
    onChange = null,
    debounceMs = 0,
  } = options;

  // Get persisted value if available
  const getPersistedValue = useCallback(() => {
    if (!persist || !persistKey) return initialValue;

    try {
      const stored = localStorage.getItem(persistKey);
      return stored ? JSON.parse(stored) : initialValue;
    } catch (error) {
      logger.warn('Error reading persisted state:', error)
      return initialValue;
    }
  }, [persist, persistKey, initialValue]);

  const [state, setState] = useState(getPersistedValue);
  const debounceRef = useRef(null);
  const prevStateRef = useRef(state);

  // Persist state to localStorage
  const persistState = useCallback((value) => {
    if (!persist || !persistKey) return;

    try {
      localStorage.setItem(persistKey, JSON.stringify(value));
    } catch (error) {
      logger.warn('Error persisting state:', error)
    }
  }, [persist, persistKey]);

  // Enhanced setter with validation and callbacks
  const setValue = useCallback((newValue) => {
    // Handle functional updates
    const valueToSet = typeof newValue === 'function' ? newValue(state) : newValue;

    // Validate if validator is provided
    if (validator && !validator(valueToSet)) {
      logger.warn('State validation failed:', valueToSet)
      return;
    }

    // Update state
    setState(valueToSet);
    persistState(valueToSet);

    // Call onChange callback
    if (onChange) {
      onChange(valueToSet, prevStateRef.current);
    }

    // Debug logging
    if (debug) {
      console.log('State changed:', {
        from: prevStateRef.current,
        to: valueToSet,
        key: persistKey,
      });
    }

    prevStateRef.current = valueToSet;
  }, [state, validator, onChange, persistState, debug, persistKey]);

  // Debounced setter
  const setDebouncedValue = useCallback((newValue) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setValue(newValue);
    }, debounceMs);
  }, [setValue, debounceMs]);

  // Reset to initial value
  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue, setValue]);

  // Update multiple values at once
  const updateMultiple = useCallback((updates) => {
    setValue(prev => ({ ...prev, ...updates }));
  }, [setValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return [
    state,
    setValue,
    {
      setDebounced: setDebouncedValue,
      reset,
      updateMultiple,
      previousValue: prevStateRef.current,
    }
  ];
};

/**
 * Optimized useEffect hook with better dependency handling
 */
export const useOptimizedEffect = (effect, deps, options = {}) => {
  const {
    runOnMount = true,
    condition = null,
  } = options;

  const prevDepsRef = useRef();
  const effectRef = useRef(effect);

  // Update effect ref
  effectRef.current = effect;

  useEffect(() => {
    // Check condition if provided
    if (condition !== null && !condition) {
      return;
    }

    // Check if dependencies changed
    const depsChanged = !prevDepsRef.current ||
      deps.some((dep, index) => !Object.is(dep, prevDepsRef.current[index]));

    if (runOnMount || depsChanged) {
      const cleanup = effectRef.current();

      if (typeof cleanup === 'function') {
        return cleanup;
      }
    }

    prevDepsRef.current = deps;
  }, deps);
};

/**
 * useMemo with error boundary and debugging
 */
export const useSafeMemo = (factory, deps, options = {}) => {
  const {
    debug = false,
    fallback = undefined,
  } = options;

  return useMemo(() => {
    try {
      const result = factory();

      if (debug) {
        logger.debug('Memo computed:', result)
      }

      return result;
    } catch (error) {
      logger.error('Error in useSafeMemo:', error)

      if (fallback !== undefined) {
        return fallback;
      }

      throw error;
    }
  }, deps);
};

/**
 * useCallback with performance monitoring
 */
export const useOptimizedCallback = (callback, deps, options = {}) => {
  const {
    debug = false,
    throttleMs = 0,
  } = options;

  const lastCallRef = useRef(0);

  return useCallback((...args) => {
    // Throttle if specified
    if (throttleMs > 0) {
      const now = Date.now();
      if (now - lastCallRef.current < throttleMs) {
        return;
      }
      lastCallRef.current = now;
    }

    if (debug) {
      logger.debug('Callback called with:', args)
    }

    return callback(...args);
  }, deps);
};

/**
 * Hook for managing form state with validation
 */
export const useFormState = (initialValues = {}, options = {}) => {
  const {
    validateOnChange = false,
    validateOnBlur = true,
    validators = {},
    onSubmit,
    resetOnSubmit = false,
  } = options;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback((name, value) => {
    const validator = validators[name];
    if (!validator) return true;

    try {
      const result = validator(value, values);
      setErrors(prev => ({ ...prev, [name]: result || null }));
      return !result;
    } catch (error) {
      logger.error(`Validation error for ${name}:`, error)
      setErrors(prev => ({ ...prev, [name]: error.message }));
      return false;
    }
  }, [validators, values]);

  // Validate all fields
  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validators).forEach(name => {
      const validator = validators[name];
      if (validator) {
        try {
          const result = validator(values[name], values);
          if (result) {
            newErrors[name] = result;
            isValid = false;
          }
        } catch (error) {
          newErrors[name] = error.message;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validators, values]);

  // Handle field change
  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));

    if (validateOnChange) {
      validateField(name, value);
    }
  }, [validateOnChange, validateField]);

  // Handle field blur
  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));

    if (validateOnBlur) {
      validateField(name, values[name]);
    }
  }, [validateOnBlur, validateField, values]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }

    setIsSubmitting(true);

    try {
      // Mark all fields as touched
      setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

      // Validate all fields
      const isValid = validateAll();

      if (!isValid) {
        return false;
      }

      // Call submit handler if provided
      if (onSubmit) {
        await onSubmit(values);
      }

      // Reset form if specified
      if (resetOnSubmit) {
        setValues(initialValues);
        setErrors({});
        setTouched({});
      }

      return true;
    } catch (error) {
      logger.error('Form submission error:', error)
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateAll, onSubmit, resetOnSubmit, initialValues]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validateField,
    validateAll,
    setValue: (name, value) => handleChange(name, value),
    setError: (name, error) => setErrors(prev => ({ ...prev, [name]: error })),
  };
};

/**
 * Hook for managing async operations with loading states
 */
export const useAsyncOperation = (asyncFn, options = {}) => {
  const {
    immediate = false,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn(...args);
      setData(result);

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      setError(err);

      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, [asyncFn, onSuccess, onError]);

  // Execute immediately if specified
  useEffect(() => {
    if (immediate) {
      execute().catch(console.error);
    }
  }, [immediate, execute]);

  return {
    data,
    loading,
    error,
    execute,
  };
};

/**
 * Debounce a changing value
 * @param {*} value The input value to debounce
 * @param {number} delay Delay in ms (default 300)
 * @returns {*} Debounced value
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// No additional exports needed - all functions are exported individually
