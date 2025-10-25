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
      try {
        console.log('[AuthContext] Starting bootstrap...');
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.warn('[AuthContext] Bootstrap timeout - forcing completion');
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }, 5000); // 5 seconds timeout
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        clearTimeout(timeoutId);
        
        if (sessionError) {
          console.error('[AuthContext] Session error:', sessionError);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (!session) {
          console.log('[AuthContext] No session found');
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        console.log('[AuthContext] Session found:', session.user.email);
        
        if (mounted) {
          setUser(session.user);
          
          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setProfile(profileData);
          setLoading(false);
          console.log('[AuthContext] Bootstrap complete');
        }

      } catch (err) {
        console.error('[AuthContext] Bootstrap error:', err);
        clearTimeout(timeoutId);
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
      console.log('[AuthContext] Auth state change:', event);
      
      // Só buscar profile em eventos relevantes
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session && mounted) {
          setUser(session.user);
          
          // Fetch profile apenas se necessário
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (mounted) {
            setProfile(profileData);
            setLoading(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        // Não fazer nada, bootstrap já cuidou disso
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
