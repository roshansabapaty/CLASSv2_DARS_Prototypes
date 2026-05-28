/**
 * NoteFieldEditor — the unified notes-input control used throughout the
 * case form. Wraps the existing `RichTextEditor` (formatting toolbar +
 * inline attachment + image paste) so every notes field across the app
 * — NDO notes, Controller Response notes, escalation notes, resolution
 * notes, manual-collection notes, document-verification notes, etc. —
 * gets the same affordances as a "Case Note on the Notes timeline".
 *
 * What this component is NOT: it does not push the note into
 * `formData.notes[]`. Each calling site owns its own storage (string
 * field + sibling attachments field) so existing data shapes don't have
 * to migrate. The `subType` prop documents the surface for accessibility
 * + downstream filtering when a caller later decides to mirror these
 * into the central notes timeline.
 *
 * Usage:
 *   <NoteFieldEditor
 *     id="ndo-notes"
 *     label="Notes"
 *     subType="ndo"
 *     value={currentNDO.notes}
 *     onChange={(v) => setCurrentNDO({ ...currentNDO, notes: v })}
 *     attachments={currentNDO.notesAttachments ?? []}
 *     onAttachmentsChange={(a) => setCurrentNDO({ ...currentNDO, notesAttachments: a })}
 *     placeholder="Add any additional notes…"
 *   />
 */

import * as React from "react";
import { Label } from "./ui/label";
import { RichTextEditor, type Attachment } from "./RichTextEditor";
import type { CaseNoteSubType } from "../types/caseTypes";

export interface NoteFieldEditorProps {
  /** DOM id for label-association. */
  id: string;
  /** Visible label. Hidden visually if you pass `hideLabel`. */
  label?: string;
  /** Helper text below the label. */
  helperText?: string;
  /** Origin of the note. Sets aria-label hints + future filter
   *  scaffolding when notes are mirrored to the central timeline. */
  subType: CaseNoteSubType;
  /** HTML content of the note. */
  value: string;
  onChange: (value: string) => void;
  /** Sibling attachments list. Pass an empty array and a setter even
   *  when attachments aren't expected — the editor still renders the
   *  paperclip button so the user can add one. */
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  placeholder?: string;
  className?: string;
  /** Render the label visually hidden but still wired to the editor
   *  for screen readers. */
  hideLabel?: boolean;
  /** Optional autofocus on mount. */
  autoFocus?: boolean;
}

export function NoteFieldEditor({
  id,
  label,
  helperText,
  subType,
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  placeholder,
  className,
  hideLabel,
  autoFocus,
}: NoteFieldEditorProps) {
  return (
    <div className={className}>
      {label && (
        <Label
          htmlFor={id}
          className={hideLabel ? "sr-only" : "text-sm font-semibold"}
        >
          {label}
        </Label>
      )}
      {helperText && !hideLabel && (
        <p className="text-xs text-[#605e5c] mt-0.5 mb-1">{helperText}</p>
      )}
      <div
        id={id}
        role="group"
        aria-label={label ? `${label} (${subType})` : `Notes (${subType})`}
        data-note-subtype={subType}
      >
        <RichTextEditor
          value={value}
          onChange={onChange}
          attachments={attachments}
          onAttachmentsChange={onAttachmentsChange}
          placeholder={placeholder ?? "Add notes — use the toolbar for formatting or attach files…"}
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
}
