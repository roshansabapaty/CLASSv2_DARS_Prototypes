/**
 * CaseRequestSnapshot — read-only structured view of the DARS request data,
 * rendered in the right pane of the AttorneyReviewWorkspace when the
 * attorney toggles on "Show DARS Request View".
 *
 * Stage B-1 placeholder for what will eventually be the full embedded
 * DataEntryForm. Today it surfaces the highest-value fields an attorney
 * needs to cross-check while making a review decision:
 *   - Case ID / request type / agency / jurisdiction / deadline
 *   - Legal context (issuing authority, validating authority where present)
 *   - All identifiers + their account-check + task status
 *   - Notification workflow status (NDO, controller notification, user notification)
 *   - Audit thread summary
 *
 * "Open in full editor" routes to the activeApp="queue" case form for any
 * mutation the attorney needs to make.
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
  AttachRegular,
  DocumentRegular,
  NoteRegular,
  OpenRegular,
  MailRegular,
  ScalesRegular,
  ShieldKeyholeRegular,
  HistoryRegular,
} from "@fluentui/react-icons";
import type { FormData } from "../../types/caseTypes";
import { getTaskStatusStyle } from "../identifier-table/identifier-table-utils";

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
  scroll: {
    flex: 1,
    overflowY: "auto",
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalL,
  },
  section: {
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
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalS,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalXS,
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  identifierRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap",
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  taskStatusBadge: {
    display: "inline-block",
    paddingLeft: "6px",
    paddingRight: "6px",
    paddingTop: "1px",
    paddingBottom: "1px",
    fontSize: "10px",
    fontWeight: tokens.fontWeightSemibold,
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    borderBottomRightRadius: tokens.borderRadiusSmall,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
  },
  auditEntry: {
    display: "flex",
    flexDirection: "column",
    rowGap: "2px",
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  auditTime: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  auditKind: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  noteEntry: {
    display: "flex",
    flexDirection: "column",
    rowGap: "4px",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  noteHeader: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap",
  },
  noteAuthor: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  noteTime: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  noteContent: {
    whiteSpace: "pre-wrap",
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  noteAttachments: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "4px",
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  notesEmpty: {
    fontStyle: "italic",
    color: tokens.colorNeutralForeground3,
  },
});

/** Display label for each CaseNoteSubType — friendlier than the raw key
 *  when surfaced in a Badge. Unknown values fall back to the raw string. */
const NOTE_SUBTYPE_LABEL: Record<string, string> = {
  general: "General",
  ndo: "Non-Disclosure Order",
  "controller-response": "Controller Response",
  "user-notification": "User Notification",
  escalation: "Escalation",
  resolution: "Resolution",
  approval: "Approval",
  "manual-collection": "Manual Collection",
  "manual-service": "Manual Service",
  "document-verification": "Document Verification",
  "processing-job": "Processing Job",
};

interface Props {
  case: FormData;
  /** Routes the attorney to the full editable case form (DataEntryForm). */
  onOpenInFullEditor: () => void;
}

