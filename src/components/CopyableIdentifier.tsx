import React from "react";
import { cn } from "./ui/utils";
import { CopyableText } from "./CopyButton";
import { Badge } from "./ui/badge";

interface CopyableIdentifierProps {
  /** The identifier string value to display and copy */
  value: string;
  /** Optional label for the copy tooltip (defaults to "Copy identifier") */
  copyLabel?: string;
  /** Display variant */
  variant?: "inline" | "badge" | "block" | "mono";
  /** Additional className for the text/badge */
  className?: string;
  /** If true, text will break on all characters (for long identifiers) */
  breakAll?: boolean;
  /** Badge variant props passthrough */
  badgeClassName?: string;
  /** Whether to show the copy icon (defaults to true) */
  showCopyIcon?: boolean;
  /** Children override — if provided, renders children instead of the value text */
  children?: React.ReactNode;
}

/**
 * A reusable component that wraps identifier values with a copy-to-clipboard button.
 * Used for Target Identifiers, Primary Identifiers, Related Identifiers, etc.
 *
 * Variants:
 * - "inline" (default): renders the value as a styled inline span
 * - "badge": renders the value inside a Badge component
 * - "block": renders the value as a block-level element (for standalone display)
 * - "mono": renders the value in monospace font
 */
export function CopyableIdentifier({
  value,
  copyLabel = "Copy identifier",
  variant = "inline",
  className,
  breakAll = false,
  badgeClassName,
  showCopyIcon = true,
  children,
}: CopyableIdentifierProps) {
  if (!value || value === "—") {
    return <span className={cn("text-xs text-[#605e5c]", className)}>—</span>;
  }

  const content = children ?? (() => {
    switch (variant) {
      case "badge":
        return (
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", badgeClassName)}
          >
            {value}
          </Badge>
        );
      case "mono":
        return (
          <span className={cn("font-mono text-[#323130]", breakAll && "break-all", className)}>
            {value}
          </span>
        );
      case "block":
        return (
          <span className={cn("text-sm font-medium text-[#323130]", breakAll && "break-all", className)}>
            {value}
          </span>
        );
      case "inline":
      default:
        return (
          <span className={cn("text-[#323130]", breakAll && "break-all", className)}>
            {value}
          </span>
        );
    }
  })();

  return (
    <CopyableText text={value} copyLabel={copyLabel} showIcon={showCopyIcon}>
      {content}
    </CopyableText>
  );
}
