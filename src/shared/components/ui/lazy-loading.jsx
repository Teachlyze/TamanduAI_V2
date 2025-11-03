import { logger } from '@/shared/utils/logger';
import React, { cloneElement, lazy, useEffect, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { Loader2 } from 'lucide-react';

// Sistema avançado de lazy loading com diferentes estratégias
export const [loading, setLoading] = useState(true);
  const createLazyComponent = (importFn, options = {}) => {
  const {
    strategy = 'intersection', // 'intersection' | 'interaction' | 'timeout'
    threshold = 0.1,
    rootMargin = '50px',
    timeout = 5000,
    fallback = null,
    loadingComponent = null,
  } = options;

  // Componente interno que gerencia o estado de carregamento
  const LazyWrapper = (props) => {

    // Lazy component
    const LazyComponent = lazy(() =>
      importFn().catch(error => {
        logger.error('Erro ao carregar componente lazy:', error)
        setHasError(true);
        throw error;
      })
    );

    useEffect(() => {
      if (strategy === 'intersection' && elementRef.current) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.disconnect();
            }
          },
          { threshold, rootMargin }
        );

        observer.observe(elementRef.current);
  return () => observer.disconnect();
      }
    }, [strategy, threshold, rootMargin]);

    useEffect(() => {
      if (strategy === 'timeout') {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, timeout);
  return () => clearTimeout(timer);
      }
    }, [strategy, timeout]);

    useEffect(() => {
      if (isVisible && !component && !hasError) {
        // Carregar componente em background
        importFn()
          .then(module => {
            setComponent(module.default || module);
          })
          .catch(error => {
            logger.error('Erro ao carregar componente:', error)
            setHasError(true);
          });
      }
    }, [isVisible, component, hasError, importFn]);

    // Renderizar baseado no estado
    if (hasError) {
  return (
        <div className="flex items-center justify-center p-8 text-red-500">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">Erro ao carregar componente</p>
          </div>
        </div>
      );
    }

    if (!isVisible || !component) {
  return (
        <div ref={elementRef} className="flex items-center justify-center p-8">
          {loadingComponent || (
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Carregando componente...
              </p>
            </div>
          )}
        </div>
      );
    }

    return <component {...props} />;
  };

  // Wrapper com Suspense para casos onde o componente já foi carregado
  return (props) => (
    <Suspense fallback={fallback || <div className="animate-pulse bg-gray-200 rounded-lg h-32" />}>
      <LazyWrapper {...props} />
    </Suspense>
  );
};

// Componentes lazy comuns da aplicação
export const LazyComponents = {
  // Gráficos e visualizações
  Chart: createLazyComponent(
    () => import('@/components/charts/ChartComponent'),
    { strategy: 'intersection', threshold: 0.1 }
  ),

  // Editor de texto rico
  RichTextEditor: createLazyComponent(
    () => import('@/components/editor/RichTextEditor'),
    { strategy: 'interaction' }
  ),

  // Whiteboard/Quadro branco (DESATIVADO - Agora SDK removido)
  // Whiteboard: createLazyComponent(
  //   () => import('@/components/Whiteboard/WhiteboardCanvas'),
  //   { strategy: 'intersection', threshold: 0.1 }
  // ),

  // Video player
  VideoPlayer: createLazyComponent(
    () => import('@/components/media/VideoPlayer'),
    { strategy: 'intersection', threshold: 0.1 }
  ),

  // Mapa interativo
  InteractiveMap: createLazyComponent(
    () => import('@/components/maps/InteractiveMap'),
    { strategy: 'intersection', threshold: 0.1 }
  ),

  // Calendário avançado
  AdvancedCalendar: createLazyComponent(
    () => import('@/components/calendar/AdvancedCalendar'),
    { strategy: 'timeout', timeout: 2000 }
  ),

  // Chatbot
  Chatbot: createLazyComponent(
    () => import('@/components/chat/ChatbotWidget'),
    { strategy: 'interaction' }
  ),

  // Formulários complexos
  AdvancedForm: createLazyComponent(
    () => import('@/components/forms/AdvancedFormBuilder'),
    { strategy: 'interaction' }
  ),

  // Dashboard de métricas
  MetricsDashboard: createLazyComponent(
    () => import('@/components/dashboard/MetricsDashboard'),
    { strategy: 'intersection', threshold: 0.1 }
  ),

  // Tabela virtualizada
  VirtualizedTable: createLazyComponent(
    () => import('@/components/tables/VirtualizedTable'),
    { strategy: 'intersection', threshold: 0.1 }
  ),

  // Árvore de arquivos
  FileTree: createLazyComponent(
    () => import('@/components/files/FileTree'),
    { strategy: 'interaction' }
  ),

  // Terminal/Console
  Terminal: createLazyComponent(
    () => import('@/components/terminal/TerminalComponent'),
    { strategy: 'interaction' }
  ),

  // Visualizador de código
  CodeViewer: createLazyComponent(
    () => import('@/components/code/CodeViewer'),
    { strategy: 'interaction' }
  ),

  // Componente de upload avançado
  AdvancedUploader: createLazyComponent(
    () => import('@/components/uploads/AdvancedFileUploader'),
    { strategy: 'interaction' }
  ),

  // Visualizador de PDF
  PDFViewer: createLazyComponent(
    () => import('@/components/pdf/PDFViewer'),
    { strategy: 'interaction' }
  ),

  // Componente de assinatura digital
  SignaturePad: createLazyComponent(
    () => import('@/components/signature/SignaturePad'),
    { strategy: 'interaction' }
  ),

  // Webcam/Câmera
  WebcamCapture: createLazyComponent(
    () => import('@/components/media/WebcamCapture'),
    { strategy: 'interaction' }
  ),

  // Reconhecimento de voz
  VoiceRecognition: createLazyComponent(
    () => import('@/components/voice/VoiceRecognition'),
    { strategy: 'interaction' }
  ),
};

