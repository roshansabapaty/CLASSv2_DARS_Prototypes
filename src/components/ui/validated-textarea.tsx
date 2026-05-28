import React from 'react';
import { Textarea } from './textarea';
import { Label } from './label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from './utils';

export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  showSuccess?: boolean;
  showCharacterCount?: boolean;
  onBlurValidation?: () => void;
}

export const ValidatedTextarea = React.forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  (
    {
      label,
      error,
      hint,
      showSuccess = false,
      showCharacterCount = false,
      required,
      maxLength,
      onBlurValidation,
      onBlur,
      id,
      className,
      value,
      ...props
    },
    ref
  ) => {
    const textareaId = id || label.toLowerCase().replace(/\s+/g, '-');
    const currentLength = value ? String(value).length : 0;
    const hasValue = currentLength > 0;
    const showSuccessIndicator = showSuccess && hasValue && !error;
    const isNearLimit = maxLength && currentLength > maxLength * 0.9;

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      onBlurValidation?.();
      onBlur?.(e);
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={textareaId} className="text-[#323130] font-semibold">
            {label}
            {required && <span className="text-[#d13438] ml-1" aria-label="required">*</span>}
          </Label>
          
          {/* Character Count */}
          {showCharacterCount && maxLength && (
            <span 
              className={cn(
                "text-xs",
                isNearLimit ? "text-amber-600 font-medium" : "text-[#605e5c]"
              )}
              aria-live="polite"
              aria-atomic="true"
            >
              {currentLength} / {maxLength}
            </span>
          )}
        </div>

        <div className="relative">
          <Textarea
            ref={ref}
            id={textareaId}
            aria-label={label}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
            }
            maxLength={maxLength}
            value={value}
            onBlur={handleBlur}
            className={cn(
              "transition-all duration-200 resize-none",
              error && "border-[#d13438] focus:ring-[#d13438] focus:border-[#d13438]",
              showSuccessIndicator && "border-[#107c10] focus:ring-[#107c10]",
              className
            )}
            {...props}
          />

          {/* Success Icon (positioned in top-right corner) */}
          {showSuccessIndicator && (
            <div className="absolute right-3 top-3 pointer-events-none">
              <CheckCircle2 className="h-4 w-4 text-[#107c10]" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${textareaId}-error`}
            className="text-sm text-[#d13438] flex items-center gap-1 animate-in slide-in-from-top-1"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {/* Hint Text */}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-sm text-[#605e5c]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = 'ValidatedTextarea';
