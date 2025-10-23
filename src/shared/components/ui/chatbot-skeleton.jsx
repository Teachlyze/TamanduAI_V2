// src/components/ui/chatbot-skeleton.jsx
import React from 'react';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';

const ChatbotSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="space-y-8 p-6">
        {/* Header Skeleton */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-6 w-64" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="w-60 h-12 rounded-xl" />
              <Skeleton className="w-40 h-12 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Instructions Skeleton */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-lg">
          <div className="flex items-center mb-6">
            <Skeleton className="w-12 h-12 rounded-2xl mr-4" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-80" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
                <Skeleton className="w-14 h-14 rounded-2xl mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Chat Interface Skeleton */}
          <div className="lg:col-span-2">
            <Card className="bg-white/70 backdrop-blur-sm border-white/50 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-white/50 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="ml-auto">
                    <Skeleton className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Messages Skeleton */}
              <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white/50">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex justify-start">
                    <div className="flex items-start space-x-3 max-w-xs">
                      <Skeleton className="w-10 h-10 rounded-2xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-64 rounded-2xl" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Skeleton */}
              <div className="p-6 border-t border-white/50 bg-white/50">
                <div className="flex space-x-3">
                  <Skeleton className="flex-1 h-12 rounded-xl" />
                  <Skeleton className="w-12 h-12 rounded-xl" />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            {/* Materials Card Skeleton */}
            <Card className="bg-white/70 backdrop-blur-sm border-white/50 shadow-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="w-8 h-8 rounded-xl" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-xl">
                      <Skeleton className="w-10 h-10 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      <Skeleton className="w-6 h-6 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Training Status Skeleton */}
            <Card className="bg-white/70 backdrop-blur-sm border-white/50 shadow-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="w-8 h-8 rounded-xl" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                  <Skeleton className="w-full h-10 rounded-lg" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotSkeleton;
