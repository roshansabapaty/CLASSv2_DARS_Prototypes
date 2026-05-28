import React, { useState } from 'react';
import { Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { cn } from './utils';
import { Button } from './button';
import { Label } from './label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface CountryComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  countries: string[];
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  onBlurValidation?: () => void;
  id?: string;
}

export const CountryCombobox: React.FC<CountryComboboxProps> = ({
  label,
  value,
  onChange,
  countries,
  placeholder = "Select country...",
  error,
  hint,
  required,
  disabled,
  onBlurValidation,
  id
}) => {
  const [open, setOpen] = useState(false);
  const comboboxId = id || label.toLowerCase().replace(/\s+/g, '-');

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    onBlurValidation?.();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={comboboxId} className="text-[#323130] font-semibold">
        {label}
        {required && <span className="text-[#d13438] ml-1" aria-label="required">*</span>}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={comboboxId}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={!!error}
            aria-required={required}
            aria-describedby={
              error ? `${comboboxId}-error` : hint ? `${comboboxId}-hint` : undefined
            }
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground",
              error && "border-[#d13438] focus:ring-[#d13438]"
            )}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries..." />
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {countries.map((country) => (
                  <CommandItem
                    key={country}
                    value={country}
                    onSelect={() => handleSelect(country)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === country ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {country}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Error Message */}
      {error && (
        <p
          id={`${comboboxId}-error`}
          className="text-sm text-[#d13438] flex items-center gap-1 animate-in slide-in-from-top-1"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Hint Text */}
      {hint && !error && (
        <p id={`${comboboxId}-hint`} className="text-sm text-[#605e5c]">
          {hint}
        </p>
      )}
    </div>
  );
};
