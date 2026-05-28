/**
 * MappingIssuesPane — surfaces external-service resolutions that did NOT
 * resolve cleanly (Phase 5b of LE_EXTERNAL_SERVICE_MAPPING).
 *
 * Each row carries:
 *  - The external name (LE-supplied verbatim)
 *  - A status pill (`wrong account` / `unmapped` / `internal missing` /
 *    `account check`)
 *  - The resolver's `reason` text
 *  - 1–3 action buttons matched to the status (see action matrix in plan §5b.4)
 *
 * Renders nothing when `unresolved` is empty.
 */

import * as React from "react";
import {
  Button,
  Tag,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { toast } from "sonner@2.0.3";
import type {
  ResolvedService,
  ResolutionStatus,
} from "../../utils/resolveExternalServices";

export interface MappingIssuesPaneProps {
  unresolved: ResolvedService[];
  /** Per-identifier "Run account check" — reuse the same handler the
   *  validation banner uses (single source of truth). */
  onRunCheck?: () => void;
  /** Open a service-substitution dialog for this external name. When
   *  undefined, the Replace button shows a "coming soon" toast. */
  onReplace?: (externalName: string) => void;
  /** Open the rejection dialog for this whole identifier. */
  onReject?: () => void;
}

const useStyles = makeStyles({
  pane: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: tokens.colorPaletteRedBorder1,
    borderRightColor: tokens.colorPaletteRedBorder1,
    borderBottomColor: tokens.colorPaletteRedBorder1,
    borderLeftColor: tokens.colorPaletteRedBorder1,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
  },
  header: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteRedForeground1,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
  },
  rowFirst: {
    borderTopWidth: "0",
  },
  rowTitle: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  reason: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXXS,
  },
  pillError: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
  },
  pillWarn: {
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
});

function statusPillLabel(status: ResolutionStatus): string {
  switch (status) {
    case "wrong-account-type":   return "Wrong account";
    case "unmapped-name":        return "Unmapped";
    case "internal-key-missing": return "Internal missing";
    case "missing-account-type": return "Account check";
    default:                     return status;
  }
}

export function MappingIssuesPane({
  unresolved,
  onRunCheck,
  onReplace,
  onReject,
}: MappingIssuesPaneProps) {
  const styles = useStyles();
  if (!unresolved || unresolved.length === 0) return null;

  const handleReplace = (externalName: string) => {
    if (onReplace) {
      onReplace(externalName);
    } else {
      toast.info(
        `Replace flow for "${externalName}" — coming soon. For now, use Add Service to manually add a substitute.`,
      );
    }
  };

  const handleEscalateLE = (externalName: string) => {
    toast.success(
      `Escalation logged for "${externalName}". (Stub — would file with LE liaison.)`,
    );
  };

  const handleEscalateMapping = (externalName: string) => {
    toast.success(
      `"${externalName}" reported to mapping owner. (Stub — would create a mapping ticket.)`,
    );
  };

  const handleFileBug = (externalName: string) => {
    toast.success(
      `Bug filed for "${externalName}" → catalog drift. (Stub — would link to bug tracker.)`,
    );
  };

  return (
    <div className={styles.pane}>
      <div className={styles.header}>
        Mapping issues ({unresolved.length})
      </div>
      {unresolved.map((r, i) => {
        const isWarn = r.status === "missing-account-type";
        const pillClass = isWarn ? styles.pillWarn : styles.pillError;
        return (
          <div
            key={`${r.externalName}-${i}`}
            className={`${styles.row} ${i === 0 ? styles.rowFirst : ""}`}
          >
            <div className={styles.rowTitle}>
              <span>{isWarn ? "⚠" : "✕"}</span>
              <span>{r.externalName}</span>
              <Tag size="extra-small" className={pillClass}>
                {statusPillLabel(r.status)}
              </Tag>
            </div>
            {r.reason && <div className={styles.reason}>{r.reason}</div>}
            <div className={styles.actions}>
              {r.status === "missing-account-type" && (
                <Button
                  appearance="primary"
                  size="small"
                  onClick={onRunCheck}
                  disabled={!onRunCheck}
                >
                  Run account check
                </Button>
              )}
              {r.status === "wrong-account-type" && (
                <>
                  <Button
                    appearance="primary"
                    size="small"
                    onClick={() => handleReplace(r.externalName)}
                  >
                    Replace with internal service…
                  </Button>
                  <Button
                    appearance="secondary"
                    size="small"
                    onClick={() => handleEscalateLE(r.externalName)}
                  >
                    Escalate to LE
                  </Button>
                  {onReject && (
                    <Button
                      appearance="subtle"
                      size="small"
                      onClick={onReject}
                    >
                      Reject identifier
                    </Button>
                  )}
                </>
              )}
              {r.status === "unmapped-name" && (
                <>
                  <Button
                    appearance="primary"
                    size="small"
                    onClick={() => handleReplace(r.externalName)}
                  >
                    Replace with internal service…
                  </Button>
                  <Button
                    appearance="secondary"
                    size="small"
                    onClick={() => handleEscalateMapping(r.externalName)}
                  >
                    Escalate to mapping owner
                  </Button>
                </>
              )}
              {r.status === "internal-key-missing" && (
                <>
                  <Button
                    appearance="primary"
                    size="small"
                    onClick={() => handleReplace(r.externalName)}
                  >
                    Replace with internal service…
                  </Button>
                  <Button
                    appearance="secondary"
                    size="small"
                    onClick={() => handleFileBug(r.externalName)}
                  >
                    File a bug
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
