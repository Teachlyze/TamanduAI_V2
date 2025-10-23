// src/hooks/useActivityDrafts.js
import { useState, useEffect, useCallback } from 'react';

// Hook para gerenciar rascunhos de atividades com cache local
export const useActivityDrafts = (userId) => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Simple in-memory cache for drafts
  const cacheKey = `user:drafts:${userId}`;

  const loadDrafts = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // For now, return empty array (drafts are created locally)
      // In a real implementation, you might want to sync with server
      setDrafts([]);
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveDraft = useCallback(async (draftData) => {
    if (!userId) return;

    try {
      const updatedDrafts = [...drafts];
      const existingIndex = updatedDrafts.findIndex(d => d.id === draftData.id);

      if (existingIndex >= 0) {
        updatedDrafts[existingIndex] = { ...draftData, updatedAt: new Date().toISOString() };
      } else {
        updatedDrafts.push({
          ...draftData,
          id: draftData.id || `draft_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Store in localStorage for persistence
      const cacheData = {
        userId,
        drafts: updatedDrafts,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      setDrafts(updatedDrafts);

      return updatedDrafts;
    } catch (err) {
      console.error('Error saving draft:', err);
      throw err;
    }
  }, [userId, drafts, cacheKey]);

  const deleteDraft = useCallback(async (draftId) => {
    if (!userId) return;

    try {
      const updatedDrafts = drafts.filter(d => d.id !== draftId);

      // Update localStorage
      const cacheData = {
        userId,
        drafts: updatedDrafts,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      setDrafts(updatedDrafts);

      return updatedDrafts;
    } catch (err) {
      console.error('Error deleting draft:', err);
      throw err;
    }
  }, [userId, drafts, cacheKey]);

  const getDraft = useCallback((draftId) => {
    return drafts.find(d => d.id === draftId);
  }, [drafts]);

  const clearAllDrafts = useCallback(async () => {
    if (!userId) return;

    try {
      // Clear localStorage
      localStorage.removeItem(cacheKey);
      setDrafts([]);
    } catch (err) {
      console.error('Error clearing drafts:', err);
      throw err;
    }
  }, [userId, cacheKey]);

  // Load drafts from localStorage on mount
  useEffect(() => {
    if (!userId) return;

    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed.userId === userId) {
          setDrafts(parsed.drafts || []);
        }
      }
    } catch (err) {
      console.error('Error loading drafts from localStorage:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, cacheKey]);

  return {
    drafts,
    loading,
    error,
    saveDraft,
    deleteDraft,
    getDraft,
    clearAllDrafts,
    refetch: loadDrafts
  };
};

export default useActivityDrafts;
