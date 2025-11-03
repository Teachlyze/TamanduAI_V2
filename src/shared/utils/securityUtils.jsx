import { logger } from '@/shared/utils/logger';
/**
 * Utilitários de segurança para proteção contra XSS e conteúdo malicioso
 */

// ============================================
// XSS PROTECTION UTILITIES
// ============================================

/**
 * Lista de tags HTML permitidas para sanitização básica
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img'
]);

/**
 * Lista de atributos permitidos
 */
const ALLOWED_ATTRIBUTES = new Set([
  'href', 'src', 'alt', 'title', 'class', 'id'
]);

/**
 * Padrões regex para detectar conteúdo potencialmente perigoso
 */
const DANGEROUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /onclick\s*=/gi,
  /onmouseover\s*=/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /<form[^>]*>.*?<\/form>/gi,
  /<input[^>]*>/gi,
  /<meta[^>]*>/gi,
  /<link[^>]*>/gi
];

/**
 * Sanitiza texto para prevenir XSS attacks
 * @param {string} input - Texto a ser sanitizado
 * @param {Object} options - Opções de sanitização
 * @returns {string} Texto sanitizado
 */
export const sanitizeText = (input, options = {}) => {
  if (typeof input !== 'string') {
    return '';
  }

  const {
    allowHtml = false,
    maxLength = 10000,
    stripAllHtml = false
  } = options;

  // Verificação básica de segurança
  if (!input || input.length === 0) {
    return '';
  }

  // Limitar tamanho para prevenir ataques DoS
  if (input.length > maxLength) {
    input = input.substring(0, maxLength);
  }

  // Se deve remover todo HTML
  if (stripAllHtml) {
    return input
      .replace(/<[^>]*>/g, '') // Remove todas as tags HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Se permitir HTML limitado
  if (allowHtml) {
    return sanitizeHtml(input);
  }

  // Sanitização básica (sem HTML)
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitiza HTML limitado para prevenir XSS
 * @param {string} html - HTML a ser sanitizado
 * @returns {string} HTML sanitizado
 */
export const sanitizeHtml = (html) => {
  if (typeof html !== 'string') {
    return '';
  }

  // Primeiro, detectar e remover conteúdo perigoso
  let sanitized = html;

  DANGEROUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Se não houver HTML restante, retornar texto simples
  if (!sanitized.includes('<') && !sanitized.includes('>')) {
    return sanitizeText(sanitized, { stripAllHtml: false });
  }

  // Parser básico de HTML para sanitização
  return sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Valida se um texto contém conteúdo potencialmente perigoso
 * @param {string} input - Texto a ser validado
 * @returns {Object} Resultado da validação
 */
export const validateTextSafety = (input) => {
  if (typeof input !== 'string') {
    return { isSafe: false, reason: 'Input deve ser string' };
  }

  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /onmouseover\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /<input/i,
    /eval\s*\(/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return {
        isSafe: false,
        reason: `Conteúdo potencialmente perigoso detectado: ${pattern.source}`,
        pattern: pattern.source
      };
    }
  }

  // Verificar tamanho excessivo
  if (input.length > 50000) {
    return {
      isSafe: false,
      reason: 'Texto muito longo (>50KB)'
    };
  }

  return { isSafe: true };
};

/**
 * Sanitiza dados de formulário antes de enviar
 * @param {Object} formData - Dados do formulário
 * @returns {Object} Dados sanitizados
 */
export const sanitizeFormData = (formData) => {
  if (!formData || typeof formData !== 'object') {
    return {};
  }

  const sanitized = {};

  Object.keys(formData).forEach(key => {
    const value = formData[key];

    if (typeof value === 'string') {
      // Sanitizar campos de texto
      if (key.toLowerCase().includes('description') ||
          key.toLowerCase().includes('content') ||
          key.toLowerCase().includes('message') ||
          key.toLowerCase().includes('comment')) {
        sanitized[key] = sanitizeText(value, { allowHtml: false, maxLength: 5000 });
      } else {
        sanitized[key] = sanitizeText(value, { stripAllHtml: true, maxLength: 1000 });
      }
    } else if (Array.isArray(value)) {
      // Sanitizar arrays
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeText(item, { stripAllHtml: true }) : item
      );
    } else {
      // Manter outros tipos
      sanitized[key] = value;
    }
  });

  return sanitized;
};

/**
 * Hook para sanitização automática em componentes React
 * @param {string} initialValue - Valor inicial
 * @param {Object} options - Opções de sanitização
 * @returns {Array} [value, setValue, isValid]
 */
export const useSanitizedInput = (initialValue = '', options = {}) => {
  const [value, setValue] = React.useState(() =>
    sanitizeText(initialValue, options)
  );
  const [isValid, setIsValid] = React.useState(true);

  const handleChange = React.useCallback((newValue) => {
    const sanitized = sanitizeText(newValue, options);
    const validation = validateTextSafety(sanitized);

    setValue(sanitized);
    setIsValid(validation.isSafe);
  }, [options]);

  return [value, handleChange, isValid];
};

/**
 * Componente de texto sanitizado para renderização segura
 * @param {Object} props - Propriedades do componente
 * @returns {JSX.Element} Elemento renderizado
 */
export const SafeText = ({ children, as = 'span', className = '', ...props }) => {
  const sanitizedContent = React.useMemo(() => {
    if (typeof children === 'string') {
      return sanitizeText(children, { stripAllHtml: true });
    }
    return children;
  }, [children]);

  const Component = as;

  return (
    <Component className={className} {...props}>
      {sanitizedContent}
    </Component>
  );
};

/**
 * Hook para validação de segurança em formulários
 */
export const useSecurityValidation = () => {
  const validateInput = React.useCallback((input, fieldType = 'text') => {
    const validation = validateTextSafety(input);

    if (!validation.isSafe) {
      return {
        isValid: false,
        error: validation.reason,
        suggestion: 'Conteúdo contém elementos potencialmente perigosos'
      };
    }

    // Validações específicas por tipo de campo
    switch (fieldType) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input)) {
          return {
            isValid: false,
            error: 'Formato de email inválido',
            suggestion: 'Digite um endereço de email válido'
          };
        }
        break;

      case 'url':
        try {
          new URL(input);
        } catch {
          return {
            isValid: false,
            error: 'URL inválida',
            suggestion: 'Digite uma URL válida (ex: https://exemplo.com)'
          };
        }
        break;

      case 'phone':
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(input.replace(/\s/g, ''))) {
          return {
            isValid: false,
            error: 'Formato de telefone inválido',
            suggestion: 'Digite um número de telefone válido'
          };
        }
        break;
    }

    return { isValid: true };
  }, []);

  return { validateInput };
};

