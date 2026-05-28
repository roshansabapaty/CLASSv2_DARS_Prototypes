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
import { SlaDeadlineChip } from "../sla/SlaDeadlineChip";
import { isCaseSlaPausedById } from "../../utils/slaTimer";
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
  // Dense template — case-id | priority | due | stage | assigned-to | internal-esc | escalated-to.
  // Per-signal operational columns drop in dense mode; mirrors
  // DENSE_COLUMN_IDS in CaseQueueListHeader.tsx.
  const denseGridCols = bulkSelectable
    ? "grid-cols-[auto_1.1fr_auto_1fr_0.9fr_1fr_1.2fr_1.2fr]"
    : "grid-cols-[1.1fr_auto_1fr_0.9fr_1fr_1.2fr_1.2fr]";

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

  return (
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      aria-selected={onSelect ? selected : undefined}
      aria-label={`Case ${caseItem.caseId}, ${priorityConfig.label} priority, due ${caseItem.dueDate}`}
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      style={inlineGridTemplate ? { gridTemplateColumns: inlineGridTemplate } : undefined}
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
        !useInlineGrid && (isDense ? denseGridCols : fullGridCols),
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

      {/* 1. Case ID — now just the copyable identifier. Unread / GFR /
          attorney-review chips moved out to the dedicated Badges cell
          (rendered next) so they have room to breathe. */}
      <div role="gridcell" className={cn("min-w-0 truncate flex items-center gap-1.5", cellPadding)}>
        <CopyableText text={caseItem.caseId} copyLabel="Copy case ID">
          <span className="font-mono text-sm font-semibold text-slate-900">
            {caseItem.caseId}
          </span>
        </CopyableText>
      </div>
      {useInlineGrid && <Spacer />}

      {/* Per-signal operational columns — replaced the bundled "Badges"
          cell. Each renders an em-dash when its signal is absent so the
          column reads as a clean status grid down the page. Dense
          (preview-pane) mode skips these columns; the preview pane stays
          narrow and the signals surface elsewhere on that view. */}
      {!isDense && (
        <>
          {/* Unread — inbound correspondence count. */}
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
          {useInlineGrid && <Spacer />}

          {/* Threat to Life — high-priority crime flag. */}
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
          {useInlineGrid && <Spacer />}

          {/* Enterprise — account-existence resolved to Enterprise. */}
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
          {useInlineGrid && <Spacer />}

          {/* GFR Hold — EU eEvidence Grounds for Refusal state. */}
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
          {useInlineGrid && <Spacer />}

          {/* Attorney Review — correspondence items awaiting attorney action. */}
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
          {useInlineGrid && <Spacer />}

          {/* NDO Reminder — temporary NDO re-check date. */}
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
          {useInlineGrid && <Spacer />}
        </>
      )}

      {/* 2. Priority — label + SLA helper. Plain text (no chip chrome)
          so the row reads lighter; urgency is conveyed via the icon +
          text colour, not a filled box. */}
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
      {useInlineGrid && <Spacer />}

      {/* 3. Due date — `variant="plain"` drops the chip chrome so the
          list row reads as text instead of a pile of pills. The icon +
          colour still convey OnTrack / Approaching / Overdue state. */}
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        <SlaDeadlineChip
          tier={caseItem.casePriority}
          dueDate={caseItem.dueDate}
          dateReceived={caseItem.createDate}
          paused={isCaseSlaPausedById(caseItem.caseId)}
          variant="plain"
        />
      </div>
      {useInlineGrid && <Spacer />}

      {/* 4. Country (dropped in dense mode) */}
      {!isDense && (
        <div role="gridcell" className={cn("min-w-0 text-xs text-[#605e5c] truncate flex items-center", cellPadding)}>
          <span className="text-[#323130] font-medium">{caseItem.country}</span>
          {caseItem.jurisdiction && (
            <>
              <span className="text-slate-300 mx-1">·</span>
              <span>{caseItem.jurisdiction}</span>
            </>
          )}
        </div>
      )}
      {useInlineGrid && <Spacer />}

      {/* 5. Identifiers (dropped in dense mode) */}
      {!isDense && (
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
      )}
      {useInlineGrid && <Spacer />}

      {/* 6. LE-requested services (dropped in dense mode) */}
      {!isDense && (
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
      )}
      {useInlineGrid && <Spacer />}

      {/* Stage — plain text (no chip chrome) so the row reads
          lighter. The stage label colour stays muted because Stage is
          informational, not urgency-bearing. Internal Escalation moved
          to sit beside Escalated To below — see comment there. */}
      <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
        <span
          className="text-xs text-[#323130] truncate max-w-full"
          aria-label={`Stage: ${caseItem.caseStage}`}
        >
          {caseItem.caseStage}
        </span>
      </div>

      {/* Assigned To — the RS who owns the case (distinct from the
          attorney working the escalation, which renders two columns
          over). Falls back to italic "Unassigned" when no RS is on the
          case. */}
      {showCaseAssigneeColumn && (
        <>
          {useInlineGrid && <Spacer />}
          <div role="gridcell" className={cn("min-w-0 flex items-center", cellPadding)}>
            <span
              className={cn(
                "text-xs truncate max-w-full",
                caseItem.assigneeName ? "text-[#323130]" : "text-[#a19f9d] italic",
              )}
              aria-label={`Assigned to: ${caseItem.assigneeName || "Unassigned"}`}
            >
              {caseItem.assigneeName || "Unassigned"}
            </span>
          </div>
        </>
      )}

      {/* Internal Escalation — Attorney / Peer / LENS Lead role chip,
          sortable by status weight + role. Carries the *role context*
          for the Escalated To column rendered next, so the reviewer
          cell no longer repeats the role prefix. External-driven
          signals (GFR, LE Cancellation, AuthorizationDesiredStatus
          updates) stay on the Badges column — those aren't "internal"
          by definition. */}
      {useInlineGrid && <Spacer />}
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

      {/* Escalated To — named reviewer assigned to the escalation
          (e.g. "Sarah Johnson") or italic "Unassigned" when the
          escalation is open to any holder of the targeted role. The
          role prefix (Attorney / Peer / LENS Lead) was removed — the
          adjacent Internal Escalation column already carries it. Em-
          dash when the case has no active escalation. */}
      {showEscalationReviewerColumn && (
        <>
          {useInlineGrid && <Spacer />}
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
                <span
                  className={cn(
                    "text-xs truncate max-w-full",
                    isUnassigned
                      ? "text-[#a19f9d] italic"
                      : "text-[#323130]",
                  )}
                  aria-label={`Escalated to: ${reviewerName}`}
                >
                  {reviewerName}
                </span>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
