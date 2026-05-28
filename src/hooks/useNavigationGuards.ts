import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner@2.0.3";

interface UseNavigationGuardsOptions {
  /** Current form data — serialized for dirty-checking via JSON.stringify */
  formData: unknown;
  /** Stable case identifier — snapshot resets when this changes (new case loaded) */
  caseId: string;
  /** Autosave handle so we can call forceSave() on explicit save */
  autosave: { forceSave: () => void };
}

interface UseNavigationGuardsReturn {
  // --- State ---
  isFormDirty: boolean;
  isManualSaving: boolean;
  lastSavedTime: Date | null;
  showUnsavedChangesDialog: boolean;

  // --- Actions ---
  /** Wrap a navigation callback with an unsaved-changes guard */
  guardedNavigate: (navigateFn: (() => void) | undefined) => void;
  /** Trigger an explicit save (no-op if not dirty or already saving) */
  handleManualSave: () => void;
  /** "Save & Continue" handler for the unsaved-changes dialog */
  handleSaveAndNavigate: () => void;
  /** "Discard & Continue" handler for the unsaved-changes dialog */
  handleDiscardAndNavigate: () => void;
  /**
   * Mark the current form state as "saved" — resets dirty flag, updates
   * snapshot, records timestamp.  Called by submit / transition handlers
   * that do their own persistence before navigating away.
   */
  markAsSaved: () => void;
  /** Cancel a pending guarded navigation (e.g. when dialog is dismissed) */
  cancelPendingNavigation: () => void;
  /** Directly set dirty flag (e.g. to force-clear after a discard) */
  setIsFormDirty: (dirty: boolean) => void;
  /** Dismiss the unsaved-changes dialog without navigating */
  setShowUnsavedChangesDialog: (show: boolean) => void;
}

export function useNavigationGuards({
  formData,
  caseId,
  autosave,
}: UseNavigationGuardsOptions): UseNavigationGuardsReturn {
  // --- State ---
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const savedFormSnapshotRef = useRef<string>("");

  // --- Effects ---

  // Set the saved snapshot when form is first loaded with case data
  useEffect(() => {
    if (caseId && caseId !== "") {
      // Small delay to let initial data settle before taking snapshot
      const timer = setTimeout(() => {
        savedFormSnapshotRef.current = JSON.stringify(formData);
        setIsFormDirty(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [caseId]); // Only re-snapshot when case ID changes (new case loaded)

  // Track dirty state by comparing current form data to last saved snapshot
  useEffect(() => {
    if (!savedFormSnapshotRef.current) return;
    const currentSnapshot = JSON.stringify(formData);
    const dirty = currentSnapshot !== savedFormSnapshotRef.current;
    setIsFormDirty(dirty);
  }, [formData]);

  // Browser tab close/refresh protection when dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFormDirty]);

  // --- Handlers ---

  // Mark current form state as clean (updates snapshot + timestamp)
  const markAsSaved = useCallback(() => {
    autosave.forceSave();
    savedFormSnapshotRef.current = JSON.stringify(formData);
    setIsFormDirty(false);
    setLastSavedTime(new Date());
  }, [formData, autosave]);

  // Explicit save button handler
  const handleManualSave = useCallback(() => {
    if (!isFormDirty || isManualSaving) return;

    setIsManualSaving(true);

    // Simulate save latency for realism, then persist
    setTimeout(() => {
      autosave.forceSave();
      savedFormSnapshotRef.current = JSON.stringify(formData);
      setIsFormDirty(false);
      setLastSavedTime(new Date());
      setIsManualSaving(false);
      toast.success("Changes saved successfully");
    }, 400);
  }, [isFormDirty, isManualSaving, formData, autosave]);

  // Navigation guard: intercept navigation when dirty
  const guardedNavigate = useCallback(
    (navigateFn: (() => void) | undefined) => {
      if (!navigateFn) return;
      if (isFormDirty) {
        pendingNavigationRef.current = navigateFn;
        setShowUnsavedChangesDialog(true);
      } else {
        navigateFn();
      }
    },
    [isFormDirty]
  );

  // Handle "Save & Continue" from unsaved changes dialog
  const handleSaveAndNavigate = useCallback(() => {
    setIsManualSaving(true);
    setTimeout(() => {
      autosave.forceSave();
      savedFormSnapshotRef.current = JSON.stringify(formData);
      setIsFormDirty(false);
      setLastSavedTime(new Date());
      setIsManualSaving(false);
      setShowUnsavedChangesDialog(false);
      if (pendingNavigationRef.current) {
        pendingNavigationRef.current();
        pendingNavigationRef.current = null;
      }
    }, 400);
  }, [formData, autosave]);

  // Cancel a pending guarded navigation without navigating
  const cancelPendingNavigation = useCallback(() => {
    pendingNavigationRef.current = null;
  }, []);

  // Handle "Discard & Continue" from unsaved changes dialog
  const handleDiscardAndNavigate = useCallback(() => {
    setIsFormDirty(false);
    setShowUnsavedChangesDialog(false);
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    }
  }, []);

  return {
    isFormDirty,
    isManualSaving,
    lastSavedTime,
    showUnsavedChangesDialog,
    guardedNavigate,
    handleManualSave,
    handleSaveAndNavigate,
    handleDiscardAndNavigate,
    markAsSaved,
    cancelPendingNavigation,
    setIsFormDirty,
    setShowUnsavedChangesDialog,
  };
}
