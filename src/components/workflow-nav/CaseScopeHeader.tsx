/**
 * CaseScopeHeader — Teams-style list-pane scope header for the workflow nav.
 *
 * Two-row header that sits at the top of the WorkflowListPane (§4.3 / §4.4 of
 * dars-workflow-nav-listpane-rfc.md):
 *
 *   ┌────────────────────────────────┐
 *   │ STAGES         📄  👥  ⋯       │  row 1: scope label + action icons
 *   │ LNS-2026-00200  Routine · …    │  row 2: case-id + priority + assignee
 *   └────────────────────────────────┘
 *
 * Action icons (right side of row 1):
 *   - Document panel toggle (always)
 *   - Identifier panel toggle (fulfillment stage only)
 *   - Overflow ⋯ — Escalate / Resolve / Re-open
 *
 * Every icon button carries a visible Tooltip whose text matches the
 * aria-label exactly so sighted and AT users hear the same identifier.
 * Toggle buttons expose aria-pressed; the overflow trigger exposes
 * aria-haspopup + aria-expanded via the underlying shadcn DropdownMenu.
 */

import * as React from "react";
import {
  FileText,
  PanelRightClose,
  PanelLeftClose,
  Fingerprint,
  Mail,
  MoreHorizontal,
  Scale,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { TruncatedText } from "../ui/truncated-text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../ui/utils";

export type PriorityLabel = "Emergency" | "Urgent" | "Routine";

export interface CaseScopeHeaderProps {
  /** Case identifier rendered in row 2 (e.g. "LNS-2026-00200"). */
  caseId: string;
  /** Long-form SLA priority label per RFC §11 decision (Emergency / Urgent / Routine). */
  priorityLabel: PriorityLabel;
  /** RS / TS owning the case. Empty string renders "Unassigned" in muted italic. */
  assigneeName: string;
  /** Current workflow stage — gates Identifier-panel button visibility. */
  workflowStage: "triage" | "fulfillment" | "collection";

  // ── Action icons — row 1 right side ─────────────────────────────────────
  /** Document panel state — drives icon swap + aria-pressed. */
  documentPanelOpen?: boolean;
  onToggleDocumentPanel?: () => void;

  /** Identifier panel state — drives icon swap + aria-pressed. Only rendered
   *  on workflowStage === "fulfillment". */
  identifierPanelOpen?: boolean;
  onToggleIdentifierPanel?: () => void;

  /** Correspondence panel state — drives icon swap + aria-pressed. Rendered
   *  on every stage so the user can pull up the Hub at any time. */
  correspondencePanelOpen?: boolean;
  onToggleCorrespondencePanel?: () => void;

  // ── Overflow menu — row 1 right side ────────────────────────────────────
  /** Opens the EscalateToAttorneyDialog. Label varies based on current
   *  escalation state (Escalate / Update Escalation / Resume Escalation). */
  escalationActionLabel?: string;
  onEscalate?: () => void;

  /** Opens the ResolveCaseDialog. Mode controls intent — "resolve" creates a
   *  new resolution, "edit" amends an existing one. */
  onOpenResolveDialog?: (mode: "resolve" | "edit") => void;

  /** When the case is already resolved, swaps the Resolve menu item for
   *  Edit-resolution + Re-open-case. */
  isResolved?: boolean;
  onReopenCase?: () => void;

  /** Hide the workflow pane (Teams hide-entirely pattern). When provided,
   *  a « PanelLeftClose button is rendered as the rightmost action icon.
   *  The button surfaces the Ctrl+Shift+W shortcut in its tooltip. */
  onHidePane?: () => void;
}

/** Inline priority chip rendered next to the case-id on row 2.
 *  Color matches the prototype's SLA-tier palette used elsewhere
 *  (Emergency → red, Urgent → orange, Routine → blue). */
function PriorityChip({ label }: { label: PriorityLabel }) {
  const palette =
    label === "Emergency"
      ? "bg-red-50 text-red-700 border-red-200"
      : label === "Urgent"
        ? "bg-orange-50 text-orange-700 border-orange-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 h-[18px] rounded border text-[10px] font-semibold tracking-wide uppercase",
        palette,
      )}
      aria-label={`SLA priority: ${label}`}
    >
      {label}
    </span>
  );
}

