/**
 * CorrespondenceMessageBubble — single bubble in the chat-thread side
 * panel. Visual language aligned with Microsoft's Fluent AI Chat
 * showcase:
 *   https://apps.1js.microsoft.com/azurestaticapps/fai-documentation/storybook/index.html?path=/docs/showcase-chat--docs
 *
 * Direction-aware layout — avatar on the message's side, sender + time
 * inline header above the body, soft rounded container, calm palette
 * driven by Fluent tokens (no hard-coded rails or saturated borders).
 *
 *   Inbound  → avatar on left, body anchored left, neutral background.
 *   Outbound → avatar on right, body anchored right, brand-tinted
 *              background.
 *
 * Three independent accessibility channels — token-derived background
 * contrast, alignment, and a directional icon prefix — so direction is
 * communicated without relying on color alone. An aria-label on every
 * bubble names the direction + counterparty + date for screen readers.
 *
 * For attachments and form instances the bubble renders inline chips +
 * a "View" affordance. Outbound bubbles surface the transmission
 * lifecycle (Sent / Delivered / Acknowledged / Responded / Failed) and
 * the "Awaiting attorney review" sub-pill when the Attorney Escalation
 * toggle was used at send time.
 */

import * as React from "react";
import {
  Avatar,
  Badge,
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  MailArrowDown20Regular,
  MailArrowUp20Regular,
  DocumentText20Regular,
  Attach20Regular,
  Scales20Regular,
  ShieldProhibited20Regular,
  ArrowReply20Regular,
  ArrowUndo20Regular,
  CheckmarkCircle20Filled,
  MoreVertical20Regular,
  ErrorCircle20Regular,
  Warning20Regular,
} from "@fluentui/react-icons";
import { readRespondedByOutbound } from "../../types/correspondence";
import { format } from "date-fns";
import {
  isInbound,
  isOutbound,
  type CorrespondenceAttachment,
  type CorrespondenceItem,
  type InboundCorrespondenceItem,
  type OutboundCorrespondenceItem,
} from "../../types/correspondence";

// Visual language aligned with the Fluent AI Chat showcase:
//  - Backgrounds derive from `tokens.colorNeutralBackground3` / `colorBrandBackground2`
//    so they ride the active theme and remain calm against the panel surface.
//  - No coloured rails; the bubble's container alone communicates the
//    direction via background tone + alignment + the small icon prefix.
//  - Outer shadow swapped for a 1px hairline border (the showcase uses
//    very subtle separators, not drop shadows, between chat messages).
const useStyles = makeStyles({
  row: {
    display: "flex",
    columnGap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    alignItems: "flex-start",
  },
  rowInbound: {
    justifyContent: "flex-start",
  },
  rowOutbound: {
    flexDirection: "row-reverse",
  },
  // The avatar column. Pinned to top so multi-line bubbles align cleanly.
  avatarColumn: {
    flexShrink: 0,
    paddingTop: tokens.spacingVerticalXXS,
  },
  bubble: {
    maxWidth: "min(380px, 78%)",
    borderRadius: tokens.borderRadiusXLarge,
    paddingTop: tokens.spacingVerticalSNudge,
    paddingBottom: tokens.spacingVerticalSNudge,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    borderWidth: "1px",
    borderStyle: "solid",
  },
  bubbleInbound: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderColor: tokens.colorNeutralStroke2,
    color: tokens.colorNeutralForeground1,
    // Asymmetric corner radius matches the FAI showcase — the corner
    // pointing at the avatar is squared off slightly so the bubble feels
    // anchored to the speaker.
    borderTopLeftRadius: tokens.borderRadiusMedium,
  },
  bubbleOutbound: {
    backgroundColor: tokens.colorBrandBackground2,
    borderColor: tokens.colorBrandStroke2,
    color: tokens.colorNeutralForeground1,
    borderTopRightRadius: tokens.borderRadiusMedium,
  },
  bubbleClickable: {
    cursor: "pointer",
    ":hover": {
      borderColor: tokens.colorBrandStroke1,
    },
    ":focus-visible": {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
    },
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    flexWrap: "wrap",
    rowGap: tokens.spacingVerticalXXS,
  },
  directionIcon: {
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  senderName: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  timestamp: {
    color: tokens.colorNeutralForeground3,
  },
  subject: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  body: {
    color: tokens.colorNeutralForeground2,
    whiteSpace: "pre-wrap",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
  },
  attachments: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: tokens.spacingHorizontalXS,
    rowGap: tokens.spacingVerticalXS,
  },
  attachmentChip: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      borderColor: tokens.colorBrandStroke1,
      color: tokens.colorBrandForeground1,
    },
    ":focus-visible": {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
    },
  },
  formPill: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorBrandForeground1,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    cursor: "pointer",
    fontWeight: tokens.fontWeightSemibold,
    ":hover": {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
    ":disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    ":focus-visible": {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
    },
  },
  // "Replied ✓" confirmation chip — replaces the inline Reply CTA on
  // inbound RFI bubbles once a PAI has been sent in reply. Chip + the
  // overflow menu trigger sit together so the chip carries the status
  // signal and the menu carries the "Send another reply" escape hatch.
  repliedChipRow: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    marginTop: tokens.spacingVerticalXS,
  },
  repliedChip: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  repliedChipSent: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground1,
    border: `1px solid ${tokens.colorPaletteGreenBorder1}`,
  },
  repliedChipCancelled: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
  },
  overflowButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: tokens.borderRadiusMedium,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: tokens.colorNeutralForeground2,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ":focus-visible": {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "1px",
    },
  },
  // Status sub-pills (Awaiting attorney / Blocked) use the Fluent
  // status-palette tokens rather than hard hex so they ride the active
  // theme.
  pendingReview: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorStatusWarningBackground2,
    color: tokens.colorStatusWarningForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    border: `1px solid ${tokens.colorStatusWarningBorder2}`,
    width: "fit-content",
  },
  blocked: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorStatusDangerBackground2,
    color: tokens.colorStatusDangerForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    border: `1px solid ${tokens.colorStatusDangerBorder2}`,
    width: "fit-content",
  },
  // EA-rejected Form 3 pill — amber, mirrors the GFR Panel's
  // Form3Response+None palette.
  eaRejected: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorStatusWarningBackground2,
    color: tokens.colorStatusWarningForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    border: `1px solid ${tokens.colorStatusWarningBorder2}`,
    width: "fit-content",
  },
  retractActionRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap",
    marginTop: tokens.spacingVerticalXS,
  },
  retractGateNote: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorStatusWarningForeground2,
  },
});

