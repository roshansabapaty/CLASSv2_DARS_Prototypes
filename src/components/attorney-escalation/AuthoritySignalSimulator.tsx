/**
 * AuthoritySignalSimulator — prototype-only dev affordance that fires
 * authority signal mutations through the unified write helpers.
 *
 * Real authority signals (IA Form 4 status updates, EA GFR decisions)
 * land via Decentralised IT System inbound or LE-portal inboxes that
 * the prototype doesn't simulate. This dialog gives the demoer a way
 * to exercise `applyAuthorizationStatusUpdate` + `applyGfrDecision`
 * end-to-end so the status badges, audit thread, and per-task /
 * case-wide propagation can be validated.
 *
 * Pinned follow-up #2 in the merge plan — when real authority-signal
 * surfaces ship, this affordance can be deleted (or moved behind a
 * dev flag).
 */

import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Dropdown,
  Field,
  Option,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { GavelRegular } from "@fluentui/react-icons";
import {
  applyAuthorizationStatusUpdate,
  applyGfrDecision,
  gfrSignalScope,
} from "../../utils/caseEscalation";
import { setCaseFormDataInRegistry } from "../../utils/caseDataRegistry";
import type {
  EEvidenceGroundsForRefusal,
  EscalationAuditEvent,
  FormData,
  SignalScope,
} from "../../types/caseTypes";

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
    minWidth: "480px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  sectionTitle: {
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  scopeRow: {
    display: "flex",
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: "wrap",
  },
});

type AuthStatusValue =
  | "Approved"
  | "Cancelled"
  | "Withdrawn"
  | "Suspended";

const AUTH_STATUS_VALUES: AuthStatusValue[] = [
  "Approved",
  "Cancelled",
  "Withdrawn",
  "Suspended",
];

type GfrKind = "None" | "Full" | "Partial";

const REFUSAL_REASONS_SAMPLE = [
  "ManifestBreachOfFundamentalRights",
  "ImmunityOrPrivilegeUnderLawOfExecutingState",
  "ConflictWithThirdCountryLaw",
];

export interface AuthoritySignalSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  case: FormData;
  /** Setter the parent uses to commit the mutated FormData. The
   *  simulator also writes through to the registry so other surfaces
   *  pick up the change on next read. */
  onCommit: (next: FormData) => void;
}