export function CaseScopeHeader({
  caseId,
  priorityLabel,
  assigneeName,
  workflowStage,
  documentPanelOpen,
  onToggleDocumentPanel,
  identifierPanelOpen,
  onToggleIdentifierPanel,
  correspondencePanelOpen,
  onToggleCorrespondencePanel,
  escalationActionLabel = "Escalate",
  onEscalate,
  onOpenResolveDialog,
  isResolved = false,
  onReopenCase,
  onHidePane,
}: CaseScopeHeaderProps) {
  const assigneeDisplay = assigneeName?.trim() || "Unassigned";
  const assigneeIsUnassigned = !assigneeName?.trim();

  const showIdentifierToggle =
    workflowStage === "fulfillment" && !!onToggleIdentifierPanel;

  return (
    <div className="border-b border-[#edebe9] bg-white">
      {/* Row 1 — scope label (left) + action icons (right) */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-[11px] font-semibold tracking-[0.04em] uppercase text-[#605e5c]">
          Stages
        </span>
        <div className="flex items-center gap-0.5">
          {onToggleDocumentPanel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleDocumentPanel}
                  className={cn(
                    "inline-flex items-center justify-center h-7 w-7 rounded text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                    documentPanelOpen && "bg-[#e8f4fd] text-[#0078d4] hover:bg-[#d6ecf9] hover:text-[#0078d4]",
                  )}
                  aria-label={
                    documentPanelOpen
                      ? "Close document panel (Ctrl+Shift+D)"
                      : "Open document panel (Ctrl+Shift+D)"
                  }
                  aria-pressed={!!documentPanelOpen}
                >
                  {documentPanelOpen ? (
                    <PanelRightClose className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {documentPanelOpen
                    ? "Close document panel"
                    : "Open document panel"}{" "}
                  <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono text-white">
                    Ctrl+Shift+D
                  </kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {showIdentifierToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleIdentifierPanel}
                  className={cn(
                    "inline-flex items-center justify-center h-7 w-7 rounded text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                    identifierPanelOpen && "bg-[#f3eefa] text-[#8764b8] hover:bg-[#ebe0f5] hover:text-[#8764b8]",
                  )}
                  aria-label={
                    identifierPanelOpen
                      ? "Close fulfillment wizard (Ctrl+Shift+F)"
                      : "Open fulfillment wizard (Ctrl+Shift+F)"
                  }
                  aria-pressed={!!identifierPanelOpen}
                >
                  {identifierPanelOpen ? (
                    <PanelRightClose className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Fingerprint className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {identifierPanelOpen
                    ? "Close fulfillment wizard"
                    : "Open fulfillment wizard"}{" "}
                  <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono text-white">
                    Ctrl+Shift+F
                  </kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {onToggleCorrespondencePanel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCorrespondencePanel}
                  className={cn(
                    "inline-flex items-center justify-center h-7 w-7 rounded text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                    correspondencePanelOpen && "bg-[#eef7ee] text-[#107c10] hover:bg-[#dff6dd] hover:text-[#107c10]",
                  )}
                  aria-label={
                    correspondencePanelOpen
                      ? "Close correspondence hub (Ctrl+Shift+C)"
                      : "Open correspondence hub (Ctrl+Shift+C)"
                  }
                  aria-pressed={!!correspondencePanelOpen}
                >
                  {correspondencePanelOpen ? (
                    <PanelRightClose className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {correspondencePanelOpen
                    ? "Close correspondence hub"
                    : "Open correspondence hub"}{" "}
                  <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono text-white">
                    Ctrl+Shift+C
                  </kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center justify-center h-7 w-7 rounded text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                    )}
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>More actions</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56 z-[60]">
              <DropdownMenuLabel>Case actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onEscalate && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={onEscalate}
                >
                  <Scale className="w-4 h-4 mr-2" />
                  {escalationActionLabel}
                </DropdownMenuItem>
              )}
              {!isResolved && onOpenResolveDialog && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onOpenResolveDialog("resolve")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Resolve Case
                </DropdownMenuItem>
              )}
              {isResolved && onOpenResolveDialog && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onOpenResolveDialog("edit")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Edit Resolution
                </DropdownMenuItem>
              )}
              {isResolved && onReopenCase && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={onReopenCase}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Re-open Case
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hide-pane « toggle (Teams pattern). Rightmost in the action
              cluster so it reads as a pane-level control, distinct from the
              case-action icons to its left. Pairs with the » Show-workflow
              button that appears in the WorkflowStageBanner once hidden. */}
          {onHidePane && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onHidePane}
                  className={cn(
                    "inline-flex items-center justify-center h-7 w-7 rounded text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                  )}
                  aria-label="Hide workflow pane (Ctrl+Shift+W)"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Hide workflow pane{" "}
                  <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono text-white">
                    Ctrl+Shift+W
                  </kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Row 2 — case context: id · priority · assignee.
          Wrapped in TruncatedText so narrow pane widths surface a
          hover-to-reveal tooltip with the full string instead of just
          clipping invisibly. */}
      <div className="flex items-center gap-2 px-3 pb-2 min-w-0">
        <TruncatedText
          className="font-mono text-[13px] font-semibold text-[#323130] truncate min-w-0"
          aria-label={`Case ID ${caseId}`}
          tooltipText={caseId}
        >
          {caseId}
        </TruncatedText>
        <PriorityChip label={priorityLabel} />
        <span className="text-[#a19f9d]" aria-hidden="true">·</span>
        <TruncatedText
          className={cn(
            "text-xs truncate min-w-0",
            assigneeIsUnassigned ? "text-[#a19f9d] italic" : "text-[#605e5c]",
          )}
          aria-label={`Assigned to ${assigneeDisplay}`}
          tooltipText={`Assigned to ${assigneeDisplay}`}
        >
          {assigneeDisplay}
        </TruncatedText>
      </div>
    </div>
  );
}
