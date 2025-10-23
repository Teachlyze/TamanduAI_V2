import { createContext, useCallback, useContext, useRef, useState } from 'react';

// Contexto para gerenciar anúncios live globalmente
const LiveRegionContext = createContext({
  announce: () => {},
  announceError: () => {},
  announceSuccess: () => {},
  announceWarning: () => {},
  announceInfo: () => {},
});

// Hook para usar funcionalidades de live regions
export const useLiveRegions = () => {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error('useLiveRegions must be used within a LiveRegionProvider');
  }
  return context;
};

// Provider de live regions
export const LiveRegionProvider = ({ children }) => {
  const politeRef = useRef(null);
  const assertiveRef = useRef(null);
  const statusRef = useRef(null);

  // Função para anunciar mensagens
  const announce = useCallback((message, priority = 'polite', atomic = true) => {
    if (!message) return;

    // Escolher a região apropriada baseada na prioridade
    let regionRef;
    switch (priority) {
      case 'assertive':
        regionRef = assertiveRef;
        break;
      case 'status':
        regionRef = statusRef;
        break;
      case 'polite':
      default:
        regionRef = politeRef;
        break;
    }

    if (regionRef.current) {
      // Limpar conteúdo anterior para evitar conflitos
      regionRef.current.textContent = '';

      // Usar setTimeout para garantir que o screen reader perceba a mudança
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      }, 100);
    }
  }, []);

  // Funções específicas para diferentes tipos de anúncio
  const announceError = useCallback((message) => {
    announce(`Erro: ${message}`, 'assertive');
  }, [announce]);

  const announceSuccess = useCallback((message) => {
    announce(`Sucesso: ${message}`, 'polite');
  }, [announce]);

  const announceWarning = useCallback((message) => {
    announce(`Aviso: ${message}`, 'polite');
  }, [announce]);

  const announceInfo = useCallback((message) => {
    announce(message, 'polite');
  }, [announce]);

  return (
    <LiveRegionContext.Provider value={{
      announce,
      announceError,
      announceSuccess,
      announceWarning,
      announceInfo,
    }}>
      {/* Live regions para diferentes prioridades */}
      <div
        ref={politeRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />
      <div
        ref={assertiveRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      />
      <div
        ref={statusRef}
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
        role="status"
      />
      {children}
    </LiveRegionContext.Provider>
  );
};

// Componente para regiões live customizadas
export const LiveRegion = ({
  children,
  priority = 'polite',
  atomic = true,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) => {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      className={`sr-only ${className}`}
      role={priority === 'assertive' ? 'alert' : 'status'}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </div>
  );
};

// Hook para gerenciar anúncios condicionais
export const useConditionalAnnouncements = () => {
  const { announce, announceError, announceSuccess } = useLiveRegions();

  const announceFormSubmission = useCallback((isSuccess, message) => {
    if (isSuccess) {
      announceSuccess(message || 'Formulário enviado com sucesso');
    } else {
      announceError(message || 'Erro ao enviar formulário');
    }
  }, [announceSuccess, announceError]);

  const announceNavigation = useCallback((from, to) => {
    announce(`Navegando de ${from} para ${to}`, 'polite');
  }, [announce]);

  const announceLoading = useCallback((isLoading, message = 'Carregando...') => {
    if (isLoading) {
      announce(message, 'polite');
    }
  }, [announce]);

  const announceDataChange = useCallback((changeType, details) => {
    const messages = {
      add: `Adicionado: ${details}`,
      remove: `Removido: ${details}`,
      update: `Atualizado: ${details}`,
      delete: `Excluído: ${details}`,
    };

    announce(messages[changeType] || details, 'polite');
  }, [announce]);

  return {
    announceFormSubmission,
    announceNavigation,
    announceLoading,
    announceDataChange,
  };
};

// Hook para anúncios de progresso
export const useProgressAnnouncements = () => {
  const { announce } = useLiveRegions();

  const announceStep = useCallback((current, total, description) => {
    announce(`Passo ${current} de ${total}: ${description}`, 'polite');
  }, [announce]);

  const announceProgress = useCallback((percentage, description) => {
    announce(`${percentage}% concluído: ${description}`, 'polite');
  }, [announce]);

  const announceCompletion = useCallback((description) => {
    announce(`Concluído: ${description}`, 'polite');
  }, [announce]);

  return {
    announceStep,
    announceProgress,
    announceCompletion,
  };
};

// Hook para anúncios de estado da aplicação
export const useAppStateAnnouncements = () => {
  const { announce } = useLiveRegions();

  const announceLogin = useCallback((userName) => {
    announce(`Bem-vindo, ${userName}! Login realizado com sucesso.`, 'polite');
  }, [announce]);

  const announceLogout = useCallback(() => {
    announce('Logout realizado com sucesso.', 'polite');
  }, [announce]);

  const announceConnectionChange = useCallback((isOnline) => {
    if (isOnline) {
      announce('Conexão com a internet restaurada.', 'polite');
    } else {
      announce('Conexão com a internet perdida.', 'assertive');
    }
  }, [announce]);

  const announceThemeChange = useCallback((theme) => {
    announce(`Tema alterado para ${theme === 'dark' ? 'escuro' : 'claro'}.`, 'polite');
  }, [announce]);

  return {
    announceLogin,
    announceLogout,
    announceConnectionChange,
    announceThemeChange,
  };
};

export default {
  LiveRegionProvider,
  useLiveRegions,
  useConditionalAnnouncements,
  useProgressAnnouncements,
  useAppStateAnnouncements,
  LiveRegion,
};
