import React, { useState, useCallback, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { SidebarPremium } from '@/shared/components/ui/SidebarPremium';
import { Button } from '@/shared/components/ui/button';
import { storageManager } from '@/shared/services/storageManager';

// Memoizar header mobile
const MobileHeader = React.memo(({ onMenuClick }) => (
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
      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center">
        <span className="text-white text-xs font-bold">T</span>
      </div>
      <span className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-transparent">
        TamanduAI
      </span>
    </div>
  </div>
));
MobileHeader.displayName = 'MobileHeader';

export const StudentLayout = React.memo(({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => storageManager.getSidebarCollapsed());

  // Escutar mudanças no localStorage (quando sidebar é colapsada/expandida)
  useEffect(() => {
    const checkCollapsedState = () => {
      setSidebarCollapsed(storageManager.getSidebarCollapsed());
    };
    
    // Verificar a cada 100ms (evento de storage não funciona na mesma tab)
    const interval = setInterval(checkCollapsedState, 100);
    
    return () => clearInterval(interval);
  }, []);

  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);
  const handleSidebarOpen = useCallback(() => setSidebarOpen(true), []);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - memoizado */}
      <SidebarPremium 
        isOpen={sidebarOpen} 
        onClose={handleSidebarClose} 
      />

      {/* Main Content */}
      <div 
        className={`min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-[70px]' : 'lg:pl-[280px]'
        }`}
      >
        {/* Mobile Header - memoizado */}
        <MobileHeader onMenuClick={handleSidebarOpen} />

        {/* Page Content */}
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
});
StudentLayout.displayName = 'StudentLayout';

export default StudentLayout;
