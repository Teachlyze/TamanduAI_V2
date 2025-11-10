import { logger } from '@/shared/utils/logger';
import { useState, useEffect, useCallback, useContext, createContext, useRef } from 'react';
import { supabase } from '@/shared/services/supabaseClient';

// Create and export the context
export const AuthContext = createContext(null);

// Export the provider as default
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // We'll use a ref to store the navigate function
  const navigateRef = useRef(null);

  // Bootstrap: if session exists, fetch user payload
  useEffect(() => {
    let mounted = true;
    let timeoutId = null;
    
    const bootstrap = async () => {
      const startTime = performance.now();

      // Safety timeout - force loading to false after 15 seconds
      timeoutId = setTimeout(() => {
        if (mounted) {
          logger.warn('[AuthContext] Bootstrap timeout - forcing loading to false')
          setLoading(false);
          setUser(null);
        }
      }, 15000);

      try {
        // Add timeout to getSession call
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        );
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        const sessionTime = performance.now() - startTime;

        console.log('[AuthContext] Session check:', {
          hasSession: !!session,
          error: sessionError,
          timeMs: sessionTime.toFixed(2)
        });

        if (!mounted) return;

        if (sessionError) {
          logger.error('[AuthContext] Session error:', sessionError)
          // If token is invalid or refresh failed, force sign out
          try { await supabase.auth.signOut(); } catch (_) {}
          return;
        }

        if (!session) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Get user from session instead of making another API call
        setUser(session.user ?? null);
      } catch (err) {
        logger.error('[AuthContext] Bootstrap auth error:', err)
        if (mounted) {
          setError(err?.message || String(err));
          setUser(null);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();
    
    // Update on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // logger.debug('[AuthContext] Auth state changed:', _event, 'Session:', !!session)
      
      if (!mounted) {
        // logger.debug('[AuthContext] Component unmounted, skipping auth state change')
        return;
      }
      
      // For SIGNED_IN events during active login, skip to avoid race condition
      // The signIn function will handle setting the user
      if (_event === 'SIGNED_IN') {
        // logger.debug('[AuthContext] SIGNED_IN event - user will be set by signIn function')
        return;
      }
      
      try {
        if (!session) {
          // logger.debug('[AuthContext] No session, clearing user')
          setUser(null);
          return;
        }
        
        // Only fetch user for other events (TOKEN_REFRESHED, etc.)
        // logger.debug('[AuthContext] Fetching user from auth state change...')
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (mounted) {
          // logger.debug('[AuthContext] User updated from auth state change:', userData?.user?.email)
          setUser(userData?.user ?? null);
        }
      } catch (err) {
        logger.error('[AuthContext] Auth state refresh error:', err)
        if (mounted) {
          setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  // Sign in with email and password (direct Supabase auth)
  const signIn = async (email, password, hcaptchaToken) => {
    try {
      setLoading(true);
      setError(null);
      
      // Perform Supabase sign-in directly
      const signInOptions = {
        email,
        password,
      };
      
      // Include captcha token if provided (for Supabase's built-in captcha)
      if (hcaptchaToken) {
        signInOptions.options = {
          captchaToken: hcaptchaToken,
        };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword(signInOptions);
      
      if (error) {
        console.error('Supabase sign-in error:', {
          message: error.message,
          status: error.status,
          code: error.code,
          details: error
        });
        
        // Provide more specific error messages
        if (error.status === 500) {
          throw new Error('Erro no servidor de autenticação. Por favor, tente novamente em alguns instantes.');
        } else if (error.message?.includes('Invalid login credentials')) {
          throw new Error('Email ou senha incorretos');
        } else if (error.message?.includes('Email not confirmed')) {
          throw new Error('Por favor, confirme seu email antes de fazer login');
        }
        throw error;
      }
      
      // logger.debug('[AuthContext] Sign-in successful, session created')
      
      // The onAuthStateChange handler will update the user automatically
      // We just need to get the user from the response data
      const meUser = data?.user ?? null;
      // logger.debug('[AuthContext] User from sign-in response:', meUser?.email)
      
      // Set user immediately from the response (don't wait for onAuthStateChange)
      setUser(meUser);
      
      const needsOnboarding = !(
        meUser?.user_metadata?.role && 
        meUser?.user_metadata?.terms_accepted && 
        meUser?.user_metadata?.privacy_accepted
      );
      
      // logger.debug('[AuthContext] Sign-in complete, needsOnboarding:', needsOnboarding)
      // logger.debug('[AuthContext] Setting loading to false')
      setLoading(false); // Set loading to false after setting user
      
      return { user: meUser, needsOnboarding };
    } catch (error) {
      logger.error('Sign-in error:', error)
      const errorMessage = error.message || 'Erro ao fazer login';
      setError(errorMessage);
      setLoading(false); // Set loading to false on error
      return { error: { message: errorMessage } };
    }
  };

  // Sign up with email and password (direct Supabase auth)
  const signUp = async (userData, hcaptchaToken) => {
    try {
      setLoading(true);
      setError(null);
      
      // Perform Supabase registration directly
      const signUpOptions = {
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.name,
            cpf: userData.cpf,
            role: userData.role || 'student'
          }
        }
      };
      
      // Include captcha token if provided
      if (hcaptchaToken) {
        signUpOptions.options.captchaToken = hcaptchaToken;
      }
      
      const { data, error } = await supabase.auth.signUp(signUpOptions);
      if (error) throw error;
      
      // logger.debug('[AuthContext] User registered successfully:', data.user?.email)
      return { user: data.user, success: true };
    } catch (error) {
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Complete onboarding
  const completeOnboarding = async (concluded = true) => {
    try {
      setLoading(true);
      // logger.debug('[AuthContext] Completing onboarding...')
      
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      // Update user metadata
      const { data: updatedData, error: updateError } = await supabase.auth.updateUser({
        data: {
          ...currentUser.user_metadata,
          onboarding_completed: concluded,
          onboarding_completed_at: new Date().toISOString()
        }
      });
      
      if (updateError) throw updateError;
      
      // logger.debug('[AuthContext] Onboarding completed')
      setUser(updatedData?.user ?? currentUser);
      return { user: updatedData?.user ?? currentUser };
    } catch (err) {
      setError(err?.message || String(err));
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Use the navigate function if it's available
      if (navigateRef.current) {
        navigateRef.current('/login');
      } else {
        // Fallback to window.location if navigate is not available yet
        window.location.href = '/login';
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [navigateRef]);

  // Prepare the context value
  const contextValue = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    completeOnboarding,
    // Aliases for backwards compatibility
    login: signIn,
    register: signUp,
    logout: signOut,
    setNavigate: (navigate) => {
      navigateRef.current = navigate;
    }
  };

  // Render the provider with the context value
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
