/**
 * IdentifierAccordion — one row in the per-identifier list. Collapses to a
 * Checkbox + headline (Identifier · Type · Task ID · Account · service-count
 * · Status · Created By). Expands to either:
 *
 *   - the LE Review (left) | RS Workspace (right) split-pane, or
 *   - the RejectedIdentifierCard when the identifier is rejected.
 */

import * as React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Checkbox,
  Tag,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Mail, Phone, Globe, ShieldCheck, ShieldQuestion, ShieldX } from "lucide-react";
import type { AccountIdentifier } from "../../types/caseTypes";
import { isRejected, isETSITerminal, isInvalid } from "../../utils/identifierRejection";
import { SplitPane } from "./SplitPane";
import { LEReviewPanel } from "./LEReviewPanel";
import { RSEditPanel, type RSEditPanelProps } from "./RSEditPanel";
import { RejectedIdentifierCard } from "./RejectedIdentifierCard";
import { ETSIStatusCard } from "./ETSIStatusCard";
import { ETSIDesiredStatusChip } from "./ETSIDesiredStatusChip";
import { NotFoundIdentifierCard } from "./NotFoundIdentifierCard";
import { InvalidIdentifierCard } from "./InvalidIdentifierCard";
import { ReplaceServiceDialog } from "./ReplaceServiceDialog";
import { IdentifierAliasesPanel } from "../IdentifierAliasesPanel";
import type { LEIdentifierBaseline } from "./leBaseline";
import type { ValidationResult } from "../../utils/validateIdentifier";

export interface IdentifierAccordionProps {
  identifier: AccountIdentifier;
  baseline: LEIdentifierBaseline | undefined;
  validation: ValidationResult;
  /** Currently-enabled service count for this identifier (RS-side). Used in the
   *  "N configured" header tag. */
  enabledServiceCount: number;
  rsEdit: Omit<RSEditPanelProps, "identifier" | "children"> & {
    /** The fully-wired right-pane workspace (typically a ServiceDropdownSelector
     *  with renderBody=ServiceCategoryTable, configured by Step2ServicesConfiguration). */
    workspace: React.ReactNode;
  };
  selected: boolean;
  onSelectChange: (next: boolean) => void;
  onRunCheck?: () => void;
  onRetryCheck?: () => void;
  onOpenReject: () => void;
  onRestore: () => void;
  /** Acknowledge a per-identifier ETSI Cancelled / Withdrawn status (Phase 5c.4). */
  onAcknowledgeETSI?: () => void;
  /** Acknowledge "no Microsoft account exists" — flips taskStatus to
   *  "Not Found" (Phase 5c.1). */
  onAcknowledgeNotFound?: () => void;
  /** Mark this identifier invalid (Phase 5c.2). */
  onMarkInvalid?: (reason: string) => void;
  /** Restore an identifier previously marked invalid (Phase 5c.2). */
  onRestoreInvalid?: () => void;
  /** Commit a Replace-with-internal-service substitution (Phase 5b.4) — appends
   *  to identifier.externalSubstitutions and adds internalKey to RS workspace. */
  onCommitSubstitution?: (externalName: string, internalKey: string, reason?: string) => void;
}

const useStyles = makeStyles({
  item: {
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
    marginBottom: tokens.spacingVerticalS,
  },
  itemRejected: {
    borderLeftColor: tokens.colorPaletteRedBorderActive,
    borderLeftWidth: "3px",
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    flex: 1,
    minWidth: 0,
  },
  identifierBlock: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "2px",
  },
  valueLine: {
    display: "flex",
    alignItems: "baseline",
    gap: tokens.spacingHorizontalXS,
    minWidth: 0,
  },
  valueLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: tokens.fontWeightSemibold,
    flexShrink: 0,
  },
  value: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: tokens.spacingHorizontalS,
    rowGap: "2px",
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  metaItem: {
    display: "inline-flex",
    gap: "4px",
  },
  metaLabel: {
    color: tokens.colorNeutralForeground3,
  },
  metaValue: {
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightMedium,
  },
  badges: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    alignItems: "center",
    marginLeft: "auto",
  },
  panel: {
    paddingTop: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
  },
  icon: {
    width: "16px",
    height: "16px",
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
});

function typeIcon(t: string) {
  if (t.toLowerCase().includes("email")) return Mail;
  if (t.toLowerCase().includes("phone")) return Phone;
  return Globe;
}