// Hook para lazy loading condicional baseado em recursos do dispositivo
export const useConditionalLazyLoading = () => {
  const [shouldLazyLoad, setShouldLazyLoad] = useState(true);

  useEffect(() => {
    // Detectar se é um dispositivo móvel ou desktop
    const isMobile = window.innerWidth < 768;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    // Em dispositivos móveis com conexão lenta, sempre usar lazy loading
    if (isMobile && connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
      setShouldLazyLoad(true);
    }
    // Em desktop com conexão rápida, pode carregar componentes críticos imediatamente
    else if (!isMobile && connection && connection.effectiveType === '4g') {
      setShouldLazyLoad(false);
    }
  }, []);

  return shouldLazyLoad;
};

// Hook para pré-carregar componentes críticos baseado no comportamento do usuário
export const useSmartPreloading = () => {
  const [preloadedComponents, setPreloadedComponents] = useState(new Set());

  const preloadComponent = (componentName) => {
    if (preloadedComponents.has(componentName)) return;

    const component = LazyComponents[componentName];
    if (component && component.preload) {
      component.preload();
      setPreloadedComponents(prev => new Set([...prev, componentName]));
    }
  };

  // Pré-carregar componentes baseado em padrões de uso
  useEffect(() => {
    const handleRouteChange = () => {
      // Pré-carregar componentes relacionados à rota atual
      const currentPath = window.location.pathname;

      if (currentPath.includes('/dashboard')) {
        preloadComponent('MetricsDashboard');
      } else if (currentPath.includes('/activities')) {
        preloadComponent('RichTextEditor');
        preloadComponent('AdvancedForm');
      } else if (currentPath.includes('/classes')) {
        preloadComponent('VirtualizedTable');
      }
    };

    // Pré-carregar inicial baseado na landing page
    if (window.location.pathname === '/') {
      setTimeout(() => {
        preloadComponent('Chart');
        preloadComponent('InteractiveMap');
      }, 3000);
    }

    window.addEventListener('popstate', handleRouteChange);
  return () => window.removeEventListener('popstate', handleRouteChange);
  }, [preloadedComponents]);

  return {
    preloadComponent,
    preloadedComponents: Array.from(preloadedComponents),
  };
};

// Componente wrapper para componentes lazy com métricas
export const LazyComponentWrapper = ({
  children,
  componentName,
  onLoad,
  onError,
  ...props
}) => {
  const [loadTime, setLoadTime] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    setLoadTime(Date.now());
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = (error) => {
    logger.error(`Erro ao carregar componente ${componentName}:`, error)
    if (onError) onError(error);
  };

  // Em desenvolvimento, logar métricas de performance
  useEffect(() => {
    if (isLoaded && loadTime && process.env.NODE_ENV === 'development') {
      const loadDuration = loadTime - performance.now();
      logger.debug(`📊 Componente ${componentName} carregado em ${loadDuration}ms`)
    }
  }, [isLoaded, loadTime, componentName]);
  return (
    <div data-component={componentName}>
      {React.cloneElement(children, {
        onLoad: handleLoad,
        onError: handleError,
        ...props,
      })}
    </div>
  );
};

export default LazyComponents;
