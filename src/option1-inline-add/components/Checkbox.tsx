import React from "react";
import { Check } from "lucide-react";
import { cn } from "./utils";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({ checked, onCheckedChange, disabled }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
        checked
          ? "bg-[#0078d4] border-[#0078d4]"
          : "bg-white border-[#8a8886] hover:border-[#323130]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </button>
  );
}
