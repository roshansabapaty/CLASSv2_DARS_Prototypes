/**
 * IdentifierTableRow — one identifier row in the case's identifier table.
 *
 * Phase 2 of the attorney-escalation merge:
 *  - Migrated from shadcn (Button / Badge / Input / Popover+Command /
 *    TableRow+TableCell + Tailwind) to Fluent v9 + Griffel per
 *    docs/UI_LIBRARY_POLICY.md. The shell stays as semantic HTML
 *    `<tr>` / `<td>` so the row remains a valid child of the parent's
 *    shadcn `<TableBody>` (`<tbody>`) until that table itself gets
 *    migrated.
 *  - Escalated identifiers (`taskStatus === "AttorneyReview"`) get a
 *    red left-border accent.
 *  - When the parent wires `attorneyContext` (i.e., supplies the case's
 *    `formData` + `onAttorneyAction`), expanding an escalated row also
 *    mounts the inline `AttorneyReviewPanel`. In the same context,
 *    non-escalated rows render dimmed with a "Not flagged for attorney
 *    review" expanded body — matches the prototype pattern.
 */

import React, { useState, useEffect, useSyncExternalStore } from "react";
import {
  Badge,
  Button,
  Combobox,
  Input,
  Option,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from "@fluentui/react-components";
import {
  EditRegular,
  DeleteRegular,
  CheckmarkCircleRegular,
  DismissRegular,
  ErrorCircleRegular,
  ChevronRightRegular,
  ChevronDownRegular,
  GlobeLocationRegular,
} from "@fluentui/react-icons";
import { ETSIDesiredStatusChip } from "../fulfillment-wizard/ETSIDesiredStatusChip";
import { validateIdentifierFormat } from "../../utils/caseHelpers";
import { IDENTIFIER_TYPES } from "../../constants/caseConstants";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { AccountCheckCell } from "./AccountCheckCell";
import { getEnabledServices } from "./identifier-table-utils";
import {
  getAccountInfo,
  SERVICE_LABELS,
  deriveServiceDateRange,
} from "./identifier-table-utils";
import { formatDateToMMM } from "../../utils/fulfillmentWizardHelpers";
import { CopyableIdentifier } from "../CopyableIdentifier";
import { AttorneyReviewPanel } from "../escalation/AttorneyReviewPanel";
import {
  getAllSnapshot as getIpHistorySnapshot,
  subscribe as subscribeIpHistoryStore,
} from "../../state/ipHistoryStore";
import type {
  AttorneyAction,
  AttorneyEscalation,
  EscalationAuditEvent,
  FormData,
} from "../../types/caseTypes";

const useStyles = makeStyles({
  // Red-bordered escalated row. The left border is rendered on the first
  // cell via box-shadow so it sits cleanly without distorting <td>
  // borders — sidesteps the table border-collapse + border-spacing
  // interaction that messes with `border-left` on a <tr>.
  needsReview: {
    backgroundColor: tokens.colorPaletteRedBackground1,
  },
  needsReviewLeadCell: {
    boxShadow: `inset 3px 0 0 0 ${tokens.colorPaletteRedBorder2}`,
  },
  notForReview: {
    opacity: 0.6,
  },
  numCell: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    width: "48px",
    verticalAlign: "top",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalXS,
  },
  numCellInner: {
    display: "flex",
    alignItems: "center",
    columnGap: "4px",
  },
  expanderBtn: {
    minWidth: "auto",
    height: "24px",
    width: "24px",
    paddingLeft: 0,
    paddingRight: 0,
  },
  cell: {
    verticalAlign: "top",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
  },
  typeStack: {
    display: "flex",
    flexDirection: "column",
    rowGap: "4px",
    alignItems: "flex-start",
  },
  // Type label — borderless text in place of the prior outline Badge so
  // longer identifier types (e.g. "XBOX 5X5 Token", "Other Payment
  // Instrument") wrap naturally inside the narrow Type cell instead of
  // overflowing a rounded chip. Visual weight matches what the Badge
  // gave us — semibold, 14px, primary foreground colour.
  typeLabel: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase300,
    wordBreak: "break-word",
  },
  // Supplemental row treatment — a soft indent + a ↳ connector glyph
  // before the type badges so the row reads as "child of the LE row
  // above." Driven by IdentifierTable.displayRows when the row's
  // linkedIdentifierId resolves to a visible parent.
  supplementalTypeRow: {
    display: "flex",
    alignItems: "flex-start",
    columnGap: "6px",
    paddingLeft: tokens.spacingHorizontalM,
  },
  supplementalConnector: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    flexShrink: 0,
    userSelect: "none",
  },
  // "Linked to LE: <parent value>" caption rendered in the value cell's
  // metaRow stack. Purple to match the Supplemental badge palette so the
  // relationship reads at a glance.
  linkedToCaption: {
    fontSize: tokens.fontSizeBase200,
    color: "#8764b8",
    fontWeight: tokens.fontWeightSemibold,
  },
  valueStack: {
    display: "flex",
    flexDirection: "column",
    rowGap: "4px",
  },
  valueRow: {
    display: "flex",
    alignItems: "center",
    columnGap: "6px",
    flexWrap: "wrap",
  },
  valueLabel: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightRegular,
  },
  valueText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    wordBreak: "break-all",
  },
  metaRow: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  metaSeparator: {
    marginLeft: tokens.spacingHorizontalM,
  },
  monoSpan: {
    fontFamily: "monospace",
  },
  statusCell: {
    width: "128px",
    verticalAlign: "top",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
  },
  statusStack: {
    display: "flex",
    flexDirection: "column",
    rowGap: "4px",
    alignItems: "flex-start",
  },
  accountCheckCell: {
    width: "192px",
    verticalAlign: "top",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
  },
  // "Last Logon Location" column — populated when the user runs the
  // IP History lookup. Empty / muted until then.
  lastLogonCell: {
    width: "176px",
    verticalAlign: "top",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
  },
  lastLogonStack: {
    display: "flex",
    flexDirection: "column",
    rowGap: "2px",
  },
  lastLogonCountry: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  lastLogonCity: {
    fontSize: "10px",
    color: tokens.colorNeutralForeground3,
  },
  lastLogonTimestamp: {
    fontSize: "10px",
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: "tabular-nums",
  },
  lastLogonEmpty: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground4,
    fontStyle: "italic",
  },
  lastLogonVpn: {
    fontSize: "10px",
    color: tokens.colorPaletteDarkOrangeForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  actionsCell: {
    // Wider to accommodate the labeled "Logins" button on attorney-
    // context rows. Non-readOnly rows still fit Edit + Delete (icon
    // only) within this width.
    minWidth: "164px",
    textAlign: "right",
    verticalAlign: "top",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalM,
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    columnGap: "4px",
    flexWrap: "wrap",
    rowGap: "4px",
  },
  inlineErrorRow: {
    display: "flex",
    alignItems: "center",
    columnGap: "4px",
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  expandedCell: {
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: "48px",
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  expandedCellAlt: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: "48px",
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  expandedCellAccent: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: "48px",
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorBrandBackground2,
  },
  sectionLabel: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: "6px",
    display: "block",
  },
  accountCheckGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalS,
    "@media (min-width: 768px)": {
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    },
  },
  accountCheckLabel: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: tokens.colorNeutralForeground4,
    display: "block",
  },
  accountCheckValue: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  accountStatusFound: {
    color: tokens.colorPaletteGreenForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  accountStatusNotFound: {
    color: tokens.colorPaletteRedForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  accountStatusError: {
    color: tokens.colorPaletteDarkOrangeForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  accountStatusUnchecked: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  servicesRow: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalS,
  },
  serviceCard: {
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
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
    borderBottomRightRadius: tokens.borderRadiusSmall,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    paddingTop: "6px",
    paddingBottom: "6px",
    minWidth: "140px",
  },
  serviceLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    display: "block",
  },
  serviceMeta: {
    fontSize: "10px",
    color: tokens.colorNeutralForeground3,
    marginTop: "2px",
  },
  serviceMetaStrong: {
    fontWeight: tokens.fontWeightMedium,
    color: tokens.colorNeutralForeground2,
  },
  categoryChips: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: "4px",
    rowGap: "4px",
    marginTop: "4px",
  },
  ianoteText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    whiteSpace: "pre-wrap",
  },
  preservationRow: {
    display: "flex",
    alignItems: "baseline",
    columnGap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  preservationLabel: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  preservationValue: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  preservationNote: {
    fontSize: "10px",
    fontStyle: "italic",
    color: tokens.colorNeutralForeground3,
  },
});

