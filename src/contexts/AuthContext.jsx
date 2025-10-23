import { useState, useEffect, useCallback, useContext, createContext, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
      if (process.env.NODE_ENV === 'development') {
        // console.log('[AuthContext] Starting bootstrap...');
      }
      const startTime = performance.now();

      // Safety timeout - force loading to false after 10 seconds (increased from 5)
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('[AuthContext] Bootstrap timeout - forcing loading to false');
          setLoading(false);
          setUser(null);
        }
      }, 10000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        const sessionTime = performance.now() - startTime;

        if (process.env.NODE_ENV === 'development') {
          // console.log('[AuthContext] Session check:', {
          //   hasSession: !!session,
          //   error: sessionError,
          //   timeMs: sessionTime.toFixed(2)
          // });
        }

        if (!mounted) return;

        if (sessionError) {
          console.error('[AuthContext] Session error:', sessionError);
          // If token is invalid or refresh failed, force sign out
          try { await supabase.auth.signOut(); } catch (_) {}
          return;
        }

        if (!session) {
          if (process.env.NODE_ENV === 'development') {
            // console.log('[AuthContext] No session found');
          }
          setUser(null);
          setLoading(false);
          return;
        }

        // Get user from session instead of making another API call
        if (process.env.NODE_ENV === 'development') {
          // console.log('[AuthContext] User from session:', session.user?.email);
        }
        setUser(session.user ?? null);
      } catch (err) {
        console.error('[AuthContext] Bootstrap auth error:', err);
        if (mounted) {
          setError(err?.message || String(err));
          setUser(null);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (mounted) {
          const totalTime = performance.now() - startTime;
          if (process.env.NODE_ENV === 'development') {
            // console.log('[AuthContext] Bootstrap complete, setting loading to false (total time:', totalTime.toFixed(2), 'ms)');
          }
          setLoading(false);
        }
      }
    };

    bootstrap();
    
    // Update on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // console.log('[AuthContext] Auth state changed:', _event, 'Session:', !!session);
      
      if (!mounted) {
        // console.log('[AuthContext] Component unmounted, skipping auth state change');
        return;
      }
      
      // For SIGNED_IN events during active login, skip to avoid race condition
      // The signIn function will handle setting the user
      if (_event === 'SIGNED_IN') {
        // console.log('[AuthContext] SIGNED_IN event - user will be set by signIn function');
        return;
      }
      
      try {
        if (!session) {
          // console.log('[AuthContext] No session, clearing user');
          setUser(null);
          return;
        }
        
        // Only fetch user for other events (TOKEN_REFRESHED, etc.)
        // console.log('[AuthContext] Fetching user from auth state change...');
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (mounted) {
          // console.log('[AuthContext] User updated from auth state change:', userData?.user?.email);
          setUser(userData?.user ?? null);
        }
      } catch (err) {
        console.error('[AuthContext] Auth state refresh error:', err);
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

  // Sign in with email and password (guarded by hCaptcha + lockout)
  const signIn = async (email, password, hcaptchaToken) => {
    try {
      setLoading(true);
      setError(null);
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      // 1) Guard: validate hCaptcha + rate limit using Edge Function (skip on localhost)
      if (!isLocalhost) {
        try {
          await supabase.functions.invoke('auth-guard-login', {
            method: 'POST',
            body: { email, hcaptchaToken },
          })
        } catch (guardErr) {
          console.error('Auth guard error:', guardErr);
          // Surface guard error to caller
          throw new Error(guardErr?.message || 'Security check failed');
        }
      }

      // 2) Perform Supabase sign-in
      // console.log('Attempting sign-in with Supabase...');
      const signInOptions = {
        email,
        password,
      };
      
      // Include captcha token only in production (if Supabase has captcha enabled)
      if (!isLocalhost && hcaptchaToken) {
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
      
      // console.log('[AuthContext] Sign-in successful, session created');
      
      // 3) Clear attempts/lock on success (skip if edge function doesn't exist)
      if (!isLocalhost) {
        try {
          await supabase.functions.invoke('auth-login-success', {
            method: 'POST',
            body: { email },
          })
        } catch (_) { 
          // console.log('[AuthContext] auth-login-success edge function not available, skipping');
        }
      }
      
      // The onAuthStateChange handler will update the user automatically
      // We just need to get the user from the response data
      const meUser = data?.user ?? null;
      // console.log('[AuthContext] User from sign-in response:', meUser?.email);
      
      // Set user immediately from the response (don't wait for onAuthStateChange)
      setUser(meUser);
      
      const needsOnboarding = !(
        meUser?.user_metadata?.role && 
        meUser?.user_metadata?.terms_accepted && 
        meUser?.user_metadata?.privacy_accepted
      );
      
      // console.log('[AuthContext] Sign-in complete, needsOnboarding:', needsOnboarding);
      // console.log('[AuthContext] Setting loading to false');
      setLoading(false); // Set loading to false after setting user
      
      return { user: meUser, needsOnboarding };
    } catch (error) {
      console.error('Sign-in error:', error);
      const errorMessage = error.message || 'Erro ao fazer login';
      setError(errorMessage);
      setLoading(false); // Set loading to false on error
      return { error: { message: errorMessage } };
    }
  };

  // Sign up with email and password
  const signUp = async (userData, hcaptchaToken) => {
    try {
      setLoading(true);
      setError(null);
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      // 1) Guard: validate hCaptcha + rate limit using Edge Function (skip on localhost)
      if (!isLocalhost) {
        try {
          await supabase.functions.invoke('auth-guard-register', {
            method: 'POST',
            body: { email: userData.email, hcaptchaToken },
          })
        } catch (guardErr) {
          // console.log('[AuthContext] auth-guard-register edge function not available, skipping');
        }
      }

      // 2) Perform Supabase registration
      // console.log('[AuthContext] Registering user...');
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.name,
            cpf: userData.cpf,
            role: userData.role || 'student'
          }
        }
      });
      if (error) throw error;
      
      // console.log('[AuthContext] User registered successfully:', data.user?.email);
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
      // console.log('[AuthContext] Completing onboarding...');
      
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
      
      // console.log('[AuthContext] Onboarding completed');
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
