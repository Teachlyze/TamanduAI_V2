/**
 * Utilitários para validação e formatação de CPF
 */

/**
 * Remove caracteres não numéricos do CPF
 * @param {string} cpf - CPF com ou sem formatação
 * @returns {string} CPF apenas com números
 */
export const cleanCPF = (cpf) => {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
};

/**
 * Formata CPF no padrão 000.000.000-00
 * @param {string} cpf - CPF com ou sem formatação
 * @returns {string} CPF formatado
 */
export const formatCPF = (cpf) => {
  const cleaned = cleanCPF(cpf);
  
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
};

/**
 * Valida CPF usando algoritmo oficial
 * @param {string} cpf - CPF com ou sem formatação
 * @returns {boolean} True se válido
 */
export const validateCPF = (cpf) => {
  const cleaned = cleanCPF(cpf);
  
  // Verifica se tem 11 dígitos
  if (cleaned.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
};

/**
 * Máscara de input para CPF
 * Aplica formatação enquanto usuário digita
 * @param {string} value - Valor atual do input
 * @returns {string} Valor formatado
 */
export const maskCPF = (value) => {
  return formatCPF(value);
};

/**
 * Verifica se CPF é válido e retorna mensagem de erro se não for
 * @param {string} cpf - CPF a validar
 * @returns {string|null} Mensagem de erro ou null se válido
 */
export const getCPFError = (cpf) => {
  if (!cpf || cpf.trim() === '') {
    return null; // CPF vazio é permitido (opcional)
  }
  
  const cleaned = cleanCPF(cpf);
  
  if (cleaned.length < 11) {
    return 'CPF incompleto';
  }
  
  if (cleaned.length > 11) {
    return 'CPF deve ter 11 dígitos';
  }
  
  if (!validateCPF(cpf)) {
    return 'CPF inválido';
  }
  
  return null;
};
