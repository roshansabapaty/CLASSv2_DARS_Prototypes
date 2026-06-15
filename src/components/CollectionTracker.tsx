import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { FormData, generateJobId } from "./DataEntryForm";
import { StickyCaseHeader } from "./StickyCaseHeader";
import { PageContainer } from "./layout/PageContainer";
import { DocumentViewerPanel } from "./DocumentViewerPanel";
import { useDocumentViewer } from "../hooks/useDocumentViewer";
import { usePersistedBoolean } from "../hooks/usePaneVisibility";
import {
  CorrespondenceBanner,
  CorrespondencePanel,
} from "./correspondence";
import { transitionOutbound as transitionOutboundFn } from "./correspondence/correspondenceEngine";
import type {
  CorrespondenceItem,
  OutboundCorrespondenceItem,
  OutboundTransmissionStatus,
} from "../types/correspondence";
import { isAttorneyEscalationActive } from "../utils/escalationHelpers";
import {
  getActiveAttorneyEscalation,
  createAttorneyEscalation,
  linkHeldOutboundToEscalation,
} from "../utils/caseEscalation";
import type { SignalScope } from "../types/caseTypes";
import type {
  AttorneyEscalation,
  EscalationAuditEvent,
} from "../types/caseTypes";
import { EscalateToAttorneyDialog } from "./escalation/EscalateToAttorneyDialog";
import { EscalationCompleteBanner } from "./escalation/EscalationCompleteBanner";
import { AutoStateChangeBanner } from "./escalation/AutoStateChangeBanner";
import { GroundsForRefusalPanel } from "./escalation/GroundsForRefusalPanel";
import { RetractForm3Dialog } from "./escalation/RetractForm3Dialog";
import { FailedDeliveryBanner } from "./delivery/FailedDeliveryBanner";
import {
  canDeliver as gfrCanDeliver,
  isCaseOnFullGfrHold,
  identifierBlockedByPartialGfr,
  blockedIdentifierIds,
  currentDecision as gfrCurrentDecision,
  gfrBlock,
  canRetractForm3,
  retractGateReason,
  isGfrEnforced,
} from "../utils/groundsForRefusal";
import {
  isEEvidenceDelivery,
  collectFailedDeliveryJobs,
} from "../utils/deliveryStatus";
import {
  useInboundEventHandler,
  type InboundEventHandlerRegistry,
} from "../hooks/useInboundEventHandler";
import {
  useEaWindowExpiry,
  applyManualDeliveryResume,
} from "../hooks/useEaWindowExpiry";
import { startRetentionClock } from "../utils/retentionClock";
import { applyPreservationExtension } from "../utils/preservationExtension";
import { applyEndPreservation } from "../utils/endPreservation";
import { applyPreservationOrderReceipt, applyPreservationOrderAcknowledged } from "../utils/preservationOrderReceipt";
import { applyWithdrawal } from "../utils/withdrawal";
import { applyForm3Submission } from "../utils/form3Submission";
import { pauseSlaTimerOnFormThreeSubmission } from "../utils/slaTimer";
import { applyGfrEnforcement, releaseGfrEnforcement } from "../utils/gfrEnforcement";
import { PreservationExtensionBanner } from "./preservation/PreservationExtensionBanner";
import { EndPreservationBanner } from "./preservation/EndPreservationBanner";
import { PreservationOrderActiveBanner } from "./preservation/PreservationOrderActiveBanner";
import { WithdrawalBanner } from "./preservation/WithdrawalBanner";
import { EmergencyEEvidenceBanner } from "./preservation/EmergencyEEvidenceBanner";
import { createFormInstance } from "./forms-library/formEngine";
import { FormFillerDialog } from "./forms-library/FormFillerDialog";
import { getTemplateById } from "../config/formTemplates";
import type { CaseFormInstance } from "../types/formTemplate";
import {
  set as setCorrespondenceForCase,
  get as getCorrespondenceForCase,
  subscribe as subscribeToCorrespondenceStore,
} from "../state/correspondenceStore";
import { ManualCollectionForm } from "./ManualCollectionForm";
import { ManualServiceCategories } from "./ManualServiceCategories";
import {
  makeStyles,
  mergeClasses,
  Button as FluentButton,
  Badge as FluentBadge,
  Checkbox as FluentCheckbox,
  Input as FluentInput,
  Textarea as FluentTextarea,
  Label as FluentLabel,
  Tooltip as FluentTooltip,
  Dialog as FluentDialog,
  DialogSurface,
  DialogTitle as FluentDialogTitle,
  DialogBody,
  DialogContent as FluentDialogContent,
  DialogActions,
  DialogTrigger as FluentDialogTrigger,
  Select as FluentSelect,
  Option,
  TabList,
  Tab,
} from "@fluentui/react-components";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { getServiceDisplayName } from "../config/microsoftServices";
import { getGroupName, getItemName, getServiceName, isManualCategory } from "../config/lensServicesConfig";
import { CopyableText } from "./CopyButton";
import { TruncatedText } from "./ui/truncated-text";
import { CopyableIdentifier } from "./CopyableIdentifier";
import { IdentifierAliasesPanel } from "./IdentifierAliasesPanel";
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsDown,
  ChevronsUp,
  Database, 
  CheckCircle2, 
  Clock, 
  XCircle,
  AlertCircle,
  AlertOctagon,
  Download,
  RefreshCw,
  Edit3,
  Wrench,
  Zap,
  Send,
  FileText,
  X,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  ArrowRight,
  Package,
  Truck,
  LayoutGrid,
  Users,
  RotateCcw,
  Save,
  ChevronRight,
  Copy,
  ShieldBan,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "./ui/utils";
import { toast } from "sonner@2.0.3";
import { formatDistanceToNow } from "date-fns";
import { PipelineStatusMatrix } from "./PipelineStatusMatrix";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import type {
  AccountIdentifier,
  ServiceWithResults,
  SubCategory,
  ResolutionReason,
} from "../types/caseTypes";
import { RESOLUTION_REASON_TO_STAGE, CURRENT_USER, RESPONSE_SPECIALISTS } from "../constants/caseConstants";
import { isEpocPrCase } from "../utils/eEvidenceHelpers";
import {
  AuthorizationStatusBanner,
  isAuthorizationStatusTerminal,
} from "./fulfillment-wizard/AuthorizationStatusBanner";
import { ResolveCaseDialog } from "./case-resolution/ResolveCaseDialog";
// shadcn Select/Textarea/Input/Label replaced by @fluentui/react-components

// Helper to create a composite key for a pipeline job
const getJobKey = (
  identifierId: string,
  serviceKey: string,
  categoryKey: string,
  accountType: string,
  addJobIdx?: number,
) =>
  addJobIdx !== undefined && addJobIdx >= 0
    ? `${identifierId}|${serviceKey}|${categoryKey}|${accountType}|${addJobIdx}`
    : `${identifierId}|${serviceKey}|${categoryKey}|${accountType}`;

