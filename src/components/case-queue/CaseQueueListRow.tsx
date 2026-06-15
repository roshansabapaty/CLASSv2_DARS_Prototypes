/**
 * CaseQueueListRow — single tabular row in the Detailed-list and
 * Preview-pane modes of the Case List page.
 *
 * Visual chrome: a 4 px priority-colored left rail. Then the seven
 * content columns the spec requires (Case ID · Priority · Due Date ·
 * Country · Identifiers · Services · Stage) when `density="full"`, or
 * a tighter four-column subset (Case ID · Priority · Due Date · Stage)
 * when `density="dense"` — the dense variant is what the Preview-pane
 * mode uses so the right pane has more room.
 *
 * Markup: `<div role="row">` inside a parent `<div role="table">`;
 * columns use `role="gridcell"`. The whole row is keyboard-activatable
 * (Enter / Space) — same pattern landed in Track 1 of the a11y plan.
 * Hidden columns surface via an accessible tooltip so the data isn't
 * lost on narrow viewports.
 *
 * Selection: when `bulkSelectable` is true a leading checkbox column
 * appears so multiple rows can be batched for Pick / Release / Assign.
 * The checkbox click is stop-propagated so it doesn't also open the
 * case. The whole row is `aria-selected={selected}`.
 */

import * as React from "react";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  Users,
  Cloud,
  Mail,
  MessageSquare,
  HardDrive,
  Scale,
  MailWarning,
  Gavel,
  Shield,
  Building2,
  BellRing,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { CopyableText } from "../CopyButton";
import { TruncatedText } from "../ui/truncated-text";
import { SlaDeadlineChip } from "../sla/SlaDeadlineChip";
import { isCaseSlaPausedById } from "../../utils/slaTimer";
import { getCaseFormDataById } from "../../utils/caseDataRegistry";
import { useCorrespondenceNotifications } from "../../hooks/useCorrespondenceNotifications";
import {
  escalationBadgeLabelForCase,
  getEscalationSummaryForCase,
  gfrQueueChipForCase,
} from "../../utils/escalationHelpers";
import { cn } from "../ui/utils";
import {
  type CaseQueueItem,
  type PriorityConfig,
  SERVICE_ICONS,
} from "./case-queue-types";
import {
  CASE_LIST_COLUMNS,
  getDenseGridTemplate,
  type ColumnDef,
  type ColumnWidths,
  buildGridTemplate,
} from "./caseListColumns";
import { getSlaConfig } from "../../constants/slaConstants";

/** What columns to render. `full` = the spec's seven; `dense` = the
 *  four that fit alongside the Preview pane. */
export type ListRowDensity = "full" | "dense";

interface CaseQueueListRowProps {
  caseItem: CaseQueueItem;
  priorityConfig: PriorityConfig;
  density?: ListRowDensity;
  /** Row click opens the case page. */
  onOpen: (caseId: string) => void;
  /** Row click in Preview-pane mode selects the row without opening. */
  onSelect?: (caseId: string) => void;
  /** When true, the row is highlighted as the active preview selection. */
  selected?: boolean;
  /** Bulk-selection wiring. When `bulkSelectable` is true a leading
   *  checkbox renders and toggles via `onBulkToggle`. */
  bulkSelectable?: boolean;
  bulkSelected?: boolean;
  onBulkToggle?: (caseId: string) => void;
  /** When provided, viewport is narrow enough to drop the wider
   *  columns. The aria-rowindex on the row is set by the parent table
   *  so screen readers can announce position. */
  ariaRowIndex?: number;
  /** Detailed-list (`full` density) only: per-column pixel widths.
   *  When provided, the row uses an inline grid template that matches
   *  the header — keeping rows and column-resizer handles aligned. */
  columnWidths?: ColumnWidths;
  /** Column definitions to render. Defaults to `CASE_LIST_COLUMNS` (the
   *  main Case Queue's 8-column layout). Attorney Dashboard passes
   *  `ATTORNEY_DASHBOARD_COLUMNS` to surface Case Assignee + Escalation
   *  Reviewer at the end. MUST match the `columns` prop on the paired
   *  `<CaseQueueListHeader>`. */
  columns?: ColumnDef[];
}

const SERVICE_FALLBACK_ICON = Cloud;

/** A static fallback so unknown services still render an icon. */
const SERVICE_ICON_FALLBACK: Record<string, typeof Mail> = {
  Email: Mail,
  Outlook: Mail,
  Teams: MessageSquare,
  "Microsoft Account Profile": Users,
  OneDrive: HardDrive,
  "OneDrive/SharePoint": HardDrive,
};

