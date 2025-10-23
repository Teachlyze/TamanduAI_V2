import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook personalizado para gerenciar chamadas à API com tratamento de erros
 * @param {Function} apiFunction - Função da API a ser chamada
 * @param {Object} options - Opções adicionais
 * @param {string} options.successMessage - Mensagem de sucesso a ser exibida
 * @param {string} options.errorMessage - Mensagem de erro personalizada
 * @param {Function} options.onSuccess - Callback para sucesso
 * @param {Function} options.onError - Callback para erro
 * @returns {[Function, {isLoading: boolean, error: Error | null}]}
 */
export const useApi = (apiFunction, options = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const {
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    showToast = true,
  } = options;

  const execute = useCallback(
    async (...args) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await apiFunction(...args);
        
        if (successMessage && showToast) {
          toast({
            title: 'Sucesso',
            description: successMessage,
            variant: 'default',
          });
        }
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err) {
        console.error('API Error:', err);
        
        const errorMessageText = errorMessage || 
          err.message || 
          'Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.';
        
        setError(err);
        
        if (showToast) {
          toast({
            title: 'Erro',
            description: errorMessageText,
            variant: 'destructive',
          });
        }
        
        if (onError) {
          onError(err);
        }
        
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFunction, errorMessage, onError, onSuccess, successMessage, toast, showToast]
  );

  return [execute, { isLoading, error }];
};

/**
 * Hook para buscar dados com tratamento de erros e estado de carregamento
 * @param {Function} fetchFunction - Função para buscar dados
 * @param {Object} options - Opções adicionais
 * @returns {Object} { data, error, isLoading, refresh }
 */
export const useFetch = (fetchFunction, options = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchFunction();
      setData(result);
      return result;
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(err);
      
      if (options.showErrorToast !== false) {
        toast({
          title: 'Erro ao carregar dados',
          description: err.message || 'Não foi possível carregar os dados. Tente novamente.',
          variant: 'destructive',
        });
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunction, options.showErrorToast, toast]);
  
  // Executa a busca quando o hook é montado
  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchData();
    }
  }, [fetchData, options.autoFetch]);
  
  // Função para forçar atualização dos dados
  const refresh = useCallback(() => {
    return fetchData();
  }, [fetchData]);
  
  return { data, error, isLoading, refresh };
};
