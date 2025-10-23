import React, { useEffect, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell, User, Settings, LogOut } from 'lucide-react';
import { Button } from './button';
import { useAuth } from '@/shared/contexts/AuthContext';

/**
 * Layout aprimorado com melhor responsividade e acessibilidade
 * Usa princípios de design system com Tailwind + DaisyUI
 */
export const [loading, setLoading] = useState(true);
  const EnhancedLayout = ({
  children,
  title,
  subtitle,
  showSidebar = true,
  sidebarContent,
  headerActions,
  className = '',
  maxWidth = '7xl',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { signOut } = useAuth();

  // Detectar dispositivo móvel
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
      // Fechar sidebar automaticamente em mobile
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fechar sidebar ao clicar fora em mobile
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      const handleClickOutside = (event) => {
        if (!event.target.closest('.sidebar') && !event.target.closest('.sidebar-toggle')) {
          setSidebarOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sidebarOpen, isMobile]);

  const sidebarVariants = {
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
      },
    },
    open: {
      x: '0%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
      },
    },
  };

  const overlayVariants = {
    closed: { opacity: 0, display: 'none' },
    open: { opacity: 1, display: 'block' },
  };
  return (
    <div className={`min-h-screen bg-base-100 ${className}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-base-100/80 backdrop-blur-md border-b border-base-200">
        <div className={`container mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo/Brand + Mobile menu button */}
            <div className="flex items-center gap-4">
              {showSidebar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="sidebar-toggle lg:hidden"
                  aria-label="Toggle sidebar"
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}

              <div className="flex flex-col">
                {title && (
                  <h1 className="font-bold text-base-content text-lg">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-base-content/70">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              {headerActions}

              {/* User menu */}
              <div className="dropdown dropdown-end">
                <Button variant="ghost" size="sm" className="avatar avatar-ring" tabIndex={0}>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-content" />
                  </div>
                </Button>

                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52">
                  <li><a href="/profile">Perfil</a></li>
                  <li><a href="/settings">Configurações</a></li>
                  <li><a href="/notifications">Notificações</a></li>
                  <li className="divider"></li>
                  <li>
                    <button
                      onClick={signOut}
                      className="text-error hover:bg-error/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        {showSidebar && (
          <>
            <AnimatePresence>
              {sidebarOpen && isMobile && (
                <motion.div
                  initial="closed"
                  animate="open"
                  exit="closed"
                  variants={overlayVariants}
                  className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
            </AnimatePresence>

            <motion.aside
              initial={isMobile ? "closed" : false}
              animate={isMobile ? (sidebarOpen ? "open" : "closed") : "open"}
              variants={sidebarVariants}
              className={`sidebar fixed lg:static inset-y-0 left-0 z-50 w-64 bg-base-100 border-r border-base-200 transform lg:transform-none ${
                isMobile ? 'lg:w-0' : ''
              }`}
            >
              <div className="flex flex-col h-full p-4">
                <div className="flex-1 overflow-y-auto">
                  {sidebarContent}
                </div>

                {/* Footer do sidebar */}
                <div className="mt-auto pt-4 border-t border-base-200">
                  <div className="text-xs text-base-content/60 text-center">
                    TamanduAI v3.0.0
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}

        {/* Main Content */}
        <main className={`flex-1 overflow-hidden`}>
          <div className={`container mx-auto px-4 sm:px-6 lg:px-8 py-6`}>
            <div className={`mx-auto ${maxWidth === 'none' ? 'max-w-none' : `max-w-${maxWidth}`}`}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

/**
 * Componente de navegação lateral aprimorado
 */
export const EnhancedSidebar = ({
  items = [],
  activeItem,
  onItemClick,
  className = '',
}) => {
  return (
    <nav className={`space-y-1 ${className}`}>
      {items.map((item) => {
        const isActive = activeItem === item.id;
        const Icon = item.icon;
  return (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-primary text-primary-content shadow-sm'
                : 'text-base-content hover:bg-base-200 hover:text-base-content'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {Icon && <Icon className="h-5 w-5" />}
            <span className="font-medium">{item.label}</span>
            {item.badge && (
              <span className={`ml-auto px-2 py-1 text-xs rounded-full ${
                item.badge.variant === 'error'
                  ? 'bg-error text-error-content'
                  : 'bg-primary text-primary-content'
              }`}>
                {item.badge.text}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

/**
 * Card aprimorado com melhor acessibilidade e design
 */
export const EnhancedCard = ({
  title,
  subtitle,
  children,
  actions,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variants = {
    default: 'bg-base-100 border-base-200',
    outlined: 'bg-transparent border-2 border-base-300',
    elevated: 'bg-base-100 shadow-lg border-transparent',
    glass: 'glass border-base-200/50',
  };
  return (
    <div
      className={`card ${variants[variant]} ${className}`}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className="card-header">
          <div className="card-title">
            {title && <h3 className="text-lg font-semibold text-base-content">{title}</h3>}
            {subtitle && <p className="text-sm text-base-content/70 mt-1">{subtitle}</p>}
          </div>
          {actions && (
            <div className="card-actions">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

/**
 * Botão aprimorado com estados visuais melhores
 */
export const EnhancedButton = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'btn transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
    error: 'btn-error',
    success: 'btn-success',
    warning: 'btn-warning',
  };

  const sizes = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
    xl: 'btn-xl',
  };

  const classes = [
    baseClasses,
    variants[variant],
    sizes[size],
    fullWidth ? 'w-full' : '',
    loading ? 'loading' : '',
    disabled ? 'btn-disabled' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="loading-spinner"></span>}
      {children}
    </button>
  );
};

/**
 * Container responsivo aprimorado
 */
export const ResponsiveContainer = ({
  children,
  size = 'lg',
  className = '',
  padding = true,
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    none: 'max-w-none',
  };
  return (
    <div
      className={`mx-auto ${sizeClasses[size]} ${padding ? 'px-4 sm:px-6 lg:px-8' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default EnhancedLayout;
