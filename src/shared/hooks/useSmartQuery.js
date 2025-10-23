import { createContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabaseClient';

// Configurações de cache inteligente
export const cacheConfig = {
  // Configurações padrão para diferentes tipos de dados
  default: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,   // 10 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },

  // Dados em tempo real (dashboard, notificações)
  realtime: {
    staleTime: 30 * 1000,     // 30 segundos
    gcTime: 2 * 60 * 1000,    // 2 minutos
    refetchInterval: 60 * 1000, // Refetch a cada minuto
    retry: 2,
  },

  // Dados estáticos (usuário, configurações)
  static: {
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
    retry: 1,
  },

  // Dados críticos (segurança, permissões)
  critical: {
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000,    // 30 minutos
    retry: 5,
    retryDelay: 1000,
  },

  // Dados de formulários (temporário)
  forms: {
    staleTime: 0,             // Sempre considerar stale
    gcTime: 5 * 60 * 1000,    // 5 minutos
    retry: 0,                 // Não tentar novamente
  },
};

// Estratégias de invalidação inteligente
export const invalidationStrategies = {
  // Invalidação baseada em eventos
  eventBased: {
    userUpdate: ['user', 'profile', 'permissions'],
    classUpdate: (classId) => [`class-${classId}`, `class-students-${classId}`, `class-activities-${classId}`],
    activityUpdate: (activityId) => [`activity-${activityId}`, `activities-list`, `class-activities-*`],
  },

  // Invalidação baseada em tempo
  timeBased: {
    dashboard: 5 * 60 * 1000,      // 5 minutos
    notifications: 2 * 60 * 1000,  // 2 minutos
    userProfile: 15 * 60 * 1000,   // 15 minutos
  },

  // Invalidação baseada em padrões
  patternBased: {
    userData: /^user/,
    classData: /^class/,
    activityData: /^activity/,
  },
};

// Hook para consultas com cache inteligente baseada em padrões de uso
export const useSmartQuery = (queryKey, queryFn, options = {}) => {
  const {
    cacheStrategy = 'default',
    ...queryOptions
  } = options;

  // Aplicar estratégia de cache
  const config = { ...cacheConfig[cacheStrategy], ...queryOptions };

  return useQuery(queryKey, queryFn, config);
};

// Hook para gerenciamento de cache baseado em padrões de uso
export const useCacheManager = () => {
  const queryClient = useQueryClient();

  // Limpar cache baseado em padrões
  const clearCacheByPattern = useCallback((pattern) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey.some(key =>
          typeof key === 'string' && key.includes(pattern)
        );
      },
    });
  }, [queryClient]);

  // Otimizar cache baseado no uso de memória
  const optimizeCache = useCallback(() => {
    const queries = queryClient.getQueryCache().getAll();

    // Remover consultas antigas não utilizadas
    queries.forEach(query => {
      const lastAccessed = query.state.dataUpdatedAt;
      const now = Date.now();
      const age = now - lastAccessed;

      // Remover consultas com mais de 1 hora sem acesso
      if (age > 60 * 60 * 1000 && !query.getObserversCount()) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  }, [queryClient]);

  // Pré-carregar dados críticos baseado no comportamento do usuário
  const preloadCriticalData = useCallback((userId) => {
    // Pré-carregar dados essenciais do usuário
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => fetchUserProfile(userId),
      staleTime: cacheConfig.static.staleTime,
    });

    // Pré-carregar permissões
    queryClient.prefetchQuery({
      queryKey: ['user-permissions', userId],
      queryFn: () => fetchUserPermissions(userId),
      staleTime: cacheConfig.critical.staleTime,
    });

    // Pré-carregar configurações da aplicação
    queryClient.prefetchQuery({
      queryKey: ['app-settings'],
      queryFn: () => fetchAppSettings(),
      staleTime: cacheConfig.static.staleTime,
    });
  }, [queryClient]);

  // Configurar invalidação automática baseada em eventos
  const setupAutoInvalidation = useCallback(() => {
    // Invalidação baseada em tempo
    Object.entries(invalidationStrategies.timeBased).forEach(([key, interval]) => {
      setInterval(() => {
        queryClient.invalidateQueries({ queryKey: [key] });
      }, interval);
    });
  }, [queryClient]);

  return {
    clearCacheByPattern,
    optimizeCache,
    preloadCriticalData,
    setupAutoInvalidation,
  };
};

// Provider de contexto para configurações de cache global
export const QueryCacheProvider = ({ children }) => {
  const cacheManager = useCacheManager();

  // Configurar invalidação automática ao montar
  React.useEffect(() => {
    cacheManager.setupAutoInvalidation();
  }, [cacheManager]);

  return (
    <QueryCacheContext.Provider value={cacheManager}>
      {children}
    </QueryCacheContext.Provider>
  );
};

// Hook para usar o cache manager global
export const useGlobalCache = () => {
  const context = useContext(QueryCacheContext);
  if (!context) {
    throw new Error('useGlobalCache must be used within QueryCacheProvider');
  }
  return context;
};

// Implementações reais das consultas usando Supabase
const fetchUserProfile = async (userId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar dados do usuário através da Edge Function
    const { data, error } = await supabase.functions.invoke('auth-me', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;

    return data?.user || null;
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    throw error;
  }
};

const fetchUserPermissions = async (userId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar permissões do usuário através da Edge Function
    const { data, error } = await supabase.functions.invoke('auth-me', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;

    const user = data?.user;
    if (!user) return [];

    // Mapear role para permissões básicas
    const rolePermissions = {
      admin: ['admin', 'read', 'write', 'manage_users', 'manage_classes', 'manage_activities'],
      teacher: ['read', 'write', 'manage_classes', 'manage_activities'],
      student: ['read'],
    };

    return rolePermissions[user.role] || ['read'];
  } catch (error) {
    console.error('Erro ao buscar permissões do usuário:', error);
    throw error;
  }
};

const fetchAppSettings = async () => {
  try {
    // Buscar configurações da aplicação do banco de dados
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return data || {
      theme: 'light',
      language: 'pt-BR',
      enable_animations: true,
      enable_notifications: true,
    };
  } catch (error) {
    console.error('Erro ao buscar configurações da aplicação:', error);
    // Retornar configurações padrão em caso de erro
    return {
      theme: 'light',
      language: 'pt-BR',
      enable_animations: true,
      enable_notifications: true,
    };
  }
};

// Contexto para cache manager global
const QueryCacheContext = createContext(null);

export default {
  cacheConfig,
  invalidationStrategies,
  useSmartQuery,
  useCacheManager,
  useGlobalCache,
  QueryCacheProvider,
};
