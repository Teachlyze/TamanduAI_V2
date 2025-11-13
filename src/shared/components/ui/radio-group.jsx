import React, { cloneElement, forwardRef, isValidElement } from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Radio group component for selecting one option from multiple choices
 * @param {Object} props
 * @param {string} props.value - Current selected value
 * @param {Function} props.onValueChange - Value change handler
 * @param {React.ReactNode} props.children - Radio group items
 * @param {boolean} props.disabled - Disable all radio buttons
 * @param {string} props.className - Additional CSS classes
 */
const RadioGroup = React.forwardRef(({
  value,
  onValueChange,
  children,
  disabled = false,
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn("radio-group", className)}
      role="radiogroup"
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const isChecked = String(child.props.value) === String(value);
          return React.cloneElement(child, {
            ...child.props,
            checked: isChecked,
            onChange: () => onValueChange?.(child.props.value),
            disabled: disabled || child.props.disabled,
          });
        }
        return child;
      })}
    </div>
  );
});

RadioGroup.displayName = 'RadioGroup';

/**
 * Individual radio button component
 * @param {Object} props
 * @param {string} props.value - Radio button value
 * @param {string} props.id - Input ID for accessibility
 * @param {boolean} props.checked - Whether this radio is selected
 * @param {boolean} props.disabled - Disable this radio button
 * @param {Function} props.onChange - Change handler
 * @param {React.ReactNode} props.children - Label content
 * @param {string} props.className - Additional CSS classes
 */
const RadioGroupItem = React.forwardRef(({
  value,
  id,
  checked = false,
  disabled = false,
  onChange,
  children,
  className,
  ...props
}, ref) => {
  const inputId = id || `radio-${value}`;
  
  // Sempre fornecer onChange para evitar warning do React
  const handleChange = onChange || (() => {});

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <input
        ref={ref}
        type="radio"
        id={inputId}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        className={cn(
          "w-4 h-4 text-primary border-gray-300 focus:ring-primary focus:ring-2 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        )}
        {...props}
      />
      {children && (
        <label
          htmlFor={inputId}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            "cursor-pointer select-none"
          )}
        >
          {children}
        </label>
      )}
    </div>
  );
});

RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
