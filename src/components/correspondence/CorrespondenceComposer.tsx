/**
 * CorrespondenceComposer — sticky footer of the Correspondence side
 * panel. Lightweight chat-input + unified attach menu + Attorney
 * Escalation toggle.
 *
 * Reference for the ChatInput primitive — Microsoft Fluent AI:
 *   https://apps.1js.microsoft.com/azurestaticapps/fai-documentation/storybook/index.html?path=/docs/input-chatinput--docs
 *
 * The FAI ChatInput component is internal-only at the time of writing —
 * this file builds a minimal in-house equivalent (Textarea + paperclip
 * menu + send button) that matches the FAI API surface so we can swap to
 * the official component once it's public on npm.
 *
 * The composer is scoped to the *currently-active tab*. When the active
 * tab is a real thread, replies inherit the thread's counterparty and
 * auto-set `inReplyToId` to the latest inbound in the thread (when one
 * exists). When the active tab is "+ New thread", a counterparty radio
 * surfaces so the RS picks the recipient before send.
 *
 * Unified attach menu offers two options:
 *   1. Attach local file…   → OS file picker → in-memory ObjectURL.
 *   2. Attach from template library… → TemplatePickerDialog → form pill.
 */

import * as React from "react";
import {
  Body1Strong,
  Button,
  Caption1,
  Checkbox,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Radio,
  RadioGroup,
  Textarea,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  Attach20Regular,
  Dismiss16Regular,
  DocumentText20Regular,
  FolderOpen20Regular,
  Scales20Regular,
  Send20Regular,
} from "@fluentui/react-icons";
import { TemplatePickerDialog } from "../forms-library/TemplatePickerDialog";
import { getTemplateById } from "../../config/formTemplates";
import {
  isInbound,
  type AuthorityRole,
  type CorrespondenceAttachment,
  type CorrespondenceChannel,
  type CorrespondenceItem,
  type OutboundCorrespondenceItem,
} from "../../types/correspondence";
import type { FormData as CaseFormData } from "../../types/caseTypes";
import type { FormTemplate } from "../../types/formTemplate";
import { CURRENT_USER } from "../../constants/caseConstants";
import { readRespondedByOutbound } from "../../types/correspondence";

