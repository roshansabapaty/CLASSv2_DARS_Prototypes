// EscalationNotesCard — chronological notes panel mounted at the bottom
// of the Attorney case view (5th card, after the IdentifierTable).
//
// What it surfaces
// ────────────────
//   1. A compose area for the attorney (or any assigned user) to add a
//      free-form note onto the escalation thread. Same UX as the Case
//      Notes compose in the RS-facing case form — `RichTextEditor` plus
//      Add Note button + Ctrl/Cmd+Enter shortcut. Notes are stored on
//      `formData.notes` with `subType === "escalation"` so they appear
//      both here and on the Case Notes timeline.
//   2. The original escalation note authored by the Specialist when they
//      escalated the case ("reason" + escalatedBy + escalatedAt).
//   3. Each subsequent attorney action's note (Release / ApproveWith­
//      Conditions / RequestMoreInformation / Block), interleaved
//      chronologically with the free-form notes from (1).
//   4. A prominent header badge declaring whether the case is currently
//      **de-escalated** — meaning the attorney has acted and the ball
//      is no longer in the attorney's queue. RS / TS / assignee uses this
//      as the explicit "no further attorney action pending" signal.
//
// De-escalation rules (see status mapping)
// ────────────────────────────────────────
//   - "Released"                → De-escalated (terminal, RS proceeds).
//   - "ApprovedWithConditions"  → De-escalated (terminal w/ conditions).
//   - "Blocked"                 → De-escalated (terminal, case held).
//   - "InformationRequested"    → NOT de-escalated; ball with RS to reply,
//                                 then returns to attorney.
//   - "Pending"                 → NOT de-escalated; attorney action pending.
//
// Fluent v9 + Griffel chrome. The compose area embeds the existing
// shadcn-based `RichTextEditor` to keep the compose UX 1:1 with the
// case form's Case Notes panel — same toolbar, same paste-image
// behaviour, same Ctrl+Enter shortcut.

import * as React from "react";
import { toast } from "sonner";
import {
  Badge,
  Button as FluentButton,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  CheckmarkCircleFilled,
  CommentMultipleRegular,
  HourglassRegular,
  PersonRegular,
} from "@fluentui/react-icons";
import { RichTextEditor, type Attachment } from "../RichTextEditor";
import type {
  AttorneyAction,
  AttorneyEscalation,
  AttorneyEscalationStatus,
  CaseNote,
  FormData,
} from "../../types/caseTypes";
import { getActiveAttorneyEscalation } from "../../utils/caseEscalation";

const useStyles = makeStyles({
  root: {
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
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
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
    flexWrap: "wrap",
    rowGap: tokens.spacingVerticalXS,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  compose: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalL,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  composeLabel: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  composeFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalXS,
    flexWrap: "wrap",
    rowGap: tokens.spacingVerticalXS,
  },
  composeHint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
  },
  entry: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderLeftStyle: "solid",
    borderLeftWidth: "3px",
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    borderBottomRightRadius: tokens.borderRadiusSmall,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
  },
  entryOriginal: {
    borderLeftColor: "#5c2d91",
  },
  entryReleased: {
    borderLeftColor: "#107c10",
  },
  entryApprovedWithConditions: {
    borderLeftColor: "#797775",
  },
  entryInfoRequested: {
    borderLeftColor: "#ca5010",
  },
  entryBlocked: {
    borderLeftColor: "#a4262c",
  },
  entryFreeform: {
    borderLeftColor: "#0078d4",
  },
  entryHeader: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
    rowGap: tokens.spacingVerticalXXS,
  },
  entryActor: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  entryMeta: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  entryNote: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    whiteSpace: "pre-wrap",
  },
  // RichTextEditor produces HTML strings — preserve formatting + images.
  entryNoteHtml: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    "& img": {
      maxWidth: "100%",
      height: "auto",
    },
    "& p": {
      marginTop: 0,
      marginBottom: tokens.spacingVerticalXS,
    },
  },
});

export interface EscalationNotesCardProps {
  case: FormData;
  /** Display name to attribute new notes to (typically the signed-in
   *  user — "Attorney Review" in the prototype). */
  currentUser?: string;
  /** Called when the compose area submits a new note. The card itself
   *  doesn't own `formData.notes`; the parent (AttorneyReviewWorkspace)
   *  appends the new note to its FormData copy + registry. */
  onAddNote?: (note: CaseNote) => void;
}

/** Statuses that mean the attorney has finished — ball is back with RS/TS
 *  and no further attorney action is pending. */
const DE_ESCALATED_STATUSES: ReadonlySet<AttorneyEscalationStatus> = new Set([
  "ApprovedForDelivery",
  "ApprovedWithConditions",
  "Blocked",
]);

