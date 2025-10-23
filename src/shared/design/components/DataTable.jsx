import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { colors, typography } from '../tokens';

/**
 * DataTable - Tabela de dados reutilizável com sorting
 * 
 * @param {Array} columns - Definição das colunas
 * @param {Array} data - Dados da tabela
 * @param {function} onRowClick - Callback quando linha é clicada
 * @param {string} sortBy - Coluna de ordenação atual
 * @param {string} sortOrder - Ordem (asc/desc)
 * @param {function} onSort - Callback para ordenação
 * @param {boolean} loading - Estado de loading
 * @param {ReactNode} emptyState - Componente de estado vazio
 */
const DataTable = ({
  columns = [],
  data = [],
  onRowClick,
  sortBy = null,
  sortOrder = 'asc',
  onSort,
  loading = false,
  emptyState = null
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  const handleSort = (columnKey) => {
    if (!onSort || !columns.find(col => col.key === columnKey)?.sortable) return;

    const newOrder = sortBy === columnKey && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(columnKey, newOrder);
  };

  const renderSortIcon = (columnKey, sortable) => {
    if (!sortable) return null;

    if (sortBy !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 ml-2 opacity-40" />;
    }

    return sortOrder === 'asc' 
      ? <ChevronUp className="w-4 h-4 ml-2 text-blue-600 dark:text-blue-400" />
      : <ChevronDown className="w-4 h-4 ml-2 text-blue-600 dark:text-blue-400" />;
  };

  const renderCell = (column, row) => {
    if (column.render) {
      return column.render(row[column.key], row);
    }

    const value = row[column.key];

    // Badge type
    if (column.type === 'badge') {
      return (
        <Badge className={column.getBadgeColor?.(value) || ''}>
          {value}
        </Badge>
      );
    }

    // Date type
    if (column.type === 'date' && value) {
      return new Date(value).toLocaleDateString('pt-BR');
    }

    // Number type
    if (column.type === 'number') {
      return value?.toLocaleString('pt-BR') || '-';
    }

    return value || '-';
  };

  if (loading) {
    return (
      <div className="w-full p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className={colors.text.secondary}>Carregando...</p>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return emptyState;
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full">
        {/* Header */}
        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => handleSort(column.key)}
                className={`
                  px-6 py-4 text-left ${typography.bodySmall} font-semibold ${colors.text.primary}
                  ${column.sortable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none' : ''}
                  ${column.width ? `w-${column.width}` : ''}
                `}
              >
                <div className="flex items-center">
                  {column.label}
                  {renderSortIcon(column.key, column.sortable)}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {data.map((row, index) => (
            <tr
              key={row.id || index}
              onClick={() => onRowClick?.(row)}
              onMouseEnter={() => setHoveredRow(index)}
              onMouseLeave={() => setHoveredRow(null)}
              className={`
                transition-colors
                ${onRowClick ? 'cursor-pointer' : ''}
                ${hoveredRow === index ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-950'}
                hover:bg-slate-50 dark:hover:bg-slate-900
              `}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`
                    px-6 py-4 ${typography.bodySmall} ${colors.text.primary}
                    ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                  `}
                >
                  {renderCell(column, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty State dentro da tabela */}
      {data.length === 0 && !emptyState && (
        <div className="p-12 text-center">
          <p className={colors.text.secondary}>Nenhum dado encontrado</p>
        </div>
      )}
    </div>
  );
};

export default DataTable;
