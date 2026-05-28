/**
 * ChangesSummary — submit-time diff panel showing LE baseline vs current
 * wizard state, with +Added / -Removed / Modified counts and a collapsible
 * detailed table.
 */

import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Badge,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { LENS_SERVICES, getServiceCategoryGroups } from "../../config/lensServicesConfig";
import type { DiffStats } from "./leBaseline";

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  sideBySide: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: tokens.spacingHorizontalM,
    alignItems: "center",
  },
  col: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
  colHeader: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  colValue: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  arrow: {
    fontSize: tokens.fontSizeBase500,
    color: tokens.colorNeutralForeground3,
  },
  badgesRow: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    alignItems: "center",
  },
  diffTable: {
    width: "100%",
    fontSize: tokens.fontSizeBase200,
    borderCollapse: "collapse",
  },
  diffRow: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  diffCell: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    textAlign: "left",
  },
});

function serviceName(key: string): string {
  return LENS_SERVICES.find((s) => s.key === key)?.name || key;
}

function categoryName(svcKey: string, groupKey: string, itemKey: string): string {
  const groups = getServiceCategoryGroups(svcKey);
  const group = groups.find((g) => g.key === groupKey);
  const groupLabel = group?.name || groupKey;
  const itemLabel = group?.items.find((i) => i.key === itemKey)?.name || itemKey;
  return `${groupLabel} → ${itemLabel}`;
}

export interface ChangesSummaryProps {
  stats: DiffStats;
  /** Totals for the side-by-side summary */
  leTotals: { services: number; categories: number };
  currentTotals: { services: number; categories: number };
  /** Map identifierId → display label (identifier value) */
  identifierLabels: Record<string, string>;
}

export function ChangesSummary({
  stats,
  leTotals,
  currentTotals,
  identifierLabels,
}: ChangesSummaryProps) {
  const styles = useStyles();

  const addedCount = stats.categoriesAdded.length;
  const removedCount = stats.categoriesRemoved.length;
  const modifiedCount = stats.categoriesModified.length;
  const totalChanges = addedCount + removedCount + modifiedCount;

  return (
    <div className={styles.container}>
      <div className={styles.sideBySide}>
        <div className={styles.col}>
          <span className={styles.colHeader}>LE Requested</span>
          <span className={styles.colValue}>
            {leTotals.services} service{leTotals.services !== 1 ? "s" : ""}, {leTotals.categories} categor{leTotals.categories === 1 ? "y" : "ies"}
          </span>
        </div>
        <span className={styles.arrow}>→</span>
        <div className={styles.col}>
          <span className={styles.colHeader}>You are submitting</span>
          <span className={styles.colValue}>
            {currentTotals.services} service{currentTotals.services !== 1 ? "s" : ""}, {currentTotals.categories} categor{currentTotals.categories === 1 ? "y" : "ies"}
          </span>
        </div>
      </div>

      <div className={styles.badgesRow}>
        <span style={{ fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 }}>
          Changes:
        </span>
        {addedCount > 0 && (
          <Badge appearance="tint" color="success">+ {addedCount} added</Badge>
        )}
        {removedCount > 0 && (
          <Badge appearance="tint" color="danger">− {removedCount} removed</Badge>
        )}
        {modifiedCount > 0 && (
          <Badge appearance="tint" color="warning">~ {modifiedCount} modified</Badge>
        )}
        {totalChanges === 0 && (
          <Badge appearance="tint" color="informative">No changes from LE baseline</Badge>
        )}
      </div>

      {totalChanges > 0 && (
        <Accordion collapsible>
          <AccordionItem value="diff">
            <AccordionHeader>Show detailed diff</AccordionHeader>
            <AccordionPanel>
              <table className={styles.diffTable}>
                <thead>
                  <tr className={styles.diffRow}>
                    <th className={styles.diffCell}>Identifier</th>
                    <th className={styles.diffCell}>Service</th>
                    <th className={styles.diffCell}>Category</th>
                    <th className={styles.diffCell}>Change</th>
                    <th className={styles.diffCell}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.categoriesAdded.map((row, i) => (
                    <tr key={`a${i}`} className={styles.diffRow}>
                      <td className={styles.diffCell}>{identifierLabels[row.identifierId] || row.identifierId}</td>
                      <td className={styles.diffCell}>{serviceName(row.serviceKey)}</td>
                      <td className={styles.diffCell}>{categoryName(row.serviceKey, row.groupKey, row.itemKey)}</td>
                      <td className={styles.diffCell}><Badge appearance="tint" color="success" size="small">Added</Badge></td>
                      <td className={styles.diffCell}>—</td>
                    </tr>
                  ))}
                  {stats.categoriesRemoved.map((row, i) => (
                    <tr key={`r${i}`} className={styles.diffRow}>
                      <td className={styles.diffCell}>{identifierLabels[row.identifierId] || row.identifierId}</td>
                      <td className={styles.diffCell}>{serviceName(row.serviceKey)}</td>
                      <td className={styles.diffCell}>{categoryName(row.serviceKey, row.groupKey, row.itemKey)}</td>
                      <td className={styles.diffCell}><Badge appearance="tint" color="danger" size="small">Removed</Badge></td>
                      <td className={styles.diffCell}>{row.reason || "—"}</td>
                    </tr>
                  ))}
                  {stats.categoriesModified.map((row, i) => (
                    <tr key={`m${i}`} className={styles.diffRow}>
                      <td className={styles.diffCell}>{identifierLabels[row.identifierId] || row.identifierId}</td>
                      <td className={styles.diffCell}>{serviceName(row.serviceKey)}</td>
                      <td className={styles.diffCell}>{categoryName(row.serviceKey, row.groupKey, row.itemKey)}</td>
                      <td className={styles.diffCell}><Badge appearance="tint" color="warning" size="small">Modified</Badge></td>
                      <td className={styles.diffCell}>Date range changed</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
