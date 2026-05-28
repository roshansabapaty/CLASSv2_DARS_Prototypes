/**
 * LeftNavRailItem — single icon button in the M365-style hero rail.
 *
 * Renders:
 *  - A 40x40 button with the icon centred.
 *  - A 3px brand-colored left-edge bar + tinted background when active.
 *  - An optional unread-count badge anchored to the top-right of the icon.
 *  - A Fluent Tooltip labelling the item on hover (relationship="label").
 *
 * Keyboard / accessibility:
 *  - Real <button> in tab order.
 *  - `aria-current="page"` when active.
 *  - The Tooltip provides the accessible label so we don't double-announce.
 */

import * as React from "react";
import { Tooltip, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  buttonRow: {
    position: "relative",
    width: "48px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  button: {
    position: "relative",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backgroundColor: "transparent",
    borderTopWidth: "0",
    borderRightWidth: "0",
    borderBottomWidth: "0",
    borderLeftWidth: "0",
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground2,
    transitionProperty: "background-color, color",
    transitionDuration: tokens.durationFaster,
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
    "&:focus-visible": {
      outlineStyle: "solid",
      outlineWidth: "2px",
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
    },
  },
  buttonActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    color: tokens.colorBrandForeground1,
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Selected,
      color: tokens.colorBrandForeground1,
    },
  },
  activeBar: {
    position: "absolute",
    left: "0",
    top: "6px",
    bottom: "6px",
    width: "3px",
    backgroundColor: tokens.colorBrandStroke1,
    borderTopRightRadius: "2px",
    borderBottomRightRadius: "2px",
  },
  badge: {
    position: "absolute",
    top: "2px",
    right: "2px",
    minWidth: "16px",
    height: "16px",
    paddingLeft: "4px",
    paddingRight: "4px",
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    borderTopLeftRadius: "8px",
    borderTopRightRadius: "8px",
    borderBottomLeftRadius: "8px",
    borderBottomRightRadius: "8px",
    fontSize: "10px",
    fontWeight: tokens.fontWeightSemibold,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: "1",
    pointerEvents: "none",
  },
});

export interface LeftNavRailItemProps {
  label: string;
  /** Renderable icon for inactive state (typically `XYZ24Regular`). */
  icon: React.ReactNode;
  /** Renderable icon for active state (typically `XYZ24Filled`). */
  activeIcon?: React.ReactNode;
  active?: boolean;
  /** Unread count rendered as a badge over the top-right of the icon. */
  badgeCount?: number;
  onClick: () => void;
}

export function LeftNavRailItem({
  label,
  icon,
  activeIcon,
  active = false,
  badgeCount,
  onClick,
}: LeftNavRailItemProps) {
  const styles = useStyles();
  const buttonClasses = active
    ? `${styles.button} ${styles.buttonActive}`
    : styles.button;
  const ariaLabel =
    badgeCount && badgeCount > 0
      ? `${label} — ${badgeCount} unread`
      : label;
  return (
    <div className={styles.buttonRow}>
      {active && <span className={styles.activeBar} aria-hidden="true" />}
      <Tooltip content={label} relationship="label" positioning="after">
        <button
          type="button"
          aria-label={ariaLabel}
          aria-current={active ? "page" : undefined}
          onClick={onClick}
          className={buttonClasses}
        >
          {active && activeIcon ? activeIcon : icon}
          {badgeCount && badgeCount > 0 ? (
            <span className={styles.badge}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
        </button>
      </Tooltip>
    </div>
  );
}
