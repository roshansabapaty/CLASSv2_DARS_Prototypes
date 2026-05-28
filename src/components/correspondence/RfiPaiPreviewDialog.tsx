/**
 * RfiPaiPreviewDialog — letterhead-style preview for RFI / PAI
 * correspondence documents.
 *
 * Mirrors the FormPreviewPanel pattern (used for SignedForms like
 * Form 3): a printable document layout with a letterhead, structured
 * metadata grid, and the full body content. Lets the RS click a
 * `View RFI` / `View PAI` pill in the message bubble and see the
 * complete document — sender, recipient, document ID, channel, date —
 * instead of just a chat-bubble preview.
 *
 * Applies to:
 *   • Inbound items with `kind === "RequestAdditionalInformation"` or
 *     `kind === "ProvideAdditionalInformation"`.
 *   • Outbound items with `documentKind === "RequestAdditionalInformation"`
 *     or `documentKind === "ProvideAdditionalInformation"`.
 *
 * The dialog is read-only — no edit affordances. To respond to an RFI,
 * the RS still uses the in-bubble "Reply with Provide Additional
 * Information" CTA.
 */

import * as React from "react";
import { format } from "date-fns";
import {
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  Attach20Regular,
  Dismiss24Regular,
  DocumentText24Regular,
} from "@fluentui/react-icons";
import { isInbound, isOutbound } from "../../types/correspondence";
import type {
  CorrespondenceItem,
  CorrespondenceAttachment,
} from "../../types/correspondence";
import { resolveDocumentId } from "./correspondenceEngine";

const useStyles = makeStyles({
  surface: {
    maxWidth: "780px",
    width: "100%",
  },
  page: {
    backgroundColor: tokens.colorNeutralBackground1,
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    paddingLeft: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
  },
  letterhead: {
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke1,
    paddingBottom: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalL,
    display: "flex",
    alignItems: "flex-start",
    columnGap: tokens.spacingHorizontalM,
  },
  letterheadIcon: {
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
    marginTop: tokens.spacingVerticalXXS,
  },
  productLine: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: tokens.spacingVerticalXXS,
  },
  title: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  documentIdRow: {
    marginTop: tokens.spacingVerticalXS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  documentIdValue: {
    fontFamily: tokens.fontFamilyMonospace,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    rowGap: tokens.spacingVerticalS,
    columnGap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalL,
  },
  metaRow: {
    display: "flex",
    flexDirection: "column",
    rowGap: "2px",
    minWidth: 0,
  },
  metaLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  metaValue: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sectionHeader: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXXS,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  bodyText: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
    marginBottom: tokens.spacingVerticalL,
  },
  attachmentList: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
  },
  attachmentChip: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    cursor: "pointer",
    textAlign: "left",
  },
  sourceLabel: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontStyle: "italic",
    marginBottom: tokens.spacingVerticalS,
  },
});

/** Friendly document title from the item's direction + kind. */
function titleFor(item: CorrespondenceItem): string {
  if (isInbound(item)) {
    if (item.kind === "RequestAdditionalInformation") {
      return "Request for Additional Information";
    }
    if (item.kind === "ProvideAdditionalInformation") {
      return "Provide Additional Information";
    }
  } else {
    if (item.documentKind === "RequestAdditionalInformation") {
      return "Request for Additional Information";
    }
    if (item.documentKind === "ProvideAdditionalInformation") {
      return "Provide Additional Information";
    }
  }
  return item.subject || "Correspondence document";
}

/** Short product line for the letterhead (e.g. "eEvidence — Authority
 *  Submission" / "eEvidence — Microsoft Outbound"). */
function productLineFor(item: CorrespondenceItem): string {
  const direction = isInbound(item) ? "Authority submission" : "Microsoft outbound";
  return `Correspondence — ${direction}`;
}

/** Channel label — friendly form of the enum value. */
function channelLabel(channel: string): string {
  switch (channel) {
    case "DecentralisedITSystem":
      return "Decentralised IT System (EU eEvidence)";
    case "AuthorityPortal":
      return "Authority portal";
    case "PostalMail":
      return "Postal mail";
    case "Email":
      return "Email";
    default:
      return channel;
  }
}

/** Counterparty label — friendly form. */
function counterpartyLabel(role: string): string {
  if (role === "IssuingAuthority") return "Issuing Authority";
  if (role === "EnforcingAuthority") return "Enforcing Authority";
  return role;
}

