import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  Clock,
  TrendingUp,
  Users,
  BookOpen,
  FileText,
  Calendar,
  Hash,
  Loader2,
  ChevronDown,
  Command,
  
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useDebounce } from '@/shared/hooks/enhanced-hooks';

/**
 * Advanced Search System for TamanduAI Platform
 * Provides intelligent search with real-time results and caching
 */

// ============================================
// SEARCH CONFIGURATION
// ============================================

const SEARCH_CONFIG = {
  DEBOUNCE_DELAY: 300,
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 50,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  RECENT_SEARCHES_LIMIT: 10,
};

const SEARCH_TYPES = {
  ALL: 'all',
  ACTIVITIES: 'activities',
  USERS: 'users',
  CLASSES: 'classes',
  CONTENT: 'content',
  FILES: 'files',
};

const SEARCH_FILTERS = {
  DATE: 'date',
  TYPE: 'type',
  STATUS: 'status',
  CATEGORY: 'category',
  AUTHOR: 'author',
  TAGS: 'tags',
};

// ============================================
// SEARCH MANAGER
// ============================================

class SearchManager {
  constructor() {
    this.searchCache = new Map();
    this.recentSearches = this.loadRecentSearches();
    this.searchHistory = new Map();
  }

  /**
   * Perform search with caching and history tracking
   */
  async search(query, options = {}) {
    const {
      type = SEARCH_TYPES.ALL,
      filters = {},
      limit = SEARCH_CONFIG.MAX_RESULTS,
    } = options;

    // Create cache key
    const cacheKey = `${type}_${JSON.stringify(filters)}_${query}_${limit}`;

    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CONFIG.CACHE_TTL) {
      return cached.results;
    }

    // Perform search based on type
    const results = await this.performSearch(query, type, filters, limit);

