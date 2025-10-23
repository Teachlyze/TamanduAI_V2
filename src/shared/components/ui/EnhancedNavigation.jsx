// src/components/ui/EnhancedNavigation.jsx
import React, { useEffect, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Home,
  Users,
  BookOpen,
  Settings,
  Bell,
  Search,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import { useAccessibility } from '@/shared/hooks/useAccessibility';

/**
 * Navegação lateral aprimorada com funcionalidades avançadas
 */
export const [loading, setLoading] = useState(true);
  const AdvancedSidebar = ({
  items = [],
  activeItem,
  onItemClick,
  collapsible = true,
  collapsed = false,
  className = '',
  footer,
  ...props
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const { preferences } = useAccessibility();

  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);

  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderNavItem = (item, level = 0) => {
    const isActive = activeItem === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const Icon = item.icon;
  return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              onItemClick?.(item.id);
            }
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-all duration-200 ${
            isActive
              ? 'bg-primary text-primary-content shadow-sm'
              : 'text-base-content hover:bg-base-200 hover:text-base-content'
          } ${preferences.largeText ? 'py-3 text-base' : ''}`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
          aria-expanded={hasChildren ? isExpanded : undefined}
        >
          <div className="flex items-center gap-3 flex-1">
            {Icon && (
              <Icon className={`h-5 w-5 ${preferences.largeText ? 'h-6 w-6' : ''}`} />
            )}

            {!isCollapsed && (
              <span className="font-medium truncate">{item.label}</span>
            )}

            {item.badge && !isCollapsed && (
              <span className={`ml-auto px-2 py-1 text-xs rounded-full ${
                item.badge.variant === 'error'
                  ? 'bg-error text-error-content'
                  : 'bg-primary text-primary-content'
              }`}>
                {item.badge.text}
              </span>
            )}
          </div>

          {hasChildren && !isCollapsed && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          )}
        </button>

        {/* Sub-items */}
        {hasChildren && (
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-4 space-y-1">
                  {item.children.map((child) => renderNavItem(child, level + 1))}
                </div key={child.id || child.key || Math.random()}>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };
  return (
    <aside
      className={`bg-base-100 border-r border-base-200 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${className}`}
      {...props}
    >
      <div className="flex flex-col h-full p-4">
        {/* Header com botão de collapse */}
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && (
            <h2 className="font-bold text-lg text-base-content">Navegação</h2>
          )}

          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="btn btn-ghost btn-sm"
              aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1">
          {items.map((item) => renderNavItem(item))}
        </nav key={item.id || item.key || Math.random()}>

        {/* Footer */}
        {footer && (
          <div className="mt-auto pt-4 border-t border-base-200">
            {footer}
          </div>
        )}
      </div>
    </aside>
  );
};

/**
 * Breadcrumb aprimorado
 */
export const EnhancedBreadcrumb = ({
  items = [],
  separator = '/',
  className = '',
  ...props
}) => {
  return (
    <nav
      className={`flex items-center space-x-2 text-sm ${className}`}
      aria-label="Breadcrumb"
      {...props}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && (
            <span className="text-base-content/60" aria-hidden="true">
              {separator}
            </span>
          )}

          {index === items.length - 1 ? (
            <span className="font-medium text-base-content" aria-current="page">
              {item.label}
            </span>
          ) : (
            <a
              href={item.href}
              className="text-primary hover:text-primary-focus transition-colors"
            >
              {item.label}
            </a>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

/**
 * Menu dropdown avançado
 */
export const AdvancedDropdown = ({
  trigger,
  items = [],
  placement = 'bottom-start',
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const placements = {
    'bottom-start': 'dropdown-bottom dropdown-start',
    'bottom-end': 'dropdown-bottom dropdown-end',
    'top-start': 'dropdown-top dropdown-start',
    'top-end': 'dropdown-top dropdown-end',
  };
  return (
    <div className={`dropdown ${placements[placement]} ${className}`}>
      <button
        tabIndex={0}
        className="btn btn-ghost btn-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {trigger}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            tabIndex={0}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52"
          >
            {items.map((item, index) => (
              <li key={index}>
                {item.href ? (
                  <a href={item.href} className="flex items-center gap-2">
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.label}
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      item.onClick?.();
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Abas aprimoradas com animações
 */
export const EnhancedTabs = ({
  tabs = [],
  activeTab,
  onTabChange,
  variant = 'underline',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const variants = {
    underline: 'border-b border-base-200',
    pills: 'bg-base-200 rounded-lg p-1',
    buttons: '',
  };
  return (
    <div className={`${variants[variant]} ${className}`} {...props}>
      <div className={`flex ${variant === 'pills' ? 'gap-2' : 'gap-6'}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
  return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`relative px-4 py-2 transition-all duration-200 ${
                variant === 'underline'
                  ? `border-b-2 ${isActive ? 'border-primary text-primary' : 'border-transparent text-base-content/70 hover:text-base-content'}`
                  : variant === 'pills'
                  ? `rounded-md ${isActive ? 'bg-base-100 shadow-sm' : 'hover:bg-base-100/50'}`
                  : `rounded-lg ${isActive ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}`
              } ${sizes[size]} ${preferences.largeText ? 'py-3' : ''}`}
            >
              <div className="flex items-center gap-2">
                {Icon && <Icon className={`h-4 w-4 ${preferences.largeText ? 'h-5 w-5' : ''}`} />}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    tab.badge.variant === 'error'
                      ? 'bg-error text-error-content'
                      : 'bg-primary text-primary-content'
                  }`}>
                    {tab.badge.text}
                  </span>
                )}
              </div>

              {/* Indicador animado para aba ativa */}
              {isActive && variant === 'underline' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Menu de contexto aprimorado
 */
export const ContextMenu = ({
  trigger,
  items = [],
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  const handleClick = () => {
    setIsOpen(false);
  };

  const handleItemClick = (item) => {
    item.onClick?.();
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClick);
  return () => document.removeEventListener('click', handleClick);
    }
  }, [isOpen]);
  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed z-50 bg-base-100 border border-base-200 rounded-lg shadow-lg py-2 min-w-48 ${className}`}
            style={{
              left: position.x,
              top: position.y,
            }}
            {...props}
          >
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-base-200 transition-colors ${
                  item.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={item.disabled}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="ml-auto text-xs text-base-content/60">
                    {item.shortcut}
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Componente de paginação avançado
 */
export const AdvancedPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  showJumpTo = false,
  className = '',
  ...props
}) => {
  const [jumpToPage, setJumpToPage] = useState('');

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter(item => item !== currentPage);
  };

  const handleJumpTo = () => {
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpToPage('');
    }
  };

  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between ${className}`} {...props}>
      {/* Info */}
      {showInfo && (
        <div className="text-sm text-base-content/70">
          Página {currentPage} de {totalPages}
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-ghost btn-sm"
        >
          Anterior
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getVisiblePages().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-base-content/60">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(page)}
                  className={`btn btn-ghost btn-sm ${
                    currentPage === page ? 'btn-active' : ''
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-ghost btn-sm"
        >
          Próxima
        </button>

        {/* Jump to page */}
        {showJumpTo && (
          <div className="flex items-center gap-2 ml-4">
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              placeholder="Ir para..."
              className="input input-bordered input-xs w-20"
            />
            <button
              onClick={handleJumpTo}
              className="btn btn-primary btn-xs"
            >
              Ir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Componente de busca avançada
 */
export const AdvancedSearch = ({
  placeholder = 'Buscar...',
  value,
  onChange,
  onSearch,
  suggestions = [],
  filters = [],
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('');

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSearch?.(value, selectedFilter);
    }
  };
  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        {/* Filtros */}
        {filters.length > 0 && (
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="select select-bordered select-sm"
          >
            <option value="">Todos</option>
            {filters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        )}

        {/* Campo de busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-base-content/60" />
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange?.(e.target.value);
              setIsOpen(e.target.value.length > 0 && suggestions.length > 0);
            }}
            onKeyPress={handleKeyPress}
            className="input input-bordered pl-10 w-full"
            {...props}
          />
        </div>

        {/* Botão de busca */}
        <button
          onClick={() => onSearch?.(value, selectedFilter)}
          className="btn btn-primary"
        >
          Buscar
        </button>
      </div>

      {/* Sugestões */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-base-100 border border-base-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  onChange?.(suggestion);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-base-200 transition-colors"
              >
                {suggestion.icon && <suggestion.icon className="h-4 w-4 text-base-content/60" />}
                <div>
                  <div className="font-medium">{suggestion.title}</div>
                  {suggestion.subtitle && (
                    <div className="text-sm text-base-content/60">
                      {suggestion.subtitle}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Componente de filtro avançado
 */
export const AdvancedFilter = ({
  filters = [],
  activeFilters = {},
  onFilterChange,
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeCount = Object.values(activeFilters).filter(Boolean).length;
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`btn btn-outline ${activeCount > 0 ? 'btn-primary' : ''}`}
      >
        <Filter className="h-4 w-4 mr-2" />
        Filtros
        {activeCount > 0 && (
          <span className="badge badge-primary badge-xs ml-2">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full left-0 mt-2 bg-base-100 border border-base-200 rounded-lg shadow-lg p-4 z-10 min-w-64"
          >
            <div className="space-y-4">
              {filters.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <label className="font-medium text-sm">{filter.label}</label>

                  {filter.type === 'select' && (
                    <select
                      value={activeFilters[filter.key] || ''}
                      onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="">Todos</option>
                      {filter.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {filter.type === 'range' && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={activeFilters[filter.key]?.min || ''}
                        onChange={(e) => onFilterChange?.(filter.key, {
                          ...activeFilters[filter.key],
                          min: e.target.value,
                        })}
                        className="input input-bordered input-sm flex-1"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={activeFilters[filter.key]?.max || ''}
                        onChange={(e) => onFilterChange?.(filter.key, {
                          ...activeFilters[filter.key],
                          max: e.target.value,
                        })}
                        className="input input-bordered input-sm flex-1"
                      />
                    </div>
                  )}

                  {filter.type === 'checkbox' && (
                    <div className="space-y-2">
                      {filter.options?.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeFilters[filter.key]?.includes(option.value) || false}
                            onChange={(e) => {
                              const currentValues = activeFilters[filter.key] || [];
                              let newValues;

                              if (e.target.checked) {
                                newValues = [...currentValues, option.value];
                              } else {
                                newValues = currentValues.filter(v => v !== option.value);
                              }

                              onFilterChange?.(filter.key, newValues);
                            }}
                            className="checkbox checkbox-primary checkbox-sm"
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {activeCount > 0 && (
                <div className="pt-4 border-t border-base-200">
                  <button
                    onClick={() => {
                      const clearedFilters = {};
                      Object.keys(activeFilters).forEach(key => {
                        clearedFilters[key] = filter.type === 'checkbox' ? [] : '';
                      });
                      Object.keys(clearedFilters).forEach(key => {
                        onFilterChange?.(key, clearedFilters[key]);
                      });
                    }}
                    className="btn btn-ghost btn-sm w-full"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Componente de ação rápida (FAB)
 */
export const QuickActionButton = ({
  actions = [],
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`fixed bottom-6 right-6 z-40 ${className}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2"
          >
            {actions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  action.onClick?.();
                  setIsOpen(false);
                }}
                className={`btn ${action.variant || 'btn-primary'} shadow-lg`}
                title={action.label}
              >
                {action.icon && <action.icon className="h-5 w-5" />}
                {action.label && <span className="hidden sm:inline ml-2">{action.label}</span>}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary btn-circle shadow-lg w-14 h-14"
        {...props}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="h-6 w-6" />
        </motion.div>
      </motion.button>
    </div>
  );
};

/**
 * Hook para gerenciar navegação complexa
 */
export const useNavigation = () => {
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const navigate = (path, data = {}) => {
    const newEntry = { path, data, timestamp: Date.now() };

    setHistory(prev => {
      // Remove entries after current index (if navigating forward)
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newEntry);

      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return newHistory;
    });

    setCurrentIndex(prev => prev + 1);
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  };

  const goForward = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  };

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  return {
    navigate,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    currentEntry: history[currentIndex],
    historySize: history.length,
  };
};