function accountTag(identifier: AccountIdentifier) {
  const status = identifier.accountExistenceStatus;
  if (!status || status === "not-checked") {
    return { label: "Not checked", icon: ShieldQuestion, color: "warning" as const };
  }
  if (status === "error") {
    return { label: "Check error", icon: ShieldX, color: "important" as const };
  }
  const at = identifier.checkAccounts?.accountType;
  if (at === "N/A" || at === "n/a") {
    return { label: "No account", icon: ShieldX, color: "important" as const };
  }
  return { label: at ?? "Unknown", icon: ShieldCheck, color: "success" as const };
}

export function IdentifierAccordion(props: IdentifierAccordionProps) {
  const styles = useStyles();
  const {
    identifier,
    baseline,
    validation,
    enabledServiceCount,
    rsEdit,
    selected,
    onSelectChange,
    onRunCheck,
    onRetryCheck,
    onOpenReject,
    onRestore,
    onAcknowledgeETSI,
    onAcknowledgeNotFound,
    onMarkInvalid,
    onRestoreInvalid,
    onCommitSubstitution,
  } = props;

  // Phase 5b.4: state for the ReplaceServiceDialog opened from MappingIssuesPane.
  const [replaceTarget, setReplaceTarget] = React.useState<
    { externalName: string; reason?: string } | null
  >(null);

  const rejected = isRejected(identifier);
  const etsiTerminal = isETSITerminal(identifier);
  const invalid = isInvalid(identifier);
  const notFound = identifier.taskStatus === "Not Found";
  const accountNotFound = baseline?.accountNotFound === true && !notFound && !invalid;
  const TypeIcon = typeIcon(identifier.type);
  const tag = accountTag(identifier);
  const TagIcon = tag.icon;
  const leRequestedCount = baseline?.services.length ?? 0;
  const blockingCount = validation.blocking.length;
  const substitutedExternalNames = (identifier.externalSubstitutions ?? []).map(
    (s) => s.externalName,
  );
  const substitutedSet = new Set(substitutedExternalNames);
  const mappingIssuesCount = (baseline?.externalUnresolved ?? []).filter(
    (r) => !substitutedSet.has(r.externalName),
  ).length;

  return (
    <Accordion
      collapsible
      multiple
      defaultOpenItems={[]}
    >
      <AccordionItem
        value={identifier.id}
        className={`${styles.item} ${rejected ? styles.itemRejected : ""}`}
      >
        <AccordionHeader>
          <div className={styles.headerInner}>
            <Checkbox
              checked={selected}
              disabled={rejected}
              onClick={(e) => e.stopPropagation()}
              onChange={(_, d) => onSelectChange(!!d.checked)}
              aria-label={`Select ${identifier.value}`}
            />
            <TypeIcon className={styles.icon} aria-hidden="true" />
            <div className={styles.identifierBlock}>
              <div className={styles.valueLine}>
                <span className={styles.valueLabel}>Target identifier:</span>
                <span className={styles.value}>{identifier.value}</span>
              </div>
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Type:</span>
                  <span className={styles.metaValue}>{identifier.type}</span>
                </span>
                <span>·</span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Task ID:</span>
                  <span className={styles.metaValue}>{identifier.taskId || "—"}</span>
                </span>
                {identifier.createdBy && (
                  <>
                    <span>·</span>
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Created by:</span>
                      <span className={styles.metaValue}>{identifier.createdBy}</span>
                    </span>
                  </>
                )}
                <span>·</span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Requested by LE:</span>
                  <span className={styles.metaValue}>
                    {leRequestedCount} {leRequestedCount === 1 ? "service" : "services"}
                  </span>
                </span>
              </div>
            </div>
            <div className={styles.badges}>
              <Tag size="small" appearance="outline" icon={<TagIcon size={12} />} title="Account check result">
                Account: {tag.label}
              </Tag>
              {onRunCheck && !rejected && !etsiTerminal && !invalid && !notFound && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunCheck();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onRunCheck();
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    paddingLeft: tokens.spacingHorizontalS,
                    paddingRight: tokens.spacingHorizontalS,
                    paddingTop: 2,
                    paddingBottom: 2,
                    borderRadius: tokens.borderRadiusMedium,
                    fontSize: tokens.fontSizeBase200,
                    fontWeight: tokens.fontWeightSemibold,
                    backgroundColor: tokens.colorBrandBackground2,
                    color: tokens.colorBrandForeground2,
                    border: `1px solid ${tokens.colorBrandStroke1}`,
                  }}
                  title="Re-run the account-existence check for this identifier"
                >
                  {identifier.accountExistenceStatus === "checking"
                    ? "Checking…"
                    : identifier.accountExistenceStatus === "not-checked"
                      ? "Check Accounts"
                      : "Re-check"}
                </div>
              )}
              {!rejected && (
                <Tag size="small" appearance="brand" title="Services configured by RS so far">
                  {enabledServiceCount} configured
                </Tag>
              )}
              <Tag size="small" appearance="filled-lighter" title="Job status">
                Status: {identifier.taskStatus}
              </Tag>
              <ETSIDesiredStatusChip status={identifier.etsiDesiredStatus} />
              {/* When the account check returned N/A, the dedicated card / banner
                  already explains the terminal state — suppress the noisy
                  mapping-issue and blocking chips in that case. */}
              {!rejected && !etsiTerminal && !accountNotFound && !notFound && mappingIssuesCount > 0 && (
                <Tag
                  size="small"
                  style={{
                    backgroundColor: tokens.colorPaletteRedBackground2,
                    color: tokens.colorPaletteRedForeground1,
                  }}
                  title="LE-submitted external services that did not resolve to internal LENS services"
                >
                  {mappingIssuesCount} mapping {mappingIssuesCount === 1 ? "issue" : "issues"}
                </Tag>
              )}
              {!rejected && !accountNotFound && !notFound && blockingCount > 0 && (
                <Tag size="small" style={{ backgroundColor: tokens.colorPaletteYellowBackground2, color: tokens.colorPaletteDarkOrangeForeground1 }}>
                  {blockingCount} blocking
                </Tag>
              )}
              {rejected && (
                <Tag
                  size="small"
                  style={{
                    backgroundColor: tokens.colorPaletteRedBackground2,
                    color: tokens.colorPaletteRedForeground1,
                  }}
                >
                  Rejected
                </Tag>
              )}
            </div>
          </div>
        </AccordionHeader>
        <AccordionPanel>
          <div className={styles.panel}>
            {/* Account aliases from CLASS lookup — identifier-level metadata,
                shown above the LE/RS split-pane and above terminal-state
                cards. The panel self-hides when there is no CLASS data. */}
            <IdentifierAliasesPanel identifier={identifier} />
            {rejected ? (
              <RejectedIdentifierCard
                identifier={identifier}
                onRestore={onRestore}
              />
            ) : etsiTerminal ? (
              <ETSIStatusCard
                identifier={identifier}
                onAcknowledge={onAcknowledgeETSI ?? (() => {})}
              />
            ) : invalid ? (
              <InvalidIdentifierCard
                identifier={identifier}
                onRestore={onRestoreInvalid ?? (() => {})}
              />
            ) : notFound ? (
              <NotFoundIdentifierCard identifier={identifier} />
            ) : (
              <SplitPane
                left={
                  <LEReviewPanel
                    baseline={baseline}
                    validation={validation}
                    onRunCheck={onRunCheck}
                    onRetryCheck={onRetryCheck}
                    onReject={onOpenReject}
                    onAcknowledgeNotFound={
                      accountNotFound ? onAcknowledgeNotFound : undefined
                    }
                    onReplaceExternal={
                      onCommitSubstitution
                        ? (externalName) => {
                            const found = baseline?.externalUnresolved?.find(
                              (r) => r.externalName === externalName,
                            );
                            setReplaceTarget({ externalName, reason: found?.reason });
                          }
                        : undefined
                    }
                    substitutedExternalNames={substitutedExternalNames}
                  />
                }
                right={
                  <RSEditPanel
                    identifier={identifier}
                    disabled={rsEdit.disabled}
                    showFullRemovalConfirm={rsEdit.showFullRemovalConfirm}
                    confirmedNoData={rsEdit.confirmedNoData}
                    onConfirmNoData={rsEdit.onConfirmNoData}
                    onResetToLE={rsEdit.onResetToLE}
                    onRejectIdentifier={rsEdit.onRejectIdentifier}
                    onMarkInvalid={onMarkInvalid}
                  >
                    {rsEdit.workspace}
                  </RSEditPanel>
                }
              />
            )}
          </div>
        </AccordionPanel>
      </AccordionItem>
      {replaceTarget && (
        <ReplaceServiceDialog
          open={!!replaceTarget}
          externalName={replaceTarget.externalName}
          reason={replaceTarget.reason}
          accountType={identifier.checkAccounts?.accountType}
          alreadySelected={Object.keys(identifier.services || {}).filter(
            (svcKey) => (identifier.services as any)?.[svcKey]?.enabled,
          )}
          onCancel={() => setReplaceTarget(null)}
          onConfirm={(internalKey) => {
            onCommitSubstitution?.(
              replaceTarget.externalName,
              internalKey,
              replaceTarget.reason,
            );
            setReplaceTarget(null);
          }}
        />
      )}
    </Accordion>
  );
}
