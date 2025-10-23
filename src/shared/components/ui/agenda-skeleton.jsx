// src/components/ui/agenda-skeleton.jsx
import React from 'react';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Card } from '@/shared/components/ui/card';
import { Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';

const AgendaSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Conflict Alert Skeleton */}
      <div className="p-4 rounded-lg border border-yellow-300 bg-yellow-50">
        <div className="flex items-start gap-3">
          <Skeleton className="w-5 h-5 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="space-y-1">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-3 w-64" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Day Groups Skeleton */}
      {Array.from({ length: 3 }).map((_, dayIndex) => (
        <div key={dayIndex} className="border rounded-xl p-4">
          <Skeleton className="h-6 w-48 mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, eventIndex) => (
              <div key={eventIndex} className="flex items-start justify-between bg-card border rounded-lg p-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <div className="flex gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgendaSkeleton;
