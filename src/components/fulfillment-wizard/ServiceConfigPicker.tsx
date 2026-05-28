/**
 * ServiceConfigPicker
 *
 * Single-screen group × item picker for Add Service. Each data category group
 * renders as a column with a tri-state header Checkbox (group-level
 * mass-toggle) + an item Checkbox + Label per item.
 *
 * Group checkbox state is *derived* from item state:
 *   - All non-locked items checked → checked
 *   - Some checked, some unchecked → "mixed" (Fluent indeterminate)
 *   - None checked (excluding locked) → unchecked
 *
 * Toggling the group fires onGroupToggle(key, nextChecked):
 *   - nextChecked=true: enable all items in the group
 *   - nextChecked=false: disable all non-locked items (locked items stay enabled)
 *
 * Toggling an individual item fires onItemToggle(groupKey, itemKey).
 */

import * as React from "react";
import {
  Checkbox,
  Tooltip,
  Badge,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Info, Lock } from "lucide-react";
import type { CategoryGroupConfig } from "../../config/lensServicesConfig";

export interface ServiceConfigPickerProps {
  /** Groups for the chosen service — from `getServiceCategoryGroups(serviceKey)`. */
  groups: CategoryGroupConfig[];
  /** Currently-selected items, keyed by groupKey. Sole source of truth. */
  selectedKeys: Record<string, string[]>;
  /** Fires when a single item checkbox toggles. */
  onItemToggle: (groupKey: string, itemKey: string) => void;
  /** Fires when the group-level checkbox toggles. nextChecked=true means enable-all-items. */
  onGroupToggle: (groupKey: string, nextChecked: boolean) => void;
}

const useStyles = makeStyles({
  root: {
    display: "grid",
    gap: tokens.spacingHorizontalM,
    width: "100%",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
  },
  groupHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  itemLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  infoIcon: {
    width: "14px",
    height: "14px",
    color: tokens.colorNeutralForeground3,
    cursor: "help",
    flexShrink: 0,
  },
  lockIcon: {
    width: "12px",
    height: "12px",
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  requiredBadge: {
    marginLeft: tokens.spacingHorizontalXS,
  },
});

interface GroupState {
  /** All non-locked items in the group are selected. */
  allChecked: boolean;
  /** At least one non-locked item is selected, but not all. */
  mixed: boolean;
  /** No non-locked items are selected. */
  noneChecked: boolean;
  /** Group has at least one locked item — group checkbox can only enable, not disable. */
  hasLocked: boolean;
}

function computeGroupState(
  group: CategoryGroupConfig,
  selectedItems: string[]
): GroupState {
  const selectedSet = new Set(selectedItems);
  let lockedCount = 0;
  let nonLockedCount = 0;
  let nonLockedCheckedCount = 0;
  for (const item of group.items) {
    if (item.locked) {
      lockedCount++;
      continue;
    }
    nonLockedCount++;
    if (selectedSet.has(item.key)) {
      nonLockedCheckedCount++;
    }
  }
  const allChecked = nonLockedCount > 0 && nonLockedCheckedCount === nonLockedCount;
  const noneChecked = nonLockedCheckedCount === 0;
  const mixed = !allChecked && !noneChecked;
  return {
    allChecked,
    mixed,
    noneChecked,
    hasLocked: lockedCount > 0,
  };
}

export function ServiceConfigPicker({
  groups,
  selectedKeys,
  onItemToggle,
  onGroupToggle,
}: ServiceConfigPickerProps) {
  const styles = useStyles();
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  return (
    <div
      className={styles.root}
      style={{
        gridTemplateColumns: `repeat(${Math.max(visibleGroups.length, 1)}, minmax(0, 1fr))`,
      }}
    >
      {visibleGroups.map((group) => {
        const groupSelected = selectedKeys[group.key] ?? [];
        const state = computeGroupState(group, groupSelected);
        const headerChecked: boolean | "mixed" = state.allChecked
          ? true
          : state.mixed
          ? "mixed"
          : false;
        // Group checkbox is disabled for unchecking when the group has a locked
        // item. We still allow re-checking it (idempotent, ensures all items on).
        const headerDisabled = state.hasLocked && state.allChecked;

        return (
          <div key={group.key} className={styles.column}>
            <div className={styles.groupHeaderRow}>
              <Checkbox
                checked={headerChecked}
                disabled={headerDisabled}
                onChange={(_, data) => {
                  // Fluent gives boolean | "mixed"; coerce.
                  const next = data.checked === true;
                  onGroupToggle(group.key, next);
                }}
                label={group.name}
                aria-label={`Toggle all items in ${group.name}`}
              />
            </div>
            <div className={styles.itemsList}>
              {group.items.map((item) => {
                const itemChecked = groupSelected.includes(item.key);
                return (
                  <div key={item.key} className={styles.itemRow}>
                    <Checkbox
                      checked={item.locked ? true : itemChecked}
                      disabled={item.locked}
                      onChange={() => {
                        if (!item.locked) {
                          onItemToggle(group.key, item.key);
                        }
                      }}
                      label={
                        <span className={styles.itemLabel}>{item.name}</span>
                      }
                    />
                    {item.info && (
                      <Tooltip
                        content={item.info}
                        relationship="description"
                        withArrow
                      >
                        <Info className={styles.infoIcon} aria-label="More info" />
                      </Tooltip>
                    )}
                    {item.locked && (
                      <>
                        <Lock className={styles.lockIcon} aria-hidden="true" />
                        <Badge
                          appearance="outline"
                          size="small"
                          className={styles.requiredBadge}
                        >
                          Required
                        </Badge>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
