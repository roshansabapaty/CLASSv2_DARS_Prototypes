/**
 * FreeTextComposer — Fluent dialog for authoring an ad-hoc outbound
 * letter to the issuing or enforcing authority.
 *
 * Fields:
 *   Counterparty   (radio: Issuing / Enforcing Authority)
 *   Channel        (Select: Email · Decentralised IT System · Authority
 *                  Portal · Postal Mail · Other)
 *   Subject        (Input)
 *   Body           (Textarea)
 *   In reply to    (optional combobox over existing inbound items)
 *
 * On Send, builds a complete OutboundCorrespondenceItem with transmission
 * status = "Sent" + sentAt/sentBy, hands it to onSend, and closes.
 * Phase 1's auto-sim then progresses it to Delivered/Acknowledged.
 *
 * Attachments dropzone is intentionally minimal — prototype-only. Files
 * are kept in-memory as ObjectURLs.
 */

import * as React from "react";
import {
  Body1,
  Button,
  Caption2,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Option,
  Radio,
  RadioGroup,
  Select,
  Textarea,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  Send20Filled,
  Dismiss20Regular,
  Document20Regular,
  Attach20Regular,
} from "@fluentui/react-icons";
import {
  inboundItems,
} from "./correspondenceEngine";
import type {
  AuthorityRole,
  CorrespondenceAttachment,
  CorrespondenceChannel,
  CorrespondenceItem,
  OutboundCorrespondenceItem,
} from "../../types/correspondence";
import { CURRENT_USER } from "../../constants/caseConstants";

const useStyles = makeStyles({
  surface: {
    width: "min(95vw, 720px)",
    maxWidth: "720px",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
    maxHeight: "70vh",
    overflowY: "auto",
  },
  row: {
    display: "flex",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalS,
    flexWrap: "wrap",
  },
  rowItem: { flex: "1 1 240px", minWidth: 0 },
  attachmentList: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
  },
  attachmentRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
    borderBottomRightRadius: tokens.borderRadiusSmall,
  },
  attachmentMeta: {
    display: "flex",
    flexDirection: "column",
    flex: "1 1 auto",
    minWidth: 0,
  },
});

const CHANNELS: Array<{ value: CorrespondenceChannel; label: string }> = [
  { value: "Email", label: "Email" },
  { value: "DecentralisedITSystem", label: "Decentralised IT System (EU)" },
  { value: "AuthorityPortal", label: "Authority portal" },
  { value: "PostalMail", label: "Postal mail" },
  { value: "Other", label: "Other" },
];

const REPLY_NONE = "__none__";

function genId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export interface FreeTextComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  /** All correspondence items on this case — used to populate the
   *  "In reply to" picker with existing inbound items. */
  items: CorrespondenceItem[] | undefined;
  /** Default counterparty when opening the composer. */
  defaultCounterparty?: AuthorityRole;
  /** Default channel when opening the composer. */
  defaultChannel?: CorrespondenceChannel;
  /** Called on Send. Caller appends to the store + active formData and
   *  fires the toast/notification cascade. */
  onSend: (item: OutboundCorrespondenceItem) => void;
}

