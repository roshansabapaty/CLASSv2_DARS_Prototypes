/**
 * CorrespondenceThreadPicker — dropdown that lets the RS pick which
 * threads to open in the Correspondence Hub.
 *
 * Mirrors the DocumentViewerPanel's "Select from N attached documents"
 * dropdown: the user opens the panel, picks one or more threads from
 * the list to open as tabs, and can close them individually later.
 * Threads already open are flagged with an "Open" badge so the user
 * knows which ones are already in the tab strip; clicking one that's
 * already open simply re-activates that tab.
 *
 * The list shows:
 *   • Thread label (derived from `groupCorrespondenceIntoThreads`)
 *   • Unread inbound badge (count of unread messages in the thread)
 *   • Awaiting-reply chip
 *   • Open badge when the thread is already in `openThreadIds`
 *
 * Sort controls let the RS order the list by:
 *   • `createdDate` — the thread's root item creation timestamp
 *   • `receivedDate` — the most recent INBOUND item's timestamp (the
 *     "last document the authority submitted in the thread"). Threads
 *     with no inbound items sort to the bottom in this mode.
 */

import * as React from "react";
import {
  Badge,
  Button,
  Label,
  Select,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ChatAdd20Regular,
  ChatMultiple20Regular,
  Mail20Regular,
} from "@fluentui/react-icons";
import { format } from "date-fns";
import type { CorrespondenceThreadGroup } from "./correspondenceEngine";

export type ThreadSortMode = "createdDate" | "receivedDate";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  label: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  sortGroup: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
  },
  picker: {
    minWidth: "260px",
    flex: "1 1 auto",
  },
  // Each <option> renders as flat text in the native Select — we can't
  // place arbitrary JSX inside. Build a richer label string with
  // unread + open markers instead.
});

export interface CorrespondenceThreadPickerProps {
  threads: CorrespondenceThreadGroup[];
  openThreadIds: string[];
  /** Fires when the user picks a thread from the dropdown. The panel
   *  appends the id to `openThreadIds` (if not already open) and
   *  activates it. */
  onOpenThread: (rootId: string) => void;
  sortMode: ThreadSortMode;
  onSortModeChange: (mode: ThreadSortMode) => void;
  /** Optional — when provided, the picker header renders a "+ New
   *  thread" CTA. Co-locates the create-thread action with the rest
   *  of the thread-discovery chrome and keeps it away from the
   *  panel's Close X (which previously sat right next to the New
   *  thread button and risked accidental clicks). */
  onNewThread?: () => void;
  /** Visual cue that the New-thread pseudo-tab is currently active. */
  isNewThreadActive?: boolean;
}

export function CorrespondenceThreadPicker({
  threads,
  openThreadIds,
  onOpenThread,
  sortMode,
  onSortModeChange,
  onNewThread,
  isNewThreadActive,
}: CorrespondenceThreadPickerProps) {
  const styles = useStyles();

  // Sort threads per the user's choice. Created-date sort uses the
  // thread root's `createdAt`. Received-date sort uses the latest
  // inbound; threads with no inbound items sort to the bottom.
  const sortedThreads = React.useMemo(() => {
    const copy = [...threads];
    if (sortMode === "createdDate") {
      copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else {
      copy.sort((a, b) => {
        const aTime = a.lastReceivedAt?.getTime() ?? -Infinity;
        const bTime = b.lastReceivedAt?.getTime() ?? -Infinity;
        return bTime - aTime;
      });
    }
    return copy;
  }, [threads, sortMode]);

  const openSet = React.useMemo(() => new Set(openThreadIds), [openThreadIds]);

  // Build the option label. Native <option> only renders text, so we
  // encode unread / awaiting-reply / open state as prefix/suffix glyphs
  // + counts in the label string. Screen readers read the whole label
  // verbatim, which gives the same context.
  const labelForThread = (thread: CorrespondenceThreadGroup): string => {
    const parts: string[] = [];
    if (openSet.has(thread.rootId)) parts.push("● Open");
    if (thread.unreadInboundCount > 0) {
      parts.push(
        `📩 ${thread.unreadInboundCount} unread`,
      );
    }
    if (thread.awaitingReply) parts.push("⏳ Awaiting reply");
    const ts =
      sortMode === "createdDate"
        ? format(thread.createdAt, "MMM d, yyyy")
        : thread.lastReceivedAt
          ? format(thread.lastReceivedAt, "MMM d, yyyy")
          : "no inbound";
    const suffix = parts.length > 0 ? `  ·  ${parts.join("  ·  ")}` : "";
    return `${thread.label}  ·  ${ts}${suffix}`;
  };

  const handlePick = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (!value) return;
    onOpenThread(value);
    // Reset the picker so the placeholder shows again — lets the user
    // re-open the same thread later if they close it.
    event.target.value = "";
  };

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <Label htmlFor="thread-picker" className={styles.label}>
          Available threads ({threads.length})
        </Label>
        <div className={styles.sortGroup}>
          {onNewThread && (
            // New thread CTA — co-located with thread discovery, far
            // from the panel's Close X. Primary button so it reads as
            // the principal "make something happen" action when the
            // picker is the focal point.
            <Tooltip content="Start a new thread" relationship="label">
              <Button
                appearance="primary"
                size="small"
                icon={<ChatAdd20Regular />}
                onClick={onNewThread}
                aria-label="Start a new thread"
                aria-pressed={isNewThreadActive}
              >
                New thread
              </Button>
            </Tooltip>
          )}
          <Label htmlFor="thread-sort" className={styles.label}>
            Sort by
          </Label>
          <Select
            id="thread-sort"
            size="small"
            value={sortMode}
            onChange={(_e, data) =>
              onSortModeChange((data.value as ThreadSortMode) ?? "createdDate")
            }
          >
            <option value="createdDate">Created date</option>
            <option value="receivedDate">Received date</option>
          </Select>
        </div>
      </div>
      <Select
        id="thread-picker"
        className={styles.picker}
        // The native <select> doesn't have a "no value" controlled mode
        // by default — leave it uncontrolled and reset to "" in onChange.
        defaultValue=""
        onChange={handlePick}
        aria-label={`Open a thread. ${openThreadIds.length} of ${threads.length} threads currently open.`}
      >
        <option value="" disabled>
          {threads.length === 0
            ? "No threads yet — start one from the header"
            : `Select from ${threads.length} thread${threads.length === 1 ? "" : "s"}`}
        </option>
        {sortedThreads.map((thread) => (
          <option key={thread.rootId} value={thread.rootId}>
            {labelForThread(thread)}
          </option>
        ))}
      </Select>
    </div>
  );
}