interface IdentifierTableRowProps {
  identifier: any;
  index: number;
  /** Display label rendered in the # column (e.g. "1", "1a", "1b").
   *  When omitted, falls back to `index + 1`. Drives the supplemental-
   *  under-parent grouping computed in IdentifierTable. */
  displayLabel?: string;
  /** When set, this row is a supplemental and the value is the
   *  parent LE-identifier's value. Drives the ↳ connector + indent +
   *  "Linked to LE: <parent value>" caption. */
  parentValue?: string;
  readOnly?: boolean;
  forceExpanded?: boolean;
  /** Incremented each time the parent toggles expand/collapse all, to re-trigger the effect */
  forceExpandedKey?: number;
  onUpdate?: (id: string, updates: { type: string; value: string }) => void;
  onDelete?: (id: string) => void;
  /** Case-level request type. Drives request-type-specific rows in the
   *  expanded view (e.g. eEvidence Issuing Authority notes). */
  requestType?: string;
  /** Case-level request sub-type. Used in tandem with `requestType` to
   *  surface sub-type-specific rows — e.g. EPOC-PR cases display the
   *  per-identifier `desiredPreservationExpiration` date. */
  requestSubType?: string;
  /** Phase 2 attorney-escalation merge: when the parent passes the
   *  full case `formData` AND an `onAttorneyAction` handler, the row is
   *  running in "attorney context". Escalated rows then mount the
   *  inline `AttorneyReviewPanel` on expand; non-escalated rows render
   *  dimmed with a "Not flagged for attorney review" body. Without
   *  these props, the row falls back to the read-only behavior used by
   *  the wizard / triage views. */
  formData?: FormData;
  onAttorneyAction?: (next: {
    action: AttorneyAction;
    auditEvent: EscalationAuditEvent;
    statusPatch?: Partial<AttorneyEscalation>;
    notifyLead?: boolean;
  }) => void;
  /** Phase 3 cross-border merge: when set, the actions column shows a
   *  Logins button that opens the LoginLocationPanel scoped to this
   *  identifier. Only renders when the parent is in attorney context
   *  (we don't want this in the wizard / triage views). */
  onOpenLoginLocation?: (identifierId: string) => void;
}

