import React, { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '@/shared/services/supabaseClient';

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
      console.log('[AuthContext] Starting bootstrap...');
      const startTime = Date.now();
      
      try {
        // Set a shorter timeout
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('[AuthContext] Bootstrap timeout - setting loading to false');
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
        console.log(`[AuthContext] Session check completed in ${elapsed}ms`);
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('[AuthContext] Session error:', sessionError);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (!session) {
          console.log('[AuthContext] No session found');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        console.log('[AuthContext] Session found:', session.user.email);
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
        
        console.log('[AuthContext] Using user_metadata profile:', immediateProfile.role);
        setProfile(immediateProfile);
        setLoading(false);
        
        // Buscar profile da tabela em background (não bloqueia)
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (mounted && profileData && !profileError) {
              console.log('[AuthContext] Profile atualizado do DB:', profileData.role);
              setProfile(profileData);
            }
          })
          .catch(err => {
            console.log('[AuthContext] Profile fetch em background falhou (ignorado):', err.message);
          });
        
        console.log('[AuthContext] Bootstrap complete');

      } catch (err) {
        console.error('[AuthContext] Bootstrap error:', err);
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
      console.log('[AuthContext] Auth state change:', event, '- Has session:', !!session);
      
      if (!mounted) {
        console.log('[AuthContext] Component unmounted, ignoring event');
        return;
      }
      
      // SIGNED_IN: usuário acabou de fazer login
      if (event === 'SIGNED_IN') {
        console.log('[AuthContext] Processing SIGNED_IN event');
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
        
        console.log('[AuthContext] Using user_metadata profile:', immediateProfile.role);
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
              console.log('[AuthContext] Profile atualizado do DB:', profileData.role);
              setProfile(profileData);
            }
          })
          .catch(err => {
            console.log('[AuthContext] Profile fetch em background falhou (ignorado):', err.message);
          });
        
        console.log('[AuthContext] SIGNED_IN complete');
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
            console.warn('[AuthContext] USER_UPDATED profile fetch failed:', err.message);
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
        console.log('[AuthContext] Ignoring event:', event);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  // Sign In
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[AuthContext] Sign in error:', error);
      return { data: null, error };
    }
  };

  // Sign Up
  const signUp = async (email, password, metadata = {}) => {
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
      console.error('[AuthContext] Sign up error:', error);
      return { data: null, error };
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
      return { error };
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  };

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
