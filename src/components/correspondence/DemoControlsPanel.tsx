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
  Option,
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
    bottom: tokens.spacingVerticalL,
    // Anchor bottom-left so we don't collide with the Fulfillment Wizard's
    // Next button or other primary CTAs that live in the bottom-right of
    // most workflow screens.
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
    toast.success("📬 Simulated inbound arrival", {
      description: `${caseId} — ${item.subject}`,
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
                  <Option key={c} value={c}>
                    {c}
                  </Option>
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
                <Option value="IssuingAuthority">Issuing Authority</Option>
                <Option value="EnforcingAuthority">Enforcing Authority</Option>
              </Select>
            </Field>
            <Field label="Kind">
              <Select
                value={kind}
                onChange={(_e, data) => setKind(data.value as InboundKind)}
              >
                {INBOUND_KINDS.map((k) => (
                  <Option key={k.value} value={k.value}>
                    {k.label}
                  </Option>
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
    if (status === "Sent") {
      const next = transitionOutbound(items, picked.item.id, "Delivered", {
        deliveredAt: now,
        deliveryConfirmedBy: "AutoSim",
      });
      setCorrespondenceForCase(picked.caseId, next);
      toast.success("Outbound → Delivered", {
        description: picked.item.subject,
      });
    } else if (status === "Delivered") {
      const next = transitionOutbound(items, picked.item.id, "Acknowledged", {
        acknowledgedAt: now,
        acknowledgementRef: `AUTO-${shortRef()}`,
      });
      setCorrespondenceForCase(picked.caseId, next);
      toast.success("Outbound → Acknowledged", {
        description: picked.item.subject,
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
                      <Option key={e.item.id} value={e.item.id}>
                        {e.caseId} — {e.item.subject} (
                        {e.item.transmission.status})
                      </Option>
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
    toast.success("📬 Authority responded", {
      description: `${picked.caseId} — ${inboundReply.subject}`,
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
                      <Option key={e.item.id} value={e.item.id}>
                        {e.caseId} — {e.item.subject} (
                        {e.item.transmission.status})
                      </Option>
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
