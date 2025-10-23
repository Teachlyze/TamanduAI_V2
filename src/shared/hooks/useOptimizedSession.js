import { useState, useEffect, useCallback } from 'react';
import { supabase, clearSessionCache } from '@/shared/services/supabaseClient';
import { Logger } from '@/shared/services/logger';

// Optimized session hook with better caching and error handling
export const useOptimizedSession = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session: currentSession }, error } = await supabase.auth.getSession();

      if (error) {
        // Handle specific auth errors
        if (error.message?.includes('Invalid Refresh Token') ||
            error.message?.includes('Refresh Token Not Found')) {
          clearSessionCache();
          setSession(null);
          setError('Session expired. Please log in again.');
          return null;
        }
        throw error;
      }

      setSession(currentSession);
      return currentSession;
    } catch (err) {
      setError(err.message);
      setSession(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      setError(null);

      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();

      if (error) {
        if (error.message?.includes('Invalid Refresh Token') ||
            error.message?.includes('Refresh Token Not Found')) {
          clearSessionCache();
          setSession(null);
          setError('Session expired. Please log in again.');
          return null;
        }
        throw error;
      }

      setSession(refreshedSession);
      return refreshedSession;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const initializeSession = async () => {
      try {
        await checkSession();

        if (mounted) {
          // Set up auth state listener with better error handling
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (!mounted) return;

              if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setSession(session);
                setError(null);
              } else if (event === 'SIGNED_OUT') {
                setSession(null);
                setError(null);
                clearSessionCache();
              } else if (event === 'PASSWORD_RECOVERY') {
                setError('Password recovery initiated');
              }
            }
          );

          return () => {
            subscription?.unsubscribe();
          };
        }
      } catch (err) {
        if (mounted && retryCount < maxRetries) {
          retryCount++;
          setTimeout(initializeSession, 1000 * retryCount);
        }
      }
    };

    initializeSession();

    return () => {
      mounted = false;
    };
  }, [checkSession]);

  return {
    session,
    loading,
    error,
    checkSession,
    refreshSession,
    isAuthenticated: !!session,
    user: session?.user || null,
  };
};
