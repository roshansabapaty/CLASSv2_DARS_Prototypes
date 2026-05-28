/**
 * LEReviewPanel — read-only "what LE submitted" view per identifier.
 *
 * Top: validation banner stack (driven by validateIdentifier).
 * Body: per-service tree of LE-requested groups + items + date range.
 * Footer: provenance summary.
 */

import * as React from "react";
import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarActions,
  Button,
  Tag,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Calendar as CalIcon, Info } from "lucide-react";
import { format } from "date-fns";
import {
  LENS_SERVICE_MAP,
  getServiceCategoryGroups,
  getGroupName,
  getItemName,
} from "../../config/lensServicesConfig";
import type { LEIdentifierBaseline } from "./leBaseline";
import type {
  ValidationIssue,
  ValidationResult,
} from "../../utils/validateIdentifier";
import { MappingIssuesPane } from "./MappingIssuesPane";

export interface LEReviewPanelProps {
  baseline: LEIdentifierBaseline | undefined;
  validation: ValidationResult;
  onRunCheck?: () => void;
  onRetryCheck?: () => void;
  onReject?: () => void;
  /** Replace an unresolved external service with an RS-chosen internal one
   *  (Phase 5b.4 substitution flow). When undefined, the Replace button
   *  shows a coming-soon toast. */
  onReplaceExternal?: (externalName: string) => void;
  /** Acknowledge "no Microsoft account exists" — flips taskStatus to
   *  "Not Found" (Phase 5c.1). Only meaningful when baseline.accountNotFound. */
  onAcknowledgeNotFound?: () => void;
  /** External names that have been substituted by the RS (Phase 5b.4) — hide
   *  these from the Mapping issues pane since they're no longer actionable. */
  substitutedExternalNames?: string[];
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  header: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: tokens.fontWeightSemibold,
  },
  banners: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
  service: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground1,
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
  serviceHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    paddingLeft: tokens.spacingHorizontalS,
  },
  groupName: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    paddingTop: "2px",
    paddingBottom: "2px",
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  bullet: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorBrandForeground1,
    lineHeight: "1",
  },
  dateRange: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXXS,
  },
  summary: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
  },
  empty: {
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    textAlign: "center",
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  incompatChip: {
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
  unmappedChip: {
    backgroundColor: tokens.colorPaletteYellowBackground1,
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
});

function intentForCode(code: ValidationIssue["code"]): "warning" | "error" | "info" {
  if (code === "account-check-errored" || code === "account-check-na") return "error";
  if (
    code === "account-check-not-run" ||
    code === "no-services-configured" ||
    code === "full-le-removal-unconfirmed"
  )
    return "warning";
  return "info";
}

function actionLabel(code: ValidationIssue["code"]): string | undefined {
  switch (code) {
    case "account-check-not-run": return "Run check";
    case "account-check-errored": return "Retry";
    case "account-check-na": return "Reject identifier";
    default: return undefined;
  }
}

// 2B (UX-Polish): collapsed banner stack — surface the highest-priority
// issue inline and tuck the rest behind a "+N other notices" disclosure.
// Priority order (top of intent rank first, then declared order):
//   error  > warning > info
// The dedicated `accountNotFound` banner is rendered above this stack so
// the rank order here doesn't need to re-handle `account-check-na`.
const INTENT_RANK: Record<"error" | "warning" | "info", number> = {
  error: 0,
  warning: 1,
  info: 2,
};

interface ValidationBannerStackProps {
  issues: ValidationIssue[];
  intentForCode: (code: ValidationIssue["code"]) => "warning" | "error" | "info";
  renderAction: (issue: ValidationIssue) => React.ReactNode;
  className?: string;
}

function ValidationBannerStack({
  issues,
  intentForCode,
  renderAction,
  className,
}: ValidationBannerStackProps) {
  const [expanded, setExpanded] = React.useState(false);

  const sorted = React.useMemo(() => {
    return [...issues].sort(
      (a, b) => INTENT_RANK[intentForCode(a.code)] - INTENT_RANK[intentForCode(b.code)],
    );
  }, [issues, intentForCode]);

  if (sorted.length === 0) return null;
  const [top, ...rest] = sorted;
  const extraCount = rest.length;

  return (
    <div className={className}>
      <MessageBar intent={intentForCode(top.code)}>
        <MessageBarBody>
          <MessageBarTitle>{top.title}</MessageBarTitle>
          {top.detail && <span> {top.detail}</span>}
        </MessageBarBody>
        {renderAction(top)}
      </MessageBar>

      {extraCount > 0 && (
        <>
          <Button
            appearance="transparent"
            size="small"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="le-review-extra-banners"
          >
            {expanded
              ? "Hide other notices"
              : `+${extraCount} other notice${extraCount === 1 ? "" : "s"}`}
          </Button>
          {expanded && (
            <div id="le-review-extra-banners" className={className}>
              {rest.map((issue, i) => (
                <MessageBar
                  key={`${issue.code}-${i}`}
                  intent={intentForCode(issue.code)}
                >
                  <MessageBarBody>
                    <MessageBarTitle>{issue.title}</MessageBarTitle>
                    {issue.detail && <span> {issue.detail}</span>}
                  </MessageBarBody>
                  {renderAction(issue)}
                </MessageBar>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function LEReviewPanel({
  baseline,
  validation,
  onRunCheck,
  onRetryCheck,
  onReject,
  onReplaceExternal,
  onAcknowledgeNotFound,
  substitutedExternalNames,
}: LEReviewPanelProps) {
  const styles = useStyles();
  const allIssues = [...validation.blocking, ...validation.informational];

  // Index incompatible/unmapped service+category refs for inline chips.
  const incompatibleSvcKeys = new Set(
    validation.informational
      .filter((i) => i.code === "le-service-incompatible")
      .flatMap((i) => i.refs ?? [])
  );
  const unmappedSvcKeys = new Set(
    validation.informational
      .filter((i) => i.code === "le-service-unmapped")
      .flatMap((i) => i.refs ?? [])
  );
  const unmappedCategoryRefs = new Set(
    validation.informational
      .filter((i) => i.code === "le-category-unmapped")
      .flatMap((i) => i.refs ?? [])
  );

  const renderAction = (issue: ValidationIssue) => {
    const label = actionLabel(issue.code);
    if (!label) return null;
    const onClick =
      issue.code === "account-check-not-run" ? onRunCheck :
      issue.code === "account-check-errored" ? onRetryCheck :
      issue.code === "account-check-na" ? onReject :
      undefined;
    if (!onClick) return null;
    return (
      <MessageBarActions>
        <Button appearance="transparent" size="small" onClick={onClick}>
          {label}
        </Button>
      </MessageBarActions>
    );
  };

  const substitutedSet = new Set(substitutedExternalNames ?? []);
  const externalUnresolved = (baseline?.externalUnresolved ?? []).filter(
    (r) => !substitutedSet.has(r.externalName),
  );
  const accountNotFound = baseline?.accountNotFound === true;
  // Suppress duplicates from the validation banner stack:
  // 1. account-check-na — when accountNotFound, our dedicated banner replaces it.
  // 2. external-* codes (Phase 7) — the MappingIssuesPane below presents
  //    them with richer per-row actions (Replace / Escalate / Reject).
  const externalCodes = new Set([
    "external-unmapped",
    "external-account-type-pending",
    "external-wrong-account-type",
    "external-internal-key-missing",
  ]);
  const visibleIssues = allIssues.filter((i) => {
    if (accountNotFound && i.code === "account-check-na") return false;
    if (externalCodes.has(i.code)) return false;
    return true;
  });

  return (
    <div className={styles.root}>
      <div className={styles.header}>LE submitted (read-only)</div>

      {accountNotFound && (
        <div className={styles.banners}>
          <MessageBar intent="error">
            <MessageBarBody>
              <MessageBarTitle>No Microsoft account exists for this identifier.</MessageBarTitle>
              <span> No services will be collected. Acknowledge or reject to continue.</span>
            </MessageBarBody>
            <MessageBarActions>
              {onAcknowledgeNotFound && (
                <Button appearance="primary" size="small" onClick={onAcknowledgeNotFound}>
                  Acknowledge & mark Not Found
                </Button>
              )}
              {onReject && (
                <Button appearance="transparent" size="small" onClick={onReject}>
                  Reject identifier
                </Button>
              )}
            </MessageBarActions>
          </MessageBar>
        </div>
      )}

      {visibleIssues.length > 0 && (
        <ValidationBannerStack
          issues={visibleIssues}
          intentForCode={intentForCode}
          renderAction={renderAction}
          className={styles.banners}
        />
      )}

      {!accountNotFound && externalUnresolved.length > 0 && (
        <MappingIssuesPane
          unresolved={externalUnresolved}
          onRunCheck={onRunCheck}
          onReplace={onReplaceExternal}
          onReject={onReject}
        />
      )}

      {!baseline || baseline.services.length === 0 ? (
        <div className={styles.empty}>LE did not submit any service requests for this identifier.</div>
      ) : (
        baseline.services.map((svcKey) => {
          const svc = LENS_SERVICE_MAP[svcKey];
          const groups = getServiceCategoryGroups(svcKey);
          const baselineGroups = baseline.items[svcKey] ?? {};
          // Pick the date range from the first item that has one.
          let dateLabel = "";
          for (const [g, ks] of Object.entries(baselineGroups)) {
            for (const k of ks) {
              const ref = `${svcKey}:${g}:${k}`;
              const dr = baseline.categoryDates[ref];
              if (dr && dr.start && dr.end) {
                dateLabel = `${format(new Date(dr.start), "MMM d, yyyy")} — ${format(new Date(dr.end), "MMM d, yyyy")}`;
                break;
              }
            }
            if (dateLabel) break;
          }
          const isUnmapped = unmappedSvcKeys.has(svcKey);
          const isIncompat = incompatibleSvcKeys.has(svcKey);
          return (
            <div key={svcKey} className={styles.service}>
              <div className={styles.serviceHeader}>
                <span>{svc?.name ?? svcKey}</span>
                <div style={{ display: "flex", gap: tokens.spacingHorizontalXS }}>
                  {isIncompat && (
                    <Tag size="small" className={styles.incompatChip}>
                      LE · Incompatible
                    </Tag>
                  )}
                  {isUnmapped && (
                    <Tag size="small" className={styles.unmappedChip}>
                      Unmapped
                    </Tag>
                  )}
                </div>
              </div>
              {dateLabel && (
                <div className={styles.dateRange}>
                  <CalIcon size={12} />
                  <span>LE requested: {dateLabel}</span>
                </div>
              )}
              {Object.entries(baselineGroups).map(([groupKey, itemKeys]) => (
                <div key={groupKey} className={styles.group}>
                  <div className={styles.groupName}>
                    {getGroupName(groupKey, svcKey)}
                  </div>
                  {itemKeys.map((itemKey) => {
                    const ref = `${svcKey}:${groupKey}:${itemKey}`;
                    const isItemUnmapped = unmappedCategoryRefs.has(ref);
                    return (
                      <div key={itemKey} className={styles.itemRow}>
                        <span className={styles.bullet}>•</span>
                        <span>{getItemName(groupKey, itemKey, svcKey)}</span>
                        {isItemUnmapped && (
                          <Tag size="extra-small" className={styles.unmappedChip}>
                            Unmapped
                          </Tag>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })
      )}

      {baseline && baseline.services.length > 0 && (
        <div className={styles.summary}>
          <div>
            <Info size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
            <b>{baseline.services.length}</b>{" "}
            service{baseline.services.length === 1 ? "" : "s"} ·{" "}
            <b>
              {Object.values(baseline.items).reduce(
                (acc, groups) =>
                  acc +
                  Object.values(groups).reduce((a, items) => a + items.length, 0),
                0
              )}
            </b>{" "}
            categor{Object.values(baseline.items).length === 1 ? "y" : "ies"} from LE
          </div>
        </div>
      )}
    </div>
  );
}
