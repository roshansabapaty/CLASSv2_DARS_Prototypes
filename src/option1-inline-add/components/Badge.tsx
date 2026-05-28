import React from "react";
import { cn } from "./utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}
