// Cache and token management utilities
export const clearAllAuthData = () => {
  try {
    // Clear localStorage
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear cookies
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax;Secure`;
    });
  } catch (error) {
    // Ignore errors during cleanup
  }
};

export const resetSupabaseSession = () => {
  try {
    // Clear all auth data
    clearAllAuthData();

    // Force reload to clear any cached imports
    window.location.reload();
  } catch (error) {
    // Ignore errors during cleanup
  }
};

export const checkStorageConsistency = () => {
  try {
    const localTokens = localStorage.getItem('supabase.auth.token');
    const accessToken = localStorage.getItem('sb-access-token');
    const refreshToken = localStorage.getItem('sb-refresh-token');

    if ((localTokens && (!accessToken || !refreshToken)) ||
        (accessToken && !localTokens) ||
        (refreshToken && !localTokens)) {
      clearAllAuthData();
      return false;
    }

    return true;
  } catch (error) {
    // Ignore errors during consistency check
    return false;
  }
};