export function FreeTextComposer({
  open,
  onOpenChange,
  caseId,
  items,
  defaultCounterparty = "IssuingAuthority",
  defaultChannel = "DecentralisedITSystem",
  onSend,
}: FreeTextComposerProps) {
  const styles = useStyles();
  const [counterparty, setCounterparty] = React.useState<AuthorityRole>(
    defaultCounterparty,
  );
  const [channel, setChannel] = React.useState<CorrespondenceChannel>(
    defaultChannel,
  );
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [inReplyToId, setInReplyToId] = React.useState<string>(REPLY_NONE);
  const [attachments, setAttachments] = React.useState<
    CorrespondenceAttachment[]
  >([]);

  // Reset on open.
  React.useEffect(() => {
    if (open) {
      setCounterparty(defaultCounterparty);
      setChannel(defaultChannel);
      setSubject("");
      setBody("");
      setInReplyToId(REPLY_NONE);
      setAttachments([]);
    }
  }, [open, defaultCounterparty, defaultChannel]);

  const replyOptions = React.useMemo(() => inboundItems(items), [items]);

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const next: CorrespondenceAttachment[] = Array.from(files).map((f) => ({
      id: genId("att"),
      name: f.name,
      size: f.size,
      type: f.type || "application/octet-stream",
      url: URL.createObjectURL(f),
    }));
    setAttachments((prev) => [...prev, ...next]);
    e.target.value = ""; // allow re-selecting the same file
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = () => {
    if (!canSend) return;
    const now = new Date();
    const inReplyTo = inReplyToId === REPLY_NONE ? undefined : inReplyToId;
    const item: OutboundCorrespondenceItem = {
      id: genId("corr-out"),
      caseId,
      direction: "Outbound",
      counterparty,
      channel,
      subject: subject.trim(),
      body: body.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
      inReplyToId: inReplyTo,
      createdAt: now,
      transmission: {
        status: "Sent",
        sentAt: now,
        sentBy: CURRENT_USER,
      },
    };
    onSend(item);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_e, data) => {
        if (!data.open) onOpenChange(false);
      }}
    >
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle
            action={
              <Button
                appearance="subtle"
                aria-label="Close"
                icon={<Dismiss20Regular />}
                onClick={() => onOpenChange(false)}
              />
            }
          >
            New free-text correspondence
          </DialogTitle>
          <DialogContent className={styles.body}>
            <Body1>
              Send an ad-hoc letter to the issuing or enforcing authority for
              case <strong>{caseId}</strong>.
            </Body1>

            <div className={styles.row}>
              <div className={styles.rowItem}>
                <Field label="Recipient" required>
                  <RadioGroup
                    layout="horizontal"
                    value={counterparty}
                    onChange={(_e, data) =>
                      setCounterparty(data.value as AuthorityRole)
                    }
                  >
                    <Radio
                      value="IssuingAuthority"
                      label="Issuing Authority"
                    />
                    <Radio
                      value="EnforcingAuthority"
                      label="Enforcing Authority"
                    />
                  </RadioGroup>
                </Field>
              </div>
              <div className={styles.rowItem}>
                <Field label="Channel" required>
                  <Select
                    value={channel}
                    onChange={(_e, data) =>
                      setChannel(data.value as CorrespondenceChannel)
                    }
                  >
                    {CHANNELS.map((c) => (
                      <Option key={c.value} value={c.value}>
                        {c.label}
                      </Option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <Field label="In reply to (optional)">
              <Select
                value={inReplyToId}
                onChange={(_e, data) => setInReplyToId(data.value)}
              >
                <Option value={REPLY_NONE}>— Standalone (no parent) —</Option>
                {replyOptions.map((inb) => (
                  <Option key={inb.id} value={inb.id} text={inb.subject}>
                    {inb.subject} ({inb.kind})
                  </Option>
                ))}
              </Select>
            </Field>

            <Field label="Subject" required>
              <Input
                value={subject}
                onChange={(_e, data) => setSubject(data.value)}
                placeholder="Subject line"
              />
            </Field>

            <Field label="Body" required>
              <Textarea
                resize="vertical"
                style={{ minHeight: "10rem" }}
                value={body}
                onChange={(_e, data) => setBody(data.value)}
                placeholder="Type your letter here…"
              />
            </Field>

            <Field label="Attachments">
              <div>
                <label
                  htmlFor="freetext-attachments"
                  style={{ display: "inline-flex" }}
                >
                  <Button
                    as="span"
                    appearance="secondary"
                    icon={<Attach20Regular />}
                  >
                    Add files
                  </Button>
                </label>
                <input
                  id="freetext-attachments"
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
              </div>
              {attachments.length > 0 && (
                <div
                  className={styles.attachmentList}
                  style={{ marginTop: tokens.spacingVerticalS }}
                >
                  {attachments.map((att) => (
                    <div key={att.id} className={styles.attachmentRow}>
                      <Document20Regular />
                      <div className={styles.attachmentMeta}>
                        <Body1>{att.name}</Body1>
                        <Caption2>
                          {att.type} · {formatBytes(att.size)}
                        </Caption2>
                      </div>
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<Dismiss20Regular />}
                        aria-label={`Remove ${att.name}`}
                        onClick={() => removeAttachment(att.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              icon={<Send20Filled />}
              disabled={!canSend}
              onClick={handleSend}
            >
              Send
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
