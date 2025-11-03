import { logger } from '@/shared/utils/logger';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { navigateToHome } from '@/utils/roleNavigation';
import { supabase } from '@/lib/supabaseClient';

/**
 * Custom hook for handling application navigation
 * @returns {Object} Navigation methods and state
 */
export const useAppNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  /**
   * Navigate to a route with state
   * @param {string} path - The path to navigate to
   * @param {Object} options - Navigation options
   * @param {boolean} options.replace - Whether to replace the current history entry
   * @param {Object} options.state - State to pass to the new route
   */
  const goTo = (path, { replace = false, state = null } = {}) => {
    navigate(path, { replace, state });
  };

  /**
   * Navigate back in history
   */
  const goBack = () => {
    navigate(-1);
  };

  /**
   * Navigate to login with a return URL
   * @param {string} returnPath - The path to return to after login
   */
  const goToLogin = (returnPath = null) => {
    const from = returnPath || location.pathname + location.search;
    navigate('/login', { state: { from } });
  };

  /**
   * Navigate to dashboard (role-based)
   */
  const goToDashboard = () => {
    const role = user?.user_metadata?.role || 'student';
    navigateToHome(navigate, role);
  };

  /**
   * Handle sign out and redirect
   * @param {string} redirectPath - Path to redirect to after sign out
   */
  const handleSignOut = async (redirectPath = '/login') => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate(redirectPath);
    } catch (error) {
      logger.error('Error signing out:', error)
    }
  };

  /**
   * Check if current path matches a given path
   * @param {string} path - Path to check
   * @param {boolean} exact - Whether to match exactly
   * @returns {boolean}
   */
  const isActive = (path, exact = false) => {
    return exact 
      ? location.pathname === path 
      : location.pathname.startsWith(path);
  };

  return {
    navigate,
    location,
    goTo,
    goBack,
    goToLogin,
    goToDashboard,
    handleSignOut,
    isActive,
  };
};

export default useAppNavigation;