export function CaseRequestSnapshot({ case: c, onOpenInFullEditor }: Props) {
  const styles = useStyles();
  const dueDate = c.dueDate
    ? c.dueDate.toISOString().slice(0, 10)
    : "—";
  const dateServed = c.dateServed ?? "—";
  const iaName =
    c.eevidenceIssuingAuthority?.name ?? c.agency ?? "—";
  const vaName = c.eevidenceValidatingAuthority?.name;
  const eaName = c.eevidenceEnforcingAuthority?.name;

  // Audit events newest-first; cap at 6 in this snapshot so the right
  // pane stays compact (full thread lives in the attorney view).
  const audit = (c.escalationAuditEvents ?? [])
    .slice()
    .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
    .slice(0, 6);

  // All case notes, newest-first. Legal review wants ALL notes (per the
  // ask) — no cap. Empty array if no notes recorded.
  const notes = (c.notes ?? [])
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <div className={styles.topBarTitle}>
          <DocumentRegular fontSize={18} />
          <Text weight="semibold">DARS Request View</Text>
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

      <div className={styles.scroll}>
        <div className={styles.content}>
          {/* Case Identification */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <ScalesRegular fontSize={18} />
              <Text as="h3" weight="semibold" size={400}>
                Case Identification
              </Text>
            </div>
            <div className={styles.fieldGrid}>
              <Text className={styles.label}>Case ID</Text>
              <Text>{c.caseId}</Text>
              <Text className={styles.label}>Request type</Text>
              <Text>
                {c.requestType}
                {c.requestSubType && c.requestSubType !== "None"
                  ? ` · ${c.requestSubType}`
                  : ""}
              </Text>
              <Text className={styles.label}>Agency</Text>
              <Text>{c.agency || "—"}</Text>
              <Text className={styles.label}>Country / Jurisdiction</Text>
              <Text>
                {c.country || "—"} · {c.jurisdiction || "—"}
              </Text>
              <Text className={styles.label}>Nature of crime</Text>
              <Text>{c.natureOfCrimes.join(", ") || "—"}</Text>
              <Text className={styles.label}>Date served</Text>
              <Text>{dateServed}</Text>
              <Text className={styles.label}>Deadline</Text>
              <Text>{dueDate}</Text>
              <Text className={styles.label}>Case stage</Text>
              <Text>{c.caseStage || "—"}</Text>
            </div>
          </div>

          {/* Authority blocks — eEvidence-only */}
          {(iaName !== "—" || vaName || eaName) && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <ScalesRegular fontSize={18} />
                <Text as="h3" weight="semibold" size={400}>
                  Authorities
                </Text>
              </div>
              <div className={styles.fieldGrid}>
                <Text className={styles.label}>Issuing Authority</Text>
                <Text>{iaName}</Text>
                {vaName && (
                  <>
                    <Text className={styles.label}>Validating Authority</Text>
                    <Text>{vaName}</Text>
                  </>
                )}
                {eaName && (
                  <>
                    <Text className={styles.label}>Enforcing Authority</Text>
                    <Text>{eaName}</Text>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Identifiers */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <MailRegular fontSize={18} />
              <Text as="h3" weight="semibold" size={400}>
                Identifiers ({c.identifiers.length})
              </Text>
            </div>
            {c.identifiers.map((id) => {
              const status = getTaskStatusStyle(id.taskStatus);
              return (
                <div key={id.id} className={styles.identifierRow}>
                  <Badge appearance="outline" size="small">
                    {id.type}
                  </Badge>
                  <Text>{id.value}</Text>
                  <span
                    className={styles.taskStatusBadge}
                    style={{
                      color: status.color,
                      backgroundColor: status.bgColor,
                      borderColor: status.borderColor,
                    }}
                  >
                    {status.label}
                  </span>
                  {id.checkAccounts?.accountType && (
                    <Badge appearance="tint" color="informative" size="small">
                      CLASS: {id.checkAccounts.accountType}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notification workflow status */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <ShieldKeyholeRegular fontSize={18} />
              <Text as="h3" weight="semibold" size={400}>
                Notification &amp; Disclosure
              </Text>
            </div>
            <div className={styles.fieldGrid}>
              <Text className={styles.label}>NDO attached</Text>
              <Text>{c.ndoAttached || "—"}</Text>
              <Text className={styles.label}>Notification allowed</Text>
              <Text>{c.notificationAllowed || "—"}</Text>
              {c.disclosureConstraints && (
                <>
                  <Text className={styles.label}>Constraints source</Text>
                  <Text>
                    {c.disclosureConstraints.source}
                    {c.disclosureConstraints.exemptCategory
                      ? ` · ${c.disclosureConstraints.exemptCategory}`
                      : ""}
                  </Text>
                  <Text className={styles.label}>Controller notification</Text>
                  <Text>{c.disclosureConstraints.controllerNotification}</Text>
                  <Text className={styles.label}>User notification</Text>
                  <Text>
                    {c.disclosureConstraints.userNotification}
                    {c.disclosureConstraints.notificationDelayedUntil
                      ? ` until ${c.disclosureConstraints.notificationDelayedUntil}`
                      : ""}
                  </Text>
                </>
              )}
              {c.dateOfControllerNotification && (
                <>
                  <Text className={styles.label}>Controller notified</Text>
                  <Text>
                    {c.dateOfControllerNotification.toISOString().slice(0, 10)}
                  </Text>
                </>
              )}
            </div>
          </div>

          {/* Case Notes — all notes recorded against the case, surfaced
              for attorney legal review. Newest-first, no cap. */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <NoteRegular fontSize={18} />
              <Text as="h3" weight="semibold" size={400}>
                Case Notes ({notes.length})
              </Text>
            </div>
            {notes.length === 0 ? (
              <Text className={styles.notesEmpty}>
                No case notes recorded.
              </Text>
            ) : (
              notes.map((n) => (
                <div key={n.id} className={styles.noteEntry}>
                  <div className={styles.noteHeader}>
                    <Text className={styles.noteAuthor}>{n.createdBy}</Text>
                    <Text className={styles.noteTime}>
                      {n.createdAt.toLocaleString()}
                    </Text>
                    {n.subType && (
                      <Badge
                        appearance="tint"
                        color="informative"
                        size="small"
                      >
                        {NOTE_SUBTYPE_LABEL[n.subType] ?? n.subType}
                      </Badge>
                    )}
                    {n.attachments && n.attachments.length > 0 && (
                      <span className={styles.noteAttachments}>
                        <AttachRegular fontSize={14} />
                        {n.attachments.length} attachment
                        {n.attachments.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <Text className={styles.noteContent}>{n.content}</Text>
                </div>
              ))
            )}
          </div>

          {/* Recent audit */}
          {audit.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <HistoryRegular fontSize={18} />
                <Text as="h3" weight="semibold" size={400}>
                  Recent escalation audit
                </Text>
              </div>
              {audit.map((e) => (
                <div key={e.id} className={styles.auditEntry}>
                  <Text className={styles.auditTime}>
                    {e.performedAt.toLocaleString()}
                  </Text>
                  <Text className={styles.auditKind}>{e.kind}</Text>
                  <Text size={200}>
                    {e.actor}
                    {e.actorRole ? ` — ${e.actorRole}` : ""}
                  </Text>
                  {e.note && (
                    <Text size={200} italic>
                      "{e.note}"
                    </Text>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
