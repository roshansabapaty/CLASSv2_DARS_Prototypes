/**
 * PlanReviewTable — Fluent v9 Accordion/table showing, per identifier, every
 * service+category row with provenance tag + current job status + the action
 * that will fire when the wizard is submitted.
 *
 * Used on Step 3 of the Fulfillment wizard.
 */

import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Badge,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  LENS_SERVICES,
  getServiceCategoryGroups,
} from "../../config/lensServicesConfig";
import { mapStorageLocationToCollectionBoundary } from "../../constants/collectionBoundaries";
import type { ItemSelectionState } from "../../utils/categoryUtils";
import {
  resolveProvenance,
  resolveRowAction,
  getBaselineDate,
  type LEBaseline,
  type RowAction,
} from "./leBaseline";
import { ProvenanceTag } from "./ProvenanceTag";
import { formatDateToMMM } from "../../utils/fulfillmentWizardHelpers";

/** Fluent v9 Badge `color` for the Authorization Desired Task Status chip.
 *  Cancelled / Suspended convey LE-driven disruption (red / amber).
 *  Completed conveys terminal success (green). Requested / Active stay
 *  neutral / informational. */
function authDesiredTaskStatusColor(
  status: string,
): "danger" | "warning" | "success" | "informative" | "brand" {
  switch (status) {
    case "Cancelled":
      return "danger";
    case "Suspended":
      return "warning";
    case "Completed":
      return "success";
    case "Active":
      return "brand";
    case "Requested":
    default:
      return "informative";
  }
}

// Grid template shared by the sticky column-header row and every per-
// identifier accordion header row. 10 content columns laid out as:
//   Identifier | Task ID | Account | Services | Status | Created By |
//   Authorization | Storage | Collection | Date
// Authorization stays adjacent to Status (both LE/IA-driven). Storage +
// Collection group together. Date trails. Confirmed via Tier 4 UX-Polish
// question pass (2026-05). Phase A of the Account-Verification retirement.
const PLAN_REVIEW_COL_TEMPLATE =
  "minmax(180px, 1.6fr) " +    // Identifier
  "minmax(96px, 0.7fr) " +     // Task ID
  "minmax(72px, 0.5fr) " +     // Account
  "minmax(64px, 0.4fr) " +     // Services
  "minmax(96px, 0.7fr) " +     // Task Status
  "minmax(96px, 0.7fr) " +     // Created By
  "minmax(96px, 0.8fr) " +     // Authorization (UK COPO / eEvidence only)
  "minmax(140px, 1fr) " +      // Storage
  "minmax(112px, 0.8fr) " +    // Collection Boundary
  "minmax(140px, 1fr)";        // Date Range

