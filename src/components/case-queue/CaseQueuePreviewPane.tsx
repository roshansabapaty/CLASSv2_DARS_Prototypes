/**
 * CaseQueuePreviewPane — right-side resizable pane that previews the
 * currently-selected case when the Case List is in "preview" view mode.
 *
 * Mirrors the side-panel pattern from DocumentViewerPanel + Correspondence-
 * Panel: re-resizable shell with a left-edge keyboard-resizable handle,
 * subtle shadow + hairline border. Content is the case's snapshot pulled
 * straight from CaseQueueItem (no case-page fetch). Primary affordance is
 * the "Open case" button in the header — clicking it commits to the full
 * case page.
 *
 * Empty state when nothing is selected: a calm hint with a small icon
 * telling the RS to pick a row from the list on the left.
 */

import * as React from "react";
import { Resizable } from "re-resizable";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  ArrowRight,
  CheckCircle2,
  ListTodo,
  MailOpen,
  MousePointerClick,
  Scale,
  X,
} from "lucide-react";
import { CopyableText } from "../CopyButton";
import { CaseCardOperationalBadges } from "./CaseCardOperationalBadges";
import {
  getNextAction,
  getPriorityConfig,
  isHighPriorityCrime,
  type CaseQueueItem,
} from "./case-queue-types";
import { useKeyboardResize } from "../../hooks/useKeyboardResize";
import { useCorrespondenceNotifications } from "../../hooks/useCorrespondenceNotifications";
import {
  pendingAttorneyActionsForCase,
  getEscalationSummaryForCase,
  type PendingAction,
  type EscalationDashboardSummary,
} from "../../utils/escalationHelpers";
import { getCaseFormDataById } from "../../utils/caseDataRegistry";
import { EnterpriseTriPaneSummary } from "../attorney-escalation/EnterpriseTriPaneSummary";
import { cn } from "../ui/utils";

interface CaseQueuePreviewPaneProps {
  /** The case currently selected for preview. `null` when nothing is
   *  selected — the pane renders its empty state. */
  caseItem: CaseQueueItem | null;
  /** Width in pixels (lifted to parent so list + pane track each
   *  other). */
  width: number;
  onResize: (next: number) => void;
  /** Open the full case page. */
  onOpenCase: (caseId: string) => void;
  /** Clear the selection (called from the header X). */
  onClearSelection: () => void;
  /** Minimum pane width. Defaults to 420 px. */
  minWidth?: number;
  /** Maximum pane width. Defaults to 720 px. */
  maxWidth?: number;
  /** Attorney Dashboard variant. When true the pane surfaces a
   *  "Pending action items" section at the top of the body and an
   *  escalation summary block, replacing the RS-flavoured operational
   *  badges with attorney-flavoured content. */
  attorneyMode?: boolean;
  /** Reassign the case shown in the preview (Surface E parity — same
   *  callback the queue rows wire to `handleQueueReassign`). When
   *  omitted, the preview's Assigned To row renders the chip in
   *  read-only mode. */
  onReassign?: (caseId: string, nextAssignee: string) => void;
}

