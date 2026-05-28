/**
 * AssigneePicker — searchable Response Specialist picker.
 *
 * Used as the inner control inside every reassignment surface:
 *   - Surface A: queue-row inline chip
 *   - Surface B: case-header chip
 *   - Surface E: bulk reassign dialog
 *
 * The picker is presentation-only — it does not call any reassignment hook
 * directly. Callers wire `onPick` to a `useAssignCase().reassign` invocation
 * so the same audit / toast / side-effect path runs from every surface.
 *
 * Keyboard model:
 *   - Up / Down: navigate items
 *   - Enter: commit highlighted item
 *   - Esc: close
 */

import * as React from "react";
import { UserPlus, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

export interface AssigneePickerProps {
  /** Full list of pickable Response Specialists. */
  specialists: string[];
  /** Currently assigned RS (""/undefined = Unassigned). */
  value: string | undefined;
  /** Fires when the user picks a specialist. Caller should commit via
   *  `useAssignCase().reassign(name)`. */
  onPick: (name: string) => void;
  /** Fires when the user explicitly clears the assignment. */
  onClear?: () => void;
  /** Display name of the signed-in user (drives the "Assign to me" shortcut). */
  currentUser?: string;
  /** Compact mode shrinks padding for use inside dense rows. */
  dense?: boolean;
  /** Optional className applied to the outer Command shell. */
  className?: string;
}

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");

export function AssigneePicker({
  specialists,
  value,
  onPick,
  onClear,
  currentUser,
  dense = false,
  className,
}: AssigneePickerProps) {
  const current = (value ?? "").trim();
  const me = (currentUser ?? "").trim();
  const meAlreadyAssigned = !!me && me === current;

  return (
    <Command className={cn("w-[280px]", className)}>
      <CommandInput placeholder="Search specialists..." />

      {/* Assign-to-me / Clear shortcut row */}
      {(currentUser || (onClear && current)) && (
        <div
          className={cn(
            "flex items-center gap-1 px-2 border-b border-[#edebe9] bg-[#faf9f8]",
            dense ? "py-1" : "py-1.5",
          )}
        >
          {currentUser && (
            <Button
              variant="ghost"
              size="sm"
              disabled={meAlreadyAssigned}
              onClick={() => onPick(me)}
              className="h-7 px-2 text-xs text-[#0078d4] hover:text-[#106ebe] hover:bg-white disabled:opacity-50"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              {meAlreadyAssigned ? "You own this" : "Assign to me"}
            </Button>
          )}
          {onClear && current && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 px-2 text-xs text-[#605e5c] hover:bg-white ml-auto"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      <CommandList className="max-h-[260px]">
        <CommandEmpty>No specialists match your search.</CommandEmpty>
        <CommandGroup heading="Response Specialists">
          {specialists.map((name) => {
            const isCurrent = name === current;
            return (
              <CommandItem
                key={name}
                value={name}
                onSelect={() => onPick(name)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold flex-shrink-0",
                    isCurrent
                      ? "bg-[#0078d4] text-white"
                      : "bg-[#e1dfdd] text-[#605e5c]",
                  )}
                  aria-hidden="true"
                >
                  {initials(name)}
                </span>
                <span className="flex-1 text-sm text-[#323130] truncate">
                  {name}
                </span>
                {isCurrent && (
                  <span className="text-[10px] uppercase tracking-wide text-[#107c10] flex-shrink-0">
                    Current
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
        {!current && (
          <>
            <CommandSeparator />
            <div className="px-3 py-1.5 text-[11px] text-[#8a8886] italic">
              No one is currently assigned.
            </div>
          </>
        )}
      </CommandList>
    </Command>
  );
}
