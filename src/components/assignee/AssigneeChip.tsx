/**
 * AssigneeChip — small click-to-reassign pill displaying the current
 * Response Specialist.
 *
 * Used in:
 *   - Surface A: queue row (replaces the plain "Assigned to: <name>" text)
 *   - Surface B: case header banner (next to the case number)
 *
 * Visual states:
 *   - Assigned: avatar (initials) + name + subtle chevron on hover
 *   - Unassigned: dashed pill + Plus icon + "Assign…" placeholder
 *
 * The chip is purely a trigger; the picker pops over and the caller's
 * `useAssignCase().reassign(name)` does the commit.
 */

import * as React from "react";
import { Plus, ChevronDown, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { AssigneePicker } from "./AssigneePicker";
import { useAssignCase } from "../../hooks/useAssignCase";
import { cn } from "../ui/utils";

export interface AssigneeChipProps {
  /** Current assignee. "" / undefined renders the Unassigned state. */
  value: string | undefined;
  /** Apply a new assignee. Pass "" to clear. */
  onChange: (next: string) => void;
  /** Full list of pickable Response Specialists. */
  specialists: string[];
  /** Display name of the signed-in user (drives "Assign to me"). Optional. */
  currentUser?: string;
  /** Case ID / number — used in the toast wording. Optional. */
  caseId?: string;
  /** Visual variant. "header" inherits the dark banner text colors; "inline"
   *  uses neutral foreground for use inside light-background rows. */
  variant?: "header" | "inline";
  /** Allow the user to clear the assignment from inside the picker.
   *  Default true. */
  allowClear?: boolean;
  /** Extra className on the trigger button. */
  className?: string;
  /** Render as read-only (no popover). Useful when the user lacks
   *  permission to reassign. */
  readOnly?: boolean;
}

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");

export function AssigneeChip({
  value,
  onChange,
  specialists,
  currentUser,
  caseId,
  variant = "inline",
  allowClear = true,
  className,
  readOnly = false,
}: AssigneeChipProps) {
  const [open, setOpen] = React.useState(false);
  const { reassign, clearAssignment } = useAssignCase({
    currentAssignee: value,
    setAssignee: onChange,
    caseId,
  });

  const current = (value ?? "").trim();
  const isAssigned = !!current;

  // Header variant — must read as an **actionable button** alongside Resolve /
  // Escalate / Check Jobs in the WorkflowStageBanner, NOT as a passive status
  // badge. The styling intentionally matches `resolveButtonBase` in
  // WorkflowStageBanner.tsx so every CTA in the banner shares one look:
  //   * bg-white/25 (brighter than the white/15 used by passive badges)
  //   * border-white/45 (thicker / more visible than passive borders)
  //   * h-7 px-2.5 (matches the other banner buttons)
  //   * shadow-sm + banner-agnostic white ring on focus (works on both the
  //     blue triage/fulfillment gradient and the purple collection gradient
  //     because no ring-offset color is bound to a specific banner shade)
  const triggerClasses =
    variant === "header"
      ? cn(
          "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs",
          "bg-white/25 hover:bg-white/35 text-white border border-white/45 shadow-sm",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85",
          !isAssigned && "border-dashed bg-white/15 hover:bg-white/25",
          readOnly && "pointer-events-none opacity-80",
        )
      : cn(
          "inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs",
          "bg-[#f3f2f1] hover:bg-[#edebe9] text-[#323130] border border-[#c8c6c4]",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]",
          !isAssigned && "border-dashed text-[#605e5c]",
          readOnly && "pointer-events-none opacity-80",
        );

  const avatarClasses =
    variant === "header"
      ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/30 text-[10px] font-semibold text-white ring-1 ring-white/40"
      : "inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0078d4] text-[10px] font-semibold text-white";

  const trigger = (
    <button
      type="button"
      className={cn(triggerClasses, className)}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={
        isAssigned
          ? `Reassign case (currently assigned to ${current})`
          : "Assign this case to a Response Specialist"
      }
      title={
        isAssigned
          ? `Assigned to ${current} — click to reassign`
          : "Assign this case"
      }
    >
      {isAssigned ? (
        <>
          <span className={avatarClasses} aria-hidden="true">
            {initials(current)}
          </span>
          <span className="truncate max-w-[160px]">{current}</span>
        </>
      ) : (
        <>
          <Plus className="w-3 h-3" aria-hidden="true" />
          <span>Assign…</span>
        </>
      )}
      {!readOnly && (
        <ChevronDown
          className={cn(
            "w-3 h-3 opacity-80",
            variant === "header" ? "text-white" : "text-[#605e5c]",
          )}
          aria-hidden="true"
        />
      )}
    </button>
  );

  if (readOnly) return trigger;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={8}
        // The sticky case header sits at z-[55]; the default Radix popover is
        // z-50, which causes the picker to render underneath the banner. Bump
        // above the header without going so high that toasts/dialogs (z-[80]+)
        // are obscured.
        className="p-0 w-auto z-[60]"
      >
        <AssigneePicker
          specialists={specialists}
          value={value}
          currentUser={currentUser}
          onPick={(name) => {
            reassign(name);
            setOpen(false);
          }}
          onClear={
            allowClear
              ? () => {
                  clearAssignment();
                  setOpen(false);
                }
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
  );
}
