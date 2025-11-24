import { logger } from '@/shared/utils/logger';

export const showErrorToast = (toast, fallbackMessage, error, options = {}) => {
  if (error) {
    logger.error(options.logPrefix || 'Unexpected error', error);
  }

  toast({
    title: options.title || 'Erro',
    description: options.description || fallbackMessage || 'Algo inesperado aconteceu. Tente novamente.',
    variant: options.variant || 'destructive',
  });
};
