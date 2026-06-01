/**
 * usePaneVisibility — hide/show toggle hook for resizable side panes.
 *
 * Companion to [useResizablePaneWidth]. When the pane is hidden the user's
 * saved width is preserved so re-showing returns the pane to whatever width
 * they last dragged to. Mirrors the Teams "Hide channel list" pattern where
 * the secondary pane collapses off-canvas rather than shrinking to icons.
 *
 * Persists per-user via the supplied localStorage key so the choice
 * round-trips across sessions.
 *
 * Generic by design — usable for the WorkflowListPane, Document panel,
 * Identifier panel, and any future collapsible side surface.
 */
import { useCallback, useEffect, useState } from "react";

export interface PaneVisibilityOptions {
  /** localStorage key for persistence (e.g. "dars.workflowListPane.visible"). */
  storageKey: string;
  /** Initial visibility when no stored value exists. Defaults to true. */
  defaultVisible?: boolean;
}

export interface PaneVisibility {
  visible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  /** useState-compatible setter so this hook can drop into call sites that
   *  currently use `const [open, setOpen] = useState(false)` without
   *  rewriting every `setOpen(...)` call. */
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export function usePaneVisibility({
  storageKey,
  defaultVisible = true,
}: PaneVisibilityOptions): PaneVisibility {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "true") return true;
      if (raw === "false") return false;
    } catch {
      /* localStorage may be blocked */
    }
    return defaultVisible;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, visible ? "true" : "false");
    } catch {
      /* localStorage may be blocked */
    }
  }, [visible, storageKey]);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible((v) => !v), []);

  return { visible, show, hide, toggle, setVisible };
}

/**
 * usePersistedBoolean — useState-shaped sugar over usePaneVisibility.
 *
 * Use this when migrating an existing `useState(false)` boolean to a
 * persisted state with the smallest possible diff. The return tuple has
 * the exact shape of `useState<boolean>()`, so every existing call site
 * (`setOpen(true)`, `setOpen(prev => !prev)`) keeps working unchanged.
 */
export function usePersistedBoolean(
  storageKey: string,
  defaultValue = false,
): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const { visible, setVisible } = usePaneVisibility({
    storageKey,
    defaultVisible: defaultValue,
  });
  return [visible, setVisible];
}
