/**
 * CorrespondenceThreadTabs — horizontal tab strip at the top of the
 * Correspondence side panel. Each tab is one conversation thread,
 * derived from `groupCorrespondenceIntoThreads`.
 *
 * The "+ New thread" CTA now lives in the panel header (see
 * CorrespondencePanel) rather than inline at the end of the strip — it
 * was blocking access to the right-most thread tabs when several
 * conversations were open. The strip now spans the full panel width
 * with horizontal scroll for overflow.
 *
 * Built on Fluent v9 `TabList` / `Tab` so keyboard nav and a11y
 * announcements come for free.
 */

import * as React from "react";
import {
  Badge,
  Button,
  Tab,
  TabList,
  Tooltip,
  type SelectTabData,
  type SelectTabEvent,
  type TabValue,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  DocumentText20Regular,
  ShieldCheckmark20Regular,
  Question20Regular,
  CheckmarkCircle20Regular,
  Warning20Regular,
  Mail20Regular,
  Attach20Regular,
  Comment20Regular,
  Dismiss12Regular,
} from "@fluentui/react-icons";
import type {
  CorrespondenceThreadGroup,
  CorrespondenceThreadIconKey,
} from "./correspondenceEngine";

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground1,
    overflowX: "auto",
  },
  tabList: {
    flex: "1 1 auto",
    minWidth: 0,
  },
  tabLabel: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
  },
  unreadDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: tokens.colorStatusDangerForeground1,
    flexShrink: 0,
  },
  emptyState: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

function iconFor(key: CorrespondenceThreadIconKey): React.ReactNode {
  switch (key) {
    case "form3":
      return <DocumentText20Regular aria-hidden="true" />;
    case "form5":
      return <ShieldCheckmark20Regular aria-hidden="true" />;
    case "request-info":
      return <Question20Regular aria-hidden="true" />;
    case "ack":
      return <CheckmarkCircle20Regular aria-hidden="true" />;
    case "withdrawal":
      return <Warning20Regular aria-hidden="true" />;
    case "attachment":
      return <Attach20Regular aria-hidden="true" />;
    case "free-text":
      return <Mail20Regular aria-hidden="true" />;
    case "other":
    default:
      return <Comment20Regular aria-hidden="true" />;
  }
}

/** Sentinel tab value used for the "+ New thread" pseudo-tab. */
export const NEW_THREAD_TAB_VALUE = "__new_thread__";

export interface CorrespondenceThreadTabsProps {
  threads: CorrespondenceThreadGroup[];
  /** Currently selected tab — either a thread `rootId` or the
   *  `NEW_THREAD_TAB_VALUE` sentinel. */
  selectedValue: string;
  onSelect: (value: string) => void;
  /** When provided, the strip renders ONLY threads whose `rootId` is
   *  in this list — matches the DocumentViewerPanel pattern where the
   *  user explicitly opens tabs from a picker rather than seeing every
   *  thread by default. Pass `undefined` to render every thread (legacy
   *  behaviour). */
  openThreadIds?: string[];
  /** When provided, each tab gets a close button that removes the
   *  thread from `openThreadIds`. Only rendered for real threads —
   *  the New-thread pseudo-tab is uncloseable. */
  onCloseThread?: (rootId: string) => void;
}

export function CorrespondenceThreadTabs({
  threads,
  selectedValue,
  onSelect,
  openThreadIds,
  onCloseThread,
}: CorrespondenceThreadTabsProps) {
  const styles = useStyles();

  const handleTabSelect = (_e: SelectTabEvent, data: SelectTabData) => {
    onSelect(String(data.value));
  };

  // When the user has opted into the "+ New thread" pseudo-tab from the
  // header CTA, also surface it as a Tab in the strip so the selection
  // is visible. The tab disappears once the user picks a real thread.
  const showNewThreadTab = selectedValue === NEW_THREAD_TAB_VALUE;

  // When `openThreadIds` is provided, the strip renders only the
  // threads the user has explicitly opened from the picker. This is
  // the DocumentViewerPanel-style multi-tab pattern. Falling back to
  // every thread preserves the legacy always-show-all behaviour for
  // any caller that still passes `undefined`.
  const tabsToRender = openThreadIds
    ? threads.filter((t) => openThreadIds.includes(t.rootId))
    : threads;

  if (tabsToRender.length === 0 && !showNewThreadTab) {
    return (
      <div className={styles.root}>
        <span className={styles.emptyState}>
          {threads.length === 0
            ? "No threads yet — use the New thread button above to start one."
            : "No threads open. Pick one from the dropdown above to open it as a tab."}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <TabList
        className={styles.tabList}
        selectedValue={selectedValue as TabValue}
        onTabSelect={handleTabSelect}
        size="small"
      >
        {tabsToRender.map((thread) => (
          <Tab
            key={thread.rootId}
            value={thread.rootId}
            aria-label={`${thread.label}${thread.unreadInboundCount > 0 ? `, ${thread.unreadInboundCount} unread` : ""}${thread.awaitingReply ? ", awaiting reply" : ""}`}
          >
            <span className={styles.tabLabel}>
              {iconFor(thread.iconKey)}
              <span>{thread.label}</span>
              {thread.unreadInboundCount > 0 && (
                <span
                  className={styles.unreadDot}
                  role="img"
                  aria-label={`${thread.unreadInboundCount} unread inbound`}
                />
              )}
              {thread.pendingOutboundCount > 0 && (
                <Badge appearance="filled" color="informative" size="small">
                  {thread.pendingOutboundCount}
                </Badge>
              )}
              {thread.awaitingReply && (
                <Badge appearance="outline" color="warning" size="small">
                  Awaiting reply
                </Badge>
              )}
              {onCloseThread && (
                <Tooltip
                  content={`Close ${thread.label}`}
                  relationship="label"
                >
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<Dismiss12Regular />}
                    aria-label={`Close ${thread.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseThread(thread.rootId);
                    }}
                    style={{
                      minWidth: "20px",
                      width: "20px",
                      height: "20px",
                      padding: 0,
                      marginLeft: tokens.spacingHorizontalXXS,
                    }}
                  />
                </Tooltip>
              )}
            </span>
          </Tab>
        ))}
        {showNewThreadTab && (
          <Tab value={NEW_THREAD_TAB_VALUE} aria-label="New thread (composing)">
            <span className={styles.tabLabel}>
              <span>New thread</span>
            </span>
          </Tab>
        )}
      </TabList>
    </div>
  );
}
