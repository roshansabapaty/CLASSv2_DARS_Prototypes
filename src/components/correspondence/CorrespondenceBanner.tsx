/**
 * CorrespondenceBanner — single discoverability strip above the case body.
 *
 * Tier 2 UX-Polish follow-up: this used to ship alongside a separate
 * `CorrespondenceUnreadAlert`, but the pair stacked two MessageBars that
 * both said "open the Hub" — just at different visual weights. The two
 * have been merged here: the banner branches on unread state and morphs
 * between two presentations in the same physical row, so unread arrivals
 * don't push the page down by a banner-height each time.
 *
 *   unread === 0  → intent="info"    · "Correspondence Hub"
 *   unread > 0    → intent="warning" · "N unread message(s) from the authority"
 *
 * The pending-acknowledgement badge rides along in both states.
 */

import * as React from "react";
import {
  Badge,
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowExpandRegular,
  ChatMultiple20Regular,
  Mail20Regular,
} from "@fluentui/react-icons";
import {
  pendingOutboxCount,
  unreadInboxCount,
} from "./correspondenceEngine";
import { isInbound, type CorrespondenceItem } from "../../types/correspondence";

const useStyles = makeStyles({
  badgeRow: {
    display: "inline-flex",
    columnGap: tokens.spacingHorizontalXS,
    marginLeft: tokens.spacingHorizontalS,
  },
});

const DEFAULT_COPY =
  "Correspondence with Authority — receive and send formal communications " +
  "with the issuing or enforcing authority for this case.";

const UNREAD_COPY =
  "New correspondence has arrived for this case. Open the Hub to read, " +
  "reply, or set follow-up reminders.";

export interface CorrespondenceBannerProps {
  items: CorrespondenceItem[] | undefined;
  /** Override the default banner copy (idle state only). */
  copy?: string;
  /** Open the parent-controlled CorrespondencePanel side panel. */
  onOpenPanel: () => void;
  /** Mark a single inbound item read. Required for the unread-state
   *  "Mark all read" action to appear. */
  onMarkInboundRead?: (itemId: string) => void;
}

export function CorrespondenceBanner({
  items,
  copy = DEFAULT_COPY,
  onOpenPanel,
  onMarkInboundRead,
}: CorrespondenceBannerProps) {
  const styles = useStyles();

  const unread = unreadInboxCount(items);
  const pending = pendingOutboxCount(items);
  const hasUnread = unread > 0;

  const markAllRead = () => {
    if (!items || !onMarkInboundRead) return;
    for (const item of items) {
      if (isInbound(item) && !item.readAt) {
        onMarkInboundRead(item.id);
      }
    }
  };

  // Idle = info bar; unread = warning bar. `role` flips so screen readers
  // get an assertive announcement only when there is actually new mail.
  const intent: "info" | "warning" = hasUnread ? "warning" : "info";
  const role = hasUnread ? "alert" : "status";

  const Icon = hasUnread ? Mail20Regular : ChatMultiple20Regular;
  const title = hasUnread
    ? `${unread} unread message${unread === 1 ? "" : "s"} from the authority`
    : "Correspondence Hub";
  const body = hasUnread ? UNREAD_COPY : copy;

  return (
    <MessageBar intent={intent} role={role}>
      <MessageBarBody>
        <MessageBarTitle>
          <Icon style={{ verticalAlign: "text-bottom", marginRight: 6 }} />
          {title}
        </MessageBarTitle>
        {body}
        <span className={styles.badgeRow}>
          {/* Show the unread count badge only in the idle state — when
              we morph to the unread variant the headline already states
              the count, so the chip would be redundant. */}
          {!hasUnread && unread > 0 && (
            <Badge size="small" appearance="filled" color="brand">
              {unread} unread
            </Badge>
          )}
          {pending > 0 && (
            <Badge size="small" appearance="filled" color="warning">
              {pending} acknowledgement pending
            </Badge>
          )}
        </span>
      </MessageBarBody>
      <MessageBarActions>
        {hasUnread && onMarkInboundRead && (
          <Button size="small" appearance="secondary" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
        <Button
          appearance="primary"
          size="small"
          icon={<ArrowExpandRegular />}
          onClick={onOpenPanel}
        >
          Open Hub
        </Button>
      </MessageBarActions>
    </MessageBar>
  );
}
