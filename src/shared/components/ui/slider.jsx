import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { cn } from '@/shared/utils/cn';

/**
 * Slider component for range inputs with customizable styling and behavior
 * @param {Object} props
 * @param {number[]} props.value - Current value(s)
 * @param {Function} props.onValueChange - Callback when value changes
 * @param {number} props.min - Minimum value
 * @param {number} props.max - Maximum value
 * @param {number} props.step - Step increment
 * @param {boolean} props.disabled - Whether the slider is disabled
 * @param {string} props.orientation - Slider orientation ('horizontal' | 'vertical')
 * @param {string} props.className - Additional CSS classes
 * @param {React.Ref} ref - Forwarded ref
 */
  const Slider = React.forwardRef(({
  value = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  orientation = 'horizontal',
  className,
  ...props
}, ref) => {
  const sliderRef = useRef(null);
  
  // CORREÇÃO: Estados que estavam faltando
  const [isDragging, setIsDragging] = useState(false);
  const [internalValue, setInternalValue] = useState(value);

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Calculate percentage for positioning
  const getPercentage = useCallback((val) => {
  return ((val - min) / (max - min)) * 100;
  }, [min, max]);

  // Get value from position
  const getValueFromPosition = useCallback((position, rect) => {
    let percentage;

    if (orientation === 'vertical') {
      percentage = (rect.height - position) / rect.height;
    } else {
      percentage = position / rect.width;
    }

    percentage = Math.max(0, Math.min(1, percentage));

    const rawValue = percentage * (max - min) + min;
    const steppedValue = Math.round(rawValue / step) * step;

    return Math.max(min, Math.min(max, steppedValue));
  }, [min, max, step, orientation]);

  // Handle mouse/touch events
  const handleInteractionStart = useCallback((e) => {
    if (disabled) return;

    e.preventDefault();
    setIsDragging(true);

    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;

    let position;
    if (orientation === 'vertical') {
      position = e.clientY - rect.top;
    } else {
      position = e.clientX - rect.left;
    }

    const newValue = getValueFromPosition(position, rect);

    setInternalValue([newValue]);
    onValueChange?.([newValue]);
  }, [disabled, orientation, getValueFromPosition, onValueChange]);

  const handleInteractionMove = useCallback((e) => {
    if (!isDragging || disabled) return;

    e.preventDefault();

    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;

    let position;
    if (orientation === 'vertical') {
      position = e.clientY - rect.top;
    } else {
      position = e.clientX - rect.left;
    }

    const newValue = getValueFromPosition(position, rect);

    setInternalValue([newValue]);
    onValueChange?.([newValue]);
  }, [isDragging, disabled, orientation, getValueFromPosition, onValueChange]);

  const handleInteractionEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleInteractionMove, []);
      document.addEventListener('mouseup', handleInteractionEnd, []);
      document.addEventListener('touchmove', handleInteractionMove, { passive: false }, []);
      document.addEventListener('touchend', handleInteractionEnd);
    }
  return () => {
      document.removeEventListener('mousemove', handleInteractionMove);
      document.removeEventListener('mouseup', handleInteractionEnd);
      document.removeEventListener('touchmove', handleInteractionMove);
      document.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [isDragging, handleInteractionMove, handleInteractionEnd]);

  const currentValue = internalValue[0] || 0;
  const percentage = getPercentage(currentValue);
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex items-center select-none touch-none',
        orientation === 'vertical' ? 'flex-col h-full' : 'w-full',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {/* Slider track */}
      <div
        ref={sliderRef}
        className={cn(
          'relative bg-gray-200 dark:bg-gray-700 rounded-full',
          orientation === 'vertical'
            ? 'w-2 h-full min-h-[100px]'
            : 'h-2 w-full min-w-[100px]',
          'cursor-pointer'
        )}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
      >
        {/* Progress track */}
        <div
          className={cn(
            'absolute bg-blue-500 rounded-full',
            orientation === 'vertical' ? 'bottom-0 w-full' : 'left-0 h-full'
          )}
          style={{
            [orientation === 'vertical' ? 'height' : 'width']: `${percentage}%`,
          }}
        />

        {/* Slider thumb */}
        <div
          className={cn(
            'absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            orientation === 'vertical' && 'translate-x-0 translate-y-0'
          )}
          style={{
            [orientation === 'vertical' ? 'bottom' : 'left']: `${percentage}%`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleInteractionStart(e);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            handleInteractionStart(e);
          }}
        />

        {/* Value label (optional) */}
        {props.showValue && (
          <div
            className="absolute text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm"
            style={{
              [orientation === 'vertical' ? 'right' : 'top']: '-24px',
              [orientation === 'vertical' ? 'top' : 'left']: `${percentage}%`,
              transform: orientation === 'vertical' ? 'translateX(50%)' : 'translateX(-50%)',
            }}
          >
            {currentValue}
          </div>
        )}
      </div>

      {/* Min/Max labels */}
      {props.showLabels && (
        <div className={cn(
          'flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1',
          orientation === 'vertical' && 'flex-col text-center space-y-1 mt-0 ml-2'
        )}>
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
});

Slider.displayName = 'Slider';

export { Slider };
