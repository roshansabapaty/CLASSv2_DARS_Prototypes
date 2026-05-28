/**
 * SavedViewsMenu — popover dropdown that lists system + user-saved
 * filter views and lets the user pick one, save the current state as
 * a new view, or delete an existing user view. Mounted in both the
 * main Case Queue toolbar and the Attorney Dashboard toolbar.
 *
 * The trigger button shows the currently-applied view name; when the
 * runtime filter state has drifted from that view, the label appends
 * "(modified)" so the user knows a Save would capture a new state.
 *
 * The menu is "dumb" — it doesn't apply views itself. Instead it
 * surfaces a `onApply` callback the host wires to its own filter
 * state setters. Same for `onSaveCurrent` / `onDelete`. This keeps
 * the queue + dashboard variants free to differ on which filter
 * fields exist.
 */

import * as React from "react";
import {
  Bookmark,
  BookmarkPlus,
  Check,
  ChevronDown,
  Lock,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../ui/utils";
import type { SavedView } from "./savedViews";

export interface SavedViewsMenuProps<F = unknown> {
  /** System-provided views (shown first, can't be deleted). */
  systemViews: SavedView<F>[];
  /** User-created views (shown second, each editable / deletable). */
  userViews: SavedView<F>[];
  /** ID of the currently-applied view, or undefined when none. */
  currentViewId: string | undefined;
  /** True when the runtime filter state differs from the applied view's
   *  captured snapshot — the trigger gets a "(modified)" suffix. */
  isModified: boolean;
  /** Fires when the user picks a view from the list. */
  onApply: (view: SavedView<F>) => void;
  /** Fires when the user clicks "Save current view…". Host opens the
   *  name-input dialog and commits via the saved-views store. */
  onSaveCurrent: () => void;
  /** Fires when the user deletes a user-created view. */
  onDelete: (view: SavedView<F>) => void;
  /** Optional className applied to the trigger button. */
  className?: string;
}

export function SavedViewsMenu<F>({
  systemViews,
  userViews,
  currentViewId,
  isModified,
  onApply,
  onSaveCurrent,
  onDelete,
  className,
}: SavedViewsMenuProps<F>) {
  const [open, setOpen] = React.useState(false);

  const allViews = React.useMemo(
    () => [...systemViews, ...userViews],
    [systemViews, userViews],
  );
  const currentView = allViews.find((v) => v.id === currentViewId);
  const triggerLabel = currentView
    ? `${currentView.name}${isModified ? " (modified)" : ""}`
    : "Saved views";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={
            currentView
              ? `Saved view: ${triggerLabel}`
              : "Open saved views menu"
          }
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border",
            currentView && !isModified
              ? "border-[#0078d4] text-[#0078d4] bg-[#deecf9]/40"
              : "bg-white text-[#323130] border-[#e1dfdd] hover:bg-[#f3f2f1]",
            className,
          )}
        >
          <Bookmark
            className={cn(
              "w-3.5 h-3.5",
              currentView && !isModified
                ? "text-[#0078d4]"
                : "text-[#605e5c]",
            )}
            aria-hidden="true"
          />
          <span className="truncate max-w-[200px]">{triggerLabel}</span>
          <ChevronDown className="w-3 h-3 opacity-60" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-50" align="start">
        <div className="py-1">
          {/* System views section */}
          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide font-semibold text-[#605e5c] flex items-center gap-1">
            <Lock className="w-3 h-3" aria-hidden="true" />
            System views
          </div>
          {systemViews.map((view) => (
            <ViewRow
              key={view.id}
              view={view}
              isActive={view.id === currentViewId}
              isModified={view.id === currentViewId && isModified}
              onApply={(v) => {
                onApply(v);
                setOpen(false);
              }}
              onDelete={undefined}
            />
          ))}

          {/* User views section */}
          {userViews.length > 0 && (
            <>
              <div className="border-t border-[#edebe9] my-1" aria-hidden="true" />
              <div className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wide font-semibold text-[#605e5c]">
                Your views
              </div>
              {userViews.map((view) => (
                <ViewRow
                  key={view.id}
                  view={view}
                  isActive={view.id === currentViewId}
                  isModified={view.id === currentViewId && isModified}
                  onApply={(v) => {
                    onApply(v);
                    setOpen(false);
                  }}
                  onDelete={(v) => {
                    onDelete(v);
                    // Keep the popover open so the user can pick a
                    // replacement view without re-opening it.
                  }}
                />
              ))}
            </>
          )}

          {/* Save current view — last item, always visible */}
          <div className="border-t border-[#edebe9] mt-1 pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSaveCurrent();
              }}
              className="w-full text-left px-3 py-2 text-xs text-[#0078d4] font-semibold hover:bg-[#f3f9ff] focus:outline-none focus-visible:bg-[#f3f9ff] flex items-center gap-2"
            >
              <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
              Save current view…
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ViewRowProps<F> {
  view: SavedView<F>;
  isActive: boolean;
  isModified: boolean;
  onApply: (view: SavedView<F>) => void;
  onDelete: ((view: SavedView<F>) => void) | undefined;
}

function ViewRow<F>({
  view,
  isActive,
  isModified,
  onApply,
  onDelete,
}: ViewRowProps<F>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-[#f3f2f1] cursor-pointer text-xs",
        isActive && "bg-[#deecf9]/40",
      )}
      onClick={() => onApply(view)}
    >
      <span className="flex items-center gap-2 min-w-0 flex-1">
        {isActive ? (
          <Check
            className="w-3.5 h-3.5 flex-shrink-0 text-[#0078d4]"
            aria-hidden="true"
          />
        ) : (
          <span className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        )}
        <span
          className={cn(
            "truncate",
            isActive ? "text-[#323130] font-semibold" : "text-[#323130]",
          )}
        >
          {view.name}
          {isActive && isModified && (
            <span className="ml-1.5 text-[10px] uppercase tracking-wide text-[#605e5c]">
              modified
            </span>
          )}
        </span>
      </span>
      {onDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-0.5 text-[#605e5c] hover:text-[#323130] hover:bg-[#edebe9] rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0078d4]"
              aria-label={`More options for view ${view.name}`}
            >
              <MoreVertical className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(view);
              }}
              className="text-[#a4262c] focus:text-[#a4262c]"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
              Delete view
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
