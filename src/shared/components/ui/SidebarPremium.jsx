import React, { useEffect, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Users, 
  BookOpen, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut,
  MessageCircle,
  BarChart3,
  X,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';

  const teacherNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Turmas', href: '/dashboard/classes', icon: Users },
  { name: 'Atividades', href: '/dashboard/activities', icon: BookOpen },
  { name: 'Alunos', href: '/dashboard/students', icon: GraduationCap },
  { name: 'Agenda', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Relatórios', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Chatbot', href: '/dashboard/chatbot', icon: MessageCircle },
];

const studentNavigation = [
  { name: 'Dashboard', href: '/students', icon: Home },
  { name: 'Atividades', href: '/students/activities', icon: BookOpen },
  { name: 'Meu Progresso', href: '/students/performance', icon: BarChart3 },
];

const schoolNavigation = [
  { name: 'Dashboard', href: '/school', icon: Home },
  { name: 'Professores', href: '/school/teachers', icon: Users },
  { name: 'Turmas', href: '/school/classes', icon: Users },
  { name: 'Relatórios', href: '/school/reports', icon: BarChart3 },
  { name: 'Comunicações', href: '/school/comms', icon: MessageCircle },
  { name: 'Configurações', href: '/school/settings', icon: Settings },
];

export const SidebarPremium = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState('teacher'); // Default to teacher
  const [navigation, setNavigation] = useState(teacherNavigation);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return;

      try {
        // Try to get role from user metadata first
        if (user.user_metadata?.role) {
          const role = user.user_metadata.role;
          setUserRole(role);
          setNavigation(
            role === 'student' ? studentNavigation : role === 'school' ? schoolNavigation : teacherNavigation
          );
          return;
        }

        // Fallback: Fetch from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role) {
          setUserRole(profile.role);
          setNavigation(
            profile.role === 'student' ? studentNavigation : profile.role === 'school' ? schoolNavigation : teacherNavigation
          );
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        // Keep default teacher navigation
      }
    };

    fetchUserRole();
  }, [user]);

  // Route-driven role override to keep sidebar in sync when switching context
  useEffect(() => {
    if (location.pathname.startsWith('/school')) {
      setUserRole('school');
      setNavigation(schoolNavigation);
      return;
    }
    if (location.pathname.startsWith('/students')) {
      setUserRole('student');
      setNavigation(studentNavigation);
      return;
    }
    if (location.pathname.startsWith('/dashboard')) {
      setUserRole('teacher');
      setNavigation(teacherNavigation);
    }
  }, [location.pathname]);

  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };
  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -280
        }}
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-[280px] flex flex-col',
          'bg-card border-r border-border shadow-lg overflow-hidden',
          // Desktop: sempre visível, Mobile: controla com isOpen
          'lg:!translate-x-0 lg:z-30'
        )}
        style={{
          transition: 'transform 0.3s ease-in-out'
        }}
        role="navigation"
        aria-label="Menu principal"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-white hover:opacity-90">
              TamanduAI
            </span>
            <span
              className={cn(
                'ml-2 text-[11px] px-2 py-0.5 rounded-full border',
                userRole === 'school' && 'bg-orange-50 text-orange-700 border-orange-200',
                userRole === 'student' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                userRole === 'teacher' && 'bg-blue-50 text-blue-700 border-blue-200'
              )}
            >
              {userRole === 'school' ? 'Escola' : userRole === 'student' ? 'Aluno' : 'Professor'}
            </span>
          </Link>
          
          {/* Close button - Mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
  return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 flex-shrink-0',
                      active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.email?.split('@')[0] || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || 'user@email.com'}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Link
              to={userRole === 'school' ? '/school/settings' : userRole === 'student' ? '/profile' : '/dashboard/settings'}
              onClick={onClose}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Link>
            
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default SidebarPremium;
