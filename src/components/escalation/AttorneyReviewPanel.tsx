/**
 * AttorneyReviewPanel — top-of-case-body panel rendered when the active
 * escalation targets the Attorney role and is in a non-terminal status.
 *
 * Renders:
 *  - The Specialist's reason + targeted role / assignee header.
 *  - The new DisclosureSection (controller/user notification posture incl.
 *    "Exempt category" CSE/CSAM cases) and EnterpriseConflictOfLawStrip
 *    when the case has enterprise context.
 *  - Four action buttons: Release, Approve with Conditions, Request More
 *    Information, Block Delivery / Form 3.
 *
 * Phase 1 of the prototype-to-prod merge:
 *  - Optional `identifierId` prop — when provided, reads the escalation
 *    from the per-identifier `AccountIdentifier.attorneyEscalation` field
 *    instead of the case-level `FormData.attorneyEscalation`. Falls back
 *    to the case-level field for back-compat.
 *  - Migrated from shadcn (Card/Button/Badge + Tailwind) to Fluent v9 +
 *    Griffel per docs/UI_LIBRARY_POLICY.md.
 *
 * Note: `AttorneyActionDialog` (the modal that captures the action note)
 * is still on shadcn — kept as-is since this PR doesn't touch it.
 */

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowHookUpLeftRegular,
  ArrowReplyRegular,
  CheckmarkCircleRegular,
  CircleHalfFillRegular,
  ClipboardTextEditRegular,
  ClockRegular,
  ProhibitedRegular,
  QuestionCircleRegular,
  ScalesRegular,
} from "@fluentui/react-icons";
import {
  ESCALATION_DIRECTORY,
  ESCALATION_ROLES,
  CURRENT_USER,
} from "../../constants/caseConstants";
import { isEnterpriseCase } from "../../utils/attorneyEscalationHelpers";
import { findIdentifier } from "../../utils/caseEscalation";
import { AttorneyActionDialog } from "./AttorneyActionDialog";
import { DisclosureSection } from "../attorney-escalation/DisclosureSection";
import { EnterpriseConflictOfLawStrip } from "../attorney-escalation/EnterpriseConflictOfLawStrip";
import type {
  AttorneyAction,
  AttorneyEscalation,
  EscalationAuditEvent,
  FormData,
} from "../../types/caseTypes";

