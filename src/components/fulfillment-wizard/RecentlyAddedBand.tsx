/**
 * RecentlyAddedBand
 *
 * Transient confirmation banner above the workspace cards list. Surfaces the
 * just-added service(s) so the user doesn't have to scroll to the bottom to
 * confirm — a fix for the per-identifier UX issue with 22+ services.
 *
 * Auto-dismisses after 5 seconds; resets the timer on every new add (when the
 * `addToken` prop changes), so rapid sequential adds keep the band fresh.
 *
 * Displays nothing when there's no recent add (empty `lastAddedSummary`).
 */

import * as React from "react";
import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarActions,
  Button,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

const AUTO_DISMISS_MS = 5000;

export interface RecentlyAddedBandProps {
  /** Headline text, e.g. "Just added: Minecraft (1 data category)". Pass empty string to hide the band. */
  lastAddedSummary: string;
  /** Increment / change this each time a new add fires; restarts the dismiss timer. */
  addToken: number | string;
  /** Optional: scroll to / focus the just-added service when the user clicks "Jump to". */
  onJumpTo?: () => void;
}

const useStyles = makeStyles({
  band: {
    marginBottom: tokens.spacingVerticalS,
  },
});

export function RecentlyAddedBand({
  lastAddedSummary,
  addToken,
  onJumpTo,
}: RecentlyAddedBandProps) {
  const styles = useStyles();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!lastAddedSummary) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const handle = window.setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(handle);
    // We deliberately depend on addToken — every new add restarts the timer.
  }, [addToken, lastAddedSummary]);

  if (!visible || !lastAddedSummary) {
    return null;
  }

  return (
    <MessageBar
      className={styles.band}
      intent="success"
      politeness="polite"
    >
      <MessageBarBody>
        <MessageBarTitle>Just added</MessageBarTitle>
        {lastAddedSummary}
      </MessageBarBody>
      {onJumpTo && (
        <MessageBarActions>
          <Button appearance="transparent" size="small" onClick={onJumpTo}>
            Jump to
          </Button>
        </MessageBarActions>
      )}
    </MessageBar>
  );
}
