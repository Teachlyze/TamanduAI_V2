import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';

// Hook personalizado para listas acessíveis
export const useAccessibleList = (items = [], options = {}) => {
  const {
    orientation = 'vertical',
    selectionMode = 'single', // 'single' | 'multiple' | 'none'
    onSelectionChange,
    defaultSelectedIndices = [],
    loop = true,
  } = options;

  const [selectedIndices, setSelectedIndices] = useState(new Set(defaultSelectedIndices));
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleSelectionChange = useCallback((index, item) => {
    let newSelectedIndices;

    if (selectionMode === 'multiple') {
      newSelectedIndices = new Set(selectedIndices);
      if (newSelectedIndices.has(index)) {
        newSelectedIndices.delete(index);
      } else {
        newSelectedIndices.add(index);
      }
    } else if (selectionMode === 'single') {
      newSelectedIndices = new Set([index]);
    } else {
      newSelectedIndices = new Set();
    }

    setSelectedIndices(newSelectedIndices);
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelectedIndices), items[index]);
    }
  }, [items, selectedIndices, selectionMode, onSelectionChange]);

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowUp':
        if (orientation === 'vertical') {
          e.preventDefault();
          setFocusedIndex(prev =>
            loop
              ? (prev - 1 + items.length) % items.length
              : Math.max(0, prev - 1)
          );
        }
        break;

      case 'ArrowDown':
        if (orientation === 'vertical') {
          e.preventDefault();
          setFocusedIndex(prev =>
            loop
              ? (prev + 1) % items.length
              : Math.min(items.length - 1, prev + 1)
          );
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          e.preventDefault();
          setFocusedIndex(prev =>
            loop
              ? (prev - 1 + items.length) % items.length
              : Math.max(0, prev - 1)
          );
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal') {
          e.preventDefault();
          setFocusedIndex(prev =>
            loop
              ? (prev + 1) % items.length
              : Math.min(items.length - 1, prev + 1)
          );
        }
        break;

      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (selectionMode !== 'none' && items[focusedIndex]) {
          handleSelectionChange(focusedIndex, items[focusedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        // Desmarcar seleção em modo múltiplo
        if (selectionMode === 'multiple' && selectedIndices.size > 0) {
          setSelectedIndices(new Set());
          if (onSelectionChange) {
            onSelectionChange([], null);
          }
        }
        break;

      default:
        break;
    }
  }, [focusedIndex, items, orientation, loop, selectionMode, selectedIndices, handleSelectionChange, onSelectionChange]);

  return {
    selectedIndices,
    focusedIndex,
    handleKeyDown,
    handleSelectionChange,
    setFocusedIndex,
    isSelected: (index) => selectedIndices.has(index),
    selectedItems: items.filter((_, index) => selectedIndices.has(index)),
  };
};

// Componente de lista acessível
export const AccessibleList = ({
  items = [],
  renderItem,
  className = '',
  orientation = 'vertical',
  selectionMode = 'single',
  onSelectionChange,
  defaultSelectedIndices = [],
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}) => {
  const listRef = useRef(null);
  const {
    selectedIndices,
    focusedIndex,
    handleKeyDown,
    handleSelectionChange,
    isSelected,
  } = useAccessibleList(items, {
    orientation,
    selectionMode,
    onSelectionChange,
    defaultSelectedIndices,
  });

  return (
    <div
      ref={listRef}
      role="list"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        'accessible-list',
        orientation === 'horizontal' ? 'flex flex-wrap gap-2' : 'space-y-1',
        className
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      {...props}
    >
      {items.map((item, index) => (
        <div
          key={index}
          role="listitem"
          aria-selected={isSelected(index)}
          tabIndex={focusedIndex === index ? 0 : -1}
          className={cn(
            'focus:outline-none focus:ring-4 focus:ring-blue-500/25 rounded-md transition-all',
            isSelected(index) && 'bg-blue-50 border-blue-200 dark:bg-muted/30 dark:border-blue-800',
            focusedIndex === index && 'ring-2 ring-blue-500'
          )}
          onClick={() => selectionMode !== 'none' && handleSelectionChange(index, item)}
          onFocus={() => setFocusedIndex(index)}
        >
          {renderItem(item, index, {
            isSelected: isSelected(index),
            isFocused: focusedIndex === index,
          })}
        </div>
      ))}
    </div>
  );
};

// Componente de botão de alternância acessível
export const AccessibleToggle = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || label}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/25',
        checked
          ? 'bg-blue-600 dark:bg-blue-500'
          : 'bg-gray-200 dark:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
      {label && (
        <span className="sr-only">
          {label}: {checked ? 'ativado' : 'desativado'}
        </span>
      )}
    </button>
  );
};

// Componente de checkbox acessível
export const AccessibleCheckbox = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  indeterminate = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const checkboxRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <button
        ref={checkboxRef}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-4 w-4 items-center justify-center rounded border-2 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/25',
          checked || indeterminate
            ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
            : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed',
          'hover:border-blue-400 dark:hover:border-blue-500'
        )}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {(checked || indeterminate) && (
          <svg
            className="h-3 w-3 text-slate-900 dark:text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {indeterminate ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            )}
          </svg>
        )}
      </button>

      {label && (
        <label
          htmlFor={props.id}
          className={cn(
            'text-sm font-medium cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && checkboxRef.current?.click()}
        >
          {label}
        </label>
      )}
    </div>
  );
};

// Componente de radio button acessível
export const AccessibleRadio = ({
  checked = false,
  onChange,
  name,
  value,
  label,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const radioRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled && !checked) {
        onChange(value);
      }
    }
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <button
        ref={radioRef}
        type="button"
        role="radio"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500/25',
          checked
            ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
            : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed',
          'hover:border-blue-400 dark:hover:border-blue-500'
        )}
        onClick={() => !disabled && !checked && onChange(value)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {checked && (
          <div className="h-2 w-2 rounded-full bg-white" />
        )}
      </button>

      {label && (
        <label
          className={cn(
            'text-sm font-medium cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && !checked && radioRef.current?.click()}
        >
          {label}
        </label>
      )}
    </div>
  );
};

// Componente de grupo de radio buttons acessível
export const AccessibleRadioGroup = ({
  options = [],
  value,
  onChange,
  name,
  orientation = 'vertical',
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}) => {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        'accessible-radio-group',
        orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2',
        className
      )}
      {...props}
    >
      {options.map((option, index) => (
        <AccessibleRadio
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          checked={value === option.value}
          onChange={onChange}
          disabled={option.disabled}
        />
      ))}
    </div>
  );
};

export default {
  AccessibleList,
  AccessibleToggle,
  AccessibleCheckbox,
  AccessibleRadio,
  AccessibleRadioGroup,
  useAccessibleList,
};

