// src/components/ui/EnhancedTable.jsx
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Button } from './button';

/**
 * Card aprimorado com funcionalidades avançadas
 */
export const EnhancedCard = ({
  title,
  subtitle,
  children,
  actions,
  loading = false,
  error = null,
  className = '',
  hover = true,
  clickable = false,
  onClick,
  ...props
}) => {
  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover && clickable ? { scale: 1.02, y: -2 } : {}}
      className={`
        card bg-base-100 shadow-lg border border-base-200
        ${hover ? 'hover:shadow-xl transition-all duration-200' : ''}
        ${clickable ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className="card-header flex items-center justify-between p-6 pb-4">
          <div className="flex-1">
            {title && (
              <h3 className="card-title text-xl font-bold text-base-content">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="card-subtitle text-sm text-base-content/70 mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="card-body p-6 pt-0">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-3/4"></div>
            <div className="skeleton h-4 w-1/2"></div>
            <div className="skeleton h-4 w-5/6"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-error mb-2">
              <AlertTriangle className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-base-content/70">{error}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
};

/**
 * Tabela aprimorada com funcionalidades avançadas
 */
export const EnhancedTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  searchable = true,
  sortable = true,
  filterable = true,
  selectable = false,
  actions = [],
  pagination = true,
  pageSize = 10,
  emptyMessage = 'Nenhum dado encontrado',
  className = '',
  onRowClick,
  onSelectionChange,
  ...props
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [filters, setFilters] = useState({});

  // Filtrar e ordenar dados
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter((item) => {
          const itemValue = item[key];
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        });
      }
    });

    // Aplicar busca
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        columns.some((column) => {
          const value = item[column.key];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Aplicar ordenação
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, columns, searchTerm, sortConfig, filters]);

  // Paginação
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  const handleSort = (key) => {
    if (!sortable) return;

    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(paginatedData.map((item) => item.id));
      setSelectedRows(allIds);
      onSelectionChange?.(allIds);
    } else {
      setSelectedRows(new Set());
      onSelectionChange?.(new Set());
    }
  };

  const handleSelectRow = (id, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(newSelected);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-error mb-4">
          <AlertTriangle className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
        <p className="text-base-content/70 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-base-content/60" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered pl-10 w-full sm:w-64"
              />
            </div>
          )}

          {filterable && columns.some(col => col.filterable) && (
            <div className="dropdown dropdown-bottom">
              <Button variant="outline" tabIndex={0}>
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <div tabIndex={0} className="dropdown-content z-[1] card card-compact w-64 p-4 shadow-lg bg-base-100">
                {columns
                  .filter(col => col.filterable)
                  .map((column) => (
                    <div key={column.key} className="form-group mb-4 last:mb-0">
                      <label className="form-label text-sm">{column.label}</label>
                      <input
                        type="text"
                        placeholder={`Filtrar ${column.label}`}
                        value={filters[column.key] || ''}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          [column.key]: e.target.value,
                        }))}
                        className="input input-bordered input-sm w-full"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto bg-base-100 rounded-lg border border-base-200">
        <table className="table table-zebra w-full">
          <thead className="bg-base-200">
            <tr>
              {selectable && (
                <th className="w-12">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={paginatedData.length > 0 && selectedRows.size === paginatedData.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${column.sortable !== false && sortable ? 'cursor-pointer select-none' : ''} ${column.className || ''}`}
                  onClick={() => column.sortable !== false && sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable !== false && sortable && sortConfig.key === column.key && (
                      <motion.div
                        initial={{ rotate: 0 }}
                        animate={{ rotate: sortConfig.direction === 'desc' ? 180 : 0 }}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </motion.div>
                    )}
                  </div>
                </th>
              ))}

              {(onRowClick || actions.length > 0) && (
                <th className="w-20">Ações</th>
              )}
            </tr>
          </thead>

          <tbody>
            <AnimatePresence>
              {loading ? (
                // Skeleton loading
                Array.from({ length: pageSize }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    {selectable && <td><div className="skeleton h-4 w-4"></div></td>}
                    {columns.map((column) => (
                      <td key={column.key}>
                        <div className="skeleton h-4 w-full max-w-xs"></div>
                      </td>
                    ))}
                    <td><div className="skeleton h-8 w-8"></div></td>
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + ((onRowClick || actions.length > 0) ? 1 : 0)}
                    className="text-center py-12"
                  >
                    <div className="text-base-content/60">
                      {emptyMessage}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <motion.tr
                    key={row.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`${onRowClick ? 'cursor-pointer hover:bg-base-200' : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-sm"
                          checked={selectedRows.has(row.id)}
                          onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                        />
                      </td>
                    )}

                    {columns.map((column) => (
                      <td key={column.key} className={column.className || ''}>
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key]
                        }
                      </td>
                    ))}

                    {(onRowClick || actions.length > 0) && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown dropdown-left">
                          <Button variant="ghost" size="sm" tabIndex={0}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-40">
                            {actions.map((action, actionIndex) => (
                              <li key={actionIndex}>
                                <button
                                  onClick={() => action.onClick(row)}
                                  className="flex items-center gap-2"
                                >
                                  {action.icon && <action.icon className="h-4 w-4" />}
                                  {action.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-base-content/70">
            Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, processedData.length)} de {processedData.length} resultados
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Anterior
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNumber > totalPages) return null;

                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Card de estatísticas aprimorado
 */
export const StatCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  className = '',
  ...props
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-error';
      default: return 'text-base-content/70';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`stat-card ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="stat-title text-base-content/70">{title}</div>
          <div className="stat-value text-2xl font-bold text-base-content">
            {value}
          </div>
          {change && (
            <div className={`stat-change text-sm ${getTrendColor()}`}>
              <span className="mr-1">{getTrendIcon()}</span>
              {change}
            </div>
          )}
        </div>

        {Icon && (
          <div className="stat-icon">
            <Icon className="h-8 w-8 text-primary/70" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Grid de estatísticas responsivo
 */
export const StatsGrid = ({
  stats = [],
  columns = 4,
  className = '',
  ...props
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div
      className={`stats-grid grid gap-6 ${gridCols[columns]} ${className}`}
      {...props}
    >
      {stats.map((stat, index) => (
        <StatCard key={stat.title || index} {...stat} />
      ))}
    </div>
  );
};

/**
 * Componente de progresso visual aprimorado
 */
export const ProgressRing = ({
  progress,
  size = 80,
  strokeWidth = 8,
  className = '',
  showValue = true,
  color = 'primary',
  ...props
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const colors = {
    primary: 'stroke-primary',
    success: 'stroke-success',
    warning: 'stroke-warning',
    error: 'stroke-error',
    info: 'stroke-info',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        {...props}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-base-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={`${colors[color]} transition-all duration-300 ease-out`}
          strokeLinecap="round"
        />
      </svg>

      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-base-content">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Componente de gráfico de barras simples
 */
export const SimpleBarChart = ({
  data = [],
  height = 200,
  className = '',
  ...props
}) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className={`space-y-4 ${className}`} {...props}>
      <div className="flex justify-between text-sm text-base-content/70">
        <span>Valor</span>
        <span>Máximo: {maxValue}</span>
      </div>

      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={item.label || index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="text-base-content/70">{item.value}</span>
            </div>
            <div className="w-full bg-base-200 rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxValue) * 100}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Componente de lista aprimorado
 */
export const EnhancedList = ({
  items = [],
  renderItem,
  loading = false,
  error = null,
  emptyMessage = 'Lista vazia',
  className = '',
  ...props
}) => {
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-error mb-2">
          <AlertTriangle className="h-8 w-8 mx-auto" />
        </div>
        <p className="text-base-content/70">{error}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`} {...props}>
      <AnimatePresence>
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-16 w-full rounded-lg" />
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-base-content/60">
            {emptyMessage}
          </div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {renderItem(item, index)}
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
};
