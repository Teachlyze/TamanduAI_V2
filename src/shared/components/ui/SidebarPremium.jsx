import React, { useEffect, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { StudentProfileCard } from '@/shared/components/student/StudentProfileCard';

  const teacherNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Turmas', href: '/dashboard/classes', icon: Users },
  { name: 'Atividades', href: '/dashboard/activities', icon: BookOpen },
  { name: 'Alunos', href: '/dashboard/students', icon: GraduationCap },
  { name: 'Agenda', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Relatórios', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Chatbot', href: '/dashboard/chatbot', icon: MessageCircle },
  { name: 'Perfil', href: '/dashboard/profile', icon: Settings },
];

const studentNavigation = [
  { name: 'Dashboard', href: '/students', icon: Home },
  { name: 'Turmas', href: '/students/classes', icon: Users },
  { name: 'Atividades', href: '/students/activities', icon: BookOpen },
  { name: 'Meu Desempenho', href: '/students/performance', icon: BarChart3 },
  { name: 'Agenda', href: '/students/calendar', icon: Calendar },
  { name: 'Histórico', href: '/students/history', icon: FileText },
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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState('teacher'); // Default to teacher
  const [navigation, setNavigation] = useState(teacherNavigation);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

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
    // Verificação exata para dashboards (evitar que fiquem sempre ativos)
    if (href === '/dashboard' || href === '/students' || href === '/school') {
      return location.pathname === href;
    }
    // Para outras rotas, usa startsWith
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
        <div className={cn(
          "flex items-center justify-between h-14 px-4 border-b",
          userRole === 'student' 
            ? 'bg-gradient-to-r from-cyan-500/10 to-sky-500/10 dark:from-cyan-600/20 dark:to-sky-600/20 border-cyan-200/20 dark:border-cyan-700/30'
            : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-600/20 dark:to-cyan-600/20 border-blue-200/20 dark:border-blue-700/30'
        )}>
          <Link 
            to={userRole === 'student' ? '/students' : userRole === 'school' ? '/school' : '/dashboard'} 
            className="flex items-center gap-2" 
            onClick={onClose}
            aria-label="Ir para página inicial"
          >
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shadow-sm",
              userRole === 'student' 
                ? 'bg-gradient-to-br from-cyan-500 to-sky-600 dark:from-cyan-600 dark:to-sky-700'
                : 'bg-gradient-to-br from-blue-600 to-cyan-500 dark:from-blue-700 dark:to-cyan-600'
            )}>
              <BookOpen className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className={cn(
              "text-base font-bold bg-clip-text text-transparent hover:opacity-80 transition-opacity",
              userRole === 'student'
                ? 'bg-gradient-to-r from-cyan-600 to-sky-600 dark:from-cyan-400 dark:to-sky-400'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400'
            )}>
              TamanduAI
            </span>
          </Link>
          
          {/* Close button - Mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            aria-label="Fechar menu"
            title="Fechar menu"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Student Profile Card - Topo (apenas para estudantes) */}
        {userRole === 'student' && (
          <div className="px-2 pt-2">
            <StudentProfileCard />
          </div>
        )}

        {/* Navigation */}
        <nav className={cn(
          "flex-1 overflow-y-auto px-3",
          userRole === 'student' ? 'py-2' : 'py-4'
        )}
          role="navigation"
          aria-label="Menu principal"
        >
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
                    'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1',
                    active && userRole === 'student'
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-600 dark:from-cyan-600 dark:to-sky-700 text-white shadow-md focus:ring-cyan-400'
                      : active
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-700 dark:to-cyan-600 text-white shadow-md focus:ring-blue-400'
                      : userRole === 'student'
                      ? 'text-slate-700 dark:text-slate-300 hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-400 focus:ring-cyan-400'
                      : 'text-muted-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 focus:ring-blue-400'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 flex-shrink-0',
                      active 
                        ? 'text-white' 
                        : userRole === 'student'
                        ? 'text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400'
                        : 'text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        {userRole === 'student' ? (
          /* Botão Sair - Estudante */
          <div className="border-t border-cyan-200/20 dark:border-cyan-700/30 p-3">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all duration-200 border border-red-200 dark:border-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              aria-label="Sair da conta"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sair
            </button>
          </div>
        ) : (
          /* Seção padrão para Teacher e School */
          <div className="border-t border-border p-4 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 dark:from-blue-600/10 dark:to-cyan-600/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md">
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
                to={userRole === 'school' ? '/school/settings' : '/dashboard/settings'}
                onClick={onClose}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configurações
              </Link>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  );
};

export default SidebarPremium;
