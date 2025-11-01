import React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

const EnhancedCalendar = ({
  mode = 'single',
  selected,
  onSelect,
  numberOfMonths = 1,
  locale,
  initialFocus,
  ...rest
}) => {
  return (
    <DayPicker
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      numberOfMonths={numberOfMonths}
      locale={locale}
      initialFocus={initialFocus}
      {...rest}
    />
  );
};

export default EnhancedCalendar;