export function CaseQueuePreviewPane({
  caseItem,
  width,
  onResize,
  onOpenCase,
  onClearSelection,
  minWidth = 420,
  maxWidth = 720,
  attorneyMode = false,
  onReassign,
}: CaseQueuePreviewPaneProps) {
  const keyboardResizeProps = useKeyboardResize(width, onResize, {
    min: minWidth,
    max: maxWidth,
    label: "Resize case preview pane — use arrow keys",
    unitLabel: "pixels wide",
  });

  const { perCase } = useCorrespondenceNotifications();
  const correspondence = caseItem ? perCase.get(caseItem.caseId) : undefined;

  return (
    <Resizable
      size={{ width, height: "100%" }}
      minWidth={minWidth}
      maxWidth={maxWidth}
      enable={{
        top: false,
        right: false,
        bottom: false,
        left: true,
        topRight: false,
        bottomRight: false,
        bottomLeft: false,
        topLeft: false,
      }}
      onResize={(_e, _direction, _ref, d) => {
        const newWidth = width + d.width;
        const clampedWidth = Math.max(
          minWidth,
          Math.min(newWidth, maxWidth),
        );
        onResize(clampedWidth);
      }}
      className="bg-white border-l border-[#edebe9] flex flex-col"
      handleStyles={{
        left: {
          width: "6px",
          left: "0",
          cursor: "col-resize",
          background:
            "linear-gradient(90deg, rgba(0,120,212,0.1) 0%, rgba(0,120,212,0.3) 50%, rgba(0,120,212,0.1) 100%)",
          borderLeft: "1px solid #d1d5db",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      }}
      handleComponent={{
        left: (
          <div
            {...keyboardResizeProps}
            className="w-full h-full flex items-center justify-center group hover:bg-[#0078d4]/20 transition-colors focus-visible:outline-2 focus-visible:outline-[#0078d4] focus-visible:bg-[#0078d4]/20"
            title="Drag to resize, or use arrow keys"
          >
            <div className="flex flex-col gap-1 opacity-40 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
              <div className="w-0.5 h-4 bg-[#605e5c] rounded-full"></div>
              <div className="w-0.5 h-4 bg-[#605e5c] rounded-full"></div>
              <div className="w-0.5 h-4 bg-[#605e5c] rounded-full"></div>
            </div>
          </div>
        ),
      }}
    >
      <aside
        role="complementary"
        aria-label="Case preview pane"
        className="h-full flex flex-col overflow-hidden min-h-0"
      >
        {caseItem ? (
          <PreviewContent
            caseItem={caseItem}
            correspondenceUnread={correspondence?.unread ?? 0}
            correspondencePending={correspondence?.pending ?? 0}
            onOpenCase={onOpenCase}
            onClearSelection={onClearSelection}
            attorneyMode={attorneyMode}
            onReassign={onReassign}
          />
        ) : (
          <PreviewEmptyState />
        )}
      </aside>
    </Resizable>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────

function PreviewEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-[#605e5c]">
      <div className="w-12 h-12 rounded-full bg-[#f3f9fd] flex items-center justify-center mb-4">
        <MousePointerClick className="w-6 h-6 text-[#0078d4]" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-[#323130] mb-1">
        Select a case to preview
      </p>
      <p className="text-xs text-[#605e5c] max-w-xs">
        Click any row in the list on the left to see a quick summary here,
        without leaving the queue.
      </p>
    </div>
  );
}

// ─── Populated state ────────────────────────────────────────────────────

interface PreviewContentProps {
  caseItem: CaseQueueItem;
  correspondenceUnread: number;
  correspondencePending: number;
  onOpenCase: (caseId: string) => void;
  onClearSelection: () => void;
  attorneyMode: boolean;
  /** Reassign callback threaded from the host (CaseQueue's
   *  `handleQueueReassign`). When omitted, the Assigned To row renders
   *  the chip in read-only mode. */
  onReassign?: (caseId: string, nextAssignee: string) => void;
}

function PreviewContent({
  caseItem,
  correspondenceUnread,
  correspondencePending,
  onOpenCase,
  onClearSelection,
  attorneyMode,
  onReassign,
}: PreviewContentProps) {
  const priorityConfig = getPriorityConfig(caseItem.casePriority);
  const highPriorityCrimes = caseItem.natureOfCrime.filter((c) =>
    isHighPriorityCrime(c),
  );
  const nextAction = getNextAction(caseItem.caseStage, caseItem.assigneeName);
  // Attorney-variant additions.
  const pendingActions: PendingAction[] = attorneyMode
    ? pendingAttorneyActionsForCase(caseItem.caseId)
    : [];
  const escalationSummary: EscalationDashboardSummary | undefined = attorneyMode
    ? getEscalationSummaryForCase(caseItem.caseId)
    : undefined;
  const footerLabel = attorneyMode ? "Open case to take action" : nextAction;

  return (
    <>
      {/* Header */}
      <div className={cn("border-b border-[#edebe9] px-4 py-3", priorityConfig.color, "border-l-4")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <CopyableText text={caseItem.caseId} copyLabel="Copy case ID">
              <span className="font-mono text-base font-semibold text-slate-900">
                {caseItem.caseId}
              </span>
            </CopyableText>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-xs font-mono border-2", priorityConfig.badge)}
                style={{ fontWeight: 700 }}
              >
                {priorityConfig.icon && (
                  <priorityConfig.icon className="w-3 h-3 mr-1" aria-hidden="true" />
                )}
                {priorityConfig.level}
              </Badge>
              <Badge
                variant="outline"
                className="text-xs px-2 py-0 bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
              >
                {caseItem.caseStage}
              </Badge>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="h-8 w-8 p-0 text-[#605e5c] hover:bg-[#f3f2f1]"
                  aria-label="Clear preview selection"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Clear selection (Esc)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Operational signals — promoted to the top of the body so
            the RS / TS sees the urgency-bearing badges (Threat to
            Life, GFR, Enterprise, unread inbound, attorney-review
            traffic) before the structured tripanel detail. Same chips
            the case row + cards mode use, sharing the
            `CaseCardOperationalBadges` component. */}
        <section aria-labelledby="preview-badges-heading" className="space-y-2">
          <h3
            id="preview-badges-heading"
            className="text-xs font-semibold uppercase tracking-wide text-[#605e5c]"
          >
            Operational signals
          </h3>
          <CaseCardOperationalBadges
            caseItem={caseItem}
            priorityConfig={priorityConfig}
            highPriorityCrimes={highPriorityCrimes}
          />
        </section>

        {/* Tri-pane Summary (spec §5.2). Three stripes: LE & Order /
            Target Identifier / Enterprise Org. Mounts on both
            surfaces (main Case Queue preview pane + Attorney Dashboard
            preview pane). The Target Identifier stripe switches modes
            based on user role:
             - attorney → `flagged-focus` (tabs centered on escalated
               identifiers + per-identifier detail)
             - RS / TS → `all` (simple Type · Value list capped at 5)
            The RS / TS variant matches how those personas scan a case:
            they want the full identifier set to gauge complexity, not
            a flagged subset. */}
        {(() => {
          const fd = getCaseFormDataById(caseItem.caseId);
          return fd ? (
            <EnterpriseTriPaneSummary
              case={fd}
              targetIdentifierMode={attorneyMode ? "flagged-focus" : "all"}
            />
          ) : null;
        })()}

        {/* Primary "open the case" action — promoted next to the
            tripanel so the user doesn't have to scroll past the
            badges / crimes / correspondence sections to find it.
            Mirrors the same action in the footer below; the footer
            copy stays as a backstop for scroll-from-top traffic. */}
        <div className="pt-1">
          <Button
            type="button"
            onClick={() => onOpenCase(caseItem.caseId)}
            className="h-9 w-full bg-[#0078d4] hover:bg-[#106ebe] text-white gap-2"
            aria-label={`${footerLabel} — ${caseItem.caseId}`}
          >
            {footerLabel}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Attorney variant — Escalation snapshot. */}
        {attorneyMode && escalationSummary && (
          <section
            aria-labelledby="preview-escalation-heading"
            className="space-y-2 rounded-md border border-[#5c2d91]/30 bg-[#f3f0fa] p-3"
          >
            <h3
              id="preview-escalation-heading"
              className="text-xs font-semibold uppercase tracking-wide text-[#5c2d91] flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              Escalation
            </h3>
            <div className="text-sm text-[#323130] space-y-1">
              <div>
                <span className="font-medium">Status:</span>{" "}
                <span>{escalationSummary.status}</span>
              </div>
              <div>
                <span className="font-medium">Role:</span>{" "}
                <span>{escalationSummary.role === "Attorney" ? "Attorney" : escalationSummary.role}</span>
                {" · "}
                <span className="text-[#605e5c]">{escalationSummary.assigneeLabel}</span>
              </div>
              <div className="text-xs text-[#605e5c]">
                Escalated by{" "}
                <span className="text-[#323130]">{escalationSummary.escalatedBy}</span>
              </div>
            </div>
          </section>
        )}

        {/* Attorney variant — Pending action items. */}
        {attorneyMode && pendingActions.length > 0 && (
          <section
            aria-labelledby="preview-actions-heading"
            className="space-y-2"
          >
            <h3
              id="preview-actions-heading"
              className="text-xs font-semibold uppercase tracking-wide text-[#605e5c] flex items-center gap-1.5"
            >
              <ListTodo className="w-3.5 h-3.5" aria-hidden="true" />
              Pending action items
            </h3>
            <ul className="space-y-1.5">
              {pendingActions.map((action, idx) => {
                const markerClass =
                  action.severity === "critical"
                    ? "bg-[#a4262c]"
                    : action.severity === "warning"
                      ? "bg-[#ca5010]"
                      : "bg-[#0078d4]";
                const Icon =
                  action.kind === "correspondence-out" ||
                  action.kind === "correspondence-in"
                    ? MailOpen
                    : action.kind === "conditions"
                      ? CheckCircle2
                      : MousePointerClick;
                return (
                  <li
                    key={`${action.kind}-${idx}`}
                    className="flex items-start gap-2 text-sm text-[#323130]"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 text-white mt-0.5",
                        markerClass,
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="w-3 h-3" />
                    </span>
                    <span>{action.label}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Snapshot section removed — its three remaining fields
            (Due date, Received date, Origin) now live in the
            EnterpriseTriPaneSummary's LE & Order stripe above so all
            LE / order metadata sits in one stripe. Operational signals
            were also moved — they now render at the top of the body
            so the urgency-bearing chips read before the structured
            tripanel detail. */}

        {/* Crime badges removed — the EnterpriseTriPaneSummary LE &
            Order stripe already renders `natureOfCrimes` as a comma-
            separated value, so a duplicate chip row underneath was
            redundant. High-priority crimes still render as red Shield
            chips inside the Operational signals section above. */}

        {/* Correspondence */}
        {(correspondenceUnread > 0 || correspondencePending > 0) && (
          <section
            aria-labelledby="preview-correspondence-heading"
            className="space-y-2"
          >
            <h3
              id="preview-correspondence-heading"
              className="text-xs font-semibold uppercase tracking-wide text-[#605e5c]"
            >
              Correspondence
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {correspondenceUnread > 0 && (
                <Badge
                  variant="outline"
                  className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-xs"
                  aria-label={`${correspondenceUnread} unread inbound message${correspondenceUnread === 1 ? "" : "s"}`}
                >
                  <MailOpen className="w-3 h-3 mr-1" aria-hidden="true" />
                  {correspondenceUnread} unread
                </Badge>
              )}
              {correspondencePending > 0 && (
                <Badge
                  variant="outline"
                  className="bg-[#fff4ce] text-[#8a6d3b] border-[#f9a825] text-xs"
                  aria-label={`${correspondencePending} outbound awaiting acknowledgement`}
                >
                  {correspondencePending} acknowledgement pending
                </Badge>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Footer button removed — the primary "open the case" action
          is now promoted to sit directly under the tripanel so the
          user doesn't need to scroll through badges / crimes /
          correspondence to find it. The list-row checkbox + sticky
          bulk-actions bar still cover the Pick / Release / Assign
          multi-case flow. */}
    </>
  );
}

