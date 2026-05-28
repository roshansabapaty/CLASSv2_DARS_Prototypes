/**
 * StatusAnnouncer — single shared `aria-live` region for the case page.
 *
 * Mount once at a high-level slot (case-page root). Consumers obtain
 * the `announce(message, opts?)` function via `useStatusAnnouncer()`.
 * Calling it injects a message into the polite live region; the
 * underlying `<div role="status" aria-live="polite" aria-atomic="true">`
 * is visually hidden but read by screen readers.
 *
 * Pattern guidance:
 *   - `politeness: "polite"` (default) → routine state changes
 *     (pipeline progress, panel open / close, save complete).
 *   - `politeness: "assertive"` → urgent / disruptive (validation
 *     errors, blocking failures). Use sparingly.
 *
 * Debouncing: rapid bursts of identical messages collapse into a single
 * announcement to avoid screen-reader spam. Different messages within
 * 50ms are still announced.
 */

import * as React from "react";

type Politeness = "polite" | "assertive";

interface AnnounceOptions {
  /** Override the default polite live region. */
  politeness?: Politeness;
}

interface AnnouncerContextValue {
  announce: (message: string, options?: AnnounceOptions) => void;
}

const StatusAnnouncerContext = React.createContext<AnnouncerContextValue | null>(
  null,
);

const HIDDEN_STYLE: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

interface StatusAnnouncerProps {
  children: React.ReactNode;
}

export function StatusAnnouncer({ children }: StatusAnnouncerProps) {
  const [politeMessage, setPoliteMessage] = React.useState("");
  const [assertiveMessage, setAssertiveMessage] = React.useState("");
  const lastMessageRef = React.useRef<{ msg: string; at: number }>({
    msg: "",
    at: 0,
  });

  const announce = React.useCallback(
    (message: string, options?: AnnounceOptions) => {
      if (!message) return;
      // Collapse rapid duplicates (within 600ms) — common when a status
      // is recomputed by several React effects in the same tick.
      const now = Date.now();
      if (
        lastMessageRef.current.msg === message &&
        now - lastMessageRef.current.at < 600
      ) {
        return;
      }
      lastMessageRef.current = { msg: message, at: now };

      const politeness: Politeness = options?.politeness ?? "polite";
      // Force a state change even when the message text is identical to
      // the previous one — appending and immediately clearing a
      // zero-width space gives the SR a fresh node to read.
      if (politeness === "assertive") {
        setAssertiveMessage("");
        requestAnimationFrame(() => setAssertiveMessage(message));
      } else {
        setPoliteMessage("");
        requestAnimationFrame(() => setPoliteMessage(message));
      }
    },
    [],
  );

  const value = React.useMemo(() => ({ announce }), [announce]);

  return (
    <StatusAnnouncerContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={HIDDEN_STYLE}
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={HIDDEN_STYLE}
      >
        {assertiveMessage}
      </div>
    </StatusAnnouncerContext.Provider>
  );
}

/**
 * Returns `{ announce }` for components inside a `<StatusAnnouncer>`.
 * Falls back to a no-op when called outside the provider so callers
 * never need a null-check; missing wiring just means the announcement
 * silently doesn't fire (useful during incremental rollout).
 */
export function useStatusAnnouncer(): AnnouncerContextValue {
  const ctx = React.useContext(StatusAnnouncerContext);
  if (ctx) return ctx;
  return NOOP_CONTEXT;
}

const NOOP_CONTEXT: AnnouncerContextValue = {
  announce: () => {
    /* no-op when outside a provider */
  },
};
