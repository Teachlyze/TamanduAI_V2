import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  Search,
  Filter,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PremiumInput } from './PremiumInput';
import { PremiumButton, IconButton } from './PremiumButton';
import { InlineLoading } from './LoadingScreen';
import EmptyState from './EmptyState';

/**
 * Premium Table Component - Award-winning data tables
 */
export const PremiumTable = ({
  data = [],
  columns = [],
  loading = false,
  sortable = true,
  filterable = true,
  pagination = true,
  pageSize: initialPageSize = 10,
  onRowClick,
  emptyMessage = 'Nenhum dado encontrado',
  className = ''
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Sorting
  const handleSort = (key) => {
    if (!sortable) return;
    
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtered and Sorted Data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search/Filter
    if (searchQuery && filterable) {
      result = result.filter(row =>
        columns.some(col => {
          const value = row[col.key];
          return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Sort
    if (sortConfig.key && sortable) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal > bVal ? 1 : -1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, sortConfig, searchQuery, columns, sortable, filterable]);

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return processedData.slice(start, end);
  }, [processedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // Loading State
  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <InlineLoading message="Carregando dados..." />
      </div>
    );
  }

  // Empty State
  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border">
        <EmptyState
          title={emptyMessage}
          description="Não há dados para exibir no momento"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      {filterable && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <PremiumInput
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={Search}
              clearable
            />
          </div>
          <IconButton
            icon={Filter}
            variant="outline"
            tooltip="Filtros"
          />
          <IconButton
            icon={Download}
            variant="outline"
            tooltip="Exportar"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                    className={`px-6 py-4 text-left text-sm font-semibold text-foreground ${
                      column.sortable !== false && sortable ? 'cursor-pointer hover:bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable !== false && sortable && (
                        <span className="text-muted-foreground">
                          {sortConfig.key === column.key ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-4 h-4 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-border">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12">
                    <EmptyState
                      variant="search"
                      title="Nenhum resultado encontrado"
                      description={`Nenhum resultado para "${searchQuery}"`}
                      actionLabel="Limpar busca"
                      onAction={() => setSearchQuery('')}
                    />
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <motion.tr
                    key={row.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onRowClick?.(row)}
                    className={`hover:bg-muted/30 transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-6 py-4 text-sm text-foreground"
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key]}
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <IconButton
                        icon={MoreVertical}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle row actions
                        }}
                      />
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && paginatedData.length > 0 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * pageSize) + 1} a{' '}
              {Math.min(currentPage * pageSize, processedData.length)} de{' '}
              {processedData.length} resultados
            </div>
            <div className="flex items-center gap-2">
              <PremiumButton
                variant="outline"
                size="sm"
                leftIcon={ChevronLeft}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </PremiumButton>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <PremiumButton
                variant="outline"
                size="sm"
                rightIcon={ChevronRight}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próximo
              </PremiumButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumTable;
