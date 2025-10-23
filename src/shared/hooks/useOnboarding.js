import { useCallback, useMemo } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';

// Centralizes onboarding UI logic using AuthContext's user and completeOnboarding()
export default function useOnboarding() {
  const { user, completeOnboarding, loading } = useAuth();

  const needsOnboarding = useMemo(() => {
    if (!user) return false;
    return user.onboarding_concluido === false;
  }, [user]);

  const skipOrComplete = useCallback(async () => {
    // Marks onboarding as concluded both in DB and Redis cache via Edge Function
    return completeOnboarding(true);
  }, [completeOnboarding]);

  return {
    user,
    loading,
    needsOnboarding,
    complete: skipOrComplete,
  };
}