    // Cache results
    this.searchCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
    });

    // Track search history
    this.addToHistory(query, type, results.length);

    return results;
  }

  /**
   * Perform actual search operation
   */
  async performSearch(query, type, filters, limit) {
    // This would integrate with your actual search API
    // For now, return mock results
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay

    const mockResults = this.generateMockResults(query, type, limit);

    // Apply filters
    let filteredResults = mockResults;
    if (filters.type) {
      filteredResults = filteredResults.filter(item => item.type === filters.type);
    }
    if (filters.category) {
      filteredResults = filteredResults.filter(item =>
        item.category?.includes(filters.category)
      );
    }

    return filteredResults.slice(0, limit);
  }

  /**
   * Generate mock search results (replace with actual API calls)
   */
  generateMockResults(query, type, limit) {
    const results = [];
    const types = type === SEARCH_TYPES.ALL
      ? Object.values(SEARCH_TYPES).filter(t => t !== SEARCH_TYPES.ALL)
      : [type];

    types.forEach(searchType => {
      const count = Math.min(Math.floor(limit / types.length), 10);

      for (let i = 0; i < count; i++) {
        results.push({
          id: `${searchType}_${i}`,
          type: searchType,
          title: `${searchType} result ${i + 1} for "${query}"`,
          description: `This is a sample ${searchType} result that matches your search query.`,
          category: this.getRandomCategory(),
          author: `User ${Math.floor(Math.random() * 100)}`,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          relevance: Math.random() * 100,
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Get random category for mock data
   */
  getRandomCategory() {
    const categories = ['Math', 'Science', 'History', 'Language', 'Art', 'Technology'];
    return categories[Math.floor(Math.random() * categories.length)];
  }

  /**
   * Add search to history
   */
  addToHistory(query, type, resultCount) {
    const key = `${query}_${type}`;
    this.searchHistory.set(key, {
      query,
      type,
      resultCount,
      timestamp: Date.now(),
    });

    // Limit history size
    if (this.searchHistory.size > 100) {
      const oldest = Array.from(this.searchHistory.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0];
      this.searchHistory.delete(oldest[0]);
    }
  }

  /**
   * Get search suggestions
   */
  getSuggestions(query) {
    if (!query || query.length < 2) return [];

    // Get suggestions from search history
    const suggestions = [];
    for (const [key, data] of this.searchHistory.entries()) {
      if (data.query.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          text: data.query,
          type: data.type,
          count: data.resultCount,
        });
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Load recent searches from localStorage
   */
  loadRecentSearches() {
    try {
      const stored = localStorage.getItem('recent_searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save recent searches to localStorage
   */
  saveRecentSearches() {
    try {
      const recent = Array.from(this.searchHistory.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, SEARCH_CONFIG.RECENT_SEARCHES_LIMIT);

      localStorage.setItem('recent_searches', JSON.stringify(recent));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear();
  }

  /**
   * Get search analytics
   */
  getAnalytics() {
    const totalSearches = this.searchHistory.size;
    const totalResults = Array.from(this.searchHistory.values())
      .reduce((sum, search) => sum + search.resultCount, 0);

    return {
      totalSearches,
      totalResults,
      averageResults: totalSearches > 0 ? totalResults / totalSearches : 0,
      cacheSize: this.searchCache.size,
    };
  }
}

// Global search manager instance
export const searchManager = new SearchManager();

// ============================================
// SEARCH HOOKS
// ============================================

/**
 * Hook for search functionality
 */
export const useSearch = (options = {}) => {
  const {
    type = SEARCH_TYPES.ALL,
    filters = {},
    debounceDelay = SEARCH_CONFIG.DEBOUNCE_DELAY,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Debounced query for search
  const debouncedQuery = useDebounce(query, debounceDelay);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        const searchResults = await searchManager.search(debouncedQuery, { type, filters });
        setResults(searchResults);
        setSuggestions(searchManager.getSuggestions(debouncedQuery));
      } catch (err) {
        console.error('Search error:', err);
        setError(err.message || 'Erro na busca');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, type, filters]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setError(null);
  }, []);

  const addToRecentSearches = useCallback((searchQuery) => {
    // Implementation would add to recent searches
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    suggestions,
    clearSearch,
    hasResults: results.length > 0,
    resultCount: results.length,
  };
};

/**
 * Hook for search filters
 */
export const useSearchFilters = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const removeFilter = useCallback((key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const toggleFilterPanel = useCallback(() => {
    setIsFilterPanelOpen(prev => !prev);
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).length;
  }, [filters]);

  return {
    filters,
    updateFilter,
    removeFilter,
    clearFilters,
    isFilterPanelOpen,
    toggleFilterPanel,
    activeFilterCount,
  };
};

/**
 * Hook for recent searches
 */
export const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    // Load recent searches from manager
    setRecentSearches(searchManager.loadRecentSearches());
  }, []);

  const clearRecentSearches = useCallback(() => {
    localStorage.removeItem('recent_searches');
    setRecentSearches([]);
  }, []);

  return {
    recentSearches,
    clearRecentSearches,
  };
};

// ============================================
// SEARCH COMPONENTS
// ============================================

/**
 * Search Input Component
 */
export const SearchInput = ({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = "Buscar...",
  className,
  showSuggestions = true,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback((e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  }, [onFocus]);

  const handleBlur = useCallback((e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  }, [onBlur]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="pl-10 pr-4"
          {...props}
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={() => onChange('')}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Search Suggestions Component
 */
export const SearchSuggestions = ({
  suggestions,
  onSelect,
  isVisible,
  className,
}) => {
  if (!isVisible || suggestions.length === 0) return null;

  return (
    <div className={cn(
      'absolute top-full left-0 right-0 z-50 mt-1',
      'bg-popover border border-border rounded-md shadow-lg',
      className
    )}>
      <ScrollArea className="max-h-48">
        <div className="p-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelect(suggestion.text)}
              className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm text-sm"
            >
              <div className="flex items-center justify-between">
                <span>{suggestion.text}</span>
                <Badge variant="secondary" className="text-xs">
                  {suggestion.type}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

/**
 * Search Filter Panel
 */
export const SearchFilterPanel = ({
  filters,
  onFilterChange,
  onFilterRemove,
  onClearFilters,
  isOpen,
  onToggle,
  className,
}) => {
  const filterOptions = {
    [SEARCH_FILTERS.TYPE]: [
      { value: 'activities', label: 'Atividades' },
      { value: 'users', label: 'Usuários' },
      { value: 'classes', label: 'Turmas' },
      { value: 'content', label: 'Conteúdo' },
    ],
    [SEARCH_FILTERS.DATE]: [
      { value: 'today', label: 'Hoje' },
      { value: 'week', label: 'Esta semana' },
      { value: 'month', label: 'Este mês' },
    ],
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={onToggle}
        className={cn('relative', className)}
      >
        <Filter className="w-4 h-4 mr-2" />
        Filtros
        {Object.keys(filters).length > 0 && (
          <Badge className="ml-2">
            {Object.keys(filters).length}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'border border-border rounded-lg p-4 bg-background',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Filtros de Busca</h3>
        <div className="flex gap-2">
          {Object.keys(filters).length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              Limpar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(filterOptions).map(([filterKey, options]) => (
          <div key={filterKey} className="space-y-2">
            <label className="text-sm font-medium capitalize">
              {filterKey}
            </label>
            <div className="space-y-2">
              {options.map((option) => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters[filterKey] === option.value}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onFilterChange(filterKey, option.value);
                      } else {
                        onFilterRemove(filterKey);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/**
 * Search Result Item
 */
export const SearchResultItem = ({
  result,
  onClick,
  className,
}) => {
  const getResultIcon = (type) => {
    const icons = {
      [SEARCH_TYPES.ACTIVITIES]: BookOpen,
      [SEARCH_TYPES.USERS]: Users,
      [SEARCH_TYPES.CLASSES]: Hash,
      [SEARCH_TYPES.CONTENT]: FileText,
      [SEARCH_TYPES.FILES]: FileText,
    };

    const Icon = icons[type] || Search;
    return <Icon className="w-4 h-4" />;
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-3 border border-border rounded-lg hover:bg-accent cursor-pointer',
        'transition-colors duration-200',
        className
      )}
      onClick={() => onClick(result)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getResultIcon(result.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-medium text-sm truncate">
                {result.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {result.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="capitalize">{result.type}</span>
            {result.author && (
              <span>por {result.author}</span>
            )}
            <span>{formatDate(result.timestamp)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Search Results List
 */
export const SearchResults = ({
  results,
  loading,
  error,
  onResultClick,
  className,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Buscando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          Nenhum resultado encontrado
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-96', className)}>
      <div className="space-y-2 p-2">
        <AnimatePresence>
          {results.map((result) => (
            <SearchResultItem
              key={result.id}
              result={result}
              onClick={onResultClick}
            />
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
};

/**
 * Main Search Component
 */
export const AdvancedSearch = ({
  onResultSelect,
  className,
  placeholder = "Buscar atividades, usuários, turmas...",
  ...props
}) => {
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    suggestions,
    clearSearch,
    hasResults,
  } = useSearch();

  const {
    filters,
    updateFilter,
    removeFilter,
    clearFilters,
    isFilterPanelOpen,
    toggleFilterPanel,
    activeFilterCount,
  } = useSearchFilters();

  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleResultClick = useCallback((result) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
    // Could add to recent searches here
  }, [onResultSelect]);

  const handleSuggestionSelect = useCallback((suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  }, [setQuery]);

  return (
    <div className={cn('relative w-full max-w-2xl', className)}>
      {/* Search input */}
      <div className="relative">
        <SearchInput
          value={query}
          onChange={setQuery}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="w-full"
          {...props}
        />

        {/* Filter button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute right-12 top-1/2 transform -translate-y-1/2"
          onClick={toggleFilterPanel}
        >
          <Filter className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Search suggestions */}
      <SearchSuggestions
        suggestions={suggestions}
        onSelect={handleSuggestionSelect}
        isVisible={showSuggestions && suggestions.length > 0}
      />

      {/* Filter panel */}
      <div className="mt-4">
        <SearchFilterPanel
          filters={filters}
          onFilterChange={updateFilter}
          onFilterRemove={removeFilter}
          onClearFilters={clearFilters}
          isOpen={isFilterPanelOpen}
          onToggle={toggleFilterPanel}
        />
      </div>

      {/* Search results */}
      {query && (
        <div className="mt-4">
          <SearchResults
            results={results}
            loading={loading}
            error={error}
            onResultClick={handleResultClick}
          />
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
