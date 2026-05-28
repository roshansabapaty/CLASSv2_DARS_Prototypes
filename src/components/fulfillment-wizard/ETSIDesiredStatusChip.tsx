/**
 * ETSIDesiredStatusChip — small inline pill for the LE-driven per-identifier
 * Task Desired Status (`identifier.etsiDesiredStatus`).
 *
 * Renders nothing when the value is unset or "Active" (the default — not
 * worth surfacing). Otherwise: red for terminal (Cancelled / Withdrawn),
 * orange for transient (Suspended / Expired).
 */

import * as React from "react";
import {
  Tag,
  tokens,
} from "@fluentui/react-components";
import type { ETSIDesiredStatus } from "../../types/caseTypes";

export interface ETSIDesiredStatusChipProps {
  status?: ETSIDesiredStatus;
  /** Visual size (default: "small") */
  size?: "extra-small" | "small" | "medium";
  /** Optional className override */
  className?: string;
}

export function ETSIDesiredStatusChip({
  status,
  size = "small",
  className,
}: ETSIDesiredStatusChipProps) {
  if (!status || status === "Active") return null;

  const isTerminal = status === "Cancelled" || status === "Withdrawn";
  const style: React.CSSProperties = isTerminal
    ? {
        backgroundColor: tokens.colorPaletteRedBackground2,
        color: tokens.colorPaletteRedForeground1,
      }
    : {
        backgroundColor: tokens.colorPaletteYellowBackground2,
        color: tokens.colorPaletteDarkOrangeForeground1,
      };

  return (
    <Tag
      size={size}
      style={style}
      className={className}
      title="LE-submitted ETSI Task Desired Status"
    >
      Task: {status}
    </Tag>
  );
}
