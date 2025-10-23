import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getClassActivities, createActivity as createActivityService, updateActivity as updateActivityService, deleteActivity as deleteActivityService } from '@/shared/services/apiSupabase';
import { useAuth } from "@/hooks/useAuth";
import { Logger } from '@/shared/services/logger';
import { useClassActivities } from '@/shared/hooks/useRedisCache';

const ActivityContext = createContext();

export const useActivities = () => {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    // Return default values when context is not available
    return {
      activities: [],
      loading: false,
      error: null,
      fetchActivities: () => {},
      createActivity: () => {},
      updateActivity: () => {},
      deleteActivity: () => {},
      clearError: () => {},
    };
  }
  return context;
};

export const ActivityProvider = ({ children, classId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, loading: authLoading } = useAuth();

  // Use Redis cache for activities
  const { data: cachedActivities, loading: cacheLoading, error: cacheError, invalidateCache } = useClassActivities(classId);

  const fetchActivities = useCallback(async (classId) => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (typeof classId === 'undefined') {
        setActivities([]);
        setLoading(false);
        setError('Nenhuma turma selecionada (classId indefinido).');
        Logger.warn('fetchActivities chamado com classId indefinido');
        return;
      }

      // Use cache first, fallback to direct API call if needed
      if (cachedActivities) {
        setActivities(cachedActivities);
        setLoading(false);
        Logger.info('Atividades carregadas do cache Redis', {
          classId,
          count: cachedActivities?.length || 0
        });
      } else {
        const data = await getClassActivities(classId);
        setActivities(data || []);
        setLoading(false);
        Logger.info('Atividades carregadas da API (cache miss)', {
          classId,
          count: data?.length || 0
        });
      }
    } catch (err) {
      Logger.error('Erro ao buscar atividades', {
        classId,
        error: err.message
      });
      setError(err.message || 'Falha ao carregar atividades');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, cachedActivities]);

  // Update activities when cache data changes
  useEffect(() => {
    if (cachedActivities) {
      setActivities(cachedActivities);
      setError(null);
    } else if (cacheError) {
      setError(cacheError);
    }
  }, [cachedActivities, cacheError]);

  const createActivity = useCallback(async (activityData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await createActivityService(activityData);

      // Invalidate cache to force refresh
      if (invalidateCache) {
        await invalidateCache();
      }

      await fetchActivities(activityData.class_id);
      Logger.info('Atividade criada com sucesso', {
        activityId: data?.id,
        classId: activityData.class_id
      });
      return data;
    } catch (err) {
      Logger.error('Erro ao criar atividade', {
        error: err.message,
        classId: activityData?.class_id
      });
      setError(err.message || 'Falha ao criar atividade');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchActivities, invalidateCache]);

  const updateActivity = useCallback(async (id, updates) => {
    try {
      setLoading(true);
      setError(null);
      const data = await updateActivityService(id, updates);

      // Invalidate cache to force refresh
      if (invalidateCache) {
        await invalidateCache();
      }

      await fetchActivities(updates.class_id);
      Logger.info('Atividade atualizada com sucesso', {
        activityId: id,
        classId: updates.class_id
      });
      return data;
    } catch (err) {
      Logger.error('Erro ao atualizar atividade', {
        activityId: id,
        error: err.message
      });
      setError(err.message || 'Falha ao atualizar atividade');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchActivities, invalidateCache]);

  const deleteActivity = useCallback(async (id, classId) => {
    try {
      setLoading(true);
      setError(null);
      await deleteActivityService(id);

      // Invalidate cache to force refresh
      if (invalidateCache) {
        await invalidateCache();
      }

      await fetchActivities(classId);
      Logger.info('Atividade excluída com sucesso', {
        activityId: id,
        classId
      });
    } catch (err) {
      Logger.error('Erro ao excluir atividade', {
        activityId: id,
        error: err.message
      });
      setError(err.message || 'Falha ao excluir atividade');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchActivities, invalidateCache]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
    Logger.info('Erro limpo pelo usuário');
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    activities,
    loading: loading || cacheLoading,
    error: error || cacheError,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    clearError,
  }), [
    activities,
    loading,
    cacheLoading,
    error,
    cacheError,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    clearError,
  ]);

  return (
    <ActivityContext.Provider value={contextValue}>
      {children}
    </ActivityContext.Provider>
  );
};
