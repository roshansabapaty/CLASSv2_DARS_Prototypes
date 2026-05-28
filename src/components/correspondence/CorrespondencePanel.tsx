/**
 * CorrespondencePanel — right-side slide-in panel hosting the
 * chat-thread Correspondence Hub. Mirrors the DocumentViewerPanel UX
 * pattern: a `re-resizable` shell anchored to the right edge of the
 * case-page body area, sized by the parent via `panelWidth` + `onResize`,
 * with the case form's `marginRight` shrunk to match so the user reads
 * correspondence side-by-side with the case data (not on top of it).
 *
 * The panel is parent-controlled via `open` + `onClose` + `panelWidth`.
 * Mounts the thread tabs, the active thread's body, and the composer
 * footer. Theme-wrapped in `FluentProvider` so its Fluent v9 children
 * have a theme context even when mounted under a non-Fluent parent.
 */

import * as React from "react";
import { Resizable } from "re-resizable";
import { useKeyboardResize } from "../../hooks/useKeyboardResize";
import { useFocusRestoration } from "../../hooks/useFocusRestoration";
import {
  Badge,
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
  FluentProvider,
  Subtitle2,
  Tooltip,
  webLightTheme,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowDownload20Regular,
  ChatMultiple20Regular,
  Dismiss24Regular,
  DocumentText20Regular,
  Open20Regular,
} from "@fluentui/react-icons";
import {
  CorrespondenceThreadTabs,
  NEW_THREAD_TAB_VALUE,
} from "./CorrespondenceThreadTabs";
import { CorrespondenceThreadPicker } from "./CorrespondenceThreadPicker";
import { RfiPaiPreviewDialog } from "./RfiPaiPreviewDialog";
import { CorrespondenceThreads } from "./CorrespondenceThreads";
import { CorrespondenceComposer } from "./CorrespondenceComposer";
import {
  groupCorrespondenceIntoThreads,
  pendingOutboxCount,
  unreadInboxCount,
} from "./correspondenceEngine";
import { FormPreviewPanel } from "../forms-library/FormPreviewPanel";
import { EaRejectedForm3Banner } from "../escalation/EaRejectedForm3Banner";
import {
  isForm3RejectedByEa,
  isForm3Retracted,
  canRetractForm3,
  retractGateReason as gfrRetractGateReason,
  gfrBlock,
} from "../../utils/groundsForRefusal";
import { getTemplateById } from "../../config/formTemplates";
import type {
  CorrespondenceAttachment,
  CorrespondenceItem,
  OutboundCorrespondenceItem,
} from "../../types/correspondence";
import type { FormData as CaseFormData } from "../../types/caseTypes";
import type {
  CaseFormInstance,
  FormTemplate,
} from "../../types/formTemplate";

const useStyles = makeStyles({
  // Inner panel skin. Sizing + positioning are now owned by the outer
  // Resizable wrapper, so this style only carries colour, flex layout,
  // and the left-edge hairline that visually separates the panel from
  // the case form on its left.
  overlay: {
    height: "100%",
    width: "100%",
    backgroundColor: tokens.colorNeutralBackground1,
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: tokens.colorNeutralStroke1,
    boxShadow: tokens.shadow28,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalM,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  titleColumn: {
    flex: "1 1 auto",
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    flexShrink: 0,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
  },
  titleIcon: {
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  subtitleRow: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground3,
    flexWrap: "wrap",
  },
  body: {
    flex: "1 1 auto",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  // Dialog surfaces (form + attachment previews) — opened in-panel when
  // the user clicks a form pill or attachment chip in a bubble.
  previewSurface: {
    maxWidth: "min(960px, 92vw)",
    width: "min(960px, 92vw)",
  },
  previewScroller: {
    maxHeight: "70vh",
    overflowY: "auto",
    backgroundColor: tokens.colorNeutralBackground2,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
  },
  attachmentMeta: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground3,
  },
  attachmentMetaRow: {
    display: "flex",
    columnGap: tokens.spacingHorizontalS,
  },
  attachmentMediaWrapper: {
    marginTop: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "200px",
  },
  attachmentImage: {
    maxWidth: "100%",
    maxHeight: "60vh",
    objectFit: "contain",
  },
  attachmentFallback: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    rowGap: tokens.spacingVerticalS,
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
  },
  notFound: {
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
  },
});

