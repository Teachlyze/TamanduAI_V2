import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { SidebarPremium } from '@/shared/components/ui/SidebarPremium';
import { Button } from '@/shared/components/ui/button';

export const TeacherLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <SidebarPremium 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        role="teacher"
      />

      {/* Main Content */}
      <div className="lg:pl-[280px] min-h-screen">
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              TamanduAI
            </span>
          </div>
        </div>

        {/* Page Content */}
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