// Per-task-status colour swatch. Mirrors the Account Verification
// `summaryStatusMap` so the chip rendering is identical after the move.
const TASK_STATUS_SWATCH: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  New: { label: "New", color: "#0078d4", bgColor: "#deecf9", borderColor: "#0078d4" },
  InProgress: { label: "In Progress", color: "#8a6d3b", bgColor: "#fff4ce", borderColor: "#8a6d3b" },
  Rejected: { label: "Rejected", color: "#a4262c", bgColor: "#fde7e9", borderColor: "#a4262c" },
  Cancelled: { label: "Cancelled", color: "#605e5c", bgColor: "#f3f2f1", borderColor: "#8a8886" },
  DisclosureNotAvailable: { label: "Disclosure Not Available", color: "#605e5c", bgColor: "#f3f2f1", borderColor: "#8a8886" },
  Disclosed: { label: "Disclosed", color: "#107c10", bgColor: "#dff6dd", borderColor: "#107c10" },
};

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  // Sticky column-header row above the accordion. Sits at the top of the
  // scroll container so the column meaning stays visible as the user
  // scrolls through many identifiers.
  columnHeaderRow: {
    display: "grid",
    gridTemplateColumns: PLAN_REVIEW_COL_TEMPLATE,
    columnGap: tokens.spacingHorizontalM,
    alignItems: "center",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    paddingLeft: "44px", // matches AccordionHeader's chevron column so labels line up
    backgroundColor: tokens.colorNeutralBackground3,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    position: "sticky",
    top: 0,
    zIndex: 1,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  // Per-row grid inside each AccordionHeader. Same template + gap as the
  // column-header above so every cell lines up to the pixel.
  headerRow: {
    display: "grid",
    gridTemplateColumns: PLAN_REVIEW_COL_TEMPLATE,
    columnGap: tokens.spacingHorizontalM,
    alignItems: "center",
    flex: 1,
    fontSize: tokens.fontSizeBase200,
  },
  cell: {
    minWidth: 0, // allow truncation inside grid cell
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  identifierMeta: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  identifierValue: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  identifierSubtext: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  monoCell: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  createdByCell: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // Detail band at the top of the AccordionPanel. Carries the Consumer
  // / Enterprise Storage + Primary ID details that previously lived in
  // Account Verification's expanded-row pane. Renders ABOVE the per-row
  // services table so the RS sees the account-resolution context first.
  detailBand: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalL,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase200,
  },
  detailGroup: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
  },
  detailGroupHeader: {
    fontWeight: tokens.fontWeightSemibold,
  },
  detailRow: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
  },
  detailLabel: {
    color: tokens.colorNeutralForeground3,
  },
  detailValue: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    wordBreak: "break-all",
  },
  panelInner: {
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: tokens.fontSizeBase200,
  },
  th: {
    textAlign: "left",
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontSize: tokens.fontSizeBase100,
    whiteSpace: "nowrap",
  },
  td: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    verticalAlign: "top",
  },
  tdRemoved: {
    opacity: 0.55,
    textDecoration: "line-through",
  },
  groupHeaderRow: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  groupHeaderCell: {
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
});

/** Map a RowAction to the Fluent Badge that renders it. */
function ActionBadge({ action }: { action: RowAction }) {
  switch (action) {
    case "create-job":
      return (
        <Tooltip content="A new collection job will be started when you click Submit." relationship="description" withArrow>
          <Badge appearance="tint" color="success" size="small">Create Job</Badge>
        </Tooltip>
      );
    case "update-dates":
      return (
        <Tooltip content="The existing collection job's date range will be updated." relationship="description" withArrow>
          <Badge appearance="tint" color="warning" size="small">Update Dates</Badge>
        </Tooltip>
      );
    case "cancel-job":
      return (
        <Tooltip content="The existing collection job will be cancelled." relationship="description" withArrow>
          <Badge appearance="tint" color="danger" size="small">Cancel Job</Badge>
        </Tooltip>
      );
    case "no-change":
      return (
        <Tooltip content="Existing collection job matches the current plan — no action needed." relationship="description" withArrow>
          <Badge appearance="outline" color="informative" size="small">No Change</Badge>
        </Tooltip>
      );
    case "skip":
      return <Badge appearance="outline" size="small">—</Badge>;
  }
}

/** Account-type badge per row. Sourced from the wizard-level check-
 *  accounts result. The same badge renders on every row of a given
 *  identifier (the account type is a per-identifier property), so the
 *  table reads as "identifier X is Consumer, all its rows here belong
 *  to that consumer account". When check-accounts hasn't run yet for
 *  this identifier, renders an em-dash placeholder. */
function AccountTypeBadge({ acResult }: { acResult: any }) {
  if (!acResult) {
    return <span style={{ color: tokens.colorNeutralForeground3 }}>—</span>;
  }
  if (!acResult.exists) {
    return (
      <Tooltip content="Account not found in check-accounts results" relationship="description" withArrow>
        <Badge appearance="tint" color="danger" size="small">
          Not Found
        </Badge>
      </Tooltip>
    );
  }
  const types: string[] = acResult.accountTypes ?? [];
  const storage =
    acResult.consumer?.storageLocation || acResult.enterprise?.storageLocation;
  const tooltip = storage
    ? `${types.join(" + ")} account — storage region: ${storage}`
    : `${types.join(" + ")} account`;
  if (types.includes("Enterprise")) {
    return (
      <Tooltip content={tooltip} relationship="description" withArrow>
        <Badge appearance="tint" color="warning" size="small">
          Enterprise
        </Badge>
      </Tooltip>
    );
  }
  if (types.includes("Consumer")) {
    return (
      <Tooltip content={tooltip} relationship="description" withArrow>
        <Badge appearance="tint" color="brand" size="small">
          Consumer
        </Badge>
      </Tooltip>
    );
  }
  return <span style={{ color: tokens.colorNeutralForeground3 }}>—</span>;
}