// Bytes → "12 KB" / "3.4 MB" formatter for the attachment preview meta row.
function formatBytes(b: number): string {
  if (!b || b <= 0) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

// Build a synthetic, read-only CaseFormInstance for an inbound item that
// carries a `structuredForm` block. The case-page form-instances array
// is the authoritative source for outbound forms, but the IA's inbound
// structured forms aren't case-internal artifacts — we wrap them in a
// pseudo-instance just for the FormPreviewPanel renderer.
function hydrateInboundInstance(
  caseId: string,
  item: CorrespondenceItem,
): CaseFormInstance | undefined {
  if (item.direction !== "Inbound") return undefined;
  if (!item.structuredForm) return undefined;
  return {
    instanceId: `inbound-${item.id}`,
    templateId: item.structuredForm.templateId,
    caseId,
    status: "Signed",
    values: item.structuredForm.values,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.createdAt),
    signature: {
      signerName: "Issuing Authority",
      signedAt: new Date(item.createdAt),
      attestation: true,
    },
  };
}

export interface CorrespondencePanelProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseFormData: CaseFormData;
  items: CorrespondenceItem[] | undefined;
  /** Current width of the panel in pixels. Parent owns this so the
   *  case form can shrink its `marginRight` to match (the side-by-side
   *  pattern shared with `DocumentViewerPanel`). */
  panelWidth: number;
  /** Upper bound for the resize handle — typically computed by the
   *  parent from viewport width minus sidebar / min content width.
   *  Falls back to 1200 px if omitted. */
  panelMaxWidth?: number;
  /** Lower bound for the resize handle. Defaults to 420 px. */
  panelMinWidth?: number;
  /** Fired while the user drags the left-edge handle. */
  onResize: (width: number) => void;
  /** Called when the RS hits Send. Parent appends to the store + branches
   *  on `opts.attorneyEscalation` (auto-create / link the case's
   *  AttorneyEscalation when true). */
  onSend: (
    item: OutboundCorrespondenceItem,
    opts: { attorneyEscalation: boolean },
  ) => void;
  /** Optional — opens a FormPreviewPanel for an outbound's
   *  `formInstanceId` or for an inbound `structuredForm`. The caller
   *  decides which surface to use. */
  onViewForm?: (instanceIdOrInboundId: string) => void;
  /** Optional — external trigger that forces the composer to load a
   *  template. Used by the case-overview AwaitingInfoReplyBanner's
   *  "Send another RFI" link, which fires from OUTSIDE the panel.
   *  When `inReplyToId` is omitted the outbound is a root (no reply
   *  linkage). The `nonce` should bump on each fresh trigger so the
   *  composer's useEffect picks up re-fires of the same template. */
  externalComposerRequest?: {
    templateId: string;
    inReplyToId?: string;
    nonce: number;
  } | null;
  /** Forwarded to the composer — creates a CaseFormInstance for the
   *  picked template and opens FormFillerDialog so the RS composes
   *  via the same Fill / Preview / Sign flow Form 3 uses. Returns the
   *  new instance id; the composer stamps it on the chip. */
  onComposeWithTemplate?: (
    template: import("../../types/formTemplate").FormTemplate,
  ) => string;
  /** Opens the Retract Form 3 confirmation dialog. Wired from the
   *  parent that already owns the dialog (DataEntryForm /
   *  CollectionTracker). When omitted, the EA-rejected-Form-3 banner
   *  + the per-bubble action self-hide their CTAs. */
  onRetractForm3?: () => void;
}

