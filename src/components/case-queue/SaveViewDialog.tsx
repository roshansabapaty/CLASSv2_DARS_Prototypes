/**
 * SaveViewDialog — modal dialog for naming a new saved filter view.
 *
 * Validation:
 *   - Empty name is blocked.
 *   - Name conflicts with an existing user view (case-insensitive)
 *     surface an inline error so the user can pick a different name.
 *   - System view names are reserved (can't be overwritten).
 *
 * The dialog is presentation-only — the host is responsible for
 * commiting via the saved-views store in `onSave`.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Names already taken (system + user). Used for the conflict check. */
  existingNames: string[];
  /** Fires when the user clicks Save with a valid, non-conflicting name. */
  onSave: (name: string) => void;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  existingNames,
  onSave,
}: SaveViewDialogProps) {
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName("");
      setError(null);
    }
  }, [open]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    const conflict = existingNames.some(
      (n) => n.toLowerCase() === trimmed.toLowerCase(),
    );
    if (conflict) {
      setError("A view with this name already exists.");
      return;
    }
    onSave(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save current view</DialogTitle>
          <DialogDescription>
            Capture the current filter selection, badge selection, and
            sort order as a named view you can return to later. Search
            terms are not saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label
            htmlFor="saved-view-name"
            className="text-sm font-semibold text-[#323130]"
          >
            View name
          </Label>
          <Input
            id="saved-view-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="e.g. EU GFR holds, my emergencies"
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? "saved-view-name-error" : undefined}
            className="h-9 text-sm"
          />
          {error && (
            <p
              id="saved-view-name-error"
              role="alert"
              className="text-xs text-[#a4262c]"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
          >
            Save view
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
