import React from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/shared/components/ui/dropdown-menu';
import { Badge } from '@/shared/components/ui/badge';
import { colors } from '../tokens';

/**
 * FilterBar - Barra de filtros reutilizável
 * 
 * @param {Array} filters - Array de filtros
 * @param {Object} activeFilters - Filtros ativos
 * @param {function} onFilterChange - Callback quando filtro muda
 * @param {function} onClearAll - Callback para limpar todos
 */
const FilterBar = ({
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearAll
}) => {
  const activeCount = Object.values(activeFilters).filter(v => v !== null && v !== '').length;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Filter Button/Indicator */}
      <div className="flex items-center gap-2">
        <Filter className={`w-5 h-5 ${colors.text.secondary}`} />
        <span className={`text-sm font-medium ${colors.text.secondary}`}>
          Filtros
        </span>
        {activeCount > 0 && (
          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {activeCount}
          </Badge>
        )}
      </div>

      {/* Filter Dropdowns */}
      {filters.map((filter) => (
        <DropdownMenu key={filter.key}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={`whitespace-nowrap gap-2 ${
                activeFilters[filter.key]
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : ''
              }`}
            >
              {filter.label}
              {activeFilters[filter.key] && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filter.options.find(opt => opt.value === activeFilters[filter.key])?.label || ''}
                </Badge>
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>{filter.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* "Todos" option */}
            <DropdownMenuItem
              onClick={() => onFilterChange(filter.key, null)}
              className={!activeFilters[filter.key] ? 'bg-slate-100 dark:bg-slate-800' : ''}
            >
              <span>Todos</span>
              {!activeFilters[filter.key] && (
                <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
              )}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {/* Filter options */}
            {filter.options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onFilterChange(filter.key, option.value)}
                className={activeFilters[filter.key] === option.value ? 'bg-slate-100 dark:bg-slate-800' : ''}
              >
                <span>{option.label}</span>
                {activeFilters[filter.key] === option.value && (
                  <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}

      {/* Clear All Button */}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
};

export default FilterBar;
