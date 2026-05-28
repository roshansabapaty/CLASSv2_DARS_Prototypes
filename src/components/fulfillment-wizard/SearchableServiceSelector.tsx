/**
 * SearchableServiceSelector
 *
 * Shared service-picker with search. Used by both flows in Step 2:
 *  - per-identifier Add Service popover (multiSelect={false})
 *  - bulk Add Service flow             (multiSelect={true})
 *
 * Built on top of fluent-extensions/Command (cmdk + Fluent tokens) — gives us
 * search filtering, keyboard navigation, and group headers for free.
 *
 * NEW vs. main repo: `disabledReason` prop — return a string from the callback
 * to disable a row and show a tooltip. Returns null/undefined → enabled.
 */

import * as React from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../fluent-extensions";
import {
  Checkbox,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

export interface SearchableServiceItem {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface SearchableServiceSelectorProps {
  services: SearchableServiceItem[];
  selectedKeys: string[];
  multiSelect: boolean;
  /** Single-select: fires once when an item is clicked. Parent typically closes the popover. */
  onSelect?: (key: string) => void;
  /** Multi-select: fires on every tick/untick. Selector stays open. */
  onToggle?: (key: string) => void;
  placeholder?: string;
  /** When true, the empty/no-services-left message is hidden. Default: shown. */
  hideEmptyMessage?: boolean;
  /** Optional empty-state copy when `services` is empty. */
  emptyLabel?: string;
  /** Per-service disablement. Return a non-empty string to disable the row
   *  and show that string as a Tooltip. Returns null/undefined → enabled. */
  disabledReason?: (key: string) => string | null | undefined;
}

const useStyles = makeStyles({
  root: {
    width: "100%",
  },
  list: {
    maxHeight: "320px",
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    width: "100%",
  },
  itemIcon: {
    flexShrink: 0,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  itemNameWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  itemDesc: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  checkbox: {
    flexShrink: 0,
  },
  itemDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
});

export function SearchableServiceSelector({
  services,
  selectedKeys,
  multiSelect,
  onSelect,
  onToggle,
  placeholder = "Search services...",
  hideEmptyMessage = false,
  emptyLabel = "No services match your search",
  disabledReason,
}: SearchableServiceSelectorProps) {
  const styles = useStyles();
  const selectedSet = React.useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const handleItemSelect = (key: string) => {
    if (disabledReason && disabledReason(key)) return; // hard block
    if (multiSelect) {
      onToggle?.(key);
    } else {
      onSelect?.(key);
    }
  };

  return (
    <Command className={styles.root}>
      <CommandInput placeholder={placeholder} />
      <CommandList className={styles.list}>
        {!hideEmptyMessage && <CommandEmpty>{emptyLabel}</CommandEmpty>}
        <CommandGroup>
          {services.map((service) => {
            const isSelected = selectedSet.has(service.id);
            const reason = disabledReason?.(service.id) ?? null;
            const disabled = !!reason;
            const row = (
              <CommandItem
                key={service.id}
                value={service.name}
                disabled={disabled}
                onSelect={() => handleItemSelect(service.id)}
                className={disabled ? styles.itemDisabled : undefined}
              >
                <div className={styles.itemRow}>
                  {multiSelect && (
                    <Checkbox
                      className={styles.checkbox}
                      checked={isSelected}
                      disabled={disabled}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleItemSelect(service.id)}
                      aria-label={`Toggle ${service.name}`}
                    />
                  )}
                  {service.icon && (
                    <span className={styles.itemIcon} aria-hidden="true">
                      {service.icon}
                    </span>
                  )}
                  <div className={styles.itemNameWrap}>
                    <span className={styles.itemName}>{service.name}</span>
                    {service.description && (
                      <span className={styles.itemDesc}>{service.description}</span>
                    )}
                  </div>
                </div>
              </CommandItem>
            );
            if (disabled && reason) {
              return (
                <Tooltip
                  key={service.id}
                  content={reason}
                  relationship="description"
                  positioning="after"
                  withArrow
                >
                  {row}
                </Tooltip>
              );
            }
            return row;
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
