import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { Calendar as CalendarIcon, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from './utils';
import { Button } from './button';
import { Label } from './label';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  startLabel?: string;
  endLabel?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  maxDaysWarning?: number; // Show warning if range exceeds this many days
  onBlurValidation?: () => void;
  id?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = 'Start Date',
  endLabel = 'End Date',
  error,
  hint,
  required,
  disabled,
  maxDaysWarning = 365,
  onBlurValidation,
  id
}) => {
  const [startOpen, setStartOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);
  
  const rangeId = id || 'date-range';
  const daysInRange = startDate && endDate ? differenceInDays(endDate, startDate) : 0;
  const showRangeWarning = daysInRange > maxDaysWarning;

  const handleStartDateSelect = (date: Date | undefined) => {
    onStartDateChange(date);
    setStartOpen(false);
    // If end date is before new start date, clear end date
    if (date && endDate && endDate < date) {
      onEndDateChange(undefined);
    }
    onBlurValidation?.();
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    onEndDateChange(date);
    setEndOpen(false);
    onBlurValidation?.();
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor={`${rangeId}-start`} className="text-[#323130] font-semibold">
            {startLabel}
            {required && <span className="text-[#d13438] ml-1" aria-label="required">*</span>}
          </Label>
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button
                id={`${rangeId}-start`}
                variant="outline"
                disabled={disabled}
                aria-invalid={!!error}
                aria-required={required}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground',
                  error && 'border-[#d13438] focus:ring-[#d13438]'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateSelect}
                disabled={(date) => {
                  // Disable dates after end date if end date is set
                  if (endDate && date > endDate) return true;
                  return false;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor={`${rangeId}-end`} className="text-[#323130] font-semibold">
            {endLabel}
            {required && <span className="text-[#d13438] ml-1" aria-label="required">*</span>}
          </Label>
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button
                id={`${rangeId}-end`}
                variant="outline"
                disabled={disabled || !startDate}
                aria-invalid={!!error}
                aria-required={required}
                aria-describedby={!startDate ? `${rangeId}-end-hint` : undefined}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground',
                  error && 'border-[#d13438] focus:ring-[#d13438]'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateSelect}
                disabled={(date) => {
                  // Disable dates before start date
                  if (startDate && date < startDate) return true;
                  return false;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {!startDate && (
            <p id={`${rangeId}-end-hint`} className="text-xs text-[#605e5c] italic">
              Select a start date first
            </p>
          )}
        </div>
      </div>

      {/* Range Warning */}
      {showRangeWarning && !error && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-amber-800">
            Date range exceeds {maxDaysWarning} days ({daysInRange} days selected). This may affect performance.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p
          id={`${rangeId}-error`}
          className="text-sm text-[#d13438] flex items-center gap-1 animate-in slide-in-from-top-1"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Hint Text */}
      {hint && !error && !showRangeWarning && (
        <p className="text-sm text-[#605e5c]">{hint}</p>
      )}

      {/* Range Summary */}
      {startDate && endDate && !error && (
        <p className="text-sm text-[#605e5c]">
          Selected range: <span className="font-medium">{daysInRange} days</span>
        </p>
      )}
    </div>
  );
};
