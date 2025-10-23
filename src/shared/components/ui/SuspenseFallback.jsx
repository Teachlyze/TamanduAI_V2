import React from 'react';
import { Skeleton } from './skeleton';
import { AlertCircle } from 'lucide-react';
import { Button } from './button';

export const SuspenseFallback = () => (
  <div className="space-y-4 p-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="p-4 bg-red-50 text-red-700 rounded-lg">
    <div className="flex items-center space-x-2 mb-2">
      <AlertCircle className="h-5 w-5" />
      <h3 className="font-medium">Ocorreu um erro</h3>
    </div>
    <p className="text-sm mb-4">{error.message}</p>
    <Button
      variant="outline"
      size="sm"
      onClick={resetErrorBoundary}
      className="text-red-700 border-red-300 hover:bg-red-100"
    >
      Tentar novamente
    </Button>
  </div>
);

// Default export for compatibility with index.js
export default SuspenseFallback;