function isDeEscalated(esc: AttorneyEscalation | undefined): boolean {
  if (!esc) return false;
  return DE_ESCALATED_STATUSES.has(esc.status);
}

function actionLabel(action: AttorneyAction["action"]): string {
  switch (action) {
    case "Release":
      return "Released";
    case "ApproveWithConditions":
      return "Approved with conditions";
    case "RequestMoreInformation":
      return "Requested more information";
    case "Block":
      return "Blocked";
  }
}

function formatDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// One entry in the unified timeline — either an attorney lifecycle event
// or a free-form note added via the compose area.
type TimelineItem =
  | {
      kind: "original";
      at: Date;
      actor: string;
      note: string;
    }
  | {
      kind: "action";
      at: Date;
      action: AttorneyAction;
    }
  | {
      kind: "note";
      at: Date;
      caseNote: CaseNote;
    };

export function EscalationNotesCard({
  case: c,
  currentUser = "Attorney Review",
  onAddNote,
}: EscalationNotesCardProps): JSX.Element {
  const styles = useStyles();
  const escalation = getActiveAttorneyEscalation(c);
  const deEscalated = isDeEscalated(escalation);

  // Compose state — local to the card; on submit we hand the new note
  // off via `onAddNote` and clear the editor.
  const [draftHtml, setDraftHtml] = React.useState("");
  const [draftAttachments, setDraftAttachments] = React.useState<Attachment[]>(
    [],
  );

  const submitNote = React.useCallback(() => {
    // Strip HTML tags to check for empty content (matches the case form
    // validation pattern in useCaseNotes.handleAddNote).
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = draftHtml;
    const textContent = tempDiv.textContent || tempDiv.innerText || "";
    if (!textContent.trim() && draftAttachments.length === 0) {
      toast.error("Please enter a note or add an attachment");
      return;
    }
    const newNote: CaseNote = {
      id: `NOTE-ESC-${Date.now()}`,
      content: draftHtml,
      createdBy: currentUser,
      createdAt: new Date(),
      attachments:
        draftAttachments.length > 0 ? draftAttachments : undefined,
      subType: "escalation",
    };
    onAddNote?.(newNote);
    setDraftHtml("");
    setDraftAttachments([]);
    toast.success("Escalation note added");
  }, [draftHtml, draftAttachments, onAddNote, currentUser]);

  // Build the unified, chronologically-sorted timeline from the
  // escalation lifecycle + the free-form escalation-tagged notes that
  // live on `formData.notes`.
  const timeline = React.useMemo<TimelineItem[]>(() => {
    if (!escalation) return [];
    const items: TimelineItem[] = [];
    items.push({
      kind: "original",
      at: new Date(escalation.escalatedAt),
      actor: escalation.escalatedBy,
      note: escalation.reason,
    });
    for (const action of escalation.actions ?? []) {
      items.push({
        kind: "action",
        at: new Date(action.performedAt),
        action,
      });
    }
    for (const note of c.notes ?? []) {
      if (note.subType !== "escalation") continue;
      items.push({
        kind: "note",
        at: new Date(note.createdAt),
        caseNote: note,
      });
    }
    return items.sort((a, b) => a.at.getTime() - b.at.getTime());
  }, [escalation, c.notes]);

  const canCompose = !!escalation && !!onAddNote;
  const submitDisabled =
    !draftHtml.replace(/<[^>]*>/g, "").trim() &&
    draftAttachments.length === 0;

  return (
    <div className={styles.root} aria-label="Escalation Notes">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <CommentMultipleRegular fontSize={20} />
          <Text className={styles.title}>Escalation Notes</Text>
        </div>
        {/* De-escalation signal — what RS/TS reads when they land on the
            case to know whether attorney action is still pending. */}
        {escalation ? (
          deEscalated ? (
            <Badge
              appearance="filled"
              color="success"
              icon={<CheckmarkCircleFilled />}
              title="The attorney has completed action on this case. No further attorney action is pending."
            >
              De-escalated · {escalation.status === "ApprovedForDelivery"
                ? "Released"
                : escalation.status === "ApprovedWithConditions"
                  ? "Approved w/ Conditions"
                  : "Blocked"}
            </Badge>
          ) : escalation.status === "InformationRequested" ? (
            <Badge
              appearance="filled"
              color="warning"
              icon={<HourglassRegular />}
              title="Attorney has requested more information from the Response Specialist. Ball is with RS until they reply."
            >
              Awaiting RS reply
            </Badge>
          ) : (
            <Badge
              appearance="filled"
              color="danger"
              icon={<HourglassRegular />}
              title="Attorney review is pending. No attorney action has been recorded yet."
            >
              Pending attorney action
            </Badge>
          )
        ) : null}
      </div>

      {/* Compose area — mirrors the Case Notes compose UX from the case
          form (RichTextEditor + Add Note button + Ctrl+Enter shortcut).
          Only mounts when there is an active escalation to thread the
          new note onto. */}
      {canCompose && (
        <div className={styles.compose} aria-label="Add escalation note">
          <Text as="label" className={styles.composeLabel} htmlFor="newEscalationNote">
            Add an escalation note
          </Text>
          <RichTextEditor
            value={draftHtml}
            onChange={setDraftHtml}
            attachments={draftAttachments}
            onAttachmentsChange={setDraftAttachments}
            placeholder="Add context, follow-up questions, or instructions for the Response Specialist… Use the toolbar for formatting."
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                submitNote();
              }
            }}
          />
          <div className={styles.composeFooter}>
            <Text className={styles.composeHint}>
              Press Ctrl+Enter to add note · Paste images directly
            </Text>
            <FluentButton
              appearance="primary"
              icon={<AddRegular />}
              onClick={submitNote}
              disabled={submitDisabled}
            >
              Add Note
            </FluentButton>
          </div>
        </div>
      )}

      {!escalation ? (
        <Text className={styles.empty}>
          No active attorney escalation on this case.
        </Text>
      ) : (
        <div className={styles.list}>
          {timeline.map((item, index) => {
            if (item.kind === "original") {
              return (
                <div
                  key={`original-${index}`}
                  className={`${styles.entry} ${styles.entryOriginal}`}
                  aria-label="Original escalation note"
                >
                  <div className={styles.entryHeader}>
                    <PersonRegular fontSize={14} />
                    <Text className={styles.entryActor}>{item.actor}</Text>
                    <Badge appearance="tint" color="brand" size="small">
                      Escalated
                    </Badge>
                    <Text className={styles.entryMeta}>
                      {formatDate(item.at)}
                    </Text>
                  </div>
                  <Text className={styles.entryNote}>{item.note}</Text>
                </div>
              );
            }
            if (item.kind === "action") {
              const a = item.action;
              const accent =
                a.action === "Release"
                  ? styles.entryReleased
                  : a.action === "ApproveWithConditions"
                    ? styles.entryApprovedWithConditions
                    : a.action === "RequestMoreInformation"
                      ? styles.entryInfoRequested
                      : styles.entryBlocked;
              const badgeColor: React.ComponentProps<typeof Badge>["color"] =
                a.action === "Release"
                  ? "success"
                  : a.action === "Block"
                    ? "danger"
                    : a.action === "RequestMoreInformation"
                      ? "warning"
                      : "informative";
              return (
                <div
                  key={a.id}
                  className={`${styles.entry} ${accent}`}
                  aria-label={`Attorney action — ${actionLabel(a.action)}`}
                >
                  <div className={styles.entryHeader}>
                    <PersonRegular fontSize={14} />
                    <Text className={styles.entryActor}>
                      {a.attorneyName}
                    </Text>
                    <Badge appearance="tint" color={badgeColor} size="small">
                      {actionLabel(a.action)}
                    </Badge>
                    <Text className={styles.entryMeta}>
                      {formatDate(a.performedAt)}
                    </Text>
                  </div>
                  {a.note ? (
                    <Text className={styles.entryNote}>{a.note}</Text>
                  ) : a.action === "Release" ? (
                    <Text className={styles.entryMeta}>
                      (Released without additional notes.)
                    </Text>
                  ) : null}
                </div>
              );
            }
            // Free-form note added via the compose area. Renders the HTML
            // body so RichTextEditor formatting (lists, links, images) is
            // preserved.
            const n = item.caseNote;
            return (
              <div
                key={n.id}
                className={`${styles.entry} ${styles.entryFreeform}`}
                aria-label="Escalation note"
              >
                <div className={styles.entryHeader}>
                  <PersonRegular fontSize={14} />
                  <Text className={styles.entryActor}>{n.createdBy}</Text>
                  <Badge appearance="tint" color="informative" size="small">
                    Note
                  </Badge>
                  <Text className={styles.entryMeta}>
                    {formatDate(n.createdAt)}
                  </Text>
                </div>
                <div
                  className={styles.entryNoteHtml}
                  // RichTextEditor stores sanitized HTML; same surface used
                  // by the case form's Notes timeline, so we mirror its
                  // rendering approach here.
                  dangerouslySetInnerHTML={{ __html: n.content }}
                />
                {n.attachments && n.attachments.length > 0 && (
                  <Text className={styles.entryMeta}>
                    {n.attachments.length} attachment
                    {n.attachments.length !== 1 ? "s" : ""}
                  </Text>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
