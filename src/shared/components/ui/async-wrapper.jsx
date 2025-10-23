// src/components/ui/async-wrapper.jsx
import React, { useEffect, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

  const AsyncWrapper = ({
  children,
  loading: externalLoading = false,
  error: externalError = null,
  onRetry,
  skeletonCount = 3,
  showRetryButton = true,
  fallback = null
}) => {
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalError, setInternalError] = useState(null);

  // Determina o estado final de loading e error
  const isLoading = externalLoading || internalLoading;
  const error = externalError || internalError;

  // Simula um carregamento inicial se não houver loading externo
  useEffect(() => {
    if (!externalLoading) {
      const timer = setTimeout(() => {
        setInternalLoading(false);
      }, 100); // Pequeno delay para mostrar skeleton
  return () => clearTimeout(timer);
    }
  }, [externalLoading]);

  // Loading state
  if (isLoading) {
  return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
  return (
      <Alert variant="destructive" className="max-w-md mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          {showRetryButton && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="bg-white dark:bg-slate-900 text-foreground border-border ml-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tentar novamente
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Success state
  return fallback || children;
};

export default AsyncWrapper;
