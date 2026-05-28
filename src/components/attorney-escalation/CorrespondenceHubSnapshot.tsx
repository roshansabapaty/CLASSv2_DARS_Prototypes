/**
 * CorrespondenceHubSnapshot — read-only chronological view of the case's
 * inbound + outbound correspondence, rendered in the right pane of the
 * AttorneyReviewWorkspace when the attorney toggles "Show Correspondence Hub".
 *
 * Mirrors the pattern of CaseRequestSnapshot: a structured read-only
 * surface that gives the attorney the legal-relevant info at a glance
 * without the editing surface of the full CorrespondencePanel. An
 * "Open in full editor" button routes to the activeApp="queue" case form
 * where the writeable CorrespondencePanel lives.
 *
 * Items are listed newest-first; each item shows direction (inbound /
 * outbound), counterparty, channel, subject, timestamp, status (outbound
 * only), and the body preview. Attachments + structured-form inbound
 * carry a chip indicating their kind.
 *
 * Fluent v9 + Griffel.
 */

import {
  Badge,
  Button,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowDownloadRegular,
  ArrowUploadRegular,
  AttachRegular,
  ChatMultipleRegular,
  DocumentRegular,
  MailRegular,
  OpenRegular,
} from "@fluentui/react-icons";
import type { FormData } from "../../types/caseTypes";
import type {
  CorrespondenceItem,
  InboundCorrespondenceItem,
  OutboundCorrespondenceItem,
  OutboundTransmissionStatus,
} from "../../types/correspondence";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: tokens.colorNeutralBackground1,
    borderLeftStyle: "solid",
    borderLeftWidth: "1px",
    borderLeftColor: tokens.colorNeutralStroke2,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  topBarTitle: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
  },
  countsRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground1,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  scroll: {
    flex: 1,
    overflowY: "auto",
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
  },
  empty: {
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
  item: {
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
  },
  itemInbound: {
    borderLeftStyle: "solid",
    borderLeftWidth: "3px",
    borderLeftColor: tokens.colorBrandStroke1,
  },
  itemOutbound: {
    borderLeftStyle: "solid",
    borderLeftWidth: "3px",
    borderLeftColor: tokens.colorPaletteGreenBorderActive,
  },
  itemHeader: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap",
  },
  directionChip: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "4px",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  inboundColor: {
    color: tokens.colorBrandForeground1,
  },
  outboundColor: {
    color: tokens.colorPaletteGreenForeground1,
  },
  subject: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  meta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  body: {
    whiteSpace: "pre-wrap",
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  attachments: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "4px",
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  unreadChip: {
    fontSize: "10px",
    fontWeight: tokens.fontWeightSemibold,
    paddingLeft: "6px",
    paddingRight: "6px",
    paddingTop: "1px",
    paddingBottom: "1px",
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    borderBottomRightRadius: tokens.borderRadiusSmall,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorPaletteRedBackground1,
    color: tokens.colorPaletteRedForeground1,
  },
});

function isOutbound(item: CorrespondenceItem): item is OutboundCorrespondenceItem {
  return item.direction === "Outbound";
}

function transmissionBadgeColor(
  status: OutboundTransmissionStatus,
): "subtle" | "informative" | "success" | "warning" | "danger" {
  switch (status) {
    case "Draft":
      return "subtle";
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
  }
}

function inboundKindLabel(item: InboundCorrespondenceItem): string {
  switch (item.kind) {
    case "Text":
      return "Text";
    case "Attachment":
      return "Attachment";
    case "StructuredForm":
      return "Structured Form";
    case "Acknowledgement":
      return "Acknowledgement";
    case "WithdrawalAmendment":
      return "Withdrawal / Amendment";
    case "RequestAdditionalInformation":
      return "Request for Information";
    case "ProvideAdditionalInformation":
      return "Provided Information";
    case "PreservationOrder":
      return "Form 2 — Preservation Order";
    case "Form5_ConfirmationOfIssuance":
      return "Form 5 — Confirmation of Issuance";
    case "PreservationExtension":
      return "Form 6 — Preservation Extension";
    case "EndPreservation":
      return "End of Preservation";
    case "GroundsForRefusal":
      return "Grounds for Refusal";
  }
}

interface Props {
  case: FormData;
  /** Routes the attorney to the full editable case form where the
   *  writeable CorrespondencePanel lives. */
  onOpenInFullEditor: () => void;
}

