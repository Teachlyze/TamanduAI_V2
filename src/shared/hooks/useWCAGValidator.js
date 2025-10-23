// Hook básico para validação WCAG
export const useWCAGValidator = () => {
  const validateWCAG = async () => {
    // Implementação básica - pode ser expandida conforme necessário
    return { isValid: true, violations: [] };
  };

  const violations = [];
  const isValidating = false;

  return {
    validateWCAG,
    violations,
    isValidating
  };
};