/** Map collectionStatus to a Fluent Badge appearance. */
function JobStatusBadge({ jobId, status }: { jobId?: string; status?: string }) {
  if (!jobId) return <span style={{ color: tokens.colorNeutralForeground3 }}>—</span>;
  let color: "informative" | "success" | "danger" | "warning" = "informative";
  if (status === "Complete") color = "success";
  else if (status === "Failed") color = "danger";
  else if (status === "Cancelled") color = "warning";
  return (
    <Tooltip content={`Job ID: ${jobId}`} relationship="description" withArrow>
      <Badge appearance="tint" color={color} size="small">
        {status || "Not Started"}
      </Badge>
    </Tooltip>
  );
}

export interface PlanReviewTableProps {
  identifiers: any[];
  /** Per-identifier → serviceKey → groupKey → itemKey[] (current wizard selection) */
  perIdentifierItems: Record<string, ItemSelectionState>;
  /** Per-identifier → serviceKey[] */
  perIdentifierServices: Record<string, string[]>;
  /** Per-identifier date range */
  identifierDateRanges: Record<string, { start: string; end: string }>;
  /** Category-level date ranges: "idId:svc:group:item" → { start, end } */
  categoryDateRanges: Record<string, { start: string; end: string }>;
  leBaseline: LEBaseline;
  bulkTouched?: Set<string>;
  removedItems?: Record<string, Set<string>>;
  /** When true, render the "Current Job" column. */
  showJobColumn: boolean;
  /** Check-accounts results, keyed by identifier id. Drives the new
   *  per-row "Account" column (C / E / Not Found / —) and the storage-
   *  region badge that lands in each identifier's accordion header. */
  accountCheckResults?: Record<string, any>;
  /** Per-identifier → per-service storage region, derived from
   *  check-accounts results at the wizard root. Drives the new
   *  "Storage Region" column — shows the exact value that will be
   *  stamped onto each job's `dataCenterLocation` at submit. */
  dataCenterLocations?: Record<string, Record<string, string>>;
  /** Case request type. When `"COPO Order"` or `"eEvidence"` we surface
   *  the per-identifier Authorization Desired Task Status (set by LE / IA
   *  to request a task-level status change like Cancelled). Other types
   *  ignore it. */
  requestType?: string;

  /** Per-identifier pending "additional date ranges" the wizard is
   *  carrying for already-submitted categories. Shape:
   *    { [identifierId]: { "svcKey:groupKey:itemKey": [{ start, end }] } }
   *  Used to emit one extra preview row per pending range so the user
   *  can review every job that the next submit will spawn — both the
   *  primary edit AND each net-new additional date range. Optional;
   *  empty/undefined falls through to the legacy "primary only" view. */
  additionalDateRangesByIdentifier?: Record<
    string,
    Record<string, Array<{ start: string; end: string }>>
  >;

  /** Callback: one RowAction computed per row gets fed here so the parent
   *  can aggregate totals for the banner + submit button. */
  onRowAction?: (action: RowAction) => void;
}

type RowInput = {
  identifierId: string;
  serviceKey: string;
  groupKey: string;
  itemKey: string;
  itemName: string;
  serviceName: string;
  groupName: string;
  dateRange: { start: string; end: string };
  existingJobId?: string;
  collectionStatus?: string;
  isSelected: boolean;
  isRemoved: boolean;
  /** Mark rows that represent a previously-submitted **additional**
   *  job (sourced from `category.additionalJobs[]` on the live
   *  identifier). These rows render alongside the primary so the user
   *  sees every existing job for this category, not just the first. */
  isExistingAdditionalJob?: boolean;
  /** Mark rows that represent a **pending** new job — i.e., the
   *  current submit will spawn this. Sourced from the wizard's
   *  `additionalDateRanges` state. Rendered with no existingJobId so
   *  the "Current Job" column reads as a placeholder dash + the row
   *  copy reads as "Will create new job". */
  isPendingNewJob?: boolean;
};