export function CorrespondenceHubSnapshot({
  case: c,
  onOpenInFullEditor,
}: Props) {
  const styles = useStyles();
  const items = (c.correspondence ?? [])
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const inboundCount = items.filter((i) => i.direction === "Inbound").length;
  const outboundCount = items.filter((i) => i.direction === "Outbound").length;
  const unreadInbound = items.filter(
    (i) => i.direction === "Inbound" && !(i as InboundCorrespondenceItem).readAt,
  ).length;

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <div className={styles.topBarTitle}>
          <ChatMultipleRegular fontSize={18} />
          <Text weight="semibold">Correspondence Hub</Text>
          <Badge color="subtle" appearance="tint" size="small">
            Read-only
          </Badge>
        </div>
        <Button
          appearance="primary"
          size="small"
          icon={<OpenRegular />}
          onClick={onOpenInFullEditor}
        >
          Open in full editor
        </Button>
      </div>

      {items.length > 0 && (
        <div className={styles.countsRow}>
          <Text size={200}>
            <strong>{items.length}</strong> item{items.length === 1 ? "" : "s"}
          </Text>
          <Text size={200}>
            <strong>{inboundCount}</strong> inbound
            {unreadInbound > 0 && (
              <span style={{ marginLeft: 6 }}>
                <span className={styles.unreadChip}>{unreadInbound} unread</span>
              </span>
            )}
          </Text>
          <Text size={200}>
            <strong>{outboundCount}</strong> outbound
          </Text>
        </div>
      )}

      <div className={styles.scroll}>
        <div className={styles.content}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <Text>No correspondence recorded on this case.</Text>
            </div>
          ) : (
            items.map((item) => {
              const outbound = isOutbound(item) ? item : null;
              const inbound = outbound ? null : (item as InboundCorrespondenceItem);
              const itemClass = outbound
                ? `${styles.item} ${styles.itemOutbound}`
                : `${styles.item} ${styles.itemInbound}`;
              const unread = inbound && !inbound.readAt;
              return (
                <div key={item.documentId ?? `${item.caseId}-${item.createdAt.toISOString()}`} className={itemClass}>
                  <div className={styles.itemHeader}>
                    {outbound ? (
                      <span className={`${styles.directionChip} ${styles.outboundColor}`}>
                        <ArrowUploadRegular fontSize={14} />
                        Outbound
                      </span>
                    ) : (
                      <span className={`${styles.directionChip} ${styles.inboundColor}`}>
                        <ArrowDownloadRegular fontSize={14} />
                        Inbound
                      </span>
                    )}
                    <Text className={styles.meta}>
                      {item.counterparty === "IssuingAuthority"
                        ? "Issuing Authority"
                        : "Enforcing Authority"}
                    </Text>
                    <Text className={styles.meta}>· {item.channel}</Text>
                    <Text className={styles.meta}>
                      · {item.createdAt.toLocaleString()}
                    </Text>
                    {unread && (
                      <span className={styles.unreadChip}>Unread</span>
                    )}
                    {outbound && (
                      <Badge
                        appearance="tint"
                        color={transmissionBadgeColor(outbound.transmission.status)}
                        size="small"
                      >
                        {outbound.transmission.status}
                      </Badge>
                    )}
                    {inbound && (
                      <Badge appearance="outline" size="small">
                        {inboundKindLabel(inbound)}
                      </Badge>
                    )}
                    {item.documentId && (
                      <Text className={styles.meta}>
                        · {item.documentId}
                      </Text>
                    )}
                  </div>

                  <Text className={styles.subject}>{item.subject}</Text>

                  {/* Body — outbound free-text body, inbound text/ack body.
                      Form-based outbounds (formInstanceId) and structured
                      inbound forms surface their template id as a chip
                      since rendering the full form requires the
                      FormPreviewPanel (lives in the full editor). */}
                  {outbound?.body && (
                    <Text className={styles.body}>{outbound.body}</Text>
                  )}
                  {outbound?.formInstanceId && !outbound.body && (
                    <Text className={styles.meta}>
                      <DocumentRegular fontSize={14} /> Signed form ·{" "}
                      {outbound.formInstanceId}
                    </Text>
                  )}
                  {inbound?.body && (
                    <Text className={styles.body}>{inbound.body}</Text>
                  )}
                  {inbound?.structuredForm && !inbound.body && (
                    <Text className={styles.meta}>
                      <DocumentRegular fontSize={14} /> Structured form ·{" "}
                      {inbound.structuredForm.templateId}
                    </Text>
                  )}

                  {/* Attachments */}
                  {(() => {
                    const atts =
                      outbound?.attachments ?? inbound?.attachments ?? [];
                    if (atts.length === 0) return null;
                    return (
                      <span className={styles.attachments}>
                        <AttachRegular fontSize={14} />
                        {atts.length} attachment
                        {atts.length === 1 ? "" : "s"}
                        {": "}
                        {atts.map((a) => a.name).join(", ")}
                      </span>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
