import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect, useContext, createContext, useMemo, useCallback } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { storageManager } from '@/shared/services/storageManager';

// Create and export the context
export const AuthContext = createContext(null);

// Export the provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: check for existing session
  useEffect(() => {
    let mounted = true;
    let timeoutId;
    
    const bootstrap = async () => {
      const startTime = Date.now();
      
      try {
        // Set a shorter timeout
        timeoutId = setTimeout(() => {
          if (mounted) {
            logger.warn('[AuthContext] Bootstrap timeout - setting loading to false')
            setLoading(false);
          }
        }, 3000); // 3 seconds timeout
        
        // Get current session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve({ data: { session: null }, error: null }), 2500)
        );
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        
        if (!mounted) return;
        
        if (sessionError) {
          logger.error('[AuthContext] Session error:', sessionError)
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (!session) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        setUser(session.user);
        
        // ✅ Usar user_metadata IMEDIATAMENTE
        const immediateProfile = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role || 'student',
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url,
          cpf: session.user.user_metadata?.cpf,
          created_at: session.user.created_at
        };
        
        setProfile(immediateProfile);
        setLoading(false);
        
        // Buscar profile completo do DB em background (não bloqueia)
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (mounted && profileData && !profileError) {
              logger.debug('[AuthContext] Profile atualizado do DB:', profileData.role)
              setProfile(profileData);
            }
          })
          .catch(err => {
            logger.debug('[AuthContext] Profile fetch em background falhou (ignorado):', err.message);
          });

      } catch (err) {
        logger.error('[AuthContext] Bootstrap error:', err)
        if (timeoutId) clearTimeout(timeoutId);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    bootstrap();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        return;
      }
      
      // SIGNED_IN: usuário acabou de fazer login
      if (event === 'SIGNED_IN') {
        setUser(session.user);
        
        // ✅ Usar user_metadata IMEDIATAMENTE (não bloqueia)
        const immediateProfile = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role || 'student',
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url,
          cpf: session.user.user_metadata?.cpf,
          created_at: session.user.created_at
        };
        
        logger.debug('[AuthContext] Using user_metadata profile:', immediateProfile.role)
        setProfile(immediateProfile);
        setLoading(false);
        
        // Buscar profile da tabela em background (não bloqueia redirecionamento)
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (mounted && profileData && !profileError) {
              setProfile(profileData);
            }
          })
          .catch(err => {
            // Ignora erro de fetch em background
          });
      }
      // USER_UPDATED: atualizar dados do usuário
      else if (event === 'USER_UPDATED') {
        if (session) {
          setUser(session.user);
          // Atualizar profile com timeout
          try {
            const profilePromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), 2000)
            );
            
            const { data: profileData } = await Promise.race([
              profilePromise,
              timeoutPromise
            ]);
            
            if (mounted && profileData) {
              setProfile(profileData);
            }
          } catch (err) {
            logger.warn('[AuthContext] USER_UPDATED profile fetch failed:', err.message)
          }
        }
      }
      // SIGNED_OUT: limpar estado
      else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
      // Ignorar outros eventos
      else {
        // Ignora
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  // Sign In
  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('[AuthContext] Sign in error:', error)
      return { data: null, error };
    }
  }, []);

  // Sign Up
  const signUp = useCallback(async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('[AuthContext] Sign up error:', error)
      return { data: null, error };
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    try {
      
      // 1. Sign out do Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 2. Limpar estado do contexto
      setUser(null);
      setProfile(null);
      
      // 3. Limpar localStorage (mantém apenas preferências globais)
      storageManager.clearUserData();
      
      return { error: null };
    } catch (error) {
      logger.error('[AuthContext] Sign out error:', error)
      return { error };
    }
  }, []);

  // Memoizar value para evitar re-renders desnecessários
  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  }), [user, profile, loading, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