export interface RfiPaiPreviewDialogProps {
  /** The correspondence item to preview. Pass `null` to keep the dialog
   *  closed; the panel parent owns the open/close state by passing the
   *  item or `null` here. */
  item: CorrespondenceItem | null;
  /** Fires when the user clicks the close affordance or presses Esc.
   *  The panel should set its preview-item state back to `null`. */
  onClose: () => void;
  /** Optional click handler for attachment chips — same shape the
   *  message bubble uses so the panel can re-route into its existing
   *  AttachmentPreview surface. */
  onViewAttachment?: (
    attachment: CorrespondenceAttachment,
    item: CorrespondenceItem,
  ) => void;
}

export function RfiPaiPreviewDialog({
  item,
  onClose,
  onViewAttachment,
}: RfiPaiPreviewDialogProps) {
  const styles = useStyles();
  if (!item) return null;

  const title = titleFor(item);
  const productLine = productLineFor(item);
  const documentId = resolveDocumentId(item);
  const sender = isInbound(item)
    ? counterpartyLabel(item.counterparty)
    : "Microsoft — Response Specialist";
  const recipient = isInbound(item)
    ? "Microsoft — Response Specialist"
    : counterpartyLabel(item.counterparty);
  const sourceLabel = isInbound(item)
    ? "Authority-submitted document"
    : "Microsoft outbound — document";
  const sentAt = isOutbound(item)
    ? item.transmission.sentAt ?? item.createdAt
    : item.createdAt;

  return (
    <Dialog open={!!item} onOpenChange={(_e, data) => !data.open && onClose()}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle
            action={
              <DialogTrigger action="close">
                <Button
                  appearance="subtle"
                  icon={<Dismiss24Regular />}
                  aria-label="Close document preview"
                />
              </DialogTrigger>
            }
          >
            Document preview
          </DialogTitle>
          <DialogContent>
            <div className={styles.page}>
              <Caption1 className={styles.sourceLabel}>{sourceLabel}</Caption1>
              <div className={styles.letterhead}>
                <DocumentText24Regular
                  className={styles.letterheadIcon}
                  aria-hidden="true"
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className={styles.productLine}>{productLine}</div>
                  <h1 className={styles.title}>{title}</h1>
                  <div className={styles.documentIdRow}>
                    Document ID:{" "}
                    <span className={styles.documentIdValue}>{documentId}</span>
                  </div>
                </div>
              </div>

              <div className={styles.metaGrid}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>From</span>
                  <span className={styles.metaValue} title={sender}>
                    {sender}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>To</span>
                  <span className={styles.metaValue} title={recipient}>
                    {recipient}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Channel</span>
                  <span className={styles.metaValue}>
                    {channelLabel(item.channel)}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>
                    {isInbound(item) ? "Received" : "Sent"}
                  </span>
                  <span className={styles.metaValue}>
                    {format(new Date(sentAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Case</span>
                  <span className={styles.metaValue}>{item.caseId}</span>
                </div>
                {item.inReplyToId && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>In reply to</span>
                    <span
                      className={styles.metaValue}
                      title={item.inReplyToId}
                    >
                      {item.inReplyToId}
                    </span>
                  </div>
                )}
              </div>

              {item.subject && (
                <>
                  <div className={styles.sectionHeader}>Subject</div>
                  <Body1Strong style={{ display: "block", marginBottom: tokens.spacingVerticalL }}>
                    {item.subject}
                  </Body1Strong>
                </>
              )}

              {item.body && (
                <>
                  <div className={styles.sectionHeader}>Body</div>
                  <Body1 className={styles.bodyText}>{item.body}</Body1>
                </>
              )}

              {item.attachments && item.attachments.length > 0 && (
                <>
                  <div className={styles.sectionHeader}>
                    Attachments ({item.attachments.length})
                  </div>
                  <div className={styles.attachmentList}>
                    {item.attachments.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        className={styles.attachmentChip}
                        onClick={() => onViewAttachment?.(att, item)}
                        disabled={!onViewAttachment}
                        aria-label={`Open attachment ${att.name}`}
                      >
                        <Attach20Regular aria-hidden="true" />
                        <span>{att.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" onClick={onClose}>
                Close
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