export function PlanReviewTable({
  identifiers,
  perIdentifierItems,
  perIdentifierServices,
  identifierDateRanges,
  categoryDateRanges,
  leBaseline,
  bulkTouched,
  removedItems,
  showJobColumn,
  accountCheckResults,
  dataCenterLocations,
  requestType,
  additionalDateRangesByIdentifier,
  onRowAction,
}: PlanReviewTableProps) {
  // The per-identifier Authorization Desired Task Status chip in the
  // accordion header is only meaningful for orders where LE / IA can
  // submit task-level status updates: UK COPO Orders and eEvidence.
  const showAuthDesiredTaskStatus =
    requestType === "COPO Order" || requestType === "eEvidence";
  const styles = useStyles();

  const serviceName = (key: string) =>
    LENS_SERVICES.find((s) => s.key === key)?.name || key;

  /** Build the list of rows to render for one identifier, across all services
   *  it currently references OR that LE originally asked for. */
  const buildRows = (identifier: any): RowInput[] => {
    const rows: RowInput[] = [];
    const idId = identifier.id;
    const idItems = perIdentifierItems[idId] || {};
    const idServices = perIdentifierServices[idId] || [];
    const baselineEntry = leBaseline[idId];
    const baselineServices = baselineEntry?.services || [];
    const removedSet = removedItems?.[idId] || new Set<string>();

    // Union: services in the user's current selection + LE baseline services.
    const allServices = new Set<string>([...idServices, ...baselineServices]);

    allServices.forEach((svcKey) => {
      const groups = getServiceCategoryGroups(svcKey);
      groups.forEach((group) => {
        group.items.forEach((item) => {
          const isSelected = !!idItems[svcKey]?.[group.key]?.includes(item.key);
          const inBaseline = !!baselineEntry?.items?.[svcKey]?.[group.key]?.includes(item.key);
          const removedKey = `${svcKey}:${group.key}:${item.key}`;
          const isRemoved = removedSet.has(removedKey);
          // Only render if relevant: currently selected, in baseline, or explicitly removed.
          if (!isSelected && !inBaseline && !isRemoved) return;

          const rangeKey = `${idId}:${svcKey}:${group.key}:${item.key}`;
          const dateRange =
            categoryDateRanges[rangeKey] ||
            identifierDateRanges[idId] ||
            { start: "", end: "" };

          // Read existing job state off the live identifier tree.
          const live = identifier.services?.[svcKey]?.categoryGroups?.[group.key]?.[item.key];
          rows.push({
            identifierId: idId,
            serviceKey: svcKey,
            groupKey: group.key,
            itemKey: item.key,
            itemName: item.name,
            serviceName: serviceName(svcKey),
            groupName: group.name,
            dateRange,
            existingJobId: live?.jobId,
            collectionStatus: live?.collectionStatus,
            isSelected,
            isRemoved,
          });

          // ── Additional jobs that were already submitted in prior
          //    "Edit Fulfillment Plan" runs. One row per entry so the
          //    user sees every job that exists today for this category
          //    BEFORE the pending edits land. Without this, Step 3
          //    would understate the surface area the next submit
          //    operates against.
          const existingAdditional: any[] = Array.isArray(live?.additionalJobs)
            ? live.additionalJobs
            : [];
          existingAdditional.forEach((aj: any) => {
            const ajStart = aj?.startDate
              ? new Date(aj.startDate).toISOString().slice(0, 10)
              : "";
            const ajEnd = aj?.endDate
              ? new Date(aj.endDate).toISOString().slice(0, 10)
              : "";
            rows.push({
              identifierId: idId,
              serviceKey: svcKey,
              groupKey: group.key,
              itemKey: item.key,
              itemName: item.name,
              serviceName: serviceName(svcKey),
              groupName: group.name,
              dateRange: { start: ajStart, end: ajEnd },
              existingJobId: aj?.jobId,
              collectionStatus: aj?.collectionStatus,
              isSelected: true,
              isRemoved: false,
              isExistingAdditionalJob: true,
            });
          });

          // ── Pending additional date ranges from the wizard's state.
          //    One row per range so the user sees each net-new job
          //    that the next submit will spawn (with its own date
          //    range, distinct from the primary's). No existingJobId
          //    yet — the "Current Job" column reads as a dash; the
          //    aggregator below will count this as a "Create" action.
          const pendingRanges =
            additionalDateRangesByIdentifier?.[idId]?.[
              `${svcKey}:${group.key}:${item.key}`
            ] ?? [];
          pendingRanges.forEach((r) => {
            // Skip blank rows the user added via "+" but hasn't yet
            // populated — keeps the review screen from listing empty
            // placeholders.
            if (!r?.start || !r?.end) return;
            rows.push({
              identifierId: idId,
              serviceKey: svcKey,
              groupKey: group.key,
              itemKey: item.key,
              itemName: item.name,
              serviceName: serviceName(svcKey),
              groupName: group.name,
              dateRange: { start: r.start, end: r.end },
              existingJobId: undefined,
              collectionStatus: undefined,
              isSelected: true,
              isRemoved: false,
              isPendingNewJob: true,
            });
          });
        });
      });
    });

    return rows;
  };

  return (
    <div className={styles.container}>
      {/* Sticky column-header row above the accordion — gives the per-
          identifier rows their table feel and answers "what does this
          column mean?" without relying on tooltips on every cell. */}
      <div className={styles.columnHeaderRow} role="row" aria-label="Plan Review columns">
        <div>Identifier</div>
        <div>Task ID</div>
        <div>Account</div>
        <div>Services</div>
        <div>Task Status</div>
        <div>Created By</div>
        <div>{showAuthDesiredTaskStatus ? "Authorization" : ""}</div>
        <div>Storage Location</div>
        <div>Collection Boundary</div>
        <div>Date Range</div>
      </div>

      <Accordion collapsible multiple defaultOpenItems={identifiers.map((id) => id.id)}>
        {identifiers.map((identifier) => {
          const rows = buildRows(identifier);
          const rowsByService = new Map<string, RowInput[]>();
          rows.forEach((r) => {
            const list = rowsByService.get(r.serviceKey) || [];
            list.push(r);
            rowsByService.set(r.serviceKey, list);
          });

          const serviceCount = rowsByService.size;
          const categoryCount = rows.filter((r) => r.isSelected).length;
          const dr = identifierDateRanges[identifier.id];
          const ac = accountCheckResults?.[identifier.id];
          const storage = ac?.consumer?.storageLocation || ac?.enterprise?.storageLocation;
          const collection = mapStorageLocationToCollectionBoundary(storage);
          const taskStatusKey = identifier.taskStatus || "New";
          const taskStatusCfg = TASK_STATUS_SWATCH[taskStatusKey] || TASK_STATUS_SWATCH.New;
          const authStatus = identifier.authorizationDesiredTaskStatus;

          return (
            <AccordionItem value={identifier.id} key={identifier.id}>
              <AccordionHeader>
                <div className={styles.headerRow}>
                  {/* 1. Identifier — value + type/Task-ID subtext */}
                  <div className={styles.identifierMeta}>
                    <span className={styles.identifierValue}>{identifier.value}</span>
                    <span className={styles.identifierSubtext}>{identifier.type}</span>
                  </div>
                  {/* 2. Task ID */}
                  <div className={styles.monoCell} title={identifier.taskId || ""}>
                    {identifier.taskId || "—"}
                  </div>
                  {/* 3. Account (C / E / Not Found) */}
                  <div className={styles.cell}>
                    <AccountTypeBadge acResult={ac} />
                  </div>
                  {/* 4. Services count */}
                  <div className={styles.cell}>
                    <Badge appearance="outline" size="small">
                      {serviceCount} svc
                    </Badge>
                  </div>
                  {/* 5. Task Status */}
                  <div className={styles.cell}>
                    <Badge
                      appearance="outline"
                      size="small"
                      style={{
                        color: taskStatusCfg.color,
                        backgroundColor: taskStatusCfg.bgColor,
                        borderColor: taskStatusCfg.borderColor,
                      }}
                    >
                      {taskStatusCfg.label}
                    </Badge>
                  </div>
                  {/* 6. Created By */}
                  <div className={styles.createdByCell} title={identifier.createdBy || ""}>
                    {identifier.createdBy || "—"}
                  </div>
                  {/* 7. Authorization Desired Task Status — UK COPO /
                      eEvidence only. Cell stays present (empty) for
                      other types so the grid template stays consistent
                      across all rows. */}
                  <div className={styles.cell}>
                    {showAuthDesiredTaskStatus && authStatus ? (
                      <Badge
                        appearance="filled"
                        size="small"
                        color={authDesiredTaskStatusColor(authStatus)}
                      >
                        {authStatus}
                      </Badge>
                    ) : (
                      <span style={{ color: tokens.colorNeutralForeground3 }}>—</span>
                    )}
                  </div>
                  {/* 8. Storage Location — raw Azure region */}
                  <div className={styles.cell}>
                    {storage ? (
                      <Badge appearance="outline" size="small">
                        {storage}
                      </Badge>
                    ) : (
                      <span style={{ color: tokens.colorNeutralForeground3 }}>—</span>
                    )}
                  </div>
                  {/* 9. Collection Boundary — mapped LENS boundary */}
                  <div className={styles.cell}>
                    {collection ? (
                      <Badge appearance="tint" color="brand" size="small">
                        {collection}
                      </Badge>
                    ) : (
                      <span style={{ color: tokens.colorNeutralForeground3 }}>—</span>
                    )}
                  </div>
                  {/* 10. Date Range */}
                  <div className={styles.cell}>
                    {dr?.start && dr?.end ? (
                      <Badge appearance="tint" color="brand" size="small">
                        {formatDateToMMM(dr.start)} – {formatDateToMMM(dr.end)}
                      </Badge>
                    ) : (
                      <span style={{ color: tokens.colorNeutralForeground3 }}>—</span>
                    )}
                  </div>
                </div>
              </AccordionHeader>
              <AccordionPanel>
                {/* Detail band — Consumer / Enterprise account-resolution
                    details from check-accounts. Moved here from the old
                    Account Verification card so the RS sees the storage
                    + primary ID + related identifiers in one place,
                    above the per-service plan rows. */}
                {ac && (ac.consumer || ac.enterprise) && (
                  <div className={styles.detailBand}>
                    {ac.consumer && (
                      <div className={styles.detailGroup}>
                        <span
                          className={styles.detailGroupHeader}
                          style={{ color: tokens.colorBrandForeground1 }}
                        >
                          Consumer
                        </span>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Storage:</span>
                          <span className={styles.detailValue}>
                            {ac.consumer.storageLocation || "—"}
                          </span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>ID:</span>
                          <span className={styles.detailValue}>
                            {ac.consumer.primaryId || "—"}
                          </span>
                        </div>
                      </div>
                    )}
                    {ac.enterprise && (
                      <div className={styles.detailGroup}>
                        <span
                          className={styles.detailGroupHeader}
                          style={{ color: "#ca5010" }}
                        >
                          Enterprise
                        </span>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Storage:</span>
                          <span className={styles.detailValue}>
                            {ac.enterprise.storageLocation || "—"}
                          </span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>ID:</span>
                          <span className={styles.detailValue}>
                            {ac.enterprise.primaryId || "—"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.panelInner}>
                  {/* One table per identifier, NOT one per service. Each
                      service group becomes a `<tbody>` with a leading
                      colspan row carrying the service name. A single
                      table means every service group shares the same
                      column-width calculation — so "Category" / "Date
                      Range" / "Provenance" / "Action" line up across
                      Outlook, Teams, Azure, etc. instead of each
                      sub-table sizing independently. */}
                  <table
                    className={styles.table}
                    aria-label={`Plan review for ${identifier.value}`}
                  >
                    <thead>
                      <tr>
                        <th scope="col" className={styles.th}>Category</th>
                        <th scope="col" className={styles.th}>Account</th>
                        <th scope="col" className={styles.th}>Storage Location</th>
                        <th scope="col" className={styles.th}>Collection Boundary</th>
                        <th scope="col" className={styles.th}>Date Range</th>
                        <th scope="col" className={styles.th}>Provenance</th>
                        {showJobColumn && <th scope="col" className={styles.th}>Current Job</th>}
                        <th scope="col" className={styles.th}>Action on Submit</th>
                      </tr>
                    </thead>
                    {Array.from(rowsByService.entries()).map(([svcKey, svcRows]) => (
                      <tbody key={svcKey}>
                        <tr className={styles.groupHeaderRow}>
                          <th
                            scope="colgroup"
                            colSpan={showJobColumn ? 8 : 7}
                            className={styles.groupHeaderCell}
                          >
                            {serviceName(svcKey)}
                          </th>
                        </tr>
                        {svcRows.map((r) => {
                          const baselineDate = getBaselineDate(leBaseline[r.identifierId], r.serviceKey, r.groupKey, r.itemKey);
                          const provenance = resolveProvenance({
                            baseline: leBaseline[r.identifierId],
                            serviceKey: r.serviceKey,
                            groupKey: r.groupKey,
                            itemKey: r.itemKey,
                            isCurrentlySelected: r.isSelected,
                            isRemoved: r.isRemoved,
                            currentDate: r.dateRange,
                            baselineDate,
                            bulkTouched: bulkTouched || new Set<string>(),
                            identifierId: r.identifierId,
                          });
                          const action = resolveRowAction({
                            provenance,
                            existingJobId: r.existingJobId,
                            collectionStatus: r.collectionStatus,
                          });
                          // Notify parent for aggregate totals
                          onRowAction?.(action);

                          const removedCls = r.isRemoved ? styles.tdRemoved : "";
                          return (
                            <tr key={`${r.groupKey}:${r.itemKey}`}>
                              <td className={[styles.td, removedCls].join(" ")}>
                                <div style={{ color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase100 }}>
                                  {r.groupName}
                                </div>
                                <div>{r.itemName}</div>
                              </td>
                              <td className={styles.td}>
                                {/* Per-row account-type badge. Same
                                    badge on every row of a given
                                    identifier (account type is a per-
                                    identifier property) so the table
                                    reads as "all these rows belong to
                                    identifier X which is a Consumer /
                                    Enterprise / Not Found account". */}
                                <AccountTypeBadge acResult={accountCheckResults?.[r.identifierId]} />
                              </td>
                              <td className={styles.td}>
                                {/* Storage Location — where the
                                    account actually lives on Azure
                                    (per the check-accounts result).
                                    Populated when check-accounts has
                                    run for this identifier. */}
                                {(() => {
                                  const region =
                                    dataCenterLocations?.[r.identifierId]?.[r.serviceKey];
                                  if (region) {
                                    return (
                                      <Badge appearance="outline" size="small">
                                        {region}
                                      </Badge>
                                    );
                                  }
                                  return (
                                    <span style={{ color: tokens.colorNeutralForeground3 }}>
                                      —
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className={styles.td}>
                                {/* Collection Boundary — the LENS
                                    boundary the Collection step will
                                    route this job into, mapped from
                                    the Storage Location to one of the
                                    10 LENS Content Boundaries. Renders
                                    a placeholder when the storage
                                    location is missing OR when no LENS
                                    boundary covers it. */}
                                {(() => {
                                  const region =
                                    dataCenterLocations?.[r.identifierId]?.[r.serviceKey];
                                  const boundary =
                                    mapStorageLocationToCollectionBoundary(region);
                                  if (boundary) {
                                    return (
                                      <Badge
                                        appearance="tint"
                                        color="brand"
                                        size="small"
                                      >
                                        {boundary}
                                      </Badge>
                                    );
                                  }
                                  return (
                                    <span style={{ color: tokens.colorNeutralForeground3 }}>
                                      —
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className={styles.td}>
                                <div>
                                  {r.dateRange.start && r.dateRange.end
                                    ? `${formatDateToMMM(r.dateRange.start)} – ${formatDateToMMM(r.dateRange.end)}`
                                    : <span style={{ color: tokens.colorNeutralForeground3 }}>—</span>}
                                </div>
                                {baselineDate && baselineDate.start && baselineDate.end && (
                                  <div style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 }}>
                                    LE requested: {formatDateToMMM(baselineDate.start)} – {formatDateToMMM(baselineDate.end)}
                                  </div>
                                )}
                              </td>
                              <td className={styles.td}>
                                <ProvenanceTag provenance={provenance} />
                              </td>
                              {showJobColumn && (
                                <td className={styles.td}>
                                  <JobStatusBadge jobId={r.existingJobId} status={r.collectionStatus} />
                                </td>
                              )}
                              <td className={styles.td}>
                                <ActionBadge action={action} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    ))}
                  </table>
                </div>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
