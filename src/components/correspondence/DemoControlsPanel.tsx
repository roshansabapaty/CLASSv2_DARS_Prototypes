/**
 * DemoControlsPanel — dev-only floating panel for driving correspondence
 * demos by hand.
 *
 * Mounts in App.tsx behind `import.meta.env.DEV`. Renders bottom-right,
 * dismissable, persisted-visible via localStorage. Operations:
 *  - Simulate inbound arrival — pick case, counterparty, kind, subject,
 *    body, optional in-reply-to. Writes to the cross-case store + fires
 *    the toast + Aria-live announcement cascade.
 *  - Auto-progress outbound — pick a Sent / Delivered / Acknowledged
 *    outbound and advance one state. Synthesises a fake "AUTO-…"
 *    acknowledgement ref when advancing Delivered → Acknowledged.
 *  - Trigger Responded — picks an outbound and synthesises a linked
 *    inbound reply (since auto-sim doesn't generate Responded).
 *  - Disable / Enable auto-sim — toggle the timer cascade.
 *
 * Per docs/UI_LIBRARY_POLICY.md — Fluent v9 + Griffel only.
 */

import * as React from "react";
import {
  Body1,
  Button,
  Caption2,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogActions,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Select,
  Subtitle2,
  Switch,
  Textarea,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowSync20Regular,
  Dismiss20Regular,
  DocumentBulletList20Regular,
  Mail20Regular,
  Settings20Regular,
  Wand20Regular,
} from "@fluentui/react-icons";
import { toast } from "sonner@2.0.3";
import {
  getAllSnapshot,
  get as getCorrespondenceForCase,
  set as setCorrespondenceForCase,
  subscribe as subscribeToStore,
} from "../../state/correspondenceStore";
import {
  isOutbound,
  type CorrespondenceItem,
  type InboundCorrespondenceItem,
  type InboundKind,
  type OutboundCorrespondenceItem,
} from "../../types/correspondence";
import {
  linkInbound,
  transitionOutbound,
} from "./correspondenceEngine";
import { MOCK_CASES } from "../case-queue/case-queue-types";
import {
  isAutoSimDisabled,
  setAutoSimDisabled,
} from "../../hooks/useOutboundAutoSim";

