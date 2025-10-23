import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { colors } from '../tokens';

/**
 * InlineEdit - Edição inline de texto
 * 
 * @param {string} value - Valor inicial
 * @param {function} onSave - Callback para salvar
 * @param {string} placeholder - Placeholder
 * @param {string} type - Tipo do input (text, textarea)
 * @param {boolean} multiline - Se permite múltiplas linhas
 * @param {number} maxLength - Comprimento máximo
 * @param {function} validate - Função de validação
 */
const InlineEdit = ({
  value = '',
  onSave,
  placeholder = 'Clique para editar',
  type = 'text',
  multiline = false,
  maxLength = null,
  validate = null
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    // Validação
    if (validate) {
      const validationError = validate(localValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Se o valor não mudou, apenas cancela
    if (localValue === value) {
      handleCancel();
      return;
    }

    // Salva e sai do modo de edição
    onSave(localValue);
    setIsEditing(false);
    setError(null);
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={`
          group flex items-center gap-2 px-3 py-2 rounded-lg
          hover:bg-slate-100 dark:hover:bg-slate-800
          transition-colors cursor-pointer
          ${colors.text.primary}
        `}
      >
        <span className={value ? '' : colors.text.muted}>
          {value || placeholder}
        </span>
        <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        {multiline ? (
          <textarea
            ref={inputRef}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            rows={3}
            className={`
              w-full px-3 py-2 rounded-lg border ${colors.border.default}
              bg-white dark:bg-slate-900 ${colors.text.primary}
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              resize-none transition-all
              ${error ? 'border-red-500 focus:ring-red-500' : ''}
            `}
          />
        ) : (
          <Input
            ref={inputRef}
            type={type}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            className={error ? 'border-red-500 focus:ring-red-500' : ''}
          />
        )}
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {maxLength && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            {localValue.length}/{maxLength}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          onClick={handleSave}
          className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          className="h-9 w-9 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default InlineEdit;