function formatRelativeAge(d: Date | string): string {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} hr ago`;
  const days = Math.floor(ms / 86_400_000);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const useStyles = makeStyles({
  card: {
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    // Purple — matches the existing Attorney accent throughout the app.
    borderLeftColor: "#5c2d91",
    backgroundColor: "#fbf8ff",
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalS,
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    alignItems: "flex-start",
    columnGap: tokens.spacingHorizontalS,
  },
  headerMeta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: "2px",
  },
  metaSep: {
    color: tokens.colorNeutralStroke1,
  },
  inlineIcon: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: "4px",
  },
  reasonBox: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
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
  reasonLabel: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: "4px",
    display: "block",
  },
  reasonText: {
    whiteSpace: "pre-wrap",
  },
  noteBox: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
  },
  noteBoxInfo: {
    backgroundColor: "#fef7e6",
    borderTopColor: "#f9a82566",
    borderRightColor: "#f9a82566",
    borderBottomColor: "#f9a82566",
    borderLeftColor: "#f9a82566",
  },
  noteBoxDanger: {
    backgroundColor: "#fef0f0",
    borderTopColor: "#d1343866",
    borderRightColor: "#d1343866",
    borderBottomColor: "#d1343866",
    borderLeftColor: "#d1343866",
  },
  noteBoxLabel: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: "4px",
    display: "block",
  },
  noteBoxLabelInfo: {
    color: "#8a6d3b",
  },
  noteBoxLabelDanger: {
    color: "#c50f1f",
  },
  actionsLabel: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalXS,
    display: "block",
  },
  actionsRow: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
  },
  // Audit P1 #5 — three-tier action layout. Primary decisions
  // (Release / Block) sit in their own row at full visual weight.
  // Conditional + Handoff actions sit in a secondary row, visually
  // separated. The handoff actions collapse into a single Menu so the
  // CTA row stops reading as a "wall of options."
  actionsPrimaryRow: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalS,
  },
  actionsSecondaryRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalS,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    borderTopColor: tokens.colorNeutralStroke2,
  },
  actionsSecondaryLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginRight: tokens.spacingHorizontalXS,
  },
  // Long-form border properties — Griffel rejects the shorthand
  // `borderColor` in makeStyles in favour of explicit per-side rules.
  blockButton: {
    color: tokens.colorPaletteRedForeground1,
    borderTopColor: tokens.colorPaletteRedBorder2,
    borderRightColor: tokens.colorPaletteRedBorder2,
    borderBottomColor: tokens.colorPaletteRedBorder2,
    borderLeftColor: tokens.colorPaletteRedBorder2,
  },
});

export interface AttorneyReviewPanelProps {
  formData: FormData;
  /** Optional DOM id applied to the outer Card. Used by the page-top
   *  `ReviewRequiredAlertBanner` to scroll this panel into view via
   *  `getElementById(id)?.scrollIntoView(...)`. Defaults to
   *  `"attorney-review-panel"` so the standard mount on Triage / Review
   *  Case is targetable without callers having to pass anything. */
  id?: string;
  /** Phase 1 (prototype merge): when provided, the panel reads escalation
   *  state from the per-identifier `AccountIdentifier.attorneyEscalation`
   *  field. Without this, falls back to the case-level
   *  `FormData.attorneyEscalation` (legacy back-compat). */
  identifierId?: string;
  /** Caller applies the resulting action + audit event to FormData. */
  onAttorneyAction: (next: {
    action: AttorneyAction;
    auditEvent: EscalationAuditEvent;
    statusPatch?: Partial<AttorneyEscalation>;
    notifyLead?: boolean;
  }) => void;
}

interface ActionDialogConfig {
  title: string;
  description: React.ReactNode;
  notePromptLabel: string;
  notePlaceholder: string;
  acknowledgementText?: string;
  confirmLabel: string;
  tier: "primary" | "danger" | "warn";
  build: (note: string) => {
    action: AttorneyAction;
    statusPatch: Partial<AttorneyEscalation>;
    auditKind: EscalationAuditEvent["kind"];
    notifyLead?: boolean;
  };
}

export function AttorneyReviewPanel({
  formData,
  identifierId,
  onAttorneyAction,
  id = "attorney-review-panel",
}: AttorneyReviewPanelProps) {
  const styles = useStyles();

  // Per-identifier read when caller passed identifierId; otherwise legacy.
  const identifier = identifierId
    ? findIdentifier(formData, identifierId)
    : undefined;
  const esc: AttorneyEscalation | undefined =
    identifier?.attorneyEscalation ?? formData.attorneyEscalation;

  const [openDialog, setOpenDialog] = React.useState<null | ActionDialogConfig>(
    null,
  );

  if (!esc || esc.role !== "Attorney") return null;
  if (esc.status === "ApprovedForDelivery") return null;

  const roleLabel =
    ESCALATION_ROLES.find((r) => r.value === esc.role)?.label ?? esc.role;
  const assignee = esc.assignedAttorneyId
    ? ESCALATION_DIRECTORY.find((d) => d.id === esc.assignedAttorneyId)
    : undefined;
  const attorneyName = assignee?.name ?? CURRENT_USER;
  const enterprise = isEnterpriseCase(formData);

  const fireAction = (
    cfg: ReturnType<ActionDialogConfig["build"]>,
    note?: string,
  ) => {
    const now = new Date();
    const action: AttorneyAction = {
      ...cfg.action,
      attorneyName,
      performedAt: now,
      note: note ?? cfg.action.note,
    };
    const auditEvent: EscalationAuditEvent = {
      id: genId("audit"),
      kind: cfg.auditKind,
      actor: attorneyName,
      actorRole: "Attorney",
      performedAt: now,
      note: note ?? action.note,
      // Tag the audit event with the targeted identifier when the
      // caller is doing a per-identifier review.
      identifierId,
    };
    onAttorneyAction({
      action,
      auditEvent,
      statusPatch: cfg.statusPatch,
      notifyLead: cfg.notifyLead,
    });
  };

  const handleRelease = () => {
    fireAction({
      action: {
        id: genId("act"),
        action: "Release",
        attorneyName,
        performedAt: new Date(),
      },
      statusPatch: { status: "ApprovedForDelivery" },
      auditKind: "Released",
    });
  };

  const conditionsConfig: ActionDialogConfig = {
    title: "Approve with Conditions",
    description:
      "The case can proceed but the Specialist must respect the conditions you record below. Conditions are visible to them after reassignment.",
    notePromptLabel: "Conditions",
    notePlaceholder:
      "e.g. Approved for delivery on the consumer identifier only. The enterprise mailbox is excluded pending privilege review.",
    confirmLabel: "Approve with Conditions",
    tier: "primary",
    build: (note) => ({
      action: {
        id: genId("act"),
        action: "ApproveWithConditions",
        attorneyName,
        performedAt: new Date(),
        note,
      },
      statusPatch: {
        status: "ApprovedWithConditions",
        conditionsNote: note,
        conditionsAcknowledgedAt: undefined,
        conditionsAcknowledgedBy: undefined,
      },
      auditKind: "ApprovedWithConditions",
    }),
  };

  const requestInfoConfig: ActionDialogConfig = {
    title: "Request More Information",
    description:
      "Send the case back to the Specialist with a request for clarification. The escalation stays open; the Specialist can resume it after replying.",
    notePromptLabel: "What information do you need?",
    notePlaceholder:
      "Describe the missing information or the ambiguity the Specialist needs to clarify…",
    confirmLabel: "Request Information",
    tier: "warn",
    build: (note) => ({
      action: {
        id: genId("act"),
        action: "RequestMoreInformation",
        attorneyName,
        performedAt: new Date(),
        note,
      },
      statusPatch: {
        status: "InformationRequested",
        informationRequest: note,
      },
      auditKind: "InformationRequested",
    }),
  };

  const requestRedirectConfig: ActionDialogConfig = {
    title: "Request Redirect to Data Controller",
    description:
      "Send the case back to the Specialist with instructions to redirect the request to the data controller (the customer / employer). The escalation stays open until the Specialist closes the redirect loop.",
    notePromptLabel: "Redirect rationale + RS guidance",
    notePlaceholder:
      "Explain why the case should be redirected to the data controller, and any guidance for the redirect letter (template, addressed party, etc.)…",
    confirmLabel: "Request Redirect",
    tier: "warn",
    build: (note) => ({
      action: {
        id: genId("act"),
        action: "RequestRedirect",
        attorneyName,
        performedAt: new Date(),
        note,
      },
      statusPatch: {
        status: "RedirectRequested",
        redirectRequest: note,
      },
      auditKind: "RedirectRequested",
    }),
  };

  const markReviewedConfig: ActionDialogConfig = {
    title: "Mark Reviewed (decision drafted)",
    description:
      "You've reviewed the case and drafted a decision but want the Specialist to pick it up before delivery / Form 3 commits. The badge updates to \"Reviewed\" so the RS / TS knows the case is waiting on them.",
    notePromptLabel: "Decision summary for the Specialist",
    notePlaceholder:
      "Summarise the decision you reached and what the Specialist should do next…",
    confirmLabel: "Mark Reviewed",
    tier: "primary",
    build: (note) => ({
      action: {
        id: genId("act"),
        action: "MarkReviewed",
        attorneyName,
        performedAt: new Date(),
        note,
      },
      statusPatch: {
        status: "Reviewed",
        reviewNote: note,
      },
      auditKind: "Reviewed",
    }),
  };

  const blockConfig: ActionDialogConfig = {
    title: "Block Delivery / Form 3",
    description:
      "Mark this case as awaiting attorney review before any delivery or Form 3 transmission. Block is advisory — the Specialist can still proceed but every action is audited.",
    notePromptLabel: "Reason for the block",
    notePlaceholder:
      "Explain why delivery and Form 3 transmission should pause for attorney review…",
    acknowledgementText:
      "I confirm this case requires attorney review before any further delivery or correspondence with the Issuing / Enforcing Authority.",
    confirmLabel: "Block",
    tier: "danger",
    build: (note) => ({
      action: {
        id: genId("act"),
        action: "Block",
        attorneyName,
        performedAt: new Date(),
        note,
      },
      statusPatch: {
        status: "Blocked",
        blockingNote: note,
      },
      auditKind: "Blocked",
      notifyLead: true,
    }),
  };

  return (
    <Card id={id} className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ScalesRegular fontSize={20} style={{ color: "#5c2d91" }} />
          <div>
            <Text as="h3" weight="semibold" size={400}>
              Attorney Review Required
            </Text>
            <div className={styles.headerMeta}>
              <span>
                Escalated by <b>{esc.escalatedBy}</b>
              </span>
              <span className={styles.metaSep}>·</span>
              <span className={styles.inlineIcon}>
                <ClockRegular fontSize={14} />
                {formatRelativeAge(esc.escalatedAt)}
              </span>
              <span className={styles.metaSep}>·</span>
              <span>
                Targeted: <b>{roleLabel}</b>
                {assignee && ` · ${assignee.name}`}
              </span>
              {identifier && (
                <>
                  <span className={styles.metaSep}>·</span>
                  <span>
                    Identifier: <b>{identifier.value}</b>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {esc.status === "InformationRequested" && (
          <Badge color="warning" appearance="tint">
            Info Requested
          </Badge>
        )}
        {esc.status === "RedirectRequested" && (
          <Badge color="warning" appearance="tint">
            Redirect Requested
          </Badge>
        )}
        {esc.status === "Reviewed" && (
          <Badge color="brand" appearance="tint">
            Reviewed
          </Badge>
        )}
        {esc.status === "Blocked" && (
          <Badge color="danger" appearance="tint">
            Blocked
          </Badge>
        )}
      </div>

      {/* Reason */}
      <div className={styles.reasonBox}>
        <span className={styles.reasonLabel}>Reason for escalation</span>
        <Text className={styles.reasonText}>{esc.reason}</Text>
      </div>

      {/* Notification & non-disclosure posture — Phase 2 of the merge.
          Renders when the case has a disclosureConstraints block, and the
          identifier (when per-identifier mode) is known. */}
      {identifier && <DisclosureSection case={formData} identifier={identifier} />}

      {/* Enterprise heat strip — non-eEvidence cases (eEvidence cases will
          still see DisclosureSection for the controller-notify leg). */}
      {enterprise && formData.requestType !== "eEvidence" && (
        <EnterpriseConflictOfLawStrip case={formData} />
      )}

      {/* Information-requested note */}
      {esc.status === "InformationRequested" && esc.informationRequest && (
        <div className={`${styles.noteBox} ${styles.noteBoxInfo}`}>
          <span className={`${styles.noteBoxLabel} ${styles.noteBoxLabelInfo}`}>
            Information requested by attorney
          </span>
          <Text className={styles.reasonText}>{esc.informationRequest}</Text>
        </div>
      )}

      {/* Redirect-requested note — attorney wants the case sent back to
          the data controller. Same warn-tier styling as InfoRequested
          since both put the ball back in RS / TS's court. */}
      {esc.status === "RedirectRequested" && esc.redirectRequest && (
        <div className={`${styles.noteBox} ${styles.noteBoxInfo}`}>
          <span className={`${styles.noteBoxLabel} ${styles.noteBoxLabelInfo}`}>
            Redirect rationale + RS guidance
          </span>
          <Text className={styles.reasonText}>{esc.redirectRequest}</Text>
        </div>
      )}

      {/* Reviewed note — attorney has drafted a decision and is asking
          the Specialist to pick it up. Neutral / info styling — this
          isn't a problem, just a handoff. */}
      {esc.status === "Reviewed" && esc.reviewNote && (
        <div className={`${styles.noteBox} ${styles.noteBoxInfo}`}>
          <span className={`${styles.noteBoxLabel} ${styles.noteBoxLabelInfo}`}>
            Attorney decision summary
          </span>
          <Text className={styles.reasonText}>{esc.reviewNote}</Text>
        </div>
      )}

      {/* Blocking note */}
      {esc.status === "Blocked" && esc.blockingNote && (
        <div className={`${styles.noteBox} ${styles.noteBoxDanger}`}>
          <span className={`${styles.noteBoxLabel} ${styles.noteBoxLabelDanger}`}>
            Blocking note
          </span>
          <Text className={styles.reasonText}>{esc.blockingNote}</Text>
        </div>
      )}

      {/* Audit P1 #5 — three-tier action layout. Primary decisions
          (Release / Block) get the top row at full visual weight so
          the attorney's main path forward reads first. Conditional
          approval keeps its own outline button on the secondary row.
          The three handoff actions (Request More Info, Request
          Redirect, Mark Reviewed) collapse into a single "Send back
          to Specialist" menu so the row stops reading as a wall of
          six identical-weight outline buttons. */}
      <div>
        <span className={styles.actionsLabel}>Take action</span>
        <div className={styles.actionsPrimaryRow}>
          <Button
            appearance="primary"
            icon={<CheckmarkCircleRegular />}
            onClick={handleRelease}
          >
            Release Hold / Approve for Delivery
          </Button>
          <Button
            appearance="outline"
            icon={<ProhibitedRegular />}
            className={styles.blockButton}
            onClick={() => setOpenDialog(blockConfig)}
          >
            Block Delivery / Form 3…
          </Button>
        </div>
        <div className={styles.actionsSecondaryRow}>
          <Button
            appearance="outline"
            icon={<CircleHalfFillRegular />}
            onClick={() => setOpenDialog(conditionsConfig)}
          >
            Approve with Conditions…
          </Button>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <MenuButton
                appearance="outline"
                icon={<ArrowReplyRegular />}
              >
                Send back to Specialist…
              </MenuButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={<QuestionCircleRegular />}
                  onClick={() => setOpenDialog(requestInfoConfig)}
                >
                  Request More Information…
                </MenuItem>
                <MenuItem
                  icon={<ArrowHookUpLeftRegular />}
                  onClick={() => setOpenDialog(requestRedirectConfig)}
                >
                  Request Redirect to data controller…
                </MenuItem>
                <MenuItem
                  icon={<ClipboardTextEditRegular />}
                  onClick={() => setOpenDialog(markReviewedConfig)}
                >
                  Mark Reviewed (decision drafted)…
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </div>

      {/* Dialog mount — AttorneyActionDialog remains shadcn-styled; not
          touched by this PR. */}
      {openDialog && (
        <AttorneyActionDialog
          open={!!openDialog}
          onOpenChange={(o) => !o && setOpenDialog(null)}
          title={openDialog.title}
          description={openDialog.description}
          notePromptLabel={openDialog.notePromptLabel}
          notePlaceholder={openDialog.notePlaceholder}
          acknowledgementText={openDialog.acknowledgementText}
          confirmLabel={openDialog.confirmLabel}
          tier={openDialog.tier}
          onConfirm={(note) => {
            const cfg = openDialog.build(note);
            fireAction(cfg, note);
            setOpenDialog(null);
          }}
        />
      )}
    </Card>
  );
}
