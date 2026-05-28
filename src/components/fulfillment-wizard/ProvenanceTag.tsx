/**
 * ProvenanceTag — Fluent v9 Tag wrapper that renders one of 5 row states.
 *
 * Used next to each category row in ServiceCategoryTable to show whether
 * the row came from LE request, was modified, removed, or user-added.
 */

import React from "react";
import { Tag, Tooltip, makeStyles, tokens } from "@fluentui/react-components";
import type { Provenance } from "./leBaseline";

const useStyles = makeStyles({
  le: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    borderTopColor: tokens.colorBrandStroke2,
    borderRightColor: tokens.colorBrandStroke2,
    borderBottomColor: tokens.colorBrandStroke2,
    borderLeftColor: tokens.colorBrandStroke2,
  },
  leModified: {
    backgroundColor: tokens.colorPaletteMarigoldBackground2,
    color: tokens.colorPaletteMarigoldForeground2,
    borderTopColor: tokens.colorPaletteMarigoldBorderActive,
    borderRightColor: tokens.colorPaletteMarigoldBorderActive,
    borderBottomColor: tokens.colorPaletteMarigoldBorderActive,
    borderLeftColor: tokens.colorPaletteMarigoldBorderActive,
  },
  leRemoved: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
    borderTopColor: tokens.colorPaletteRedBorderActive,
    borderRightColor: tokens.colorPaletteRedBorderActive,
    borderBottomColor: tokens.colorPaletteRedBorderActive,
    borderLeftColor: tokens.colorPaletteRedBorderActive,
  },
  added: {
    backgroundColor: tokens.colorPalettePurpleBackground2,
    color: tokens.colorPalettePurpleForeground2,
    borderTopColor: tokens.colorPalettePurpleBorderActive,
    borderRightColor: tokens.colorPalettePurpleBorderActive,
    borderBottomColor: tokens.colorPalettePurpleBorderActive,
    borderLeftColor: tokens.colorPalettePurpleBorderActive,
  },
  bulkAdded: {
    backgroundColor: tokens.colorPaletteLilacBackground2,
    color: tokens.colorPaletteLilacForeground2,
    borderTopColor: tokens.colorPaletteLilacBorderActive,
    borderRightColor: tokens.colorPaletteLilacBorderActive,
    borderBottomColor: tokens.colorPaletteLilacBorderActive,
    borderLeftColor: tokens.colorPaletteLilacBorderActive,
  },
});

type Labels = Record<Provenance, { label: string; tooltip: string }>;

const LABELS: Labels = {
  "le": { label: "LE", tooltip: "Requested by law enforcement — untouched." },
  "le-modified": { label: "LE · Modified", tooltip: "LE-requested; date range or scope has been changed from the original request." },
  "le-removed": { label: "LE · Removed", tooltip: "Originally requested by LE but excluded from this fulfillment." },
  "added": { label: "Added", tooltip: "User-added; not part of the original LE request." },
  "bulk-added": { label: "Bulk Added", tooltip: "Added via a bulk action applied to multiple identifiers." },
};

export interface ProvenanceTagProps {
  provenance: Provenance;
  /** Optional bulk-action audit text shown in tooltip for bulk-added rows */
  bulkDetail?: string;
}

export function ProvenanceTag({ provenance, bulkDetail }: ProvenanceTagProps) {
  const styles = useStyles();
  const { label, tooltip } = LABELS[provenance];
  const className =
    provenance === "le" ? styles.le
    : provenance === "le-modified" ? styles.leModified
    : provenance === "le-removed" ? styles.leRemoved
    : provenance === "bulk-added" ? styles.bulkAdded
    : styles.added;

  const tooltipText = provenance === "bulk-added" && bulkDetail
    ? `${tooltip} ${bulkDetail}`
    : tooltip;

  return (
    <Tooltip content={tooltipText} relationship="description" withArrow>
      <Tag size="extra-small" appearance="outline" className={className}>
        {label}
      </Tag>
    </Tooltip>
  );
}