export function IdentifierTableRow({
  identifier,
  index,
  displayLabel,
  parentValue,
  readOnly = false,
  forceExpanded,
  forceExpandedKey,
  onUpdate,
  onDelete,
  requestType,
  requestSubType,
  formData,
  onAttorneyAction,
  onOpenLoginLocation,
}: IdentifierTableRowProps) {
  const styles = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState({ type: "", value: "" });
  const [validationError, setValidationError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded, forceExpandedKey]);

  const sortedTypes = [...IDENTIFIER_TYPES].sort((a, b) => a.localeCompare(b));
  void getEnabledServices(identifier);
  const accountInfo = getAccountInfo(identifier);
  // Actions column renders when EITHER editing is allowed (!readOnly)
  // OR a parent wired Logins drilldown. colSpan must follow suit so
  // expanded rows fill the full table width. Base = 6 (#, Type, Value,
  // Task Status, Account Check, Last Logon Location). Add 1 when the
  // actions column is visible.
  const actionsColumnVisible = !readOnly || Boolean(onOpenLoginLocation);
  const colSpan = actionsColumnVisible ? 7 : 6;

  // Subscribe to the cross-surface IP History store so the "Last Logon
  // Location" column updates the moment the user clicks Look up
  // locations in any open LoginLocationPanel instance.
  const ipHistorySnapshot = useSyncExternalStore(
    subscribeIpHistoryStore,
    getIpHistorySnapshot,
  );
  const lastLogonLookup = ipHistorySnapshot.get(identifier.id);

  // Attorney-context derived state. Escalation column drives the red
  // left-border accent (always on for `AttorneyReview` rows); the
  // dimmed / panel-mount treatments only fire when the parent wired
  // the full attorney context (formData + handler).
  const needsReview = identifier.taskStatus === "AttorneyReview";
  const attorneyContextActive = Boolean(formData && onAttorneyAction);
  const dimmedRow = attorneyContextActive && !needsReview;

  // Derive account check details
  const accountStatus =
    identifier.accountExistenceStatus === "success"
      ? accountInfo.hasAccount
        ? "Found"
        : "Not Found"
      : identifier.accountExistenceStatus === "error"
        ? "Error"
        : "Not Checked";

  const accountType =
    accountInfo.hasConsumer && accountInfo.hasEnterprise
      ? "Consumer & Enterprise"
      : accountInfo.hasConsumer
        ? "Consumer"
        : accountInfo.hasEnterprise
          ? "Enterprise"
          : "—";

  const mailboxLocation =
    identifier.checkAccounts?.dataLocation ||
    (accountInfo.storageLocations.size > 0
      ? [...accountInfo.storageLocations].join(", ")
      : "—");

  const primaryIdentifier = identifier.checkAccounts?.primaryIdentifier || "—";
  const relatedIdentifiers = identifier.checkAccounts?.relatedIdentifiers || [];

  const enabledServicesDetail = Object.entries(identifier.services || {})
    .filter(([, svc]: [string, any]) => svc.enabled)
    .map(([key, svc]: [string, any]) => {
      const label = SERVICE_LABELS[key] || key;
      const cats = svc.categoryGroups
        ? Object.entries(svc.categoryGroups).flatMap(
            ([, group]: [string, any]) =>
              Object.entries(group || {})
                .filter(([, cat]: [string, any]) => cat.enabled)
                .map(([iKey]: [string, any]) =>
                  iKey
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (s: string) => s.toUpperCase())
                    .trim(),
                ),
          )
        : [];
      const dateRange = deriveServiceDateRange(svc);
      return { key, label, categories: cats, dateRange };
    });

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue({ type: identifier.type, value: identifier.value });
    setValidationError("");
  };

  const handleSave = () => {
    if (!editValue.value.trim()) {
      setValidationError("Value cannot be empty");
      return;
    }
    const validation = validateIdentifierFormat(editValue.value, editValue.type);
    if (!validation.valid) {
      setValidationError(validation.message || "Invalid format");
      return;
    }
    onUpdate?.(identifier.id, editValue);
    setIsEditing(false);
    setValidationError("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValidationError("");
  };

  const accountStatusClass =
    accountStatus === "Found"
      ? styles.accountStatusFound
      : accountStatus === "Not Found"
        ? styles.accountStatusNotFound
        : accountStatus === "Error"
          ? styles.accountStatusError
          : styles.accountStatusUnchecked;

  // Lead cell carries the red box-shadow when the identifier needs review
  // — keeps the accent on the row's leading edge no matter the table's
  // border-collapse setting.
  const leadCellClass = mergeClasses(
    styles.numCell,
    needsReview && styles.needsReviewLeadCell,
  );

  return (
    <>
      <tr
        className={mergeClasses(
          needsReview && styles.needsReview,
          dimmedRow && styles.notForReview,
        )}
      >
        {/* # + expand toggle */}
        <td className={leadCellClass}>
          <div className={styles.numCellInner}>
            <Button
              appearance="subtle"
              size="small"
              className={styles.expanderBtn}
              icon={
                isExpanded ? (
                  <ChevronDownRegular />
                ) : (
                  <ChevronRightRegular />
                )
              }
              aria-label={isExpanded ? "Collapse row" : "Expand row"}
              onClick={() => setIsExpanded(!isExpanded)}
            />
            <span>{displayLabel ?? String(index + 1)}</span>
          </div>
        </td>

        {/* Type */}
        <td className={styles.cell}>
          {isEditing ? (
            <Combobox
              value={editValue.type}
              selectedOptions={editValue.type ? [editValue.type] : []}
              onOptionSelect={(_e, data) => {
                if (data.optionValue) {
                  setEditValue({ ...editValue, type: data.optionValue });
                }
              }}
              placeholder="Select type"
              size="small"
            >
              {sortedTypes.map((t) => (
                <Option key={t} value={t}>
                  {t}
                </Option>
              ))}
            </Combobox>
          ) : (
            <div
              className={
                parentValue
                  ? styles.supplementalTypeRow
                  : undefined
              }
            >
              {parentValue && (
                <span
                  className={styles.supplementalConnector}
                  aria-hidden="true"
                >
                  ↳
                </span>
              )}
              <div className={styles.typeStack}>
                <span className={styles.typeLabel}>{identifier.type}</span>
                {identifier.createdBy?.includes("Supplemental") && (
                  <Badge appearance="tint" color="important" size="small">
                    Supplemental
                  </Badge>
                )}
              </div>
            </div>
          )}
        </td>

        {/* Value */}
        <td className={styles.cell}>
          {isEditing ? (
            <div className={styles.valueStack}>
              <Input
                value={editValue.value}
                onChange={(_e, data) =>
                  setEditValue({ ...editValue, value: data.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    handleCancel();
                  }
                }}
                size="small"
              />
              {validationError && (
                <div className={styles.inlineErrorRow}>
                  <ErrorCircleRegular fontSize={12} />
                  <span>{validationError}</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.valueStack}>
              <div className={styles.valueRow}>
                <span className={styles.valueLabel}>Target Identifier:</span>
                <CopyableIdentifier
                  value={identifier.value}
                  copyLabel="Copy target identifier"
                  className="font-semibold"
                  breakAll
                />
              </div>
              <div className={styles.metaRow}>
                {identifier.taskId && (
                  <span>
                    Task ID:{" "}
                    <span className={styles.monoSpan}>{identifier.taskId}</span>
                  </span>
                )}
                {identifier.createdBy && (
                  <span
                    className={identifier.taskId ? styles.metaSeparator : undefined}
                  >
                    {identifier.taskId && "• "}Created by:{" "}
                    <span>{identifier.createdBy}</span>
                  </span>
                )}
              </div>
              {parentValue && (
                <div className={styles.linkedToCaption}>
                  Linked to LE: <span>{parentValue}</span>
                </div>
              )}
            </div>
          )}
        </td>

        {/* Task Status */}
        <td className={styles.statusCell}>
          <div className={styles.statusStack}>
            <TaskStatusBadge status={identifier.taskStatus} />
            <ETSIDesiredStatusChip
              status={identifier.etsiDesiredStatus}
              size="extra-small"
            />
          </div>
        </td>

        {/* Account Check */}
        <td className={styles.accountCheckCell}>
          <AccountCheckCell identifier={identifier} />
        </td>

        {/* Consumer User Location Summary — populated by the Check
            Accounts run (Phase 3). Consumer-only: Enterprise rows show
            an em-dash because their cross-border signal comes from the
            Org Home Location vs Issuing Authority comparison in the
            tri-pane, not per-user IP geo. */}
        <td className={styles.lastLogonCell}>
          {identifier.checkAccounts?.accountType !== "Consumer" ? (
            <span className={styles.lastLogonEmpty}>—</span>
          ) : !lastLogonLookup ? (
            <span className={styles.lastLogonEmpty}>
              Run Check Accounts to populate
            </span>
          ) : lastLogonLookup.lastEvent === null ? (
            <span className={styles.lastLogonEmpty}>
              No locations in last 30 days
            </span>
          ) : (
            <div className={styles.lastLogonStack}>
              <span className={styles.lastLogonCountry}>
                {lastLogonLookup.lastEvent.geo.country}
              </span>
              <span className={styles.lastLogonCity}>
                {lastLogonLookup.lastEvent.geo.city}
              </span>
              <span className={styles.lastLogonTimestamp}>
                {new Date(
                  lastLogonLookup.lastEvent.timestamp,
                ).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {(lastLogonLookup.lastEvent.geo.isVpn ||
                lastLogonLookup.lastEvent.geo.isTor) && (
                <span className={styles.lastLogonVpn}>
                  {lastLogonLookup.lastEvent.geo.isTor ? "via Tor" : "via VPN"}
                </span>
              )}
            </div>
          )}
        </td>

        {/* Actions — also rendered in readOnly mode when the parent
            wired `onOpenLoginLocation` (e.g. the attorney workspace
            wants the Logins drilldown button on every row). */}
        {(!readOnly || onOpenLoginLocation) && (
          <td className={styles.actionsCell}>
            {isEditing ? (
              <div className={styles.actionsRow}>
                <Tooltip content="Save" relationship="label">
                  <Button
                    appearance="primary"
                    size="small"
                    onClick={handleSave}
                    icon={<CheckmarkCircleRegular />}
                    aria-label="Save"
                  />
                </Tooltip>
                <Tooltip content="Cancel" relationship="label">
                  <Button
                    appearance="subtle"
                    size="small"
                    onClick={handleCancel}
                    icon={<DismissRegular />}
                    aria-label="Cancel"
                  />
                </Tooltip>
              </div>
            ) : (
              <div className={styles.actionsRow}>
                {onOpenLoginLocation &&
                  identifier.checkAccounts?.accountType === "Consumer" && (
                    <Button
                      appearance="outline"
                      size="small"
                      onClick={() => onOpenLoginLocation(identifier.id)}
                      icon={<GlobeLocationRegular />}
                      aria-label="View Consumer User Locations"
                    >
                      Consumer User Locations
                    </Button>
                  )}
                {!readOnly && (
                  <Tooltip content="Edit identifier" relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      onClick={handleEdit}
                      icon={<EditRegular />}
                      aria-label="Edit identifier"
                    />
                  </Tooltip>
                )}
                {!readOnly && (
                  <Tooltip content="Delete identifier" relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      onClick={() => onDelete?.(identifier.id)}
                      icon={<DeleteRegular />}
                      aria-label="Delete identifier"
                    />
                  </Tooltip>
                )}
              </div>
            )}
          </td>
        )}
      </tr>

      {/* Expanded Row 0: Attorney Review Panel — only mounts when the
          parent wired attorney context AND this identifier is escalated.
          Sits above the standard expanded sections so the attorney sees
          the decision surface first, then the case-detail context. */}
      {isExpanded &&
        attorneyContextActive &&
        needsReview &&
        formData &&
        onAttorneyAction && (
          <tr>
            <td colSpan={colSpan} className={styles.expandedCell}>
              <AttorneyReviewPanel
                formData={formData}
                identifierId={identifier.id}
                onAttorneyAction={onAttorneyAction}
              />
            </td>
          </tr>
        )}

      {/* Expanded "not flagged" notice — when attorney context is active
          but the identifier isn't escalated, swap the noisy detail rows
          for a single explanatory line (matches the prototype). The
          dimmed-row treatment on the main row already signals the
          deprioritized state visually. */}
      {isExpanded && attorneyContextActive && !needsReview && (
        <tr>
          <td colSpan={colSpan} className={styles.expandedCell}>
            <Text size={300}>
              Task status: <TaskStatusBadge status={identifier.taskStatus} />.
              {" "}Not flagged for attorney review.
            </Text>
          </td>
        </tr>
      )}

      {/* Expanded Row 1: Account Check Results — outside attorney
          context, OR alongside the attorney panel for escalated
          identifiers (the attorney still wants account-check signal). */}
      {isExpanded && (!attorneyContextActive || needsReview) && (
        <tr>
          <td colSpan={colSpan} className={styles.expandedCellAlt}>
            <span className={styles.sectionLabel}>Account Check Results</span>
            <div className={styles.accountCheckGrid}>
              <div>
                <span className={styles.accountCheckLabel}>Account Status</span>
                <span className={mergeClasses(styles.accountCheckValue, accountStatusClass)}>
                  {accountStatus}
                </span>
              </div>
              <div>
                <span className={styles.accountCheckLabel}>Account Type</span>
                <span className={styles.accountCheckValue}>{accountType}</span>
              </div>
              <div>
                <span className={styles.accountCheckLabel}>Mailbox Location</span>
                <span className={styles.accountCheckValue}>{mailboxLocation}</span>
              </div>
              <div>
                <span className={styles.accountCheckLabel}>Primary Identifier</span>
                <CopyableIdentifier
                  value={primaryIdentifier}
                  variant="inline"
                  copyLabel="Copy primary identifier"
                  breakAll
                />
              </div>
              <div>
                <span className={styles.accountCheckLabel}>Related Identifiers</span>
                {relatedIdentifiers.length > 0 ? (
                  <div className={styles.categoryChips}>
                    {relatedIdentifiers.map((ri: string, i: number) => (
                      <CopyableIdentifier
                        key={i}
                        value={ri}
                        variant="badge"
                        copyLabel="Copy related identifier"
                      />
                    ))}
                  </div>
                ) : (
                  <span className={styles.accountCheckValue}>—</span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Expanded Row 2: LE Requested Services & Data Categories. */}
      {isExpanded && (!attorneyContextActive || needsReview) && (
        <tr>
          <td colSpan={colSpan} className={styles.expandedCellAlt}>
            <span className={styles.sectionLabel}>
              LE Requested Services &amp; Data Categories
            </span>
            {enabledServicesDetail.length > 0 ? (
              <div className={styles.servicesRow}>
                {enabledServicesDetail.map((svc) => (
                  <div key={svc.key} className={styles.serviceCard}>
                    <span className={styles.serviceLabel}>{svc.label}</span>
                    {svc.dateRange ? (
                      <div className={styles.serviceMeta}>
                        LE requested:{" "}
                        <span className={styles.serviceMetaStrong}>
                          {formatDateToMMM(
                            svc.dateRange.start.toISOString().split("T")[0],
                          )}
                          {" – "}
                          {formatDateToMMM(
                            svc.dateRange.end.toISOString().split("T")[0],
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className={styles.serviceMeta}>
                        LE requested:{" "}
                        <span style={{ fontStyle: "italic" }}>
                          No date range
                        </span>
                      </div>
                    )}
                    {svc.categories.length > 0 ? (
                      <div className={styles.categoryChips}>
                        {svc.categories.map((cat, i) => (
                          <Badge
                            key={i}
                            appearance="tint"
                            color="brand"
                            size="small"
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.serviceMeta}>
                        No categories selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Text size={200}>No services configured</Text>
            )}
          </td>
        </tr>
      )}

      {/* Expanded Row 3: eEvidence Issuing Authority notes. */}
      {isExpanded &&
        (!attorneyContextActive || needsReview) &&
        requestType === "eEvidence" &&
        typeof identifier.issuingAuthorityNotes === "string" &&
        identifier.issuingAuthorityNotes.trim().length > 0 && (
          <tr>
            <td colSpan={colSpan} className={styles.expandedCellAlt}>
              <span className={styles.sectionLabel}>
                Issuing Authority Additional Information Notes
              </span>
              <p className={styles.ianoteText}>
                {identifier.issuingAuthorityNotes}
              </p>
            </td>
          </tr>
        )}

      {/* Expanded Row 4: EPOC-PR preservation expiration date. */}
      {isExpanded &&
        (!attorneyContextActive || needsReview) &&
        requestType === "eEvidence" &&
        requestSubType === "EPOC PR" &&
        typeof identifier.desiredPreservationExpiration === "string" &&
        identifier.desiredPreservationExpiration.length > 0 && (
          <tr>
            <td colSpan={colSpan} className={styles.expandedCellAccent}>
              <div className={styles.preservationRow}>
                <span className={styles.preservationLabel}>
                  Desired Preservation Expiration
                </span>
                <span className={styles.preservationValue}>
                  {formatDateToMMM(identifier.desiredPreservationExpiration)}
                </span>
                <span className={styles.preservationNote}>
                  IA-provided · read-only
                </span>
              </div>
            </td>
          </tr>
        )}
    </>
  );
}
