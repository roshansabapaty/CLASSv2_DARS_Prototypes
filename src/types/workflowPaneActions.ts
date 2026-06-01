/**
 * WorkflowPaneActions — emit shape used by DataEntryForm and
 * CollectionTracker to publish their case-level action state up to App.tsx
 * so the WorkflowListPane (footer + scope-header action icons) can render
 * the same Save / Submit / Escalate / panel-toggle controls without each
 * form component needing a direct reference to the pane.
 *
 * Mirrors the existing `onStepperStateChange` pattern that DataEntryForm
 * already uses to publish its sub-step nav state up to App.tsx.
 *
 * App.tsx stores the most recent emission in state and forwards the slots
 * into <WorkflowListPane> as its action / footer props. The pane treats
 * any missing handler as "this action is unavailable in the current
 * surface" — e.g. CollectionTracker won't emit `onToggleIdentifierPanel`
 * because the identifier-panel concept is fulfillment-only.
 */
export interface WorkflowPaneActions {
  // ── Save Draft ──────────────────────────────────────────────────────────
  /** True when the form has unsaved changes. */
  isDirty: boolean;
  /** Spinner state while the save handler is in flight. */
  isSaving?: boolean;
  /** Last successful save — surfaced in the Save tooltip when clean. */
  lastSavedAt?: Date | null;
  /** Save handler. */
  onSave: () => void;

  // ── Submit Case ─────────────────────────────────────────────────────────
  /** True when every required field for the current stage is valid. */
  canSubmit: boolean;
  /** Spinner state while submit is in flight. */
  isSubmitting?: boolean;
  /** Submit handler. */
  onSubmit: () => void;
  /** Names of fields blocking submit (rendered in disabled-state tooltip). */
  blockingFieldLabels?: string[];
  /** Optional jump-to-field helper for the per-row "Go to field" links. */
  onGoToBlockingField?: (label: string) => void;

  // ── Scope-header action icons (right side of row 1) ─────────────────────
  /** Document panel state — drives icon swap + aria-pressed. */
  documentPanelOpen?: boolean;
  onToggleDocumentPanel?: () => void;

  /** Identifier panel state — fulfillment-only. */
  identifierPanelOpen?: boolean;
  onToggleIdentifierPanel?: () => void;

  /** Correspondence panel state — surfaces inbound / outbound messages and
   *  the composer alongside the case form. */
  correspondencePanelOpen?: boolean;
  onToggleCorrespondencePanel?: () => void;

  // ── Overflow menu (⋯) ───────────────────────────────────────────────────
  /** Dynamic label — "Escalate" / "Update Escalation" / "Resume Escalation". */
  escalationActionLabel?: string;
  onEscalate?: () => void;
  onOpenResolveDialog?: (mode: "resolve" | "edit") => void;
  isResolved?: boolean;
  onReopenCase?: () => void;
}