export function CorrespondencePanel({
  open,
  onClose,
  caseId,
  caseFormData,
  items,
  panelWidth,
  panelMaxWidth = 1200,
  panelMinWidth = 420,
  onResize,
  onSend,
  onViewForm,
  externalComposerRequest,
  onComposeWithTemplate,
  onRetractForm3,
}: CorrespondencePanelProps) {
  // Restore keyboard focus to the trigger button when the panel closes.
  // Captured when `open` flips true; restored when it flips false.
  useFocusRestoration(open);

  // Keyboard-resize support for the left-edge drag handle. Lets users
  // resize the panel with ArrowLeft / ArrowRight (Shift for big steps).
  const keyboardResizeProps = useKeyboardResize(panelWidth, onResize, {
    min: panelMinWidth,
    max: panelMaxWidth,
    label: "Resize correspondence panel — use arrow keys",
    unitLabel: "pixels wide",
  });
  const styles = useStyles();

  const threads = React.useMemo(
    () => groupCorrespondenceIntoThreads(items),
    [items],
  );

  const inboundUnread = React.useMemo(() => unreadInboxCount(items), [items]);
  const outboundPending = React.useMemo(
    () => pendingOutboxCount(items),
    [items],
  );

  // Active tab — defaults to most-recent thread (threads are newest-first)
  // or "+ New thread" when there are no threads yet.
  const [selectedTabValue, setSelectedTabValue] = React.useState<string>(() =>
    threads.length > 0 ? threads[0].rootId : NEW_THREAD_TAB_VALUE,
  );

  // DocumentViewerPanel-style multi-tab: only threads the user has
  // explicitly opened from the picker appear as tabs. Defaults to the
  // most-recent thread so first-open of the panel isn't empty. Add /
  // remove via the picker + tab close button below.
  const [openThreadIds, setOpenThreadIds] = React.useState<string[]>(() =>
    threads.length > 0 ? [threads[0].rootId] : [],
  );

  // Picker sort mode — Created Date is the default (matches the
  // existing newest-first ordering); the RS can flip to Received Date
  // to surface threads where the authority has recently replied.
  const [threadSortMode, setThreadSortMode] = React.useState<
    import("./CorrespondenceThreadPicker").ThreadSortMode
  >("createdDate");

  // Open a thread (from the picker). Adds it to `openThreadIds` if not
  // already there and activates it.
  const handleOpenThread = (rootId: string) => {
    setOpenThreadIds((prev) =>
      prev.includes(rootId) ? prev : [...prev, rootId],
    );
    setSelectedTabValue(rootId);
  };

  // Close a thread tab. Drops it from the open list; if it was active,
  // fall back to the next open tab or the New-thread sentinel.
  const handleCloseThread = (rootId: string) => {
    setOpenThreadIds((prev) => {
      const next = prev.filter((id) => id !== rootId);
      if (selectedTabValue === rootId) {
        setSelectedTabValue(
          next.length > 0 ? next[next.length - 1] : NEW_THREAD_TAB_VALUE,
        );
      }
      return next;
    });
  };

  // If the active tab no longer exists (e.g. case load changed),
  // fall back to the freshest open thread / new-thread sentinel.
  React.useEffect(() => {
    if (selectedTabValue === NEW_THREAD_TAB_VALUE) return;
    if (!threads.some((t) => t.rootId === selectedTabValue)) {
      const fallback =
        openThreadIds.find((id) => threads.some((t) => t.rootId === id)) ??
        (threads.length > 0 ? threads[0].rootId : NEW_THREAD_TAB_VALUE);
      setSelectedTabValue(fallback);
    }
  }, [threads, selectedTabValue, openThreadIds]);

  // Drop stale entries from the open list when threads change (case
  // switch, etc.). Keeps the tab strip honest about what exists.
  React.useEffect(() => {
    setOpenThreadIds((prev) => {
      const validIds = new Set(threads.map((t) => t.rootId));
      const next = prev.filter((id) => validIds.has(id));
      // No-op when nothing was stale — avoids re-render churn.
      return next.length === prev.length ? prev : next;
    });
  }, [threads]);

  const isNewThreadTab = selectedTabValue === NEW_THREAD_TAB_VALUE;
  const activeThread = isNewThreadTab
    ? undefined
    : threads.find((t) => t.rootId === selectedTabValue);
  const threadItems = activeThread?.items ?? [];

  // ── In-panel preview surfaces ─────────────────────────────────────────
  // The bubble's form pill / attachment chips raise an intent up to the
  // panel; we resolve it to the right preview dialog here. Form previews
  // hydrate from `caseFormData.formInstances` (outbound) or the inbound
  // item's `structuredForm` block. Attachment previews render the
  // ObjectURL inline (image / text) or fall back to an "Open in new tab"
  // affordance for unknown MIME types.
  interface FormPreviewState {
    template: FormTemplate;
    instance: CaseFormInstance;
    sourceLabel: string;
  }
  const [formPreview, setFormPreview] = React.useState<FormPreviewState | null>(
    null,
  );
  const [attachmentPreview, setAttachmentPreview] =
    React.useState<CorrespondenceAttachment | null>(null);
  // RFI / PAI documents preview — separate from FormPreviewState
  // because these items have no Phase-1 template registered. Rendered
  // by RfiPaiPreviewDialog when set.
  const [rfiPaiPreview, setRfiPaiPreview] =
    React.useState<CorrespondenceItem | null>(null);

  // Inbound "Reply with …" → composer template request. The threads
  // surface a CTA on inbound RFI bubbles; clicking it stages the PAI
  // template against the composer + an `inReplyTo` anchor. Reset to
  // `null` after the composer consumes it (the composer signals this
  // via the consumed callback). A monotonically-increasing `nonce`
  // lets the composer respond to back-to-back clicks on the same
  // template (same templateId → same prop, useEffect wouldn't fire).
  const [pendingComposerRequest, setPendingComposerRequest] = React.useState<{
    templateId: string;
    /** Optional — when set, the outbound is stamped as a reply to that
     *  inbound. When omitted (e.g. "Send another RFI" unsolicited from
     *  the case-overview banner), the outbound is a root with no
     *  `inReplyToId`. */
    inReplyToId?: string;
    nonce: number;
  } | null>(null);
  const handleReplyWithTemplate = React.useCallback(
    (templateId: string, inReplyToId: string) => {
      setPendingComposerRequest((prev) => ({
        templateId,
        inReplyToId,
        nonce: (prev?.nonce ?? 0) + 1,
      }));
    },
    [],
  );

  // Forward external composer requests (from outside the panel — e.g.
  // the case-overview AwaitingInfoReplyBanner's "Send another RFI"
  // link) into the same internal pending-request state the inbound-
  // bubble Reply CTA uses. Watching the nonce means we re-fire even
  // when the templateId is unchanged. Unsolicited requests omit
  // `inReplyToId` so the outbound is a root (not a reply).
  React.useEffect(() => {
    if (!externalComposerRequest) return;
    setPendingComposerRequest((prev) => ({
      templateId: externalComposerRequest.templateId,
      inReplyToId: externalComposerRequest.inReplyToId,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalComposerRequest?.nonce]);

  const handleViewForm = React.useCallback(
    (instanceIdOrInboundId: string) => {
      // RFI / PAI fast path — the bubble passes the item.id straight
      // through for these documents. Route to the dedicated letterhead
      // preview dialog before the outbound-form lookup so RFI / PAI
      // items never accidentally land in the FormPreviewPanel.
      const correspondenceItem = (items ?? []).find(
        (i) => i.id === instanceIdOrInboundId,
      );
      if (correspondenceItem) {
        const isRfiPaiInbound =
          correspondenceItem.direction === "Inbound" &&
          (correspondenceItem.kind === "RequestAdditionalInformation" ||
            correspondenceItem.kind === "ProvideAdditionalInformation");
        const isRfiPaiOutbound =
          correspondenceItem.direction === "Outbound" &&
          (correspondenceItem.documentKind === "RequestAdditionalInformation" ||
            correspondenceItem.documentKind === "ProvideAdditionalInformation");
        if (isRfiPaiInbound || isRfiPaiOutbound) {
          setRfiPaiPreview(correspondenceItem);
          onViewForm?.(instanceIdOrInboundId);
          return;
        }
      }

      // Outbound path — look up the instance by id in the case's
      // formInstances array.
      const outboundInstance = (caseFormData.formInstances ?? []).find(
        (i) => i.instanceId === instanceIdOrInboundId,
      );
      if (outboundInstance) {
        const template = getTemplateById(outboundInstance.templateId);
        if (!template) {
          // Template missing — surface a friendly fallback rather than
          // crashing the bubble click.
          // eslint-disable-next-line no-console
          console.warn(
            `[CorrespondencePanel] template "${outboundInstance.templateId}" not found in registry`,
          );
          return;
        }
        setFormPreview({
          template,
          instance: outboundInstance,
          sourceLabel: "Microsoft outbound — signed form",
        });
        // Caller's optional `onViewForm` hook still fires so a parent
        // can override (e.g. open in a side panel of its own).
        onViewForm?.(instanceIdOrInboundId);
        return;
      }

      // Inbound path — `instanceIdOrInboundId` is the inbound item id;
      // hydrate a synthetic instance from its structuredForm block.
      const inboundItem = (items ?? []).find(
        (i) => i.id === instanceIdOrInboundId,
      );
      if (inboundItem) {
        const synthetic = hydrateInboundInstance(caseId, inboundItem);
        if (synthetic) {
          const template = getTemplateById(synthetic.templateId);
          if (template) {
            setFormPreview({
              template,
              instance: synthetic,
              sourceLabel: "Authority-submitted form",
            });
            onViewForm?.(instanceIdOrInboundId);
            return;
          }
        }
      }
      // Still call the caller hook even when nothing local matched, so
      // a parent override stays a valid path.
      onViewForm?.(instanceIdOrInboundId);
    },
    [caseFormData.formInstances, items, caseId, onViewForm],
  );

  const handleViewAttachment = React.useCallback(
    (attachment: CorrespondenceAttachment) => {
      setAttachmentPreview(attachment);
    },
    [],
  );

  // Press Esc inside the panel to close (matches DocumentViewerPanel
  // dismiss pattern).
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't intercept Escape when an open menu/dialog is layered
        // on top of the panel.
        const openLayer = document.querySelector(
          '[role="dialog"][data-state="open"], [role="menu"][data-state="open"]',
        );
        if (openLayer) return;
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 right-0 z-[60]"
    >
      <Resizable
        size={{ width: panelWidth, height: "100%" }}
        minWidth={panelMinWidth}
        maxWidth={panelMaxWidth}
        enable={{
          top: false,
          right: false,
          bottom: false,
          left: true,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
        onResize={(_e, _direction, _ref, d) => {
          const newWidth = panelWidth + d.width;
          const clampedWidth = Math.max(
            panelMinWidth,
            Math.min(newWidth, panelMaxWidth),
          );
          onResize(clampedWidth);
        }}
        className="pointer-events-auto"
        handleStyles={{
          left: {
            width: "6px",
            left: "0",
            cursor: "col-resize",
            background:
              "linear-gradient(90deg, rgba(0,120,212,0.1) 0%, rgba(0,120,212,0.3) 50%, rgba(0,120,212,0.1) 100%)",
            borderLeft: "1px solid #d1d5db",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        }}
        handleComponent={{
          left: (
            <div
              {...keyboardResizeProps}
              className="w-full h-full flex items-center justify-center group hover:bg-[#0078d4]/20 transition-colors focus-visible:outline-2 focus-visible:outline-[#0078d4] focus-visible:bg-[#0078d4]/20"
              title="Drag to resize, or use arrow keys"
            >
              <div className="flex flex-col gap-1 opacity-40 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                <div className="w-0.5 h-4 bg-[#605e5c] rounded-full"></div>
                <div className="w-0.5 h-4 bg-[#605e5c] rounded-full"></div>
                <div className="w-0.5 h-4 bg-[#605e5c] rounded-full"></div>
              </div>
            </div>
          ),
        }}
      >
    <FluentProvider
      theme={webLightTheme}
      style={{ height: "100%" }}
    >
      <aside
        className={styles.overlay}
        role="complementary"
        aria-label="Correspondence side panel"
      >
        <div className={styles.header}>
          <div className={styles.titleColumn}>
            <div className={styles.titleRow}>
              <ChatMultiple20Regular
                className={styles.titleIcon}
                aria-hidden="true"
              />
              <Subtitle2>Correspondence Hub</Subtitle2>
            </div>
            <div className={styles.subtitleRow}>
              <Caption1>Case {caseId}</Caption1>
              {inboundUnread > 0 && (
                <Badge appearance="tint" color="danger" size="small">
                  {inboundUnread} unread
                </Badge>
              )}
              {outboundPending > 0 && (
                <Badge appearance="tint" color="warning" size="small">
                  {outboundPending} pending
                </Badge>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            {/* New thread CTA moved into the thread picker row below
                so it sits with the rest of the thread-discovery chrome
                — and away from the Close X which was previously
                adjacent and risked accidental clicks. */}
            <Tooltip content="Close" relationship="label">
              <Button
                appearance="subtle"
                icon={<Dismiss24Regular />}
                shape="circular"
                onClick={onClose}
                aria-label="Close correspondence panel"
              />
            </Tooltip>
          </div>
        </div>

        {/* Thread picker — DocumentViewerPanel-style "Select from N
            threads" dropdown. Lets the RS pick which threads to open
            as tabs instead of seeing every thread always-on. Carries
            unread + awaiting-reply markers + Created/Received-date
            sort. Also hosts the "+ New thread" CTA (moved here from
            the panel header so it sits with the rest of the thread-
            discovery chrome and isn't adjacent to the Close X).
            Always rendered so the New-thread CTA stays reachable
            regardless of how many threads exist. */}
        <CorrespondenceThreadPicker
          threads={threads}
          openThreadIds={openThreadIds}
          onOpenThread={handleOpenThread}
          sortMode={threadSortMode}
          onSortModeChange={setThreadSortMode}
          onNewThread={() => setSelectedTabValue(NEW_THREAD_TAB_VALUE)}
          isNewThreadActive={selectedTabValue === NEW_THREAD_TAB_VALUE}
        />
        <CorrespondenceThreadTabs
          threads={threads}
          selectedValue={selectedTabValue}
          onSelect={setSelectedTabValue}
          openThreadIds={openThreadIds}
          onCloseThread={handleCloseThread}
        />

        <div className={styles.body}>
          {/* EA-rejected Form 3 banner — pinned above the thread when
              the case carries a Form3Response+None GFR awaiting
              retraction. Self-hides otherwise. */}
          <EaRejectedForm3Banner
            formData={caseFormData}
            onRetractForm3={onRetractForm3}
          />
          <CorrespondenceThreads
            items={threadItems}
            ariaLiveLabel={
              activeThread
                ? `Thread: ${activeThread.label}`
                : "New thread — no messages yet"
            }
            onViewForm={handleViewForm}
            onViewAttachment={handleViewAttachment}
            onReplyWithTemplate={handleReplyWithTemplate}
            eaRejectedForm3Id={
              isForm3RejectedByEa(caseFormData) &&
              !isForm3Retracted(caseFormData)
                ? gfrBlock(caseFormData)?.referencedForm3Id
                : undefined
            }
            retractDisabled={!canRetractForm3(caseFormData)}
            retractGateReason={gfrRetractGateReason(caseFormData)}
            onRetractForm3={onRetractForm3}
          />
          <CorrespondenceComposer
            caseId={caseId}
            caseFormData={caseFormData}
            threadItems={threadItems}
            newThreadMode={isNewThreadTab}
            onSend={onSend}
            pendingTemplateRequest={pendingComposerRequest}
            onPendingTemplateConsumed={() => setPendingComposerRequest(null)}
            onComposeWithTemplate={onComposeWithTemplate}
          />
        </div>

        {/* In-panel form preview — Fluent Dialog wrapping the existing
            FormPreviewPanel renderer used by the forms-library. */}
        <Dialog
          open={formPreview !== null}
          onOpenChange={(_e, data) => {
            if (!data.open) setFormPreview(null);
          }}
        >
          <DialogSurface
            className={styles.previewSurface}
            aria-labelledby="correspondence-form-preview-title"
          >
            <DialogBody>
              <DialogTitle id="correspondence-form-preview-title">
                {formPreview?.template.name ?? "Form preview"}
                {formPreview && (
                  <Caption1
                    style={{
                      display: "block",
                      marginTop: tokens.spacingVerticalXXS,
                      color: tokens.colorNeutralForeground3,
                      fontWeight: tokens.fontWeightRegular,
                    }}
                  >
                    {formPreview.sourceLabel}
                  </Caption1>
                )}
              </DialogTitle>
              <DialogContent className={styles.previewScroller}>
                {formPreview ? (
                  <FormPreviewPanel
                    template={formPreview.template}
                    instance={formPreview.instance}
                  />
                ) : null}
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Close</Button>
                </DialogTrigger>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>

        {/* RFI / PAI document preview — opens whenever the bubble's
            View pill fires for an inbound RequestAdditionalInformation /
            ProvideAdditionalInformation item or its outbound twin. Same
            UX shape as the Form 3 preview above (Dialog → letterhead
            page) but without the Phase-1 template engine — RFI / PAI
            are free-form documents with structured metadata. */}
        <RfiPaiPreviewDialog
          item={rfiPaiPreview}
          onClose={() => setRfiPaiPreview(null)}
          onViewAttachment={handleViewAttachment}
        />

        {/* In-panel attachment preview — handles inline image rendering,
            text/plain rendering, and a generic "Open in new tab" fallback
            for everything else. */}
        <Dialog
          open={attachmentPreview !== null}
          onOpenChange={(_e, data) => {
            if (!data.open) setAttachmentPreview(null);
          }}
        >
          <DialogSurface
            className={styles.previewSurface}
            aria-labelledby="correspondence-attachment-preview-title"
          >
            <DialogBody>
              <DialogTitle id="correspondence-attachment-preview-title">
                {attachmentPreview?.name ?? "Attachment"}
              </DialogTitle>
              <DialogContent>
                {attachmentPreview && (
                  <>
                    {/* Semantic <dl> so screen readers announce these
                        as term/definition pairs instead of a generic
                        row of inline text. Fluent's typography
                        components don't accept `dt`/`dd` via their `as`
                        prop, so the raw tags wrap the text. */}
                    <dl className={styles.attachmentMeta}>
                      <div className={styles.attachmentMetaRow}>
                        <dt><Body1Strong>Type</Body1Strong></dt>
                        <dd><Body1>{attachmentPreview.type || "Unknown"}</Body1></dd>
                      </div>
                      <div className={styles.attachmentMetaRow}>
                        <dt><Body1Strong>Size</Body1Strong></dt>
                        <dd><Body1>{formatBytes(attachmentPreview.size)}</Body1></dd>
                      </div>
                    </dl>
                    <div className={styles.attachmentMediaWrapper}>
                      {(() => {
                        const t = attachmentPreview.type || "";
                        const url = attachmentPreview.url;
                        if (!url) {
                          return (
                            <div className={styles.attachmentFallback}>
                              <DocumentText20Regular aria-hidden="true" />
                              <Body1>
                                No preview URL available for this attachment.
                              </Body1>
                            </div>
                          );
                        }
                        if (t.startsWith("image/")) {
                          return (
                            <img
                              src={url}
                              alt={attachmentPreview.name}
                              className={styles.attachmentImage}
                            />
                          );
                        }
                        if (t === "application/pdf") {
                          return (
                            <iframe
                              src={url}
                              title={attachmentPreview.name}
                              style={{
                                width: "100%",
                                height: "60vh",
                                border: "none",
                              }}
                            />
                          );
                        }
                        return (
                          <div className={styles.attachmentFallback}>
                            <DocumentText20Regular aria-hidden="true" />
                            <Body1>
                              Inline preview isn't available for this file
                              type. Use "Open in new tab" below.
                            </Body1>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </DialogContent>
              <DialogActions>
                {attachmentPreview?.url && (
                  <>
                    <Button
                      appearance="secondary"
                      icon={<Open20Regular />}
                      as="a"
                      href={attachmentPreview.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Open in new tab
                    </Button>
                    <Button
                      appearance="secondary"
                      icon={<ArrowDownload20Regular />}
                      as="a"
                      href={attachmentPreview.url}
                      download={attachmentPreview.name}
                    >
                      Download
                    </Button>
                  </>
                )}
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="primary">Close</Button>
                </DialogTrigger>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </aside>
    </FluentProvider>
      </Resizable>
    </div>
  );
}