function formatTimestamp(d: Date | string): string {
  return format(new Date(d), "MMM d, yyyy 'at' h:mm a");
}

function counterpartyLabel(
  counterparty: "IssuingAuthority" | "EnforcingAuthority",
): string {
  return counterparty === "IssuingAuthority"
    ? "Issuing Authority"
    : "Enforcing Authority";
}

function senderNameForBubble(item: CorrespondenceItem): string {
  if (isInbound(item)) {
    return counterpartyLabel(item.counterparty);
  }
  return item.transmission.sentBy ?? "Microsoft Response Specialist";
}

function recipientName(item: OutboundCorrespondenceItem): string {
  return counterpartyLabel(item.counterparty);
}

/** Friendly label for the outbound form pill. Looks at the subject /
 *  documentKind / template id to surface a meaningful name like
 *  "Form 3" or "the production letter" instead of the generic
 *  "attached form". */
function friendlyOutboundFormLabel(item: OutboundCorrespondenceItem): string {
  const subject = item.subject ?? "";
  if (/form\s*3/i.test(subject)) return "Form 3";
  if (/form\s*5/i.test(subject)) return "Form 5";
  if (/production letter/i.test(subject)) return "the production letter";
  if (item.documentKind === "RequestAdditionalInformation") return "the RFI";
  if (item.documentKind === "ProvideAdditionalInformation") return "the info response";
  if (item.documentKind === "SignedForm") return "the signed form";
  return "the attached form";
}

/** Friendly label for the inbound authority-submitted form pill. */
function friendlyInboundFormLabel(item: InboundCorrespondenceItem): string {
  switch (item.kind) {
    case "PreservationOrder":
      return "Form 2 (Preservation Order)";
    case "Form5_ConfirmationOfIssuance":
      return "Form 5 (Confirmation of Issuance)";
    case "PreservationExtension":
      return "Form 6 (Preservation Extension)";
    case "EndPreservation":
      return "the end-of-preservation notice";
    case "Withdrawal":
      return "the EPOC withdrawal notice";
    case "StructuredForm":
      return "the authority's structured form";
    case "WithdrawalAmendment":
      return "the withdrawal / amendment notice";
    case "Acknowledgement":
      return "the authority's acknowledgement";
    case "RequestAdditionalInformation":
      return "the authority's RFI";
    case "ProvideAdditionalInformation":
      return "the authority's info response";
    default:
      return "the authority form";
  }
}