// ============================================
// CONTENT SECURITY UTILITIES
// ============================================

/**
 * Valida se um arquivo é seguro para upload
 * @param {File} file - Arquivo a ser validado
 * @param {Object} options - Opções de validação
 * @returns {Object} Resultado da validação
 */
export const validateFileSecurity = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    checkContent = false
  } = options;

  if (!file) {
    return { isValid: false, error: 'Arquivo não fornecido' };
  }

  // Verificar tamanho
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${Math.round(maxSize / 1024 / 1024)}MB`
    };
  }

  // Verificar tipo MIME
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Tipo de arquivo não permitido: ${file.type}`
    };
  }

  // Verificação básica de conteúdo (para arquivos de texto)
  if (checkContent && file.type.startsWith('text/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const validation = validateTextSafety(content);

        resolve({
          isValid: validation.isSafe,
          error: validation.isSafe ? null : validation.reason
        });
      };
      reader.onerror = () => {
        resolve({ isValid: false, error: 'Erro ao ler arquivo' });
      };
      reader.readAsText(file);
    });
  }

  return { isValid: true };
};

/**
 * Sanitiza nome de arquivo para prevenir ataques de path traversal
 * @param {string} filename - Nome do arquivo
 * @returns {string} Nome sanitizado
 */
export const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') {
    return 'file';
  }

  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove caracteres inválidos para nomes de arquivo
    .replace(/\.\./g, '') // Remove path traversal
    .substring(0, 255); // Limitar tamanho
};

/**
 * Gera nome de arquivo seguro
 * @param {string} originalName - Nome original
 * @param {string} extension - Extensão do arquivo
 * @returns {string} Nome seguro
 */
export const generateSecureFilename = (originalName, extension = '') => {
  const sanitized = sanitizeFilename(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return `${sanitized}_${timestamp}_${random}${extension}`;
};

// ============================================
// REACT SECURITY HOOKS
// ============================================

/**
 * Hook para proteção contra XSS em componentes React
 */
export const useXssProtection = () => {
  const sanitizeContent = React.useCallback((content, options = {}) => {
    return sanitizeText(content, { allowHtml: false, ...options });
  }, []);

  const validateContent = React.useCallback((content) => {
    return validateTextSafety(content);
  }, []);

  return { sanitizeContent, validateContent };
};

/**
 * Hook para validação de segurança em formulários
 */
export const useFormSecurity = () => {
  const { validateInput } = useSecurityValidation();

  const validateForm = React.useCallback((formData) => {
    const errors = {};

    Object.keys(formData).forEach(key => {
      const value = formData[key];
      const validation = validateInput(value, key);

      if (!validation.isValid) {
        errors[key] = validation.error;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [validateInput]);

  return { validateForm, validateInput };
};

// ============================================
// UTILITIES FOR DANGEROUS HTML
// ============================================

/**
 * Renderiza HTML de forma segura (apenas quando absolutamente necessário)
 * @param {string} html - HTML a ser renderizado
 * @param {Object} options - Opções de segurança
 * @returns {Object} Configuração segura para dangerouslySetInnerHTML
 */
export const createSafeHtmlConfig = (html, options = {}) => {
  const {
    allowedTags = ALLOWED_TAGS,
    allowedAttributes = ALLOWED_ATTRIBUTES,
    requireValidation = true
  } = options;

  if (requireValidation) {
    const validation = validateTextSafety(html);
    if (!validation.isSafe) {
      logger.warn('HTML inseguro bloqueado:', validation.reason)
      return { __html: sanitizeHtml(html) };
    }
  }

  return { __html: sanitizeHtml(html) };
};

/**
 * Componente para renderização segura de conteúdo rico
 */
export const SafeHtml = ({ html, className = '', ...props }) => {
  const safeConfig = React.useMemo(() => createSafeHtmlConfig(html), [html]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={safeConfig}
      {...props}
    />
  );
};

// Export default com principais utilitários
export default {
  sanitizeText,
  sanitizeHtml,
  validateTextSafety,
  sanitizeFormData,
  validateFileSecurity,
  sanitizeFilename,
  generateSecureFilename,
  useSanitizedInput,
  useXssProtection,
  useFormSecurity,
  createSafeHtmlConfig,
  SafeText,
  SafeHtml
};
