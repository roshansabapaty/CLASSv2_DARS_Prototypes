import React from "react";
import { cn } from "./utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("bg-white border border-[#edebe9] rounded-lg overflow-hidden", className)}>
      {children}
    </div>
  );
}