function senderInitials(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

function transmissionBadgeColor(
  status: string,
): "informative" | "warning" | "success" | "danger" | "subtle" {
  switch (status) {
    case "Sent":
      return "informative";
    case "Delivered":
      return "informative";
    case "Acknowledged":
      return "success";
    case "Responded":
      return "success";
    case "Failed":
      return "danger";
    case "Draft":
      return "subtle";
    default:
      return "subtle";
  }
}

export interface CorrespondenceMessageBubbleProps {
  item: CorrespondenceItem;
  /** Optional click handler — opens a detail flyout. The bubble itself
   *  is keyboard-activatable when this is set (role=button, Enter/Space). */
  onClick?: (item: CorrespondenceItem) => void;
  /** Optional click handler for the form pill — opens FormPreviewPanel.
   *  Receives the outbound `formInstanceId` or the inbound item's `id`
   *  (when the inbound carries a `structuredForm` block). */
  onViewForm?: (formInstanceIdOrInboundId: string) => void;
  /** Optional click handler for attachment chips — opens the attachment
   *  in an inline preview dialog. */
  onViewAttachment?: (
    attachment: CorrespondenceAttachment,
    item: CorrespondenceItem,
  ) => void;
  /** Optional handler invoked when the RS clicks the inline
   *  "Reply with Provide Additional Information" CTA on an inbound RFI
   *  bubble. The caller is expected to attach the PAI template to the
   *  composer + scroll the composer into view. The inbound item's id is
   *  the conversation anchor (inReplyTo). */
  onReplyWithTemplate?: (templateId: string, inReplyToId: string) => void;
  /** True when THIS specific outbound is the Form 3 the EA rejected.
   *  Renders an "EA Rejected" status pill + (when `onRetractForm3` is
   *  set) a Retract Form 3 action below the bubble. */
  eaRejected?: boolean;
  /** When the retract is gated by attorney review, the bubble's
   *  Retract action disables and shows the gate reason. */
  retractDisabled?: boolean;
  retractGateReason?: string;
  /** Fired when the RS clicks the bubble's Retract Form 3 action. */
  onRetractForm3?: () => void;
}

export function CorrespondenceMessageBubble({
  item,
  onClick,
  onViewForm,
  onViewAttachment,
  onReplyWithTemplate,
  eaRejected = false,
  retractDisabled = false,
  retractGateReason,
  onRetractForm3,
}: CorrespondenceMessageBubbleProps) {
  const styles = useStyles();
  const inbound = isInbound(item);
  const outbound = isOutbound(item);

  const senderName = senderNameForBubble(item);
  const initials = senderInitials(senderName);
  const ts = formatTimestamp(item.createdAt);

  const ariaLabel = inbound
    ? `Inbound from ${senderName} on ${ts}`
    : outbound
      ? `Outbound to ${recipientName(item as OutboundCorrespondenceItem)} on ${ts}`
      : `Correspondence on ${ts}`;

  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(item);
        }
      }
    : undefined;

  const bubbleClassNames = [
    styles.bubble,
    inbound ? styles.bubbleInbound : styles.bubbleOutbound,
    onClick ? styles.bubbleClickable : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`${styles.row} ${inbound ? styles.rowInbound : styles.rowOutbound}`}
    >
      <div className={styles.avatarColumn}>
        <Avatar
          name={senderName}
          initials={initials}
          size={32}
          color={inbound ? "brand" : "colorful"}
          aria-hidden="true"
        />
      </div>
      <div
        role={onClick ? "button" : "article"}
        aria-label={ariaLabel}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick ? () => onClick(item) : undefined}
        onKeyDown={handleKeyDown}
        className={bubbleClassNames}
      >
        <div className={styles.headerRow}>
          {inbound ? (
            <MailArrowDown20Regular
              className={styles.directionIcon}
              aria-hidden="true"
            />
          ) : (
            <MailArrowUp20Regular
              className={styles.directionIcon}
              aria-hidden="true"
            />
          )}
          <Body1Strong className={styles.senderName}>{senderName}</Body1Strong>
          <Caption1 className={styles.timestamp}>{ts}</Caption1>
          {inbound && item.kind && (
            <Badge appearance="outline" size="small">
              {kindFriendlyName(item.kind)}
            </Badge>
          )}
          {outbound && (
            <Badge
              appearance="tint"
              color={transmissionBadgeColor(item.transmission.status)}
              size="small"
            >
              {item.transmission.status}
            </Badge>
          )}
        </div>

        {outbound && item.transmission.pendingAttorneyReview && (
          <div className={styles.pendingReview}>
            <Scales20Regular aria-hidden="true" />
            Awaiting attorney review
          </div>
        )}
        {outbound &&
          !item.transmission.pendingAttorneyReview &&
          item.transmission.status === "Draft" && (
            <div className={styles.blocked}>
              <ShieldProhibited20Regular aria-hidden="true" />
              Blocked by attorney
            </div>
          )}

        {/* EA-rejected Form 3 — pill + (gated) Retract action. Renders
            only when the parent threaded `eaRejected === true` for THIS
            outbound, meaning the GFR Panel's referencedForm3Id matches
            item.id and the form 3 has not yet been retracted. */}
        {outbound && eaRejected && (
          <div className={styles.eaRejected}>
            <Warning20Regular aria-hidden="true" />
            EA rejected — production required
          </div>
        )}
        {outbound && eaRejected && onRetractForm3 && (
          <div className={styles.retractActionRow}>
            <Button
              appearance="primary"
              size="small"
              icon={<ArrowUndo20Regular />}
              onClick={onRetractForm3}
              disabled={retractDisabled}
            >
              Retract Form 3
            </Button>
            {retractDisabled && retractGateReason && (
              <span className={styles.retractGateNote}>{retractGateReason}</span>
            )}
          </div>
        )}

        {item.subject && (
          <Body1 className={styles.subject}>{item.subject}</Body1>
        )}

        {item.body && (
          <Caption1 className={styles.body}>{item.body}</Caption1>
        )}

        {outbound && item.formInstanceId && (() => {
          // Derive a readable label from the outbound's documentKind so
          // the pill says "View Form 3" rather than the generic "View
          // attached form" when we have enough info.
          const formLabel = friendlyOutboundFormLabel(item);
          return (
            <button
              type="button"
              className={styles.formPill}
              onClick={(e) => {
                e.stopPropagation();
                onViewForm?.(item.formInstanceId!);
              }}
              disabled={!onViewForm}
              aria-label={`Preview ${formLabel}`}
              title={`Click to preview ${formLabel}`}
            >
              <DocumentText20Regular aria-hidden="true" />
              <span>View {formLabel}</span>
            </button>
          );
        })()}

        {inbound && item.structuredForm && (() => {
          const formLabel = friendlyInboundFormLabel(item);
          return (
            <button
              type="button"
              className={styles.formPill}
              onClick={(e) => {
                e.stopPropagation();
                // Inbound structured forms are read via FormPreviewPanel
                // with a synthetic instance hydrated from the values. We
                // surface the click via onViewForm (caller decides how to
                // hydrate the read view).
                if (item.id) onViewForm?.(item.id);
              }}
              disabled={!onViewForm}
              aria-label={`Preview ${formLabel}`}
              title={`Click to preview ${formLabel}`}
            >
              <DocumentText20Regular aria-hidden="true" />
              <span>View {formLabel}</span>
            </button>
          );
        })()}

        {/* RFI / PAI document pill — treats inbound + outbound
         *  RequestAdditionalInformation and ProvideAdditionalInformation
         *  items as documents (not chat messages), matching the Form 3
         *  flow. Click opens a letterhead-style preview dialog via
         *  `onViewForm(item.id)` — the panel detects the kind and
         *  routes to `RfiPaiPreviewDialog` instead of FormPreviewPanel. */}
        {(() => {
          const isRfiPai =
            (inbound &&
              (item.kind === "RequestAdditionalInformation" ||
                item.kind === "ProvideAdditionalInformation")) ||
            (outbound &&
              (item.documentKind === "RequestAdditionalInformation" ||
                item.documentKind === "ProvideAdditionalInformation"));
          if (!isRfiPai) return null;
          const isRfi =
            (inbound && item.kind === "RequestAdditionalInformation") ||
            (outbound && item.documentKind === "RequestAdditionalInformation");
          const docLabel = isRfi
            ? "Request for Additional Information"
            : "Provide Additional Information";
          return (
            <button
              type="button"
              className={styles.formPill}
              onClick={(e) => {
                e.stopPropagation();
                onViewForm?.(item.id);
              }}
              disabled={!onViewForm}
              aria-label={`Preview ${docLabel}`}
              title={`Click to preview ${docLabel}`}
            >
              <DocumentText20Regular aria-hidden="true" />
              <span>View {docLabel}</span>
            </button>
          );
        })()}

        {item.attachments && item.attachments.length > 0 && (
          <div className={styles.attachments}>
            {item.attachments.map((att: CorrespondenceAttachment) => (
              <button
                key={att.id}
                type="button"
                className={styles.attachmentChip}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAttachment?.(att, item);
                }}
                disabled={!onViewAttachment}
                aria-label={`Preview attachment ${att.name}`}
                title="Click to preview"
              >
                <Attach20Regular aria-hidden="true" />
                <span>{att.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reply UI for inbound Request-Additional-Information items.
         *  Three states, gated by the inbound's `respondedByOutbound`:
         *   - Unreplied → inline CTA opening the PAI composer.
         *   - Replied (sent) → "Replied ✓" chip + overflow menu with
         *     a "Send another reply" escape hatch.
         *   - Replied (cancelled) → red "Replied (cancelled)" chip +
         *     overflow menu offering "Send another reply" to re-open
         *     the conversation. Per-jurisdiction breach countdown
         *     resumes elsewhere because the reader helper treats
         *     `cancelled` as still-awaiting-reply. */}
        {inbound &&
          item.kind === "RequestAdditionalInformation" &&
          onReplyWithTemplate &&
          (() => {
            const replied = readRespondedByOutbound(item);
            const onSendNew = (e: React.SyntheticEvent) => {
              e.stopPropagation();
              onReplyWithTemplate(
                "PROVIDE_ADDITIONAL_INFORMATION",
                item.id,
              );
            };
            if (!replied) {
              return (
                <button
                  type="button"
                  className={styles.formPill}
                  onClick={onSendNew}
                  aria-label="Reply with Provide Additional Information"
                  title="Open the Provide Additional Information template to reply to this request."
                >
                  <ArrowReply20Regular aria-hidden="true" />
                  <span>Reply with Provide Additional Information</span>
                </button>
              );
            }
            const isCancelled = replied.status === "cancelled";
            return (
              <div
                className={styles.repliedChipRow}
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  className={`${styles.repliedChip} ${
                    isCancelled
                      ? styles.repliedChipCancelled
                      : styles.repliedChipSent
                  }`}
                  aria-label={
                    isCancelled
                      ? "Reply sent but later cancelled — conversation not closed"
                      : "Reply sent — conversation closed from our side"
                  }
                >
                  {isCancelled ? (
                    <ErrorCircle20Regular aria-hidden="true" />
                  ) : (
                    <CheckmarkCircle20Filled aria-hidden="true" />
                  )}
                  <span>{isCancelled ? "Replied (cancelled)" : "Replied"}</span>
                </span>
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <button
                      type="button"
                      className={styles.overflowButton}
                      aria-label="More reply options"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical20Regular aria-hidden="true" />
                    </button>
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      <MenuItem
                        icon={<ArrowReply20Regular />}
                        onClick={onSendNew}
                      >
                        Send another reply
                      </MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>
              </div>
            );
          })()}
      </div>
    </div>
  );
}

function kindFriendlyName(kind: InboundCorrespondenceItem["kind"]): string {
  switch (kind) {
    case "Text":
      return "Letter";
    case "Attachment":
      return "Attachment";
    case "StructuredForm":
      return "Form";
    case "Acknowledgement":
      return "Acknowledgement";
    case "WithdrawalAmendment":
      return "Withdrawal";
    case "RequestAdditionalInformation":
      return "Info Request";
    case "ProvideAdditionalInformation":
      return "Info Reply";
    case "Form5_ConfirmationOfIssuance":
      return "Form 5";
    case "PreservationOrder":
      return "Form 2";
    case "PreservationExtension":
      return "Form 6";
    case "EndPreservation":
      return "End Preservation";
    case "Withdrawal":
      return "Withdrawal";
    default:
      return kind;
  }
}
