import React from "react";
import { Card } from "./ui/card";
import { cn } from "./ui/utils";

/**
 * Two-Tier Card System for DataEntryForm
 * 
 * Primary Cards: Major workflow sections with a left accent border.
 *   - border-l-4 with section-specific accent color
 *   - shadow-sm, bg-white
 *   - p-4 inner padding (applied by children)
 *   - Consistent border: border-[#e1dfdd]
 * 
 * Secondary Cards: Supporting/supplementary sections.
 *   - Standard border: border-[#edebe9]
 *   - No left accent
 *   - shadow-sm, bg-white
 *   - p-3 inner padding (applied by children)
 *   - Slightly muted header icon (16px, opacity-80)
 */

// Standard accent colors for primary cards
export const CARD_ACCENTS = {
  blue: "border-l-[#0078d4]",      // Case details, identification, notification
  red: "border-l-[#d13438]",       // Emergency priority
  green: "border-l-[#107c10]",     // Agency details, verification
  purple: "border-l-[#8764b8]",    // Fulfillment, identifiers
  orange: "border-l-[#ca5010]",    // Legal classification
} as const;

type AccentColor = keyof typeof CARD_ACCENTS;

interface PrimaryCardProps {
  children: React.ReactNode;
  accent?: AccentColor;
  /** Custom accent class override (e.g. for conditional styling) */
  accentClass?: string;
  className?: string;
  /** Additional top margin */
  mt?: boolean;
  /** HTML id attribute */
  id?: string;
}

/**
 * Primary Card — used for major workflow sections.
 * Renders with a bold left-accent border and consistent padding/shadow.
 */
export function PrimaryCard({
  children,
  accent = "blue",
  accentClass,
  className,
  mt = false,
  id,
}: PrimaryCardProps) {
  return (
    <Card
      id={id}
      className={cn(
        "border-t border-r border-b border-t-[#e1dfdd] border-r-[#e1dfdd] border-b-[#e1dfdd] bg-white shadow-sm border-l-4",
        accentClass || CARD_ACCENTS[accent],
        mt && "mt-4",
        className,
      )}
    >
      {children}
    </Card>
  );
}

interface SecondaryCardProps {
  children: React.ReactNode;
  className?: string;
  /** Additional top margin */
  mt?: boolean;
  /** HTML id attribute */
  id?: string;
}

/**
 * Secondary Card — used for supporting/supplementary sections.
 * Clean, no-accent border with uniform styling.
 */
export function SecondaryCard({
  children,
  className,
  mt = false,
  id,
}: SecondaryCardProps) {
  return (
    <Card
      id={id}
      className={cn(
        "border border-[#edebe9] bg-white shadow-sm",
        mt && "mt-4",
        className,
      )}
    >
      {children}
    </Card>
  );
}