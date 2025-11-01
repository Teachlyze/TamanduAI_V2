import React, { useState, useMemo, useCallback, memo } from 'react';
import { Menu } from 'lucide-react';
import { SidebarPremium } from '@/shared/components/ui/SidebarPremium';
import { Button } from '@/shared/components/ui/button';

// Memoizar header para evitar re-renders
const MobileHeader = memo(({ onMenuClick }) => (
  <div className="lg:hidden sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-4">
    <Button
      variant="ghost"
      size="sm"
      onClick={onMenuClick}
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
));
MobileHeader.displayName = 'MobileHeader';

export const TeacherLayout = memo(({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Memoizar callbacks
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);
  const handleSidebarOpen = useCallback(() => setSidebarOpen(true), []);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - memoizado, só re-renderiza se isOpen ou onClose mudar */}
      <SidebarPremium 
        isOpen={sidebarOpen} 
        onClose={handleSidebarClose}
        role="teacher"
      />

      {/* Main Content */}
      <div className="lg:pl-[280px] min-h-screen">
        {/* Mobile Header - memoizado */}
        <MobileHeader onMenuClick={handleSidebarOpen} />

        {/* Page Content - o children muda, mas sidebar não re-renderiza */}
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
});
TeacherLayout.displayName = 'TeacherLayout';

export default TeacherLayout;
