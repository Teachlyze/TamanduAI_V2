import React from 'react';

/**
 * Skeleton Loading Component
 * Shows animated placeholder rectangles that match the structure of the content
 */
export const SkeletonLoader = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  );
};

/**
 * Stats Card Skeleton
 */
export const StatsCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
        <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
      </div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2 animate-pulse"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
    </div>
  );
};

/**
 * Activity Item Skeleton
 */
export const ActivityItemSkeleton = () => {
  return (
    <div className="flex items-start space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 animate-pulse">
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      <div className="flex-1">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
    </div>
  );
};

/**
 * Dashboard Skeleton - Main loading placeholder for dashboard
 */
export const DashboardSkeleton = () => {
  return (
    <div className="w-full space-y-8 animate-pulse">
      {/* Welcome Section Skeleton */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-3xl p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-10 bg-white/20 rounded w-96 mb-3"></div>
            <div className="h-6 bg-white/20 rounded w-80"></div>
          </div>
          <div className="w-32 h-32 bg-white/10 rounded-full"></div>
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Activities Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <ActivityItemSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-36"></div>
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
                <div className="text-right">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl mx-auto mb-4"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
