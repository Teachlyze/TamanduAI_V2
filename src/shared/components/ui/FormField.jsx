import React from 'react';
import { cn } from '@/shared/utils/cn';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

/**
 * FormField - Componente acessível WCAG 2.2 para campos de formulário
 * 
 * WCAG 2.2 Compliance:
 * - 1.3.1 Info and Relationships (Level A) - Estrutura semântica
 * - 1.3.5 Identify Input Purpose (Level AA) - Autocomplete adequado
 * - 2.4.6 Headings and Labels (Level AA) - Labels descritivos
 * - 3.2.2 On Input (Level A) - Sem mudanças inesperadas
 * - 3.3.1 Error Identification (Level A) - Erros identificados
 * - 3.3.2 Labels or Instructions (Level A) - Labels e instruções
 * - 3.3.3 Error Suggestion (Level AA) - Sugestões de correção
 * - 4.1.3 Status Messages (Level AA) - Mensagens de status
 */

export const FormField = ({ 
  children, 
  label, 
  htmlFor,
  description,
  error,
  success,
  hint,
  required,
  className 
}) => {
  const fieldId = htmlFor || `field-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label com indicador de obrigatório */}
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-semibold text-slate-900 dark:text-white"
        >
          {label}
          {required && (
            <span 
              className="text-red-600 dark:text-red-400 ml-1" 
              aria-label="obrigatório"
            >
              *
            </span>
          )}
        </label>
      )}

      {/* Descrição/Instrução */}
      {description && (
        <p
          id={descriptionId}
          className="text-sm text-slate-600 dark:text-slate-400"
        >
          {description}
        </p>
      )}

      {/* Dica/Hint */}
      {hint && !error && (
        <div
          id={hintId}
          className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg"
          role="note"
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{hint}</span>
        </div>
      )}

      {/* Campo (children) com aria-describedby */}
      <div>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              id: fieldId,
              'aria-describedby': [descriptionId, errorId, hintId].filter(Boolean).join(' ') || undefined,
              'aria-invalid': error ? 'true' : undefined,
              'aria-required': required ? 'true' : undefined,
            });
          }
          return child;
        })}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div
          id={errorId}
          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Mensagem de sucesso */}
      {success && (
        <div
          className="flex items-start gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Input acessível
 */
export const Input = React.forwardRef(({
  className,
  type = 'text',
  error,
  ...props
}, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-lg border-2 px-4 py-2.5 text-sm font-medium",
        "bg-white dark:bg-slate-900",
        "text-slate-900 dark:text-white",
        "placeholder:text-slate-500 dark:placeholder:text-slate-400",
        "shadow-sm transition-all duration-200",
        error
          ? "border-red-500 dark:border-red-500 focus:ring-red-500/30"
          : "border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400",
        "focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-600",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

/**
 * Textarea acessível
 */
export const Textarea = React.forwardRef(({
  className,
  error,
  ...props
}, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[120px] w-full rounded-lg border-2 px-4 py-3 text-sm font-medium",
        "bg-white dark:bg-slate-900",
        "text-slate-900 dark:text-white",
        "placeholder:text-slate-500 dark:placeholder:text-slate-400",
        "shadow-sm transition-all duration-200",
        error
          ? "border-red-500 dark:border-red-500 focus:ring-red-500/30"
          : "border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400",
        "focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-600",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800",
        "resize-y",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

/**
 * Checkbox acessível
 */
export const Checkbox = React.forwardRef(({
  className,
  label,
  description,
  ...props
}, ref) => {
  const id = props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  const descId = description ? `${id}-description` : undefined;

  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        ref={ref}
        id={id}
        className={cn(
          "h-5 w-5 rounded border-2 border-slate-300 dark:border-slate-600",
          "text-blue-600 focus:ring-3 focus:ring-blue-500/30 focus:ring-offset-2",
          "transition-all duration-200 cursor-pointer",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        aria-describedby={descId}
        {...props}
      />
      <div className="flex-1">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-slate-900 dark:text-white cursor-pointer"
          >
            {label}
          </label>
        )}
        {description && (
          <p
            id={descId}
            className="text-sm text-slate-600 dark:text-slate-400 mt-0.5"
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default FormField;