function resolveServiceIcon(service: string) {
  return (
    SERVICE_ICONS[service] ?? SERVICE_ICON_FALLBACK[service] ?? SERVICE_FALLBACK_ICON
  );
}

export function CaseQueueListRow({
  caseItem,
  priorityConfig,
  density = "full",
  onOpen,
  onSelect,
  selected = false,
  bulkSelectable = false,
  bulkSelected = false,
  onBulkToggle,
  ariaRowIndex,
  columnWidths,
  columns = CASE_LIST_COLUMNS,
}: CaseQueueListRowProps) {
  const isDense = density === "dense";
  // Unread inbound count — drives the small Mail pill next to the case
  // ID. Same hook the Cards view consumes so both list modes stay in
  // sync without separate plumbing.
  const { perCase } = useCorrespondenceNotifications();
  const corrCounts = perCase.get(caseItem.caseId);
  const unread = corrCounts?.unread ?? 0;
  const heldForAttorney = corrCounts?.heldForAttorney ?? 0;
  const inboundAwaitingAttorney = corrCounts?.inboundAwaitingAttorney ?? 0;
  const attorneyReviewTotal = heldForAttorney + inboundAwaitingAttorney;
  // Gap 1 + Gap 3 — escalation context + attorney-review correspondence
  // chip. Same derivation as the Card view, kept inline with Case ID
  // so the workflow-stage column stays clean.
  const escalationLabel = escalationBadgeLabelForCase(caseItem.caseId);
  const escalationSummary = getEscalationSummaryForCase(caseItem.caseId);
  // GFR chip — derived from the case's EEvidenceGroundsForRefusal block.
  // Renders BEFORE the attorney escalation chip so the highest-stakes
  // signal reads first. Self-suppresses for non-applicable workflows
  // and for `None` Form1Review decisions.
  const gfrChip = gfrQueueChipForCase(caseItem.caseId);
  // Preview-pane single-click selects; full-list click opens.
  const handleActivate = () => {
    if (onSelect) onSelect(caseItem.caseId);
    else onOpen(caseItem.caseId);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    } else if (e.key === "o" || e.key === "O") {
      // Convention from the plan: "O" opens the case from the dense
      // (preview) list, regardless of whether the row is in select mode.
      e.preventDefault();
      onOpen(caseItem.caseId);
    }
  };

  // Sort services so Azure leads (matches the operational-badges
  // convention) — denser rows aren't long enough to show every service;
  // they overflow into a "+N more" chip.
  const sortedServices = [...caseItem.servicesRequested].sort((a, b) => {
    if (a === "Azure") return -1;
    if (b === "Azure") return 1;
    return 0;
  });
  const visibleServiceCount = isDense ? 0 : 3;
  const visibleServices = sortedServices.slice(0, visibleServiceCount);
  const overflowCount = sortedServices.length - visibleServices.length;

  // Identifier-types tooltip body.
  const identifierBreakdown = Object.entries(caseItem.identifierTypes)
    .map(([t, c]) => `${c} ${t}`)
    .join(", ");

  // Grid columns adjust based on density + resize state. The fallback
  // Tailwind templates still apply when no caller-supplied columnWidths
  // map is in scope. Internal Escalation now sits between Case Assignee
  // and Escalation Reviewer so the role chip and reviewer name read as
  // one phrase.
  // Tracks (excluding optional leading checkbox):
  //   case-id | unread | threat | enterprise | gfr | attorney-review | ndo
  //     | priority | due | country | identifiers | services | stage
  //     | assigned-to | internal-esc | escalated-to
  const fullGridCols = bulkSelectable
    ? "grid-cols-[auto_1.1fr_0.6fr_0.8fr_0.8fr_0.9fr_1fr_0.9fr_auto_1fr_0.9fr_auto_1.3fr_0.9fr_1fr_1.1fr_1.3fr]"
    : "grid-cols-[1.1fr_0.6fr_0.8fr_0.8fr_0.9fr_1fr_0.9fr_auto_1fr_0.9fr_auto_1.3fr_0.9fr_1fr_1.1fr_1.3fr]";
  // Dense template — single source of truth lives in
  // `caseListColumns.ts` (see the `DENSE_TRACKS` contract comment
  // there). Applied as an inline `gridTemplateColumns` style (NOT a
  // Tailwind class) so the header and row CAN'T drift apart and the
  // template actually reaches the DOM.
  const denseGridTemplate = getDenseGridTemplate(bulkSelectable);

  // When the caller supplies `columnWidths` (Detailed-list mode in the
  // queue), switch to an inline grid template that matches the
  // CaseQueueListHeader's. The template interleaves 4 px "resizer
  // slots" between content cells, so the row inserts empty spacer
  // divs at those positions to stay aligned.
  const useInlineGrid = !isDense && Boolean(columnWidths);
  const inlineGridTemplate = useInlineGrid
    ? buildGridTemplate(columnWidths!, bulkSelectable, true, columns)
    : undefined;
  const showCaseAssigneeColumn = columns.some((c) => c.id === "case-assignee");
  const showEscalationReviewerColumn = columns.some(
    (c) => c.id === "escalation-reviewer",
  );
  // Empty spacer cell — occupies a 4 px resizer column in the inline
  // grid so headers and rows align.
  const Spacer = () => (
    <span aria-hidden="true" className="h-full" />
  );

  // When using the inline grid (Detailed-list mode), each cell carries
  // its own padding so the row's grid-template-columns are honored to
  // the pixel — outer container padding would shrink the available
  // width and de-align rows from the header.
  const cellPadding = useInlineGrid ? "px-3 py-2" : "";

  // Priority-rail background. The legacy mode renders the rail as a
  // `border-l-4` (via priorityConfig.color which is a `border-l-…`
  // class). For the inline-grid mode the rail is a real grid column,
  // so we need an actual `bg-` colour.
  const railBg =
    caseItem.casePriority === "Emergency"
      ? "bg-red-500"
      : caseItem.casePriority === "Urgent"
        ? "bg-orange-500"
        : "bg-blue-500";

  // ── Per-column cell registry ─────────────────────────────────────
  // Every content column renders one entry here keyed by its ColumnId.
  // The return block below iterates `columns` in user-customised order
  // and pulls each entry from this record, interleaving 4 px Spacer
  // cells where the inline-grid template needs them. Conditional cells
  // (dense-only / opt-in via `showCaseAssigneeColumn`) emit `null` so
  // the iterator can skip them without disturbing the column sequence.
  const cellByColumn: Partial<Record<string, React.ReactNode>> = {
    "case-id": (
      // Case ID gets a 15% font-size bump (14px → 16px). Inline style
      // because the app's root font-size is set to 14px in globals.css,
      // which anchors Tailwind's rem-based `text-*` scale (text-sm and
      // text-base both end up resolving to 14px here).
      //
      // `min-w-0` on the gridcell AND on CopyableText is required so
      // the flex truncation chain isn't blocked by the intermediate
      // <button> CopyableText renders (it's `inline-flex` by default,
      // which has its own intrinsic content size). Without min-w-0 on
      // the button, the parent grid cell couldn't shrink the Case ID
      // text below ~120px and the value visually bled into the next
      // column when the preview pane was stretched wide.
      //
      // copyLabel is set to the full case ID so CopyableText's
      // built-in Radix tooltip surfaces the complete value on hover
      // — including when the column is narrow enough to truncate the
      // visible text with an ellipsis. Previously the cell nested a
      // <TruncatedText> tooltip inside the CopyableText tooltip; the
      // outer one always won so users never saw the full ID when
      // clipped. After the user copies, the tooltip flips to "Copied
      // — <caseId>" for confirmation.
      <div role="gridcell" className={cn("min-w-0 flex items-center gap-1.5", cellPadding)}>
        <CopyableText
          text={caseItem.caseId}
          copyLabel={caseItem.caseId}
          className="min-w-0 max-w-full"
        >
          <span
            className="font-mono text-slate-900 truncate min-w-0 block"
            style={{ fontSize: "16px", fontWeight: 600 }}
          >
            {caseItem.caseId}
          </span>
        </CopyableText>
      </div>
    ),

    "unread": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {unread > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-[10px] h-5 px-1.5 cursor-help inline-flex items-center"
                style={{ fontWeight: 600 }}
                aria-label={`${unread} unread inbound message${unread === 1 ? "" : "s"}`}
              >
                <Mail className="w-3 h-3 mr-0.5" aria-hidden="true" />
                {unread}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-semibold">
                {unread} unread inbound message{unread === 1 ? "" : "s"} from the issuing or enforcing authority
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "threat-to-life": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {caseItem.isThreatToLife ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-300 text-[10px] h-5 px-1.5 cursor-help inline-flex items-center"
                style={{ fontWeight: 600 }}
                aria-label="Threat to life"
              >
                <Shield className="w-3 h-3 mr-0.5" aria-hidden="true" />
                Threat
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-semibold">Threat to life — high-priority crime</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "enterprise": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {caseItem.accountExistenceChecked && caseItem.hasEnterpriseAccounts ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-300 text-[10px] h-5 px-1.5 cursor-help inline-flex items-center"
                style={{ fontWeight: 600 }}
                aria-label="Enterprise account"
              >
                <Building2 className="w-3 h-3 mr-0.5" aria-hidden="true" />
                Enterprise
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-semibold">Enterprise account resolved via Check Accounts</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "gfr-hold": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {gfrChip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-5 px-1.5 cursor-help inline-flex items-center max-w-full truncate",
                  gfrChip.tier === "alertRed"
                    ? "bg-[#fde7e9] text-[#a4262c] border-[#a4262c]/40"
                    : gfrChip.tier === "warnAmber"
                      ? "bg-[#fff4e6] text-[#7a3a00] border-[#ca5010]/40"
                      : gfrChip.tier === "successGreen"
                        ? "bg-[#dff6dd] text-[#0b6a0b] border-[#107c10]/40"
                        : "bg-[#f3f0fa] text-[#5c2d91] border-[#8764b8]/40",
                )}
                style={{ fontWeight: 600 }}
                aria-label={gfrChip.label}
              >
                <Gavel className="w-3 h-3 mr-0.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{gfrChip.label}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-0.5">
                <p className="font-semibold">{gfrChip.label}</p>
                <p>EU eEvidence — Grounds for Refusal (ETSI 5.5)</p>
                <p>Open the case for the EA's reasons + next steps.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "attorney-review": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {attorneyReviewTotal > 0 && escalationLabel ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="bg-[#fff4ce] text-[#7a4f00] border-[#a26a00]/40 text-[10px] h-5 px-1.5 cursor-help inline-flex items-center max-w-full truncate"
                style={{ fontWeight: 600 }}
                aria-label={`${attorneyReviewTotal} correspondence item${attorneyReviewTotal === 1 ? "" : "s"} awaiting attorney review`}
              >
                <MailWarning className="w-3 h-3 mr-0.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{attorneyReviewTotal} for review</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-0.5">
                <p className="font-semibold">Correspondence awaiting attorney review</p>
                {heldForAttorney > 0 && (
                  <p>
                    {heldForAttorney} outbound message{heldForAttorney === 1 ? "" : "s"} held in Draft
                  </p>
                )}
                {inboundAwaitingAttorney > 0 && (
                  <p>
                    {inboundAwaitingAttorney} inbound item{inboundAwaitingAttorney === 1 ? "" : "s"} unread on the active escalation
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "ndo-reminder": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {caseItem.nextNdoReminderAt ? (() => {
          const dt = new Date(caseItem.nextNdoReminderAt);
          const fmt = Number.isFinite(dt.getTime())
            ? dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : caseItem.nextNdoReminderAt;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="bg-[#fff4ce] text-[#7a4f00] border-[#a26a00]/40 text-[10px] h-5 px-1.5 cursor-help inline-flex items-center"
                  style={{ fontWeight: 600 }}
                  aria-label={`NDO reminder ${fmt}`}
                >
                  <BellRing className="w-3 h-3 mr-0.5" aria-hidden="true" />
                  {fmt}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-semibold">
                  Temporary NDO re-check reminder
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })() : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "priority": (
      <div
        role="gridcell"
        className={cn(
          useInlineGrid ? "flex flex-col justify-center gap-0.5" : "flex items-center",
          cellPadding,
        )}
      >
        {(() => {
          const sla = getSlaConfig(caseItem.casePriority);
          const priorityTextColor =
            caseItem.casePriority === "Emergency"
              ? "text-red-700"
              : caseItem.casePriority === "Urgent"
                ? "text-orange-700"
                : "text-blue-700";
          return (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold",
                  priorityTextColor,
                )}
                aria-label={`${sla.label} priority — ${sla.description}`}
              >
                {priorityConfig.icon && (
                  <priorityConfig.icon className="w-3 h-3" aria-hidden="true" />
                )}
                {sla.label}
              </span>
              {useInlineGrid && (
                <span className="text-[10px] text-[#605e5c] leading-tight">
                  {sla.pLevel} · {sla.durationLabel}
                </span>
              )}
            </>
          );
        })()}
      </div>
    ),

    "due-date": (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        <SlaDeadlineChip
          tier={caseItem.casePriority}
          dueDate={caseItem.dueDate}
          dateReceived={caseItem.createDate}
          paused={isCaseSlaPausedById(caseItem.caseId)}
          variant="plain"
        />
      </div>
    ),

    "country": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 text-xs text-[#605e5c] flex items-center", cellPadding)}>
        <TruncatedText
          className="truncate min-w-0"
          tooltipText={
            caseItem.jurisdiction
              ? `${caseItem.country} · ${caseItem.jurisdiction}`
              : caseItem.country
          }
        >
          <span className="text-[#323130] font-medium">{caseItem.country}</span>
          {caseItem.jurisdiction && (
            <>
              <span className="text-slate-300 mx-1">·</span>
              <span>{caseItem.jurisdiction}</span>
            </>
          )}
        </TruncatedText>
      </div>
    ),

    "identifiers": isDense ? null : (
      <div role="gridcell" className={cn("flex items-center", cellPadding)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs cursor-help"
                style={{ fontWeight: 500 }}
                aria-label={`${caseItem.identifierCount} identifier${caseItem.identifierCount === 1 ? "" : "s"}: ${identifierBreakdown || "no breakdown"}`}
              >
                <Users className="w-3 h-3 mr-1" aria-hidden="true" />
                {caseItem.identifierCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div style={{ fontWeight: 600 }}>
                  {caseItem.identifierCount} target identifier
                  {caseItem.identifierCount === 1 ? "" : "s"}
                </div>
                {identifierBreakdown && (
                  <div className="text-slate-300 mt-0.5">
                    {identifierBreakdown}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    ),

    "services": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center gap-1 flex-wrap", cellPadding)}>
        {visibleServices.map((service) => {
          const Icon = resolveServiceIcon(service);
          const isAzure = service === "Azure";
          return (
            <Badge
              key={service}
              variant="outline"
              className={cn(
                "text-[10px] py-0 px-1.5",
                isAzure
                  ? "bg-sky-50 text-sky-700 border-sky-300"
                  : "bg-slate-50 text-slate-600 border-slate-200",
              )}
              style={{ fontWeight: isAzure ? 600 : 400 }}
            >
              <Icon className="w-3 h-3 mr-0.5" aria-hidden="true" />
              {service}
            </Badge>
          );
        })}
        {overflowCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 bg-slate-50 text-slate-600 border-slate-200 cursor-help"
                  aria-label={`${overflowCount} more services: ${sortedServices.slice(visibleServiceCount).join(", ")}`}
                >
                  +{overflowCount} more
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div style={{ fontWeight: 600 }}>Additional services</div>
                  <div className="text-slate-300 mt-0.5">
                    {sortedServices.slice(visibleServiceCount).join(", ")}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    ),

    "stage": (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        <TruncatedText
          className="text-xs text-[#323130] truncate max-w-full"
          aria-label={`Stage: ${caseItem.caseStage}`}
          tooltipText={caseItem.caseStage}
        >
          {caseItem.caseStage}
        </TruncatedText>
      </div>
    ),

    "case-assignee": !showCaseAssigneeColumn ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        <TruncatedText
          className={cn(
            "text-xs truncate max-w-full",
            caseItem.assigneeName ? "text-[#323130]" : "text-[#a19f9d] italic",
          )}
          aria-label={`Assigned to: ${caseItem.assigneeName || "Unassigned"}`}
          tooltipText={`Assigned to ${caseItem.assigneeName || "Unassigned"}`}
        >
          {caseItem.assigneeName || "Unassigned"}
        </TruncatedText>
      </div>
    ),

    "internal-escalation": (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {escalationLabel ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-5 px-1.5 cursor-help inline-flex items-center max-w-full truncate",
                  escalationSummary?.status === "Pending" ||
                    escalationSummary?.status === "Blocked"
                    ? "bg-[#fde7e9] text-[#a4262c] border-[#a4262c]/40"
                    : escalationSummary?.status === "InformationRequested"
                      ? "bg-[#fff4ce] text-[#7a4f00] border-[#a26a00]/40"
                      : "bg-[#f3f0fa] text-[#5c2d91] border-[#8764b8]/40",
                )}
                style={{ fontWeight: 600 }}
                aria-label={escalationLabel}
              >
                <Scale className="w-3 h-3 mr-0.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{escalationLabel}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-0.5">
                <p className="font-semibold">{escalationLabel}</p>
                {escalationSummary && (
                  <>
                    <p>Status: {escalationSummary.status}</p>
                    <p>Assignee: {escalationSummary.assigneeLabel}</p>
                    <p>Escalated by {escalationSummary.escalatedBy}</p>
                  </>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "escalation-reviewer": !showEscalationReviewerColumn ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {(() => {
          if (!escalationSummary) {
            return (
              <span className="text-[11px] text-[#a19f9d]">—</span>
            );
          }
          const isUnassigned =
            escalationSummary.assigneeLabel.startsWith("Any ");
          const reviewerName = isUnassigned
            ? "Unassigned"
            : escalationSummary.assigneeLabel;
          return (
            <TruncatedText
              className={cn(
                "text-xs truncate max-w-full",
                isUnassigned
                  ? "text-[#a19f9d] italic"
                  : "text-[#323130]",
              )}
              aria-label={`Escalated to: ${reviewerName}`}
              tooltipText={`Escalated to ${reviewerName}`}
            >
              {reviewerName}
            </TruncatedText>
          );
        })()}
      </div>
    ),

    // ── Filter-driven synthesised columns (hidden by default) ─────────
    // Each cell reads from the same source as the matching FilterDef's
    // predicate so a user sees the value being filtered on. Em-dash
    // ("—") for cases with no value — same convention as the other
    // signal columns.
    "crime": isDense ? null : (() => {
      const list = caseItem.natureOfCrime ?? [];
      const label = list.join(", ");
      return (
        <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
          {label ? (
            <TruncatedText
              className="text-xs text-[#323130] truncate max-w-full"
              aria-label={`Nature of crime: ${label}`}
              tooltipText={label}
            >
              {label}
            </TruncatedText>
          ) : (
            <span className="text-[11px] text-[#a19f9d]">—</span>
          )}
        </div>
      );
    })(),

    "request-type": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {caseItem.requestType ? (
          <TruncatedText
            className="text-xs text-[#323130] truncate max-w-full"
            aria-label={`Request type: ${caseItem.requestType}`}
            tooltipText={caseItem.requestType}
          >
            {caseItem.requestType}
          </TruncatedText>
        ) : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "request-sub-type": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {caseItem.requestSubType ? (
          <TruncatedText
            className="text-xs text-[#323130] truncate max-w-full"
            aria-label={`Request sub-type: ${caseItem.requestSubType}`}
            tooltipText={caseItem.requestSubType}
          >
            {caseItem.requestSubType}
          </TruncatedText>
        ) : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "request-origin": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {caseItem.requestOrigin ? (
          <TruncatedText
            className="text-xs text-[#323130] truncate max-w-full"
            aria-label={`Request origin: ${caseItem.requestOrigin}`}
            tooltipText={caseItem.requestOrigin}
          >
            {caseItem.requestOrigin}
          </TruncatedText>
        ) : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "tenant": isDense ? null : (() => {
      const fd = getCaseFormDataById(caseItem.caseId);
      const ec = fd?.enterpriseContext;
      let tenant = "";
      if (ec?.orgs?.length) {
        tenant = ec.orgs.find((o) => o.tenantDisplayName)?.tenantDisplayName ?? "";
      } else if (ec?.org?.tenantDisplayName) {
        tenant = ec.org.tenantDisplayName;
      }
      const extraCount = ec?.orgs?.length ? Math.max(0, ec.orgs.length - 1) : 0;
      const label = extraCount > 0 ? `${tenant} +${extraCount}` : tenant;
      return (
        <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
          {tenant ? (
            <TruncatedText
              className="text-xs text-[#323130] truncate max-w-full"
              aria-label={`Tenant: ${label}`}
              tooltipText={label}
            >
              {label}
            </TruncatedText>
          ) : (
            <span className="text-[11px] text-[#a19f9d]">—</span>
          )}
        </div>
      );
    })(),

    "agency": isDense ? null : (() => {
      const fd = getCaseFormDataById(caseItem.caseId);
      const agency =
        fd?.legalContext?.primaryIssuingAuthority?.name ?? fd?.agency ?? "";
      return (
        <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
          {agency ? (
            <TruncatedText
              className="text-xs text-[#323130] truncate max-w-full"
              aria-label={`Issuing authority: ${agency}`}
              tooltipText={agency}
            >
              {agency}
            </TruncatedText>
          ) : (
            <span className="text-[11px] text-[#a19f9d]">—</span>
          )}
        </div>
      );
    })(),

    "stale-escalation": isDense ? null : (() => {
      const esc = getCaseFormDataById(caseItem.caseId)?.attorneyEscalation;
      if (!esc) {
        return (
          <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
            <span className="text-[11px] text-[#a19f9d]">—</span>
          </div>
        );
      }
      const isTerminal =
        esc.status === "ApprovedForDelivery" ||
        esc.status === "ApprovedWithConditions";
      if (isTerminal) {
        return (
          <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
            <span className="text-[11px] text-[#a19f9d]">—</span>
          </div>
        );
      }
      let lastActivity = new Date(esc.escalatedAt).getTime();
      for (const a of esc.actions ?? []) {
        const t = new Date(a.performedAt).getTime();
        if (Number.isFinite(t) && t > lastActivity) lastActivity = t;
      }
      const days = Math.max(
        0,
        Math.floor((Date.now() - lastActivity) / (24 * 60 * 60 * 1000)),
      );
      // Visual urgency: > 7 days = red, > 3 = amber, ≤ 3 = neutral.
      // Matches the "stale" thresholds the LENS Lead persona uses.
      const tone =
        days > 7
          ? "text-[#a4262c]"
          : days > 3
            ? "text-[#7a4f00]"
            : "text-[#323130]";
      return (
        <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
          <span
            className={cn("text-xs", tone)}
            style={{ fontWeight: days > 7 ? 600 : 400 }}
            aria-label={`Escalation age: ${days} day${days === 1 ? "" : "s"}`}
          >
            {days}d
          </span>
        </div>
      );
    })(),

    "recommend-rejection": isDense ? null : (
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        {caseItem.caseStage === "Recommend Rejection" ? (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 bg-[#fff4ce] text-[#7a4f00] border-[#a26a00]/40"
            style={{ fontWeight: 600 }}
            aria-label="Recommend rejection candidate"
          >
            Recommended
          </Badge>
        ) : (
          <span className="text-[11px] text-[#a19f9d]">—</span>
        )}
      </div>
    ),

    "agency-name": isDense ? null : (() => {
      const fd = getCaseFormDataById(caseItem.caseId);
      const names = new Set<string>();
      for (const ar of fd?.legalContext?.agencies ?? []) {
        if (ar.agency?.name) names.add(ar.agency.name);
      }
      if (names.size === 0 && fd?.agency) names.add(fd.agency);
      const sorted = Array.from(names).sort();
      const label = sorted.join(", ");
      return (
        <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
          {label ? (
            <TruncatedText
              className="text-xs text-[#323130] truncate max-w-full"
              aria-label={`Agencies: ${label}`}
              tooltipText={label}
            >
              {label}
            </TruncatedText>
          ) : (
            <span className="text-[11px] text-[#a19f9d]">—</span>
          )}
        </div>
      );
    })(),

    "validating-authority": isDense ? null : (() => {
      const fd = getCaseFormDataById(caseItem.caseId);
      let name = fd?.legalContext?.primaryValidatingAuthority?.name ?? "";
      if (!name) {
        for (const ar of fd?.legalContext?.agencies ?? []) {
          if (ar.role === "ValidatingAuthority" && ar.agency?.name) {
            name = ar.agency.name;
            break;
          }
        }
      }
      return (
        <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
          {name ? (
            <TruncatedText
              className="text-xs text-[#323130] truncate max-w-full"
              aria-label={`Validating Authority: ${name}`}
              tooltipText={name}
            >
              {name}
            </TruncatedText>
          ) : (
            <span className="text-[11px] text-[#a19f9d]">—</span>
          )}
        </div>
      );
    })(),

    "competent-authority": isDense ? null : (() => {
      const fd = getCaseFormDataById(caseItem.caseId);
      let name = fd?.legalContext?.primaryCompetentAuthority?.name ?? "";
      if (!name) {
        for (const ar of fd?.legalContext?.agencies ?? []) {
          if (ar.role === "CompetentAuthority" && ar.agency?.name) {
            name = ar.agency.name;
            break;
          }
        }
      }
      return (
        <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
          {name ? (
            <TruncatedText
              className="text-xs text-[#323130] truncate max-w-full"
              aria-label={`Competent Authority: ${name}`}
              tooltipText={name}
            >
              {name}
            </TruncatedText>
          ) : (
            <span className="text-[11px] text-[#a19f9d]">—</span>
          )}
        </div>
      );
    })(),

    "identifier-types": isDense ? null : (() => {
      // Render each distinct type as a small chip, with count when > 1.
      // Matches the visual treatment of the Services column so the two
      // multi-value columns scan consistently.
      const types = caseItem.identifierTypes ?? {};
      const keys = Object.keys(types).sort();
      if (keys.length === 0) {
        return (
          <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
            <span className="text-[11px] text-[#a19f9d]">—</span>
          </div>
        );
      }
      const fullLabel = keys
        .map((k) => (types[k] > 1 ? `${k} (${types[k]})` : k))
        .join(", ");
      return (
        <div role="gridcell" className={cn("min-w-0 flex items-center gap-1 flex-wrap", cellPadding)}>
          {keys.map((k) => (
            <Badge
              key={k}
              variant="outline"
              className="text-[10px] py-0 px-1.5 bg-slate-50 text-slate-600 border-slate-200"
              aria-label={`Identifier type: ${k}${types[k] > 1 ? ` (${types[k]})` : ""}`}
              title={fullLabel}
            >
              {k}
              {types[k] > 1 && (
                <span className="ml-0.5 text-slate-400">·{types[k]}</span>
              )}
            </Badge>
          ))}
        </div>
      );
    })(),
  };

  // Iterate the parent-supplied columns in user-customised order, drop
  // null entries (skipped columns), and interleave 4 px Spacer cells
  // between consecutive rendered entries when the inline grid is active.
  const contentCells: React.ReactNode[] = [];
  for (const col of columns) {
    const cell = cellByColumn[col.id];
    if (cell == null) continue;
    if (contentCells.length > 0 && useInlineGrid) {
      contentCells.push(<Spacer key={`spacer-${col.id}`} />);
    }
    contentCells.push(
      <React.Fragment key={`cell-${col.id}`}>{cell}</React.Fragment>,
    );
  }

  return (
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      aria-selected={onSelect ? selected : undefined}
      aria-label={`Case ${caseItem.caseId}, ${priorityConfig.label} priority, due ${caseItem.dueDate}`}
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      style={
        inlineGridTemplate
          ? { gridTemplateColumns: inlineGridTemplate }
          : isDense
            ? { gridTemplateColumns: denseGridTemplate }
            : undefined
      }
      className={cn(
        "grid bg-white border-b border-[#edebe9] cursor-pointer transition-colors",
        // Inline-grid mode owns its own padding + rail (per-cell)
        // so the grid template stays pixel-identical with the header.
        // The fallback (dense / legacy) mode keeps its old chrome:
        // container padding, gap, and a border-left rail.
        useInlineGrid
          ? "items-stretch"
          : "items-center px-3 py-2 border-l-4 gap-3",
        !useInlineGrid && priorityConfig.color,
        "hover:bg-[#faf9f8]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-[-2px] focus-visible:z-10",
        selected &&
          (useInlineGrid
            ? "bg-[#deecf9] hover:bg-[#deecf9]"
            : "bg-[#deecf9] hover:bg-[#deecf9] border-l-[6px]"),
        caseItem.caseStage === "Resolved" && "opacity-60",
        // Dense uses the inline `gridTemplateColumns` style above; only
        // the non-inline full fallback still relies on a Tailwind class.
        !useInlineGrid && !isDense && fullGridCols,
      )}
    >
      {/* Priority rail — first grid column when using the inline grid.
          Painted with the priority-tier background colour so it reads
          as a coloured stripe down the row, aligned with the header's
          (empty) rail column. */}
      {useInlineGrid && (
        <span aria-hidden="true" className={cn("h-full", railBg)} />
      )}

      {/* Checkbox (multi-select) */}
      {bulkSelectable && (
        <div role="gridcell" className={cn("flex items-center justify-center", cellPadding)}>
          <Checkbox
            checked={bulkSelected}
            onCheckedChange={() => onBulkToggle?.(caseItem.caseId)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={`Select case ${caseItem.caseId} for bulk actions`}
          />
        </div>
      )}

      {/* Content cells — rendered in the user-customised column order via
          the `cellByColumn` registry above. Each entry is either a
          gridcell <div> or null (for cells gated by density / opt-in
          props like showCaseAssigneeColumn). The iterator skips null
          entries and interleaves 4 px Spacer cells between consecutive
          rendered entries when the inline grid is active so the row
          aligns with the header's resize-handle columns. */}
      {contentCells}

    </div>
  );
}
