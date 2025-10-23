// src/components/ui/meetings-skeleton.jsx
import React from 'react';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Card } from '@/shared/components/ui/card';
import { Calendar, Video, Plus, Users } from 'lucide-react';

const MeetingsSkeleton = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Empty State Skeleton */}
      <Card className="p-8">
        <div className="text-center space-y-3">
          <Skeleton className="w-8 h-8 mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </Card>

      {/* Meetings Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="w-4 h-4" />
            </div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <div className="pt-2 flex gap-2">
              <Skeleton className="h-8 flex-1" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MeetingsSkeleton;