export function AuthoritySignalSimulator({
  open,
  onOpenChange,
  case: c,
  onCommit,
}: AuthoritySignalSimulatorProps) {
  const styles = useStyles();
  const identifiers = c.identifiers ?? [];

  // ── Section 1: IA Form 4 — authorization status update ───────────
  const [authStatus, setAuthStatus] = React.useState<AuthStatusValue>(
    "Approved",
  );
  const [authScopeKind, setAuthScopeKind] = React.useState<
    "all" | "some"
  >("all");
  const [authSelectedIds, setAuthSelectedIds] = React.useState<string[]>(
    [],
  );

  const toggleAuthId = (id: string) => {
    setAuthSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const fireAuthStatusUpdate = () => {
    const scope: SignalScope =
      authScopeKind === "all"
        ? { kind: "all" }
        : { kind: "some", identifierIds: authSelectedIds };
    if (
      scope.kind === "some" &&
      scope.identifierIds.length === 0
    ) {
      return; // No-op; the disabled state on the button blocks this anyway.
    }
    const now = new Date();
    const audit: EscalationAuditEvent = {
      id: `audit-ia-form4-${Date.now().toString(36)}`,
      kind: "Resumed", // Reuse an existing kind to avoid widening the audit enum.
      actor: c.agency ?? "Issuing Authority",
      performedAt: now,
      note: `[Simulated IA Form 4] Authorization desired status → ${authStatus}. Scope: ${scope.kind === "all" ? "all identifiers" : `${scope.identifierIds.length} of ${identifiers.length} task(s)`}.`,
    };
    const next = applyAuthorizationStatusUpdate(c, scope, {
      status: authStatus,
      updatedAt: now,
      updatedBy: c.agency ?? "Issuing Authority",
      auditEvent: audit,
    });
    setCaseFormDataInRegistry(next.caseId, next);
    onCommit(next);
    onOpenChange(false);
  };

  // ── Section 2: EA Grounds for Refusal ────────────────────────────
  const [gfrKind, setGfrKind] = React.useState<GfrKind>("None");
  const [gfrBlockedTaskIds, setGfrBlockedTaskIds] = React.useState<
    string[]
  >([]);

  const toggleGfrTask = (taskId: string) => {
    setGfrBlockedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((x) => x !== taskId)
        : [...prev, taskId],
    );
  };

  const fireGfrDecision = () => {
    const now = new Date();
    let gfr: EEvidenceGroundsForRefusal;
    if (gfrKind === "None") {
      gfr = {
        trigger: "Form1Review",
        notifiedAt: now,
        eaReviewWindowExpiresAt: new Date(
          now.getTime() + 10 * 24 * 60 * 60 * 1000,
        ),
        ea: { name: "Simulated EA", referenceNumber: "SIM-EA-NONE" },
        decision: {
          kind: "None",
          decidedAt: now,
          decidedBy: "Simulated EA Coordinator",
          note: "Simulated: EA reviewed Form 1 and issued No Grounds for Refusal.",
        },
      };
    } else if (gfrKind === "Full") {
      gfr = {
        trigger: "Form1Review",
        notifiedAt: now,
        eaReviewWindowExpiresAt: new Date(
          now.getTime() + 10 * 24 * 60 * 60 * 1000,
        ),
        ea: { name: "Simulated EA", referenceNumber: "SIM-EA-FULL" },
        decision: {
          kind: "Full",
          decidedAt: now,
          decidedBy: "Simulated EA Coordinator",
          reasons: [REFUSAL_REASONS_SAMPLE[0]] as any,
          reasonSummary: "Simulated full GFR — case-wide block.",
        },
      };
    } else {
      // Partial — uses `blockedTaskObjectIds` from the per-task picker
      // (mapped to AccountIdentifier.taskId values).
      gfr = {
        trigger: "Form1Review",
        notifiedAt: now,
        eaReviewWindowExpiresAt: new Date(
          now.getTime() + 10 * 24 * 60 * 60 * 1000,
        ),
        ea: { name: "Simulated EA", referenceNumber: "SIM-EA-PART" },
        decision: {
          kind: "Partial",
          decidedAt: now,
          decidedBy: "Simulated EA Coordinator",
          reasons: [REFUSAL_REASONS_SAMPLE[0]] as any,
          reasonSummary: "Simulated partial GFR — task-scoped block.",
          blockedTaskObjectIds: gfrBlockedTaskIds,
        },
      };
    }

    // Use gfrSignalScope to derive the resolved per-identifier scope
    // for the audit note (so the audit thread captures the scope kind
    // even though the GFR record lives at case level).
    const derivedScope = gfrSignalScope(gfr.decision, identifiers);
    const audit: EscalationAuditEvent = {
      id: `audit-ea-gfr-${Date.now().toString(36)}`,
      kind: gfr.decision.kind === "None" ? "GfrCleared" : "GfrReceived",
      actor: "Simulated EA",
      performedAt: now,
      note: `[Simulated EA GFR] kind: ${gfr.decision.kind}. Derived SignalScope: ${derivedScope.kind}${derivedScope.kind === "some" ? ` (${derivedScope.identifierIds.length} of ${identifiers.length})` : ""}.`,
    };

    const next = applyGfrDecision(c, gfr, audit);
    setCaseFormDataInRegistry(next.caseId, next);
    onCommit(next);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_e, data) => onOpenChange(data.open)}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Simulate Authority Signal</DialogTitle>
          <DialogContent className={styles.body}>
            <Text className={styles.hint}>
              Prototype affordance — exercises the unified write helpers
              (<code>applyAuthorizationStatusUpdate</code>,{" "}
              <code>applyGfrDecision</code>) without a real Decentralised
              IT System inbound. Closes when committed.
            </Text>

            {/* ── IA Form 4 simulator ── */}
            <div className={styles.section}>
              <Text className={styles.sectionTitle}>
                IA Form 4 — authorization desired status update
              </Text>
              <Field label="Desired status">
                <Dropdown
                  value={authStatus}
                  selectedOptions={[authStatus]}
                  onOptionSelect={(_e, data) =>
                    data.optionValue &&
                    setAuthStatus(data.optionValue as AuthStatusValue)
                  }
                >
                  {AUTH_STATUS_VALUES.map((v) => (
                    <Option key={v} value={v}>
                      {v}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Scope">
                <Dropdown
                  value={
                    authScopeKind === "all"
                      ? "All identifiers (case-wide)"
                      : "Specific tasks"
                  }
                  selectedOptions={[authScopeKind]}
                  onOptionSelect={(_e, data) =>
                    data.optionValue &&
                    setAuthScopeKind(data.optionValue as "all" | "some")
                  }
                >
                  <Option value="all">All identifiers (case-wide)</Option>
                  <Option value="some">Specific tasks</Option>
                </Dropdown>
              </Field>
              {authScopeKind === "some" && (
                <div className={styles.scopeRow}>
                  {identifiers.map((id) => (
                    <label
                      key={id.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        columnGap: 6,
                        fontSize: tokens.fontSizeBase200,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={authSelectedIds.includes(id.id)}
                        onChange={() => toggleAuthId(id.id)}
                      />
                      <code style={{ fontSize: 11 }}>{id.taskId ?? "—"}</code>{" "}
                      {id.value}
                    </label>
                  ))}
                </div>
              )}
              <div>
                <Button
                  appearance="primary"
                  onClick={fireAuthStatusUpdate}
                  disabled={
                    authScopeKind === "some" &&
                    authSelectedIds.length === 0
                  }
                >
                  Apply IA Form 4 update
                </Button>
              </div>
            </div>

            {/* ── EA GFR simulator ── */}
            <div className={styles.section}>
              <Text className={styles.sectionTitle}>
                EA Grounds for Refusal — Form 1 review
              </Text>
              <Field label="Decision">
                <Dropdown
                  value={gfrKind}
                  selectedOptions={[gfrKind]}
                  onOptionSelect={(_e, data) =>
                    data.optionValue &&
                    setGfrKind(data.optionValue as GfrKind)
                  }
                >
                  <Option value="None">None — case-wide clear</Option>
                  <Option value="Full">Full — case-wide block</Option>
                  <Option value="Partial">Partial — task-scoped block</Option>
                </Dropdown>
              </Field>
              {gfrKind === "Partial" && (
                <div className={styles.scopeRow}>
                  {identifiers.map((id) => (
                    <label
                      key={id.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        columnGap: 6,
                        fontSize: tokens.fontSizeBase200,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={gfrBlockedTaskIds.includes(id.taskId ?? "")}
                        onChange={() =>
                          id.taskId && toggleGfrTask(id.taskId)
                        }
                        disabled={!id.taskId}
                      />
                      <code style={{ fontSize: 11 }}>{id.taskId ?? "—"}</code>{" "}
                      {id.value}
                    </label>
                  ))}
                </div>
              )}
              <div>
                <Button
                  appearance="primary"
                  icon={<GavelRegular />}
                  onClick={fireGfrDecision}
                  disabled={
                    gfrKind === "Partial" && gfrBlockedTaskIds.length === 0
                  }
                >
                  Issue {gfrKind} GFR
                </Button>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
