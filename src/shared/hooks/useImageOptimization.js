import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para otimização de imagens com carregamento lêvedo e tratamento de erros
 * @param {string} src - URL da imagem
 * @param {Object} [options] - Opções de configuração
 * @param {boolean} [options.lazy=true] - Habilita o carregamento lêvedo
 * @param {string} [options.fallback] - URL da imagem de fallback em caso de erro
 * @returns {Object} - Estado e métodos para controle da imagem
 */
const useImageOptimization = (src, options = {}) => {
  const { lazy = true, fallback } = options;
  const [imageSrc, setImageSrc] = useState(lazy ? '' : src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Verifica se a imagem está no viewport para carregamento lêvedo
  const handleIntersection = useCallback((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setImageSrc(src);
        observer.unobserve(entry.target);
      }
    });
  }, [src]);

  // Configura o Intersection Observer para carregamento lêvedo
  useEffect(() => {
    if (!lazy) {
      setImageSrc(src);
      return;
    }

    let observer;
    const imageElement = document.createElement('img');
    
    // Usa o Intersection Observer para carregar a imagem quando estiver próxima ao viewport
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(handleIntersection, {
        rootMargin: '200px', // Carrega a imagem quando estiver a 200px do viewport
        threshold: 0.01
      });
      
      // Observa um elemento fictício para determinar quando carregar a imagem
      observer.observe(imageElement);
    } else {
      // Fallback para navegadores sem suporte a IntersectionObserver
      setImageSrc(src);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [src, lazy, handleIntersection]);

  // Carrega a imagem e verifica por erros
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    let isMounted = true;
    
    const handleLoad = () => {
      if (isMounted) {
        setIsLoading(false);
        setHasError(false);
      }
    };

    const handleError = () => {
      if (isMounted) {
        setIsLoading(false);
        setHasError(true);
        if (fallback) {
          setImageSrc(fallback);
        }
      }
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = imageSrc;

    return () => {
      isMounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [imageSrc, fallback]);

  // Retorna o estado atual e métodos úteis
  return {
    src: hasError ? fallback || '' : imageSrc,
    isLoading,
    hasError,
    // Método para forçar o recarregamento da imagem
    retry: () => {
      setIsLoading(true);
      setHasError(false);
      setImageSrc(src);
    }
  };
};

export default useImageOptimization;
