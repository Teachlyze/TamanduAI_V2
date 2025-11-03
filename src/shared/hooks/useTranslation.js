import { logger } from '@/shared/utils/logger';
/**
 * REMOVIDO: i18n não será usado no projeto
 * Este arquivo existe apenas para compatibilidade
 * mas não deve ser usado em novos componentes
 */

export function useTranslation() {
  const t = (key, fallback) => {
    logger.warn('useTranslation is deprecated. Use plain text instead.')
    return fallback || key;
  };

  return { t };
}

export default useTranslation;
