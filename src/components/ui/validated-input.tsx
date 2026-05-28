import React from 'react';
import { Input } from './input';
import { Label } from './label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from './utils';

export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  showSuccess?: boolean;
  onBlurValidation?: () => void;
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      label,
      error,
      hint,
      showSuccess = false,
      required,
      onBlurValidation,
      onBlur,
      id,
      className,
      ...props
    },
    ref
  ) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    const hasValue = props.value && String(props.value).trim().length > 0;
    const showSuccessIndicator = showSuccess && hasValue && !error;

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      onBlurValidation?.();
      onBlur?.(e);
    };

    return (
      <div className="space-y-2">
        <Label htmlFor={inputId} className="text-[#323130] font-semibold">
          {label}
          {required && <span className="text-[#d13438] ml-1" aria-label="required">*</span>}
        </Label>

        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            aria-label={label}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            onBlur={handleBlur}
            className={cn(
              "transition-all duration-200",
              error && "border-[#d13438] focus:ring-[#d13438] focus:border-[#d13438] pr-10",
              showSuccessIndicator && "border-[#107c10] focus:ring-[#107c10] pr-10",
              className
            )}
            {...props}
          />

          {/* Error Icon */}
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <AlertCircle className="h-4 w-4 text-[#d13438]" aria-hidden="true" />
            </div>
          )}

          {/* Success Icon */}
          {showSuccessIndicator && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <CheckCircle2 className="h-4 w-4 text-[#107c10]" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-[#d13438] flex items-center gap-1 animate-in slide-in-from-top-1"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {/* Hint Text */}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-sm text-[#605e5c]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';
