/**
 * WorkflowListPaneFooter — sticky footer at the bottom of the workflow nav
 * list pane. Hosts the primary case actions (Save Draft + Submit Case) per
 * §4.8 of dars-workflow-nav-listpane-rfc.md.
 *
 *   ┌────────────────────────────────┐
 *   │  [ Save Draft ]   [ Submit ]   │
 *   └────────────────────────────────┘
 *
 * Layout:
 *   - Save Draft — outline / secondary, left-aligned.
 *   - Submit Case — filled brand-blue / primary, right-aligned.
 *
 * Button states:
 *   - Save Draft: disabled when no unsaved changes; tooltip lists the last
 *     saved time so the user knows the form is up-to-date.
 *   - Submit Case: disabled when the form isn't valid; tooltip lists the
 *     blocking fields so the user understands what's needed.
 *
 * A11y: each button carries an aria-label that mirrors the visible button
 * text. Disabled-state tooltips are exposed via aria-describedby so AT users
 * hear the reason on focus.
 */

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "../ui/utils";

export interface WorkflowListPaneFooterProps {
  // ── Save Draft ───────────────────────────────────────────────────────────
  /** True when the form has unsaved changes — drives Save enablement. */
  isDirty: boolean;
  /** Spinner state while the save handler is in flight. */
  isSaving?: boolean;
  /** Last successful save — surfaced in the Save tooltip when clean. */
  lastSavedAt?: Date | null;
  /** Save handler — typically the same `handleManualSave` that used to
   *  feed `StickyCaseHeader`. */
  onSave: () => void;

  // ── Submit Case ──────────────────────────────────────────────────────────
  /** True when every required field for the current stage is valid. */
  canSubmit: boolean;
  /** Spinner state while submit is in flight. */
  isSubmitting?: boolean;
  /** Submit handler. */
  onSubmit: () => void;
  /** When canSubmit is false, the names of the blocking fields. Rendered
   *  inside the disabled-Submit tooltip with "Go to field" actions if
   *  `onGoToBlockingField` is provided. */
  blockingFieldLabels?: string[];
  /** Optional jump-to-field helper for the per-row "Go to field" links
   *  inside the disabled-Submit tooltip. Receives the blocking field label
   *  the user clicked (label text is the key — callers map it back to a
   *  scroll target). */
  onGoToBlockingField?: (label: string) => void;
}

function formatLastSaved(at: Date | null | undefined): string {
  if (!at) return "";
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WorkflowListPaneFooter({
  isDirty,
  isSaving = false,
  lastSavedAt,
  onSave,
  canSubmit,
  isSubmitting = false,
  onSubmit,
  blockingFieldLabels,
  onGoToBlockingField,
}: WorkflowListPaneFooterProps) {
  const saveDisabled = !isDirty || isSaving;
  const submitDisabled = !canSubmit || isSubmitting;

  // Tooltip text mirrors the aria-describedby content so sighted and AT
  // users hear the same explanation.
  const saveTooltip = isSaving
    ? "Saving…"
    : isDirty
      ? "Save case as draft"
      : lastSavedAt
        ? `All changes saved · last saved ${formatLastSaved(lastSavedAt)}`
        : "All changes saved";

  const submitTooltipBlockers =
    blockingFieldLabels && blockingFieldLabels.length > 0
      ? blockingFieldLabels
      : null;

  const submitDescribedById = "workflow-pane-submit-blockers";

  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-[#edebe9] bg-white"
      role="group"
      aria-label="Case actions"
    >
      {/* Save Draft — secondary outline button, left-aligned */}
      <Tooltip>
        <TooltipTrigger asChild>
          {/* span wrapper so the tooltip works on a disabled button */}
          <span className="inline-flex">
            <button
              type="button"
              onClick={onSave}
              disabled={saveDisabled}
              aria-label="Save case as draft"
              className={cn(
                "inline-flex items-center justify-center h-8 px-3 rounded-md border text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                saveDisabled
                  ? "border-[#e1dfdd] bg-white text-[#a19f9d] cursor-not-allowed"
                  : "border-[#0078d4] bg-white text-[#0078d4] hover:bg-[#deecf9]",
              )}
            >
              {isSaving ? "Saving…" : "Save Draft"}
            </button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{saveTooltip}</p>
        </TooltipContent>
      </Tooltip>

      {/* Submit Case — primary filled button, right-aligned */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitDisabled}
              aria-label="Submit case"
              aria-describedby={
                submitDisabled && submitTooltipBlockers
                  ? submitDescribedById
                  : undefined
              }
              className={cn(
                "inline-flex items-center justify-center h-8 px-4 rounded-md text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                submitDisabled
                  ? "bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed"
                  : "bg-[#0078d4] text-white hover:bg-[#106ebe]",
              )}
            >
              {isSubmitting ? "Submitting…" : "Submit"}
            </button>
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[260px]"
          id={
            submitDisabled && submitTooltipBlockers
              ? submitDescribedById
              : undefined
          }
        >
          {submitDisabled && submitTooltipBlockers ? (
            <div className="text-xs space-y-1.5">
              <p className="font-semibold">Submit is blocked by:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {submitTooltipBlockers.map((label) => (
                  <li key={label}>
                    {onGoToBlockingField ? (
                      <button
                        type="button"
                        className="underline text-white/90 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGoToBlockingField(label);
                        }}
                      >
                        {label}
                      </button>
                    ) : (
                      label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs">
              {isSubmitting ? "Submitting…" : "Submit case for next stage"}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