const useStyles = makeStyles({
  fab: {
    position: "fixed",
    // Lifted to ~96 px above the viewport bottom so the FAB clears the
    // WorkflowListPane's sticky footer (Save Draft + Submit, ~56 px tall
    // + padding) without obstructing it. Stays bottom-left so the
    // Fulfillment Wizard's Next button (bottom-right inside the wizard
    // panel) is also unaffected.
    bottom: "96px",
    left: tokens.spacingHorizontalL,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    rowGap: tokens.spacingVerticalXS,
  },
  panel: {
    width: "320px",
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke1,
    borderRightColor: tokens.colorNeutralStroke1,
    borderBottomColor: tokens.colorNeutralStroke1,
    borderLeftColor: tokens.colorNeutralStroke1,
    boxShadow: tokens.shadow16,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.spacingVerticalS,
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const LS_HIDDEN_KEY = "dars.demoControls.hidden";

const INBOUND_KINDS: Array<{ value: InboundKind; label: string }> = [
  { value: "Text", label: "Text / Letter" },
  { value: "Acknowledgement", label: "Acknowledgement" },
  { value: "Attachment", label: "Attachment only" },
  { value: "StructuredForm", label: "Structured form" },
  { value: "WithdrawalAmendment", label: "Withdrawal / Amendment" },
];

/** Form template catalog — drives the "Fire eEvidence form" demo flow.
 *  Each entry maps the form template (per `src/config/formTemplates.ts`) to
 *  the correspondence-shape fields it needs at fire-time:
 *    - Inbound forms: a specific `kind` discriminator + structuredForm
 *      payload with the template id.
 *    - Outbound forms: a `documentKind` discriminator + optional
 *      `formInstanceId` (omitted here — the demo flow synthesises an
 *      outbound shell that's clickable in the correspondence list but
 *      doesn't drive form preview; sufficient for demoing the wire-flow). */
type DemoFormDirection = "Inbound" | "Outbound";
interface DemoFormTemplate {
  templateId: string;
  label: string;
  direction: DemoFormDirection;
  defaultCounterparty: "IssuingAuthority" | "EnforcingAuthority";
  /** Inbound kind discriminator — present only when direction === "Inbound". */
  inboundKind?: InboundKind;
  /** Outbound documentKind discriminator — present only when direction === "Outbound". */
  outboundDocumentKind?: import("../../types/correspondence").OutboundDocumentKind;
  /** Pre-populated subject line (the demo presenter can override before firing). */
  defaultSubject: string;
  /** Pre-populated body / preview text. */
  defaultBody: string;
}
const DEMO_FORM_TEMPLATES: DemoFormTemplate[] = [
  // ── Inbound forms (from IA / EA) ────────────────────────────────────
  {
    templateId: "EPOC_FORM_2",
    label: "Form 2 — Preservation Order (inbound)",
    direction: "Inbound",
    defaultCounterparty: "IssuingAuthority",
    inboundKind: "PreservationOrder",
    defaultSubject: "Form 2 — Preservation Order",
    defaultBody:
      "Pursuant to Regulation (EU) 2023/1543, the issuing authority requires preservation of the data identified in the attached EPOC-PR.",
  },
  {
    templateId: "EPOC_FORM_5",
    label: "Form 5 — Confirmation of Issuance (inbound)",
    direction: "Inbound",
    defaultCounterparty: "IssuingAuthority",
    inboundKind: "Form5_ConfirmationOfIssuance",
    defaultSubject: "Form 5 — Confirmation of Issuance (production order to follow)",
    defaultBody:
      "Confirmation that a follow-on production order will be issued against data preserved under the referenced EPOC-PR.",
  },
  {
    templateId: "EPOC_FORM_6",
    label: "Form 6 — Preservation Extension (inbound)",
    direction: "Inbound",
    defaultCounterparty: "IssuingAuthority",
    inboundKind: "PreservationExtension",
    defaultSubject: "Form 6 — Preservation Extension",
    defaultBody:
      "The issuing authority extends the preservation obligation to a new expiry date.",
  },
  {
    templateId: "EPOC_END_PRESERVATION",
    label: "End of Preservation (inbound)",
    direction: "Inbound",
    defaultCounterparty: "IssuingAuthority",
    inboundKind: "EndPreservation",
    defaultSubject: "End of Preservation — preservation obligation closed",
    defaultBody:
      "The preservation obligation is closed. 45-day retention clock begins on the date stated.",
  },
  {
    templateId: "EPOC_WITHDRAWAL",
    label: "EPOC Withdrawal Notice (inbound)",
    direction: "Inbound",
    defaultCounterparty: "IssuingAuthority",
    inboundKind: "Withdrawal",
    defaultSubject: "EPOC Withdrawal Notice",
    defaultBody:
      "The issuing authority withdraws the EPOC. Cancel pending delivery; start the 45-day retention clock.",
  },
  // ── Outbound forms (from SP / Microsoft) ────────────────────────────
  {
    templateId: "EPOC_FORM_3",
    label: "Form 3 — Non-Execution Response (outbound)",
    direction: "Outbound",
    defaultCounterparty: "IssuingAuthority",
    outboundDocumentKind: "SignedForm",
    defaultSubject: "EPOC Form 3 — Non-Execution Response",
    defaultBody:
      "Microsoft is unable to execute the EPOC for the reason(s) selected in the attached Form 3.",
  },
  {
    templateId: "EPOC_PRESERVATION_ACK",
    label: "Preservation Acknowledgement (outbound)",
    direction: "Outbound",
    defaultCounterparty: "IssuingAuthority",
    outboundDocumentKind: "PreservationAcknowledged",
    defaultSubject: "Preservation Acknowledgement",
    defaultBody:
      "Microsoft acknowledges receipt of the preservation order and confirms the obligation is in effect for the identifiers listed.",
  },
  {
    templateId: "REQUEST_ADDITIONAL_INFORMATION",
    label: "Request Additional Information (outbound)",
    direction: "Outbound",
    defaultCounterparty: "IssuingAuthority",
    outboundDocumentKind: "RequestAdditionalInformation",
    defaultSubject: "Request for Additional Information",
    defaultBody:
      "Microsoft requires clarification before this order can be processed. Please provide the items listed below.",
  },
  {
    templateId: "PROVIDE_ADDITIONAL_INFORMATION",
    label: "Provide Additional Information (outbound)",
    direction: "Outbound",
    defaultCounterparty: "IssuingAuthority",
    outboundDocumentKind: "ProvideAdditionalInformation",
    defaultSubject: "Provide Additional Information",
    defaultBody:
      "Microsoft replies with the additional information requested by the authority.",
  },
  {
    templateId: "STANDARD_PRODUCTION_LETTER",
    label: "Standard Production Letter (outbound)",
    direction: "Outbound",
    defaultCounterparty: "IssuingAuthority",
    outboundDocumentKind: "SignedForm",
    defaultSubject: "Standard Production Letter",
    defaultBody:
      "Microsoft confirms production of the data identified in the attached letter.",
  },
];

function genId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function shortRef(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function DemoControlsPanel() {
  const styles = useStyles();

  const [hidden, setHidden] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_HIDDEN_KEY) === "true";
    } catch {
      return false;
    }
  });
  const persistHidden = (h: boolean) => {
    setHidden(h);
    try {
      if (h) localStorage.setItem(LS_HIDDEN_KEY, "true");
      else localStorage.removeItem(LS_HIDDEN_KEY);
    } catch {
      /* noop */
    }
  };

  const [autoSimDisabled, setAutoSimDisabledState] = React.useState<boolean>(
    () => isAutoSimDisabled(),
  );
  React.useEffect(() => {
    // Keep this in sync with cross-tab toggles.
    setAutoSimDisabledState(isAutoSimDisabled());
  }, []);

  const [inboundOpen, setInboundOpen] = React.useState(false);
  const [progressOpen, setProgressOpen] = React.useState(false);
  const [respondOpen, setRespondOpen] = React.useState(false);
  const [fireFormOpen, setFireFormOpen] = React.useState(false);

  if (hidden) {
    return (
      <div className={styles.fab}>
        <Button
          appearance="primary"
          icon={<Settings20Regular />}
          onClick={() => persistHidden(false)}
          aria-label="Show demo controls"
        >
          Demo
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.fab}>
      <div className={styles.panel} role="region" aria-label="Demo controls">
        <div className={styles.header}>
          <Subtitle2>Demo Controls</Subtitle2>
          <Button
            appearance="subtle"
            size="small"
            icon={<Dismiss20Regular />}
            aria-label="Hide demo controls"
            onClick={() => persistHidden(true)}
          />
        </div>
        <Caption2>
          Dev-only. Drive correspondence demos by hand without waiting on
          the auto-sim cascade.
        </Caption2>

        <div className={styles.controls} style={{ marginTop: tokens.spacingVerticalS }}>
          <Button
            appearance="primary"
            icon={<Mail20Regular />}
            onClick={() => setInboundOpen(true)}
          >
            Simulate inbound arrival
          </Button>
          <Button
            appearance="secondary"
            icon={<ArrowSync20Regular />}
            onClick={() => setProgressOpen(true)}
          >
            Auto-progress outbound
          </Button>
          <Button
            appearance="secondary"
            icon={<Wand20Regular />}
            onClick={() => setRespondOpen(true)}
          >
            Trigger Responded
          </Button>
          <Button
            appearance="secondary"
            icon={<DocumentBulletList20Regular />}
            onClick={() => setFireFormOpen(true)}
          >
            Fire eEvidence form
          </Button>

          <div className={styles.toggleRow}>
            <Caption2>Auto-sim cascade</Caption2>
            <Switch
              checked={!autoSimDisabled}
              onChange={(_e, data) => {
                setAutoSimDisabled(!data.checked);
                setAutoSimDisabledState(!data.checked);
              }}
              label={autoSimDisabled ? "Off" : "On"}
            />
          </div>
        </div>
      </div>

      {inboundOpen && (
        <SimulateInboundDialog
          open={inboundOpen}
          onClose={() => setInboundOpen(false)}
        />
      )}
      {progressOpen && (
        <ProgressOutboundDialog
          open={progressOpen}
          onClose={() => setProgressOpen(false)}
        />
      )}
      {respondOpen && (
        <TriggerRespondedDialog
          open={respondOpen}
          onClose={() => setRespondOpen(false)}
        />
      )}
      {fireFormOpen && (
        <FireFormDialog
          open={fireFormOpen}
          onClose={() => setFireFormOpen(false)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Simulate inbound arrival
// ────────────────────────────────────────────────────────────────────────

function useCaseOptions() {
  return React.useMemo(() => MOCK_CASES.map((c) => c.caseId), []);
}

function SimulateInboundDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const caseOptions = useCaseOptions();
  const [caseId, setCaseId] = React.useState<string>(caseOptions[0] ?? "");
  const [counterparty, setCounterparty] = React.useState<
    "IssuingAuthority" | "EnforcingAuthority"
  >("IssuingAuthority");
  const [kind, setKind] = React.useState<InboundKind>("Text");
  const [subject, setSubject] = React.useState("Simulated inbound");
  const [body, setBody] = React.useState(
    "This is a simulated message from the authority for the demo cascade.",
  );

  const canSubmit = caseId && subject.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const now = new Date();
    const item: InboundCorrespondenceItem = {
      id: genId("corr-in"),
      caseId,
      direction: "Inbound",
      counterparty,
      channel: "DecentralisedITSystem",
      kind,
      subject: subject.trim(),
      body: body.trim() || undefined,
      createdAt: now,
    };
    const current = getCorrespondenceForCase(caseId);
    setCorrespondenceForCase(caseId, [...current, item]);
    // DARS has no real-time push — the unread count on the case + the bell
    // badge will only refresh when the user reloads. Wording the toast as
    // a demo confirmation (not a notification pop-up) so the demo doesn't
    // mislead the audience into thinking we have push.
    toast.info("Demo: inbound stored", {
      description: `${caseId} — refresh the page to update the case's unread count.`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_e, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Simulate inbound arrival</DialogTitle>
          <DialogContent
            style={{
              display: "flex",
              flexDirection: "column",
              rowGap: tokens.spacingVerticalS,
            }}
          >
            <Field label="Case" required>
              <Select
                value={caseId}
                onChange={(_e, data) => setCaseId(data.value)}
              >
                {caseOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="From">
              <Select
                value={counterparty}
                onChange={(_e, data) =>
                  setCounterparty(data.value as typeof counterparty)
                }
              >
                <option value="IssuingAuthority">Issuing Authority</option>
                <option value="EnforcingAuthority">Enforcing Authority</option>
              </Select>
            </Field>
            <Field label="Kind">
              <Select
                value={kind}
                onChange={(_e, data) => setKind(data.value as InboundKind)}
              >
                {INBOUND_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject" required>
              <Input
                value={subject}
                onChange={(_e, data) => setSubject(data.value)}
              />
            </Field>
            <Field label="Body">
              <Textarea
                resize="vertical"
                value={body}
                onChange={(_e, data) => setBody(data.value)}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              Fire
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Auto-progress outbound (single step)
// ────────────────────────────────────────────────────────────────────────

function useAllOutbound(): Array<{
  caseId: string;
  item: OutboundCorrespondenceItem;
}> {
  const snapshot = React.useSyncExternalStore(
    subscribeToStore,
    getAllSnapshot,
    getAllSnapshot,
  );
  return React.useMemo(() => {
    const out: Array<{ caseId: string; item: OutboundCorrespondenceItem }> = [];
    snapshot.forEach((items, caseId) => {
      (items as CorrespondenceItem[]).forEach((i) => {
        if (isOutbound(i)) out.push({ caseId, item: i });
      });
    });
    return out;
  }, [snapshot]);
}

function ProgressOutboundDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const allOutbound = useAllOutbound();
  const advanceable = allOutbound.filter(
    (e) =>
      e.item.transmission.status === "Sent" ||
      e.item.transmission.status === "Delivered",
  );
  const [pickedId, setPickedId] = React.useState<string>(
    advanceable[0]?.item.id ?? "",
  );
  const picked = advanceable.find((e) => e.item.id === pickedId);

  const handleSubmit = () => {
    if (!picked) return;
    const items = getCorrespondenceForCase(picked.caseId);
    const status = picked.item.transmission.status;
    const now = new Date();
    // No push in DARS — outbound state advances are server-side and only
    // surface on case reload. The toast confirms the demo action without
    // pretending a notification fired.
    if (status === "Sent") {
      const next = transitionOutbound(items, picked.item.id, "Delivered", {
        deliveredAt: now,
        deliveryConfirmedBy: "AutoSim",
      });
      setCorrespondenceForCase(picked.caseId, next);
      toast.info("Demo: outbound advanced to Delivered", {
        description: `${picked.item.subject} — refresh to see the new status on the case.`,
      });
    } else if (status === "Delivered") {
      const next = transitionOutbound(items, picked.item.id, "Acknowledged", {
        acknowledgedAt: now,
        acknowledgementRef: `AUTO-${shortRef()}`,
      });
      setCorrespondenceForCase(picked.caseId, next);
      toast.info("Demo: outbound advanced to Acknowledged", {
        description: `${picked.item.subject} — refresh to see the new status on the case.`,
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_e, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Auto-progress outbound</DialogTitle>
          <DialogContent
            style={{
              display: "flex",
              flexDirection: "column",
              rowGap: tokens.spacingVerticalS,
            }}
          >
            {advanceable.length === 0 ? (
              <MessageBar>
                <MessageBarBody>
                  No outbound items in <b>Sent</b> or <b>Delivered</b> right
                  now. Send a free-text letter or a signed form first.
                </MessageBarBody>
              </MessageBar>
            ) : (
              <>
                <Field label="Outbound item">
                  <Select
                    value={pickedId}
                    onChange={(_e, data) => setPickedId(data.value)}
                  >
                    {advanceable.map((e) => (
                      <option key={e.item.id} value={e.item.id}>
                        {e.caseId} — {e.item.subject} (
                        {e.item.transmission.status})
                      </option>
                    ))}
                  </Select>
                </Field>
                {picked && (
                  <Body1>
                    Will advance to{" "}
                    <b>
                      {picked.item.transmission.status === "Sent"
                        ? "Delivered"
                        : "Acknowledged"}
                    </b>
                    .
                  </Body1>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={!picked}
              onClick={handleSubmit}
            >
              Advance
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Trigger Responded — synthesise a linked inbound reply
// ────────────────────────────────────────────────────────────────────────

function TriggerRespondedDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const allOutbound = useAllOutbound();
  const eligible = allOutbound.filter(
    (e) =>
      e.item.transmission.status !== "Responded" &&
      e.item.transmission.status !== "Failed" &&
      e.item.transmission.status !== "Draft",
  );
  const [pickedId, setPickedId] = React.useState<string>(
    eligible[0]?.item.id ?? "",
  );
  const [subject, setSubject] = React.useState("Re: Your previous letter");
  const [body, setBody] = React.useState(
    "Thank you for your correspondence. Please find our response attached / inline.",
  );
  const [markRead, setMarkRead] = React.useState(false);

  const picked = eligible.find((e) => e.item.id === pickedId);

  const handleSubmit = () => {
    if (!picked) return;
    const now = new Date();
    const inboundReply: InboundCorrespondenceItem = {
      id: genId("corr-in"),
      caseId: picked.caseId,
      direction: "Inbound",
      counterparty: picked.item.counterparty,
      channel: picked.item.channel,
      kind: "Text",
      subject: subject.trim() || "Reply",
      body: body.trim() || undefined,
      inReplyToId: picked.item.id,
      createdAt: now,
      readAt: markRead ? now : undefined,
    };
    // Append inbound + link the outbound's transmission to Responded.
    const items = getCorrespondenceForCase(picked.caseId);
    const withInbound = [...items, inboundReply];
    const linked = linkInbound(withInbound, picked.item.id, inboundReply);
    setCorrespondenceForCase(picked.caseId, linked);
    // Same realism guard as Simulate Inbound — the response is data, not a
    // push event. The bell badge / case unread count surfaces on reload.
    toast.info("Demo: authority response stored", {
      description: `${picked.caseId} — refresh to surface the new inbound on the case.`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_e, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Trigger Responded</DialogTitle>
          <DialogContent
            style={{
              display: "flex",
              flexDirection: "column",
              rowGap: tokens.spacingVerticalS,
            }}
          >
            {eligible.length === 0 ? (
              <MessageBar>
                <MessageBarBody>
                  No outbound items are eligible (must be Sent / Delivered /
                  Acknowledged). Send one first.
                </MessageBarBody>
              </MessageBar>
            ) : (
              <>
                <Field label="In reply to">
                  <Select
                    value={pickedId}
                    onChange={(_e, data) => setPickedId(data.value)}
                  >
                    {eligible.map((e) => (
                      <option key={e.item.id} value={e.item.id}>
                        {e.caseId} — {e.item.subject} (
                        {e.item.transmission.status})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Subject" required>
                  <Input
                    value={subject}
                    onChange={(_e, data) => setSubject(data.value)}
                  />
                </Field>
                <Field label="Body">
                  <Textarea
                    resize="vertical"
                    value={body}
                    onChange={(_e, data) => setBody(data.value)}
                  />
                </Field>
                <Checkbox
                  label="Mark as read immediately (so the unread badge doesn't flash)"
                  checked={markRead}
                  onChange={(_e, data) => setMarkRead(!!data.checked)}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={!picked || subject.trim().length === 0}
              onClick={handleSubmit}
            >
              Fire
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Fire eEvidence form — inbound (structuredForm + kind) or outbound
// (documentKind). Both share a single dialog with a direction toggle.
// ────────────────────────────────────────────────────────────────────────

function FireFormDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const caseOptions = useCaseOptions();
  const [direction, setDirection] = React.useState<DemoFormDirection>("Inbound");
  const filteredForms = React.useMemo(
    () => DEMO_FORM_TEMPLATES.filter((t) => t.direction === direction),
    [direction],
  );
  const [templateId, setTemplateId] = React.useState<string>(
    filteredForms[0]?.templateId ?? "",
  );
  const picked =
    filteredForms.find((t) => t.templateId === templateId) ?? filteredForms[0];

  // Reset templateId when direction switches so we don't end up with a
  // mismatched template id from the prior direction.
  React.useEffect(() => {
    if (filteredForms.length === 0) {
      setTemplateId("");
      return;
    }
    if (!filteredForms.find((t) => t.templateId === templateId)) {
      setTemplateId(filteredForms[0].templateId);
    }
  }, [filteredForms, templateId]);

  const [caseId, setCaseId] = React.useState<string>(caseOptions[0] ?? "");
  const [counterparty, setCounterparty] = React.useState<
    "IssuingAuthority" | "EnforcingAuthority"
  >(picked?.defaultCounterparty ?? "IssuingAuthority");
  const [subject, setSubject] = React.useState<string>(
    picked?.defaultSubject ?? "",
  );
  const [body, setBody] = React.useState<string>(picked?.defaultBody ?? "");

  // Re-seed subject + body whenever the picked template changes so the demo
  // presenter doesn't have to re-type the suggested copy. They can still
  // override after picking.
  const lastTemplateIdRef = React.useRef<string>(templateId);
  React.useEffect(() => {
    if (lastTemplateIdRef.current === templateId || !picked) return;
    lastTemplateIdRef.current = templateId;
    setSubject(picked.defaultSubject);
    setBody(picked.defaultBody);
    setCounterparty(picked.defaultCounterparty);
  }, [templateId, picked]);

  const canSubmit = !!picked && !!caseId && subject.trim().length > 0;

  const handleSubmit = () => {
    if (!picked || !caseId) return;
    const now = new Date();
    const items = getCorrespondenceForCase(caseId);

    if (direction === "Inbound") {
      const inbound: InboundCorrespondenceItem = {
        id: genId("corr-in"),
        caseId,
        direction: "Inbound",
        counterparty,
        channel: "DecentralisedITSystem",
        kind: picked.inboundKind ?? "StructuredForm",
        subject: subject.trim(),
        body: body.trim() || undefined,
        createdAt: now,
        structuredForm: {
          templateId: picked.templateId,
          // Empty values bag — the demo synthesises a shell. Real
          // production-grade structured payloads (with the per-form A_*/B_*
          // keys handlers read) are seeded in mockCorrespondenceSeeds.ts;
          // editing those by hand from the demo panel is out of scope here.
          values: {},
        },
      };
      setCorrespondenceForCase(caseId, [...items, inbound]);
      toast.info("Demo: inbound form stored", {
        description: `${caseId} — ${picked.label}. Refresh the page to surface it on the case's correspondence.`,
      });
    } else {
      const outbound: OutboundCorrespondenceItem = {
        id: genId("corr-out"),
        caseId,
        direction: "Outbound",
        counterparty,
        channel: "DecentralisedITSystem",
        subject: subject.trim(),
        body: body.trim() || undefined,
        createdAt: now,
        documentKind: picked.outboundDocumentKind ?? "SignedForm",
        transmission: {
          status: "Sent",
          sentAt: now,
          sentBy: "DemoControls",
        },
        // formInstanceId intentionally omitted — the demo synthesises the
        // wire shape so it shows up in correspondence views, but without a
        // backing CaseFormInstance the click-to-preview hatch stays inert.
        // Sufficient for demoing "an outbound form was sent". For full
        // preview-driven demos use the seeded mock items (e.g.
        // corr-fr-form3-out-001).
      };
      setCorrespondenceForCase(caseId, [...items, outbound]);
      toast.info("Demo: outbound form stored", {
        description: `${caseId} — ${picked.label}. Refresh the page to surface it on the case's correspondence.`,
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_e, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Fire eEvidence form</DialogTitle>
          <DialogContent
            style={{
              display: "flex",
              flexDirection: "column",
              rowGap: tokens.spacingVerticalS,
            }}
          >
            <Field label="Direction">
              <Select
                value={direction}
                onChange={(_e, data) =>
                  setDirection(data.value as DemoFormDirection)
                }
              >
                <option value="Inbound">Inbound (from authority)</option>
                <option value="Outbound">Outbound (from Microsoft)</option>
              </Select>
            </Field>
            <Field label="Form template" required>
              <Select
                value={templateId}
                onChange={(_e, data) => setTemplateId(data.value)}
              >
                {filteredForms.map((t) => (
                  <option key={t.templateId} value={t.templateId}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Case" required>
              <Select
                value={caseId}
                onChange={(_e, data) => setCaseId(data.value)}
              >
                {caseOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={direction === "Inbound" ? "From" : "To"}>
              <Select
                value={counterparty}
                onChange={(_e, data) =>
                  setCounterparty(data.value as typeof counterparty)
                }
              >
                <option value="IssuingAuthority">Issuing Authority</option>
                <option value="EnforcingAuthority">Enforcing Authority</option>
              </Select>
            </Field>
            <Field label="Subject" required>
              <Input
                value={subject}
                onChange={(_e, data) => setSubject(data.value)}
              />
            </Field>
            <Field label="Body">
              <Textarea
                resize="vertical"
                value={body}
                onChange={(_e, data) => setBody(data.value)}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              Fire
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
