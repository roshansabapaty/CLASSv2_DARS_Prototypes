/**
 * CorrespondenceThreads — body region of the chat-thread side panel.
 * Renders the active tab's items in chronological order (oldest top,
 * newest bottom) with day-grouping headers between bubbles where the
 * `createdAt` date changes. Auto-scrolls to the bottom on tab switch
 * and when a new item is appended to the active thread.
 */

import * as React from "react";
import { Caption1, makeStyles, tokens } from "@fluentui/react-components";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import {
  CorrespondenceMessageBubble,
} from "./CorrespondenceMessageBubble";
import type {
  CorrespondenceAttachment,
  CorrespondenceItem,
} from "../../types/correspondence";

// Thread body visuals aligned with the Fluent AI Chat showcase — a
// quieter surface tone behind the bubbles, a small inline day-pill
// nestled between hairline rules instead of a solid chip, and balanced
// vertical rhythm so successive messages from the same speaker on the
// same day breathe.
const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalSNudge,
    flex: "1 1 auto",
    overflowY: "auto",
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  // Day chip — Fluent AI Chat showcase uses a small caption nested in a
  // horizontal hairline. Replicated here with two thin rules + a centered
  // pill.
  dayHeaderRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  dayHeaderRule: {
    flex: "1 1 auto",
    height: "1px",
    backgroundColor: tokens.colorNeutralStroke2,
  },
  dayHeader: {
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  empty: {
    flex: "1 1 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: tokens.colorNeutralForeground3,
    rowGap: tokens.spacingVerticalS,
  },
});

function dayHeaderLabel(d: Date): string {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

export interface CorrespondenceThreadsProps {
  /** The items in the currently-active thread, sorted ascending. */
  items: CorrespondenceItem[];
  /** Live region — announces new messages for screen readers. */
  ariaLiveLabel?: string;
  /** Opens the bubble detail flyout (Phase 1 — caller may stub). */
  onBubbleClick?: (item: CorrespondenceItem) => void;
  /** Opens FormPreviewPanel for an outbound's `formInstanceId` or for an
   *  inbound `structuredForm` (caller hydrates the read view). */
  onViewForm?: (instanceIdOrInboundId: string) => void;
  /** Opens an attachment preview dialog. The caller decides how to
   *  render image / text / generic file content. */
  onViewAttachment?: (
    attachment: CorrespondenceAttachment,
    item: CorrespondenceItem,
  ) => void;
  /** Called when the RS clicks the inline "Reply with …" CTA on an
   *  inbound RFI bubble. Forwards to the composer so the PAI template
   *  attaches with `inReplyTo` pointing at this item. */
  onReplyWithTemplate?: (templateId: string, inReplyToId: string) => void;
  /** When set, the Form 3 outbound bubble whose id matches
   *  `eaRejectedForm3Id` renders an additional "Retract Form 3" action.
   *  Combined with `onRetractForm3` so the bubble can act as a second
   *  entry point alongside the pinned banner. */
  eaRejectedForm3Id?: string;
  /** True when the retract is gated by attorney review — the bubble
   *  action disables and shows the gate reason. */
  retractDisabled?: boolean;
  retractGateReason?: string;
  /** Fires when the RS clicks the bubble's Retract Form 3 action. */
  onRetractForm3?: () => void;
}

export function CorrespondenceThreads({
  items,
  ariaLiveLabel,
  onBubbleClick,
  onViewForm,
  onViewAttachment,
  onReplyWithTemplate,
  eaRejectedForm3Id,
  retractDisabled,
  retractGateReason,
  onRetractForm3,
}: CorrespondenceThreadsProps) {
  const styles = useStyles();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on items length change (a new message landed)
  // or on initial mount.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Defer to next paint so bubble heights are computed first.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>
          <Caption1>No messages in this thread yet.</Caption1>
        </div>
      </div>
    );
  }

  // Interleave day-header chips between items whenever the date changes.
  // The chip itself is centered inside a row of hairline rules — the
  // FAI Showcase Chat pattern — so the date feels nested in the
  // conversation rather than dropped on top.
  const rendered: React.ReactNode[] = [];
  let previousDate: Date | undefined;
  for (const item of items) {
    const itemDate = new Date(item.createdAt);
    if (!previousDate || !isSameDay(previousDate, itemDate)) {
      rendered.push(
        <div
          key={`day-${itemDate.toISOString()}`}
          className={styles.dayHeaderRow}
          role="separator"
          aria-label={dayHeaderLabel(itemDate)}
        >
          <span className={styles.dayHeaderRule} aria-hidden="true" />
          <Caption1 className={styles.dayHeader}>
            {dayHeaderLabel(itemDate)}
          </Caption1>
          <span className={styles.dayHeaderRule} aria-hidden="true" />
        </div>,
      );
    }
    const isEaRejectedForm3 = Boolean(
      eaRejectedForm3Id && item.id === eaRejectedForm3Id,
    );
    rendered.push(
      <CorrespondenceMessageBubble
        key={item.id}
        item={item}
        onClick={onBubbleClick}
        onViewForm={onViewForm}
        onViewAttachment={onViewAttachment}
        onReplyWithTemplate={onReplyWithTemplate}
        eaRejected={isEaRejectedForm3}
        retractDisabled={retractDisabled}
        retractGateReason={retractGateReason}
        onRetractForm3={isEaRejectedForm3 ? onRetractForm3 : undefined}
      />,
    );
    previousDate = itemDate;
  }

  return (
    <div
      ref={scrollRef}
      className={styles.root}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label={ariaLiveLabel ?? "Correspondence thread"}
    >
      {rendered}
    </div>
  );
}
