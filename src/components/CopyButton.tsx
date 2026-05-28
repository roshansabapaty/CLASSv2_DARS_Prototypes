import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "./ui/utils";
import { toast } from "sonner@2.0.3";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?: "icon" | "button";
  size?: "sm" | "md";
  className?: string;
  showTooltip?: boolean;
}

export function CopyButton({ 
  text, 
  label = "Copy to clipboard",
  variant = "icon",
  size = "sm",
  className,
  showTooltip = true
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Try the modern clipboard API first
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback to legacy method if clipboard API fails
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        document.execCommand('copy');
        textArea.remove();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Failed to copy:", err, fallbackErr);
        // Silently fail for icon variant, only show toast for button variant
        if (variant === "button") {
          toast.error("Unable to copy to clipboard");
        }
      }
    }
  };

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  
  const button = (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center justify-center transition-colors rounded",
        variant === "icon" && "hover:bg-slate-100 p-1",
        variant === "button" && "px-2 py-1 border border-[#8a8886] hover:border-[#0078d4] hover:bg-[#deecf9]",
        copied && "text-green-600",
        !copied && "text-[#605e5c] hover:text-[#323130]",
        className
      )}
      aria-label={copied ? "Copied!" : label}
    >
      {copied ? (
        <Check className={iconSize} />
      ) : (
        <Copy className="w-3.5 h-3.5 text-[#0078d4] drop-shadow-sm" />
      )}
      {variant === "button" && (
        <span className="ml-1.5 text-xs">
          {copied ? "Copied!" : "Copy"}
        </span>
      )}
    </button>
  );

  if (showTooltip) {
    return (
        <Tooltip open={copied ? true : undefined}>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{copied ? "Copied!" : label}</p>
          </TooltipContent>
        </Tooltip>
    );
  }

  return button;
}

interface CopyableTextProps {
  text: string;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  copyLabel?: string;
}

export function CopyableText({ 
  text, 
  children, 
  className,
  showIcon = true,
  copyLabel = "Copy to clipboard"
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Try the modern clipboard API first
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback to legacy method if clipboard API fails
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        document.execCommand('copy');
        textArea.remove();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Failed to copy:", err, fallbackErr);
        // Silently fail - visual feedback will stay as copy icon
      }
    }
  };

  return (
    <Tooltip open={copied ? true : undefined}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            // Some CopyableText instances live inside a role="button"
            // parent (case-queue cards). stopPropagation keeps the
            // parent card from opening when the user just wanted to
            // copy.
            e.stopPropagation();
            handleCopy();
          }}
          onKeyDown={(e) => {
            // Native <button> already activates on Space/Enter; we just
            // need to stop the parent card from also reacting.
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          aria-label={copyLabel}
          className={cn(
            "inline-flex items-center gap-1.5 cursor-pointer group bg-transparent border-0 p-0 m-0 font-inherit text-inherit text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1 rounded",
            className
          )}
        >
          {children}
          {showIcon && (
            <span className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity" aria-hidden="true">
              {copied ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 text-[#605e5c]" />
              )}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{copied ? "Copied!" : copyLabel}</p>
      </TooltipContent>
    </Tooltip>
  );
}