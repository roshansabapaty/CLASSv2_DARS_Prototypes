import React from 'react';
import { Label } from './label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from './utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

export interface ValidatedSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }> | string[];
  placeholder?: string;
  error?: string;
  hint?: string;
  showSuccess?: boolean;
  required?: boolean;
  disabled?: boolean;
  onBlurValidation?: () => void;
  id?: string;
  className?: string;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Select an option...",
  error,
  hint,
  showSuccess = false,
  required,
  disabled,
  onBlurValidation,
  id,
  className
}) => {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');
  const showSuccessIndicator = showSuccess && value && !error;

  // Normalize options to array of objects
  const normalizedOptions = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={selectId} className="text-[#323130] font-semibold">
        {label}
        {required && <span className="text-[#d13438] ml-1" aria-label="required">*</span>}
      </Label>

      <div className="relative">
        <Select
          value={value}
          onValueChange={(val) => {
            onValueChange(val);
            onBlurValidation?.();
          }}
          disabled={disabled}
        >
          <SelectTrigger
            id={selectId}
            aria-label={label}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            className={cn(
              "transition-all duration-200",
              error && "border-[#d13438] focus:ring-[#d13438] focus:border-[#d13438]",
              showSuccessIndicator && "border-[#107c10] focus:ring-[#107c10]",
              className
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {normalizedOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Success indicator in the trigger is handled by Tailwind border color */}
      </div>

      {/* Error Message */}
      {error && (
        <p
          id={`${selectId}-error`}
          className="text-sm text-[#d13438] flex items-center gap-1 animate-in slide-in-from-top-1"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Hint Text */}
      {hint && !error && (
        <p id={`${selectId}-hint`} className="text-sm text-[#605e5c]">
          {hint}
        </p>
      )}
    </div>
  );
};
