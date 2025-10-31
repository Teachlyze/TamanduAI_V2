import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { SidebarPremium } from '@/shared/components/ui/SidebarPremium';
import { Button } from '@/shared/components/ui/button';
import ChatbotWidget from '@/shared/components/ui/ChatbotWidget';

export const StudentLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Extrair classId da URL se estiver em /students/classes/:classId
  const chatbotContext = useMemo(() => {
    const match = location.pathname.match(/\/students\/classes\/([a-f0-9-]+)/);
    if (match) {
      return { classId: match[1] };
    }
    return {};
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <SidebarPremium 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
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
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-transparent">
              TamanduAI
            </span>
          </div>
        </div>

        {/* Page Content */}
        <main className="w-full">
          {children}
        </main>
      </div>

      {/* Chatbot Widget Global */}
      <ChatbotWidget context={chatbotContext} />
    </div>
  );
};

export default StudentLayout;
