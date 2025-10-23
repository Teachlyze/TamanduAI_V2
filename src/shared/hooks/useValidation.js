import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';

/**
 * Hook personalizado para validações otimizadas com debounce
 * @param {Object} validationRules - Regras de validação
 * @param {Object} options - Opções de configuração
 * @returns {Object} - Estado e funções de validação
 */
export const useValidation = (validationRules = {}, options = {}) => {
  const {
    debounceMs = 300,
    validateOnChange = true,
    validateOnBlur = true,
    showSuccessState = true
  } = options;

  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Valores debounced para validação
  const debouncedValues = useDebounce(values, debounceMs);

  // Função para validar um campo individual
  const validateField = useCallback((fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    const fieldErrors = [];

    // Executar cada regra de validação
    for (const rule of rules) {
      if (typeof rule === 'function') {
        const result = rule(value, values);
        if (result !== true) {
          fieldErrors.push(result);
        }
      } else if (typeof rule === 'object' && rule.test) {
        // Regex validation
        if (!rule.test(value)) {
          fieldErrors.push(rule.message || 'Valor inválido');
        }
      }
    }

    return fieldErrors.length > 0 ? fieldErrors : null;
  }, [validationRules, values]);

  // Validar todos os campos
  const validateAll = useCallback(() => {
    const newErrors = {};
    let hasErrors = false;

    Object.keys(validationRules).forEach(fieldName => {
      const fieldErrors = validateField(fieldName, values[fieldName]);
      if (fieldErrors) {
        newErrors[fieldName] = fieldErrors;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    setIsValid(!hasErrors);

    return !hasErrors;
  }, [validationRules, values, validateField]);

  // Validar campo específico com debounce
  const validateFieldWithDebounce = useCallback((fieldName, value) => {
    setIsValidating(prev => ({ ...prev, [fieldName]: true }));

    // Simular debounce na validação (pode ser usado com API calls)
    setTimeout(() => {
      const fieldErrors = validateField(fieldName, value);

      setErrors(prev => ({
        ...prev,
        [fieldName]: fieldErrors
      }));

      setIsValidating(prev => ({ ...prev, [fieldName]: false }));

      // Atualizar estado de validade geral
      const allErrors = { ...errors, [fieldName]: fieldErrors };
      const hasAnyErrors = Object.values(allErrors).some(err => err && err.length > 0);
      setIsValid(!hasAnyErrors);
    }, 100);
  }, [validateField, errors]);

  // Efeito para validar quando valores debounced mudarem
  useEffect(() => {
    if (validateOnChange && Object.keys(debouncedValues).length > 0) {
      Object.keys(debouncedValues).forEach(fieldName => {
        if (touched[fieldName]) {
          validateFieldWithDebounce(fieldName, debouncedValues[fieldName]);
        }
      });
    }
  }, [debouncedValues, validateOnChange, touched, validateFieldWithDebounce]);

  // Função para definir valor de um campo
  const setValue = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));

    if (validateOnChange && touched[fieldName]) {
      validateFieldWithDebounce(fieldName, value);
    }
  }, [validateOnChange, touched, validateFieldWithDebounce]);

  // Função para marcar campo como tocado (foco perdido)
  const setFieldTouched = useCallback((fieldName, isTouched = true) => {
    setTouched(prev => ({ ...prev, [fieldName]: isTouched }));

    if (isTouched && validateOnBlur) {
      validateFieldWithDebounce(fieldName, values[fieldName]);
    }
  }, [validateOnBlur, values, validateFieldWithDebounce]);

  // Função para resetar validação de um campo
  const resetField = useCallback((fieldName) => {
    setValues(prev => ({ ...prev, [fieldName]: '' }));
    setErrors(prev => ({ ...prev, [fieldName]: null }));
    setTouched(prev => ({ ...prev, [fieldName]: false }));
    setIsValidating(prev => ({ ...prev, [fieldName]: false }));
  }, []);

  // Função para resetar todas as validações
  const resetAll = useCallback(() => {
    setValues({});
    setErrors({});
    setTouched({});
    setIsValidating({});
    setIsValid(false);
  }, []);

  // Função para obter estado de um campo específico
  const getFieldState = useCallback((fieldName) => {
    return {
      value: values[fieldName] || '',
      error: errors[fieldName],
      touched: touched[fieldName],
      isValidating: isValidating[fieldName],
      hasError: errors[fieldName] && errors[fieldName].length > 0,
      isValid: !errors[fieldName] || errors[fieldName].length === 0,
      showSuccess: showSuccessState && touched[fieldName] && !errors[fieldName] && values[fieldName]
    };
  }, [values, errors, touched, isValidating, showSuccessState]);

  return {
    // Estado geral
    values,
    errors,
    touched,
    isValidating,
    isValid,

    // Funções de controle
    setValue,
    setFieldTouched,
    resetField,
    resetAll,
    validateAll,

    // Estado específico de campo
    getFieldState,

    // Funções auxiliares
    hasErrors: Object.values(errors).some(err => err && err.length > 0),
    isDirty: Object.keys(touched).some(field => touched[field]),
  };
};

export default useValidation;