// Composer visuals aligned with the Fluent AI ChatInput primitive (see
// FAI Showcase Chat reference). Key moves: the textarea + attach + send
// affordances live inside a single rounded "input shell" that grows with
// the message rather than sitting as separate rows. Inline toolbar
// (Attach menu + Attorney Escalation Switch) tucks under the shell so it
// reads as a single unit instead of a stack of disjointed controls.
const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  contextStrip: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
    flexWrap: "wrap",
  },
  // The chat-input shell — rounded container that hosts the textarea,
  // draft attachment chips, attach button, and send button as a unit.
  inputShell: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusXLarge,
    paddingTop: tokens.spacingVerticalSNudge,
    paddingBottom: tokens.spacingVerticalSNudge,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    boxShadow: tokens.shadow2,
    ":focus-within": {
      borderColor: tokens.colorBrandStroke1,
      boxShadow: tokens.shadow4,
    },
  },
  draftRow: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: tokens.spacingHorizontalXS,
    rowGap: tokens.spacingVerticalXS,
  },
  draftChip: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
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
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    fontWeight: tokens.fontWeightSemibold,
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    padding: 0,
    marginLeft: tokens.spacingHorizontalXXS,
    display: "inline-flex",
    alignItems: "center",
  },
  // Borderless textarea inside the input shell — focus / border is owned
  // by the shell, not the textarea.
  textArea: {
    flex: "1 1 auto",
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    "& textarea": {
      border: "none",
      backgroundColor: "transparent",
      paddingTop: tokens.spacingVerticalXS,
      paddingBottom: tokens.spacingVerticalXS,
      paddingLeft: 0,
      paddingRight: 0,
      ":focus": {
        outline: "none",
      },
    },
    "&::after, &::before": {
      display: "none",
    },
  },
  // Bottom toolbar inside the shell — Attach menu on left, Send on right.
  toolbar: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    justifyContent: "space-between",
  },
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
  },
  iconBtn: {
    flexShrink: 0,
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
    paddingLeft: tokens.spacingHorizontalXS,
  },
  newThreadRecipient: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
  },
  relatedRfis: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  relatedRfisHeading: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  relatedRfisHelper: {
    color: tokens.colorNeutralForeground3,
  },
  relatedRfiItem: {
    display: "flex",
    alignItems: "flex-start",
    columnGap: tokens.spacingHorizontalS,
  },
  relatedRfiSubject: {
    color: tokens.colorNeutralForeground1,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function readFilesAsAttachments(
  files: FileList,
): CorrespondenceAttachment[] {
  const out: CorrespondenceAttachment[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    out.push({
      id: genId("att"),
      name: f.name,
      size: f.size,
      type: f.type || "application/octet-stream",
      url: URL.createObjectURL(f),
    });
  }
  return out;
}

export interface CorrespondenceComposerProps {
  caseId: string;
  /** Full case FormData — passed to TemplatePickerDialog so the picker
   *  can filter templates by case type (eEvidence vs non-eEvidence etc.). */
  caseFormData: CaseFormData;
  /** Items in the currently-active thread (or [] for "+ New thread"). */
  threadItems: CorrespondenceItem[];
  /** When true, the composer is in "+ New thread" mode — no inherited
   *  thread context; surfaces a counterparty radio. */
  newThreadMode: boolean;
  /** Called when the RS clicks Send. The parent persists the outbound
   *  + branches on `attorneyEscalation`. */
  onSend: (
    item: OutboundCorrespondenceItem,
    opts: { attorneyEscalation: boolean },
  ) => void;
  /** Imperative-style template attachment driven from outside the
   *  composer — e.g. clicking "Reply with Provide Additional Information"
   *  on an inbound RFI bubble. The `nonce` lets the composer respond to
   *  back-to-back clicks on the same template. `inReplyToId` is
   *  optional: when set, the outbound is stamped as a reply to that
   *  inbound; when omitted (e.g. "Send another RFI" unsolicited from
   *  the AwaitingInfoReplyBanner), the outbound is a root with no
   *  `inReplyToId` and the send handler does NOT write an
   *  `RfiReplied` audit event. */
  pendingTemplateRequest?: {
    templateId: string;
    inReplyToId?: string;
    nonce: number;
  } | null;
  /** Acknowledge that the request was consumed — the parent clears its
   *  pending state. Without this the composer would re-apply on every
   *  parent re-render. */
  onPendingTemplateConsumed?: () => void;
  /** Called when the RS picks a template (via the picker or via an
   *  external request). The parent should:
   *    1. Create a fresh CaseFormInstance via `createFormInstance(template, formData)`,
   *    2. Save it to `formData.formInstances`,
   *    3. Open FormFillerDialog with that instance so the RS gets the
   *       structured Fill / Preview / Sign flow Form 3 uses.
   *  Returns the new instance id, which the composer stamps on its
   *  pending chip so the outbound's `formInstanceId` ultimately points
   *  at the real CaseFormInstance the RS edited. When omitted the
   *  composer falls back to the legacy "template-id as metadata only"
   *  chip with no FillerDialog. */
  onComposeWithTemplate?: (template: FormTemplate) => string;
}

export function CorrespondenceComposer({
  caseId,
  caseFormData,
  threadItems,
  newThreadMode,
  onSend,
  pendingTemplateRequest,
  onPendingTemplateConsumed,
  onComposeWithTemplate,
}: CorrespondenceComposerProps) {
  const styles = useStyles();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Draft state.
  const [body, setBody] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [attachments, setAttachments] = React.useState<CorrespondenceAttachment[]>(
    [],
  );
  const [pendingFormInstanceId, setPendingFormInstanceId] = React.useState<
    string | undefined
  >(undefined);
  const [pendingFormName, setPendingFormName] = React.useState<
    string | undefined
  >(undefined);
  // Templates declare an `outboundDocumentKind` (RFI / PAI). When the
  // user picks such a template, we capture it here so the outbound
  // item's `documentKind` reflects the conversation flow rather than
  // collapsing to the generic "SignedForm".
  const [pendingDocumentKind, setPendingDocumentKind] = React.useState<
    "RequestAdditionalInformation" | "ProvideAdditionalInformation" | undefined
  >(undefined);
  // Override for the auto-derived `inReplyToId`. Used when a "Reply
  // with …" CTA fires from a specific inbound bubble — we want the
  // outbound to point at THAT inbound, not just the latest one in the
  // thread. Cleared when the composer's draft is sent or cleared.
  const [replyToOverride, setReplyToOverride] = React.useState<
    string | undefined
  >(undefined);
  // Related RFIs the RS opted to also close with this same PAI. Set
  // by the related-RFIs sidebar that surfaces when replyToOverride is
  // set to an inbound RFI from a multi-RFI case. The composer carries
  // these ids on `additionalRespondedInboundIds` so the send handler
  // stamps them all at once.
  const [alsoRespondedInboundIds, setAlsoRespondedInboundIds] =
    React.useState<string[]>([]);
  const [attorneyEscalation, setAttorneyEscalation] = React.useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = React.useState(false);

  // New-thread-mode counterparty + channel selection. When inside an
  // existing thread, inherit from the root.
  const [newCounterparty, setNewCounterparty] =
    React.useState<AuthorityRole>("IssuingAuthority");

  // Inherit context from the active thread's root when applicable.
  const inheritedCounterparty: AuthorityRole = newThreadMode
    ? newCounterparty
    : threadItems[0]?.counterparty ?? "IssuingAuthority";
  const inheritedChannel: CorrespondenceChannel =
    threadItems[threadItems.length - 1]?.channel ?? "DecentralisedITSystem";
  const inReplyToId: string | undefined =
    replyToOverride ??
    (newThreadMode
      ? undefined
      : (() => {
          // Latest inbound in the active thread, if any.
          for (let i = threadItems.length - 1; i >= 0; i--) {
            const it = threadItems[i];
            if (isInbound(it)) return it.id;
          }
          return undefined;
        })());

  const contextLabel = newThreadMode
    ? "Starting a new thread"
    : `Replying in: ${threadItems[0]?.subject ?? "thread"}`;

  const handleAddLocalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachments((prev) => [
        ...prev,
        ...readFilesAsAttachments(e.target.files!),
      ]);
    }
    // Reset value so picking the same file twice still fires onChange.
    e.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  /** Apply a template to the composer's draft state. Delegates to the
   *  parent's `onComposeWithTemplate` callback which:
   *    1. Creates a fresh CaseFormInstance via `createFormInstance()`,
   *    2. Saves it to `formData.formInstances`,
   *    3. Opens FormFillerDialog so the RS gets the structured Fill /
   *       Preview / Sign flow Form 3 uses — including the
   *       `flagUnresolvedPlaceholders` validation banner.
   *  The returned instance id is stamped on the composer chip
   *  immediately, so the outbound's `formInstanceId` points at the
   *  REAL CaseFormInstance the RS is editing, not just the template id.
   *
   *  When `onComposeWithTemplate` isn't wired (legacy callsites) we
   *  fall back to the original "template-id as metadata only" chip;
   *  the composer's body textarea stays empty in that path. */
  const applyTemplate = React.useCallback(
    (template: FormTemplate) => {
      setPendingFormName(template.name);
      setPendingDocumentKind(template.outboundDocumentKind);
      if (onComposeWithTemplate) {
        // Parent owns instance creation + opens FormFillerDialog.
        const instanceId = onComposeWithTemplate(template);
        setPendingFormInstanceId(instanceId);
      } else {
        setPendingFormInstanceId(template.id);
      }
      // Subject defaults to the template name when the RS hasn't typed
      // one. Provides a sensible default for the outbound row's subject
      // column; RS can override before sending.
      setSubject((prev) => (prev.trim().length === 0 ? template.name : prev));
    },
    [onComposeWithTemplate],
  );

  const handlePickTemplate = (template: FormTemplate) => {
    applyTemplate(template);
    setTemplatePickerOpen(false);
  };

  const handleClearForm = () => {
    setPendingFormInstanceId(undefined);
    setPendingFormName(undefined);
    setPendingDocumentKind(undefined);
    setReplyToOverride(undefined);
  };

  // Consume "Reply with …" requests from inbound bubbles or banner
  // CTAs. The parent bumps a `nonce` each time a CTA fires so
  // back-to-back clicks on the same template re-apply. After applying,
  // we acknowledge via the parent callback so it can clear its pending
  // state.
  React.useEffect(() => {
    if (!pendingTemplateRequest) return;
    const template = getTemplateById(pendingTemplateRequest.templateId);
    if (!template) return;
    applyTemplate(template);
    setReplyToOverride(pendingTemplateRequest.inReplyToId);
    onPendingTemplateConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTemplateRequest?.nonce]);

  const canSend =
    body.trim().length > 0 ||
    attachments.length > 0 ||
    pendingFormInstanceId !== undefined;

  const handleSend = () => {
    if (!canSend) return;
    const now = new Date();
    const item: OutboundCorrespondenceItem = {
      id: genId("out"),
      caseId,
      direction: "Outbound",
      counterparty: inheritedCounterparty,
      channel: inheritedChannel,
      subject: subject.trim() || (body.trim().slice(0, 60) || pendingFormName || "Outbound message"),
      body: body.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      formInstanceId: pendingFormInstanceId,
      documentKind: pendingDocumentKind
        ? pendingDocumentKind
        : pendingFormInstanceId
          ? "SignedForm"
          : "FreeText",
      inReplyToId,
      additionalRespondedInboundIds:
        alsoRespondedInboundIds.length > 0
          ? alsoRespondedInboundIds
          : undefined,
      createdAt: now,
      transmission: {
        status: attorneyEscalation ? "Draft" : "Sent",
        sentAt: attorneyEscalation ? undefined : now,
        sentBy: attorneyEscalation ? undefined : CURRENT_USER,
        pendingAttorneyReview: attorneyEscalation || undefined,
      },
    };
    onSend(item, { attorneyEscalation });

    // Clear draft.
    setBody("");
    setSubject("");
    setAttachments([]);
    setPendingFormInstanceId(undefined);
    setPendingFormName(undefined);
    setPendingDocumentKind(undefined);
    setReplyToOverride(undefined);
    setAlsoRespondedInboundIds([]);
    setAttorneyEscalation(false);
  };

  const sendButtonLabel = attorneyEscalation
    ? "Save Draft + Escalate"
    : "Send";

  // Related-RFIs list — surfaces when the composer was opened via the
  // "Reply with PAI" CTA on a specific inbound RFI. Lists OTHER open
  // RFIs from the same counterparty so the RS can mark them all as
  // closed by this single PAI. Per Edge Case 2 decision 3.
  const replyTargetInbound = React.useMemo(() => {
    if (!replyToOverride) return undefined;
    const all = caseFormData.correspondence ?? [];
    const hit = all.find((c) => c.id === replyToOverride);
    if (!hit || hit.direction !== "Inbound") return undefined;
    return hit;
  }, [replyToOverride, caseFormData.correspondence]);

  const relatedOpenRfis = React.useMemo(() => {
    if (!replyTargetInbound) return [];
    const all = caseFormData.correspondence ?? [];
    return all.filter((c) => {
      if (c.id === replyTargetInbound.id) return false;
      if (c.direction !== "Inbound") return false;
      if (c.kind !== "RequestAdditionalInformation") return false;
      if (c.counterparty !== replyTargetInbound.counterparty) return false;
      const replied = readRespondedByOutbound(c);
      if (replied && replied.status === "sent") return false;
      return true;
    });
  }, [replyTargetInbound, caseFormData.correspondence]);

  return (
    <div className={styles.root}>
      <div className={styles.contextStrip}>
        <Caption1>{contextLabel}</Caption1>
        {!newThreadMode && (
          <Caption1>
            · with{" "}
            <Body1Strong>
              {inheritedCounterparty === "IssuingAuthority"
                ? "Issuing Authority"
                : "Enforcing Authority"}
            </Body1Strong>
          </Caption1>
        )}
      </div>

      {/* Related-RFIs sidebar — per Edge Case 2 decision 3. Surfaces
          only when the composer is wired to a specific inbound RFI
          and that authority has OTHER open RFIs the RS might want
          to close with the same PAI. The RS opts in per-RFI via
          checkbox; selected ids ride the outbound's
          `additionalRespondedInboundIds` to the send handler. */}
      {replyTargetInbound && relatedOpenRfis.length > 0 && (
        <div className={styles.relatedRfis}>
          <Body1Strong className={styles.relatedRfisHeading}>
            Mark other open RFIs from this authority as also-replied?
          </Body1Strong>
          <Caption1 className={styles.relatedRfisHelper}>
            This authority has{" "}
            {relatedOpenRfis.length} other open Request for Additional
            Information item
            {relatedOpenRfis.length === 1 ? "" : "s"} on this case. Check the
            ones this single reply covers — they'll close together when
            you send.
          </Caption1>
          {relatedOpenRfis.map((rfi) => {
            const isChecked = alsoRespondedInboundIds.includes(rfi.id);
            return (
              <div key={rfi.id} className={styles.relatedRfiItem}>
                <Checkbox
                  checked={isChecked}
                  onChange={(_e, data) => {
                    setAlsoRespondedInboundIds((prev) =>
                      data.checked
                        ? [...prev, rfi.id]
                        : prev.filter((id) => id !== rfi.id),
                    );
                  }}
                  label={
                    <span className={styles.relatedRfiSubject}>{rfi.subject}</span>
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {newThreadMode && (
        <div className={styles.newThreadRecipient}>
          <Caption1>Recipient</Caption1>
          <RadioGroup
            layout="horizontal"
            value={newCounterparty}
            onChange={(_e, data) =>
              setNewCounterparty(data.value as AuthorityRole)
            }
          >
            <Radio value="IssuingAuthority" label="Issuing Authority" />
            <Radio value="EnforcingAuthority" label="Enforcing Authority" />
          </RadioGroup>
        </div>
      )}

      {/* Single rounded input shell — hosts the draft chips, textarea,
          attach menu, and send button as one Fluent AI ChatInput-style
          unit. The shell's border lights up brand on focus-within. */}
      <div className={styles.inputShell}>
        {(attachments.length > 0 || pendingFormName) && (
          <div className={styles.draftRow}>
            {pendingFormName && (
              <span className={styles.formPill}>
                <DocumentText20Regular aria-hidden="true" />
                <span>{pendingFormName}</span>
                <button
                  type="button"
                  aria-label={`Remove ${pendingFormName} from draft`}
                  onClick={handleClearForm}
                  className={styles.removeBtn}
                >
                  <Dismiss16Regular />
                </button>
              </span>
            )}
            {attachments.map((att) => (
              <span key={att.id} className={styles.draftChip}>
                <Attach20Regular aria-hidden="true" />
                <span>{att.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${att.name} from draft`}
                  onClick={() => handleRemoveAttachment(att.id)}
                  className={styles.removeBtn}
                >
                  <Dismiss16Regular />
                </button>
              </span>
            ))}
          </div>
        )}

        <Textarea
          className={styles.textArea}
          appearance="filled-lighter"
          value={body}
          onChange={(_e, data) => setBody(data.value)}
          placeholder="Type a message…"
          resize="vertical"
          rows={2}
          aria-label="Message body"
        />

        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            {/* Unified Attach menu — local file or template library. */}
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Tooltip content="Attach" relationship="label">
                  <Button
                    appearance="subtle"
                    icon={<Attach20Regular />}
                    size="medium"
                    shape="circular"
                    aria-label="Attach"
                    className={styles.iconBtn}
                  />
                </Tooltip>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem
                    icon={<FolderOpen20Regular />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Attach local file…
                  </MenuItem>
                  <MenuItem
                    icon={<DocumentText20Regular />}
                    onClick={() => setTemplatePickerOpen(true)}
                  >
                    Attach from template library…
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={handleAddLocalFiles}
            />
          </div>

          <div className={styles.toolbarRight}>
            <Button
              appearance="primary"
              icon={attorneyEscalation ? <Scales20Regular /> : <Send20Regular />}
              shape="circular"
              onClick={handleSend}
              disabled={!canSend}
              className={styles.iconBtn}
            >
              {sendButtonLabel}
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.toggleRow}>
        <Checkbox
          checked={attorneyEscalation}
          onChange={(_e, data) => setAttorneyEscalation(data.checked === true)}
          label="Attorney Escalation"
          aria-describedby="attorney-escalation-help"
        />
        <Caption1
          id="attorney-escalation-help"
          style={{ color: tokens.colorNeutralForeground3, marginLeft: tokens.spacingHorizontalS }}
        >
          {attorneyEscalation
            ? "Message will be saved as Draft and the attorney will be notified before it can be sent."
            : "Toggle on to require attorney review before sending — message will be saved as Draft."}
        </Caption1>
      </div>

      <TemplatePickerDialog
        open={templatePickerOpen}
        formData={caseFormData}
        onSelect={handlePickTemplate}
        onClose={() => setTemplatePickerOpen(false)}
      />
    </div>
  );
}