// Format category name — supports compound "groupKey:itemKey" keys from new data model
const formatCategoryName = (categoryKey: string) => {
  if (categoryKey.includes(':')) {
    const [gKey, iKey] = categoryKey.split(':');
    return `${getGroupName(gKey)} — ${getItemName(gKey, iKey)}`;
  }
  return categoryKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

// Helper: iterate all items in service.categoryGroups, calling cb(compoundKey, item)
const iterateServiceCategories = (service: any, cb: (categoryKey: string, category: any) => void) => {
  Object.entries(service.categoryGroups || {}).forEach(([gKey, group]: [string, any]) => {
    Object.entries(group || {}).forEach(([iKey, item]: [string, any]) => {
      cb(`${gKey}:${iKey}`, item);
    });
  });
};

// Helper: immutably update one item in service.categoryGroups via compound "groupKey:itemKey" key
const applyItemUpdate = (groups: any, categoryKey: string, updates: any) => {
  const [gKey, iKey] = categoryKey.split(':');
  return {
    ...groups,
    [gKey]: { ...groups[gKey], [iKey]: { ...(groups[gKey]?.[iKey] || {}), ...updates } },
  };
};

// Pipeline job type for flat job list
interface PipelineJob {
  identifierId: string;
  identifierValue: string;
  identifierType: string;
  taskId: string;
  serviceKey: string;
  serviceName: string;
  categoryKey: string;
  categoryName: string;
  accountType: 'consumer' | 'enterprise';
  jobId: string | null;
  publishJobId?: string | null;
  deliveryJobId?: string | null;
  collectionStatus: string;
  publishStatus: string;
  deliveryStatus: string;
  isManual: boolean;
  jobKey: string;
  storageLocation?: string;
  startDate?: Date;
  endDate?: Date;
  createdOn?: Date;
  collectionStatusUpdatedAt?: Date;
  publishStatusUpdatedAt?: Date;
  deliveryStatusUpdatedAt?: Date;
}

// ── Fluent UI makeStyles — badge and button color variants ───────────────────
const useStyles = makeStyles({
  // Badge color variants matching the DARS Fluent palette
  badgeBlue:   { backgroundColor: "#deecf9", color: "#0078d4", borderTopColor: "#0078d4", borderRightColor: "#0078d4", borderBottomColor: "#0078d4", borderLeftColor: "#0078d4" },
  badgeGreen:  { backgroundColor: "#dff6dd", color: "#107c10", borderTopColor: "#107c10", borderRightColor: "#107c10", borderBottomColor: "#107c10", borderLeftColor: "#107c10" },
  badgeRed:    { backgroundColor: "#fde7e9", color: "#a4262c", borderTopColor: "#a4262c", borderRightColor: "#a4262c", borderBottomColor: "#a4262c", borderLeftColor: "#a4262c" },
  badgeOrange: { backgroundColor: "#fef9f5", color: "#ca5010", borderTopColor: "#ca5010", borderRightColor: "#ca5010", borderBottomColor: "#ca5010", borderLeftColor: "#ca5010" },
  badgeYellow: { backgroundColor: "#fff4ce", color: "#8a6d3b", borderTopColor: "#8a6d3b", borderRightColor: "#8a6d3b", borderBottomColor: "#8a6d3b", borderLeftColor: "#8a6d3b" },
  badgePurple: { backgroundColor: "#e8d4f0", color: "#8764b8", borderTopColor: "#8764b8", borderRightColor: "#8764b8", borderBottomColor: "#8764b8", borderLeftColor: "#8764b8" },
  badgeAmber:  { backgroundColor: "#fffbf0", color: "#92400e", borderTopColor: "#d97706", borderRightColor: "#d97706", borderBottomColor: "#d97706", borderLeftColor: "#d97706" },
  badgeGray:   { backgroundColor: "#f3f2f1", color: "#605e5c", borderTopColor: "#8a8886", borderRightColor: "#8a8886", borderBottomColor: "#8a8886", borderLeftColor: "#8a8886" },
  // Checkbox tinted indicator colors
  checkboxGreen:  { "& .fui-Checkbox__indicator": { borderTopColor: "#107c10", borderRightColor: "#107c10", borderBottomColor: "#107c10", borderLeftColor: "#107c10", backgroundColor: "#107c10" } },
  checkboxOrange: { "& .fui-Checkbox__indicator": { borderTopColor: "#ca5010", borderRightColor: "#ca5010", borderBottomColor: "#ca5010", borderLeftColor: "#ca5010", backgroundColor: "#ca5010" } },
  // Button destructive / tinted variants
  buttonRed:    { backgroundColor: "#a4262c", color: "white", ":hover": { backgroundColor: "#8a2121" } },
  buttonGreen:  { backgroundColor: "#107c10", color: "white", ":hover": { backgroundColor: "#0e6b0e" } },
  buttonPurple: { backgroundColor: "#8764b8", color: "white", ":hover": { backgroundColor: "#7553a8" } },
});

/**
 * Pipeline phase status → lucide icon. Pairs every status color with a
 * shape so the meaning isn't conveyed by color alone (WCAG 1.4.1
 * compliance). The icon is rendered inline before the status label.
 */
function getStatusIcon(status: string): React.ReactNode {
  switch (status) {
    case "Complete":
      return <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" aria-hidden="true" />;
    case "Failed":
      return <XCircle className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" aria-hidden="true" />;
    case "Blocked":
      return <ShieldBan className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" aria-hidden="true" />;
    case "No Data":
      return <AlertCircle className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" aria-hidden="true" />;
    case "In Progress":
      return <RefreshCw className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" aria-hidden="true" />;
    case "Not Started":
    default:
      return <Clock className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" aria-hidden="true" />;
  }
}

interface CollectionTrackerProps {
  workflowStage?: "triage" | "fulfillment" | "collection";
  /** Navigate-only — lands on the fulfillment stage's Case Overview in
   *  VIEW mode (no edit chrome). Wired to the workflow rail. */
  onNavigateToFulfillment?: () => void;
  /** Explicit "edit collection scope" entry — wired to the Edit
   *  Fulfillment Plan button below. Lands in wizard edit mode with the
   *  Identifier & Data Services step open. Distinct from
   *  `onNavigateToFulfillment` so the workflow-rail click can stay a
   *  pure view navigation. */
  onEditFulfillmentScope?: () => void;
  onNavigateToTriage?: () => void;
  onNavigateToQueue?: () => void;
  /** Open a related case (e.g. the prior EPOC-PR) from the Documents register. */
  onOpenCase?: (caseId: string) => void;
  onToggleDocumentPanel?: () => void;
  sharedFormData?: FormData | null;
  setSharedFormData?: (data: FormData) => void;
  /** Optional controlled readiness filter (lifted for sidebar nav) */
  readinessFilter?: 'all' | 'needs-action' | 'by-identifier' | 'complete';
  /** Callback when readiness filter changes */
  onReadinessFilterChange?: (filter: 'all' | 'needs-action' | 'by-identifier' | 'complete') => void;
  /** Phase 4 (FF_STAGE_TAB_BAR): stage completion + dynamic sub-step nav
   *  state + step-click handler forwarded into StickyCaseHeader so the
   *  horizontal StageTabBar (replacement for WorkflowSidebar) can render
   *  on the Collection page. Ignored when the flag is off. */
  stageCompletion?: {
    triage: boolean;
    fulfillment: boolean;
    collection: boolean;
  };
  stageBarNavState?: import("../types/sidebarNav").SidebarNavState | null;
  onStageBarStepClick?: (key: string) => void;
  /** Callback emitting case-level action state for the WorkflowListPane.
   *  Same emit pattern as DataEntryForm — fires whenever the relevant
   *  state changes; App.tsx stores the emission and forwards the slots
   *  to the pane. See src/types/workflowPaneActions.ts. */
  onWorkflowPaneActions?: (
    actions: import("../types/workflowPaneActions").WorkflowPaneActions,
  ) => void;
  /** WorkflowListPane hide-entirely visibility — plumbed from App.tsx's
   *  usePaneVisibility hook through StickyCaseHeader. */
  workflowPaneVisible?: boolean;
  onShowWorkflowPane?: () => void;
  workflowActiveStepLabel?: string;
}

export function CollectionTracker({
  workflowStage = "collection",
  onNavigateToFulfillment,
  onEditFulfillmentScope,
  onNavigateToTriage,
  onNavigateToQueue,
  onOpenCase,
  onToggleDocumentPanel,
  sharedFormData,
  setSharedFormData,
  readinessFilter: controlledReadinessFilter,
  onReadinessFilterChange,
  stageCompletion,
  stageBarNavState,
  onStageBarStepClick,
  onWorkflowPaneActions,
  workflowPaneVisible,
  onShowWorkflowPane,
  workflowActiveStepLabel,
}: CollectionTrackerProps) {
  const [expandedIdentifiers, setExpandedIdentifiers] = useState<Set<string>>(new Set());
  const [internalReadinessFilter, setInternalReadinessFilter] = useState<'all' | 'needs-action' | 'by-identifier' | 'complete'>('by-identifier');

  // Support controlled or uncontrolled readinessFilter
  const readinessFilter = controlledReadinessFilter ?? internalReadinessFilter;
  const setReadinessFilter = useCallback((filter: 'all' | 'needs-action' | 'by-identifier' | 'complete') => {
    setInternalReadinessFilter(filter);
    onReadinessFilterChange?.(filter);
  }, [onReadinessFilterChange]);

  const [showPipelineReport, setShowPipelineReport] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  // Job-level selection for publish and delivery
  const [selectedJobsForPublish, setSelectedJobsForPublish] = useState<Set<string>>(new Set());
  const [selectedJobsForDelivery, setSelectedJobsForDelivery] = useState<Set<string>>(new Set());
  // The "Review & Submit to Delivery" dialog doubles as the Retry
  // Delivery dialog when the RS clicks the inline WISP-error banner
  // or a per-row Retry. Mode swaps the title / source list / submit
  // button copy; handleDeliverySelected branches on it to flip either
  // Not Started → Started (submit) or Failed → Started (retry).
  const [deliveryReviewMode, setDeliveryReviewMode] = useState<"submit" | "retry">("submit");
  const [showPublishReview, setShowPublishReview] = useState(false);
  // Mirror of `deliveryReviewMode` for the Package stage. The "Review &
  // Package" dialog doubles as the Retry Package dialog when the RS
  // clicks a per-row Retry on a publish-failed job. Mode swaps the
  // title / source list / submit button copy; handlePublishSelected
  // branches on it to flip either Not Started → Started (submit) or
  // Failed → Started (retry).
  const [publishReviewMode, setPublishReviewMode] = useState<"submit" | "retry">("submit");
  const [showDeliveryReview, setShowDeliveryReview] = useState(false);
  // Bug #2: confirmation dialog before bulk-starting collection. The
  // dialog surfaces the job count + identifier count so the RS sees
  // exactly what they're committing to before kicking off the IA's
  // backend processing.
  const [showStartCollectionDialog, setShowStartCollectionDialog] = useState(false);
  // Mode flips the StartCollection confirm dialog between "start" (the
  // default bulk-start path) and "retry" (Failed → Started for collect
  // failures). Same dialog, different copy + handler routing.
  const [collectionStartMode, setCollectionStartMode] = useState<"start" | "retry">("start");
  // Document viewer state — Collection now uses the same shared
  // `DocumentViewerPanel` (with Verify / Reject / per-document properties)
  // that Triage and Review Case mount. We alias `warrantModalOpen` to
  // `documentPanelOpen` so the existing layout-margin + mutual-exclusion
  // refs throughout this file keep working without rewiring every call.
  const {
    warrantModalOpen: documentPanelOpen,
    setWarrantModalOpen: setDocumentPanelOpen,
    attachmentZoom,
    setAttachmentZoom,
    attachmentRotation,
    setAttachmentRotation,
    documentPanelWidth,
    setDocumentPanelWidth,
    availableDocuments,
    openDocumentIds,
    setOpenDocumentIds,
    activeDocumentId,
    setActiveDocumentId,
    selectedDocumentToOpen,
    setSelectedDocumentToOpen,
    documentDetailsExpanded,
    setDocumentDetailsExpanded,
    documentInvalidReasons,
    setDocumentInvalidReasons,
    documentVerifications,
    documentPanelMaxWidth,
    verifiedDocumentsCount,
    modalCloseButtonRef,
    modalTriggerButtonRef,
    handleVerifyDocument,
    handleRejectDocument,
    handleUndoVerifyDocument,
  } = useDocumentViewer({ sidebarCollapsed: false });

  // Phase C: deep-link from a workflow banner to its document in the
  // Documents register. Opens the doc panel and asks LegalDemandFormView to
  // select the document for the given template. The `#nonce` suffix lets a
  // repeat click re-focus even if the template id is unchanged.
  const [docFocusRequest, setDocFocusRequest] = useState<string | undefined>(undefined);
  const viewDocumentInRegister = (templateId: string) => {
    setDocFocusRequest(`${templateId}#${Date.now()}`);
    setDocumentPanelOpen(true);
  };
  // Correspondence Hub side panel — same parent-controlled flag pattern as
  // DataEntryForm. CorrespondenceBanner / UnreadAlert "Open Hub" CTAs flip
  // this open; the panel itself uses re-resizable so the user can widen
  // it to read correspondence side-by-side with the case data, and the
  // scrollable case body shrinks its `marginRight` to match.
  const [correspondencePanelOpen, setCorrespondencePanelOpenRaw] =
    usePersistedBoolean("dars.correspondencePanel.open", false);
  const [correspondencePanelWidth, setCorrespondencePanelWidth] = useState(540);
  // External composer request — bumped when an EPOC-PR action CTA fires
  // ("Cannot Preserve" → EPOC_FORM_3, "Acknowledge Receipt" → EPOC_PRESERVATION_ACK).
  // The CorrespondencePanel watches the nonce and opens the composer with
  // the picked template pre-attached, so the RS lands directly in the
  // Fill / Sign / Send flow.
  const [presetComposerRequest, setPresetComposerRequest] = useState<{
    templateId: string;
    nonce: number;
  } | null>(null);
  const openComposerWith = useCallback(
    (templateId: string) => {
      setPresetComposerRequest((prev) => ({
        templateId,
        nonce: (prev?.nonce ?? 0) + 1,
      }));
      setCorrespondencePanelOpenRaw(true);
      if (documentPanelOpen) setDocumentPanelOpen(false);
    },
    [documentPanelOpen],
  );
  const openForm3Composer = useCallback(
    () => openComposerWith("EPOC_FORM_3"),
    [openComposerWith],
  );
  const openAcknowledgeReceiptComposer = useCallback(
    () => openComposerWith("EPOC_PRESERVATION_ACK"),
    [openComposerWith],
  );

  // ─── Form Filler plumbing for composer-picked templates ────────────────
  // Use shared form data if available. Declared BEFORE the form-instance
  // useCallbacks below because their dependency arrays reference
  // `formData` at render time — leaving the `const` lower in the body
  // tripped a temporal-dead-zone ReferenceError when this component
  // mounted on the Collection page.
  const formData = sharedFormData;

  // When the user picks a template in the composer (or arrives here via
  // the "Cannot Preserve" CTA), CorrespondencePanel calls
  // `onComposeWithTemplate`. We create a CaseFormInstance, register it
  // on FormData.formInstances, and open FormFillerDialog so the RS can
  // fill / sign / preview. Mirrors DataEntryForm's wiring.
  const [composeOpenInstanceRequestId, setComposeOpenInstanceRequestId] =
    useState<string | null>(null);
  const handleCreateFormInstance = useCallback(
    (instance: CaseFormInstance) => {
      if (!formData || !setSharedFormData) return;
      setSharedFormData({
        ...formData,
        formInstances: [...(formData.formInstances ?? []), instance],
      });
    },
    [formData, setSharedFormData],
  );
  const handleUpdateFormInstance = useCallback(
    (instanceId: string, partial: Partial<CaseFormInstance>) => {
      if (!formData || !setSharedFormData) return;
      setSharedFormData({
        ...formData,
        formInstances: (formData.formInstances ?? []).map((inst) =>
          inst.instanceId === instanceId
            ? { ...inst, ...partial, updatedAt: new Date() }
            : inst,
        ),
      });
    },
    [formData, setSharedFormData],
  );
  const handleComposerPickTemplate = useCallback(
    (template: import("../types/formTemplate").FormTemplate): string => {
      if (!formData) return "";
      const instance = createFormInstance(template, formData);
      handleCreateFormInstance(instance);
      setComposeOpenInstanceRequestId(instance.instanceId);
      return instance.instanceId;
    },
    [formData, handleCreateFormInstance],
  );
  // Mutual exclusion: the Collection-page inline document review panel
  // (fixed 480px right-side overlay) and the correspondence panel both
  // anchor to the right edge; opening one closes the other.
  const setCorrespondencePanelOpen = (next: boolean) => {
    setCorrespondencePanelOpenRaw(next);
    if (next && documentPanelOpen) setDocumentPanelOpen(false);
  };
  useEffect(() => {
    if (documentPanelOpen && correspondencePanelOpen) {
      setCorrespondencePanelOpenRaw(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentPanelOpen]);
  // Case resolution (Phase 5c.5) — dialog state only; reason + notes are
  // managed inside ResolveCaseDialog and surfaced via the onResolve callback.
  const [showResolveCaseDialog, setShowResolveCaseDialog] = useState(false);
  const [resolveDefaultReason, setResolveDefaultReason] = useState<ResolutionReason | undefined>(undefined);
  const [resolveDefaultNotes, setResolveDefaultNotes] = useState<string>("");
  const [resolveDialogMode, setResolveDialogMode] = useState<"resolve" | "edit">("resolve");
  // Attorney escalation dialog (Collection stage parity with Triage/Fulfillment).
  // The escalation lifecycle can be initiated, updated, or resumed from any
  // stage of the case — keeping the Escalate CTA available here matches the
  // behavior of the case form.
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [showDeliveredReport, setShowDeliveredReport] = useState(false);
  // Phase 2: Inline manual entry in By Identifier view
  const [expandedManualEntries, setExpandedManualEntries] = useState<Set<string>>(new Set());
  const [manualSectionCollapsed, setManualSectionCollapsed] = useState(false);
  const [inlineManualStatuses, setInlineManualStatuses] = useState<Record<string, string>>({});
  const [inlineManualLocations, setInlineManualLocations] = useState<Record<string, string>>({});
  const [inlineManualNotes, setInlineManualNotes] = useState<Record<string, string>>({});
  const [inlineSaving, setInlineSaving] = useState<Set<string>>(new Set());
  const [deliveryBlocked, setDeliveryBlocked] = useState(false);
  const [showBlockDeliveryDialog, setShowBlockDeliveryDialog] = useState(false);
  // Attention-calling: briefly highlight stage footers when new actions become available after a refresh
  const [newPrepareAction, setNewPrepareAction] = useState(false);
  const [newDeliverAction, setNewDeliverAction] = useState(false);
  const prevPublishableCountRef = useRef(0);
  const prevDeliverableCountRef = useRef(0);

  // --- Dirty State Tracking ---
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const savedFormSnapshotRef = useRef<string | null>(null);

  // Fluent UI styles (must be called before any early return — React hook rules)
  const styles = useStyles();

  // ─── EU eEvidence — Grounds for Refusal (Phase D delivery gating) ───
  // Derive once per render so the various delivery action sites can
  // share the same answer. Honors the workflow + withdrawal gate via
  // `gfrCanDeliver()`. `canDeliverCase` is the global flag (Full GFR /
  // lapsed-no-resume). Per-identifier gating uses
  // `identifierBlockedByPartialGfr(formData, taskId)`.
  const canDeliverCase = gfrCanDeliver(formData ?? null);
  const fullGfrActive = isCaseOnFullGfrHold(formData ?? null);
  const partialBlockedTaskIds = React.useMemo(
    () => new Set(blockedIdentifierIds(formData ?? null)),
    [formData],
  );
  const gfrDecisionKind = gfrCurrentDecision(formData ?? null)?.kind;
  const gfrBlockData = gfrBlock(formData ?? null);

  // ─── eEvidence WISP delivery callback — Retry Delivery flow ───────
  // The list of failed jobs drives the top-of-page FailedDeliveryBanner.
  // The actual retry confirmation now reuses the existing
  // DeliveryReview dialog under `deliveryReviewMode === "retry"` so the
  // RS gets the same familiar review pattern as Submit-to-Delivery.
  // See openDeliveryReviewForRetry / handleDeliverySelected (mode branch).
  const failedDeliveryJobs = React.useMemo(
    () => collectFailedDeliveryJobs(formData ?? null),
    [formData],
  );

  // Flat list of ALL pipeline jobs (automated + manual) for publish/delivery
  // selection. Hoisted above the retention-clock useEffect below because
  // that effect's dependency array reads `allPipelineJobs` at render time —
  // leaving the useMemo lower in the body triggered a temporal-dead-zone
  // ReferenceError on the Collection page.
  const allPipelineJobs = useMemo((): PipelineJob[] => {
    const jobs: PipelineJob[] = [];

    formData.identifiers.forEach(identifier => {
      Object.entries(identifier.services).forEach(([serviceKey, service]: [string, any]) => {
        const showConsumer = service.includeConsumerAccount !== false;
        const showEnterprise = service.includeEnterpriseAccount === true;

        iterateServiceCategories(service, (categoryKey, category: any) => {
          if (!category.enabled) return;

          const isManual = isManualCategory(serviceKey, categoryKey);
          const accountTypes: Array<'consumer' | 'enterprise'> = [];
          if (showConsumer) accountTypes.push('consumer');
          if (showEnterprise) accountTypes.push('enterprise');
          if (accountTypes.length === 0) accountTypes.push('consumer');

          accountTypes.forEach(accountType => {
            const jobIdSuffix = accountType === 'enterprise' ? '-ENT' : '';
            const jobId = category.jobId ? `${category.jobId}${jobIdSuffix}` : null;
            const jobKey = getJobKey(identifier.id, serviceKey, categoryKey, accountType);

            // Resolve storage location: fulfillment plan > account existence > undefined
            const planLocation = (identifier as any).fulfillmentPlan?.services?.[serviceKey]?.dataCenterLocation;
            const acctLocation = accountType === 'enterprise'
              ? service.accountExistence?.enterpriseStorageLocation
              : service.accountExistence?.consumerStorageLocation;
            const resolvedStorageLocation = planLocation || acctLocation || undefined;

            // Primary job
            jobs.push({
              identifierId: identifier.id,
              identifierValue: identifier.value || "N/A",
              identifierType: identifier.type || "N/A",
              taskId: identifier.taskId || "N/A",
              serviceKey,
              serviceName: getServiceName(serviceKey),
              categoryKey,
              categoryName: formatCategoryName(categoryKey),
              accountType,
              jobId,
              publishJobId: category.publishJobId || null,
              deliveryJobId: category.deliveryJobId || null,
              collectionStatus: category.collectionStatus || "Not Started",
              publishStatus: category.publishStatus || "Not Started",
              deliveryStatus: category.deliveryStatus || "Not Started",
              isManual,
              jobKey,
              storageLocation: resolvedStorageLocation,
              startDate: category.startDate,
              endDate: category.endDate,
              createdOn: category.createdOn,
              collectionStatusUpdatedAt: category.collectionStatusUpdatedAt,
              publishStatusUpdatedAt: category.publishStatusUpdatedAt,
              deliveryStatusUpdatedAt: category.deliveryStatusUpdatedAt,
            });

            // Additional jobs (duplicate jobs with different date ranges)
            if (category.additionalJobs && category.additionalJobs.length > 0) {
              category.additionalJobs.forEach((addJob: any, addIdx: number) => {
                const addJobId = addJob.jobId ? `${addJob.jobId}${jobIdSuffix}` : null;
                const addJobKey = `${jobKey}|${addIdx}`;
                jobs.push({
                  identifierId: identifier.id,
                  identifierValue: identifier.value || "N/A",
                  identifierType: identifier.type || "N/A",
                  taskId: identifier.taskId || "N/A",
                  serviceKey,
                  serviceName: getServiceName(serviceKey),
                  categoryKey,
                  categoryName: formatCategoryName(categoryKey),
                  accountType,
                  jobId: addJobId,
                  publishJobId: addJob.publishJobId || null,
                  deliveryJobId: addJob.deliveryJobId || null,
                  collectionStatus: addJob.collectionStatus || "Not Started",
                  publishStatus: addJob.publishStatus || "Not Started",
                  deliveryStatus: addJob.deliveryStatus || "Not Started",
                  isManual,
                  jobKey: addJobKey,
                  storageLocation: resolvedStorageLocation,
                  startDate: addJob.startDate,
                  endDate: addJob.endDate,
                  createdOn: addJob.createdOn,
                  collectionStatusUpdatedAt: addJob.collectionStatusUpdatedAt,
                  publishStatusUpdatedAt: addJob.publishStatusUpdatedAt,
                  deliveryStatusUpdatedAt: addJob.deliveryStatusUpdatedAt,
                });
              });
            }
          });
        });
      });
    });

    return jobs;
  }, [formData]);

  /** Phase D — Retract Form 3 flow surfaced during Collection. Same
   *  contract as DataEntryForm: open a confirmation dialog; on
   *  confirm patch the GFR block + append a `Form3Retracted` audit
   *  event. Mirrors handleConfirmRetractForm3 in DataEntryForm. */
  const [showRetractForm3Dialog, setShowRetractForm3Dialog] = useState(false);
  const handleOpenRetractForm3Dialog = React.useCallback(() => {
    if (!canRetractForm3(formData)) {
      const reason = retractGateReason(formData);
      if (reason) toast.error(reason);
      return;
    }
    setShowRetractForm3Dialog(true);
  }, [formData]);
  const handleConfirmRetractForm3 = React.useCallback(() => {
    if (!formData || !setSharedFormData) return;
    if (!canRetractForm3(formData)) {
      toast.error(
        retractGateReason(formData) ??
          "Retract not allowed in the current case state.",
      );
      return;
    }
    const block = formData.eevidenceGroundsForRefusal;
    if (!block) return;
    const now = new Date();
    setSharedFormData({
      ...formData,
      eevidenceGroundsForRefusal: {
        ...block,
        form3RetractedAt: now,
        form3RetractedBy: CURRENT_USER,
      },
      escalationAuditEvents: [
        ...(formData.escalationAuditEvents ?? []),
        {
          id: `audit-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          kind: "Form3Retracted",
          actor: CURRENT_USER,
          performedAt: now,
          note:
            "Form 3 retracted by Specialist after EA returned No " +
            "Grounds for Refusal. Specialist acknowledged the EA's " +
            "decision and confirmed production will resume.",
        },
      ],
    });
    toast.success("Form 3 retracted. Production may proceed.");
  }, [formData, setSharedFormData]);

  // ─── Correspondence (Phase 2) — store sync: mirror the cross-case
  // store's value for this caseId into formData.correspondence via
  // setSharedFormData. Drives auto-sim updates into the Outbox surfaces.
  const storeCorrespondence = React.useSyncExternalStore(
    subscribeToCorrespondenceStore,
    () => getCorrespondenceForCase(formData?.caseId ?? ""),
    () => getCorrespondenceForCase(formData?.caseId ?? ""),
  );
  React.useEffect(() => {
    if (!setSharedFormData || !formData) return;
    if (formData.correspondence === storeCorrespondence) return;
    setSharedFormData({ ...formData, correspondence: storeCorrespondence });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeCorrespondence]);

  // ─── Inbound event handler seam ──────────────────────────────────────
  // Watches the correspondence store for new inbound items and applies
  // per-kind FormData mutations. Currently registered:
  //   - PreservationExtension (Form 6): bumps the targeted identifiers'
  //     `desiredPreservationExpiration` and appends a "PreservationExtended"
  //     audit event. Idempotent via documentId attribution.
  //   - EndPreservation: starts the 45-day retention clock anchored to
  //     the IA's stated end date and appends a "PreservationEnded" audit
  //     event. Idempotent via documentId attribution.
  const inboundHandlers = React.useMemo<InboundEventHandlerRegistry>(
    () => ({
      PreservationOrder: applyPreservationOrderReceipt,
      PreservationExtension: applyPreservationExtension,
      EndPreservation: applyEndPreservation,
      // Workflow 8 — IA withdraws the EPOC. Cancels pending delivery,
      // starts the 45-day retention clock, flips caseStage +
      // authorizationDesiredStatus to "Withdrawn", appends EpocWithdrawn
      // audit. Idempotent via documentId.
      Withdrawal: applyWithdrawal,
    }),
    [],
  );
  useInboundEventHandler({
    formData: formData ?? null,
    setSharedFormData,
    handlers: inboundHandlers,
  });

  // ─── EA review-window lifecycle ──────────────────────────────────────
  // Watches the GFR block against the live tick: fires `EaWindowExpired`
  // when Day 10 passes without an EA decision; fires `GfrCleared` when a
  // Form1Review None decision lands. Both writes idempotent.
  useEaWindowExpiry({
    formData: formData ?? null,
    setSharedFormData,
  });

  // Manual Resume Delivery — wired into the GFR Panel's lapsed branch.
  // Flips `manualDeliveryResumed` + appends GfrDeliveryResumedManually.
  const handleResumeDelivery = useCallback(() => {
    if (!formData || !setSharedFormData) return;
    const next = applyManualDeliveryResume(formData);
    if (next === formData) return;
    setSharedFormData(next);
    toast.success("Delivery resumed", {
      description:
        "EA review window had lapsed without a decision. Submit-to-Delivery is re-enabled.",
    });
  }, [formData, setSharedFormData]);

  // GFR enforcement — wired into the Full / Partial GFR panel CTAs. Sets
  // `enforcementApplied` on the GFR block + appends `GfrEnforced` audit.
  // Idempotent — clicking after enforcement is in effect is a no-op.
  const handleBlockDeliveryFromGfr = useCallback(() => {
    if (!formData || !setSharedFormData) return;
    const next = applyGfrEnforcement(formData);
    if (next === formData) return;
    setSharedFormData(next);
    const kind = formData.eevidenceGroundsForRefusal?.decision?.kind;
    toast.success("Delivery blocked — GFR enforced", {
      description:
        kind === "Partial"
          ? "Listed target identifiers can no longer deliver. GfrEnforced event appended to the audit thread."
          : "Case-wide delivery is now blocked. GfrEnforced event appended to the audit thread.",
    });
  }, [formData, setSharedFormData]);

  // Undo — covers accidental Block Delivery clicks AND deliberate
  // release after re-evaluation. Clears `enforcementApplied` +
  // appends `GfrEnforcementReleased`. The original GfrEnforced audit
  // event stays in the log so the trail captures both actions.
  const handleUndoBlockDeliveryFromGfr = useCallback(() => {
    if (!formData || !setSharedFormData) return;
    const next = releaseGfrEnforcement(formData);
    if (next === formData) return;
    setSharedFormData(next);
    toast.success("GFR enforcement released", {
      description:
        "Delivery actions are re-enabled. GfrEnforcementReleased event appended to the audit thread.",
    });
  }, [formData, setSharedFormData]);

  // ─── 45-day retention clock — Delivered path (Reg 2023/1543) ─────────
  // Starts the post-delivery retention window when every pipeline job
  // for the case has reached a terminal delivered state (Complete or
  // DeliveryAcknowledged). Idempotent via startRetentionClock — re-runs
  // after the clock is set don't bump the start time.
  React.useEffect(() => {
    if (!formData || !setSharedFormData) return;
    if (formData.retentionClock) return;
    if (allPipelineJobs.length === 0) return;
    const everyJobDelivered = allPipelineJobs.every(
      (j) =>
        j.deliveryStatus === "Complete" ||
        j.deliveryStatus === "DeliveryAcknowledged",
    );
    if (!everyJobDelivered) return;
    const sourceLabel = `Production delivered — case ${formData.caseId}`;
    const next = startRetentionClock(formData, "Delivered", sourceLabel);
    if (next === formData) return;
    setSharedFormData(next);
  }, [allPipelineJobs, formData, setSharedFormData]);

  // ─── Correspondence (Phase 2) — same handlers as DataEntryForm.
  // Inbound items can arrive from the issuing/enforcing authority at any
  // stage, so the Correspondence Hub is reachable from Collection too.
  const handleMarkInboundRead = useCallback(
    (itemId: string) => {
      if (!setSharedFormData || !formData) return;
      const next = (formData.correspondence ?? []).map((item) => {
        if (item.id !== itemId || item.direction !== "Inbound") return item;
        return { ...item, readAt: item.readAt ?? new Date() };
      }) as CorrespondenceItem[];
      setCorrespondenceForCase(formData.caseId, next);
      setSharedFormData({ ...formData, correspondence: next });
    },
    [formData, setSharedFormData],
  );
  const handleClearInboundFollowUp = useCallback(
    (itemId: string) => {
      if (!setSharedFormData || !formData) return;
      const next = (formData.correspondence ?? []).map((item) => {
        if (item.id !== itemId || item.direction !== "Inbound") return item;
        if (!item.followUp) return item;
        return {
          ...item,
          followUp: { ...item.followUp, completedAt: new Date() },
        };
      }) as CorrespondenceItem[];
      setCorrespondenceForCase(formData.caseId, next);
      setSharedFormData({ ...formData, correspondence: next });
    },
    [formData, setSharedFormData],
  );

  // Outbound handlers (Slice D). Mirror DataEntryForm's versions, using
  // the store as the source of truth so the auto-sim hook + DemoControls
  // see the writes.
  const handleTransitionOutboundCase = useCallback(
    (
      itemId: string,
      next: OutboundTransmissionStatus,
      audit?: Partial<OutboundCorrespondenceItem["transmission"]>,
    ) => {
      if (!formData) return;
      const caseId = formData.caseId;
      const current = getCorrespondenceForCase(caseId);
      const updated = transitionOutboundFn(current, itemId, next, audit);
      setCorrespondenceForCase(caseId, updated);
    },
    [formData],
  );

  const handleSendFreeTextOutbound = useCallback(
    (item: OutboundCorrespondenceItem) => {
      if (!formData) return;
      const caseId = formData.caseId;
      const current = getCorrespondenceForCase(caseId);
      setCorrespondenceForCase(caseId, [...current, item]);
      toast.success("Letter sent", {
        description: `Auto-delivery in ~10s. The Outbox shows the lifecycle.`,
      });
    },
    [formData],
  );

  // Side-panel composer send. Mirrors DataEntryForm.handleSendOutbound:
  //  • Attorney Escalation OFF → append outbound as Sent (auto-sim takes over)
  //  • Attorney Escalation ON  → hold in Draft with `pendingAttorneyReview`
  //    and create / extend the case's AttorneyEscalation so the existing
  //    AttorneyReviewPanel surfaces the hold. Release walker (the case-page
  //    AttorneyReviewPanel) is responsible for flipping held outbounds back
  //    to Sent.
  const handleSendOutbound = useCallback(
    (
      item: OutboundCorrespondenceItem,
      opts: { attorneyEscalation: boolean },
    ) => {
      if (!formData || !setSharedFormData) return;
      const caseId = formData.caseId;

      if (opts.attorneyEscalation) {
        const heldItem: OutboundCorrespondenceItem = {
          ...item,
          transmission: {
            ...item.transmission,
            status: "Draft",
            pendingAttorneyReview: true,
          },
        };
        const current = getCorrespondenceForCase(caseId);
        const nextCorrespondence = [...current, heldItem];
        setCorrespondenceForCase(caseId, nextCorrespondence);

        const counterpartyLabel =
          heldItem.counterparty === "IssuingAuthority"
            ? "the Issuing Authority"
            : "the Enforcing Authority";

        // Outbound-driven escalation is case-wide (the held outbound
        // applies to the whole case, not a specific task).
        const scope: SignalScope = { kind: "all" };

        if (!isAttorneyEscalationActive(formData)) {
          const escalation: AttorneyEscalation = {
            role: "Attorney",
            reason: `Outbound correspondence requires attorney review before transmission to ${counterpartyLabel}.`,
            escalatedAt: new Date(),
            escalatedBy: CURRENT_USER,
            status: "Pending",
            actions: [],
            relatedOutboundIds: [heldItem.id],
          };
          const auditEvent: EscalationAuditEvent = {
            id: `audit-corr-esc-${Date.now().toString(36)}`,
            kind: "Escalated",
            actor: CURRENT_USER,
            actorRole: "ResponseSpecialist",
            performedAt: new Date(),
            note: `Held outbound "${heldItem.subject}" pending attorney review.`,
          };
          const withEscalation = createAttorneyEscalation(
            formData,
            scope,
            escalation,
            auditEvent,
          );
          setSharedFormData({
            ...withEscalation,
            correspondence: nextCorrespondence,
          });
        } else {
          const linked = linkHeldOutboundToEscalation(
            formData,
            scope,
            heldItem.id,
          );
          setSharedFormData({
            ...linked,
            correspondence: nextCorrespondence,
          });
        }

        toast.info("Outbound saved as Draft", {
          description:
            "Awaiting attorney review. The escalation banner now shows the hold.",
        });
        return;
      }

      const sentItem: OutboundCorrespondenceItem = {
        ...item,
        transmission: {
          ...item.transmission,
          status: "Sent",
          sentAt: item.transmission.sentAt ?? new Date(),
          sentBy: item.transmission.sentBy ?? CURRENT_USER,
        },
      };
      const current = getCorrespondenceForCase(caseId);
      setCorrespondenceForCase(caseId, [...current, sentItem]);

      // Detect outbound templates that drive case-state side effects.
      // Mirrors DataEntryForm.handleSendOutbound so the Collection-page
      // composer fires the same audit + retention + SLA flips as the
      // case-form composer. Without this, "Cannot Preserve → Form 3"
      // and "Acknowledge Receipt" CTAs land the outbound but skip every
      // downstream state mutation.
      const detectTemplate = (templateId: string) => {
        if (!sentItem.formInstanceId) return false;
        const instance = (formData.formInstances ?? []).find(
          (fi) => fi.instanceId === sentItem.formInstanceId,
        );
        return instance?.templateId === templateId;
      };
      const isFormThree = detectTemplate("EPOC_FORM_3");
      const isPreservationAck = detectTemplate("EPOC_PRESERVATION_ACK");

      if (isFormThree) {
        const form3DocumentId =
          sentItem.documentId ?? `outbound:${sentItem.id}`;
        const form3SentAt =
          sentItem.transmission?.sentAt instanceof Date
            ? sentItem.transmission.sentAt
            : new Date();
        // Mirror DataEntryForm — toast wording differs depending on
        // whether the retention clock was already running.
        const hadRetentionClockBefore = !!formData.retentionClock;
        setSharedFormData(
          applyForm3Submission(pauseSlaTimerOnFormThreeSubmission(formData), {
            documentId: form3DocumentId,
            sentAt: form3SentAt,
            source: `Form 3 doc ${form3DocumentId}`,
          }),
        );
        if (hadRetentionClockBefore) {
          toast.success("Form 3 sent — SLA paused", {
            description:
              "The case's SLA countdown is halted. Form3Submitted + SLAStopped " +
              "events appended to the audit thread. (Retention clock from a " +
              "prior terminal event is already running — start time preserved.)",
          });
        } else {
          toast.success("Form 3 sent — SLA paused, 45-day retention started", {
            description:
              "The case's SLA countdown is halted and the 45-day data-deletion " +
              "window opened. Form3Submitted + SLAStopped events appended to the " +
              "audit thread.",
          });
        }
      } else if (isPreservationAck) {
        const ackDocumentId =
          sentItem.documentId ?? `outbound:${sentItem.id}`;
        const ackSentAt =
          sentItem.transmission?.sentAt instanceof Date
            ? sentItem.transmission.sentAt
            : new Date();
        setSharedFormData(
          applyPreservationOrderAcknowledged(formData, {
            documentId: ackDocumentId,
            sentAt: ackSentAt,
            actor: CURRENT_USER,
          }),
        );
        toast.success("Preservation receipt acknowledged to the IA", {
          description:
            "The PreservationOrderAcknowledged event landed in the audit thread.",
        });
      } else {
        toast.success("Message sent", {
          description: "Auto-delivery in ~10s. The thread shows the lifecycle.",
        });
      }
    },
    [formData, setSharedFormData],
  );

  // Phase 5c.5: when LE has set the case-level authorization status to a
  // terminal value (Cancelled / Withdrawn), gate destructive actions on the
  // collection page. Tooltip explains the lock.
  const cancellationLocked = isAuthorizationStatusTerminal(formData?.authorizationDesiredStatus);
  const cancellationLockedTooltip = cancellationLocked
    ? `LE has marked this authorization as ${formData?.authorizationDesiredStatus}. Resolve the case from the banner above instead.`
    : undefined;

  if (!formData) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-[#605e5c] mx-auto mb-4" />
          <p className="text-[#605e5c]">No case data available. Please start from Triage stage.</p>
        </Card>
      </div>
    );
  }

  // --- Dirty State Tracking Effects ---

  // Set saved snapshot when formData is first available or case changes
  useEffect(() => {
    if (formData) {
      const timer = setTimeout(() => {
        savedFormSnapshotRef.current = JSON.stringify(formData);
        setIsFormDirty(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData?.caseId]);

  // Track dirty state by comparing current form data to last saved snapshot
  useEffect(() => {
    if (!savedFormSnapshotRef.current || !formData) return;
    const currentSnapshot = JSON.stringify(formData);
    const dirty = currentSnapshot !== savedFormSnapshotRef.current;
    setIsFormDirty(dirty);
  }, [formData]);

  // Handle explicit save
  const handleManualSave = useCallback(() => {
    if (!isFormDirty || isManualSaving || !formData) return;

    setIsManualSaving(true);
    setTimeout(() => {
      savedFormSnapshotRef.current = JSON.stringify(formData);
      setIsFormDirty(false);
      setLastSavedTime(new Date());
      setIsManualSaving(false);
      toast.success("Changes saved successfully");
    }, 400);
  }, [isFormDirty, isManualSaving, formData]);

  // Navigation guard: intercept navigation when dirty
  const guardedNavigate = useCallback((navigateFn: (() => void) | undefined) => {
    if (!navigateFn) return;
    if (isFormDirty) {
      pendingNavigationRef.current = navigateFn;
      setShowUnsavedChangesDialog(true);
    } else {
      navigateFn();
    }
  }, [isFormDirty]);

  // Handle "Save & Continue" from unsaved changes dialog
  const handleSaveAndNavigate = useCallback(() => {
    setIsManualSaving(true);
    setTimeout(() => {
      if (formData) {
        savedFormSnapshotRef.current = JSON.stringify(formData);
      }
      setIsFormDirty(false);
      setLastSavedTime(new Date());
      setIsManualSaving(false);
      setShowUnsavedChangesDialog(false);
      if (pendingNavigationRef.current) {
        pendingNavigationRef.current();
        pendingNavigationRef.current = null;
      }
    }, 400);
  }, [formData]);

  // Handle "Discard & Continue" from unsaved changes dialog
  const handleDiscardAndNavigate = useCallback(() => {
    setIsFormDirty(false);
    setShowUnsavedChangesDialog(false);
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    }
  }, []);

  // Browser tab close/refresh protection when dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFormDirty]);

  // Toggle identifier expansion
  const toggleIdentifier = (identifierId: string) => {
    setExpandedIdentifiers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(identifierId)) {
        newSet.delete(identifierId);
      } else {
        newSet.add(identifierId);
      }
      return newSet;
    });
  };

  // Calculate collection statistics
  const collectionStats = useMemo(() => {
    let totalCategories = 0;
    let notStarted = 0;
    let started = 0;
    let complete = 0;
    let noData = 0;
    let failed = 0;
    // Manual vs automated collection breakdown
    let manualTotal = 0;
    let manualComplete = 0;
    let manualPending = 0;
    let automatedTotal = 0;
    let automatedComplete = 0;

    formData.identifiers.forEach(identifier => {
      Object.entries(identifier.services).forEach(([serviceKey, service]: [string, ServiceWithResults]) => {
        iterateServiceCategories(service, (categoryKey, category: SubCategory) => {
          if (category.enabled) {
            const isManual = isManualCategory(serviceKey, categoryKey);
            totalCategories++;
            const status = category.collectionStatus || "Not Started";
            if (status === "Not Started") notStarted++;
            else if (status === "Started") started++;
            else if (status === "Complete") complete++;
            else if (status === "No Data") noData++;
            else if (status === "Failed") failed++;

            if (isManual) {
              manualTotal++;
              if (status === "Complete") manualComplete++;
              else if (status !== "No Data" && status !== "Failed") manualPending++;
            } else {
              automatedTotal++;
              if (status === "Complete" || status === "No Data" || status === "Failed") automatedComplete++;
            }
          }
        });
      });
    });

    return { totalCategories, notStarted, started, complete, noData, failed, manualTotal, manualComplete, manualPending, automatedTotal, automatedComplete };
  }, [formData]);

  // Format service name
  const formatServiceName = (serviceKey: string) => {
    return getServiceDisplayName(serviceKey);
  };
  // Jobs ready for publish (collection complete, not yet published).
  // EPOC-PR (preservation) cases never produce publishable jobs — the
  // pipeline collapses to Collection only — so the list short-circuits
  // to empty before the filter runs.
  const publishableJobs = useMemo(() => {
    if (isEpocPrCase(formData)) return [];
    return allPipelineJobs.filter(j =>
      j.collectionStatus === "Complete" &&
      (!j.publishStatus || j.publishStatus === "Not Started")
    );
  }, [allPipelineJobs, formData]);

  // Jobs ready for delivery (publish complete, not yet in delivery).
  // EPOC-PR cases never produce deliverable jobs for the same reason.
  const deliverableJobs = useMemo(() => {
    if (isEpocPrCase(formData)) return [];
    return allPipelineJobs.filter(j =>
      j.publishStatus === "Complete" &&
      (!j.deliveryStatus || j.deliveryStatus === "Not Started")
    );
  }, [allPipelineJobs, formData]);

  // Jobs that have been delivered (delivery complete OR acknowledged)
  const deliveredJobs = useMemo(() => {
    return allPipelineJobs.filter(j =>
      j.deliveryStatus === "Complete" || j.deliveryStatus === "DeliveryAcknowledged"
    );
  }, [allPipelineJobs]);

  // Jobs that hit a WISP delivery error — drives the Retry path that
  // re-opens the same DeliveryReview dialog under retry mode.
  // eEvidence-only; non-eEvidence cases never produce Failed delivery
  // jobs and this list stays empty.
  const retryableJobs = useMemo(() => {
    if (!isEEvidenceDelivery(formData ?? null)) return [];
    return allPipelineJobs.filter(j => j.deliveryStatus === "Failed");
  }, [allPipelineJobs, formData]);

  // Jobs that hit a publish error. Same shape as retryableJobs but for
  // the Package stage — drives Retry Package both per-row and bulk via
  // the same PublishReview dialog under retry mode. EPOC-PR cases never
  // produce publish jobs at all so the list stays empty there.
  const retryablePublishJobs = useMemo(() => {
    if (isEpocPrCase(formData)) return [];
    return allPipelineJobs.filter(j => j.publishStatus === "Failed");
  }, [allPipelineJobs, formData]);

  // Jobs that hit a collection error. The Start Collection confirm
  // dialog reopens in retry mode against this list — same dialog, just
  // flips Failed → Started instead of Not Started → Started.
  const retryableCollectionJobs = useMemo(() => {
    return allPipelineJobs.filter(j => j.collectionStatus === "Failed");
  }, [allPipelineJobs]);

  /** Open the Review dialog in Retry mode, pre-selecting the supplied
   *  jobKeys (or all failed jobs when no subset is passed). Mirrors the
   *  "Submit to Delivery" UX so the RS gets the same familiar pattern
   *  for both flows. */
  const openDeliveryReviewForRetry = React.useCallback(
    (jobKeys?: string[]) => {
      const keys = jobKeys && jobKeys.length > 0
        ? jobKeys
        : retryableJobs.map(j => j.jobKey);
      setDeliveryReviewMode("retry");
      setSelectedJobsForDelivery(new Set(keys));
      setShowDeliveryReview(true);
    },
    [retryableJobs],
  );

  /** Mirror that opens the dialog in submit mode (existing behavior).
   *  Used by the standard "Deliver Selected / Deliver All" CTAs. */
  const openDeliveryReviewForSubmit = React.useCallback(() => {
    setDeliveryReviewMode("submit");
    setShowDeliveryReview(true);
  }, []);

  /** Open the Publish Review dialog in Retry mode, pre-selecting the
   *  supplied jobKeys (or all publish-failed jobs when no subset is
   *  passed). Mirrors openDeliveryReviewForRetry so per-row Retry on a
   *  publish-failed row routes to the same familiar review surface. */
  const openPublishReviewForRetry = React.useCallback(
    (jobKeys?: string[]) => {
      const keys = jobKeys && jobKeys.length > 0
        ? jobKeys
        : retryablePublishJobs.map(j => j.jobKey);
      setPublishReviewMode("retry");
      setSelectedJobsForPublish(new Set(keys));
      setShowPublishReview(true);
    },
    [retryablePublishJobs],
  );

  /** Open the StartCollection confirm dialog in retry mode. The single
   *  dialog instance branches on collectionStartMode for copy + handler
   *  routing — same UX shape as the publish/delivery dialogs above. */
  const openCollectionRetryConfirm = React.useCallback(() => {
    setCollectionStartMode("retry");
    setShowStartCollectionDialog(true);
  }, []);

  // Handler for manual collection status updates
  const handleManualStatusUpdate = (
    identifierId: string,
    serviceKey: string,
    updates: {
      dataLocation: string;
      collectionNotes: string;
      categoryUpdates: Record<string, { collectionStatus: string; lastUpdatedBy: string; lastUpdatedAt: Date }>;
    }
  ) => {
    if (!setSharedFormData || !formData) return;

    const updatedFormData = { ...formData };
    updatedFormData.identifiers = updatedFormData.identifiers.map(identifier => {
      if (identifier.id !== identifierId) return identifier;

      const updatedServices = { ...identifier.services };
      const service = updatedServices[serviceKey as keyof typeof updatedServices] as any;
      
      if (service) {
        let updatedGroups = { ...service.categoryGroups };

        // Update each item that has changes — categoryKey is "groupKey:itemKey"
        Object.entries(updates.categoryUpdates).forEach(([categoryKey, categoryUpdate]) => {
          updatedGroups = applyItemUpdate(updatedGroups, categoryKey, {
            collectionStatus: categoryUpdate.collectionStatus,
            lastUpdatedBy: categoryUpdate.lastUpdatedBy,
            lastUpdatedAt: categoryUpdate.lastUpdatedAt,
          });
        });

        updatedServices[serviceKey as keyof typeof updatedServices] = {
          ...service,
          categoryGroups: updatedGroups,
          dataLocation: updates.dataLocation,
          collectionNotes: updates.collectionNotes,
        } as any;
      }
      
      return {
        ...identifier,
        services: updatedServices,
      };
    });

    setSharedFormData(updatedFormData);
  };

  // Phase 2: Inline manual entry helpers
  const toggleInlineManualEntry = (entryKey: string, category: SubCategory, service: ServiceWithResults) => {
    setExpandedManualEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryKey)) {
        next.delete(entryKey);
      } else {
        next.add(entryKey);
        // Initialize form values from current data
        if (!inlineManualStatuses[entryKey]) {
          setInlineManualStatuses(prev2 => ({
            ...prev2,
            [entryKey]: category.collectionStatus || "Not Started"
          }));
        }
        if (inlineManualLocations[entryKey] === undefined) {
          setInlineManualLocations(prev2 => ({
            ...prev2,
            [entryKey]: service.dataLocation || ""
          }));
        }
        if (inlineManualNotes[entryKey] === undefined) {
          setInlineManualNotes(prev2 => ({
            ...prev2,
            [entryKey]: service.collectionNotes || ""
          }));
        }
      }
      return next;
    });
  };

  const handleInlineManualSave = (entryKey: string, identifierId: string, serviceKey: string, categoryKey: string) => {
    if (cancellationLocked) {
      toast.error(`Case is ${formData?.authorizationDesiredStatus} by LE`, {
        description: "Resolve the case from the banner instead of saving collection data.",
      });
      return;
    }

    const status = inlineManualStatuses[entryKey] || "Not Started";
    const location = inlineManualLocations[entryKey] || "";
    const notes = inlineManualNotes[entryKey] || "";

    if (status === "Complete" && !location.trim()) {
      toast.error("Content boundary is required when marking as Complete");
      return;
    }

    setInlineSaving(prev => new Set(prev).add(entryKey));

    setTimeout(() => {
      handleManualStatusUpdate(identifierId, serviceKey, {
        dataLocation: location,
        collectionNotes: notes,
        categoryUpdates: {
          [categoryKey]: {
            collectionStatus: status,
            lastUpdatedBy: "Current User",
            lastUpdatedAt: new Date(),
          }
        }
      });

      setInlineSaving(prev => {
        const next = new Set(prev);
        next.delete(entryKey);
        return next;
      });
      setExpandedManualEntries(prev => {
        const next = new Set(prev);
        next.delete(entryKey);
        return next;
      });
      // Clear cached form values so they re-init from fresh data next time
      setInlineManualStatuses(prev => {
        const next = { ...prev };
        delete next[entryKey];
        return next;
      });
      setInlineManualLocations(prev => {
        const next = { ...prev };
        delete next[entryKey];
        return next;
      });
      setInlineManualNotes(prev => {
        const next = { ...prev };
        delete next[entryKey];
        return next;
      });

      toast.success(`Manual collection status updated to "${status}"`);
    }, 400);
  };

  // Separate manual and automated jobs
  const { manualJobs, automatedJobs } = useMemo(() => {
    const manualByIdentifierService: Map<string, {
      identifierId: string;
      identifierValue: string;
      identifierType: string;
      serviceKey: string;
      serviceName: string;
      categories: Array<{
        categoryKey: string;
        categoryName: string;
        jobId: string;
        collectionStatus: string;
        publishStatus: string;
        deliveryStatus: string;
        publishJobId?: string;
        deliveryJobId?: string;
        lastUpdatedBy?: string;
        lastUpdatedAt?: Date;
      }>;
      service: ServiceWithResults;
      identifier: AccountIdentifier;
    }> = new Map();
    
    const automated: Array<{
      identifier: AccountIdentifier;
    }> = [];

    formData.identifiers.forEach(identifier => {
      let hasManualJobs = false;
      let hasAutomatedJobs = false;

      Object.entries(identifier.services).forEach(([serviceKey, service]: [string, ServiceWithResults]) => {
        iterateServiceCategories(service, (categoryKey, category: SubCategory) => {
          if (category.enabled) {
            if (isManualCategory(serviceKey, categoryKey)) {
              hasManualJobs = true;
              const groupKey = `${identifier.id}-${serviceKey}`;

              if (!manualByIdentifierService.has(groupKey)) {
                manualByIdentifierService.set(groupKey, {
                  identifierId: identifier.id,
                  identifierValue: identifier.value,
                  identifierType: identifier.type,
                  serviceKey,
                  serviceName: getServiceName(serviceKey),
                  categories: [],
                  service,
                  identifier,
                });
              }

              const group = manualByIdentifierService.get(groupKey)!;
              group.categories.push({
                categoryKey,
                categoryName: formatCategoryName(categoryKey),
                jobId: category.jobId || category.taskId || "Pending",
                collectionStatus: category.collectionStatus || "Not Started",
                publishStatus: category.publishStatus || "Not Started",
                deliveryStatus: category.deliveryStatus || "Not Started",
                publishJobId: category.publishJobId,
                deliveryJobId: category.deliveryJobId,
                lastUpdatedBy: category.lastUpdatedBy,
                lastUpdatedAt: category.lastUpdatedAt,
                startDate: category.startDate,
                endDate: category.endDate,
                createdOn: category.createdOn,
              });
            } else {
              hasAutomatedJobs = true;
            }
          }
        });
      });

      if (hasAutomatedJobs) {
        automated.push({ identifier });
      }
    });

    return { manualJobs: Array.from(manualByIdentifierService.values()), automatedJobs: automated };
  }, [formData]);

  // Identifier cards default to collapsed on mount. `expandedIdentifiers`
  // is initialised to an empty set above; per-card toggles + the
  // "Expand all / Collapse all" header control still let the RS expand.

  // Toggle expand/collapse all identifiers
  const toggleExpandAll = () => {
    const allIds = readinessFilter === 'by-identifier'
      ? new Set(formData.identifiers.map(id => id.id))
      : new Set(automatedJobs.map(job => job.identifier.id));
    if (expandedIdentifiers.size === allIds.size) {
      setExpandedIdentifiers(new Set());
    } else {
      setExpandedIdentifiers(allIds);
    }
  };

  // Per-identifier readiness computation
  interface IdentifierReadiness {
    state: 'collecting' | 'ready-to-publish' | 'mixed' | 'publishing' | 'ready-to-deliver' | 'delivering' | 'complete';
    totalJobs: number;
    collectionComplete: number;
    collectionInProgress: number;
    collectionNotStarted: number;
    collectionNoData: number;
    collectionFailed: number;
    publishableCount: number;
    alreadySubmitted: number;
    publishComplete: number;
    publishInProgress: number;
    /** Counts BOTH "Complete" (wire-delivered) and "DeliveryAcknowledged"
     *  (WISP "Received" callback landed). For non-eEvidence cases only
     *  the Complete path increments since they never get the
     *  acknowledgement callback. */
    deliveryComplete: number;
    deliveryInProgress: number;
    /** eEvidence-only WISP error count. Drives the Delivery container's
     *  inline error mini-banner + the dashboard breakdown chip. Zero
     *  for non-eEvidence cases. */
    deliveryFailed: number;
    // Manual collection awareness
    manualTotal: number;
    manualComplete: number;
    manualPending: number; // Not Started + In Progress
    automatedTotal: number;
    automatedComplete: number;
    hasManualPending: boolean; // true if any manual categories are not yet Complete/NoData/Failed
    allAutomatedDone: boolean; // true if all automated collection is terminal
  }

  const identifierReadiness = useMemo(() => {
    const readinessMap = new Map<string, IdentifierReadiness>();

    formData.identifiers.forEach(identifier => {
      let totalJobs = 0;
      let collectionComplete = 0;
      let collectionInProgress = 0;
      let collectionNotStarted = 0;
      let collectionNoData = 0;
      let collectionFailed = 0;
      let publishableCount = 0;
      let alreadySubmitted = 0;
      let publishComplete = 0;
      let publishInProgress = 0;
      let deliveryComplete = 0;
      let deliveryInProgress = 0;
      let deliveryFailed = 0;
      // Manual vs automated tracking
      let manualTotal = 0;
      let manualComplete = 0;
      let manualPending = 0;
      let automatedTotal = 0;
      let automatedComplete = 0;

      Object.entries(identifier.services).forEach(([serviceKey, service]: [string, any]) => {
        const showConsumer = service.includeConsumerAccount !== false;
        const showEnterprise = service.includeEnterpriseAccount === true;

        iterateServiceCategories(service, (categoryKey, category: any) => {
          if (category.enabled) {
            const isManual = isManualCategory(serviceKey, categoryKey);
            const multiplier = (showConsumer && showEnterprise && !isManual) ? 2 : 1;
            totalJobs += multiplier;

            // Track manual vs automated
            if (isManual) {
              manualTotal += multiplier;
              const mStatus = category.collectionStatus || "Not Started";
              if (mStatus === "Complete") {
                manualComplete += multiplier;
              } else if (mStatus !== "No Data" && mStatus !== "Failed") {
                manualPending += multiplier;
              }
            } else {
              automatedTotal += multiplier;
              const aStatus = category.collectionStatus || "Not Started";
              if (aStatus === "Complete" || aStatus === "No Data" || aStatus === "Failed") {
                automatedComplete += multiplier;
              }
            }
            const status = category.collectionStatus || "Not Started";
            const pubStatus = category.publishStatus || "Not Started";
            const delStatus = category.deliveryStatus || "Not Started";

            if (status === "Complete") {
              collectionComplete += multiplier;
              if (pubStatus === "Not Started") {
                publishableCount += multiplier;
              } else {
                alreadySubmitted += multiplier;
                if (pubStatus === "Complete") {
                  publishComplete += multiplier;
                  // `DeliveryAcknowledged` (WISP "Received" callback) is
                  // the stronger positive terminal — count it as done
                  // alongside the wire-Complete state.
                  if (delStatus === "Complete" || delStatus === "DeliveryAcknowledged") {
                    deliveryComplete += multiplier;
                  } else if (delStatus === "Failed") {
                    deliveryFailed += multiplier;
                  } else if (delStatus === "Started") {
                    deliveryInProgress += multiplier;
                  }
                } else if (pubStatus === "Started") {
                  publishInProgress += multiplier;
                }
              }
            } else if (status === "Started") {
              collectionInProgress += multiplier;
            } else if (status === "No Data") {
              collectionNoData += multiplier;
            } else if (status === "Failed") {
              collectionFailed += multiplier;
            } else {
              collectionNotStarted += multiplier;
            }

            // Count additional jobs
            if (category.additionalJobs && category.additionalJobs.length > 0) {
              category.additionalJobs.forEach((addJob: any) => {
                totalJobs += multiplier;
                if (!isManual) automatedTotal += multiplier;
                else manualTotal += multiplier;

                const addColStatus = addJob.collectionStatus || "Not Started";
                const addPubStatus = addJob.publishStatus || "Not Started";
                const addDelStatus = addJob.deliveryStatus || "Not Started";

                if (addColStatus === "Complete") {
                  collectionComplete += multiplier;
                  if (!isManual) automatedComplete += multiplier;
                  else manualComplete += multiplier;
                  if (addPubStatus === "Not Started") {
                    publishableCount += multiplier;
                  } else {
                    alreadySubmitted += multiplier;
                    if (addPubStatus === "Complete") {
                      publishComplete += multiplier;
                      if (addDelStatus === "Complete" || addDelStatus === "DeliveryAcknowledged") deliveryComplete += multiplier;
                      else if (addDelStatus === "Failed") deliveryFailed += multiplier;
                      else if (addDelStatus === "Started") deliveryInProgress += multiplier;
                    } else if (addPubStatus === "Started") publishInProgress += multiplier;
                  }
                } else if (addColStatus === "Started") {
                  collectionInProgress += multiplier;
                } else if (addColStatus === "No Data") {
                  collectionNoData += multiplier;
                } else if (addColStatus === "Failed") {
                  collectionFailed += multiplier;
                } else {
                  collectionNotStarted += multiplier;
                }
              });
            }
          }
        });
      });

      // Determine readiness state across full pipeline
      let state: IdentifierReadiness['state'];
      const terminalJobs = collectionComplete + collectionNoData + collectionFailed;
      const allCollectionTerminal = terminalJobs === totalJobs && totalJobs > 0;

      if (!allCollectionTerminal && alreadySubmitted > 0) {
        // Some collection still running, but some jobs already submitted for publish/delivery
        // Treat as pipeline state so they surface in "In Pipeline" or "Needs Action"
        if (publishComplete > 0 && deliveryInProgress > 0) {
          state = 'delivering';
        } else if (publishComplete > 0 && deliveryComplete === 0 && deliveryInProgress === 0) {
          state = 'ready-to-deliver';
        } else if (alreadySubmitted > 0 && publishComplete < alreadySubmitted) {
          state = 'publishing';
        } else {
          state = 'mixed';
        }
      } else if (!allCollectionTerminal) {
        state = 'collecting';
      } else if (publishableCount > 0 && alreadySubmitted === 0) {
        state = 'ready-to-publish';
      } else if (publishableCount > 0 && alreadySubmitted > 0) {
        state = 'mixed';
      } else if (collectionComplete === 0) {
        // All no-data or failed, nothing to publish/deliver
        state = 'complete';
      } else if (publishComplete < alreadySubmitted) {
        // Some publish still in progress
        state = 'publishing';
      } else if (deliveryInProgress === 0 && deliveryComplete === 0 && publishComplete > 0) {
        // All published, no delivery started yet — ready for delivery selection
        state = 'ready-to-deliver';
      } else if (deliveryComplete < publishComplete) {
        // Delivery in progress or partially delivered
        state = 'delivering';
      } else {
        // All delivered
        state = 'complete';
      }

      readinessMap.set(identifier.id, {
        state,
        totalJobs,
        collectionComplete,
        collectionInProgress,
        collectionNotStarted,
        collectionNoData,
        collectionFailed,
        publishableCount,
        alreadySubmitted,
        publishComplete,
        publishInProgress,
        deliveryComplete,
        deliveryInProgress,
        deliveryFailed,
        manualTotal,
        manualComplete,
        manualPending,
        automatedTotal,
        automatedComplete,
        hasManualPending: manualPending > 0,
        allAutomatedDone: automatedTotal > 0 ? automatedComplete === automatedTotal : true,
      });
    });

    return readinessMap;
  }, [formData]);

  // EPOC-PR (preservation request) — single-stage pipeline. When true,
  // the Collection-page Package + Delivery stages, action buttons, and
  // identifier-status badges all collapse away so the UX matches the
  // "preserve only, no production" flow.
  const isEpocPr = isEpocPrCase(formData);

  // Pipeline-level aggregate stats
  const pipelineStats = useMemo(() => {
    let totalJobs = 0;
    let collectionDone = 0;
    let collectionFailed = 0;
    let publishSubmitted = 0;
    let publishDone = 0;
    let deliveryStarted = 0;
    let deliveryDone = 0;
    let deliveryFailed = 0;

    let identifiersCollecting = 0;
    let identifiersReadyToPublish = 0;
    let identifiersPublishing = 0;
    let identifiersReadyToDeliver = 0;
    let identifiersDelivering = 0;
    let identifiersMixed = 0;
    let identifiersComplete = 0;
    let identifiersWithFailures = 0;
    // Manual collection aggregate tracking
    let totalManualJobs = 0;
    let manualCollectionDone = 0;
    let manualCollectionPending = 0;
    let totalAutomatedJobs = 0;
    let automatedCollectionDone = 0;
    let identifiersWithManualPending = 0;
    let identifiersManualBlockedOnly = 0; // automated done, manual pending

    identifierReadiness.forEach((readiness) => {
      totalJobs += readiness.totalJobs;
      collectionDone += readiness.collectionComplete + readiness.collectionNoData;
      collectionFailed += readiness.collectionFailed;
      publishSubmitted += readiness.alreadySubmitted;
      publishDone += readiness.publishComplete;
      deliveryStarted += readiness.deliveryInProgress;
      deliveryDone += readiness.deliveryComplete;
      deliveryFailed += readiness.deliveryFailed;
      // Manual aggregation
      totalManualJobs += readiness.manualTotal;
      manualCollectionDone += readiness.manualComplete;
      manualCollectionPending += readiness.manualPending;
      totalAutomatedJobs += readiness.automatedTotal;
      automatedCollectionDone += readiness.automatedComplete;
      if (readiness.hasManualPending) identifiersWithManualPending++;
      if (readiness.hasManualPending && readiness.allAutomatedDone) identifiersManualBlockedOnly++;

      switch (readiness.state) {
        case 'collecting': identifiersCollecting++; break;
        case 'ready-to-publish': identifiersReadyToPublish++; break;
        case 'publishing': identifiersPublishing++; break;
        case 'ready-to-deliver': identifiersReadyToDeliver++; break;
        case 'delivering': identifiersDelivering++; break;
        case 'mixed': identifiersMixed++; break;
        case 'complete': identifiersComplete++; break;
      }
      if (readiness.collectionFailed > 0) identifiersWithFailures++;
    });

    // Include manual-blocked identifiers in "needs action" count
    const needsActionCount = identifiersReadyToPublish + identifiersMixed + identifiersReadyToDeliver + identifiersWithFailures + identifiersManualBlockedOnly;
    const inPipelineCount = identifiersPublishing + identifiersDelivering;

    return {
      totalJobs,
      collectionDone,
      collectionFailed,
      collectionInProgress: totalJobs - collectionDone - collectionFailed,
      publishSubmitted,
      publishDone,
      publishInProgress: publishSubmitted - publishDone,
      deliveryStarted,
      deliveryDone,
      deliveryFailed,
      identifiersCollecting,
      identifiersReadyToPublish,
      identifiersPublishing,
      identifiersReadyToDeliver,
      identifiersDelivering,
      identifiersMixed,
      identifiersComplete,
      identifiersWithFailures,
      needsActionCount,
      // Manual collection awareness stats
      totalManualJobs,
      manualCollectionDone,
      manualCollectionPending,
      totalAutomatedJobs,
      automatedCollectionDone,
      identifiersWithManualPending,
      identifiersManualBlockedOnly,
      inPipelineCount,
      totalIdentifiers: identifierReadiness.size,
    };
  }, [identifierReadiness]);

  // Compute resolve eligibility: delivered, all-no-data, or agency withdrawal
  const resolveEligibility = useMemo(() => {
    const hasDeliveries = pipelineStats.deliveryDone > 0;
    const allNoData = pipelineStats.totalJobs > 0 &&
      pipelineStats.identifiersComplete === pipelineStats.totalIdentifiers &&
      pipelineStats.deliveryDone === 0;
    const withdrawalRequested = formData.caseStage === "Withdrawn";

    const canResolve = hasDeliveries || allNoData || withdrawalRequested;

    let reason = "";
    if (withdrawalRequested) {
      reason = "Agency has submitted a withdrawal request — this case can be resolved";
    } else if (allNoData) {
      reason = "All data categories returned No Data — this case can be resolved";
    } else if (hasDeliveries && pipelineStats.identifiersComplete === pipelineStats.totalIdentifiers) {
      reason = "All pipeline stages finished — you can now resolve this case";
    } else if (hasDeliveries) {
      reason = `${pipelineStats.deliveryDone} ${pipelineStats.deliveryDone === 1 ? 'job has' : 'jobs have'} been delivered — resolve when ready`;
    }

    return { canResolve, hasDeliveries, allNoData, withdrawalRequested, reason };
  }, [pipelineStats, formData.caseStage]);

  // Sort automated jobs by readiness state: ready-to-publish first, then mixed, collecting, submitted
  const sortedAutomatedJobs = useMemo(() => {
    const stateOrder: Record<string, number> = {
      'ready-to-publish': 0,
      'ready-to-deliver': 1,
      'mixed': 2,
      'collecting': 3,
      'publishing': 4,
      'delivering': 5,
      'complete': 6,
    };

    return [...automatedJobs].sort((a, b) => {
      const aReadiness = identifierReadiness.get(a.identifier.id);
      const bReadiness = identifierReadiness.get(b.identifier.id);
      const aOrder = stateOrder[aReadiness?.state || 'collecting'] ?? 99;
      const bOrder = stateOrder[bReadiness?.state || 'collecting'] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Within collecting, sort by those with failures first
      if (aReadiness?.state === 'collecting' && bReadiness?.state === 'collecting') {
        return (bReadiness?.collectionFailed || 0) - (aReadiness?.collectionFailed || 0);
      }
      return 0;
    });
  }, [automatedJobs, identifierReadiness]);

  // Filter automated jobs by readiness tab
  const filteredAutomatedJobs = useMemo(() => {
    if (readinessFilter === 'all') return sortedAutomatedJobs;
    return sortedAutomatedJobs.filter(({ identifier }) => {
      const readiness = identifierReadiness.get(identifier.id);
      if (!readiness) return false;
      switch (readinessFilter) {
        case 'needs-action':
          return readiness.state === 'ready-to-publish' || readiness.state === 'ready-to-deliver' || readiness.state === 'mixed' || readiness.collectionFailed > 0 || (readiness.hasManualPending && readiness.allAutomatedDone);
        case 'by-identifier':
          return true; // By-identifier view has its own rendering; this shouldn't be reached
        case 'complete':
          return readiness.state === 'complete';
        default:
          return true;
      }
    });
  }, [sortedAutomatedJobs, readinessFilter, identifierReadiness]);

  // Toggle job selection for publish
  const toggleJobForPublish = (jobKey: string) => {
    setSelectedJobsForPublish(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobKey)) {
        newSet.delete(jobKey);
      } else {
        newSet.add(jobKey);
      }
      return newSet;
    });
  };

  // Toggle job selection for delivery
  const toggleJobForDelivery = (jobKey: string) => {
    setSelectedJobsForDelivery(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobKey)) {
        newSet.delete(jobKey);
      } else {
        newSet.add(jobKey);
      }
      return newSet;
    });
  };

  // Bug #2 fix — explicit "Start Collection" action. The previous
  // implementation auto-advanced NotStarted → Started on every Refresh
  // tick, which the RS could read as jobs auto-progressing without
  // their action. Now the RS must explicitly start collection; Refresh
  // only ticks already-started jobs toward Complete (simulating the
  // IA's backend processing).
  //
  // Flips every NotStarted enabled job to Started + generates a fresh
  // jobId. Confirmation is shown via the StartCollection dialog before
  // the user lands here.
  const handleStartCollectionAll = useCallback(() => {
    if (!setSharedFormData || !formData) return;
    let started = 0;
    const updatedFormData = { ...formData };
    updatedFormData.identifiers = updatedFormData.identifiers.map((identifier) => {
      const updatedServices = { ...identifier.services };
      Object.entries(updatedServices).forEach(([serviceKey, service]: [string, any]) => {
        let updatedGroups = { ...service.categoryGroups };
        iterateServiceCategories(service, (categoryKey, category: any) => {
          if (!category.enabled) return;
          if (category.collectionStatus && category.collectionStatus !== "Not Started") return;
          const collectionJobId = category.jobId ?? generateJobId();
          updatedGroups = applyItemUpdate(updatedGroups, categoryKey, {
            collectionStatus: "Started",
            jobId: collectionJobId,
            collectionStatusUpdatedAt: new Date().toISOString(),
          });
          started++;
        });
        updatedServices[serviceKey] = { ...service, categoryGroups: updatedGroups };
      });
      return { ...identifier, services: updatedServices };
    });
    if (started === 0) {
      toast.info("No queued collection jobs", {
        description: "All enabled data-category jobs have already been started.",
      });
      return;
    }
    setSharedFormData(updatedFormData);
    toast.success(
      `${started} collection ${started === 1 ? "job" : "jobs"} started`,
      {
        description:
          "Click Refresh to advance jobs as the IA's backend processes them.",
      },
    );
  }, [formData, setSharedFormData]);

  // Bulk retry every Failed collection job. Confirmation comes from the
  // StartCollection dialog reopened in retry mode (collectionStartMode).
  const handleRetryCollectionAll = useCallback(() => {
    if (!setSharedFormData || !formData) return;
    let retried = 0;
    const updatedFormData = { ...formData };
    updatedFormData.identifiers = updatedFormData.identifiers.map((identifier) => {
      const updatedServices = { ...identifier.services };
      Object.entries(updatedServices).forEach(([serviceKey, service]: [string, any]) => {
        let updatedGroups = { ...service.categoryGroups };
        iterateServiceCategories(service, (categoryKey, category: any) => {
          if (!category.enabled) return;
          if (category.collectionStatus !== "Failed") return;
          updatedGroups = applyItemUpdate(updatedGroups, categoryKey, {
            collectionStatus: "Started",
            collectionError: undefined,
            collectionStatusUpdatedAt: new Date().toISOString(),
          });
          retried++;
        });
        updatedServices[serviceKey] = { ...service, categoryGroups: updatedGroups };
      });
      return { ...identifier, services: updatedServices };
    });
    if (retried === 0) {
      toast.info("No failed collection jobs to retry", {
        description: "All collection jobs are either started, complete, or queued.",
      });
      return;
    }
    const now = new Date();
    updatedFormData.escalationAuditEvents = [
      ...(updatedFormData.escalationAuditEvents ?? []),
      {
        id: `audit-retry-collection-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        kind: "Resumed",
        actor: CURRENT_USER,
        actorRole: "ResponseSpecialist",
        performedAt: now,
        note: `Retried collection on ${retried} job${retried === 1 ? "" : "s"} after collection error.`,
      },
    ];
    setSharedFormData(updatedFormData);
    toast.success(
      `Retry queued for ${retried} collection ${retried === 1 ? "job" : "jobs"}`,
      {
        description: "Status flipped to Started. Click Refresh to advance the jobs.",
      },
    );
    setReadinessFilter('by-identifier');
  }, [formData, setSharedFormData, setReadinessFilter]);

  // Retry a single Failed collection job (per-row action). Same patch
  // as handleRetryCollectionAll but scoped to one (identifier, service,
  // category) tuple — no confirm needed for single-row.
  const handleRetryCollectionOne = useCallback(
    (identifierId: string, serviceKey: string, categoryKey: string) => {
      if (!setSharedFormData || !formData) return;
      const updatedFormData = { ...formData };
      updatedFormData.identifiers = updatedFormData.identifiers.map((identifier) => {
        if (identifier.id !== identifierId) return identifier;
        const updatedServices = { ...identifier.services };
        const service = updatedServices[serviceKey];
        if (!service) return identifier;
        const updatedGroups = applyItemUpdate(service.categoryGroups, categoryKey, {
          collectionStatus: "Started",
          collectionError: undefined,
          collectionStatusUpdatedAt: new Date().toISOString(),
        });
        updatedServices[serviceKey] = { ...service, categoryGroups: updatedGroups };
        return { ...identifier, services: updatedServices };
      });
      setSharedFormData(updatedFormData);
      toast.success("Collection retry queued", {
        description: "Status flipped to Started. Click Refresh to advance the job.",
      });
    },
    [formData, setSharedFormData],
  );

  // Handle publish selected jobs. Mirrors handleDeliverySelected — the
  // same dialog routes both Submit (Not Started → Started) and Retry
  // (Failed → Started + clears publishError) through one handler.
  const handlePublishSelected = () => {
    const isRetry = publishReviewMode === "retry";
    if (selectedJobsForPublish.size === 0) {
      toast.error("No jobs selected", {
        description: isRetry
          ? "Please select at least one failed package job to retry."
          : "Please select at least one completed collection job to submit for publishing",
      });
      return;
    }

    let jobCount = 0;

    if (setSharedFormData && formData) {
      const updatedFormData = { ...formData };

      updatedFormData.identifiers = updatedFormData.identifiers.map(identifier => {
        const updatedServices = { ...identifier.services };
        Object.entries(updatedServices).forEach(([serviceKey, service]: [string, any]) => {
          let updatedGroups = { ...service.categoryGroups };
          const showConsumer = service.includeConsumerAccount !== false;
          const showEnterprise = service.includeEnterpriseAccount === true;
          const accountTypes: string[] = [];
          if (showConsumer) accountTypes.push('consumer');
          if (showEnterprise) accountTypes.push('enterprise');
          if (accountTypes.length === 0) accountTypes.push('consumer');

          iterateServiceCategories(service, (categoryKey, category: any) => {
            if (!category.enabled || category.collectionStatus !== "Complete") return;
            // Submit mode acts on Not Started jobs; retry mode acts on
            // Failed jobs. Anything else is skipped.
            if (isRetry) {
              if (category.publishStatus !== "Failed") return;
            } else {
              if (category.publishStatus && category.publishStatus !== "Not Started") return;
            }

            const isSelected = accountTypes.some(at =>
              selectedJobsForPublish.has(getJobKey(identifier.id, serviceKey, categoryKey, at))
            );

            if (isSelected) {
              if (isRetry) {
                updatedGroups = applyItemUpdate(updatedGroups, categoryKey, {
                  publishStatus: "Started",
                  publishError: undefined,
                  publishStatusUpdatedAt: new Date().toISOString(),
                });
              } else {
                const publishJobId = `PUB-${generateJobId()}`;
                updatedGroups = applyItemUpdate(updatedGroups, categoryKey, {
                  publishStatus: "Started",
                  publishJobId,
                  publishStatusUpdatedAt: new Date().toISOString(),
                });
              }
              jobCount++;
            }
          });
          updatedServices[serviceKey] = { ...service, categoryGroups: updatedGroups };
        });

        return { ...identifier, services: updatedServices };
      });

      // Audit-trail event for the retry path mirrors the delivery-retry
      // handler so operations have a single source for who retried what.
      if (isRetry && jobCount > 0) {
        const now = new Date();
        updatedFormData.escalationAuditEvents = [
          ...(updatedFormData.escalationAuditEvents ?? []),
          {
            id: `audit-retry-publish-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            kind: "Resumed",
            actor: CURRENT_USER,
            actorRole: "ResponseSpecialist",
            performedAt: now,
            note: `Retried package on ${jobCount} job${jobCount === 1 ? "" : "s"} after publish error.`,
          },
        ];
      }

      setSharedFormData(updatedFormData);
    }

    const sourceList = isRetry ? retryablePublishJobs : publishableJobs;
    const uniqueIdentifiers = new Set(
      sourceList.filter(j => selectedJobsForPublish.has(j.jobKey)).map(j => j.identifierId)
    );

    if (isRetry) {
      toast.success(
        `Retry queued for ${jobCount} package ${jobCount === 1 ? 'job' : 'jobs'} across ${uniqueIdentifiers.size} ${uniqueIdentifiers.size === 1 ? 'identifier' : 'identifiers'}`,
        {
          description: "Status flipped to Started. Next pipeline refresh will surface the new packaging outcome.",
        },
      );
    } else {
      toast.success(`Preparing ${jobCount} ${jobCount === 1 ? 'job' : 'jobs'} from ${uniqueIdentifiers.size} ${uniqueIdentifiers.size === 1 ? 'identifier' : 'identifiers'}`, {
        description: "Switched to By Identifier view — package jobs started",
      });
    }

    setSelectedJobsForPublish(new Set());
    setPublishReviewMode("submit");
    // Auto-switch to By Identifier tab so the user sees the newly publishing items
    setReadinessFilter('by-identifier');
  };

  // Handle delivery selected jobs.
  // For eEvidence cases, this is the SP-side `POST /eevidence/outcome`
  // push to WISP (the outbound delivery). The IA acknowledges via the
  // separate `POST /eevidence/deliverystatus` callback handled in
  // `handleRefreshStatus` (DeliveryAcknowledged transition).
  const handleDeliverySelected = () => {
    if (selectedJobsForDelivery.size === 0) {
      toast.error("No jobs selected", {
        description:
          deliveryReviewMode === "retry"
            ? "Please select at least one failed delivery to retry."
            : "Please select at least one completed publish job to submit for delivery",
      });
      return;
    }

    let jobCount = 0;
    // Retry mode flips Failed → Started + clears deliveryError. Submit
    // mode flips Not Started → Started. Branch the per-row predicate
    // and the field patch so a single iteration handles both.
    const isRetry = deliveryReviewMode === "retry";

    if (setSharedFormData && formData) {
      const updatedFormData = { ...formData };

      updatedFormData.identifiers = updatedFormData.identifiers.map(identifier => {
        const updatedServices = { ...identifier.services };
        Object.entries(updatedServices).forEach(([serviceKey, service]: [string, any]) => {
          let updatedGroups = { ...service.categoryGroups };
          const showConsumer = service.includeConsumerAccount !== false;
          const showEnterprise = service.includeEnterpriseAccount === true;
          const accountTypes: string[] = [];
          if (showConsumer) accountTypes.push('consumer');
          if (showEnterprise) accountTypes.push('enterprise');
          if (accountTypes.length === 0) accountTypes.push('consumer');

          iterateServiceCategories(service, (categoryKey, category: any) => {
            if (!category.enabled || category.publishStatus !== "Complete") return;
            // Submit mode only acts on Not Started jobs; retry mode only
            // acts on Failed jobs. Anything else is skipped.
            if (isRetry) {
              if (category.deliveryStatus !== "Failed") return;
            } else {
              if (category.deliveryStatus && category.deliveryStatus !== "Not Started") return;
            }

            const isSelected = accountTypes.some(at =>
              selectedJobsForDelivery.has(getJobKey(identifier.id, serviceKey, categoryKey, at))
            );

            if (isSelected) {
              if (isRetry) {
                updatedGroups = applyItemUpdate(updatedGroups, categoryKey, {
                  deliveryStatus: "Started",
                  deliveryError: undefined,
                  deliveryStatusUpdatedAt: new Date().toISOString(),
                });
              } else {
                const deliveryJobId = `DEL-${generateJobId()}`;
                updatedGroups = applyItemUpdate(updatedGroups, categoryKey, {
                  deliveryStatus: "Started",
                  deliveryJobId,
                  deliveryStatusUpdatedAt: new Date().toISOString(),
                });
              }
              jobCount++;
            }
          });
          updatedServices[serviceKey] = { ...service, categoryGroups: updatedGroups };
        });

        return { ...identifier, services: updatedServices };
      });

      // Append an audit event for the retry path so the operations
      // trail captures who retried and how many jobs.
      if (isRetry && jobCount > 0) {
        const now = new Date();
        updatedFormData.escalationAuditEvents = [
          ...(updatedFormData.escalationAuditEvents ?? []),
          {
            id: `audit-retry-delivery-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            kind: "Resumed",
            actor: CURRENT_USER,
            actorRole: "ResponseSpecialist",
            performedAt: now,
            note: `Retried delivery on ${jobCount} job${jobCount === 1 ? "" : "s"} after WISP error.`,
          },
        ];
      }

      setSharedFormData(updatedFormData);
    }

    // Source list switches per mode so the unique-identifier callout
    // reads the right pool.
    const sourceList = isRetry ? retryableJobs : deliverableJobs;
    const uniqueIdentifiers = new Set(
      sourceList.filter(j => selectedJobsForDelivery.has(j.jobKey)).map(j => j.identifierId)
    );

    if (isRetry) {
      toast.success(
        `Retry queued for ${jobCount} delivery ${jobCount === 1 ? 'job' : 'jobs'} across ${uniqueIdentifiers.size} ${uniqueIdentifiers.size === 1 ? 'identifier' : 'identifiers'}`,
        {
          description: "Status flipped to Started. Next pipeline refresh will surface the new WISP callback outcome.",
        },
      );
    } else {
      toast.success(`Delivery started for ${jobCount} ${jobCount === 1 ? 'job' : 'jobs'} from ${uniqueIdentifiers.size} ${uniqueIdentifiers.size === 1 ? 'identifier' : 'identifiers'}`, {
        description: `Switched to By Identifier view — data packages being packaged for ${formData.agency}`,
      });
    }

    setSelectedJobsForDelivery(new Set());
    // Reset mode for the next opener.
    setDeliveryReviewMode("submit");
    // Auto-switch to By Identifier tab so the user sees the newly delivering items
    setReadinessFilter('by-identifier');
  };

  // Handle case resolution — driven by the structured Closure Reason
  // picker in the shared ResolveCaseDialog. When `resolveDialogMode === "edit"`,
  // the prior resolution is pushed to `resolutionHistory[]` before being
  // overwritten so the case retains memory of every closure decision.
  const handleResolveCase = (reason: ResolutionReason, notes: string) => {
    if (!setSharedFormData || !formData) return;

    const targetStage = RESOLUTION_REASON_TO_STAGE[reason];
    const now = new Date();
    const actor = "Current User";
    const prevHistory = formData.resolutionHistory ?? [];
    const isEdit = resolveDialogMode === "edit" && !!formData.resolutionReason;
    const nextHistory = isEdit
      ? [
          {
            reason: formData.resolutionReason!,
            notes: formData.resolutionNotes,
            caseStageBefore: formData.caseStage,
            resolvedAt: formData.caseResolvedAt ?? now,
            resolvedBy: formData.caseResolvedBy ?? actor,
            supersededAt: now,
            supersededBy: actor,
            supersededReason: "Edit" as const,
          },
          ...prevHistory,
        ]
      : prevHistory;

    const updatedFormData: FormData = {
      ...formData,
      caseStage: targetStage,
      resolutionReason: reason,
      resolutionNotes: notes,
      caseResolvedAt: now,
      caseResolvedBy: actor,
      resolutionHistory: nextHistory,
    };

    setSharedFormData(updatedFormData);
    setShowResolveCaseDialog(false);

    toast.success(isEdit ? "Resolution updated" : "Case resolved", {
      description: `Case ${formData.caseId} marked as "${targetStage}".`,
    });
  };

  // Re-open a closed case. Pushes the live resolution to history and
  // resets the live resolution fields + case stage.
  const handleReopenCase = () => {
    if (!setSharedFormData || !formData) return;
    const now = new Date();
    const actor = "Current User";
    const prevHistory = formData.resolutionHistory ?? [];
    const nextHistory = formData.resolutionReason
      ? [
          {
            reason: formData.resolutionReason,
            notes: formData.resolutionNotes,
            caseStageBefore: formData.caseStage,
            resolvedAt: formData.caseResolvedAt ?? now,
            resolvedBy: formData.caseResolvedBy ?? actor,
            supersededAt: now,
            supersededBy: actor,
            supersededReason: "Reopen" as const,
          },
          ...prevHistory,
        ]
      : prevHistory;
    setSharedFormData({
      ...formData,
      caseStage: "In Progress",
      resolutionReason: undefined,
      resolutionNotes: undefined,
      caseResolvedAt: undefined,
      caseResolvedBy: undefined,
      resolutionHistory: nextHistory,
    });
    toast.success("Case re-opened", {
      description: `Case ${formData.caseId} reset to "In Progress". Prior resolution kept in history.`,
    });
  };

  // Open the resolve dialog from the case-header action.
  const handleOpenResolveDialog = (mode: "resolve" | "edit") => {
    setResolveDialogMode(mode);
    if (mode === "edit") {
      setResolveDefaultReason(formData?.resolutionReason);
      setResolveDefaultNotes(formData?.resolutionNotes ?? "");
    } else {
      setResolveDefaultReason(undefined);
      setResolveDefaultNotes("");
    }
    setShowResolveCaseDialog(true);
  };

  // ── Attorney Escalation (Collection stage) ──────────────────────────────
  // Mirror of the Triage/Fulfillment-stage escalate flow in DataEntryForm.
  // The case form derives mode = "resume" only when the live escalation is
  // currently in InformationRequested state; otherwise it's "create" (which
  // covers both fresh escalations and updates to an existing one — the
  // EscalateToAttorneyDialog branches internally on `current`).
  const escalateDialogMode: "create" | "resume" =
    formData
      ? getActiveAttorneyEscalation(formData)?.status ===
        "InformationRequested"
        ? "resume"
        : "create"
      : "create";

  const handleOpenEscalateDialog = () => setEscalateDialogOpen(true);

  // Emit case-level action state up to App.tsx so the WorkflowListPane's
  // footer + scope-header action icons can render the same Save / Escalate /
  // Resolve / Document-panel controls without a direct reference back here.
  // Mirrors the DataEntryForm emit pattern.
  //
  // Collection has no "submit form" concept — the page is monitoring running
  // jobs, not editing data — so `canSubmit` is fixed at false and
  // `onSubmit` is a no-op. The Submit button in the pane footer is
  // disabled accordingly.
  const collectionEscalationLabel = formData?.attorneyEscalation
    ? formData.attorneyEscalation.status === "Resolved" ||
      formData.attorneyEscalation.status === "Cancelled"
      ? "Resume Escalation"
      : "Update Escalation"
    : "Escalate";
  const collectionIsResolved = formData?.caseStage === "Resolved";
  React.useEffect(() => {
    if (!onWorkflowPaneActions) return;
    onWorkflowPaneActions({
      isDirty: isFormDirty,
      isSaving: isManualSaving,
      lastSavedAt: lastSavedTime,
      onSave: handleManualSave,
      canSubmit: false,
      isSubmitting: false,
      onSubmit: () => {
        // No single "submit form" action on Collection — the page surfaces
        // its own Publish / Deliver / Retry CTAs adjacent to the job lists.
      },
      documentPanelOpen,
      onToggleDocumentPanel: onToggleDocumentPanel ?? (() => setDocumentPanelOpen(!documentPanelOpen)),
      // Identifier panel is fulfillment-only — omitted on Collection so the
      // pane suppresses the icon entirely.
      correspondencePanelOpen,
      onToggleCorrespondencePanel: () =>
        setCorrespondencePanelOpen(!correspondencePanelOpen),
      escalationActionLabel: collectionEscalationLabel,
      onEscalate: handleOpenEscalateDialog,
      onOpenResolveDialog: (mode) => {
        setResolveDialogMode(mode);
        setShowResolveCaseDialog(true);
      },
      isResolved: collectionIsResolved,
    });
  }, [
    onWorkflowPaneActions,
    isFormDirty,
    isManualSaving,
    lastSavedTime,
    handleManualSave,
    documentPanelOpen,
    onToggleDocumentPanel,
    setDocumentPanelOpen,
    correspondencePanelOpen,
    setCorrespondencePanelOpen,
    collectionEscalationLabel,
    handleOpenEscalateDialog,
    collectionIsResolved,
    setResolveDialogMode,
    setShowResolveCaseDialog,
  ]);

  const handleEscalateSubmit = (next: {
    escalation: AttorneyEscalation;
    auditEvent: EscalationAuditEvent;
    scope?: SignalScope;
  }) => {
    if (!formData || !setSharedFormData) return;
    const scope: SignalScope = next.scope ?? { kind: "all" };
    setSharedFormData(
      createAttorneyEscalation(
        formData,
        scope,
        next.escalation,
        next.auditEvent,
      ),
    );
    setEscalateDialogOpen(false);
    toast.success(
      escalateDialogMode === "resume" ? "Escalation resumed" : "Case escalated",
    );
  };

  // Build tooltip text showing manual vs automated breakdown
  const getReadinessTooltip = (readiness: IdentifierReadiness): string => {
    const parts: string[] = [];
    if (readiness.automatedTotal > 0) {
      parts.push(`${readiness.automatedComplete} of ${readiness.automatedTotal} automated collected`);
    }
    if (readiness.manualTotal > 0) {
      parts.push(`${readiness.manualComplete} of ${readiness.manualTotal} manual collected`);
      if (readiness.manualPending > 0) {
        parts.push(`⚠ ${readiness.manualPending} manual ${readiness.manualPending === 1 ? 'category needs' : 'categories need'} your data entry`);
      }
    }
    if (readiness.alreadySubmitted > 0) {
      parts.push(`${readiness.publishComplete} of ${readiness.alreadySubmitted} packaged`);
    }
    if (readiness.publishComplete > 0) {
      parts.push(`${readiness.deliveryComplete} of ${readiness.publishComplete} delivered`);
    }
    return parts.join('\n');
  };

  // Get the readiness badge for an identifier (wrapped in tooltip)
  const getReadinessBadge = (identifierId: string) => {
    const readiness = identifierReadiness.get(identifierId);
    if (!readiness) return null;

    // If manual categories are pending and all automated are done, show "Manual Input Required" badge
    if (readiness.hasManualPending && readiness.allAutomatedDone && readiness.state === 'collecting') {
      return (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-500 text-xs animate-pulse cursor-help">
                <Wrench className="w-3 h-3 mr-1" />
                Manual Input Required
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] whitespace-pre-line text-xs">
              {getReadinessTooltip(readiness)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    const tooltipText = getReadinessTooltip(readiness);
    const wrapWithTooltip = (badge: React.ReactNode) => (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">{badge}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px] whitespace-pre-line text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    switch (readiness.state) {
      case 'ready-to-publish':
        return wrapWithTooltip(
          <Badge variant="outline" className="bg-[#dff6dd] text-[#107c10] border-[#107c10] text-xs animate-pulse">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Ready to Package
          </Badge>
        );
      case 'publishing':
        return wrapWithTooltip(
          <Badge variant="outline" className="bg-[#e8d4f0] text-[#8764b8] border-[#8764b8] text-xs">
            <Package className="w-3 h-3 mr-1" />
            Preparing {readiness.publishComplete}/{readiness.alreadySubmitted}
          </Badge>
        );
      case 'ready-to-deliver':
        return wrapWithTooltip(
          <Badge variant="outline" className="bg-[#fef9f5] text-[#ca5010] border-[#ca5010] text-xs animate-pulse">
            <Truck className="w-3 h-3 mr-1" />
            Ready to Deliver
          </Badge>
        );
      case 'delivering':
        return wrapWithTooltip(
          <Badge variant="outline" className="bg-[#fef9f5] text-[#ca5010] border-[#ca5010] text-xs">
            <Truck className="w-3 h-3 mr-1" />
            Delivering {readiness.deliveryComplete}/{readiness.publishComplete}
          </Badge>
        );
      case 'complete':
        return wrapWithTooltip(
          <Badge variant="outline" className="bg-[#dff6dd] text-[#107c10] border-[#107c10] text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Complete
          </Badge>
        );
      case 'mixed':
        return wrapWithTooltip(
          <Badge variant="outline" className="bg-[#fff4ce] text-[#8a6d3b] border-[#8a6d3b] text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Partially Submitted
          </Badge>
        );
      case 'collecting': {
        const doneCount = readiness.collectionComplete + readiness.collectionNoData + readiness.collectionFailed;
        // Append manual warning if manual categories are pending
        const badge = readiness.hasManualPending ? (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {doneCount} of {readiness.totalJobs} done
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-400 text-[10px] px-1">
              <Wrench className="w-2.5 h-2.5 mr-0.5" />
              {readiness.manualPending}
            </Badge>
          </div>
        ) : (
          <Badge variant="outline" className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {doneCount} of {readiness.totalJobs} done
          </Badge>
        );
        return wrapWithTooltip(badge);
      }
      default:
        return null;
    }
  };

  // Refresh status from collection service
  const handleRefreshStatus = async () => {
    if (!setSharedFormData || !formData) return;

    setIsRefreshing(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create updated form data with simulated status changes
    const updatedFormData = { ...formData };
    let statusChanges = 0;
    let newFailedDeliveries = 0;
    let newAcknowledgedDeliveries = 0;

    // eEvidence cases use the WISP /eevidence/deliverystatus callback
    // — Started can progress to Complete (success on wire) or Failed
    // (WISP error), and Complete can progress to DeliveryAcknowledged
    // (positive "Received" callback from the IA). Other request types
    // treat Complete as the terminal positive state.
    const eEvidenceDelivery = isEEvidenceDelivery(formData);
    // EPOC-PR (preservation) cases run Collection only — Package and
    // Delivery never apply, so the sim leaves pub/del status fields
    // untouched on those cases.
    const skipPubDelSim = isEpocPrCase(formData);
    function nextDeliveryStatus(
      prevPublish: string,
      prevDelivery: string,
    ): { next: string; error?: string; changed: boolean } {
      // Only progress when publish complete AND a delivery is in flight.
      if (prevDelivery === "Started" && prevPublish === "Complete") {
        if (Math.random() > 0.5) {
          if (eEvidenceDelivery && Math.random() < 0.12) {
            // ~12% of in-flight eEvidence deliveries hit a WISP error.
            return {
              next: "Failed",
              error:
                "WISP /eevidence/deliverystatus reported 'Error' — " +
                "package rejected by the IA receiving endpoint. Inspect " +
                "the payload and click Retry Delivery to re-submit.",
              changed: true,
            };
          }
          return { next: "Complete", changed: true };
        }
        return { next: prevDelivery, changed: false };
      }
      // Complete → DeliveryAcknowledged (only for eEvidence). ~60% per
      // refresh cycle so it takes 1-2 refreshes for the WISP "Received"
      // callback to land.
      if (
        eEvidenceDelivery &&
        prevDelivery === "Complete" &&
        Math.random() > 0.4
      ) {
        return { next: "DeliveryAcknowledged", changed: true };
      }
      return { next: prevDelivery, changed: false };
    }

    updatedFormData.identifiers = updatedFormData.identifiers.map(identifier => {
      const updatedServices = { ...identifier.services };
      
      Object.keys(updatedServices).forEach(serviceKey => {
        const service = updatedServices[serviceKey];
        let updatedGroups = { ...service.categoryGroups };

        iterateServiceCategories(service, (categoryKey, category) => {
          if (category.enabled) {
            const currentStatus = category.collectionStatus || "Not Started";
            let newStatus = currentStatus;
            let newPublishStatus = category.publishStatus || "Not Started";
            let newDeliveryStatus = category.deliveryStatus || "Not Started";
            
            // Simulate collection status progression — ONLY for jobs the
            // RS has explicitly started via "Start Collection". The
            // previous `NotStarted → Started` auto-progression here let
            // jobs advance without any user action, which read as a bug
            // (jobs "auto-progress" when the RS clicks Refresh). The
            // entry to Started state is now a deliberate user action
            // via `handleStartCollectionAll`; Refresh only ticks
            // already-started jobs toward Complete.
            if (currentStatus === "Started" && Math.random() > 0.6) {
              const outcomes = ["Complete", "No Data", "Started"];
              newStatus = outcomes[Math.floor(Math.random() * outcomes.length)];
              if (newStatus !== currentStatus) statusChanges++;
            }

            // Simulate publish + delivery progression. Skipped wholesale
            // for EPOC-PR (preservation) cases — those never enter
            // Package or Delivery.
            let categoryDeliveryError: string | undefined;
            if (!skipPubDelSim) {
              // Publish: only if collection complete and publish started.
              if (newStatus === "Complete" && newPublishStatus === "Started" && Math.random() > 0.5) {
                newPublishStatus = "Complete";
                statusChanges++;
              }

              // Delivery: only for jobs already submitted for delivery
              // — do NOT auto-start. eEvidence delivery additionally
              // cycles through the WISP callback states (Failed-with-
              // Retry on error; DeliveryAcknowledged on Received).
              const result = nextDeliveryStatus(newPublishStatus, newDeliveryStatus);
              if (result.changed) {
                if (result.next === "Failed") newFailedDeliveries++;
                if (result.next === "DeliveryAcknowledged") newAcknowledgedDeliveries++;
                statusChanges++;
              }
              newDeliveryStatus = result.next;
              categoryDeliveryError = result.error;
            }
            
            // Generate Job ID if status is changing from "Not Started" to any other status
            const needsJobId = currentStatus === "Not Started" && newStatus !== "Not Started" && !category.jobId;
            
            // Also progress additionalJobs statuses
            const updatedAdditionalJobs = (category.additionalJobs || []).map((addJob: any) => {
              const addColStatus = addJob.collectionStatus || "Not Started";
              let newAddColStatus = addColStatus;
              let newAddPubStatus = addJob.publishStatus || "Not Started";
              let newAddDelStatus = addJob.deliveryStatus || "Not Started";

              // Same explicit-start gate as the main category: Refresh
              // only progresses jobs the RS has explicitly started.
              if (addColStatus === "Started" && Math.random() > 0.6) {
                const outcomes = ["Complete", "No Data", "Started"];
                newAddColStatus = outcomes[Math.floor(Math.random() * outcomes.length)];
                if (newAddColStatus !== addColStatus) statusChanges++;
              }
              let addDeliveryError: string | undefined;
              if (!skipPubDelSim) {
                if (newAddColStatus === "Complete" && newAddPubStatus === "Started" && Math.random() > 0.5) {
                  newAddPubStatus = "Complete";
                  statusChanges++;
                }
                const result = nextDeliveryStatus(newAddPubStatus, newAddDelStatus);
                if (result.changed) {
                  if (result.next === "Failed") newFailedDeliveries++;
                  if (result.next === "DeliveryAcknowledged") newAcknowledgedDeliveries++;
                  statusChanges++;
                }
                newAddDelStatus = result.next;
                addDeliveryError = result.error;
              }

              return {
                ...addJob,
                collectionStatus: newAddColStatus,
                collectionStatusUpdatedAt: new Date().toISOString(),
                publishStatus: newAddPubStatus,
                ...(newAddPubStatus !== (addJob.publishStatus || "Not Started") ? { publishStatusUpdatedAt: new Date().toISOString() } : {}),
                deliveryStatus: newAddDelStatus,
                ...(newAddDelStatus !== (addJob.deliveryStatus || "Not Started") ? { deliveryStatusUpdatedAt: new Date().toISOString() } : {}),
                // eEvidence WISP callback fields
                ...(newAddDelStatus === "Failed" && addDeliveryError
                  ? { deliveryError: addDeliveryError }
                  : {}),
                ...(newAddDelStatus === "DeliveryAcknowledged" && addJob.deliveryStatus !== "DeliveryAcknowledged"
                  ? { deliveryAcknowledgedAt: new Date() }
                  : {}),
                // Retry clears the error on the next refresh; ensure
                // stale error from a prior Failed cycle doesn't linger
                // when the WISP success path resumes.
                ...(newAddDelStatus !== "Failed" && addJob.deliveryError
                  ? { deliveryError: undefined }
                  : {}),
              };
            });

            updatedGroups = applyItemUpdate(updatedGroups, categoryKey, {
              collectionStatus: newStatus,
              collectionStatusUpdatedAt: new Date().toISOString(),
              publishStatus: newPublishStatus,
              ...(newPublishStatus !== (category.publishStatus || "Not Started") ? { publishStatusUpdatedAt: new Date().toISOString() } : {}),
              deliveryStatus: newDeliveryStatus,
              ...(newDeliveryStatus !== (category.deliveryStatus || "Not Started") ? { deliveryStatusUpdatedAt: new Date().toISOString() } : {}),
              ...(needsJobId ? { jobId: generateJobId() } : {}),
              ...(updatedAdditionalJobs.length > 0 ? { additionalJobs: updatedAdditionalJobs } : {}),
              // eEvidence WISP callback fields — mirror the
              // additionalJobs branch above.
              ...(newDeliveryStatus === "Failed" && categoryDeliveryError
                ? { deliveryError: categoryDeliveryError }
                : {}),
              ...(newDeliveryStatus === "DeliveryAcknowledged" && category.deliveryStatus !== "DeliveryAcknowledged"
                ? { deliveryAcknowledgedAt: new Date() }
                : {}),
              ...(newDeliveryStatus !== "Failed" && category.deliveryError
                ? { deliveryError: undefined }
                : {}),
            });
          }
        });

        updatedServices[serviceKey] = {
          ...service,
          categoryGroups: updatedGroups,
        };
      });
      
      return {
        ...identifier,
        services: updatedServices,
      };
    });

    setSharedFormData(updatedFormData);
    setLastRefreshed(new Date());
    setIsRefreshing(false);

    // Attention-calling: detect newly-ready stage actions after refresh
    // Use a short timeout so the derived publishableJobs/deliverableJobs re-compute first
    setTimeout(() => {
      const currentPublishable = publishableJobs.length;
      if (currentPublishable > prevPublishableCountRef.current) {
        setNewPrepareAction(true);
        setTimeout(() => setNewPrepareAction(false), 4000);
      }
      prevPublishableCountRef.current = currentPublishable;

      const currentDeliverable = deliverableJobs.length;
      if (currentDeliverable > prevDeliverableCountRef.current) {
        setNewDeliverAction(true);
        setTimeout(() => setNewDeliverAction(false), 4000);
      }
      prevDeliverableCountRef.current = currentDeliverable;
    }, 50);

    // Show toast notification. eEvidence cases additionally surface
    // any WISP callback events that landed during this refresh — a
    // delivery error gets a separate error toast so it isn't buried
    // in the generic "pipeline updated" line.
    if (statusChanges > 0) {
      toast.success(`Pipeline updated: ${statusChanges} status ${statusChanges === 1 ? 'change' : 'changes'} across collection, publish & delivery`, {
        description: `Last refreshed ${new Date().toLocaleTimeString()}`,
      });
    } else {
      toast.info("Pipeline up to date", {
        description: "No status changes detected across collection, publish, or delivery",
      });
    }
    if (eEvidenceDelivery && newFailedDeliveries > 0) {
      toast.error(
        `${newFailedDeliveries} delivery ${newFailedDeliveries === 1 ? "error" : "errors"} reported by WISP`,
        {
          description:
            "Click Retry Delivery on the affected jobs, or use the banner at the top of the page to bulk-retry.",
        },
      );
    }
    if (eEvidenceDelivery && newAcknowledgedDeliveries > 0) {
      toast.success(
        `${newAcknowledgedDeliveries} delivery ${newAcknowledgedDeliveries === 1 ? "acknowledgement" : "acknowledgements"} received from the IA`,
      );
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Sticky Case Header */}
      <StickyCaseHeader
        formData={formData}
        workflowStage={workflowStage}
        responseSpecialists={RESPONSE_SPECIALISTS}
        currentUser={CURRENT_USER}
        onAssigneeChange={(next) => {
          if (!formData || !setSharedFormData) return;
          setSharedFormData({ ...formData, assigneeName: next });
        }}
        onNavigateToTriage={() => guardedNavigate(onNavigateToTriage)}
        onNavigateToFulfillment={() => guardedNavigate(onNavigateToFulfillment)}
        onNavigateToQueue={() => guardedNavigate(onNavigateToQueue)}
        documentPanelOpen={documentPanelOpen}
        onToggleDocumentPanel={() => setDocumentPanelOpen(prev => !prev)}
        isDirty={isFormDirty}
        onSave={handleManualSave}
        isSaving={isManualSaving}
        lastSaved={lastSavedTime}
        onRefreshPipeline={handleRefreshStatus}
        isRefreshingPipeline={isRefreshing}
        onOpenResolveDialog={handleOpenResolveDialog}
        onReopenCase={handleReopenCase}
        onOpenEscalateDialog={handleOpenEscalateDialog}
        stageCompletion={stageCompletion}
        navState={stageBarNavState}
        onStepClick={onStageBarStepClick}
        workflowPaneVisible={workflowPaneVisible}
        onShowWorkflowPane={onShowWorkflowPane}
        workflowActiveStepLabel={workflowActiveStepLabel}
      />

      <div
        className="flex-1 overflow-y-auto overscroll-contain transition-all duration-300 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-gray-50 [&::-webkit-scrollbar-thumb]:bg-[#8a8886] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-gray-50 [&::-webkit-scrollbar-thumb]:hover:bg-[#605e5c]"
        style={{
          marginRight: documentPanelOpen
            ? 480
            : correspondencePanelOpen
              ? correspondencePanelWidth
              : 0,
        }}
      >
      {/* Phase 3: PageContainer centers the Collection body at
          --page-max-w (1280px) and consumes --page-gutter-x (32px) for
          horizontal padding. The sticky header above stays full-bleed
          per the airy-density plan so action chips remain edge-anchored.
          Inner vertical padding (py-5 pb-8) and vertical rhythm (space-y-5)
          stay on the inner div; only horizontal chrome moves to the
          container. */}
      <PageContainer>
      <div className="py-5 space-y-5 pb-8">
        {/* Workflow 8 — IA withdrawal terminal banner. Top of the stack
            because it supersedes every other state. Applies to both
            EPOC-PR and EPOC-ER. Self-hides when the case isn't withdrawn. */}
        <WithdrawalBanner
          formData={formData}
          onViewDocument={() => viewDocumentInRegister("EPOC_WITHDRAWAL")}
        />

        {/* Workflow 3 — Emergency Production (8h SLA). Surfaces the IA's
            stated emergency justification. Self-hides on non-emergency
            cases and when withdrawal has fired. */}
        <EmergencyEEvidenceBanner formData={formData} />

        {/* Preservation-order-active banner (EPOC-PR only) — top of the
            preservation banner stack. Surfaces the earliest expiry +
            "Acknowledge Receipt" CTA. Self-hides once preservation has
            ended. */}
        <PreservationOrderActiveBanner
          formData={formData}
          onAcknowledgeReceipt={openAcknowledgeReceiptComposer}
          onViewDocument={() => viewDocumentInRegister("EPOC_FORM_2")}
        />

        {/* Preservation extension banner (EPOC-PR only) — surfaces the
            most recent Form 6 the IA has sent. Self-hides on non-PR
            cases and on cases that never received a Form 6. */}
        <PreservationExtensionBanner
          formData={formData}
          onViewDocument={() => viewDocumentInRegister("EPOC_FORM_6")}
        />

        {/* End-preservation banner (EPOC-PR only) — surfaces the IA's
            end-of-preservation notice. Renders when the audit log
            contains a PreservationEnded event; the 45-day retention
            clock chip in the sticky header carries the day-by-day
            count, this banner gives the why-it-started context. */}
        <EndPreservationBanner
          formData={formData}
          onViewDocument={() => viewDocumentInRegister("EPOC_END_PRESERVATION")}
        />

        {/* Failed-delivery banner — pinned above the GFR panel because
            the RS needs to act on it immediately (Retry). Self-hides
            when there are no failed delivery jobs on the case.
            eEvidence-only via the helper's internal gate. The Retry
            CTA opens the same DeliveryReview dialog the regular
            "Submit to Delivery" flow uses, just in retry mode. */}
        <FailedDeliveryBanner
          failedCount={failedDeliveryJobs.length}
          onOpenRetryDialog={() => openDeliveryReviewForRetry()}
        />

        {/* GFR Panel — pinned at the top of Collection too. A Full GFR
            landing while data is mid-collection is exactly the moment
            the RS must see the EA's legal block; the sticky-header chip
            alone (single line) isn't enough context. Self-hides via
            gfrApplies() on non-EA workflows and non-eEvidence cases. */}
        <GroundsForRefusalPanel
          formData={formData}
          onRetractForm3={handleOpenRetractForm3Dialog}
          onResumeDelivery={handleResumeDelivery}
          onBlockDelivery={handleBlockDeliveryFromGfr}
          onUndoBlockDelivery={handleUndoBlockDeliveryFromGfr}
        />

        {/* Phase 2: Correspondence Hub access from Collection. Inbound
            correspondence can arrive at any stage, so the banner is
            mounted here as well as on the Triage / Fulfillment views.
            The banner morphs in-place between idle and unread states
            (see CorrespondenceBanner.tsx); no separate unread alert. */}
        <CorrespondenceBanner
          items={formData.correspondence}
          onMarkInboundRead={handleMarkInboundRead}
          onOpenPanel={() => setCorrespondencePanelOpen(true)}
        />
        {/* RS / TS pull-model affordance — same banner mounted on
            DataEntryForm. The escalation can have completed at any
            workflow stage, so the banner needs to render on Collection
            too. Click Acknowledge to stamp `rsAcknowledgedAt` + clear
            the queue badge. */}
        {setSharedFormData && (
          <EscalationCompleteBanner
            formData={formData}
            setFormData={(updater) => setSharedFormData(updater(formData))}
          />
        )}
        {/* Pull-model surface for auto-derived state changes. EA review
            window typically lapses while the case is on Collection
            (cases land here once the EA review window is open), so the
            banner mostly fires here. */}
        {setSharedFormData && (
          <AutoStateChangeBanner
            formData={formData}
            setFormData={(updater) => setSharedFormData(updater(formData))}
          />
        )}
        {/* Phase 5c.5: LE Cancelled / Withdrawn surfacing on the Collection
         *  page — same banner as Step 2/3 with destructive actions gated
         *  below. Acknowledging from here cascades to identifier taskStatus
         *  and forces deliveryBlocked = true so no new jobs leave the box. */}
        {isAuthorizationStatusTerminal(formData.authorizationDesiredStatus) && (
          <AuthorizationStatusBanner
            status={formData.authorizationDesiredStatus}
            updatedAt={formData.authorizationStatusUpdatedAt}
            updatedBy={formData.authorizationStatusUpdatedBy}
            acknowledgedAt={formData.authorizationStatusAcknowledgedAt}
            acknowledgedBy={formData.authorizationStatusAcknowledgedBy}
            onAcknowledge={() => {
              if (!setSharedFormData) return;
              const targetStatus = formData.authorizationDesiredStatus;
              if (targetStatus !== "Cancelled" && targetStatus !== "Withdrawn") return;
              const now = new Date();
              const actor = "Current User";
              setSharedFormData({
                ...formData,
                authorizationStatusAcknowledgedAt: now,
                authorizationStatusAcknowledgedBy: actor,
                identifiers: formData.identifiers.map((id) => ({
                  ...id,
                  taskStatus: targetStatus as any,
                })),
              });
              setDeliveryBlocked(true);
            }}
            onResolve={() => {
              const auth = formData.authorizationDesiredStatus;
              setResolveDialogMode("resolve");
              setResolveDefaultReason(
                auth === "Cancelled" ? "UserQuashed"
                  : auth === "Withdrawn" ? "WithdrawnExternal"
                  : "InfoProvided"
              );
              setResolveDefaultNotes("");
              setShowResolveCaseDialog(true);
            }}
            caseResolved={!!formData.caseResolvedAt}
          />
        )}

        {/* Pipeline Summary Bar */}
        <Card className="shadow-sm overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#deecf9] rounded flex items-center justify-center">
                  <Database className="w-5 h-5 text-[#0078d4]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#323130]">Fulfillment Pipeline</h2>
                  <p className="text-sm text-[#605e5c]">
                    {pipelineStats.totalIdentifiers} {pipelineStats.totalIdentifiers === 1 ? 'identifier' : 'identifiers'} · {pipelineStats.totalJobs} total jobs
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-[#0078d4] text-[#0078d4] hover:bg-[#deecf9]"
                  onClick={() => setShowPipelineReport(true)}
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Status Matrix
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-[#c8c6c4] hover:bg-[#f3f2f1]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
                {/* Block Delivery — hidden on EPOC-PR (preservation).
                    Preservation requests never reach a delivery stage
                    (the pipeline collapses to Collection-only), so a
                    delivery-block control is irrelevant. Matches the
                    `!isEpocPr` gating used for the Package/Delivery
                    stages below. The GFR-panel "Block Delivery" CTA is
                    already self-hidden for preservation via gfrApplies(). */}
                {!isEpocPr && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={
                        isGfrEnforced(formData) || deliveryBlocked
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      // The toolbar button is no longer auto-disabled by
                      // Full GFR receipt — the EA's decision is informational
                      // until the RS clicks "Block Delivery" on the GFR
                      // Panel (which sets `enforcementApplied`). When that
                      // is in effect, the button reflects the block state.
                      className={cn(
                        "h-9",
                        isGfrEnforced(formData)
                          ? "bg-[#a4262c] hover:bg-[#a4262c] text-white border-[#a4262c] cursor-not-allowed opacity-90"
                          : deliveryBlocked
                            ? "bg-[#a4262c] hover:bg-[#8a2121] text-white border-[#a4262c]"
                            : "border-[#a4262c] text-[#a4262c] hover:bg-[#fde7e9]",
                      )}
                      onClick={() => {
                        // When the GFR is being enforced, the toolbar
                        // button is informational — unblocking after
                        // enforcement is a separate workflow (review the
                        // GFR Panel for the EA's decision + reasons).
                        if (isGfrEnforced(formData)) return;
                        if (deliveryBlocked) {
                          setDeliveryBlocked(false);
                          toast.success(
                            "Delivery unblocked — new and pending jobs can now proceed.",
                          );
                        } else {
                          setShowBlockDeliveryDialog(true);
                        }
                      }}
                    >
                      <ShieldBan className="w-4 h-4 mr-2" />
                      {isGfrEnforced(formData)
                        ? "Blocked — GFR enforced"
                        : deliveryBlocked
                          ? "Delivery Blocked"
                          : "Block Delivery"}
                    </Button>
                  </TooltipTrigger>
                  {isGfrEnforced(formData) && (
                    <TooltipContent>
                      <p className="text-xs font-semibold">
                        Delivery is blocked because the GFR has been enforced.
                      </p>
                      <p className="text-xs text-slate-300 mt-0.5">
                        See the GFR Panel for the EA's decision, reasons,
                        and the RS who enforced the block.
                      </p>
                    </TooltipContent>
                  )}
                  </Tooltip>
                </TooltipProvider>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-[#0078d4] text-[#0078d4] hover:bg-[#deecf9]"
                  onClick={() => guardedNavigate(onEditFulfillmentScope ?? onNavigateToFulfillment)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Fulfillment Plan
                </Button>
              </div>
            </div>

            {/* Bug #2 — Start Collection confirmation dialog. Surfaces
                the queued-job + identifier counts so the RS sees the
                scope of what they're starting. Cancel just dismisses;
                Confirm fires `handleStartCollectionAll` which flips the
                NotStarted jobs to Started and toasts the count. */}
            <Dialog
              open={showStartCollectionDialog}
              onOpenChange={(open) => {
                setShowStartCollectionDialog(open);
                if (!open) setCollectionStartMode("start");
              }}
            >
              <DialogContent className="max-w-md">
                {(() => {
                  const isRetry = collectionStartMode === "retry";
                  const failedCount = retryableCollectionJobs.length;
                  return (
                    <>
                      <DialogHeader>
                        <DialogTitle
                          className={cn(
                            "flex items-center gap-2",
                            isRetry ? "text-[#a4262c]" : "text-[#0078d4]",
                          )}
                        >
                          {isRetry ? (
                            <RotateCcw className="w-5 h-5" />
                          ) : (
                            <Zap className="w-5 h-5" />
                          )}
                          {isRetry ? "Retry Failed Collection" : "Start Collection"}
                        </DialogTitle>
                        <DialogDescription className="text-[#605e5c]">
                          {isRetry ? (
                            <>
                              This will requeue{" "}
                              <span className="font-semibold text-[#323130]">
                                {failedCount} failed collection{" "}
                                {failedCount === 1 ? "job" : "jobs"}
                              </span>{" "}
                              by flipping their status back to Started.
                              Click Refresh after to tick statuses toward
                              Complete.
                            </>
                          ) : (
                            <>
                              This will kick off collection on{" "}
                              <span className="font-semibold text-[#323130]">
                                {collectionStats.notStarted} queued{" "}
                                {collectionStats.notStarted === 1 ? "job" : "jobs"}
                              </span>{" "}
                              across the case's enabled data categories. The
                              IA's backend processes the requests; click
                              Refresh to tick job statuses toward Complete.
                            </>
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      <div
                        className={cn(
                          "border rounded-md p-3 text-xs flex items-start gap-2",
                          isRetry
                            ? "bg-[#fde7e9] border-[#a4262c]/30 text-[#a4262c]"
                            : "bg-[#deecf9] border-[#0078d4]/30 text-[#243a5e]",
                        )}
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          {isRetry
                            ? "Retried jobs clear their prior error and start fresh. Failed jobs that succeed will then flow through to Review & Package as usual."
                            : 'Started jobs cannot be returned to the queue. Once Complete, you\'ll explicitly review + submit them to the Package phase via "Review & Package".'}
                        </span>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => setShowStartCollectionDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className={cn(
                            "text-white",
                            isRetry
                              ? "bg-[#a4262c] hover:bg-[#8a2121]"
                              : "bg-[#0078d4] hover:bg-[#106ebe]",
                          )}
                          onClick={() => {
                            setShowStartCollectionDialog(false);
                            if (isRetry) {
                              handleRetryCollectionAll();
                            } else {
                              handleStartCollectionAll();
                            }
                          }}
                        >
                          {isRetry ? (
                            <>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Retry Failed Collection
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Start Collection
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </DialogContent>
            </Dialog>

            {/* Block Delivery confirmation dialog */}
            <Dialog open={showBlockDeliveryDialog} onOpenChange={setShowBlockDeliveryDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-[#a4262c]">
                    <ShieldBan className="w-5 h-5" />
                    Block Delivery
                  </DialogTitle>
                  <DialogDescription className="text-[#605e5c]">
                    This will stop delivery for any jobs that have <span className="font-semibold text-[#323130]">not yet completed delivery</span> and prevent any new jobs from starting delivery.
                    Jobs that have already been delivered will not be affected.
                  </DialogDescription>
                </DialogHeader>
                <div className="bg-[#fff4ce] border border-[#f7dba7] rounded-md p-3 text-xs text-[#8a6d3b] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>You can unblock delivery later by clicking the "Delivery Blocked" button.</span>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowBlockDeliveryDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#a4262c] hover:bg-[#8a2121] text-white"
                    onClick={() => {
                      setDeliveryBlocked(true);
                      setShowBlockDeliveryDialog(false);
                      toast.success("Delivery blocked — no pending or new jobs will be delivered.");
                    }}
                  >
                    <ShieldBan className="w-4 h-4 mr-2" />
                    Confirm Block
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delivery blocked banner — surfaces when EITHER the RS
                manually blocked delivery OR the GFR has been enforced
                by the RS (Block Delivery CTA on the GFR Panel). The
                Unblock affordance is hidden when the block is GFR-
                enforced (release that block from the GFR Panel context,
                not a generic toolbar). */}
            {(deliveryBlocked || isGfrEnforced(formData)) && (
              <div className="mb-4 flex items-center gap-3 bg-[#fde7e9] border border-[#d13438] rounded-lg px-4 py-3">
                <ShieldBan className="w-5 h-5 text-[#a4262c] flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-[#a4262c]">
                    {isGfrEnforced(formData)
                      ? "Delivery is blocked — GFR enforced."
                      : "Delivery is blocked."}
                  </span>
                  <span className="text-sm text-[#605e5c] ml-2">
                    {isGfrEnforced(formData)
                      ? "The RS chose to enforce the EA's Grounds for Refusal. No pending or new jobs will be delivered."
                      : "No pending or new jobs will be delivered until unblocked."}
                  </span>
                </div>
                {!isGfrEnforced(formData) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#a4262c] text-[#a4262c] hover:bg-white flex-shrink-0"
                  onClick={() => {
                    setDeliveryBlocked(false);
                    toast.success("Delivery unblocked — new and pending jobs can now proceed.");
                  }}
                >
                  Unblock
                </Button>
                )}
              </div>
            )}

            {/* Pipeline visualization — three-stage for production cases,
                Collection-only for EPOC-PR (preservation). */}
            <div
              className={cn(
                "grid gap-0 relative items-stretch",
                isEpocPr ? "grid-cols-1" : "grid-cols-3",
              )}
            >
              {/* Connector arrows — hidden on EPOC-PR (no Package/Delivery to flow into) */}
              {!isEpocPr && (
                <>
                  <div className="absolute top-1/2 left-[33.33%] -translate-y-1/2 -translate-x-1/2 z-10 w-6 h-6 rounded-full bg-white border-2 border-[#edebe9] flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-[#8a8886]" />
                  </div>
                  <div className="absolute top-1/2 left-[66.66%] -translate-y-1/2 -translate-x-1/2 z-10 w-6 h-6 rounded-full bg-white border-2 border-[#edebe9] flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-[#8a8886]" />
                  </div>
                </>
              )}

              {/* Collection Stage */}
              <div
                className={cn(
                  "p-4 bg-[#f3f9fd] border border-[#c7e0f4] flex flex-col",
                  isEpocPr ? "rounded-lg" : "rounded-l-lg",
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-[#0078d4]" />
                  <span className="text-sm font-semibold text-[#0078d4]">
                    {isEpocPr ? "Preservation" : "Collection"}
                  </span>
                </div>
                <div className="text-3xl font-bold text-[#323130] mb-1">
                  {collectionStats.complete + collectionStats.noData}
                  <span className="text-sm font-normal text-[#605e5c]"> / {collectionStats.totalCategories}</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-[#deecf9] mb-2">
                  {collectionStats.complete > 0 && (
                    <div
                      className="bg-[#107c10] transition-all duration-300"
                      style={{ width: `${(collectionStats.complete / Math.max(collectionStats.totalCategories, 1)) * 100}%` }}
                    />
                  )}
                  {collectionStats.noData > 0 && (
                    <div
                      className="bg-[#ca5010] transition-all duration-300"
                      style={{ width: `${(collectionStats.noData / Math.max(collectionStats.totalCategories, 1)) * 100}%` }}
                    />
                  )}
                  {collectionStats.failed > 0 && (
                    <div
                      className="bg-[#a4262c] transition-all duration-300"
                      style={{ width: `${(collectionStats.failed / Math.max(collectionStats.totalCategories, 1)) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#605e5c]">
                  {collectionStats.started > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#0078d4]" />{collectionStats.started} in progress</span>}
                  {collectionStats.notStarted > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#8a8886]" />{collectionStats.notStarted} queued</span>}
                  {collectionStats.failed > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#a4262c]" />{collectionStats.failed} failed</span>}
                </div>
                {/* Manual vs Automated breakdown */}
                {collectionStats.manualTotal > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#c7e0f4]">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span className="flex items-center gap-1 text-[#605e5c]">
                        <Zap className="w-3 h-3 text-[#0078d4]" />
                        {collectionStats.automatedComplete}/{collectionStats.automatedTotal} automated
                      </span>
                      <span className={cn(
                        "flex items-center gap-1",
                        collectionStats.manualPending > 0 ? "text-amber-700 font-medium" : "text-[#605e5c]"
                      )}>
                        <Wrench className="w-3 h-3" />
                        {collectionStats.manualComplete}/{collectionStats.manualTotal} manual
                        {collectionStats.manualPending > 0 && (
                          <span className="text-amber-600">({collectionStats.manualPending} pending)</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Start Collection CTA — surfaces whenever any enabled
                    data-category job is still NotStarted. The RS must
                    explicitly click here to kick off collection on
                    those jobs; Refresh only progresses jobs that have
                    already entered the Started state. */}
                {collectionStats.notStarted > 0 && (
                  <div className="mt-auto pt-3 mt-3 border-t border-[#c7e0f4] flex flex-col gap-2">
                    <p className="text-xs text-[#605e5c]">
                      {collectionStats.notStarted} {collectionStats.notStarted === 1 ? "job" : "jobs"} queued — Refresh won't advance them until you start collection.
                    </p>
                    <Button
                      size="sm"
                      disabled={cancellationLocked}
                      title={cancellationLockedTooltip}
                      className="w-full h-8 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs"
                      onClick={() => {
                        setCollectionStartMode("start");
                        setShowStartCollectionDialog(true);
                      }}
                    >
                      <Zap className="w-3 h-3 mr-1.5" />
                      Start Collection ({collectionStats.notStarted})
                    </Button>
                  </div>
                )}

                {/* Bulk Retry Collection CTA — surfaces whenever any
                    enabled data-category job is in the Failed state.
                    Reuses the StartCollection confirm dialog under
                    collectionStartMode === "retry". */}
                {retryableCollectionJobs.length > 0 && (
                  <div className={cn(
                    "mt-auto pt-3 mt-3 border-t border-[#a4262c]/40 flex flex-col gap-2",
                    collectionStats.notStarted > 0 ? "border-t-0 pt-0 mt-0" : "",
                  )}>
                    <p className="text-xs text-[#a4262c]">
                      {retryableCollectionJobs.length} failed collection {retryableCollectionJobs.length === 1 ? "job" : "jobs"} — flip back to Started.
                    </p>
                    <Button
                      size="sm"
                      disabled={cancellationLocked}
                      title={cancellationLockedTooltip}
                      className="w-full h-8 bg-white hover:bg-[#fde7e9] text-[#a4262c] border-2 border-[#a4262c] text-xs font-semibold"
                      onClick={openCollectionRetryConfirm}
                    >
                      <RotateCcw className="w-3 h-3 mr-1.5" />
                      Retry Failed Collection ({retryableCollectionJobs.length})
                    </Button>
                  </div>
                )}

                {/* Collection action footer — jobs ready to package and/or manual items pending.
                    EPOC-PR cases never enter the Packaging stage, so the
                    "Review & Package" CTA is suppressed (the manual-input
                    branch still surfaces because manual collection can
                    still be pending on a preservation order). */}
                {!isEpocPr && (publishableJobs.length > 0 || pipelineStats.manualCollectionPending > 0) && (
                  <div className={cn(
                    "mt-auto pt-3 mt-3 border-t flex flex-col gap-2",
                    newPrepareAction ? "border-[#107c10]" : "border-[#c7e0f4]"
                  )}>
                    {pipelineStats.manualCollectionPending > 0 && (
                      <div className="flex items-start gap-1.5 text-xs text-amber-700">
                        <Wrench className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>
                          {pipelineStats.manualCollectionPending} manual {pipelineStats.manualCollectionPending === 1 ? 'category' : 'categories'} need input
                        </span>
                      </div>
                    )}
                    {publishableJobs.length > 0 && (
                      <>
                        <p className="text-xs text-[#605e5c]">
                          {publishableJobs.length} {publishableJobs.length === 1 ? 'job' : 'jobs'} ready to package
                        </p>
                        <Button
                          size="sm"
                          disabled={cancellationLocked}
                          title={cancellationLockedTooltip}
                          className={cn(
                            "w-full h-8 text-white text-xs",
                            newPrepareAction
                              ? "bg-[#107c10] ring-2 ring-[#107c10] ring-offset-1 animate-pulse hover:bg-[#0e6b0e]"
                              : "bg-[#107c10] hover:bg-[#0e6b0e]"
                          )}
                          onClick={() => {
                            setPublishReviewMode("submit");
                            setSelectedJobsForPublish(new Set(publishableJobs.map((j: PipelineJob) => j.jobKey)));
                            setShowPublishReview(true);
                          }}
                        >
                          <Send className="w-3 h-3 mr-1.5" />
                          Review & Package ({publishableJobs.length})
                        </Button>
                      </>
                    )}
                    {pipelineStats.manualCollectionPending > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                          onClick={() => setReadinessFilter('by-identifier')}
                        >
                          <Edit3 className="w-3 h-3 mr-1.5" />
                          Enter Data Inline
                        </Button>
                        {readinessFilter !== 'all' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 border-amber-400 text-amber-700 hover:bg-amber-50 text-xs"
                            onClick={() => setReadinessFilter('all')}
                          >
                            <Wrench className="w-3 h-3 mr-1.5" />
                            View Manual Services
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* EPOC-PR "Cannot preserve" affordance — discoverable
                    shortcut to Form 3 (Non-Execution Response) for the
                    preservation-failure path (DataNotHeld /
                    DeFactoImpossibility). Opens the correspondence
                    composer with EPOC_FORM_3 pre-attached. Sending the
                    form pauses the SLA + starts the 45-day retention
                    clock + appends Form3Submitted to the audit thread. */}
                {isEpocPr && (
                  <div className="mt-auto pt-3 mt-3 border-t border-[#c7e0f4] flex flex-col gap-2">
                    <p className="text-xs text-[#605e5c]">
                      Cannot preserve this case? Submit Form 3 to notify
                      the IA — the 45-day data-deletion window starts on send.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openForm3Composer}
                      className="border-[#a4262c] text-[#a4262c] hover:bg-[#fde7e9] hover:text-[#a4262c]"
                    >
                      <ShieldBan className="w-3.5 h-3.5 mr-1.5" />
                      Submit Form 3 — Non-Execution
                    </Button>
                  </div>
                )}
              </div>

              {/* Package Stage — hidden on EPOC-PR (preservation only). */}
              {!isEpocPr && (
              <div className="p-4 bg-[#f3faf3] border-y border-[#c6e0c6] flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-[#107c10]" />
                  <span className="text-sm font-semibold text-[#107c10]">Package</span>
                </div>
                <div className="text-3xl font-bold text-[#323130] mb-1">
                  {pipelineStats.publishDone}
                  <span className="text-sm font-normal text-[#605e5c]"> / {pipelineStats.publishSubmitted || '—'}</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-[#dff6dd] mb-2">
                  {pipelineStats.publishSubmitted > 0 && pipelineStats.publishDone > 0 && (
                    <div
                      className="bg-[#107c10] transition-all duration-300"
                      style={{ width: `${(pipelineStats.publishDone / pipelineStats.publishSubmitted) * 100}%` }}
                    />
                  )}
                  {pipelineStats.publishInProgress > 0 && (
                    <div
                      className="bg-[#54b054] transition-all duration-300"
                      style={{ width: `${(pipelineStats.publishInProgress / Math.max(pipelineStats.publishSubmitted, 1)) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#605e5c]">
                  {pipelineStats.publishInProgress > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#54b054]" />{pipelineStats.publishInProgress} in progress</span>}
                  {pipelineStats.publishSubmitted === 0 && <span className="text-[#a19f9d]">No jobs submitted yet</span>}
                </div>

                {/* Package action footer — jobs ready to deliver + bulk retry
                    for any failed-package jobs. The Retry Failed Package CTA
                    lives in this stage (not Collection) because retrying a
                    failed Package job lands the work back in the Package
                    pipeline — placing the action in the stage it succeeds in
                    keeps the mental model "fix the failure where it happens."
                    The Submit-to-Delivery button (the WISP
                    `/eevidence/outcome` push for eEvidence cases) is gated
                    on the case-level delivery permission so the EA review
                    window and Full GFR holds visibly disable it instead of
                    silently bouncing the click. */}
                {(deliverableJobs.length > 0 || retryablePublishJobs.length > 0) && (() => {
                  const deliveryGateReason: string | undefined = !canDeliverCase
                    ? isGfrEnforced(formData)
                      ? "Action blocked — GFR enforced by the RS. See the GFR Panel."
                      : gfrBlockData && !gfrBlockData.decision && !gfrBlockData.manualDeliveryResumed
                        ? "Action blocked — EA review window active. Awaiting EA determination."
                        : "Action blocked — EA review window lapsed. Click Resume Delivery in the GFR Panel to proceed."
                    : cancellationLocked
                      ? cancellationLockedTooltip
                      : undefined;
                  const deliveryDisabled = !canDeliverCase || cancellationLocked;
                  return (
                    <div className={cn(
                      "mt-auto pt-3 mt-3 border-t flex flex-col gap-2",
                      newDeliverAction ? "border-[#ca5010]" : "border-[#c6e0c6]"
                    )}>
                      {retryablePublishJobs.length > 0 && (
                        <>
                          <p className="text-xs text-[#a4262c]">
                            {retryablePublishJobs.length} failed package {retryablePublishJobs.length === 1 ? 'job' : 'jobs'} — review and retry.
                          </p>
                          <Button
                            size="sm"
                            disabled={cancellationLocked}
                            title={cancellationLockedTooltip}
                            className="w-full h-8 bg-white hover:bg-[#fde7e9] text-[#a4262c] border-2 border-[#a4262c] text-xs font-semibold"
                            onClick={() => openPublishReviewForRetry()}
                          >
                            <RotateCcw className="w-3 h-3 mr-1.5" />
                            Retry Failed Package ({retryablePublishJobs.length})
                          </Button>
                        </>
                      )}
                      {deliverableJobs.length > 0 && (
                        <>
                          <p className="text-xs text-[#605e5c]">
                            {deliverableJobs.length} {deliverableJobs.length === 1 ? 'job' : 'jobs'} ready to deliver
                          </p>
                          <Button
                            size="sm"
                            disabled={deliveryDisabled}
                            title={deliveryGateReason}
                            className={cn(
                              "w-full h-8 text-white text-xs",
                              deliveryDisabled
                                ? "bg-[#a19f9d] hover:bg-[#a19f9d] cursor-not-allowed"
                                : newDeliverAction
                                  ? "bg-[#ca5010] ring-2 ring-[#ca5010] ring-offset-1 animate-pulse hover:bg-[#b3480e]"
                                  : "bg-[#ca5010] hover:bg-[#b3480e]"
                            )}
                            onClick={() => {
                              if (deliveryDisabled) return;
                              setSelectedJobsForDelivery(new Set(deliverableJobs.map((j: PipelineJob) => j.jobKey)));
                              setShowDeliveryReview(true);
                            }}
                          >
                            <Truck className="w-3 h-3 mr-1.5" />
                            {!canDeliverCase
                              ? isGfrEnforced(formData)
                                ? "Blocked — GFR enforced"
                                : "Blocked — EA review window"
                              : `Review & Deliver (${deliverableJobs.length})`}
                          </Button>
                          {deliveryGateReason && !canDeliverCase && (
                            <p className="text-[11px] text-[#a4262c]">
                              {deliveryGateReason}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
              )}

              {/* Delivery Stage — hidden on EPOC-PR. */}
              {!isEpocPr && (
              <div className="p-4 bg-[#fef9f5] border border-[#f7ddc9] rounded-r-lg flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-[#ca5010]" />
                  <span className="text-sm font-semibold text-[#ca5010]">Delivery</span>
                </div>
                {/* Headline count: Done (delivered + acknowledged) over
                    published-and-attempted. Excludes Failed jobs from
                    the numerator so the count reflects "successfully
                    delivered" rather than "attempted." Failed jobs
                    surface in the breakdown row + inline mini-banner. */}
                <div className="text-3xl font-bold text-[#323130] mb-1">
                  {pipelineStats.deliveryDone}
                  <span className="text-sm font-normal text-[#605e5c]"> / {pipelineStats.publishDone || '—'}</span>
                </div>
                {/* Progress bar — three segments: Done (solid),
                    In-Transit (lighter orange), Failed (red). */}
                <div className="flex h-2 rounded-full overflow-hidden bg-[#fce4cc] mb-2">
                  {pipelineStats.publishDone > 0 && pipelineStats.deliveryDone > 0 && (
                    <div
                      className="bg-[#ca5010] transition-all duration-300"
                      style={{ width: `${(pipelineStats.deliveryDone / pipelineStats.publishDone) * 100}%` }}
                    />
                  )}
                  {pipelineStats.deliveryStarted > 0 && (
                    <div
                      className="bg-[#e0844a] transition-all duration-300"
                      style={{ width: `${(pipelineStats.deliveryStarted / Math.max(pipelineStats.publishDone, 1)) * 100}%` }}
                    />
                  )}
                  {pipelineStats.deliveryFailed > 0 && (
                    <div
                      className="bg-[#a4262c] transition-all duration-300"
                      style={{ width: `${(pipelineStats.deliveryFailed / Math.max(pipelineStats.publishDone, 1)) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#605e5c]">
                  {pipelineStats.deliveryDone > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ca5010]" />
                      {pipelineStats.deliveryDone} delivered
                    </span>
                  )}
                  {pipelineStats.deliveryStarted > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e0844a]" />
                      {pipelineStats.deliveryStarted} in transit
                    </span>
                  )}
                  {pipelineStats.deliveryFailed > 0 && (
                    <span className="flex items-center gap-1 text-[#a4262c]" style={{ fontWeight: 600 }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a4262c]" />
                      {pipelineStats.deliveryFailed} failed
                    </span>
                  )}
                  {pipelineStats.publishDone === 0 && <span className="text-[#a19f9d]">Awaiting published data</span>}
                </div>
                {/* Inline WISP error mini-banner — surfaces inside the
                    Delivery container itself so the error signal lives
                    next to the phase it affects. Click "Retry Delivery"
                    to open the same Review dialog used for the regular
                    "Submit to Delivery" flow, scoped to Failed jobs. */}
                {pipelineStats.deliveryFailed > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#f7ddc9] flex items-center gap-2">
                    <AlertOctagon
                      className="w-4 h-4 text-[#a4262c] flex-shrink-0"
                      aria-hidden="true"
                    />
                    <p className="text-xs text-[#a4262c] flex-1" style={{ fontWeight: 600 }}>
                      WISP reported {pipelineStats.deliveryFailed === 1 ? "an error" : `${pipelineStats.deliveryFailed} errors`} during delivery.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => openDeliveryReviewForRetry()}
                      className="h-7 px-2 text-xs bg-white hover:bg-[#fde7e9] text-[#a4262c] border-2 border-[#a4262c] shadow-sm font-semibold"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" aria-hidden="true" />
                      Retry Delivery
                    </Button>
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Identifier-level status summary row */}
            <div className="mt-4 pt-4 border-t border-[#edebe9] flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-[#605e5c] uppercase tracking-wide mr-1">Identifiers:</span>
              {pipelineStats.identifiersCollecting > 0 && (
                <Badge variant="outline" className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {pipelineStats.identifiersCollecting} Collecting
                </Badge>
              )}
              {!isEpocPr && pipelineStats.identifiersReadyToPublish > 0 && (
                <Badge variant="outline" className="bg-[#dff6dd] text-[#107c10] border-[#107c10] text-xs animate-pulse">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {pipelineStats.identifiersReadyToPublish} Ready to Package
                </Badge>
              )}
              {!isEpocPr && pipelineStats.identifiersMixed > 0 && (
                <Badge variant="outline" className="bg-[#fff4ce] text-[#8a6d3b] border-[#8a6d3b] text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {pipelineStats.identifiersMixed} Partially Submitted
                </Badge>
              )}
              {!isEpocPr && pipelineStats.identifiersPublishing > 0 && (
                <Badge variant="outline" className="bg-[#e8d4f0] text-[#8764b8] border-[#8764b8] text-xs">
                  <Package className="w-3 h-3 mr-1" />
                  {pipelineStats.identifiersPublishing} Preparing
                </Badge>
              )}
              {!isEpocPr && pipelineStats.identifiersReadyToDeliver > 0 && (
                <Badge variant="outline" className="bg-[#fef9f5] text-[#ca5010] border-[#ca5010] text-xs animate-pulse">
                  <Truck className="w-3 h-3 mr-1" />
                  {pipelineStats.identifiersReadyToDeliver} Ready to Deliver
                </Badge>
              )}
              {!isEpocPr && pipelineStats.identifiersDelivering > 0 && (
                <Badge variant="outline" className="bg-[#fef9f5] text-[#ca5010] border-[#ca5010] text-xs">
                  <Truck className="w-3 h-3 mr-1" />
                  {pipelineStats.identifiersDelivering} Delivering
                </Badge>
              )}
              {pipelineStats.identifiersComplete > 0 && (
                <Badge variant="outline" className="bg-[#dff6dd] text-[#107c10] border-[#107c10] text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {pipelineStats.identifiersComplete} Complete
                </Badge>
              )}
              {pipelineStats.identifiersWithFailures > 0 && (
                <Badge variant="outline" className="bg-[#fde7e9] text-[#a4262c] border-[#a4262c] text-xs">
                  <XCircle className="w-3 h-3 mr-1" />
                  {pipelineStats.identifiersWithFailures} Has Failures
                </Badge>
              )}
              {pipelineStats.identifiersWithManualPending > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-500 text-xs">
                  <Wrench className="w-3 h-3 mr-1" />
                  {pipelineStats.identifiersWithManualPending} Manual Pending
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Resolve Case Bar — always rendered. When a delivery / no-data /
            withdrawal / all-complete trigger fires, the bar swaps to that
            contextual headline + reason + tinted accents. Otherwise it
            shows neutral copy + a primary Resolve Case action. The bar
            keeps the Delivered Report side-button when jobs have shipped. */}
        {(() => {
          const hasContextualTrigger = resolveEligibility.canResolve;
          const isWithdrawal = resolveEligibility.withdrawalRequested;
          const headline = !hasContextualTrigger
            ? "Resolve Case"
            : isWithdrawal
              ? "Withdrawal Requested"
              : resolveEligibility.allNoData
                ? "No Responsive Data"
                : pipelineStats.identifiersComplete === pipelineStats.totalIdentifiers
                  ? "All Identifiers Complete"
                  : `${pipelineStats.deliveryDone} ${pipelineStats.deliveryDone === 1 ? 'Job' : 'Jobs'} Delivered`;
          const subline = hasContextualTrigger
            ? resolveEligibility.reason
            : "Resolve this case when you are ready. Pick a closure reason in the dialog.";
          return (
          <Card className="shadow-sm overflow-hidden relative">
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", isWithdrawal ? "bg-[#d83b01]" : "bg-[#8764b8]")} />
            <div className={cn(
              "p-4 flex items-center justify-between",
              isWithdrawal
                ? "bg-gradient-to-r from-[#fef5f0] to-white"
                : "bg-gradient-to-r from-[#f3eef8] to-white"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded flex items-center justify-center",
                  isWithdrawal ? "bg-[#d83b01]" : "bg-[#8764b8]"
                )}>
                  {isWithdrawal
                    ? <AlertCircle className="w-5 h-5 text-white" />
                    : <CheckCircle2 className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h3 className="font-semibold text-[#323130]">{headline}</h3>
                  <p className="text-sm text-[#605e5c]">{subline}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {deliveredJobs.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "h-9",
                      isWithdrawal
                        ? "border-[#d83b01] text-[#d83b01] hover:bg-[#fef5f0]"
                        : "border-[#8764b8] text-[#8764b8] hover:bg-[#f3eef8]"
                    )}
                    onClick={() => setShowDeliveredReport(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Delivered Report ({deliveredJobs.length})
                  </Button>
                )}
                <Button
                  size="sm"
                  className={cn(
                    "h-9 text-white",
                    isWithdrawal
                      ? "bg-[#d83b01] hover:bg-[#c23301]"
                      : "bg-[#8764b8] hover:bg-[#7553a8]"
                  )}
                  onClick={() => {
                    // Pre-select an appropriate closure reason based on
                    // context. Mapped to the new 14-reason canon; legacy
                    // outliers (PartialDelivery, CancelledByLE) are still
                    // available in the picker if the RS explicitly picks.
                    let defaultReason: ResolutionReason | undefined;
                    if (formData.authorizationDesiredStatus === "Cancelled") {
                      defaultReason = "UserQuashed";
                    } else if (isWithdrawal || formData.authorizationDesiredStatus === "Withdrawn") {
                      defaultReason = "WithdrawnExternal";
                    } else if (resolveEligibility.allNoData) {
                      defaultReason = "NoData";
                    } else if (pipelineStats.identifiersComplete === pipelineStats.totalIdentifiers) {
                      defaultReason = "InfoProvided";
                    } else if (hasContextualTrigger) {
                      // Partial delivery state (some jobs done, not all) —
                      // keep the legacy outlier as the most-accurate label.
                      defaultReason = "PartialDelivery";
                    } else {
                      // No contextual trigger — let the RS pick.
                      defaultReason = undefined;
                    }
                    setResolveDialogMode("resolve");
                    setResolveDefaultReason(defaultReason);
                    setResolveDefaultNotes("");
                    setShowResolveCaseDialog(true);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Resolve Case
                </Button>
              </div>
            </div>
          </Card>
          );
        })()}

        {/* Readiness Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#f3f2f1] rounded-lg">
          {([
            { key: 'by-identifier' as const, label: 'By Identifier', count: pipelineStats.totalIdentifiers },
            { key: 'all' as const, label: 'All', count: pipelineStats.totalIdentifiers },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setReadinessFilter(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all",
                readinessFilter === tab.key
                  ? "bg-white shadow-sm font-medium text-[#323130]"
                  : "text-[#605e5c] hover:text-[#323130] hover:bg-white/50"
              )}
            >
              {tab.key === 'by-identifier' && <Users className="w-3.5 h-3.5 text-[#8764b8]" />}
              {tab.label}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-1.5 py-0 min-w-[20px] text-center",
                  readinessFilter === tab.key
                    ? tab.key === 'by-identifier'
                        ? "bg-[#e8d4f0] text-[#8764b8] border-[#8764b8]"
                        : "bg-[#deecf9] text-[#0078d4] border-[#0078d4]"
                    : "bg-white text-[#605e5c] border-[#c8c6c4]"
                )}
              >
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>

        {/* Manual Collection Services Section */}
        {manualJobs.length > 0 && (readinessFilter === 'all') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-amber-600" />
                <div>
                  <h2 className="text-lg font-semibold text-[#323130]">
                    Manual Collection Services ({manualJobs.length})
                  </h2>
                  <p className="text-sm text-[#605e5c]">
                    Services requiring manual data collection and status updates
                    {pipelineStats.identifiersManualBlockedOnly > 0 && (
                      <span className="text-amber-700 font-medium">
                        {' '}— {pipelineStats.identifiersManualBlockedOnly} {pipelineStats.identifiersManualBlockedOnly === 1 ? 'identifier is' : 'identifiers are'} blocked waiting on these
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {manualJobs.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  onClick={() => setManualSectionCollapsed(prev => !prev)}
                >
                  <ChevronDown className={cn("w-3.5 h-3.5 mr-1 transition-transform", manualSectionCollapsed ? "" : "rotate-180")} />
                  {manualSectionCollapsed ? "Expand All" : "Collapse All"}
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              {manualJobs.map((job) => (
                <div key={`${job.identifierId}-${job.serviceKey}`} className="border border-l-4 border-l-amber-500 rounded-lg shadow-sm overflow-hidden">
                  {/* Service header */}
                  <div className="bg-amber-50 px-4 py-3 border-b border-amber-200">
                    <div className="flex items-center gap-3">
                      <Wrench className="w-5 h-5 text-amber-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#323130]">{job.serviceName}</span>
                        </div>
                        <p className="text-xs text-[#605e5c] mt-0.5">
                          {job.identifierValue} ({job.identifierType}){job.identifier.taskId && <span className="ml-2">· Task ID: <span className="font-mono">{job.identifier.taskId}</span></span>}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Category rows */}
                  {!manualSectionCollapsed && (
                  <div className="p-4 space-y-2">
                    <ManualServiceCategories
                      categories={job.categories.map(cat => ({
                        categoryKey: cat.categoryKey,
                        category: {
                          collectionStatus: cat.collectionStatus,
                          publishStatus: cat.publishStatus,
                          deliveryStatus: cat.deliveryStatus,
                          jobId: cat.jobId,
                          publishJobId: cat.publishJobId,
                          deliveryJobId: cat.deliveryJobId,
                          lastUpdatedAt: cat.lastUpdatedAt,
                          lastUpdatedBy: cat.lastUpdatedBy,
                          startDate: cat.startDate,
                          endDate: cat.endDate,
                          createdOn: cat.createdOn,
                        }
                      }))}
                      service={job.service}
                      identifierId={job.identifierId}
                      identifierValue={job.identifierValue}
                      serviceKey={job.serviceKey}
                      formatCategoryName={formatCategoryName}
                      onStatusUpdate={handleManualStatusUpdate}
                    />
                  </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Automated Collection Services Section */}
        {filteredAutomatedJobs.length > 0 && readinessFilter !== 'by-identifier' && (() => {
          return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-[#0078d4]" />
                <div>
                  <h2 className="text-lg font-semibold text-[#323130]">
                    Fulfillment Tracker ({readinessFilter !== 'all' ? `${filteredAutomatedJobs.length} of ${automatedJobs.length}` : automatedJobs.length})
                  </h2>
                  <p className="text-sm text-[#605e5c]">
                    {readinessFilter === 'needs-action'
                      ? (pipelineStats.identifiersManualBlockedOnly > 0
                        ? `Showing identifiers that require your attention — including ${pipelineStats.identifiersManualBlockedOnly} blocked by manual collection`
                        : "Showing identifiers that require your attention")
                      : readinessFilter === 'complete'
                            ? "Showing identifiers with all pipeline stages complete"
                            : isEpocPr
                              ? "Preservation only — Collection lane (no Packaging / Delivery)"
                              : "Collection → Package → Delivery — sorted by readiness"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-[#8a8886] text-[#323130] hover:bg-[#f3f2f1]"
                  onClick={toggleExpandAll}
                >
                  {expandedIdentifiers.size === automatedJobs.length ? (
                    <>
                      <ChevronsUp className="w-4 h-4 mr-2" />
                      Collapse All
                    </>
                  ) : (
                    <>
                      <ChevronsDown className="w-4 h-4 mr-2" />
                      Expand All
                    </>
                  )}
                </Button>
              </div>
            </div>

          {filteredAutomatedJobs.map(({ identifier }) => {
            const isExpanded = expandedIdentifiers.has(identifier.id);
            
            // Count enabled categories for this identifier
            let enabledCount = 0;
            Object.entries(identifier.services).forEach(([svcKey, service]: [string, ServiceWithResults]) => {
              if (svcKey === "xbox") return;
              const showConsumer = service.includeConsumerAccount !== false;
              const showEnterprise = service.includeEnterpriseAccount === true;
              
              iterateServiceCategories(service, (_, category: SubCategory) => {
                if (category.enabled) {
                  const multiplier = (showConsumer && showEnterprise) ? 2 : 1;
                  enabledCount += multiplier;
                }
              });
            });

            const readiness = identifierReadiness.get(identifier.id);
            const isReadyToPublish = readiness?.state === 'ready-to-publish';
            const isReadyToDeliver = readiness?.state === 'ready-to-deliver';
            const isComplete = readiness?.state === 'complete';
            const isDelivering = readiness?.state === 'delivering';

            return (
              <Card
                key={identifier.id}
                className={cn(
                  "shadow-sm transition-all",
                  isReadyToPublish && "border-[#107c10] border-2",
                  isReadyToDeliver && "border-[#ca5010] border-2",
                  isDelivering && "border-[#ca5010] border-2",
                  isComplete && "border-[#107c10]/40 opacity-80",
                )}
              >
                {/* Identifier Header */}
                <div
                  className={cn(
                    "p-4 border-b border-[#edebe9] flex items-center justify-between cursor-pointer hover:bg-[#f3f2f1] transition-colors",
                    isReadyToPublish ? "bg-[#f3faf3]" : isReadyToDeliver ? "bg-[#fef9f5]" : isComplete ? "bg-[#f3faf3]/50" : "bg-[#faf9f8]"
                  )}
                  onClick={() => toggleIdentifier(identifier.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleIdentifier(identifier.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div>
                        <p className="text-xs text-[#605e5c] mb-1">Identifier</p>
                        <CopyableIdentifier value={identifier.value || "N/A"} variant="block" copyLabel="Copy identifier" />
                      </div>
                      <div>
                        <p className="text-xs text-[#605e5c] mb-1">Type</p>
                        <p className="text-sm text-[#323130]">{identifier.type || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#605e5c] mb-1">Task ID</p>
                        <CopyableText text={identifier.taskId} copyLabel="Copy task ID">
                          <p className="text-sm font-mono text-[#323130]">{identifier.taskId}</p>
                        </CopyableText>
                      </div>
                      <div>
                        <p className="text-xs text-[#605e5c] mb-1">Content Boundary</p>
                        {(() => {
                          // Collect unique storage regions across all services for this identifier
                          const regions = new Set<string>();
                          Object.entries(identifier.services).forEach(([svcKey, svc]: [string, any]) => {
                            if (svcKey === "xbox") return;
                            const planLoc = (identifier as any).fulfillmentPlan?.services?.[svcKey]?.dataCenterLocation;
                            const acctLoc = svc.accountExistence?.consumerStorageLocation || svc.accountExistence?.enterpriseStorageLocation;
                            const loc = planLoc || acctLoc;
                            if (loc) regions.add(loc);
                          });
                          if (regions.size === 0) return <p className="text-sm text-[#a19f9d]">—</p>;
                          const regionArr = Array.from(regions);
                          return (
                            <div className="flex items-center gap-1 flex-wrap">
                              <MapPin className="w-3 h-3 text-[#0078d4] flex-shrink-0" />
                              <p className="text-xs text-[#323130]">{regionArr.join(", ")}</p>
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <p className="text-xs text-[#605e5c] mb-1">Pipeline</p>
                        {readiness && readiness.totalJobs > 0 ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-[#0078d4] font-medium" title="Collection">{readiness.collectionComplete + readiness.collectionNoData}/{readiness.totalJobs}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-[#8a8886]" />
                            <span className="text-[#107c10] font-medium" title="Package">{readiness.publishComplete}/{readiness.alreadySubmitted || '—'}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-[#8a8886]" />
                            <span className="text-[#ca5010] font-medium" title="Delivery">{readiness.deliveryComplete}/{readiness.publishComplete || '—'}</span>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-[#0078d4]">{enabledCount} jobs</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-[#605e5c] mb-1">Status</p>
                        {getReadinessBadge(identifier.id)}
                      </div>
                    </div>
                  </div>

                  {/* Per-card CTA for ready-to-publish — selects all jobs for this identifier */}
                  {isReadyToPublish && (
                    <div className="flex-shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        disabled={cancellationLocked}
                        title={cancellationLockedTooltip}
                        className="h-9 bg-[#107c10] hover:bg-[#0e6b0e] text-white shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const jobKeys = publishableJobs
                            .filter(j => j.identifierId === identifier.id)
                            .map(j => j.jobKey);
                          setSelectedJobsForPublish(new Set(jobKeys));
                          setShowPublishReview(true);
                        }}
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Package All Jobs
                      </Button>
                    </div>
                  )}
                  {/* Per-card CTA for ready-to-deliver — selects all deliverable jobs for this identifier */}
                  {(isReadyToDeliver || isDelivering) && (() => {
                    const identifierDeliverableJobs = deliverableJobs.filter(j => j.identifierId === identifier.id);
                    if (identifierDeliverableJobs.length === 0) return null;
                    return (
                      <div className="flex-shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          disabled={cancellationLocked}
                          title={cancellationLockedTooltip}
                          className="h-9 bg-[#ca5010] hover:bg-[#b3480e] text-white shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const jobKeys = identifierDeliverableJobs.map(j => j.jobKey);
                            setSelectedJobsForDelivery(new Set(jobKeys));
                            setShowDeliveryReview(true);
                          }}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          {isDelivering ? `Deliver Remaining (${identifierDeliverableJobs.length})` : 'Deliver All Jobs'}
                        </Button>
                      </div>
                    );
                  })()}
                </div>

                {/* Manual collection pending callout inside automated cards */}
                {readiness?.hasManualPending && (
                  <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
                    <Wrench className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800 flex-1">
                      <span className="font-medium">{readiness.manualPending} manual {readiness.manualPending === 1 ? 'category' : 'categories'}</span> still need data entry before this identifier can fully progress to Package.
                      {readiness.allAutomatedDone && <span className="font-semibold"> All automated collection is complete — only manual input remains.</span>}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs border-amber-400 text-amber-700 hover:bg-amber-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReadinessFilter('by-identifier');
                        }}
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Enter Data Inline
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-amber-700 hover:bg-amber-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReadinessFilter('all');
                        }}
                      >
                        Manual Services
                      </Button>
                    </div>
                  </div>
                )}

                {/* Expanded Content - Services and Categories */}
                {isExpanded && (
                  <div className="p-4">
                    {Object.entries(identifier.services).map(([serviceKey, service]: [string, any]) => {
                      const enabledCategories: Array<[string, any]> = [];
                      iterateServiceCategories(service, (key, cat) => {
                        if (cat.enabled) enabledCategories.push([key, cat]);
                      });

                      // Automated categories go in the pipeline table here; manual categories
                      // flow to the existing "Manual Collection Services" section via manualJobs
                      const automatedCats = enabledCategories.filter(([key]) => !isManualCategory(serviceKey, key));

                      if (automatedCats.length === 0) return null;

                      // eEvidence cases get an extra "WISP Delivery" column that
                      // surfaces the WISP `/eevidence/deliverystatus` callback
                      // state separately from the general pipeline phase.
                      // Non-eEvidence cases keep the original 7-column layout.
                      const eEvidenceDeliveryActive = isEEvidenceDelivery(formData ?? null);
                      const tableGridCols = eEvidenceDeliveryActive
                        ? "md:grid-cols-[1.2fr_0.6fr_1fr_0.7fr_0.8fr_1.1fr_0.7fr_0.8fr]"
                        : "md:grid-cols-[1.2fr_0.6fr_1fr_0.7fr_0.8fr_1.2fr_0.8fr]";

                      // Determine if we need to show consumer and/or enterprise jobs
                      const showConsumer = service.includeConsumerAccount !== false;
                      const showEnterprise = service.includeEnterpriseAccount === true;

                      // Calculate total job count for this service (automated only).
                      // Each category contributes 1 row for the primary job plus N rows
                      // for its additionalJobs[] entries; account-type multiplier doubles
                      // the count when both consumer + enterprise are enabled.
                      const totalCategoryRows = automatedCats.reduce(
                        (sum: number, [, cat]: [string, any]) =>
                          sum + 1 + (cat?.additionalJobs?.length || 0),
                        0,
                      );
                      const accountTypeMultiplier = showConsumer && showEnterprise ? 2 : 1;
                      let serviceJobCount = totalCategoryRows * accountTypeMultiplier;

                      return (
                        <div key={serviceKey} className="mb-6 last:mb-0">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-[#0078d4]"></div>
                            <h3 className="font-semibold text-[#323130]">{formatServiceName(serviceKey)}</h3>
                            <Badge variant="outline" className="text-xs">
                              {serviceJobCount} {serviceJobCount === 1 ? 'job' : 'jobs'}
                            </Badge>
                            {showEnterprise && (
                              <Badge variant="outline" className="bg-[#fef9f5] text-[#ca5010] border-[#ca5010] text-xs">
                                <Building2 className="w-3 h-3 mr-1" />
                                Enterprise Enabled
                              </Badge>
                            )}
                            {/* Display Content Boundary from fulfillment plan or account existence */}
                            {(() => {
                              const planLoc = identifier.fulfillmentPlan?.services?.[serviceKey]?.dataCenterLocation;
                              const acctLoc = service.accountExistence?.consumerStorageLocation || service.accountExistence?.enterpriseStorageLocation;
                              const regionLabel = planLoc || acctLoc;
                              if (!regionLabel) return null;
                              return (
                                <Badge variant="outline" className="bg-[#e8f4fd] text-[#0078d4] border-[#0078d4]/30 text-xs">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {regionLabel}
                                </Badge>
                              );
                            })()}
                          </div>

                          <div className="ml-4">
                            {/* Table column headers — flex-wrapped so
                                the trailing Action column reserves the
                                exact same 140 px width as each row's
                                action column. Without this, the row's
                                action area shrinks the inner grid's
                                width and the 7 content columns drift
                                left relative to the header. */}
                            <div className="flex items-center px-3 py-1.5 bg-[#f3f2f1] border border-[#edebe9] rounded-t text-xs font-semibold text-[#605e5c] uppercase tracking-wide">
                              <div className={cn("flex-1 grid grid-cols-1 gap-4", tableGridCols)}>
                                <span>Data Type</span>
                                <span>Account Type</span>
                                <span>Date Range</span>
                                <span>Created</span>
                                <span>Job IDs</span>
                                <span>Phase Status</span>
                                {eEvidenceDeliveryActive && (
                                  <span
                                    title="WISP /eevidence/deliverystatus callback state — IA acknowledgement or error"
                                  >
                                    WISP Delivery
                                  </span>
                                )}
                                <span>Updated</span>
                              </div>
                              <span className="w-[140px] flex-shrink-0 ml-3 pl-3 border-l border-[#edebe9]">
                                Action
                              </span>
                            </div>
                            <div className="space-y-0">
                            {automatedCats.map(([categoryKey, originalCategory]: [string, any]) => {
                              // Create array of account types to display
                              const accountTypes: Array<{ type: 'consumer' | 'enterprise'; label: string; icon: any }> = [];

                              if (showConsumer) {
                                accountTypes.push({ type: 'consumer', label: 'Consumer', icon: User });
                              }
                              if (showEnterprise) {
                                accountTypes.push({ type: 'enterprise', label: 'Enterprise', icon: Building2 });
                              }

                              // If no specific account type flags, show as default (consumer)
                              if (accountTypes.length === 0) {
                                accountTypes.push({ type: 'consumer', label: 'Consumer', icon: User });
                              }

                              // Unfurl additionalJobs (duplicate jobs with different date
                              // ranges) into their own rendered rows. addJobIdx = -1 means
                              // the original/primary job; 0..N-1 maps to category.additionalJobs[].
                              const additionalJobs = originalCategory.additionalJobs || [];
                              const categoryVariants: Array<{ category: any; addJobIdx: number }> = [
                                { category: originalCategory, addJobIdx: -1 },
                                ...additionalJobs.map((aj: any, idx: number) => ({
                                  category: {
                                    ...originalCategory,
                                    jobId: aj.jobId,
                                    publishJobId: aj.publishJobId,
                                    deliveryJobId: aj.deliveryJobId,
                                    collectionStatus: aj.collectionStatus,
                                    publishStatus: aj.publishStatus,
                                    deliveryStatus: aj.deliveryStatus,
                                    startDate: aj.startDate,
                                    endDate: aj.endDate,
                                    createdOn: aj.createdOn,
                                    collectionStatusUpdatedAt: aj.collectionStatusUpdatedAt,
                                    publishStatusUpdatedAt: aj.publishStatusUpdatedAt,
                                    deliveryStatusUpdatedAt: aj.deliveryStatusUpdatedAt,
                                    deliveryError: aj.deliveryError,
                                    collectionError: aj.collectionError,
                                    publishError: aj.publishError,
                                  },
                                  addJobIdx: idx,
                                })),
                              ];

                              return (
                                <div key={categoryKey}>
                                  {categoryVariants.map(({ category, addJobIdx }) => (
                                  <React.Fragment key={`${categoryKey}-variant-${addJobIdx}`}>
                                  {accountTypes.map((accountType) => {
                                    const Icon = accountType.icon;
                                    const jobIdSuffix = accountType.type === 'enterprise' ? '-ENT' : '';
                                    const jobId = category.jobId ? `${category.jobId}${jobIdSuffix}` : null;
                                    
                                    const colStatus = category.collectionStatus || "Not Started";
                                    const pubStatus = category.publishStatus || "Not Started";
                                    const delStatus = category.deliveryStatus || "Not Started";

                                    // Determine current pipeline phase and status. EPOC-PR
                                    // (preservation) cases skip Package + Delivery and the
                                    // phase label flips to "Preservation".
                                    const getCurrentStage = () => {
                                      const phaseLabel = isEpocPr ? "Preservation" : "Collection";
                                      if (!isEpocPr) {
                                        if (delStatus === "DeliveryAcknowledged") return { phase: "Delivery", status: "Acknowledged", color: "text-[#0b6a0b]" };
                                        if (delStatus === "Complete") return { phase: "Delivery", status: "Complete", color: "text-[#107c10]" };
                                        if (delStatus === "Failed") return { phase: "Delivery", status: "Failed", color: "text-[#a4262c]" };
                                        if (delStatus === "Blocked") return { phase: "Delivery", status: "Blocked", color: "text-[#d83b01]" };
                                        if (delStatus === "Started" || delStatus === "In Progress") return { phase: "Delivery", status: "In Progress", color: "text-[#ca5010]" };
                                        if (pubStatus === "Complete") return { phase: "Package", status: "Complete", color: "text-[#107c10]" };
                                        if (pubStatus === "Failed") return { phase: "Package", status: "Failed", color: "text-[#a4262c]" };
                                        if (pubStatus === "Blocked") return { phase: "Package", status: "Blocked", color: "text-[#d83b01]" };
                                        if (pubStatus === "Started" || pubStatus === "In Progress") return { phase: "Package", status: "In Progress", color: "text-[#8764b8]" };
                                      }
                                      if (colStatus === "Complete") return { phase: phaseLabel, status: "Complete", color: "text-[#107c10]" };
                                      if (colStatus === "No Data") return { phase: phaseLabel, status: "No Data", color: "text-[#ca5010]" };
                                      if (colStatus === "Failed") return { phase: phaseLabel, status: "Failed", color: "text-[#a4262c]" };
                                      if (colStatus === "Blocked") return { phase: phaseLabel, status: "Blocked", color: "text-[#d83b01]" };
                                      if (colStatus === "Started" || colStatus === "In Progress") return { phase: phaseLabel, status: "In Progress", color: "text-[#0078d4]" };
                                      return { phase: phaseLabel, status: "Not Started", color: "text-[#605e5c]" };
                                    };
                                    const currentStage = getCurrentStage();

                                    // EPOC-PR (preservation) cases never reach Delivery — a
                                    // completed Collection counts as fully complete.
                                    const isFullyComplete = isEpocPr
                                      ? colStatus === "Complete" || colStatus === "No Data" || colStatus === "Failed"
                                      : delStatus === "Complete" || colStatus === "No Data" || colStatus === "Failed";
                                    
                                    return (
                                      <div
                                        key={`${categoryKey}-${accountType.type}-${addJobIdx}`}
                                        className={cn(
                                          "flex items-center justify-between p-3 bg-white border rounded hover:border-[#c8c6c4] transition-colors",
                                          // Highlight any row that hit a pipeline error
                                          // (delivery WISP / publish / collection) so the RS
                                          // can spot it at a glance across both Identifier
                                          // and All views.
                                          delStatus === "Failed" || pubStatus === "Failed" || colStatus === "Failed"
                                            ? "border-[#a4262c]/40 bg-[#fff5f5]"
                                            : isFullyComplete
                                              ? "border-[#edebe9] bg-[#fcfcfc]"
                                              : "border-[#edebe9]"
                                        )}
                                      >
                                        <div className={cn("flex-1 grid grid-cols-1 gap-4 items-start", tableGridCols)}>

                                          {/* Data Category */}
                                          <div>
                                            <p className="text-sm font-medium text-[#323130]">
                                              {formatCategoryName(categoryKey)}
                                            </p>
                                          </div>
                                          {/* Account Type */}
                                          <div>
                                            <span className="inline-flex items-center gap-1">
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  "text-xs",
                                                  accountType.type === 'enterprise'
                                                    ? "bg-[#fef9f5] text-[#ca5010] border-[#ca5010]"
                                                    : "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
                                                )}
                                              >
                                                <Icon className="w-3 h-3 mr-1" />
                                                {accountType.label}
                                              </Badge>
                                              {(() => {
                                                // Resolved identifier — the internal ID the
                                                // collector uses for this account-type's job.
                                                // Surfaces in a hover bubble next to the
                                                // Consumer/Enterprise badge so the RS can
                                                // reference it during debug sessions with
                                                // engineering. Falls back to the first entry
                                                // in `consumerAccounts` / `enterpriseAccounts`
                                                // when the explicit `*ResolvedIdentifier` field
                                                // hasn't been seeded.
                                                const ax = service.accountExistence;
                                                const resolved = accountType.type === 'enterprise'
                                                  ? ax?.enterpriseResolvedIdentifier
                                                    ?? (ax?.enterpriseAccounts?.[0]
                                                      ? { type: "Resolved ID", value: ax.enterpriseAccounts[0] }
                                                      : null)
                                                  : ax?.consumerResolvedIdentifier
                                                    ?? (ax?.consumerAccounts?.[0]
                                                      ? { type: "Resolved ID", value: ax.consumerAccounts[0] }
                                                      : null);
                                                if (!resolved) return null;
                                                return (
                                                  <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <button
                                                          type="button"
                                                          aria-label={`Show resolved identifier for ${accountType.label}`}
                                                          className="text-[#605e5c] hover:text-[#0078d4] cursor-help leading-none"
                                                          onClick={(e) => e.stopPropagation()}
                                                        >
                                                          <Info className="w-3 h-3" />
                                                        </button>
                                                      </TooltipTrigger>
                                                      <TooltipContent side="top" className="text-xs max-w-[320px]">
                                                        <p className="font-semibold mb-1">Resolved identifier</p>
                                                        <p className="text-[11px] text-[#a19f9d] mb-0.5">{resolved.type}</p>
                                                        <p className="font-mono text-[11px] break-all">{resolved.value}</p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                );
                                              })()}
                                            </span>
                                            {(() => {
                                              const planLoc = (identifier as any).fulfillmentPlan?.services?.[serviceKey]?.dataCenterLocation;
                                              const acctLoc = accountType.type === 'enterprise'
                                                ? service.accountExistence?.enterpriseStorageLocation
                                                : service.accountExistence?.consumerStorageLocation;
                                              const loc = planLoc || acctLoc;
                                              if (!loc) return null;
                                              return (
                                                <TooltipProvider delayDuration={200}>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <p className="text-[10px] text-[#605e5c] mt-1 flex items-center gap-0.5 cursor-help">
                                                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                                        {loc}
                                                      </p>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="text-xs">
                                                      Content Boundary
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              );
                                            })()}
                                          </div>
                                          {/* Collection Date Range */}
                                          <div>
                                            {category.startDate && category.endDate ? (
                                              <p className="text-[11px] text-[#323130]">
                                                {new Date(category.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                {" — "}
                                                {new Date(category.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                              </p>
                                            ) : (
                                              <p className="text-[11px] text-[#a19f9d] italic">No date range</p>
                                            )}
                                          </div>
                                          {/* Created On */}
                                          <div>
                                            {category.createdOn ? (
                                              <p className="text-[11px] text-[#323130]">
                                                {new Date(category.createdOn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                {" "}
                                                {new Date(category.createdOn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                              </p>
                                            ) : (
                                              <p className="text-[11px] text-[#a19f9d] italic">—</p>
                                            )}
                                          </div>
                                          {/* Job IDs */}
                                          <div>
                                            <div className="space-y-0.5">
                                              {(() => {
                                                // Invariant guard: every job must flow Collection → Package → Delivery,
                                                // so whenever publishStatus / deliveryStatus indicate work has happened
                                                // (Started / Complete / Failed / Acknowledged), the corresponding job ID
                                                // must exist. If the seed forgot to set it, derive a synthetic ID from the
                                                // collection jobId so the row never displays "C: id · P: — · D: id" which
                                                // would be structurally impossible.
                                                const publishRan =
                                                  category.publishStatus === "Started" ||
                                                  category.publishStatus === "Complete" ||
                                                  category.publishStatus === "Failed";
                                                const deliveryRan =
                                                  category.deliveryStatus === "Started" ||
                                                  category.deliveryStatus === "Complete" ||
                                                  category.deliveryStatus === "Failed" ||
                                                  category.deliveryStatus === "DeliveryAcknowledged";
                                                const pubJobId = category.publishJobId
                                                  ? `${category.publishJobId}${jobIdSuffix}`
                                                  : publishRan && category.jobId
                                                    ? `PUB-${category.jobId}${jobIdSuffix}`
                                                    : null;
                                                const delJobId = category.deliveryJobId
                                                  ? `${category.deliveryJobId}${jobIdSuffix}`
                                                  : deliveryRan && category.jobId
                                                    ? `DEL-${category.jobId}${jobIdSuffix}`
                                                    : null;
                                                // EPOC-PR (preservation) cases never run Package or
                                                // Delivery — surface only the Collection / Preservation
                                                // job ID. Production cases retain the full C / P / D
                                                // triplet.
                                                const phases = isEpocPr
                                                  ? [{ label: "C", id: jobId }]
                                                  : [
                                                      { label: "C", id: jobId },
                                                      { label: "P", id: pubJobId },
                                                      { label: "D", id: delJobId },
                                                    ];
                                                return phases.map((p) => (
                                                  <div key={p.label} className="flex items-center gap-1.5">
                                                    <span className="text-[10px] text-[#605e5c] w-3 shrink-0">{p.label}</span>
                                                    {p.id ? (
                                                      <CopyableText text={p.id} copyLabel={`Copy ${p.label} job ID`}>
                                                        <TruncatedText
                                                          className="text-[11px] font-mono text-[#323130] truncate min-w-0"
                                                          tooltipText={p.id}
                                                        >
                                                          {p.id}
                                                        </TruncatedText>
                                                      </CopyableText>
                                                    ) : (
                                                      <p className="text-[11px] font-mono text-[#a19f9d] italic">—</p>
                                                    )}
                                                  </div>
                                                ));
                                              })()}
                                            </div>
                                          </div>
                                          {/* Phase Status */}
                                          <div>
                                            <span className={cn("text-sm font-medium", currentStage.color)}>
                                              <span className="text-[#605e5c]">{currentStage.phase}:</span>{" "}
                                              {getStatusIcon(currentStage.status)}
                                              {currentStage.status}
                                            </span>
                                          </div>
                                          {/* WISP Delivery Status — eEvidence only. Maps the
                                              `deliveryStatus` value to a colored chip with the
                                              WISP `/eevidence/deliverystatus` callback metadata
                                              in the tooltip. Always visible per row when the
                                              case is eEvidence so the RS can scan vertically
                                              for Failed deliveries. */}
                                          {eEvidenceDeliveryActive && (
                                            <div>
                                              {(() => {
                                                if (delStatus === "Failed") {
                                                  return (
                                                    <span
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#fde7e9] text-[#a4262c] border border-[#a4262c]/40 text-[11px] font-semibold"
                                                      title={category.deliveryError ?? "WISP reported an error on this delivery."}
                                                    >
                                                      <XCircle className="w-3 h-3" aria-hidden="true" />
                                                      Failed
                                                    </span>
                                                  );
                                                }
                                                if (delStatus === "DeliveryAcknowledged") {
                                                  const ackTime = category.deliveryAcknowledgedAt;
                                                  return (
                                                    <span
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#dff6dd] text-[#0b6a0b] border border-[#107c10]/40 text-[11px] font-semibold"
                                                      title={
                                                        ackTime
                                                          ? `Acknowledged by IA at ${new Date(ackTime).toLocaleString()} (WISP 'Received')`
                                                          : "Acknowledged by IA (WISP 'Received')"
                                                      }
                                                    >
                                                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                                      Acknowledged
                                                    </span>
                                                  );
                                                }
                                                if (delStatus === "Complete") {
                                                  return (
                                                    <span
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f3faf2] text-[#107c10] border border-[#107c10]/30 text-[11px]"
                                                      title="Delivered on wire — awaiting IA acknowledgement"
                                                    >
                                                      <Truck className="w-3 h-3" aria-hidden="true" />
                                                      Awaiting Ack
                                                    </span>
                                                  );
                                                }
                                                if (delStatus === "Started" || delStatus === "In Progress") {
                                                  return (
                                                    <span
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#deecf9] text-[#0078d4] border border-[#0078d4]/30 text-[11px]"
                                                      title="Package in flight to IA receiver"
                                                    >
                                                      <Truck className="w-3 h-3" aria-hidden="true" />
                                                      In Flight
                                                    </span>
                                                  );
                                                }
                                                if (delStatus === "Blocked") {
                                                  return (
                                                    <span
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#fff4ce] text-[#7a3a00] border border-[#ca5010]/30 text-[11px]"
                                                    >
                                                      Blocked
                                                    </span>
                                                  );
                                                }
                                                return (
                                                  <span className="text-[11px] text-[#a19f9d]">—</span>
                                                );
                                              })()}
                                            </div>
                                          )}
                                          {/* Last Updated */}
                                          <div>
                                            <p className="text-xs text-[#323130]">
                                              {(category.deliveryStatusUpdatedAt || category.publishStatusUpdatedAt || category.collectionStatusUpdatedAt)
                                                ? formatDistanceToNow(new Date(category.deliveryStatusUpdatedAt || category.publishStatusUpdatedAt || category.collectionStatusUpdatedAt), { addSuffix: true })
                                                : "N/A"}
                                            </p>
                                          </div>
                                        </div>
                                        {/* Action column — contextual per stage */}
                                        {(() => {
                                          // EPOC-PR cases never advance past Collection — the
                                          // "Ready to Package" / "Ready to Deliver" / "Preparing"
                                          // / "Delivering" badges are all suppressed.
                                          const isPublishable = !isEpocPr && colStatus === "Complete" && pubStatus === "Not Started";
                                          const isDeliverable = !isEpocPr && pubStatus === "Complete" && delStatus === "Not Started";
                                          // eEvidence WISP error — first-priority branch so the
                                          // RS sees Retry over any other contextual badge.
                                          const isFailedDelivery =
                                            !isEpocPr &&
                                            delStatus === "Failed" &&
                                            isEEvidenceDelivery(formData ?? null);
                                          // Publish-stage failure — parallel to isFailedDelivery
                                          // but for the Package phase. Routes to the same Publish
                                          // Review dialog under retry mode.
                                          const isFailedPublish =
                                            !isEpocPr &&
                                            pubStatus === "Failed";
                                          // Collection-stage failure — parallel branch for the
                                          // Collection phase. Routes to a per-row retry that
                                          // flips Failed → Started directly (no review dialog).
                                          const isFailedCollection = colStatus === "Failed";

                                          return (
                                            <div className="w-[140px] flex-shrink-0 ml-3 pl-3 border-l border-[#edebe9] flex items-center gap-2 justify-end">
                                              {isFailedDelivery ? (
                                                <Button
                                                  variant="default"
                                                  size="sm"
                                                  className="h-8 px-3 text-xs bg-white hover:bg-[#fde7e9] text-[#a4262c] border-2 border-[#a4262c] shadow-sm font-semibold"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Pre-select THIS row's job key in the
                                                    // shared DeliveryReview dialog (retry mode).
                                                    // RS can expand the selection in the dialog
                                                    // to bulk-retry other failed jobs too.
                                                    const thisJobKey = getJobKey(
                                                      identifier.id,
                                                      serviceKey,
                                                      categoryKey,
                                                      accountType.type,
                                                      addJobIdx,
                                                    );
                                                    openDeliveryReviewForRetry([thisJobKey]);
                                                  }}
                                                >
                                                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                                  Retry
                                                </Button>
                                              ) : isFailedPublish ? (
                                                <Button
                                                  variant="default"
                                                  size="sm"
                                                  className="h-8 px-3 text-xs bg-white hover:bg-[#fde7e9] text-[#a4262c] border-2 border-[#a4262c] shadow-sm font-semibold"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Mirror of the delivery-retry path — open
                                                    // the PublishReview dialog in retry mode with
                                                    // THIS row pre-selected; RS can extend the
                                                    // selection there to bulk-retry.
                                                    const thisJobKey = getJobKey(
                                                      identifier.id,
                                                      serviceKey,
                                                      categoryKey,
                                                      accountType.type,
                                                      addJobIdx,
                                                    );
                                                    openPublishReviewForRetry([thisJobKey]);
                                                  }}
                                                >
                                                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                                  Retry
                                                </Button>
                                              ) : isFailedCollection ? (
                                                <Button
                                                  variant="default"
                                                  size="sm"
                                                  className="h-8 px-3 text-xs bg-white hover:bg-[#fde7e9] text-[#a4262c] border-2 border-[#a4262c] shadow-sm font-semibold"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Collection retry is a direct mutation — no
                                                    // review dialog. The bulk equivalent reuses
                                                    // the StartCollection confirm dialog under
                                                    // collectionStartMode === "retry".
                                                    handleRetryCollectionOne(
                                                      identifier.id,
                                                      serviceKey,
                                                      categoryKey,
                                                    );
                                                  }}
                                                >
                                                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                                  Retry
                                                </Button>
                                              ) : isPublishable ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#dff6dd] text-[#107c10]">
                                                  <Package className="w-3.5 h-3.5" />
                                                  <span className="text-xs">Ready</span>
                                                </div>
                                              ) : isDeliverable ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#fef9f5] text-[#ca5010]">
                                                  <Truck className="w-3.5 h-3.5" />
                                                  <span className="text-xs">Ready</span>
                                                </div>
                                              ) : isFullyComplete ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#dff6dd] text-[#107c10]">
                                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                                  <span className="text-xs">{colStatus === "No Data" ? "No Data" : colStatus === "Failed" ? "Failed" : "Done"}</span>
                                                </div>
                                              ) : pubStatus === "Started" ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#e8d4f0] text-[#8764b8]">
                                                  <Package className="w-3.5 h-3.5" />
                                                  <span className="text-xs">Preparing</span>
                                                </div>
                                              ) : delStatus === "Started" ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#fef9f5] text-[#ca5010]">
                                                  <Truck className="w-3.5 h-3.5" />
                                                  <span className="text-xs">Delivering</span>
                                                </div>
                                              ) : (
                                                <Button
                                                  variant="default"
                                                  size="sm"
                                                  className="h-8 px-3 text-xs bg-[#d13438] hover:bg-[#a4262c] text-white border-0 shadow-sm"
                                                  disabled={!jobId}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast.info(`Cancel requested for job ${jobId}`, {
                                                      description: `Data Type: ${formatCategoryName(categoryKey)} (${accountType.label})`,
                                                      action: {
                                                        label: "Confirm",
                                                        onClick: () => toast.success(`Job ${jobId} cancellation submitted`),
                                                      },
                                                    });
                                                  }}
                                                >
                                                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                                  Cancel
                                                </Button>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    );
                                  })}
                                  </React.Fragment>
                                  ))}
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
          </div>
          );
        })()}

        {/* By Identifier — unified per-identifier view combining manual + automated */}
        {readinessFilter === 'by-identifier' && (() => {
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[#8764b8]" />
                  <div>
                    <h2 className="text-lg font-semibold text-[#323130]">
                      By Identifier ({formData.identifiers.length})
                    </h2>
                    <p className="text-sm text-[#605e5c]">
                      All services grouped per identifier — manual and automated combined
                      {pipelineStats.identifiersWithManualPending > 0 && (
                        <span className="text-amber-700 ml-1">
                          · {pipelineStats.identifiersWithManualPending} with manual input pending
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-[#8a8886] text-[#323130] hover:bg-[#f3f2f1]"
                    onClick={toggleExpandAll}
                  >
                    {expandedIdentifiers.size === formData.identifiers.length ? (
                      <>
                        <ChevronsUp className="w-4 h-4 mr-2" />
                        Collapse All
                      </>
                    ) : (
                      <>
                        <ChevronsDown className="w-4 h-4 mr-2" />
                        Expand All
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {formData.identifiers.map((identifier) => {
                const isExpanded = expandedIdentifiers.has(identifier.id);
                const readiness = identifierReadiness.get(identifier.id);
                const isReadyToPublish = readiness?.state === 'ready-to-publish';
                const isReadyToDeliver = readiness?.state === 'ready-to-deliver';
                const isComplete = readiness?.state === 'complete';
                const isDelivering = readiness?.state === 'delivering';

                // Count all enabled categories across all services
                let totalEnabledCount = 0;
                let manualCount = 0;
                let automatedCount = 0;
                Object.entries(identifier.services).forEach(([svcKey, service]: [string, any]) => {
                  const showConsumer = service.includeConsumerAccount !== false;
                  const showEnterprise = service.includeEnterpriseAccount === true;
                  iterateServiceCategories(service, (_, category: any) => {
                    if (category.enabled) {
                      const multiplier = (showConsumer && showEnterprise) ? 2 : 1;
                      totalEnabledCount += multiplier;
                      if (svcKey === "xbox") {
                        manualCount += multiplier;
                      } else {
                        automatedCount += multiplier;
                      }
                    }
                  });
                });

                // Phase D — Partial GFR per-identifier collapse. When the
                // EA's Partial GFR names this identifier's LDTask, the
                // full services + categories body is replaced with a
                // single summary card. Production for non-blocked
                // identifiers continues normally; only this identifier
                // collapses.
                if (identifier.taskId && partialBlockedTaskIds.has(identifier.taskId)) {
                  return (
                    <Card
                      key={identifier.id}
                      className="shadow-sm border border-[#ca5010]/40 bg-[#fff8f3] opacity-95"
                    >
                      <div className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#fff4e6] border border-[#ca5010]/30 flex items-center justify-center flex-shrink-0">
                          <ShieldBan className="w-4 h-4 text-[#ca5010]" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge
                              variant="outline"
                              className="bg-white text-[#7a3a00] border-[#ca5010]/40 text-[10px] font-mono"
                            >
                              {identifier.taskId}
                            </Badge>
                            <CopyableIdentifier value={identifier.value || "N/A"} variant="inline" copyLabel="Copy identifier" />
                            <span className="text-xs text-[#605e5c]">· {identifier.type || "—"}</span>
                            <Badge
                              variant="outline"
                              className="bg-[#fff4e6] text-[#7a3a00] border-[#ca5010]/40 text-[11px]"
                              style={{ fontWeight: 700 }}
                            >
                              Blocked by EA — Partial GFR
                            </Badge>
                          </div>
                          <p className="text-xs text-[#605e5c]">
                            {totalEnabledCount} service + category job
                            {totalEnabledCount === 1 ? "" : "s"} suppressed.
                            See the GFR Panel above for the EA's reasons.
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={identifier.id}
                    className={cn(
                      "shadow-sm transition-all",
                      isReadyToPublish && "border-[#107c10] border-2",
                      isReadyToDeliver && "border-[#ca5010] border-2",
                      isDelivering && "border-[#ca5010] border-2",
                      isComplete && "border-[#107c10]/40 opacity-80",
                    )}
                  >
                    {/* Identifier Header */}
                    <div
                      className={cn(
                        "p-4 border-b border-[#edebe9] flex items-center justify-between cursor-pointer hover:bg-[#f3f2f1] transition-colors",
                        isReadyToPublish ? "bg-[#f3faf3]" : isReadyToDeliver ? "bg-[#fef9f5]" : isComplete ? "bg-[#f3faf3]/50" : "bg-[#faf9f8]"
                      )}
                      onClick={() => toggleIdentifier(identifier.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleIdentifier(identifier.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          <div>
                            <p className="text-xs text-[#605e5c] mb-1">Identifier</p>
                            <CopyableIdentifier value={identifier.value || "N/A"} variant="block" copyLabel="Copy identifier" />
                          </div>
                          <div>
                            <p className="text-xs text-[#605e5c] mb-1">Type</p>
                            <p className="text-sm text-[#323130]">{identifier.type || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#605e5c] mb-1">Task ID</p>
                            <CopyableText text={identifier.taskId} copyLabel="Copy task ID">
                              <p className="text-sm font-mono text-[#323130]">{identifier.taskId}</p>
                            </CopyableText>
                          </div>
                          <div>
                            <p className="text-xs text-[#605e5c] mb-1">Services</p>
                            <div className="flex items-center gap-1.5">
                              {automatedCount > 0 && (
                                <Badge variant="outline" className="text-xs bg-[#deecf9] text-[#0078d4] border-[#0078d4]/30">
                                  <Zap className="w-2.5 h-2.5 mr-0.5" />{automatedCount}
                                </Badge>
                              )}
                              {manualCount > 0 && (
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                                  <Wrench className="w-2.5 h-2.5 mr-0.5" />{manualCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-[#605e5c] mb-1">Pipeline</p>
                            {readiness && readiness.totalJobs > 0 ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-[#0078d4] font-medium" title="Collection">{readiness.collectionComplete + readiness.collectionNoData}/{readiness.totalJobs}</span>
                                <ArrowRight className="w-2.5 h-2.5 text-[#8a8886]" />
                                <span className="text-[#107c10] font-medium" title="Package">{readiness.publishComplete}/{readiness.alreadySubmitted || '—'}</span>
                                <ArrowRight className="w-2.5 h-2.5 text-[#8a8886]" />
                                <span className="text-[#ca5010] font-medium" title="Delivery">{readiness.deliveryComplete}/{readiness.publishComplete || '—'}</span>
                              </div>
                            ) : (
                              <p className="text-sm font-semibold text-[#0078d4]">{totalEnabledCount} jobs</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-[#605e5c] mb-1">Status</p>
                            {getReadinessBadge(identifier.id)}
                          </div>
                        </div>
                      </div>

                      {/* Per-card CTA for ready-to-publish */}
                      {isReadyToPublish && (
                        <div className="flex-shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="h-9 bg-[#107c10] hover:bg-[#0e6b0e] text-white shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const jobKeys = publishableJobs
                                .filter(j => j.identifierId === identifier.id)
                                .map(j => j.jobKey);
                              setSelectedJobsForPublish(new Set(jobKeys));
                              setShowPublishReview(true);
                            }}
                          >
                            <Package className="w-4 h-4 mr-2" />
                            Package All Jobs
                          </Button>
                        </div>
                      )}
                      {(isReadyToDeliver || isDelivering) && (() => {
                        const identifierDeliverableJobs = deliverableJobs.filter(j => j.identifierId === identifier.id);
                        if (identifierDeliverableJobs.length === 0) return null;
                        return (
                          <div className="flex-shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="h-9 bg-[#ca5010] hover:bg-[#b3480e] text-white shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const jobKeys = identifierDeliverableJobs.map(j => j.jobKey);
                                setSelectedJobsForDelivery(new Set(jobKeys));
                                setShowDeliveryReview(true);
                              }}
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              {isDelivering ? `Deliver Remaining (${identifierDeliverableJobs.length})` : 'Deliver All Jobs'}
                            </Button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Manual collection pending callout inside by-identifier cards */}
                    {readiness?.hasManualPending && (
                      <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
                        <Wrench className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <p className="text-xs text-amber-800 flex-1">
                          <span className="font-medium">{readiness.manualPending} manual {readiness.manualPending === 1 ? 'category' : 'categories'}</span> still need data entry before this identifier can fully progress to Package.
                          {readiness.allAutomatedDone && <span className="font-semibold"> All automated collection is complete — only manual input remains.</span>}
                        </p>
                      </div>
                    )}

                    {/* Expanded Content — ALL services including manual */}
                    {isExpanded && (
                      <div className="p-4">
                        <div className="mb-4">
                          <IdentifierAliasesPanel identifier={identifier} />
                        </div>
                        {Object.entries(identifier.services).map(([serviceKey, service]: [string, any]) => {
                          const enabledCategories: Array<[string, any]> = [];
                          iterateServiceCategories(service, (key, cat) => {
                            if (cat.enabled) enabledCategories.push([key, cat]);
                          });
                          if (enabledCategories.length === 0) return null;

                          const automatedCatsByID = enabledCategories.filter(([key]) => !isManualCategory(serviceKey, key));
                          const manualCatsByID    = enabledCategories.filter(([key]) =>  isManualCategory(serviceKey, key));

                          if (automatedCatsByID.length === 0 && manualCatsByID.length === 0) return null;

                          const hasManual = manualCatsByID.length > 0;
                          const showConsumer = service.includeConsumerAccount !== false;
                          const showEnterprise = service.includeEnterpriseAccount === true;
                          // Count primary + additionalJobs rows per category; double when
                          // both account types are enabled (same logic as All view).
                          const totalAutomatedRows = automatedCatsByID.reduce(
                            (sum: number, [, cat]: [string, any]) =>
                              sum + 1 + (cat?.additionalJobs?.length || 0),
                            0,
                          );
                          const accountTypeMultiplier = showConsumer && showEnterprise && automatedCatsByID.length > 0 ? 2 : 1;
                          let serviceJobCount = totalAutomatedRows * accountTypeMultiplier;
                          serviceJobCount += manualCatsByID.length;

                          return (
                            <div key={serviceKey} className="mb-3 last:mb-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className={cn("w-2 h-2 rounded-full", hasManual && automatedCatsByID.length === 0 ? "bg-amber-500" : "bg-[#0078d4]")}></div>
                                <h3 className="font-semibold text-[#323130]">
                                  {formatServiceName(serviceKey)}
                                </h3>
                                <Badge variant="outline" className="text-xs">
                                  {serviceJobCount} {serviceJobCount === 1 ? 'job' : 'jobs'}
                                </Badge>
                                {hasManual && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                                    <Wrench className="w-3 h-3 mr-1" />
                                    Manual
                                  </Badge>
                                )}
                                {showEnterprise && automatedCatsByID.length > 0 && (
                                  <Badge variant="outline" className="bg-[#fef9f5] text-[#ca5010] border-[#ca5010] text-xs">
                                    <Building2 className="w-3 h-3 mr-1" />
                                    Enterprise Enabled
                                  </Badge>
                                )}
                                {/* Content Boundary */}
                                {(() => {
                                  const planLoc = (identifier as any).fulfillmentPlan?.services?.[serviceKey]?.dataCenterLocation;
                                  const acctLoc = service.accountExistence?.consumerStorageLocation || service.accountExistence?.enterpriseStorageLocation;
                                  const regionLabel = planLoc || acctLoc;
                                  if (!regionLabel) return null;
                                  return (
                                    <Badge variant="outline" className="bg-[#e8f4fd] text-[#0078d4] border-[#0078d4]/30 text-xs">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {regionLabel}
                                    </Badge>
                                  );
                                })()}
                              </div>

                              <div className="ml-4">
                                {/* Automated categories table */}
                                {automatedCatsByID.length > 0 && (
                                  <>
                                    {/* By-Identifier table header — same
                                        flex-wrap pattern so the trailing
                                        140 px Action area aligns the inner
                                        7-column grid with each row's
                                        inner grid. */}
                                    <div className="flex items-center px-3 py-1.5 bg-[#f3f2f1] border border-[#edebe9] rounded-t text-xs font-semibold text-[#605e5c] uppercase tracking-wide">
                                      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_1fr_0.7fr_0.8fr_1.2fr_0.8fr] gap-4">
                                        <span>Data Type</span>
                                        <span>Account Type</span>
                                        <span>Date Range</span>
                                        <span>Created</span>
                                        <span>Job IDs</span>
                                        <span>Phase Status</span>
                                        <span>Updated</span>
                                      </div>
                                      <span className="w-[140px] flex-shrink-0 ml-3 pl-3 border-l border-[#edebe9]">
                                        Action
                                      </span>
                                    </div>
                                    <div className="space-y-0">
                                    {automatedCatsByID.map(([categoryKey, originalCategory]: [string, any]) => {
                                      const accountTypes: Array<{ type: 'consumer' | 'enterprise'; label: string; icon: any }> = [];
                                      if (showConsumer) accountTypes.push({ type: 'consumer', label: 'Consumer', icon: User });
                                      if (showEnterprise) accountTypes.push({ type: 'enterprise', label: 'Enterprise', icon: Building2 });
                                      if (accountTypes.length === 0) accountTypes.push({ type: 'consumer', label: 'Consumer', icon: User });

                                      // Unfurl additionalJobs into their own rendered rows.
                                      // addJobIdx = -1 → primary job; 0..N-1 → additionalJobs[idx].
                                      const additionalJobs = originalCategory.additionalJobs || [];
                                      const categoryVariants: Array<{ category: any; addJobIdx: number }> = [
                                        { category: originalCategory, addJobIdx: -1 },
                                        ...additionalJobs.map((aj: any, idx: number) => ({
                                          category: {
                                            ...originalCategory,
                                            jobId: aj.jobId,
                                            publishJobId: aj.publishJobId,
                                            deliveryJobId: aj.deliveryJobId,
                                            collectionStatus: aj.collectionStatus,
                                            publishStatus: aj.publishStatus,
                                            deliveryStatus: aj.deliveryStatus,
                                            startDate: aj.startDate,
                                            endDate: aj.endDate,
                                            createdOn: aj.createdOn,
                                            collectionStatusUpdatedAt: aj.collectionStatusUpdatedAt,
                                            publishStatusUpdatedAt: aj.publishStatusUpdatedAt,
                                            deliveryStatusUpdatedAt: aj.deliveryStatusUpdatedAt,
                                            deliveryError: aj.deliveryError,
                                            collectionError: aj.collectionError,
                                            publishError: aj.publishError,
                                          },
                                          addJobIdx: idx,
                                        })),
                                      ];

                                      return (
                                        <div key={categoryKey}>
                                          {categoryVariants.map(({ category, addJobIdx }) => (
                                          <React.Fragment key={`${categoryKey}-variant-${addJobIdx}`}>
                                          {accountTypes.map((accountType) => {
                                            const Icon = accountType.icon;
                                            const jobIdSuffix = accountType.type === 'enterprise' ? '-ENT' : '';
                                            const jobId = category.jobId ? `${category.jobId}${jobIdSuffix}` : null;

                                            const colStatus = category.collectionStatus || "Not Started";
                                            const pubStatus = category.publishStatus || "Not Started";
                                            const delStatus = category.deliveryStatus || "Not Started";

                                            // EPOC-PR (preservation) cases skip Package + Delivery
                                            // and the phase label reads "Preservation".
                                            const getCurrentStage = () => {
                                              const phaseLabel = isEpocPr ? "Preservation" : "Collection";
                                              if (!isEpocPr) {
                                                if (delStatus === "Complete") return { phase: "Delivery", status: "Complete", color: "text-[#107c10]" };
                                                if (delStatus === "Failed") return { phase: "Delivery", status: "Failed", color: "text-[#a4262c]" };
                                                if (delStatus === "Blocked") return { phase: "Delivery", status: "Blocked", color: "text-[#d83b01]" };
                                                if (delStatus === "Started" || delStatus === "In Progress") return { phase: "Delivery", status: "In Progress", color: "text-[#ca5010]" };
                                                if (pubStatus === "Complete") return { phase: "Package", status: "Complete", color: "text-[#107c10]" };
                                                if (pubStatus === "Failed") return { phase: "Package", status: "Failed", color: "text-[#a4262c]" };
                                                if (pubStatus === "Blocked") return { phase: "Package", status: "Blocked", color: "text-[#d83b01]" };
                                                if (pubStatus === "Started" || pubStatus === "In Progress") return { phase: "Package", status: "In Progress", color: "text-[#8764b8]" };
                                              }
                                              if (colStatus === "Complete") return { phase: phaseLabel, status: "Complete", color: "text-[#107c10]" };
                                              if (colStatus === "No Data") return { phase: phaseLabel, status: "No Data", color: "text-[#ca5010]" };
                                              if (colStatus === "Failed") return { phase: phaseLabel, status: "Failed", color: "text-[#a4262c]" };
                                              if (colStatus === "Blocked") return { phase: phaseLabel, status: "Blocked", color: "text-[#d83b01]" };
                                              if (colStatus === "Started" || colStatus === "In Progress") return { phase: phaseLabel, status: "In Progress", color: "text-[#0078d4]" };
                                              return { phase: phaseLabel, status: "Not Started", color: "text-[#605e5c]" };
                                            };
                                            const currentStage = getCurrentStage();

                                            // EPOC-PR (preservation) cases never reach Delivery — a
                                            // completed Collection counts as fully complete.
                                            const isFullyComplete = isEpocPr
                                              ? colStatus === "Complete" || colStatus === "No Data" || colStatus === "Failed"
                                              : delStatus === "Complete" || colStatus === "No Data" || colStatus === "Failed";
                                            const thisJobKey = getJobKey(identifier.id, serviceKey, categoryKey, accountType.type, addJobIdx);
                                            // EPOC-PR cases never advance past Collection — neither
                                            // Publishable nor Deliverable branches should fire.
                                            const isPublishable = !isEpocPr && colStatus === "Complete" && pubStatus === "Not Started";
                                            const isDeliverable2 = !isEpocPr && pubStatus === "Complete" && delStatus === "Not Started";
                                            // Pipeline failure branches — same shape as the
                                            // By Identifier view's action column so the two
                                            // surfaces stay consistent.
                                            const isFailedDelivery =
                                              !isEpocPr &&
                                              delStatus === "Failed" &&
                                              isEEvidenceDelivery(formData ?? null);
                                            const isFailedPublish = !isEpocPr && pubStatus === "Failed";
                                            const isFailedCollection = colStatus === "Failed";

                                            return (
                                              <div
                                                key={`${categoryKey}-${accountType.type}-${addJobIdx}`}
                                                className={cn(
                                                  "flex items-center justify-between px-3 py-2 bg-white border-x border-b hover:border-[#c8c6c4] transition-colors",
                                                  delStatus === "Failed" || pubStatus === "Failed" || colStatus === "Failed"
                                                    ? "border-[#a4262c]/40 bg-[#fff5f5]"
                                                    : isFullyComplete ? "border-[#edebe9] bg-[#fcfcfc]" : "border-[#edebe9]"
                                                )}
                                              >
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_1fr_0.7fr_0.8fr_1.2fr_0.8fr] gap-4 items-start">
                                                  {/* Data Category */}
                                                  <div>
                                                    <p className="text-sm font-medium text-[#323130]">{formatCategoryName(categoryKey)}</p>
                                                  </div>
                                                  {/* Account Type */}
                                                  <div>
                                                    <span className="inline-flex items-center gap-1">
                                                      <Badge
                                                        variant="outline"
                                                        className={cn(
                                                          "text-xs",
                                                          accountType.type === 'enterprise'
                                                            ? "bg-[#fef9f5] text-[#ca5010] border-[#ca5010]"
                                                            : "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
                                                        )}
                                                      >
                                                        <Icon className="w-3 h-3 mr-1" />
                                                        {accountType.label}
                                                      </Badge>
                                                      {(() => {
                                                        // Resolved identifier hover bubble —
                                                        // mirrors the All view's badge tooltip
                                                        // so both surfaces show the same
                                                        // engineering-debug info.
                                                        const ax = service.accountExistence;
                                                        const resolved = accountType.type === 'enterprise'
                                                          ? ax?.enterpriseResolvedIdentifier
                                                            ?? (ax?.enterpriseAccounts?.[0]
                                                              ? { type: "Resolved ID", value: ax.enterpriseAccounts[0] }
                                                              : null)
                                                          : ax?.consumerResolvedIdentifier
                                                            ?? (ax?.consumerAccounts?.[0]
                                                              ? { type: "Resolved ID", value: ax.consumerAccounts[0] }
                                                              : null);
                                                        if (!resolved) return null;
                                                        return (
                                                          <TooltipProvider delayDuration={200}>
                                                            <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                <button
                                                                  type="button"
                                                                  aria-label={`Show resolved identifier for ${accountType.label}`}
                                                                  className="text-[#605e5c] hover:text-[#0078d4] cursor-help leading-none"
                                                                  onClick={(e) => e.stopPropagation()}
                                                                >
                                                                  <Info className="w-3 h-3" />
                                                                </button>
                                                              </TooltipTrigger>
                                                              <TooltipContent side="top" className="text-xs max-w-[320px]">
                                                                <p className="font-semibold mb-1">Resolved identifier</p>
                                                                <p className="text-[11px] text-[#a19f9d] mb-0.5">{resolved.type}</p>
                                                                <p className="font-mono text-[11px] break-all">{resolved.value}</p>
                                                              </TooltipContent>
                                                            </Tooltip>
                                                          </TooltipProvider>
                                                        );
                                                      })()}
                                                    </span>
                                                    {(() => {
                                                      const planLoc = (identifier as any).fulfillmentPlan?.services?.[serviceKey]?.dataCenterLocation;
                                                      const acctLoc = accountType.type === 'enterprise'
                                                        ? service.accountExistence?.enterpriseStorageLocation
                                                        : service.accountExistence?.consumerStorageLocation;
                                                      const loc = planLoc || acctLoc;
                                                      if (!loc) return null;
                                                      return (
                                                        <p className="text-[10px] text-[#605e5c] mt-1 flex items-center gap-0.5">
                                                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                                          {loc}
                                                        </p>
                                                      );
                                                    })()}
                                                  </div>
                                                  {/* Date Range */}
                                                  <div>
                                                    {category.startDate && category.endDate ? (
                                                      <p className="text-[11px] text-[#323130]">
                                                        {new Date(category.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                        {" — "}
                                                        {new Date(category.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                      </p>
                                                    ) : (
                                                      <p className="text-[11px] text-[#a19f9d] italic">No date range</p>
                                                    )}
                                                  </div>
                                                  {/* Created On */}
                                                  <div>
                                                    {category.createdOn ? (
                                                      <p className="text-[11px] text-[#323130]">
                                                        {new Date(category.createdOn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                        {" "}
                                                        {new Date(category.createdOn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                                      </p>
                                                    ) : (
                                                      <p className="text-[11px] text-[#a19f9d] italic">—</p>
                                                    )}
                                                  </div>
                                                  {/* Job IDs */}
                                                  <div>
                                                    <div className="space-y-0.5">
                                                      {(() => {
                                                        const pubJobId = category.publishJobId ? `${category.publishJobId}${jobIdSuffix}` : null;
                                                        const delJobId = category.deliveryJobId ? `${category.deliveryJobId}${jobIdSuffix}` : null;
                                                        // EPOC-PR (preservation) cases never run Package
                                                        // or Delivery — surface only the Collection /
                                                        // Preservation job ID.
                                                        const phases = isEpocPr
                                                          ? [{ label: "C", id: jobId }]
                                                          : [
                                                              { label: "C", id: jobId },
                                                              { label: "P", id: pubJobId },
                                                              { label: "D", id: delJobId },
                                                            ];
                                                        return phases.map((p) => (
                                                          <div key={p.label} className="flex items-center gap-1.5">
                                                            <span className="text-[10px] text-[#605e5c] w-3 shrink-0">{p.label}</span>
                                                            {p.id ? (
                                                              <CopyableText text={p.id} copyLabel={`Copy ${p.label} job ID`}>
                                                                <p className="text-[11px] font-mono text-[#323130] truncate">{p.id}</p>
                                                              </CopyableText>
                                                            ) : (
                                                              <p className="text-[11px] font-mono text-[#a19f9d] italic">—</p>
                                                            )}
                                                          </div>
                                                        ));
                                                      })()}
                                                    </div>
                                                  </div>
                                                  {/* Phase Status */}
                                                  <div>
                                                    <span className={cn("text-sm font-medium", currentStage.color)}>
                                                      <span className="text-[#605e5c]">{currentStage.phase}:</span>{" "}
                                                      {getStatusIcon(currentStage.status)}
                                                      {currentStage.status}
                                                    </span>
                                                  </div>
                                                  {/* Last Updated */}
                                                  <div>
                                                    <p className="text-xs text-[#323130]">
                                                      {(category.deliveryStatusUpdatedAt || category.publishStatusUpdatedAt || category.collectionStatusUpdatedAt)
                                                        ? formatDistanceToNow(new Date(category.deliveryStatusUpdatedAt || category.publishStatusUpdatedAt || category.collectionStatusUpdatedAt), { addSuffix: true })
                                                        : "N/A"}
                                                    </p>
                                                  </div>
                                                </div>
                                                {/* Action column */}
                                                <div className="w-[140px] flex-shrink-0 ml-3 pl-3 border-l border-[#edebe9] flex items-center gap-2 justify-end">
                                                  {isFailedDelivery ? (
                                                    <Button
                                                      variant="default"
                                                      size="sm"
                                                      className="h-8 px-3 text-xs bg-white hover:bg-[#fde7e9] text-[#a4262c] border-2 border-[#a4262c] shadow-sm font-semibold"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDeliveryReviewForRetry([thisJobKey]);
                                                      }}
                                                    >
                                                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                                      Retry
                                                    </Button>
                                                  ) : isFailedPublish ? (
                                                    <Button
                                                      variant="default"
                                                      size="sm"
                                                      className="h-8 px-3 text-xs bg-white hover:bg-[#fde7e9] text-[#a4262c] border-2 border-[#a4262c] shadow-sm font-semibold"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openPublishReviewForRetry([thisJobKey]);
                                                      }}
                                                    >
                                                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                                      Retry
                                                    </Button>
                                                  ) : isFailedCollection ? (
                                                    <Button
                                                      variant="default"
                                                      size="sm"
                                                      className="h-8 px-3 text-xs bg-white hover:bg-[#fde7e9] text-[#a4262c] border-2 border-[#a4262c] shadow-sm font-semibold"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRetryCollectionOne(
                                                          identifier.id,
                                                          serviceKey,
                                                          categoryKey,
                                                        );
                                                      }}
                                                    >
                                                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                                      Retry
                                                    </Button>
                                                  ) : isPublishable ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#dff6dd] text-[#107c10]">
                                                      <Package className="w-3.5 h-3.5" />
                                                      <span className="text-xs">Ready</span>
                                                    </div>
                                                  ) : isDeliverable2 ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#fef9f5] text-[#ca5010]">
                                                      <Truck className="w-3.5 h-3.5" />
                                                      <span className="text-xs">Ready</span>
                                                    </div>
                                                  ) : isFullyComplete ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#dff6dd] text-[#107c10]">
                                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                                      <span className="text-xs">{colStatus === "No Data" ? "No Data" : colStatus === "Failed" ? "Failed" : "Done"}</span>
                                                    </div>
                                                  ) : pubStatus === "Started" ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#e8d4f0] text-[#8764b8]">
                                                      <Package className="w-3.5 h-3.5" />
                                                      <span className="text-xs">Preparing</span>
                                                    </div>
                                                  ) : delStatus === "Started" ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#fef9f5] text-[#ca5010]">
                                                      <Truck className="w-3.5 h-3.5" />
                                                      <span className="text-xs">Delivering</span>
                                                    </div>
                                                  ) : (
                                                    <Button
                                                      variant="default"
                                                      size="sm"
                                                      className="h-8 px-3 text-xs bg-[#d13438] hover:bg-[#a4262c] text-white border-0 shadow-sm"
                                                      disabled={!jobId}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        toast.info(`Cancel requested for job ${jobId}`, {
                                                          description: `Data Type: ${formatCategoryName(categoryKey)} (${accountType.label})`,
                                                          action: {
                                                            label: "Confirm",
                                                            onClick: () => toast.success(`Job ${jobId} cancellation submitted`),
                                                          },
                                                        });
                                                      }}
                                                    >
                                                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                                      Cancel
                                                    </Button>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                          </React.Fragment>
                                          ))}
                                        </div>
                                      );
                                    })}
                                    </div>
                                  </>
                                )}
                                {/* Manual categories */}
                                {manualCatsByID.length > 0 && (
                                  <div className={cn(automatedCatsByID.length > 0 ? "mt-3" : "")}>
                                    <ManualServiceCategories
                                      categories={manualCatsByID.map(([categoryKey, category]: [string, any]) => ({ categoryKey, category }))}
                                      service={service}
                                      identifierId={identifier.id}
                                      identifierValue={identifier.value}
                                      serviceKey={serviceKey}
                                      formatCategoryName={formatCategoryName}
                                      onStatusUpdate={handleManualStatusUpdate}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          );
        })()}

        {/* Empty state when filter yields no results */}
        {readinessFilter !== 'all' && readinessFilter !== 'by-identifier' && filteredAutomatedJobs.length === 0 && (
          <Card className="border-[#edebe9] shadow-sm">
            <div className="p-8 text-center">
              {readinessFilter === 'needs-action' ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-[#107c10] mx-auto mb-3" />
                  <p className="text-[#323130] mb-1">No identifiers need action right now</p>
                  <p className="text-sm text-[#605e5c]">All identifiers are either still collecting or already in the pipeline</p>
                </>
              ) : (
                <>
                  <Truck className="w-12 h-12 text-[#8a8886] mx-auto mb-3" />
                  <p className="text-[#605e5c] mb-1">No identifiers have completed the full pipeline yet</p>
                  <p className="text-sm text-[#a19f9d]">
                    Identifiers will appear here after they complete all three pipeline stages: Collection → Packaging → Delivery.
                    Start fulfillment to begin moving identifiers through.
                  </p>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-[#c8c6c4] hover:bg-[#f3f2f1]"
                onClick={() => setReadinessFilter('all')}
              >
                Show All Identifiers
              </Button>
            </div>
          </Card>
        )}

        {/* Pipeline Status Matrix Report Dialog */}
        <Dialog open={showPipelineReport} onOpenChange={setShowPipelineReport}>
          <DialogContent className="sm:max-w-[90vw] w-[1400px] max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col !top-[5rem] !translate-y-0 !z-[60]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <LayoutGrid className="w-5 h-5 text-[#0078d4]" />
                Pipeline Status Matrix
              </DialogTitle>
              <DialogDescription>
                Per-identifier × per-category status across Collection → Package → Delivery for Case {formData.caseId}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-2 -mx-6 px-6">
              <PipelineStatusMatrix formData={formData} />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[#edebe9]">
              <Button
                variant="outline"
                className="h-10 border-[#c8c6c4] hover:bg-[#f3f2f1]"
                onClick={() => setShowPipelineReport(false)}
              >
                Close
              </Button>
              <Button
                variant="outline"
                className="h-10 border-[#0078d4] text-[#0078d4] hover:bg-[#deecf9]"
              >
                <Download className="w-4 h-4 mr-2" />
                Export as CSV
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Publish Review Dialog — job-level. Doubles as the Retry Package
            dialog when `publishReviewMode === "retry"`. The IIFE below
            shadows `publishableJobs` with the mode-aware source list so the
            rest of the body iterates the right pool (Failed jobs in retry
            mode, Not Started + Collection-Complete jobs in submit mode). */}
        <Dialog
          open={showPublishReview}
          onOpenChange={(open) => {
            setShowPublishReview(open);
            if (!open) setPublishReviewMode("submit");
          }}
        >
          <DialogContent className={cn(
              "max-h-[calc(100vh-8rem)] overflow-y-auto !top-[5rem] !translate-y-0 !z-[60] transition-all duration-300",
              documentPanelOpen
                ? "sm:max-w-[calc(90vw-500px)] w-[900px] !left-[calc(50%-250px)] !translate-x-[-50%]"
                : "sm:max-w-[90vw] w-[1400px]"
            )}>
            {(() => {
              const isRetry = publishReviewMode === "retry";
              // Local shadow: when the dialog runs in retry mode, the rest
              // of the body — which references `publishableJobs` — resolves
              // to the Failed-publish-job list instead.
              const publishableJobs = isRetry
                ? retryablePublishJobs
                : allPipelineJobs.filter(j =>
                    j.collectionStatus === "Complete" &&
                    (!j.publishStatus || j.publishStatus === "Not Started")
                  );
              return (
                <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Package className={cn("w-5 h-5", isRetry ? "text-[#a4262c]" : "text-[#107c10]")} />
                {isRetry ? "Retry Package — Review & Resubmit" : "Review & Submit to Package"}
              </DialogTitle>
              <DialogDescription>
                {isRetry
                  ? "Confirm the failed package jobs to resubmit. Selected jobs will flip back to Started for the next packaging attempt."
                  : "Review the selected collection jobs that will be submitted for packaging. Each job will receive a unique Package Job ID."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Case Context */}
              <Card className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0078d4] rounded-l-xl" />
                <div className="p-4">
                  <h3 className="font-semibold text-[#323130] mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0078d4]" />
                    Case Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">LNS Case Number</p>
                      <p className="text-sm font-medium text-[#323130]">{formData.caseId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Agency Case Number</p>
                      <p className="text-sm font-medium text-[#323130]">{formData.agencyCaseNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Agency</p>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#605e5c]" />
                        <p className="text-sm font-medium text-[#323130]">{formData.agency}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Request Type</p>
                      <p className="text-sm font-medium text-[#323130]">{formData.requestType || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Legal Demand Verification */}
              <Card className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ca5010] rounded-l-xl" />
                <div className="p-4">
                  <div className="flex items-start gap-3 p-3 bg-[#fef9f5] border border-[#ca5010]/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-[#ca5010] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-[#323130] mb-2">
                        Verify the data categories below fall within the authorized scope of the attached legal demand.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-[#ca5010] text-[#ca5010] hover:bg-[#fef9f5]"
                        onClick={() => {
                          setDocumentPanelOpen(true);
                        }}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        View Legal Demand Documents
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Jobs Selection Table */}
              <Card className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#107c10] rounded-l-xl" />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[#323130] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#107c10]" />
                      {isRetry ? "Select Failed Packages to Retry" : "Select Jobs for Preparing"} ({selectedJobsForPublish.size} of {publishableJobs.length} selected)
                    </h3>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="dialog-select-all-publish"
                        checked={publishableJobs.length > 0 && selectedJobsForPublish.size === publishableJobs.length}
                        onCheckedChange={() => {
                          if (selectedJobsForPublish.size === publishableJobs.length) {
                            setSelectedJobsForPublish(new Set());
                          } else {
                            setSelectedJobsForPublish(new Set(publishableJobs.map(j => j.jobKey)));
                          }
                        }}
                        className="border-[#107c10] data-[state=checked]:bg-[#107c10] data-[state=checked]:border-[#107c10]"
                      />
                      <label htmlFor="dialog-select-all-publish" className="text-sm text-[#323130] cursor-pointer select-none">
                        {selectedJobsForPublish.size === publishableJobs.length ? 'Deselect all' : 'Select all'}
                      </label>
                    </div>
                  </div>
                  {(() => {
                    // Group ALL publishable jobs by identifier (show all, with checkboxes)
                    const byIdentifier = new Map<string, PipelineJob[]>();
                    publishableJobs.forEach(j => {
                      if (!byIdentifier.has(j.identifierId)) byIdentifier.set(j.identifierId, []);
                      byIdentifier.get(j.identifierId)!.push(j);
                    });

                    return (
                      <div className="space-y-3">
                        {Array.from(byIdentifier.entries()).map(([identifierId, jobs]) => {
                          const selectedCount = jobs.filter(j => selectedJobsForPublish.has(j.jobKey)).length;
                          return (
                          <Card key={identifierId} className="bg-[#faf9f8] border-[#edebe9]">
                            <div className="p-3">
                              <div className="flex items-center gap-3 mb-2 pb-2 border-b border-[#edebe9]">
                                <Checkbox
                                  checked={selectedCount === jobs.length}
                                  onCheckedChange={() => {
                                    const jobKeys = jobs.map(j => j.jobKey);
                                    if (selectedCount === jobs.length) {
                                      setSelectedJobsForPublish(prev => {
                                        const next = new Set(prev);
                                        jobKeys.forEach(k => next.delete(k));
                                        return next;
                                      });
                                    } else {
                                      setSelectedJobsForPublish(prev => {
                                        const next = new Set(prev);
                                        jobKeys.forEach(k => next.add(k));
                                        return next;
                                      });
                                    }
                                  }}
                                  className="border-[#107c10] data-[state=checked]:bg-[#107c10] data-[state=checked]:border-[#107c10]"
                                />
                                <div className="flex-1 grid grid-cols-4 gap-3">
                                  <div>
                                    <p className="text-xs text-[#605e5c] mb-0.5">Identifier</p>
                                    <p className="text-sm font-medium text-[#323130]">{jobs[0].identifierValue}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-[#605e5c] mb-0.5">Type</p>
                                    <p className="text-sm text-[#323130]">{jobs[0].identifierType}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-[#605e5c] mb-0.5">Task ID</p>
                                    <p className="text-xs font-mono text-[#323130]">{jobs[0].taskId}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-[#605e5c] mb-0.5">Content Boundary</p>
                                    {(() => {
                                      const regions = new Set(jobs.map(j => j.storageLocation).filter(Boolean));
                                      if (regions.size === 0) return <p className="text-xs text-[#a19f9d]">—</p>;
                                      return (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-[#0078d4] flex-shrink-0" />
                                          <p className="text-xs text-[#323130]">{Array.from(regions).join(", ")}</p>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <Badge variant="outline" className={cn("text-xs", selectedCount === jobs.length ? "bg-[#dff6dd] text-[#107c10] border-[#107c10]" : "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]")}>
                                  {selectedCount}/{jobs.length} selected
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                {jobs.map((job) => {
                                  const isSelected = selectedJobsForPublish.has(job.jobKey);
                                  return (
                                  <div
                                    key={job.jobKey}
                                    className={cn(
                                      "flex items-center gap-3 py-1.5 px-2 rounded border cursor-pointer transition-colors",
                                      isSelected
                                        ? "bg-[#f3faf3] border-[#107c10]/40 hover:bg-[#e8f5e8]"
                                        : "bg-white border-[#edebe9] hover:bg-[#f3f2f1] opacity-60"
                                    )}
                                    onClick={() => toggleJobForPublish(job.jobKey)}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleJobForPublish(job.jobKey)}
                                      className="border-[#107c10] data-[state=checked]:bg-[#107c10] data-[state=checked]:border-[#107c10]"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-sm text-[#323130] flex-1">{job.categoryName}</span>
                                    <Badge variant="outline" className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-xs">
                                      {job.serviceName}
                                    </Badge>
                                    <Badge variant="outline" className={cn("text-xs", job.isManual ? "bg-[#fff4ce] text-[#8a6d3b] border-[#8a6d3b]" : "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]")}>
                                      {job.accountType === 'enterprise' ? 'Ent' : 'Con'}
                                    </Badge>
                                    {job.storageLocation && (
                                      <Badge variant="outline" className="bg-[#e8f4fd] text-[#0078d4] border-[#0078d4]/30 text-[10px] px-1.5 py-0">
                                        <MapPin className="w-2.5 h-2.5 mr-0.5" />
                                        {job.storageLocation}
                                      </Badge>
                                    )}
                                    {job.jobId && (
                                      <CopyableText text={job.jobId} copyLabel="Copy">
                                        <span className="text-xs font-mono text-[#605e5c]">{job.jobId}</span>
                                      </CopyableText>
                                    )}
                                    {job.isManual && (
                                      <Badge variant="outline" className="bg-[#fff4ce] text-[#8a6d3b] border-[#8a6d3b] text-xs">
                                        Manual
                                      </Badge>
                                    )}
                                  </div>
                                  );
                                })}
                              </div>
                            </div>
                          </Card>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </Card>

              {/* Summary */}
              {(() => {
                const selectedJobs = publishableJobs.filter(j => selectedJobsForPublish.has(j.jobKey));
                const uniqueIdentifiers = new Set(selectedJobs.map(j => j.identifierId));
                const manualCount = selectedJobs.filter(j => j.isManual).length;
                return (
                  <Card className={cn(isRetry ? "bg-[#fde7e9] border-[#a4262c]" : "bg-[#dff6dd] border-[#107c10]")}>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <Package className={cn("w-5 h-5 mt-0.5", isRetry ? "text-[#a4262c]" : "text-[#107c10]")} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#323130] mb-1">{isRetry ? "Retry Summary" : "Package Summary"}</h3>
                          <p className="text-sm text-[#323130]">
                            {isRetry ? "Retrying" : "Submitting"} <strong>{selectedJobs.length}</strong> {selectedJobs.length === 1 ? 'job' : 'jobs'}
                            {manualCount > 0 ? ` (${manualCount} manual)` : ''} across <strong>{uniqueIdentifiers.size}</strong> {uniqueIdentifiers.size === 1 ? 'identifier' : 'identifiers'} for Case <strong>{formData.caseId}</strong>.
                            {isRetry
                              ? " Each job will flip from Failed back to Started; the prior error is cleared."
                              : " Each job will receive a unique Package Job ID for tracking."}
                          </p>
                          {(() => {
                            const regions = new Set(selectedJobs.map(j => j.storageLocation).filter(Boolean));
                            if (regions.size === 0) return null;
                            return (
                              <p className="text-sm text-[#323130] mt-1 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#0078d4] flex-shrink-0" />
                                Data storage {regions.size === 1 ? 'region' : 'regions'}: <strong>{Array.from(regions).join(", ")}</strong>
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#edebe9]">
              <Button
                variant="outline"
                onClick={() => setShowPublishReview(false)}
                className="h-10 border-[#c8c6c4] hover:bg-[#f3f2f1]"
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPublishReview(false);
                  handlePublishSelected();
                }}
                disabled={selectedJobsForPublish.size === 0}
                className={cn(
                  "h-10",
                  selectedJobsForPublish.size > 0
                    ? isRetry
                      ? "bg-[#a4262c] hover:bg-[#8a2121] text-white"
                      : "bg-[#107c10] hover:bg-[#0e6b0e] text-white"
                    : "bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed"
                )}
              >
                {isRetry ? <RotateCcw className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                {isRetry
                  ? `Confirm & Retry Package (${selectedJobsForPublish.size})`
                  : `Confirm & Submit to Package (${selectedJobsForPublish.size})`}
              </Button>
            </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Delivery Review Dialog — doubles as the Retry Delivery
            dialog when `deliveryReviewMode === "retry"`. The IIFE
            below shadows `deliverableJobs` with the mode-aware source
            list so the existing dialog body iterates the right pool
            (Failed jobs in retry mode, Not-Started-publishComplete
            jobs in submit mode). */}
        <Dialog open={showDeliveryReview} onOpenChange={(open) => {
          setShowDeliveryReview(open);
          // When the dialog closes, reset to submit mode so the next
          // opener inherits the default.
          if (!open) setDeliveryReviewMode("submit");
        }}>
          <DialogContent className={cn(
              "max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col !top-[5rem] !translate-y-0 !z-[60] transition-all duration-300",
              documentPanelOpen
                ? "sm:max-w-[calc(90vw-500px)] w-[900px] !left-[calc(50%-250px)] !translate-x-[-50%]"
                : "sm:max-w-[90vw] w-[1400px]"
            )}>
            {(() => {
              const isRetry = deliveryReviewMode === "retry";
              // Local shadow: when the dialog runs in retry mode, the
              // rest of the body — which references `deliverableJobs` —
              // resolves to the Failed-job list instead.
              const deliverableJobs = isRetry ? retryableJobs : (
                allPipelineJobs.filter(j =>
                  j.publishStatus === "Complete" &&
                  (!j.deliveryStatus || j.deliveryStatus === "Not Started")
                )
              );
              return (
            <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Truck className={cn("w-5 h-5", isRetry ? "text-[#a4262c]" : "text-[#ca5010]")} />
                {isRetry
                  ? "Retry Delivery — Review & Resubmit"
                  : "Review & Submit to Delivery"}
              </DialogTitle>
              <DialogDescription>
                {isRetry
                  ? "Confirm the failed deliveries to resubmit. Selected jobs will flip back to Started for the next WISP attempt."
                  : "Confirm the published data to deliver, the case details, and the delivery recipients before submitting."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-5 py-3 -mx-6 px-6">
              {/* Case Details Section */}
              <Card className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0078d4] rounded-l-xl" />
                <div className="p-4">
                  <h3 className="font-semibold text-[#323130] mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0078d4]" />
                    Case Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">LNS Case Number</p>
                      <p className="text-sm font-medium text-[#323130]">{formData.caseId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Agency Case Number</p>
                      <p className="text-sm font-medium text-[#323130]">{formData.agencyCaseNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Request Type</p>
                      <p className="text-sm font-medium text-[#323130]">{formData.requestType || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Jurisdiction</p>
                      <p className="text-sm font-medium text-[#323130]">{formData.jurisdiction || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Agency & Delivery Recipients */}
              <Card className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ca5010] rounded-l-xl" />
                <div className="p-4">
                  <h3 className="font-semibold text-[#323130] mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#ca5010]" />
                    Delivering To: {formData.agency}
                  </h3>
                  {formData.agencyAddress && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-[#605e5c]">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {[formData.agencyAddress.number, formData.agencyAddress.city, formData.agencyAddress.stateProvince, formData.agencyAddress.postalCode]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#605e5c] uppercase tracking-wide">Agency Recipient Contacts ({formData.agents.length})</p>
                    {formData.agents.map((agent) => (
                      <Card key={agent.id} className="bg-[#fef9f5] border-[#f7ddc9]">
                        <div className="p-3">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-xs text-[#605e5c] mb-0.5">Name</p>
                              <p className="text-sm font-medium text-[#323130]">{agent.name}</p>
                              <p className="text-xs text-[#605e5c]">{agent.title || agent.role}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#605e5c] mb-0.5">Role</p>
                              <p className="text-sm text-[#323130]">{agent.role}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#605e5c] mb-0.5">Email</p>
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-[#605e5c]" />
                                <p className="text-sm text-[#323130]">{agent.email}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-[#605e5c] mb-0.5">Phone</p>
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-[#605e5c]" />
                                <p className="text-sm text-[#323130]">{agent.phone}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Select Jobs for Delivery */}
              <Card className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8764b8] rounded-l-xl" />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[#323130] flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#8764b8]" />
                      Select Data for Delivery ({selectedJobsForDelivery.size} of {deliverableJobs.length} selected)
                    </h3>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="dialog-select-all-delivery"
                        checked={deliverableJobs.length > 0 && selectedJobsForDelivery.size === deliverableJobs.length}
                        onCheckedChange={() => {
                          if (selectedJobsForDelivery.size === deliverableJobs.length) {
                            setSelectedJobsForDelivery(new Set());
                          } else {
                            setSelectedJobsForDelivery(new Set(deliverableJobs.map(j => j.jobKey)));
                          }
                        }}
                        className="border-[#ca5010] data-[state=checked]:bg-[#ca5010] data-[state=checked]:border-[#ca5010]"
                      />
                      <label htmlFor="dialog-select-all-delivery" className="text-sm text-[#323130] cursor-pointer select-none">
                        {selectedJobsForDelivery.size === deliverableJobs.length ? 'Deselect all' : 'Select all'}
                      </label>
                    </div>
                  </div>
                  {(() => {
                    // Group ALL deliverable jobs by identifier → service (show all, with checkboxes)
                    const byIdentifier = new Map<string, PipelineJob[]>();
                    deliverableJobs.forEach(j => {
                      if (!byIdentifier.has(j.identifierId)) byIdentifier.set(j.identifierId, []);
                      byIdentifier.get(j.identifierId)!.push(j);
                    });

                    return (
                      <div className="space-y-3">
                        {Array.from(byIdentifier.entries()).map(([identifierId, jobs]) => {
                          const selectedCount = jobs.filter(j => selectedJobsForDelivery.has(j.jobKey)).length;
                          // Group by service within identifier
                          const byService = new Map<string, PipelineJob[]>();
                          jobs.forEach(j => {
                            if (!byService.has(j.serviceKey)) byService.set(j.serviceKey, []);
                            byService.get(j.serviceKey)!.push(j);
                          });

                          return (
                            <Card key={identifierId} className="bg-[#faf9f8] border-[#edebe9]">
                              <div className="p-3">
                                <div className="flex items-center gap-3 mb-2 pb-2 border-b border-[#edebe9]">
                                  <Checkbox
                                    checked={selectedCount === jobs.length}
                                    onCheckedChange={() => {
                                      const jobKeys = jobs.map(j => j.jobKey);
                                      if (selectedCount === jobs.length) {
                                        setSelectedJobsForDelivery(prev => {
                                          const next = new Set(prev);
                                          jobKeys.forEach(k => next.delete(k));
                                          return next;
                                        });
                                      } else {
                                        setSelectedJobsForDelivery(prev => {
                                          const next = new Set(prev);
                                          jobKeys.forEach(k => next.add(k));
                                          return next;
                                        });
                                      }
                                    }}
                                    className="border-[#ca5010] data-[state=checked]:bg-[#ca5010] data-[state=checked]:border-[#ca5010]"
                                  />
                                  <User className="w-4 h-4 text-[#605e5c]" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-[#323130]">{jobs[0].identifierValue}</p>
                                    <p className="text-xs text-[#605e5c]">{jobs[0].identifierType} · Task: {jobs[0].taskId}</p>
                                  </div>
                                  {(() => {
                                    const regions = new Set(jobs.map(j => j.storageLocation).filter(Boolean));
                                    if (regions.size === 0) return null;
                                    return (
                                      <Badge variant="outline" className="bg-[#e8f4fd] text-[#0078d4] border-[#0078d4]/30 text-xs">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {Array.from(regions).join(", ")}
                                      </Badge>
                                    );
                                  })()}
                                  <Badge variant="outline" className={cn("text-xs", selectedCount === jobs.length ? "bg-[#fef9f5] text-[#ca5010] border-[#ca5010]" : "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]")}>
                                    {selectedCount}/{jobs.length} selected
                                  </Badge>
                                </div>
                                {/* Service → Categories */}
                                {Array.from(byService.entries()).map(([serviceKey, serviceJobs]) => (
                                  <div key={serviceKey} className="mb-2 last:mb-0">
                                    <p className="text-xs font-semibold text-[#0078d4] mb-1 flex items-center gap-1">
                                      <Database className="w-3 h-3" />
                                      {serviceJobs[0].serviceName}
                                    </p>
                                    <div className="ml-4 space-y-1">
                                      {serviceJobs.map(job => {
                                        const isSelected = selectedJobsForDelivery.has(job.jobKey);
                                        return (
                                        <div
                                          key={job.jobKey}
                                          className={cn(
                                            "flex items-center gap-2 py-1 px-2 rounded border text-sm cursor-pointer transition-colors",
                                            isSelected
                                              ? "bg-[#fef9f5] border-[#ca5010]/40 hover:bg-[#fdf3ec]"
                                              : "bg-white border-[#edebe9] hover:bg-[#f3f2f1] opacity-60"
                                          )}
                                          onClick={() => toggleJobForDelivery(job.jobKey)}
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleJobForDelivery(job.jobKey)}
                                            className="border-[#ca5010] data-[state=checked]:bg-[#ca5010] data-[state=checked]:border-[#ca5010]"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          <span className="flex-1 text-[#323130]">{job.categoryName}</span>
                                          <Badge variant="outline" className="text-xs bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]">
                                            {job.accountType === 'enterprise' ? 'Ent' : 'Con'}
                                          </Badge>
                                          {job.storageLocation && (
                                            <Badge variant="outline" className="bg-[#e8f4fd] text-[#0078d4] border-[#0078d4]/30 text-[10px] px-1.5 py-0">
                                              <MapPin className="w-2.5 h-2.5 mr-0.5" />
                                              {job.storageLocation}
                                            </Badge>
                                          )}
                                          {job.publishJobId && (
                                            <CopyableText text={job.publishJobId} copyLabel="Copy">
                                              <span className="text-xs font-mono text-[#605e5c]">{job.publishJobId}</span>
                                            </CopyableText>
                                          )}
                                        </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </Card>

              {/* Delivery Summary */}
              {(() => {
                const selectedJobs = deliverableJobs.filter(j => selectedJobsForDelivery.has(j.jobKey));
                const uniqueIdentifiers = new Set(selectedJobs.map(j => j.identifierId));
                const uniqueServices = new Set(selectedJobs.map(j => j.serviceName));

                return (
                  <Card className="bg-[#fef9f5] border-[#ca5010]">
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <Truck className="w-5 h-5 text-[#ca5010] mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#323130] mb-1">Delivery Summary</h3>
                          <p className="text-sm text-[#323130]">
                            Delivering <strong>{selectedJobs.length}</strong> published {selectedJobs.length === 1 ? 'data package' : 'data packages'} across <strong>{uniqueIdentifiers.size}</strong> {uniqueIdentifiers.size === 1 ? 'identifier' : 'identifiers'} and <strong>{uniqueServices.size}</strong> {uniqueServices.size === 1 ? 'service' : 'services'} from Case <strong>{formData.caseId}</strong> to <strong>{formData.agents.length}</strong> {formData.agents.length === 1 ? 'recipient' : 'recipients'} at <strong>{formData.agency}</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#edebe9]">
              <Button
                variant="outline"
                onClick={() => setShowDeliveryReview(false)}
                className="h-10 border-[#c8c6c4] hover:bg-[#f3f2f1]"
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeliveryReview(false);
                  handleDeliverySelected();
                }}
                disabled={selectedJobsForDelivery.size === 0}
                className={cn(
                  "h-10",
                  selectedJobsForDelivery.size > 0
                    ? isRetry
                      ? "bg-[#a4262c] hover:bg-[#8a2121] text-white"
                      : "bg-[#ca5010] hover:bg-[#b3480e] text-white"
                    : "bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed"
                )}
              >
                {isRetry ? (
                  <RotateCcw className="w-4 h-4 mr-2" />
                ) : (
                  <Truck className="w-4 h-4 mr-2" />
                )}
                {isRetry
                  ? `Retry Delivery (${selectedJobsForDelivery.size})`
                  : `Submit to Delivery (${selectedJobsForDelivery.size})`}
              </Button>
            </div>
            </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Resolve Case Dialog (Phase 5c.5+) — shared with DataEntryForm */}
        <ResolveCaseDialog
          open={showResolveCaseDialog}
          onOpenChange={setShowResolveCaseDialog}
          caseId={formData.caseId}
          mode={resolveDialogMode}
          defaultReason={resolveDefaultReason}
          defaultNotes={resolveDefaultNotes}
          pipelineSummary={{
            collection: {
              numerator: collectionStats.complete + collectionStats.noData,
              denominator: collectionStats.totalCategories,
            },
            packaged: {
              numerator: pipelineStats.publishDone,
              denominator: pipelineStats.publishSubmitted || 0,
            },
            delivered: {
              numerator: pipelineStats.deliveryDone,
              denominator: pipelineStats.publishDone || 0,
            },
          }}
          warningMessage={
            resolveEligibility.withdrawalRequested ? (
              <span>
                The requesting agency has submitted a withdrawal for this case.
                Resolving will close all active pipeline jobs and mark this case
                as withdrawn.
              </span>
            ) : pipelineStats.identifiersComplete < pipelineStats.totalIdentifiers ? (
              <span>
                <strong>
                  {pipelineStats.totalIdentifiers - pipelineStats.identifiersComplete}
                </strong>{" "}
                {pipelineStats.totalIdentifiers - pipelineStats.identifiersComplete === 1
                  ? "identifier has"
                  : "identifiers have"}{" "}
                not completed the full pipeline. Resolving now will close any
                remaining jobs.
              </span>
            ) : undefined
          }
          onResolve={handleResolveCase}
        />

        {/* Attorney Escalation Dialog — Collection stage parity with the
            Triage/Fulfillment-stage dialog mounted by DataEntryForm. */}
        <EscalateToAttorneyDialog
          open={escalateDialogOpen}
          onOpenChange={setEscalateDialogOpen}
          caseId={formData.caseId}
          mode={escalateDialogMode}
          current={getActiveAttorneyEscalation(formData)}
          identifiers={formData.identifiers}
          onSubmit={handleEscalateSubmit}
        />

        {/* Retract Form 3 Dialog — opened from the GFR Panel's
            Form3Response+None variant CTA when Collection is the
            active stage. */}
        <RetractForm3Dialog
          open={showRetractForm3Dialog}
          onOpenChange={setShowRetractForm3Dialog}
          referencedForm3Id={formData.eevidenceGroundsForRefusal?.referencedForm3Id}
          onConfirm={handleConfirmRetractForm3}
        />

        {/* Retry Delivery now reuses the DeliveryReview dialog above
            with `deliveryReviewMode === "retry"`. The familiar
            "Submit to Delivery" review pattern doubles as the retry
            confirmation surface — see openDeliveryReviewForRetry(). */}

        {/* Delivered Report Dialog */}
        <Dialog open={showDeliveredReport} onOpenChange={setShowDeliveredReport}>
          <DialogContent className="sm:max-w-[90vw] w-[1000px] max-h-[calc(100vh-8rem)] overflow-y-auto !top-[5rem] !translate-y-0 !z-[60]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Truck className="w-5 h-5 text-[#ca5010]" />
                Delivered Report
              </DialogTitle>
              <DialogDescription>
                Detailed breakdown of all {deliveredJobs.length} delivered {deliveredJobs.length === 1 ? 'job' : 'jobs'} for Case {formData.caseId}.
              </DialogDescription>
            </DialogHeader>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3 py-3">
              <div className="p-3 bg-[#f3f2f1] rounded-lg text-center">
                <p className="text-xs text-[#605e5c]">Total Delivered</p>
                <p className="text-2xl font-semibold text-[#ca5010]">{deliveredJobs.length}</p>
              </div>
              <div className="p-3 bg-[#f3f2f1] rounded-lg text-center">
                <p className="text-xs text-[#605e5c]">Identifiers</p>
                <p className="text-2xl font-semibold text-[#323130]">{new Set(deliveredJobs.map(j => j.identifierId)).size}</p>
              </div>
              <div className="p-3 bg-[#f3f2f1] rounded-lg text-center">
                <p className="text-xs text-[#605e5c]">Services</p>
                <p className="text-2xl font-semibold text-[#323130]">{new Set(deliveredJobs.map(j => j.serviceKey)).size}</p>
              </div>
              <div className="p-3 bg-[#f3f2f1] rounded-lg text-center">
                <p className="text-xs text-[#605e5c]">Storage Regions</p>
                <p className="text-2xl font-semibold text-[#323130]">{new Set(deliveredJobs.filter(j => j.storageLocation).map(j => j.storageLocation)).size}</p>
              </div>
            </div>

            {/* Delivered Jobs grouped by Identifier */}
            <div className="space-y-4 max-h-[calc(100vh-26rem)] overflow-y-auto">
              {Array.from(
                deliveredJobs.reduce((groups, job) => {
                  const key = job.identifierId;
                  if (!groups.has(key)) {
                    groups.set(key, {
                      identifierValue: job.identifierValue,
                      identifierType: job.identifierType,
                      taskId: job.taskId,
                      jobs: [],
                    });
                  }
                  groups.get(key)!.jobs.push(job);
                  return groups;
                }, new Map<string, { identifierValue: string; identifierType: string; taskId: string; jobs: PipelineJob[] }>())
              ).map(([identifierId, group]) => (
                <div key={identifierId} className="border border-[#edebe9] rounded-lg overflow-hidden">
                  {/* Identifier Header */}
                  <div className="bg-[#faf9f8] px-4 py-3 flex items-center justify-between border-b border-[#edebe9]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center bg-[#ca5010]/10">
                        {group.identifierType === 'email' ? (
                          <Mail className="w-4 h-4 text-[#ca5010]" />
                        ) : group.identifierType === 'phone' ? (
                          <Phone className="w-4 h-4 text-[#ca5010]" />
                        ) : (
                          <User className="w-4 h-4 text-[#ca5010]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#323130]">{group.identifierValue}</p>
                        <p className="text-xs text-[#605e5c]">
                          {group.identifierType.charAt(0).toUpperCase() + group.identifierType.slice(1)}
                          {group.taskId && <> · Task ID: <span className="font-mono">{group.taskId}</span></>}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-[#fef9f5] text-[#ca5010] border-[#ca5010]">
                      <Truck className="w-3 h-3 mr-1" />
                      {group.jobs.length} {group.jobs.length === 1 ? 'job' : 'jobs'} delivered
                    </Badge>
                  </div>

                  {/* Jobs Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#f3f2f1] text-left">
                          <th className="px-4 py-2 text-xs font-medium text-[#605e5c]">Service</th>
                          <th className="px-4 py-2 text-xs font-medium text-[#605e5c]">Data Type</th>
                          <th className="px-4 py-2 text-xs font-medium text-[#605e5c]">Account</th>
                          <th className="px-4 py-2 text-xs font-medium text-[#605e5c]">Collection Job ID</th>
                          <th className="px-4 py-2 text-xs font-medium text-[#605e5c]">Package Job ID</th>
                          <th className="px-4 py-2 text-xs font-medium text-[#605e5c]">Delivery Job ID</th>
                          <th className="px-4 py-2 text-xs font-medium text-[#605e5c]">Content Boundary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edebe9]">
                        {group.jobs.map((job) => (
                          <tr key={job.jobKey} className="hover:bg-[#faf9f8]">
                            <td className="px-4 py-2.5">
                              <span className="text-[#323130]">{job.serviceName}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-[#323130]">{job.categoryName}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                job.accountType === 'enterprise'
                                  ? "bg-[#f0f6ff] text-[#0078d4] border-[#0078d4]/30"
                                  : "bg-[#f3f2f1] text-[#605e5c] border-[#c8c6c4]"
                              )}>
                                {job.accountType === 'enterprise' ? 'Enterprise' : 'Consumer'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5">
                              {job.jobId ? (
                                <CopyableText text={job.jobId} className="font-mono text-xs text-[#0078d4]" />
                              ) : (
                                <span className="text-xs text-[#a19f9d]">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {job.publishJobId ? (
                                <CopyableText text={job.publishJobId} className="font-mono text-xs text-[#107c10]" />
                              ) : (
                                <span className="text-xs text-[#a19f9d]">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {job.deliveryJobId ? (
                                <CopyableText text={job.deliveryJobId} className="font-mono text-xs text-[#ca5010]" />
                              ) : (
                                <span className="text-xs text-[#a19f9d]">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {job.storageLocation ? (
                                <Badge variant="outline" className="text-xs bg-[#f0f6ff] text-[#0078d4] border-[#0078d4]/30">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {job.storageLocation}
                                </Badge>
                              ) : (
                                <span className="text-xs text-[#a19f9d]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {deliveredJobs.length === 0 && (
                <div className="text-center py-8 text-[#a19f9d]">
                  <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No jobs have been delivered yet.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-[#edebe9]">
              <Button
                variant="outline"
                onClick={() => setShowDeliveredReport(false)}
                className="h-10 border-[#c8c6c4] hover:bg-[#f3f2f1]"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </PageContainer>
      </div>

      {/* Document Review Panel — uses the shared DocumentViewerPanel so
          Collection picks up Verify / Reject + the per-document properties
          view at parity with Triage and Review Case. The inline panel
          that previously rendered three hand-coded read-only document
          cards (no verify/reject, no tabs, no image viewer) is retired. */}
      {documentPanelOpen && (
        <DocumentViewerPanel
          legalDemandFormData={formData}
          onOpenCase={onOpenCase}
          focusDocRequest={docFocusRequest}
          showFulfillmentSummary={showPublishReview || showDeliveryReview}
          documentPanelWidth={documentPanelWidth}
          documentPanelMaxWidth={documentPanelMaxWidth}
          onResize={setDocumentPanelWidth}
          availableDocuments={availableDocuments}
          openDocumentIds={openDocumentIds}
          setOpenDocumentIds={setOpenDocumentIds}
          activeDocumentId={activeDocumentId}
          setActiveDocumentId={setActiveDocumentId}
          selectedDocumentToOpen={selectedDocumentToOpen}
          setSelectedDocumentToOpen={setSelectedDocumentToOpen}
          documentDetailsExpanded={documentDetailsExpanded}
          setDocumentDetailsExpanded={setDocumentDetailsExpanded}
          documentInvalidReasons={documentInvalidReasons}
          setDocumentInvalidReasons={setDocumentInvalidReasons}
          documentVerifications={documentVerifications}
          verifiedDocumentsCount={verifiedDocumentsCount}
          attachmentZoom={attachmentZoom}
          setAttachmentZoom={setAttachmentZoom}
          attachmentRotation={attachmentRotation}
          setAttachmentRotation={setAttachmentRotation}
          onVerifyDocument={handleVerifyDocument}
          onRejectDocument={handleRejectDocument}
          onUndoVerifyDocument={handleUndoVerifyDocument}
          onClose={() => setDocumentPanelOpen(false)}
          modalCloseButtonRef={modalCloseButtonRef}
          modalTriggerButtonRef={modalTriggerButtonRef}
        />
      )}
      {/* (Inline retired Document Review Panel below — kept for reference
          while the shared component beds in. Wrapped in a `false` guard
          so it never renders. Safe to delete once the shared panel is
          confirmed working on Collection.) */}
      {false && documentPanelOpen && (
        <div className={cn(
          "bg-white shadow-2xl border-l-2 border-[#0078d4]/20 flex flex-col w-[480px]",
          showPublishReview || showDeliveryReview
            ? "fixed top-0 bottom-0 right-0 z-[62]"
            : "absolute top-0 bottom-0 right-0 z-[60]"
        )}>
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-white to-blue-50/30">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[#323130] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0078d4]" />
                  Legal Document Review
                </h2>
                <p className="text-xs text-[#605e5c] mt-1">
                  Verify data release scope against legal demand
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setDocumentPanelOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Case Context */}
            <div className="p-3 bg-[#f3f2f1] rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#605e5c]">Case ID</p>
                  <p className="text-sm font-medium text-[#323130]">{formData.caseId}</p>
                </div>
                <div>
                  <p className="text-xs text-[#605e5c]">Request Type</p>
                  <p className="text-sm font-medium text-[#323130]">{formData.requestType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#605e5c]">Agency</p>
                  <p className="text-sm font-medium text-[#323130]">{formData.agency}</p>
                </div>
                <div>
                  <p className="text-xs text-[#605e5c]">Jurisdiction</p>
                  <p className="text-sm font-medium text-[#323130]">{formData.jurisdiction || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Attached Legal Documents */}
            {[
              {
                id: 'warrant-1',
                name: 'Search Warrant - Electronic Data',
                type: 'Search Warrant',
                status: 'Valid',
                documentId: `DOC-2024-SW-${formData.caseId || '000000'}`,
                approver: 'Magistrate John P. Williams',
                approvedDate: 'Sep 25, 2024',
                expirationDate: 'Sep 28, 2024',
                scope: 'Electronic communications, stored data, and subscriber records for specified accounts within authorized time period.',
              },
              {
                id: 'subpoena-1',
                name: 'Court Subpoena - Subscriber Records',
                type: 'Court Subpoena',
                status: 'Valid',
                documentId: `DOC-2024-CS-${formData.caseId || '000000'}`,
                approver: 'Clerk of Court - Maria Rodriguez',
                approvedDate: 'Sep 25, 2024',
                expirationDate: 'Dec 25, 2024',
                scope: 'Subscriber information and transactional records per court order requirements.',
              },
              {
                id: 'ndo-1',
                name: 'Nondisclosure Order - 180 Day',
                type: 'Nondisclosure Order',
                status: 'Active',
                documentId: `DOC-2024-NDO-${formData.caseId || '000000'}`,
                approver: 'Hon. Judge Sarah K. Mitchell',
                approvedDate: 'Sep 25, 2024',
                expirationDate: 'Mar 24, 2025',
                scope: 'Government nondisclosure pursuant to 18 U.S.C. § 2705(b). Disclosure prohibited for 180 days.',
              },
            ].map((doc) => (
              <Card key={doc.id} className="border-[#edebe9] overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-[#faf9f8] to-white border-b border-[#edebe9]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0078d4]" />
                      <span className="text-sm font-medium text-[#323130]">{doc.type}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        doc.status === 'Valid' ? "bg-[#dff6dd] text-[#107c10] border-[#107c10]" :
                        doc.status === 'Active' ? "bg-[#deecf9] text-[#0078d4] border-[#0078d4]" :
                        "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
                      )}
                    >
                      {doc.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#605e5c] mt-1">{doc.name}</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-[#a19f9d]">Document ID</p>
                      <p className="text-xs font-mono text-[#323130]">{doc.documentId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#a19f9d]">Approved By</p>
                      <p className="text-xs text-[#323130]">{doc.approver}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#a19f9d]">Approved</p>
                      <p className="text-xs text-[#323130]">{doc.approvedDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#a19f9d]">Expires</p>
                      <p className="text-xs text-[#323130]">{doc.expirationDate}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#edebe9]">
                    <p className="text-xs text-[#a19f9d] mb-1">Authorized Scope</p>
                    <p className="text-xs text-[#323130] leading-relaxed">{doc.scope}</p>
                  </div>
                </div>
              </Card>
            ))}

            {/* Verification Reminder */}
            <div className="p-3 bg-[#fff4ce] border border-[#8a6d3b]/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#8a6d3b] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[#8a6d3b] mb-1">Before Preparing</p>
                  <p className="text-xs text-[#605e5c]">
                    Confirm that all selected data categories fall within the authorized scope defined by the attached legal documents.
                    Ensure no expired authorizations are relied upon for data release.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Footer */}
          <div className="px-5 py-3 border-t border-gray-200 flex-shrink-0 bg-[#faf9f8]">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#605e5c]">3 documents attached</p>
              {selectedJobsForPublish.size > 0 && (
                <Button
                  size="sm"
                  className="h-8 bg-[#107c10] hover:bg-[#0e6b0e] text-white"
                  onClick={() => {
                    setDocumentPanelOpen(false);
                    setShowPublishReview(true);
                  }}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Back to Package Review
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the Collection stage. Would you like to save before navigating away?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUnsavedChangesDialog(false);
              pendingNavigationRef.current = null;
            }}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleDiscardAndNavigate}
            >
              Discard Changes
            </Button>
            <AlertDialogAction onClick={handleSaveAndNavigate}>
              Save & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Correspondence Hub side panel — Collection-page mount. Same
          chat-thread surface as DataEntryForm; opens from Banner /
          UnreadAlert "Open Hub" CTAs. Resizable via the left-edge
          handle so the RS can widen it to read correspondence
          side-by-side with the collection pipeline. */}
      <CorrespondencePanel
        open={correspondencePanelOpen}
        onClose={() => setCorrespondencePanelOpen(false)}
        caseId={formData.caseId}
        caseFormData={formData}
        items={formData.correspondence}
        panelWidth={correspondencePanelWidth}
        panelMaxWidth={Math.min(
          typeof window !== "undefined" ? window.innerWidth - 600 : 1200,
          1200,
        )}
        onResize={setCorrespondencePanelWidth}
        onSend={handleSendOutbound}
        onRetractForm3={handleOpenRetractForm3Dialog}
        externalComposerRequest={presetComposerRequest}
        onComposeWithTemplate={handleComposerPickTemplate}
      />

      {/* Form Filler dialog — opens when the composer picks a template
          (or when the "Cannot Preserve" CTA pre-attaches Form 3).
          Reads/writes the CaseFormInstance on FormData.formInstances. */}
      {composeOpenInstanceRequestId && (() => {
        const instance = (formData.formInstances ?? []).find(
          (i) => i.instanceId === composeOpenInstanceRequestId,
        );
        const template = instance ? getTemplateById(instance.templateId) : undefined;
        if (!instance || !template) return null;
        return (
          <FormFillerDialog
            open={true}
            template={template}
            instance={instance}
            onUpdate={handleUpdateFormInstance}
            onClose={() => setComposeOpenInstanceRequestId(null)}
          />
        );
      })()}
    </div>
  );
}