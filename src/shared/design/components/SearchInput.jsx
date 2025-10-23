import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { colors } from '../tokens';

/**
 * SearchInput - Input de busca reutilizável
 * 
 * @param {string} placeholder - Texto do placeholder
 * @param {string} value - Valor controlado
 * @param {function} onChange - Callback quando valor muda
 * @param {function} onSearch - Callback quando Enter é pressionado
 * @param {number} debounceMs - Delay para debounce (default: 300ms)
 * @param {boolean} autoFocus - Auto focus no input
 */
const SearchInput = ({
  placeholder = 'Buscar...',
  value = '',
  onChange,
  onSearch,
  debounceMs = 300,
  autoFocus = false
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onChange && localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(localValue);
    }
  };

  const handleClear = () => {
    setLocalValue('');
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Search Icon */}
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
      
      {/* Input */}
      <Input
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`pl-10 pr-10 h-11 ${colors.border.default} focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400`}
      />
      
      {/* Clear Button */}
      {localValue && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default SearchInput;
