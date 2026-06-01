import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { SidebarNavState, SidebarStep } from "../types/sidebarNav";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { PrimaryCard, SecondaryCard, CARD_ACCENTS } from "./CardTier";
import { CollapsibleSection, useCollapsibleSections } from "./CollapsibleSection";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { StickyCaseHeader } from "./StickyCaseHeader";
import { PageContainer } from "./layout/PageContainer";
import { CancellationWorkflowDialog } from "./cancellation/CancellationWorkflowDialog";
import { ResolveCaseDialog } from "./case-resolution/ResolveCaseDialog";
import { IdentifiersSummaryView } from "./IdentifiersSummaryView";
import { NDOSummaryView } from "./NDOSummaryView";
import { DocumentFieldsPanel } from "./DocumentFieldsPanel";
import { DataRecoveryDialog } from "./DataRecoveryDialog";
import { useAutosave } from "../hooks/useAutosave";
import { useNavigationGuards } from "../hooks/useNavigationGuards";
import { DocumentViewerPanel } from "./DocumentViewerPanel";
import { useDocumentViewer } from "../hooks/useDocumentViewer";
import { usePersistedBoolean } from "../hooks/usePaneVisibility";
import { useNDOManagement } from "../hooks/useNDOManagement";
import { useIdentifierManagement } from "../hooks/useIdentifierManagement";
import { useServiceHandlers } from "../hooks/useServiceHandlers";
import { useFormHandlers } from "../hooks/useFormHandlers";
import { useCaseNotes } from "../hooks/useCaseNotes";
import { useCaseWorkflow } from "../hooks/useCaseWorkflow";
import { useCaseEffects } from "../hooks/useCaseEffects";
import { useCaseComputedValues } from "../hooks/useCaseComputedValues";
import { CopyableText, CopyButton } from "./CopyButton";
import { NotesTimeline } from "./NotesTimeline";
import { AccountDetailsTab } from "./AccountDetailsTab";
import { IdentifierPanel } from "./IdentifierPanel";
// Tier 2D retired the inline IdentifierTable from Review Case (its
// editable twin lives in the IdentifierPanel slide-out). The component
// is re-imported here for the *Triage* stage only — see the read-only
// preview block below the Account Identifiers summary chip, which gives
// the Triage Specialist a Step-1-style scan of the LE-provided identifiers
// without opening the full wizard.
import { IdentifierTable } from "./identifier-table";
import { mapStorageLocationToCollectionBoundary } from "../constants/collectionBoundaries";
import { getServiceName } from "../config/lensServicesConfig";
import { formatDateToMMM } from "../utils/fulfillmentWizardHelpers";
import { CaseSummaryAndTabs } from "./CaseSummaryAndTabs";
import {
  CorrespondenceBanner,
  CorrespondencePanel,
} from "./correspondence";
import type {
  CorrespondenceItem,
  InboundCorrespondenceItem,
  OutboundCorrespondenceItem,
  OutboundTransmissionStatus,
} from "../types/correspondence";
import { transitionOutbound as transitionOutboundFn } from "./correspondence/correspondenceEngine";
import { isInbound, readRespondedByOutbound } from "../types/correspondence";
import {
  isAttorneyEscalationActive,
  getEscalationSummaryForCase,
} from "../utils/escalationHelpers";
import {
  getActiveAttorneyEscalation,
  createAttorneyEscalation,
  applyAttorneyAction,
  acknowledgeConditions,
  linkHeldOutboundToEscalation,
  getHeldOutboundIds,
} from "../utils/caseEscalation";
import type { SignalScope } from "../types/caseTypes";
import { useStatusAnnouncer } from "./StatusAnnouncer";
import {
  set as setCorrespondenceForCase,
  get as getCorrespondenceForCase,
  subscribe as subscribeToCorrespondenceStore,
} from "../state/correspondenceStore";
import { createFormInstance } from "./forms-library/formEngine";
import { FormFillerDialog } from "./forms-library/FormFillerDialog";
import { getTemplateById } from "../config/formTemplates";
import { EnterpriseRequestCard } from "./enterprise-request/EnterpriseRequestCard";
import { EnterpriseContextSection } from "./attorney-escalation/EnterpriseContextSection";
import { LoginLocationPanel } from "./cross-border/LoginLocationPanel";
import { ManifestErrorWarningBanner } from "./enterprise-request/ManifestErrorWarningBanner";
import { InformControllerNoticeBanner } from "./enterprise-request/InformControllerNoticeBanner";
import { NotifyUserNoticeBanner } from "./enterprise-request/NotifyUserNoticeBanner";
import { EscalateToAttorneyDialog } from "./escalation/EscalateToAttorneyDialog";
import { AttorneyReviewPanel } from "./escalation/AttorneyReviewPanel";
import { PeerReviewPanel } from "./escalation/PeerReviewPanel";
import { ConditionsBanner } from "./escalation/ConditionsBanner";
import { EnterpriseEscalationBanner } from "./escalation/EnterpriseEscalationBanner";
import { AwaitingInfoReplyBanner } from "./escalation/AwaitingInfoReplyBanner";
import { RfiReplyOverdueBanner } from "./escalation/RfiReplyOverdueBanner";
import { GroundsForRefusalPanel } from "./escalation/GroundsForRefusalPanel";
import { ReviewRequiredAlertBanner } from "./escalation/ReviewRequiredAlertBanner";
import { RetractForm3Dialog } from "./escalation/RetractForm3Dialog";
import {
  canRetractForm3,
  retractGateReason,
} from "../utils/groundsForRefusal";
import {
  pauseSlaTimerOnFormThreeSubmission,
  pauseSlaTimerManually,
  resumeSlaTimer,
} from "../utils/slaTimer";
import { applyForm3Submission } from "../utils/form3Submission";
import { applyPreservationOrderAcknowledged } from "../utils/preservationOrderReceipt";
import {
  useEaWindowExpiry,
  applyManualDeliveryResume,
} from "../hooks/useEaWindowExpiry";
import {
  isInboundRfiOverdue,
  daysLeftForInboundRfi,
  rfiOverdueAuditId,
} from "../utils/rfiReplyWindow";
import { AuditThread } from "./escalation/AuditThread";
import type {
  AttorneyAction,
  AttorneyEscalation,
  EscalationAuditEvent,
} from "../types/caseTypes";
import { RelatedCasesBlock } from "./case-related/RelatedCaseSummaryCard";
import { RelatedDARSCaseSearch } from "./case-related/RelatedDARSCaseSearch";
import type { CaseFormInstance } from "../types/formTemplate";
import { computeSlaDueDate } from "../constants/slaConstants";
import { StepperControlsMenu } from "./StepperControlsMenu";
import { SenderAuthorityTab } from "./tabs/SenderAuthorityTab";
import { NotificationWorkflowTab } from "./tabs/NotificationWorkflowTab";
import { IdentifierStatusDisplay } from "./IdentifierStatusDisplay";
import {
  BackToCollectionDialog,
  UnsavedChangesDialog,
  AgentRemovalDialog,
  FulfillmentSummaryDialog,
} from "./CaseDialogs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { OutlookDatePicker } from "./ui/OutlookDatePicker";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Badge } from "./ui/badge";


import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { 
  FileText, 
  Calendar as CalendarIcon, 
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Check,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  ListChecks,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  X,
  Plus,
  Trash2,
  Search,
  Building,
  User,
  Loader2,
  Undo2,
  Clock,
  LayoutGrid,
  MapPin,
  Edit2,
  Keyboard,
  Globe,
  ShieldCheck,
  Shield,
  ClipboardList,
  Send,
  MessageSquare,
  Save,
  Bell,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { cn } from "./ui/utils";
import { format, differenceInDays, addDays, subDays } from "date-fns";


// Import types from centralized types file
import type {
  FormData,
  TaskStatus,
  ResolutionReason,
} from "../types/caseTypes";

// Re-export FormData for backward compatibility (used by App.tsx, CollectionTracker, etc.)
export type { FormData };

// Import constants from centralized constants file
import {
  JURISDICTIONS,
  NATURE_OF_CRIMES,
  getNatureOfCrimeOption,
  EU27_DSA_HARMS,
  IDENTIFIER_TYPES,
  REQUEST_TYPES,
  INTERNAL_REQUEST_TYPES,
  getSubTypesForRequestType,
  getDefaultSubTypeForRequestType,
  CASE_STAGES,
  FULFILLMENT_STAGES,
  EU_COUNTRIES,
  MICROSOFT_SERVICES_CONFIG,
  CURRENT_USER,
  RESPONSE_SPECIALISTS,
  REQUEST_ORIGIN_OPTIONS,
  IDENTIFIER_FORMAT_RULES,
  TASK_STATUS_CONFIG,
  AUTHORIZATION_STATUSES,
  RESOLUTION_REASON_TO_STAGE,
} from "../constants/caseConstants";

// Import helper functions from centralized utils file
import {
  getTaskStatusConfig,
  formatStorageLocation,
  doesStorageCountryMatch,
  formatPhoneWithCountryCode,
  getPriorityDisplayName,

  INTERNAL_CONTACTS,
} from "../utils/caseHelpers";

import {
  generateCaseNumber,
  generateJobId,
  generateIdentifierId,
  generateAgentId,
  generateTaskId,
  generateIdentifierTaskId,
  createDefaultSubCategory,
  createDefaultServiceCategories,
  createDefaultOutlookCategories,
  createDefaultTeamsCategories,
  createDefaultAzureCategories,
  createDefaultConsumerIPHistoryCategories,
  createDefaultMSACategories,
  createDefaultMSAServicesUtilizedCategories,
  createDefaultEnterpriseCategories,
  createDefaultOneDriveSharePointCategories,
  createDefaultOneDriveConsumerCategories,
  createDefaultSkypeCategories,
  createDefaultXboxCategories,
  createNewIdentifier,
  calculateSLADays,
} from "../utils/caseFactories";

// Re-export generateJobId for backward compatibility (used by CollectionTracker)
export { generateJobId } from "../utils/caseFactories";

import { createInitialFormData } from "../data/mockFormData";

// IdentifierStatusDisplay is imported from its own file

interface DataEntryFormProps {
  workflowStage?: "triage" | "fulfillment" | "collection";
  onNavigateToFulfillment?: () => void;
  onNavigateToTriage?: () => void;
  onNavigateToCollection?: () => void;
  onNavigateToQueue?: () => void;
  onNavigateToReadySubmit?: () => void;
  sharedFormData?: FormData | null;
  setSharedFormData?: (data: FormData) => void;
  selectedCaseId?: string | null;
  isEditingCollectionScope?: boolean; // Indicates we're adding to an existing collection
  sidebarCollapsed?: boolean;
  /** Announcer callback for aria-live region */
  announce?: (message: string) => void;
  /** Callback emitting stepper nav state for the sidebar */
  onStepperStateChange?: (state: SidebarNavState) => void;
  /** Callback emitting case-level action state for the WorkflowListPane
   *  (Save/Submit footer + scope-header action icons). Same emit pattern
   *  as `onStepperStateChange` — DataEntryForm fires this whenever any of
   *  the relevant state changes. App.tsx stores the emission and forwards
   *  the slots to the pane. See src/types/workflowPaneActions.ts. */
  onWorkflowPaneActions?: (
    actions: import("../types/workflowPaneActions").WorkflowPaneActions,
  ) => void;
  /** External request to navigate to a specific step key (from sidebar click) */
  requestedStepKey?: string | null;
  /** Phase 4 (FF_STAGE_TAB_BAR): stage completion + dynamic sub-step nav
   *  state + step-click handler forwarded into StickyCaseHeader so the
   *  horizontal StageTabBar (replacement for WorkflowSidebar) can render.
   *  Ignored when the flag is off — App.tsx still owns the sidebar in
   *  that path. */
  stageCompletion?: {
    triage: boolean;
    fulfillment: boolean;
    collection: boolean;
  };
  stageBarNavState?: SidebarNavState | null;
  onStageBarStepClick?: (key: string) => void;
  /** WorkflowListPane hide-entirely visibility. When false, the sticky
   *  header surfaces the Show-workflow button + stage breadcrumb. Plumbed
   *  from App.tsx's usePaneVisibility hook through StickyCaseHeader. */
  workflowPaneVisible?: boolean;
  onShowWorkflowPane?: () => void;
  workflowActiveStepLabel?: string;
}

export function DataEntryForm({ 
  workflowStage = "triage", 
  onNavigateToFulfillment, 
  onNavigateToTriage, 
  onNavigateToCollection,
  onNavigateToReadySubmit,
  onNavigateToQueue,
  sharedFormData,
  setSharedFormData,
  selectedCaseId,
  isEditingCollectionScope = false,
  sidebarCollapsed,
  announce,
  onStepperStateChange,
  onWorkflowPaneActions,
  requestedStepKey,
  stageCompletion,
  stageBarNavState,
  onStageBarStepClick,
  workflowPaneVisible,
  onShowWorkflowPane,
  workflowActiveStepLabel,
}: DataEntryFormProps = {}) {
  // Shared screen-reader live region. The provider is mounted at the
  // app shell (App.tsx) so this `announce` reaches the same `<div
  // role="status">` from any descendant.
  const { announce: announceStatus } = useStatusAnnouncer();

  const [jurisdictionOpen, setJurisdictionOpen] = useState(false);
  const [requestTypeOpen, setRequestTypeOpen] = useState(false);
  const [requestSubTypeOpen, setRequestSubTypeOpen] = useState(false);
  const [natureOfCrimesOpen, setNatureOfCrimesOpen] = useState(false);
  const [eu27DsaHarmsOpen, setEu27DsaHarmsOpen] = useState(false);
  // Document viewer state & handlers (extracted to hooks/useDocumentViewer.ts)
  const {
    warrantModalOpen, setWarrantModalOpen,
    attachmentZoom, setAttachmentZoom,
    attachmentRotation, setAttachmentRotation,
    documentPanelWidth, setDocumentPanelWidth,
    availableDocuments, setAvailableDocuments,
    openDocumentIds, setOpenDocumentIds,
    activeDocumentId, setActiveDocumentId,
    selectedDocumentToOpen, setSelectedDocumentToOpen,
    documentDetailsExpanded, setDocumentDetailsExpanded,
    documentInvalidReasons, setDocumentInvalidReasons,
    documentVerifications, setDocumentVerifications,
    modalCloseButtonRef, modalTriggerButtonRef,
    documentPanelMaxWidth, verifiedDocumentsCount,
    toggleDocumentPanel,
    handleVerifyDocument, handleRejectDocument, handleUndoVerifyDocument,
  } = useDocumentViewer({ sidebarCollapsed: sidebarCollapsed ?? false });
  
  // Agency/Contact search state moved to useFormHandlers hook
  
  
  
  // State for collapsible sections to improve triage speed
  const [showOptionalCaseFields, setShowOptionalCaseFields] = useState(false);
  const [showOptionalAgencyFields, setShowOptionalAgencyFields] = useState(false);
  const [showAuthorizationDetails, setShowAuthorizationDetails] = useState(false);
  
  // Progressive disclosure: section-level collapse/expand state
  const SECTION_IDS = [
    "status-priority",
    "assigned-to",
    "internal-escalation",
    "case-identification",
    "legal-classification",
    "legal-compliance",
    "notification-workflow",
    "agency-details",
    "account-identifiers",
    "case-review",
    "authorization-details",
  ] as const;
  const sections = useCollapsibleSections(SECTION_IDS as unknown as string[], {
    "status-priority": true,
    "assigned-to": true,
    "internal-escalation": true,
    "case-identification": true,
    "legal-classification": true,
    "legal-compliance": true,
    "notification-workflow": true,
    // Agency Details — collapsed by default (UX-Polish.md 1F). Once
    // populated at intake, RS rarely re-edits the agency / phone /
    // address; the section's collapsedSummary still shows the agency
    // name so the value is scannable without expanding.
    "agency-details": false,
    "account-identifiers": true,
    "case-review": true,
    "authorization-details": false, // Authorization is read-only, collapsed by default
  });
  
  // Agent removal state moved to useFormHandlers hook
  
  // State for confirming "Back to Collection" with unsaved edits
  const [showBackToCollectionConfirm, setShowBackToCollectionConfirm] = useState(false);

  // Cross-border IP History drawer (Phase 3 of the prototype-to-prod
  // merge). Available to RS / TS users from the Triage stage's
  // IdentifierTable. Holds the AccountIdentifier.id of the row being
  // inspected; `null` = closed.
  const [ipHistoryIdentifierId, setIpHistoryIdentifierId] = useState<
    string | null
  >(null);

  // Resolve Case dialog — opened from the Step 2/3 banner secondary CTA,
  // the collection-page resolve bar, and (Phase 5c.5+) the workflow-stage
  // banner's Resolve / Edit-resolution action.
  const [showResolveCaseDialog, setShowResolveCaseDialog] = useState(false);
  const [resolveDefaultReason, setResolveDefaultReason] = useState<ResolutionReason | undefined>(undefined);
  const [resolveDefaultNotes, setResolveDefaultNotes] = useState<string>("");
  const [resolveDialogMode, setResolveDialogMode] = useState<"resolve" | "edit">("resolve");

  // Active sub-tab inside the Step 5 "Non-Disclosure & Notifications"
  // section. Lifted up here so the Step 4 advisory banners (Inform
  // Controller / Notify User) can deep-link into the correct tab via the
  // `openNotificationSubTab` helper below.
  const [activeNotificationSubTab, setActiveNotificationSubTab] = useState<
    "non-disclosure" | "controller" | "user"
  >("non-disclosure");
  const openNotificationSubTab = (
    tab: "non-disclosure" | "controller" | "user",
  ) => {
    // Switch the outer accordion step to "notification" first — the
    // banner lives inside the "data" step, so without this the Notify
    // User / Inform Controller buttons would only flip an invisible
    // sub-tab inside a collapsed section.
    setActiveStepKey("notification");
    setExpandedStepKeys((prev) => {
      if (prev.has("notification")) return prev;
      const next = new Set(prev);
      next.add("notification");
      return next;
    });
    setActiveNotificationSubTab(tab);
    if (typeof window !== "undefined") {
      // Defer a frame so React commits both the accordion open + the
      // sub-tab change before we hunt the scroll target. Without the
      // defer, `getElementById` can resolve before the section's
      // children have mounted and the scroll lands at the top of the
      // page instead.
      requestAnimationFrame(() => {
        const el = document.getElementById("notification-workflow-anchor");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  };

  // Page-top "Review required" alert helper — expand the Case Overview
  // accordion step (if collapsed) and scroll the named review panel
  // into view. Mirrors the openNotificationSubTab pattern above so
  // accordion + scroll commit before the getElementById call fires.
  const scrollToCaseOverviewPanel = (panelId: string) => {
    setActiveStepKey("overview");
    setExpandedStepKeys((prev) => {
      if (prev.has("overview")) return prev;
      const next = new Set(prev);
      next.add("overview");
      return next;
    });
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        const el = document.getElementById(panelId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  };

  // (Attorney escalation state + handlers moved below `formData` useState
  // — they read `formData.attorneyEscalation` synchronously which would
  // TDZ-throw if declared above the state hook.)
  const collectionScopeSnapshotRef = useRef<string | null>(null);
  const wizardServiceConfigRef = useRef<any>(null);

  // Navigation guards: dirty tracking, unsaved-changes dialog, beforeunload
  // (extracted to hooks/useNavigationGuards.ts)

  // State for identifier summary review
  const [showIdentifierSummary, setShowIdentifierSummary] = useState(false);
  
  // State for autosave and recovery
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [hasCheckedRecovery, setHasCheckedRecovery] = useState(false);
  
  const [formData, setFormData] = useState<FormData>(createInitialFormData);

  // ── Attorney escalation dialog state + handlers ───────────────────────
  // Declared here (below `formData`) because `escalateDialogMode` reads
  // `formData.attorneyEscalation?.status` synchronously.
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);

  // Clear-form confirmation dialog state. Wraps `handleReset` so a
  // misclick doesn't wipe the entire case form. The dialog title is a
  // question + the body names the consequence, per the destructive
  // copy template.
  const [showClearFormConfirm, setShowClearFormConfirm] = useState(false);

  // ── Correspondence Hub side panel ─────────────────────────────────────
  // The Banner / UnreadAlert / Section entry surfaces all flip this open;
  // the panel itself mounts inside the case-page's relative container (so
  // it sits below the StickyCaseHeader) and uses the same re-resizable
  // pattern as DocumentViewerPanel — width owned by us, applied as
  // `marginRight` on the case form so the user reads correspondence
  // side-by-side with the case data.
  const [correspondencePanelOpen, setCorrespondencePanelOpenRaw] =
    usePersistedBoolean("dars.correspondencePanel.open", false);
  const [correspondencePanelWidth, setCorrespondencePanelWidth] = useState(540);
  // External composer request — fires when something OUTSIDE the
  // correspondence panel (e.g. the AwaitingInfoReplyBanner's "Send
  // another RFI" link) needs to load a template into the composer.
  // Bumping the nonce on each click lets the panel respond to repeats.
  const [externalComposerRequest, setExternalComposerRequest] =
    useState<{ templateId: string; inReplyToId?: string; nonce: number } | null>(
      null,
    );

  // Mutual exclusion: the document viewer and the correspondence panel
  // both anchor to the right edge of the case body; opening one closes
  // the other so they don't fight over the same screen real estate.
  const setCorrespondencePanelOpen = (next: boolean) => {
    setCorrespondencePanelOpenRaw(next);
    if (next && warrantModalOpen) setWarrantModalOpen(false);
  };
  React.useEffect(() => {
    if (warrantModalOpen && correspondencePanelOpen) {
      setCorrespondencePanelOpenRaw(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warrantModalOpen]);

  const escalateDialogMode: "create" | "resume" =
    getActiveAttorneyEscalation(formData)?.status === "InformationRequested"
      ? "resume"
      : "create";

  const handleOpenEscalateDialog = () => setEscalateDialogOpen(true);

  /** Apply a fresh escalation submitted via EscalateToAttorneyDialog.
   *  Replaces (or initialises) `attorneyEscalation` and appends the audit
   *  event. */
  const handleEscalateSubmit = (next: {
    escalation: AttorneyEscalation;
    auditEvent: EscalationAuditEvent;
    /** Phase 1 write migration — scope picker output from the
     *  EscalateToAttorneyDialog. Undefined falls back to scope=all
     *  (case-wide) for back-compat with callers that haven't been
     *  updated yet. */
    scope?: SignalScope;
  }) => {
    const scope: SignalScope = next.scope ?? { kind: "all" };
    setFormData((prev) =>
      createAttorneyEscalation(prev, scope, next.escalation, next.auditEvent),
    );
    setEscalateDialogOpen(false);
    toast.success(
      escalateDialogMode === "resume"
        ? "Escalation resumed"
        : "Case escalated",
    );
  };

  /** Apply an Attorney action (Release / Approve-with-Conditions /
   *  Request-More-Info / Block). Updates the live `attorneyEscalation`
   *  block, appends the action + audit event, and optionally fires a
   *  toast + system "LeadNotified" audit event on Block. */
  const handleAttorneyAction = (next: {
    action: AttorneyAction;
    auditEvent: EscalationAuditEvent;
    statusPatch?: Partial<AttorneyEscalation>;
    notifyLead?: boolean;
  }) => {
    setFormData((prev) => {
      const active = getActiveAttorneyEscalation(prev);
      if (!active) return prev;

      // Derive scope from the audit event's identifierId tag (set by
      // AttorneyReviewPanel when the action is per-identifier). Untagged
      // events fall back to scope=all so the case-wide path still works
      // end-to-end while per-identifier UX is rolling out.
      const scope: SignalScope = next.auditEvent.identifierId
        ? { kind: "some", identifierIds: [next.auditEvent.identifierId] }
        : { kind: "all" };

      // Apply the action via the unified helper. This handles the
      // hybrid-storage rule: scope=all mirrors to case-level, scope=some
      // writes per-identifier and clears the case-level field.
      let mutated = applyAttorneyAction(prev, scope, {
        action: next.action,
        statusPatch: next.statusPatch,
        auditEvent: next.auditEvent,
      });

      // System-generated LeadNotified follow-up event for Block actions.
      if (next.notifyLead) {
        mutated = {
          ...mutated,
          escalationAuditEvents: [
            ...(mutated.escalationAuditEvents ?? []),
            {
              id: `audit-lead-${Date.now().toString(36)}`,
              kind: "LeadNotified",
              actor: "DARS system",
              performedAt: new Date(),
              note:
                "LENS Lead/Manager notified — case marked Blocked by attorney.",
            },
          ],
        };
      }

      // Held-outbound release: when the attorney releases or approves,
      // walk the aggregate held-outbound list across per-identifier
      // escalations + the legacy case-level field, then flip each one
      // from Draft → Sent. The auto-sim cascade progresses them to
      // Delivered → Acknowledged on its usual timer.
      const released =
        next.statusPatch?.status === "ApprovedForDelivery" ||
        next.statusPatch?.status === "ApprovedWithConditions";
      const heldIds = released ? getHeldOutboundIds(prev) : [];
      if (released && heldIds.length > 0 && prev.correspondence) {
        const now = new Date();
        const nextCorrespondence = prev.correspondence.map((item) => {
          if (item.direction !== "Outbound") return item;
          if (!heldIds.includes(item.id)) return item;
          if (!item.transmission.pendingAttorneyReview) return item;
          return {
            ...item,
            transmission: {
              ...item.transmission,
              status: "Sent",
              sentAt: item.transmission.sentAt ?? now,
              sentBy: item.transmission.sentBy ?? CURRENT_USER,
              pendingAttorneyReview: false,
            },
          };
        }) as CorrespondenceItem[];
        // Mirror the released outbounds into the cross-case store.
        setCorrespondenceForCase(prev.caseId, nextCorrespondence);
        mutated = { ...mutated, correspondence: nextCorrespondence };
      }

      return mutated;
    });
    if (next.notifyLead) {
      toast.warning("LENS Lead notified — case marked Blocked.");
      announceStatus(
        "Case blocked by attorney. LENS Lead has been notified.",
        { politeness: "assertive" },
      );
    } else if (next.statusPatch?.status === "ApprovedForDelivery") {
      toast.success("Hold released — case approved for delivery.");
      announceStatus(
        "Attorney hold released. Case approved for delivery.",
      );
    } else if (next.statusPatch?.status === "ApprovedWithConditions") {
      toast.success("Approved with conditions.");
      announceStatus("Case approved with attorney conditions.");
    } else if (next.statusPatch?.status === "InformationRequested") {
      toast.info("Information requested — case bounced back to Specialist.");
      announceStatus(
        "Attorney requested more information. Case returned to specialist.",
      );
    }
  };

  /** Peer-review action (Acknowledge / Reassign). Same shape as
   *  handleAttorneyAction minus the Block-specific notifyLead branch. */
  const handlePeerAction = (next: {
    action: AttorneyAction;
    auditEvent: EscalationAuditEvent;
    statusPatch?: Partial<AttorneyEscalation>;
  }) => {
    setFormData((prev) => {
      if (!getActiveAttorneyEscalation(prev)) return prev;
      const scope: SignalScope = next.auditEvent.identifierId
        ? { kind: "some", identifierIds: [next.auditEvent.identifierId] }
        : { kind: "all" };
      return applyAttorneyAction(prev, scope, {
        action: next.action,
        statusPatch: next.statusPatch,
        auditEvent: next.auditEvent,
      });
    });
    if (next.auditEvent.kind === "Acknowledged") {
      toast.success("Review acknowledged.");
    } else if (next.auditEvent.kind === "ReassignedToSpecialist") {
      toast.info("Case returned to the Specialist.");
    }
  };

  /** Phase D — Retract Form 3 flow. The CTA on the GFR Panel's
   *  Form3Response+None variant opens a confirmation dialog with an
   *  "I acknowledge" checkbox. On confirm we:
   *    1. Patch the GFR block with `form3RetractedAt` + `form3RetractedBy`
   *       so the panel flips to its retracted-confirmation state.
   *    2. Append a `Form3Retracted` audit event.
   *  Delivery isn't re-gated here — for Form3Response+None it was
   *  never blocked (only Full / lapsed-without-resume gate the case
   *  level). The retract is the strict-legal acknowledgement; the
   *  EA had already issued No-GFR. */
  const [showRetractForm3Dialog, setShowRetractForm3Dialog] =
    useState(false);
  const handleOpenRetractForm3Dialog = () => {
    // Defence-in-depth: the GFR Panel + banner gate the open path,
    // but if a stale CTA fires we surface a toast rather than open
    // the dialog with the action disabled.
    if (!canRetractForm3(formData)) {
      const reason = retractGateReason(formData);
      if (reason) toast.error(reason);
      return;
    }
    setShowRetractForm3Dialog(true);
  };

  // ─── EA review-window lifecycle ──────────────────────────────────────
  // Mirror of CollectionTracker — see hook docstring.
  useEaWindowExpiry({
    formData,
    setSharedFormData: setFormData as (next: FormData) => void,
  });
  const handleResumeDelivery = useCallback(() => {
    setFormData((prev) => {
      const next = applyManualDeliveryResume(prev);
      if (next === prev) return prev;
      toast.success("Delivery resumed", {
        description:
          "EA review window had lapsed without a decision. Submit-to-Delivery is re-enabled.",
      });
      return next;
    });
  }, [setFormData]);
  const handleConfirmRetractForm3 = () => {
    if (!canRetractForm3(formData)) {
      toast.error(
        retractGateReason(formData) ??
          "Retract not allowed in the current case state.",
      );
      return;
    }
    const now = new Date();
    setFormData((prev) => {
      if (!prev.eevidenceGroundsForRefusal) return prev;
      return {
        ...prev,
        eevidenceGroundsForRefusal: {
          ...prev.eevidenceGroundsForRefusal,
          form3RetractedAt: now,
          form3RetractedBy: CURRENT_USER,
        },
        escalationAuditEvents: [
          ...(prev.escalationAuditEvents ?? []),
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
      };
    });
    toast.success("Form 3 retracted. Production may proceed.");
  };

  /** Conditions acknowledgement handler — patches the live escalation
   *  with the acknowledgement timestamps + appends the audit event. */
  const handleAcknowledgeConditions = (next: {
    auditEvent: EscalationAuditEvent;
    statusPatch: Partial<AttorneyEscalation>;
  }) => {
    setFormData((prev) => {
      const active = getActiveAttorneyEscalation(prev);
      if (!active) return prev;
      // Acknowledgement scope: when the conditions banner is shown for a
      // specific identifier (per-identifier escalation), the audit event
      // carries `identifierId` and we ack that identifier only. Untagged
      // events ack the case-wide escalation (scope=all).
      const scope: SignalScope = next.auditEvent.identifierId
        ? { kind: "some", identifierIds: [next.auditEvent.identifierId] }
        : { kind: "all" };
      const at =
        next.statusPatch.conditionsAcknowledgedAt instanceof Date
          ? next.statusPatch.conditionsAcknowledgedAt
          : new Date();
      const by =
        typeof next.statusPatch.conditionsAcknowledgedBy === "string"
          ? next.statusPatch.conditionsAcknowledgedBy
          : CURRENT_USER;
      return acknowledgeConditions(prev, scope, {
        at,
        by,
        auditEvent: next.auditEvent,
      });
    });
    toast.success("Conditions acknowledged.");
  };

  /** "Send another RFI" from the AwaitingInfoReplyBanner — opens the
   *  correspondence panel + fires an external composer request so the
   *  RFI template auto-attaches. Unsolicited: no `inReplyToId`, so
   *  the outbound won't carry a misleading reply link. */
  const handleBannerSendAnotherRfi = () => {
    setCorrespondencePanelOpen(true);
    setExternalComposerRequest((prev) => ({
      templateId: "REQUEST_ADDITIONAL_INFORMATION",
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  };

  /** Dismiss handler for the AwaitingInfoReplyBanner. Writes a
   *  `PaiPromptDismissed` audit event so the AuditThread captures the
   *  RS's deliberate not-now. The banner itself manages its own
   *  hidden-this-session state. */
  const handleBannerDismiss = (replyCount: number, newestSubject: string) => {
    setFormData((prev) => ({
      ...prev,
      escalationAuditEvents: [
        ...(prev.escalationAuditEvents ?? []),
        {
          id: `audit-pai-dismissed-${Date.now().toString(36)}`,
          kind: "PaiPromptDismissed",
          actor: CURRENT_USER,
          performedAt: new Date(),
          note: `PAI prompt dismissed by RS — ${replyCount} repl${replyCount === 1 ? "y" : "ies"} pending review${replyCount === 1 ? ` ("${newestSubject}")` : ""}.`,
        },
      ],
    }));
  };

  /** Manual SLA pause/resume — invoked from the case header toggle next
   *  to the SLA chip. Form 3 submission auto-pauses elsewhere; this is
   *  the discretionary control for "we're blocked waiting on the IA" or
   *  similar holds the Specialist wants to record. */
  const handleToggleSlaPause = () => {
    setFormData((prev) => {
      if (prev.slaPausedAt) {
        toast.success("SLA timer resumed");
        return resumeSlaTimer(prev);
      }
      toast.success("SLA timer paused");
      return pauseSlaTimerManually(prev);
    });
  };

  // Edge Case 1 — auto-fire `RfiReplyOverdue` audit events for inbound
  // RFIs whose per-jurisdiction reply window has been breached. The
  // event is keyed by the inbound's id so re-fires are deduped: once
  // a breach event exists for inbound X, subsequent renders don't
  // append a second event. Per the decisions in
  // `docs/RFI_PAI_Edge_Cases_For_Review.md`, this fires regardless of
  // whether the RS interacts with the breach nudge banner.
  useEffect(() => {
    const inbounds = (formData.correspondence ?? []).filter((c) => {
      if (c.direction !== "Inbound") return false;
      if (c.kind !== "RequestAdditionalInformation") return false;
      // Cancelled replies don't close the conversation — the breach
      // clock keeps running. Only treat "sent" status as satisfied.
      const replied = readRespondedByOutbound(c);
      if (replied && replied.status === "sent") return false;
      return true;
    });
    if (inbounds.length === 0) return;
    const existing = new Set(
      (formData.escalationAuditEvents ?? []).map((e) => e.id),
    );
    const fresh: EscalationAuditEvent[] = [];
    for (const inb of inbounds) {
      if (!isInboundRfiOverdue(inb as any, formData.country)) continue;
      const id = rfiOverdueAuditId(inb.id);
      if (existing.has(id)) continue;
      const days = Math.abs(
        daysLeftForInboundRfi(inb as any, formData.country) ?? 0,
      );
      fresh.push({
        id,
        kind: "RfiReplyOverdue",
        actor: "DARS system",
        performedAt: new Date(),
        note: `RFI from authority is past the reply window by ${days} day${days === 1 ? "" : "s"}. Consider escalating to attorney for review. Inbound: "${inb.subject}".`,
      });
    }
    if (fresh.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      escalationAuditEvents: [
        ...(prev.escalationAuditEvents ?? []),
        ...fresh,
      ],
    }));
  }, [formData.correspondence, formData.country, formData.escalationAuditEvents]);

  // Stepper section completion tracking
  const completedStepperSections = useMemo(() => {
    const completed = new Set<string>();

    // Case Overview: assignee + priority + status + due date set
    if (formData.assigneeName && formData.casePriority && formData.caseStage && formData.dueDate) {
      completed.add("overview");
    }

    // Legal & Compliance: request type + country + jurisdiction + nature of crimes
    if (formData.requestType && formData.country && formData.jurisdiction && formData.natureOfCrimes.length > 0) {
      completed.add("legal");
    }

    // Sender Authority: agency name present
    if (formData.agency) {
      completed.add("agency");
    }

    // Data Specification: at least one identifier
    if (formData.identifiers.length > 0) {
      completed.add("data");
    }

    // Notification: NDO records exist or explicitly no NDO needed
    if (formData.nonDisclosureOrders && formData.nonDisclosureOrders.length > 0) {
      completed.add("notification");
    }

    // Case Review: at least one note
    if (formData.notes && formData.notes.length > 0) {
      completed.add("review");
    }

    return completed;
  }, [formData]);


  // ── Controlled stepper active key (for sidebar ↔ accordion sync) ──
  const [activeStepKey, setActiveStepKey] = useState("overview");
  // ── Multi-expand mode for accordion stepper ──
  const [multiStepMode, setMultiStepMode] = useState(false);
  const [expandedStepKeys, setExpandedStepKeys] = useState<Set<string>>(new Set());

  const STEP_KEYS = ["overview", "legal", "agency", "data", "notification", "review"];

  const handleToggleMultiStep = useCallback(() => {
    setMultiStepMode((prev) => {
      if (!prev) {
        // Entering multi-step: seed with current active key
        setExpandedStepKeys(new Set([activeStepKey]));
      }
      return !prev;
    });
  }, [activeStepKey]);

  const handleExpandAllSteps = useCallback(() => {
    setMultiStepMode(true);
    setExpandedStepKeys(new Set(STEP_KEYS));
  }, []);

  const handleCollapseToActive = useCallback(() => {
    setMultiStepMode(false);
    setExpandedStepKeys(new Set());
  }, []);

  // When the sidebar requests a step change, apply it
  useEffect(() => {
    if (requestedStepKey) {
      setActiveStepKey(requestedStepKey);
    }
  }, [requestedStepKey]);

  // Triage step definitions for sidebar (static shape, dynamic completion).
  // On Review Case stage, `isComplete` reflects whether the Response Specialist
  // explicitly marked the section reviewed; on Triage it's data-based.
  const TRIAGE_STEPS: SidebarStep[] = useMemo(() => [
    { key: "overview", label: "Case Overview", icon: FileText, isComplete: completedStepperSections.has("overview") },
    { key: "legal", label: "Legal & Compliance", icon: ShieldCheck, isComplete: completedStepperSections.has("legal") },
    { key: "agency", label: "Sender Authority Details", icon: Building, isComplete: completedStepperSections.has("agency") },
    { key: "data", label: "Identifier & Data Services", icon: User, isComplete: completedStepperSections.has("data") },
    { key: "notification", label: "Non-Disclosure Workflow", icon: Bell, isComplete: completedStepperSections.has("notification") },
    { key: "review", label: "Operational Case Review", icon: ClipboardList, isComplete: completedStepperSections.has("review") },
  ], [completedStepperSections]);

  // Identifier management (extracted to hooks/useIdentifierManagement.ts)
  const identifierMgmt = useIdentifierManagement({ formData, setFormData });
  const {
    newIdentifierValue, setNewIdentifierValue,
    newIdentifierType, setNewIdentifierType,
    newIdentifierTypeOpen, setNewIdentifierTypeOpen,
    newIdentifierIsSupplemental, setNewIdentifierIsSupplemental,
    newIdentifierServices, setNewIdentifierServices,
    newIdentifierServicesOpen, setNewIdentifierServicesOpen,
    showServiceCategoryOptions, setShowServiceCategoryOptions,
    supplementalLinkedIdentifierId, setSupplementalLinkedIdentifierId,
    supplementalLinkedIdentifierOpen, setSupplementalLinkedIdentifierOpen,
    supplementalService, setSupplementalService,
    supplementalServiceOpen, setSupplementalServiceOpen,
    supplementalDataCategory, setSupplementalDataCategory,
    supplementalDataCategoryOpen, setSupplementalDataCategoryOpen,
    checkingExistence, setCheckingExistence,
    displayFrozen, setDisplayFrozen,
    expandedIdentifiers, setExpandedIdentifiers,
    expandedServices, setExpandedServices,
    showBackgroundData, setShowBackgroundData,
    backgroundDataPanelOpen, setBackgroundDataPanelOpen,
    selectedIdentifierForBackground, setSelectedIdentifierForBackground,
    identifierSearchTerm, setIdentifierSearchTerm,
    identifierViewMode, setIdentifierViewMode,
    selectedIdentifierId, setSelectedIdentifierId,
    editingIdentifierId, setEditingIdentifierId,
    editIdentifierValue, setEditIdentifierValue,
    editIdentifierType, setEditIdentifierType,
    identifierPanelOpen, setIdentifierPanelOpen,
    fulfillmentInitialStep, setFulfillmentInitialStep,
    expandedNotFoundIdentifiers, setExpandedNotFoundIdentifiers,
    handleAddIdentifier, handleQuickAddIdentifier,
    handleAddAliasAsIdentifier, handleAddAliasToCategory,
    handleRemoveIdentifier, handleEditIdentifier,
    handleSaveEditIdentifier, handleCancelEditIdentifier,
    handleUpdateTaskStatus,
  } = identifierMgmt;

  // Emit stepper nav state upward whenever active key or steps change
  // Only emit triage steps when fulfillment panel is NOT open
  // (FulfillmentWizard emits its own nav state via IdentifierPanel)
  useEffect(() => {
    if (!identifierPanelOpen) {
      onStepperStateChange?.({
        steps: TRIAGE_STEPS,
        activeStepKey,
      });
    }
  }, [activeStepKey, TRIAGE_STEPS, onStepperStateChange, identifierPanelOpen]);

  // NDO management (extracted to hooks/useNDOManagement.ts)
  const ndo = useNDOManagement({ formData, setFormData });
  const {
    ndoViewMode, setNdoViewMode,
    showAddNDO, setShowAddNDO,
    editingNDOId, setEditingNDOId,
    expandedNDOs, setExpandedNDOs,
    currentNDO, setCurrentNDO,
    handleAddNDO, handleRemoveNDO, handleEditNDO, handleUpdateNDO,
    handleSaveNewNDO, handleClearNDOForm, handleEditSavedNDO,
    handleDeleteSavedNDO, handleSaveNDO, handleCancelEditNDO, toggleNDOExpanded,
  } = ndo;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDueDateManuallySet, setIsDueDateManuallySet] = useState(false);
  // Controlled state for the due-date popover so the quick-shortcut
  // buttons inside can close it after applying a date (single click set +
  // dismiss is the expected pattern). Without this the popover stays
  // open after each click.
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);

  // Cancellation workflow state
  const [showCancellationWorkflow, setShowCancellationWorkflow] = useState(false);
  const [cancellationDeliveryBlocked, setCancellationDeliveryBlocked] = useState(false);

  const cancellationAllStepsComplete = useMemo(() => {
    if (formData.authorizationDesiredStatus !== "Cancelled") return false;
    const allIdentifiersCancelled = formData.identifiers.every(
      (id) => id.taskStatus === "Cancelled"
    );
    return cancellationDeliveryBlocked && allIdentifiersCancelled && formData.caseStage === "Cancelled";
  }, [formData.authorizationDesiredStatus, formData.identifiers, formData.caseStage, cancellationDeliveryBlocked]);

  // Autosave hook - background crash recovery (still saves to localStorage periodically)
  const autosaveKey = selectedCaseId || "draft-case";
  const autosave = useAutosave({
    key: autosaveKey,
    data: formData,
    interval: 60000, // 60 seconds - longer interval since we have explicit save now
    enabled: hasCheckedRecovery && formData.caseId !== "", // Only after recovery check and case initialized
  });

  // --- Explicit Save & Dirty Tracking (extracted to useNavigationGuards) ---
  const {
    isFormDirty,
    setIsFormDirty,
    isManualSaving,
    lastSavedTime,
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    guardedNavigate,
    handleManualSave,
    handleSaveAndNavigate,
    handleDiscardAndNavigate,
    markAsSaved,
    cancelPendingNavigation,
  } = useNavigationGuards({
    formData,
    caseId: formData.caseId,
    autosave,
  });

  // NDO auto-expire effect moved to useNDOManagement hook

  // Check for saved data on mount
  useEffect(() => {
    if (!hasCheckedRecovery && selectedCaseId) {
      const savedData = autosave.getSavedData();
      const savedTimestamp = localStorage.getItem(`autosave_${autosaveKey}_timestamp`);
      
      if (savedData && savedTimestamp) {
        const savedDate = new Date(savedTimestamp);
        const now = new Date();
        const hoursSinceLastSave = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);
        
        // Only show recovery dialog if data is less than 24 hours old
        if (hoursSinceLastSave < 24) {
          setShowRecoveryDialog(true);
        } else {
          autosave.clearSavedData();
          setHasCheckedRecovery(true);
        }
      } else {
        setHasCheckedRecovery(true);
      }
    }
  }, [selectedCaseId, hasCheckedRecovery]);

  const handleRecoverData = () => {
    const savedData = autosave.getSavedData();
    if (savedData) {
      setFormData(savedData);
      if (setSharedFormData) {
        setSharedFormData(savedData);
      }
    }
    setShowRecoveryDialog(false);
    setHasCheckedRecovery(true);
  };

  const handleDiscardSavedData = () => {
    autosave.clearSavedData();
    setShowRecoveryDialog(false);
    setHasCheckedRecovery(true);
  };

  // Computed values (extracted to hooks/useCaseComputedValues.ts)
  const {
    filteredIdentifiers,
    identifierSummaryStats,
    newIdentifierValidation,
    totalServicesCount,
    totalDataCategoriesCount,
    caseIdentificationCompletionCount,
    ndoStatusMap,
    identifierDisplayData,
  } = useCaseComputedValues({ formData, identifierSearchTerm, newIdentifierValue, newIdentifierType });

  // Auto-generate Case ID and pre-populate with warrant data
  useEffect(() => {
    // If shared form data exists, use it instead of initializing new data
    if (sharedFormData) {
      // If this sharedFormData update originated from our own local sync,
      // skip re-setting formData to break the circular update loop
      // (formData → sync effect → sharedFormData → init effect → formData → …)
      if (didLocalSyncRef.current) {
        didLocalSyncRef.current = false;
        return;
      }
      // Normalize the data to ensure all identifiers have taskStatus
      const normalizedData = {
        ...sharedFormData,
        identifiers: sharedFormData.identifiers.map(identifier => ({
          ...identifier,
          taskStatus: identifier.taskStatus || "New" as TaskStatus
        }))
      };
      setFormData(normalizedData);
      return;
    }
    
    // Check if this is the rejected case
    if (selectedCaseId === "LNS-2026-984174") {
      // Load rejected case data
      const rejectedIdentifier1 = createNewIdentifier();
      rejectedIdentifier1.value = "suspect.email@example.com";
      rejectedIdentifier1.type = "Email Address";
      rejectedIdentifier1.taskStatus = "Rejected";
      
      const rejectedIdentifier2 = createNewIdentifier();
      rejectedIdentifier2.value = "+1-555-9876";
      rejectedIdentifier2.type = "Phone Number";
      rejectedIdentifier2.taskStatus = "Rejected";
      
      const createDate = new Date("2026-01-05");
      const dueDate = new Date("2026-01-15");
      
      setFormData((prev) => ({
        ...prev,
        caseId: "LNS-2026-984174",
        createDate: createDate,
        caseNumber: generateCaseNumber(),
        relatedCaseNumbers: "",
        country: "United States",
        jurisdiction: "State and Local",
        requestType: "Subpoena",
        requestOrigin: "Email forward",
        requestOriginOther: "",
        agency: "County District Attorney Office",
        agencyPhone: "+1 (555) 010-0",
        agencyAddress: {
          number: "123 Court Street",
          city: "Springfield",
          stateProvince: "IL",
          postalCode: "62701",
        },
        agents: [
          {
            id: generateAgentId(),
            name: "Jane Smith",
            title: "Assistant District Attorney",
            email: "j.smith@county.gov",
            phone: "+1 (555) 010-1",
            role: "Submitter",
            languages: "en - English",
            source: "agency"
          },
          {
            id: generateAgentId(),
            name: "Thomas Anderson",
            title: "District Attorney",
            email: "t.anderson@county.gov",
            phone: "+1 (555) 010-2",
            role: "Recipient",
            languages: "en - English",
            source: "agency"
          }
        ],
        assigneeName: "Nicole Garcia",
        natureOfCrimes: ["Civil Matter"],
        additionalCaseInformation: "This case involves a civil divorce proceeding where the requesting party is seeking communications records to support custody claims. The matter does not involve criminal activity.",
        eu27DsaHarms: [],
        eu27DsaHarmsSubCategories: [],
        identifiers: [rejectedIdentifier1, rejectedIdentifier2],
        caseStage: "Rejected",
        rejectionReason: "This request involves a civil matter and does not meet the criteria for criminal law enforcement data disclosure. Subpoenas for civil cases must be redirected through appropriate civil legal channels.",
        startDate: undefined,
        endDate: undefined,
        dueDate: dueDate,
        timeZone: "America/Chicago (CST/CDT)",
        // Pre-populate authorization details from origin sender (subpoena)
        authorizationStartDate: new Date(2026, 0, 5), // January 5, 2026
        authorizationExpirationDate: new Date(2026, 3, 5), // April 5, 2026 (90 days)
        authorizationDesiredStatus: "Rejected",
        approvalType: "Administrative",
        approvalReferenceNumber: "SUB-2026-984174",
        approverName: "Clerk of Court - Maria Rodriguez",
        approverRole: "Court Clerk",
        approvalTimestamp: new Date(2026, 0, 5, 9, 15), // January 5, 2026 9:15 AM
        approvalIsEmergency: false,
        approverAlternateName: "M. Rodriguez - Court Services",
        approverEmail: "m.rodriguez@court.springfield.gov",
        approverPhoneNumber: "+1-555-0102",
        approvalDescription: "Subpoena issued for civil matter. Request does not meet requirements for criminal law enforcement data disclosure under applicable regulations.",
      }));
      
      // Set all documents to rejected status for this case
      setAvailableDocuments(prev => 
        prev.map(doc => ({
          ...doc,
          documentStatus: "Rejected"
        }))
      );
      
      // Initialize document invalid reasons with rejection reason
      const rejectionReason = "This request involves a civil matter and does not meet the criteria for criminal law enforcement data disclosure. Subpoenas for civil cases must be redirected through appropriate civil legal channels.";
      setDocumentInvalidReasons({
        'warrant-1': rejectionReason,
        'subpoena-1': rejectionReason,
        'ndo-1': rejectionReason
      });
      
      setIsDueDateManuallySet(true);
      return;
    }

    // Check if this is the cancelled test case (LNS-2025-00147)
    if (selectedCaseId === "LNS-2025-00147") {
      const cancelledId1 = createNewIdentifier();
      cancelledId1.value = "m.kovalenko@proton.me";
      cancelledId1.type = "Email Address";
      cancelledId1.taskStatus = "InProgress";
      cancelledId1.services.exchangeEnterprise.enabled = true;
      cancelledId1.services.exchangeEnterprise.categoryGroups.subscriberData.genericAttributes.enabled = true;
      cancelledId1.services.exchangeEnterprise.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("exchangeEnterprise", "subscriberData:genericAttributes");
      cancelledId1.services.exchangeEnterprise.categoryGroups.subscriberData.genericAttributes.collectionStatus = "Complete";
      cancelledId1.services.exchangeEnterprise.categoryGroups.authenticationLogs.genericAttributes.enabled = true;
      cancelledId1.services.exchangeEnterprise.categoryGroups.authenticationLogs.genericAttributes.taskId = generateTaskId("exchangeEnterprise", "authenticationLogs:genericAttributes");
      cancelledId1.services.exchangeEnterprise.categoryGroups.authenticationLogs.genericAttributes.collectionStatus = "Started";
      cancelledId1.services.exchangeEnterprise.accountExistence = {
        consumerExists: true,
        consumerAccounts: ["m.kovalenko@proton.me"],
        enterpriseExists: false,
      };
      const cancelledId2 = createNewIdentifier();
      cancelledId2.value = "+380-44-555-1234";
      cancelledId2.type = "Phone Number";
      cancelledId2.taskStatus = "InProgress";
      cancelledId2.services.teamsForBusiness.enabled = true;
      cancelledId2.services.teamsForBusiness.categoryGroups.subscriberData.genericAttributes.enabled = true;
      cancelledId2.services.teamsForBusiness.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("teamsForBusiness", "subscriberData:genericAttributes");
      setFormData((prev) => ({
        ...prev,
        caseId: "LNS-2025-00147",
        createDate: new Date(2025, 0, 20),
        caseNumber: "LNS-2025-00147",
        country: "Ukraine",
        jurisdiction: "International",
        requestType: "Search Warrant",
        requestOrigin: "MLAT Portal",
        agency: "Cyber Police of Ukraine",
        agencyPhone: "+380-44-246-1234",
        agencyAddress: { number: "11 Bohomoltsia St", city: "Kyiv", stateProvince: "Kyiv", postalCode: "01024" },
        agents: [{ id: generateAgentId(), name: "Oleksiy Petrov", title: "Senior Investigator", email: "o.petrov@cyberpolice.gov.ua", phone: "+380-44-246-1235", role: "Submitter", languages: "uk - Ukrainian, en - English", source: "agency" as const }],
        assigneeName: "David Chen",
        natureOfCrimes: ["Identity Theft", "Computer Fraud"],
        casePriority: "Urgent" as const,
        caseStage: "Cancelled",
        identifiers: [cancelledId1, cancelledId2],
        dueDate: new Date(2025, 1, 3),
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2025, 0, 15),
        timeZone: "Europe/Kiev (EET/EEST)",
        authorizationStartDate: new Date(2025, 0, 15),
        authorizationExpirationDate: new Date(2025, 3, 15),
        authorizationDesiredStatus: "Cancelled",
        approvalType: "Judicial",
        approvalReferenceNumber: "SW-UA-2025-00147",
        approverName: "Judge Iryna Hryshchenko",
        approverRole: "District Court Judge",
        approvalTimestamp: new Date(2025, 0, 15, 14, 30),
        approvalIsEmergency: false,
        approvalDescription: "Search warrant for electronic communications related to cross-border identity theft investigation.",
        additionalCaseInformation: "Cross-border identity theft case. Authorization cancelled due to diplomatic procedural changes in the MLAT channel.",
        mlat: true,
        eu27DsaHarms: [],
        eu27DsaHarmsSubCategories: [],
        notes: [],
        nonDisclosureOrders: [],
      }));
      setIsDueDateManuallySet(true);
      return;
    }

    // Check if this is the in-progress cancellation test case (LNS-2025-00151)
    if (selectedCaseId === "LNS-2025-00151") {
      const activeId1 = createNewIdentifier();
      activeId1.value = "r.nakamura@outlook.com";
      activeId1.type = "Email Address";
      activeId1.taskStatus = "InProgress";
      activeId1.services.exchangeEnterprise.enabled = true;
      activeId1.services.exchangeEnterprise.categoryGroups.subscriberData.genericAttributes.enabled = true;
      activeId1.services.exchangeEnterprise.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("exchangeEnterprise", "subscriberData:genericAttributes");
      activeId1.services.exchangeEnterprise.categoryGroups.subscriberData.genericAttributes.collectionStatus = "Started";
      activeId1.services.exchangeEnterprise.categoryGroups.contentData.genericAttributes.enabled = true;
      activeId1.services.exchangeEnterprise.categoryGroups.contentData.genericAttributes.taskId = generateTaskId("exchangeEnterprise", "contentData:genericAttributes");
      activeId1.services.exchangeEnterprise.accountExistence = {
        consumerExists: true,
        consumerAccounts: ["r.nakamura@outlook.com"],
        enterpriseExists: false,
      };
      const activeId2 = createNewIdentifier();
      activeId2.value = "ryota.nakamura@contoso.co.jp";
      activeId2.type = "Email Address";
      activeId2.taskStatus = "InProgress";
      activeId2.services.teamsForBusiness.enabled = true;
      activeId2.services.teamsForBusiness.categoryGroups.subscriberData.genericAttributes.enabled = true;
      activeId2.services.teamsForBusiness.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("teamsForBusiness", "subscriberData:genericAttributes");
      activeId2.services.oneDriveForBusiness.enabled = true;
      activeId2.services.oneDriveForBusiness.categoryGroups.trafficData.genericAttributes.enabled = true;
      activeId2.services.oneDriveForBusiness.categoryGroups.trafficData.genericAttributes.taskId = generateTaskId("oneDriveForBusiness", "trafficData:genericAttributes");
      activeId2.services.teamsForBusiness.accountExistence = {
        consumerExists: false,
        enterpriseExists: true,
        enterpriseAccounts: ["ryota.nakamura@contoso.co.jp"],
        enterpriseStorageLocation: "Japan East",
      };
      setFormData((prev) => ({
        ...prev,
        caseId: "LNS-2025-00151",
        createDate: new Date(2025, 0, 22),
        caseNumber: "LNS-2025-00151",
        country: "Japan",
        jurisdiction: "International",
        requestType: "Court Order",
        requestOrigin: "MLAT Portal",
        agency: "Tokyo Metropolitan Police",
        agencyPhone: "+81-3-3581-4321",
        agencyAddress: { number: "2-1-1 Kasumigaseki", city: "Tokyo", stateProvince: "Chiyoda", postalCode: "100-8929" },
        agents: [{ id: generateAgentId(), name: "Kenji Tanaka", title: "Detective Inspector", email: "k.tanaka@keishicho.metro.tokyo.jp", phone: "+81-3-3581-4322", role: "Submitter", languages: "ja - Japanese, en - English", source: "agency" as const }],
        assigneeName: "Sarah Mitchell",
        natureOfCrimes: ["Wire Fraud", "MoneyLaundering"],
        casePriority: "Expedite" as const,
        caseStage: "In Progress",
        identifiers: [activeId1, activeId2],
        dueDate: new Date(2025, 1, 5),
        startDate: new Date(2024, 10, 1),
        endDate: new Date(2025, 0, 20),
        timeZone: "Asia/Tokyo (JST)",
        authorizationStartDate: new Date(2025, 0, 20),
        authorizationExpirationDate: new Date(2025, 4, 20),
        authorizationDesiredStatus: "Cancelled",
        approvalType: "Judicial",
        approvalReferenceNumber: "CO-JP-2025-00151",
        approverName: "Judge Haruki Yamamoto",
        approverRole: "District Court Judge",
        approvalTimestamp: new Date(2025, 0, 20, 10, 0),
        approvalIsEmergency: false,
        approvalDescription: "Court order for electronic communications related to wire fraud and money laundering investigation.",
        additionalCaseInformation: "International wire fraud investigation. Authorization cancellation requested by the originating agency due to a change in prosecution strategy.",
        mlat: true,
        eu27DsaHarms: [],
        eu27DsaHarmsSubCategories: [],
        notes: [],
        nonDisclosureOrders: [],
      }));
      setIsDueDateManuallySet(true);
      return;
    }
    
    // Only initialize if no shared data exists
    // Create prepopulated identifiers
    const identifier1 = createNewIdentifier();
    identifier1.value = "john.anderson@contoso.com";
    identifier1.type = "Email Address";
    identifier1.services.exchangeEnterprise.enabled = true;
    identifier1.services.exchangeEnterprise.categoryGroups.subscriberData.genericAttributes.enabled = true;
    identifier1.services.exchangeEnterprise.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("exchangeEnterprise", "subscriberData:genericAttributes");
    identifier1.services.exchangeEnterprise.categoryGroups.authenticationLogs.genericAttributes.enabled = true;
    identifier1.services.exchangeEnterprise.categoryGroups.authenticationLogs.genericAttributes.taskId = generateTaskId("exchangeEnterprise", "authenticationLogs:genericAttributes");
    identifier1.services.exchangeEnterprise.categoryGroups.trafficData.genericAttributes.enabled = true;
    identifier1.services.exchangeEnterprise.categoryGroups.trafficData.genericAttributes.taskId = generateTaskId("exchangeEnterprise", "trafficData:genericAttributes");
    identifier1.services.exchangeEnterprise.categoryGroups.contentData.genericAttributes.enabled = true;
    identifier1.services.exchangeEnterprise.categoryGroups.contentData.genericAttributes.taskId = generateTaskId("exchangeEnterprise", "contentData:genericAttributes");
    identifier1.services.exchangeEnterprise.categoryGroups.subscriberData.paymentInformation.enabled = true;
    identifier1.services.exchangeEnterprise.categoryGroups.subscriberData.paymentInformation.taskId = generateTaskId("exchangeEnterprise", "subscriberData:paymentInformation");
    identifier1.services.oneDriveForBusiness.enabled = true;
    identifier1.services.oneDriveForBusiness.categoryGroups.trafficData.genericAttributes.enabled = true;
    identifier1.services.oneDriveForBusiness.categoryGroups.trafficData.genericAttributes.taskId = generateTaskId("oneDriveForBusiness", "trafficData:genericAttributes");
    identifier1.services.oneDriveForBusiness.categoryGroups.subscriberData.paymentInformation.enabled = true;
    identifier1.services.oneDriveForBusiness.categoryGroups.subscriberData.paymentInformation.taskId = generateTaskId("oneDriveForBusiness", "subscriberData:paymentInformation");
    
    // Add mock account existence data for identifier1
    identifier1.services.exchangeEnterprise.accountExistence = {
      consumerExists: false,
      enterpriseExists: true,
      enterpriseAccounts: ["john.anderson@contoso.com", "j.anderson@contoso.com"],
      enterpriseStorageLocation: "North America - East US 2",
      enterprisePrimaryId: "john.anderson@contoso.com",
      enterpriseRelatedIdentifiers: ["j.anderson@contoso.com"],
      enterpriseOrganizationId: "org-contoso-7a3f",
    };
    identifier1.services.oneDriveForBusiness.accountExistence = {
      consumerExists: false,
      enterpriseExists: true,
      enterpriseAccounts: ["john.anderson@contoso.com"],
      enterpriseStorageLocation: "North America - East US 2",
      enterprisePrimaryId: "john.anderson@contoso.com",
      enterpriseRelatedIdentifiers: ["j.anderson@contoso.com"],
      enterpriseOrganizationId: "org-contoso-7a3f",
    };

    const identifier2 = createNewIdentifier();
    identifier2.value = "+1-555-0147";
    identifier2.type = "Phone Number";
    identifier2.services.exchangeEnterprise.enabled = true;
    identifier2.services.exchangeEnterprise.categoryGroups.subscriberData.genericAttributes.enabled = true;
    identifier2.services.exchangeEnterprise.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("exchangeEnterprise", "subscriberData:genericAttributes");
    identifier2.services.exchangeEnterprise.categoryGroups.authenticationLogs.genericAttributes.enabled = true;
    identifier2.services.exchangeEnterprise.categoryGroups.authenticationLogs.genericAttributes.taskId = generateTaskId("exchangeEnterprise", "authenticationLogs:genericAttributes");
    
    // Additional identifiers provided by LE
    const identifier3 = createNewIdentifier();
    identifier3.value = "john.suspect@outlook.com";
    identifier3.type = "Email Address";
    identifier3.createdBy = "LE Agency";
    identifier3.accountExistenceStatus = "unknown";
    // Check Accounts data from fulfillment plan
    identifier3.checkAccounts = {
      dataLocation: "westus2",
      accountType: "Consumer",
      primaryIdentifier: "john.suspect@outlook.com",
      relatedIdentifiers: ["johnsuspect", "suspect.gaming@hotmail.com", "+1-206-555-0198"]
    };
    // Xbox service configuration
    identifier3.services.xbox.enabled = true;
    identifier3.services.xbox.startDate = subDays(new Date(), 90); // 90 days ago
    identifier3.services.xbox.endDate = new Date(); // Today
    identifier3.services.xbox.categoryGroups.subscriberData.genericAttributes.enabled = true;
    identifier3.services.xbox.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("xbox", "subscriberData:genericAttributes");
    identifier3.services.xbox.categoryGroups.authenticationLogs.genericAttributes.enabled = true;
    identifier3.services.xbox.categoryGroups.authenticationLogs.genericAttributes.taskId = generateTaskId("xbox", "authenticationLogs:genericAttributes");
    identifier3.services.xbox.categoryGroups.trafficData.genericAttributes.enabled = true;
    identifier3.services.xbox.categoryGroups.trafficData.genericAttributes.taskId = generateTaskId("xbox", "trafficData:genericAttributes");
    identifier3.services.xbox.categoryGroups.contentData.genericAttributes.enabled = true;
    identifier3.services.xbox.categoryGroups.contentData.genericAttributes.taskId = generateTaskId("xbox", "contentData:genericAttributes");
    // Skype service configuration
    identifier3.services.skype.enabled = true;
    identifier3.services.skype.categoryGroups.subscriberData.genericAttributes.enabled = true;
    identifier3.services.skype.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("skype", "subscriberData:genericAttributes");
    identifier3.services.skype.categoryGroups.trafficData.genericAttributes.enabled = true;
    identifier3.services.skype.categoryGroups.trafficData.genericAttributes.taskId = generateTaskId("skype", "trafficData:genericAttributes");
    identifier3.services.skype.categoryGroups.contentData.genericAttributes.enabled = true;
    identifier3.services.skype.categoryGroups.contentData.genericAttributes.taskId = generateTaskId("skype", "contentData:genericAttributes");
    identifier3.services.skype.categoryGroups.subscriberData.paymentInformation.enabled = true;
    identifier3.services.skype.categoryGroups.subscriberData.paymentInformation.taskId = generateTaskId("skype", "subscriberData:paymentInformation");
    
    const identifier4 = createNewIdentifier();
    identifier4.value = "suspect.account@hotmail.com";
    identifier4.type = "Email Address";
    identifier4.createdBy = "LE Agency";
    identifier4.accountExistenceStatus = "unknown";
    // Xbox service configuration
    identifier4.services.xbox.enabled = true;
    identifier4.services.xbox.categoryGroups.subscriberData.genericAttributes.enabled = true;
    identifier4.services.xbox.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("xbox", "subscriberData:genericAttributes");
    identifier4.services.xbox.categoryGroups.authenticationLogs.genericAttributes.enabled = true;
    identifier4.services.xbox.categoryGroups.authenticationLogs.genericAttributes.taskId = generateTaskId("xbox", "authenticationLogs:genericAttributes");
    identifier4.services.xbox.categoryGroups.trafficData.genericAttributes.enabled = true;
    identifier4.services.xbox.categoryGroups.trafficData.genericAttributes.taskId = generateTaskId("xbox", "trafficData:genericAttributes");
    identifier4.services.xbox.categoryGroups.contentData.genericAttributes.enabled = true;
    identifier4.services.xbox.categoryGroups.contentData.genericAttributes.taskId = generateTaskId("xbox", "contentData:genericAttributes");
    // Skype service configuration
    identifier4.services.skype.enabled = true;
    identifier4.services.skype.categoryGroups.subscriberData.genericAttributes.enabled = true;
    identifier4.services.skype.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("skype", "subscriberData:genericAttributes");
    identifier4.services.skype.categoryGroups.trafficData.genericAttributes.enabled = true;
    identifier4.services.skype.categoryGroups.trafficData.genericAttributes.taskId = generateTaskId("skype", "trafficData:genericAttributes");
    identifier4.services.skype.categoryGroups.contentData.genericAttributes.enabled = true;
    identifier4.services.skype.categoryGroups.contentData.genericAttributes.taskId = generateTaskId("skype", "contentData:genericAttributes");
    identifier4.services.skype.categoryGroups.subscriberData.paymentInformation.enabled = true;
    identifier4.services.skype.categoryGroups.subscriberData.paymentInformation.taskId = generateTaskId("skype", "subscriberData:paymentInformation");
    
    const identifier5 = createNewIdentifier();
    identifier5.value = "0x000000000A1B2C3D";
    identifier5.type = "PUID";
    identifier5.createdBy = "LE Agency";
    identifier5.accountExistenceStatus = "unknown";
    // Xbox service configuration
    identifier5.services.xbox.enabled = true;
    identifier5.services.xbox.categoryGroups.subscriberData.genericAttributes.enabled = true;
    identifier5.services.xbox.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("xbox", "subscriberData:genericAttributes");
    identifier5.services.xbox.categoryGroups.authenticationLogs.genericAttributes.enabled = true;
    identifier5.services.xbox.categoryGroups.authenticationLogs.genericAttributes.taskId = generateTaskId("xbox", "authenticationLogs:genericAttributes");
    identifier5.services.xbox.categoryGroups.trafficData.genericAttributes.enabled = true;
    identifier5.services.xbox.categoryGroups.trafficData.genericAttributes.taskId = generateTaskId("xbox", "trafficData:genericAttributes");
    identifier5.services.xbox.categoryGroups.contentData.genericAttributes.enabled = true;
    identifier5.services.xbox.categoryGroups.contentData.genericAttributes.taskId = generateTaskId("xbox", "contentData:genericAttributes");
    // Skype service configuration
    identifier5.services.skype.enabled = true;
    identifier5.services.skype.categoryGroups.subscriberData.genericAttributes.enabled = true;
    identifier5.services.skype.categoryGroups.subscriberData.genericAttributes.taskId = generateTaskId("skype", "subscriberData:genericAttributes");
    identifier5.services.skype.categoryGroups.trafficData.genericAttributes.enabled = true;
    identifier5.services.skype.categoryGroups.trafficData.genericAttributes.taskId = generateTaskId("skype", "trafficData:genericAttributes");
    identifier5.services.skype.categoryGroups.contentData.genericAttributes.enabled = true;
    identifier5.services.skype.categoryGroups.contentData.genericAttributes.taskId = generateTaskId("skype", "contentData:genericAttributes");
    identifier5.services.skype.categoryGroups.subscriberData.paymentInformation.enabled = true;
    identifier5.services.skype.categoryGroups.subscriberData.paymentInformation.taskId = generateTaskId("skype", "subscriberData:paymentInformation");
    
    // Calculate date range (last 90 days from create date)
    const createDate = new Date(); // Today
    const startDate = subDays(createDate, 90); // 90 days ago
    const endDate = new Date(); // Today
    const dueDate = addDays(createDate, 10); // 10 days from now
    
    setFormData((prev) => ({
      ...prev,
      caseId: "LNS-2025-888777",
      // Pre-populate all required fields from LE agent
      createDate: createDate,
      caseNumber: generateCaseNumber(), // Auto-generate case number
      relatedCaseNumbers: "",
      country: "United States",
      jurisdiction: "National",
      requestType: "Court Order",
      requestOrigin: "LE Portal",
      requestOriginOther: "",
      agency: "Federal Bureau of Investigation",
      agencyPhone: "+1 (202) 324-3000",
      agencyAddress: {
        number: "935 Pennsylvania Avenue NW",
        city: "Washington",
        stateProvince: "DC",
        postalCode: "20535",
      },
      agents: [
        {
          id: generateAgentId(),
          name: "Michael Chen",
          title: "Special Agent",
          email: "m.chen@fbi.gov",
          phone: "+1 (202) 555-0198",
          role: "Submitter",
          languages: "en - English, zh - Chinese",
          source: "agency"
        },
        {
          id: generateAgentId(),
          name: "Amanda Williams",
          title: "Special Agent in Charge",
          email: "amanda.williams@fbi.gov",
          phone: "+1 (202) 324-7800",
          role: "Recipient",
          languages: "en - English, fr - French",
          source: "agency"
        }
      ],
      assigneeName: "Sarah Williams",
      natureOfCrimes: ["Fraud", "Identity Theft", "MoneyLaundering"],
      additionalCaseInformation: "This investigation involves a sophisticated multi-state fraud operation targeting elderly victims through phishing schemes and identity theft. Suspects are using compromised email accounts to conduct wire transfers and money laundering activities. Immediate action required due to ongoing financial losses estimated at $2.3M across 47 victims in multiple jurisdictions.",
      eu27DsaHarms: [],
      eu27DsaHarmsSubCategories: [],
      identifiers: [identifier1, identifier2, identifier3, identifier4, identifier5],
      caseStage: "Waiting on Triage",
      startDate: startDate,
      endDate: endDate,
      dueDate: dueDate,
      timeZone: "America/New_York (EST/EDT)",
      // Pre-populate authorization details from origin sender (legal documents)
      authorizationStartDate: new Date(2024, 8, 25), // September 25, 2024
      authorizationExpirationDate: new Date(2024, 8, 28), // September 28, 2024
      authorizationDesiredStatus: "Approved",
      approvalType: "Judicial",
      approvalReferenceNumber: "SW-2024-001640545",
      approverName: "Magistrate John P. Williams",
      approverRole: "Magistrate Judge",
      approvalTimestamp: new Date(2024, 8, 25, 10, 45), // September 25, 2024 10:45 AM
      approvalIsEmergency: false,
      approvalDescription: "Probable cause established based on submitted affidavit. Investigation shows sufficient evidence of criminal activity requiring search of electronic communications and stored data. Scope of warrant is appropriately limited to relevant time period and data categories.",
    }));
    
    // Mark due date as manually set to prevent auto-calculation override
    setIsDueDateManuallySet(true);
  }, [sharedFormData, selectedCaseId]);

  // Side effects: due date auto-calc, sync, task status tracking, keyboard shortcuts
  // (extracted to hooks/useCaseEffects.ts)
  const { didLocalSyncRef } = useCaseEffects({
    formData,
    setFormData,
    setSharedFormData,
    isDueDateManuallySet,
    workflowStage,
    isEditingCollectionScope,
    setAvailableDocuments,
    availableDocuments,
    setDocumentInvalidReasons,
    setIdentifierViewMode,
    setWarrantModalOpen,
    setAttachmentZoom,
    setAttachmentRotation,
    openDocumentIds,
    setOpenDocumentIds,
    setActiveDocumentId,
    warrantModalOpen,
    setIdentifierPanelOpen,
    identifierPanelOpen,
    setFulfillmentInitialStep,
    collectionScopeSnapshotRef,
  });

  // Form handlers (extracted to hooks/useFormHandlers.ts)
  const {
    agencySearchOpen, setAgencySearchOpen,
    contactSearchOpen, setContactSearchOpen,
    agentToRemove, setAgentToRemove,
    handleInputChange,
    handleNatureOfCrimesToggle,
    handleEu27DsaHarmsToggle,
    handleEu27DsaHarmsSubCategoriesToggle,
    handleAddAgent,
    handleRemoveAgent,
    confirmRemoveAgent,
    cancelRemoveAgent,
    handleAgentChange,
    handleSelectAgency,
    handleSelectContact,
    handleDueDateChange,
    handleResetDueDate,
  } = useFormHandlers({ formData, setFormData, errors, setErrors, isDueDateManuallySet, setIsDueDateManuallySet });

  // Identifier management handlers moved to useIdentifierManagement hook

  // Return case to Triage stage (with unsaved changes guard)
  const handleReturnToTriage = () => {
    if (onNavigateToTriage) {
      guardedNavigate(() => {
        onNavigateToTriage();
        toast.success("Case returned to Triage stage");
      });
    }
  };

  // Handle "Back to Collection" with unsaved-edit guard
  const handleBackToCollection = () => {
    // First check form-level dirty state
    if (isFormDirty) {
      guardedNavigate(() => {
        onNavigateToCollection?.();
      });
      return;
    }
    
    if (!collectionScopeSnapshotRef.current) {
      // No snapshot — just navigate
      onNavigateToCollection?.();
      return;
    }

    const currentSnapshot = JSON.stringify(
      formData.identifiers.map(id => ({
        id: id.id,
        services: Object.fromEntries(
          Object.entries(id.services).map(([sk, svc]) => [sk, {
            enabled: svc.enabled,
            categoryGroups: Object.fromEntries(
              Object.entries(svc.categoryGroups || {}).map(([gk, group]: [string, any]) => [gk,
                Object.fromEntries(Object.entries(group || {}).map(([ik, cat]: [string, any]) => [ik, { enabled: (cat as any).enabled }]))
              ])
            ),
          }])
        ),
      }))
    );

    if (currentSnapshot !== collectionScopeSnapshotRef.current) {
      setShowBackToCollectionConfirm(true);
    } else {
      onNavigateToCollection?.();
    }
  };

  // Identifier expand/collapse helpers (defined before useCaseWorkflow which references expandAllIdentifiers)
  const toggleIdentifierExpanded = (identifierId: string) => {
    setExpandedIdentifiers((prev) => ({
      ...prev,
      [identifierId]: !prev[identifierId],
    }));
  };

  const expandAllIdentifiers = () => {
    const newExpandedIdentifiers: Record<string, boolean> = {};
    formData.identifiers.forEach((identifier) => {
      newExpandedIdentifiers[identifier.id] = true;
    });
    setExpandedIdentifiers(newExpandedIdentifiers);
  };

  const collapseAllIdentifiers = () => {
    setExpandedIdentifiers({});
  };

  // Service handlers (extracted to hooks/useServiceHandlers.ts)
  // Only destructure handleServiceToggle which is used; others are available via the hook if needed
  const {
    handleServiceToggle,
  } = useServiceHandlers({ formData, setFormData, setExpandedServices, workflowStage });

  // Case notes (extracted to hooks/useCaseNotes.ts). The legacy
  // `escalationNotes*` outputs are no longer destructured — the
  // structured attorney-escalation flow replaced that surface.
  const {
    newNoteText, setNewNoteText,
    newNoteAttachments, setNewNoteAttachments,
    handleAddNote,
    handleDeleteNote,
    handleEditNote,
  } = useCaseNotes({ formData, setFormData, handleInputChange });

  // Workflow handlers (extracted to hooks/useCaseWorkflow.ts)
  const {
    showFulfillmentSummary, setShowFulfillmentSummary,
    isSubmittingFulfillment,
    isFormValid,
    handleSubmit,
    handleFulfillmentSubmit,
    handleCheckAccountExistence,
    checkAccountsForIdentifiers,
    handleReset,
  } = useCaseWorkflow({
    formData,
    setFormData,
    errors,
    setErrors,
    setExpandedServices,
    setExpandedIdentifiers,
    setIsDueDateManuallySet,
    workflowStage,
    isEditingCollectionScope,
    availableDocuments,
    markAsSaved,
    onNavigateToFulfillment,
    onNavigateToCollection,
    onNavigateToReadySubmit,
    onNavigateToQueue,
    setCheckingExistence,
    setDisplayFrozen,
    setIdentifierViewMode,
    expandAllIdentifiers,
    wizardServiceConfig: wizardServiceConfigRef.current,
  });

  // Emit case-level action state up to App.tsx so the WorkflowListPane
  // (footer + scope-header action icons) can render the same Save / Submit /
  // panel-toggle / escalate controls without a direct reference back here.
  // Mirrors the onStepperStateChange pattern earlier in this component.
  //
  // Placed here (post-`useCaseWorkflow`) so all dependencies are in scope.
  // Moving this block earlier in the body trips a TDZ error caught by
  // `npm run typecheck` (TS2448).
  const escalationActionLabel = formData.attorneyEscalation
    ? formData.attorneyEscalation.status === "Resolved" ||
      formData.attorneyEscalation.status === "Cancelled"
      ? "Resume Escalation"
      : "Update Escalation"
    : "Escalate";
  const isResolved = formData.caseStage === "Resolved";
  useEffect(() => {
    if (!onWorkflowPaneActions) return;
    onWorkflowPaneActions({
      isDirty: isFormDirty,
      isSaving: isManualSaving,
      lastSavedAt: lastSavedTime,
      onSave: handleManualSave,
      canSubmit: isFormValid(),
      isSubmitting: false,
      onSubmit: () => {
        // Synthesize a form-submit event so handleSubmit's existing
        // signature (e: React.FormEvent) is satisfied without breaking
        // the legacy in-form Submit button.
        handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      },
      documentPanelOpen: warrantModalOpen,
      onToggleDocumentPanel: toggleDocumentPanel,
      identifierPanelOpen,
      onToggleIdentifierPanel:
        workflowStage === "fulfillment"
          ? () => {
              if (identifierPanelOpen) {
                setIdentifierPanelOpen(false);
              } else {
                setIdentifierPanelOpen(true);
                setIdentifierViewMode("fulfillment");
                setFulfillmentInitialStep(1);
              }
            }
          : undefined,
      correspondencePanelOpen,
      onToggleCorrespondencePanel: () =>
        setCorrespondencePanelOpen(!correspondencePanelOpen),
      escalationActionLabel,
      onEscalate: handleOpenEscalateDialog,
      onOpenResolveDialog: (mode) => {
        setResolveDialogMode(mode);
        if (mode === "edit") {
          setResolveDefaultReason(formData.resolutionReason);
          setResolveDefaultNotes(formData.resolutionNotes ?? "");
        } else {
          setResolveDefaultReason(undefined);
          setResolveDefaultNotes("");
        }
        setShowResolveCaseDialog(true);
      },
      isResolved,
      // onReopenCase intentionally omitted in this pass — it has an inline
      // ~30-line side-effect closure that's safer to keep colocated with
      // its existing call site for now.
    });
  }, [
    onWorkflowPaneActions,
    isFormDirty,
    isManualSaving,
    lastSavedTime,
    handleManualSave,
    handleSubmit,
    warrantModalOpen,
    toggleDocumentPanel,
    identifierPanelOpen,
    workflowStage,
    setIdentifierPanelOpen,
    setIdentifierViewMode,
    setFulfillmentInitialStep,
    correspondencePanelOpen,
    setCorrespondencePanelOpen,
    escalationActionLabel,
    handleOpenEscalateDialog,
    isResolved,
    formData.resolutionReason,
    formData.resolutionNotes,
    setResolveDialogMode,
    setResolveDefaultReason,
    setResolveDefaultNotes,
    setShowResolveCaseDialog,
    isFormValid,
  ]);

  // Open fulfillment summary modal
  const handleOpenFulfillmentSummary = () => {
    setShowFulfillmentSummary(true);
  };

  // ─── Forms & Letters (Phase 1) ────────────────────────────────────────
  // CaseFormInstance state lives on FormData.formInstances. These three
  // handlers are the only mutations the FormsLibrarySection needs.

  const handleCreateFormInstance = useCallback((instance: CaseFormInstance) => {
    setFormData((prev) => ({
      ...prev,
      formInstances: [...(prev.formInstances ?? []), instance],
    }));
  }, []);

  const handleUpdateFormInstance = useCallback(
    (instanceId: string, partial: Partial<CaseFormInstance>) => {
      setFormData((prev) => ({
        ...prev,
        formInstances: (prev.formInstances ?? []).map((inst) =>
          inst.instanceId === instanceId
            ? { ...inst, ...partial, updatedAt: new Date() }
            : inst,
        ),
      }));
    },
    [],
  );

  const handleDeleteFormInstance = useCallback((instanceId: string) => {
    setFormData((prev) => ({
      ...prev,
      formInstances: (prev.formInstances ?? []).filter(
        (inst) => inst.instanceId !== instanceId,
      ),
    }));
  }, []);

  // Slice D: pick-template handler shared by all Hub entry points
  // (Banner, UnreadAlert, accordion CorrespondenceSection). Creates the
  // instance via the same factory FormsLibrarySection uses, then surfaces
  // the new id via `composeOpenInstanceRequestId` so the inline
  // FormsLibrarySection in CorrespondenceSection opens the filler.
  const [composeOpenInstanceRequestId, setComposeOpenInstanceRequestId] =
    React.useState<string | null>(null);

  const handleHubPickTemplate = useCallback(
    (template: import("../types/formTemplate").FormTemplate) => {
      const instance = createFormInstance(template, formData);
      handleCreateFormInstance(instance);
      setComposeOpenInstanceRequestId(instance.instanceId);
    },
    [formData, handleCreateFormInstance],
  );

  /** Side-panel composer's "pick a template" handler. Identical to
   *  `handleHubPickTemplate` but returns the new instance id so the
   *  composer can stamp it on the pending chip — the outbound that
   *  eventually fires from the composer will carry `formInstanceId`
   *  pointing at the REAL CaseFormInstance the RS edited (and
   *  signed) in the FormFillerDialog, not at a bare template id. */
  const handleComposerPickTemplate = useCallback(
    (template: import("../types/formTemplate").FormTemplate): string => {
      const instance = createFormInstance(template, formData);
      handleCreateFormInstance(instance);
      setComposeOpenInstanceRequestId(instance.instanceId);
      return instance.instanceId;
    },
    [formData, handleCreateFormInstance],
  );

  // ─── Correspondence (Phase 2) ──────────────────────────────────────────
  // The cross-case store is the source of truth for correspondence. We
  // mirror its content into formData.correspondence so existing surfaces
  // (banner, sticky chip, accordion section, Hub) keep reading from a
  // single prop. Slice D's auto-sim + DemoControls write to the store;
  // this useSyncExternalStore subscription propagates those writes here.
  const storeCorrespondence = React.useSyncExternalStore(
    subscribeToCorrespondenceStore,
    () => getCorrespondenceForCase(formData.caseId),
    () => getCorrespondenceForCase(formData.caseId),
  );
  React.useEffect(() => {
    setFormData((prev) => {
      if (prev.correspondence === storeCorrespondence) return prev;
      return { ...prev, correspondence: storeCorrespondence };
    });
  }, [storeCorrespondence]);

  const handleAddInboundCorrespondence = useCallback(
    (item: InboundCorrespondenceItem) => {
      setFormData((prev) => {
        const next = [...(prev.correspondence ?? []), item];
        setCorrespondenceForCase(prev.caseId, next);
        return { ...prev, correspondence: next };
      });
    },
    [],
  );

  const handleMarkInboundRead = useCallback((itemId: string) => {
    setFormData((prev) => {
      const next = (prev.correspondence ?? []).map((item) => {
        if (item.id !== itemId || item.direction !== "Inbound") return item;
        return { ...item, readAt: item.readAt ?? new Date() };
      }) as CorrespondenceItem[];
      setCorrespondenceForCase(prev.caseId, next);
      return { ...prev, correspondence: next };
    });
  }, []);

  const handleClearInboundFollowUp = useCallback((itemId: string) => {
    setFormData((prev) => {
      const next = (prev.correspondence ?? []).map((item) => {
        if (item.id !== itemId || item.direction !== "Inbound") return item;
        if (!item.followUp) return item;
        return {
          ...item,
          followUp: { ...item.followUp, completedAt: new Date() },
        };
      }) as CorrespondenceItem[];
      setCorrespondenceForCase(prev.caseId, next);
      return { ...prev, correspondence: next };
    });
  }, []);

  // Suppress unused-variable hint — exported for the Demo Controls.
  void handleAddInboundCorrespondence;

  // ── Outbound: Send a signed form to the authority. Creates the
  // OutboundCorrespondenceItem linked to the form instance, writes to
  // the store, and transitions the form instance status to "Sent". The
  // auto-sim hook will then progress Sent → Delivered → Acknowledged.
  const handleSendSignedFormInstance = useCallback(
    (instance: CaseFormInstance) => {
      const caseId = formData.caseId;
      const now = new Date();
      const subject = (() => {
        // Best-effort subject: form name when available, else generic.
        const template = (formData.formInstances ?? []).find(
          (i) => i.instanceId === instance.instanceId,
        );
        void template;
        return `Signed form submission (${instance.templateId})`;
      })();
      const outbound: OutboundCorrespondenceItem = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? `corr-out-${crypto.randomUUID()}`
            : `corr-out-${Math.random().toString(36).slice(2, 10)}`,
        caseId,
        direction: "Outbound",
        counterparty: "IssuingAuthority",
        channel: "DecentralisedITSystem",
        subject,
        formInstanceId: instance.instanceId,
        createdAt: now,
        transmission: {
          status: "Sent",
          sentAt: now,
          sentBy: CURRENT_USER,
        },
      };
      const current = getCorrespondenceForCase(caseId);
      setCorrespondenceForCase(caseId, [...current, outbound]);
      // Flip the form-instance status to Sent so the library shows the
      // new badge + the Phase 1 picker hides the Send affordance.
      handleUpdateFormInstance(instance.instanceId, { status: "Sent" });
      toast.success("Form sent", {
        description: `Signed form queued to the issuing authority. Auto-delivery in ~10s.`,
      });
    },
    [formData.caseId, formData.formInstances, handleUpdateFormInstance],
  );

  // Transition an outbound item's transmission state (manual stamping).
  const handleTransitionOutboundCase = useCallback(
    (
      itemId: string,
      next: OutboundTransmissionStatus,
      audit?: Partial<OutboundCorrespondenceItem["transmission"]>,
    ) => {
      const caseId = formData.caseId;
      const current = getCorrespondenceForCase(caseId);
      const updated = transitionOutboundFn(current, itemId, next, audit);
      setCorrespondenceForCase(caseId, updated);
    },
    [formData.caseId],
  );

  // Free-text composer send — append the constructed outbound item.
  const handleSendFreeTextOutbound = useCallback(
    (item: OutboundCorrespondenceItem) => {
      const caseId = formData.caseId;
      const current = getCorrespondenceForCase(caseId);
      setCorrespondenceForCase(caseId, [...current, item]);
      toast.success("Letter sent", {
        description: `Auto-delivery in ~10s. The Outbox shows the lifecycle.`,
      });
    },
    [formData.caseId],
  );

  // Side-panel composer send. Two branches:
  //   • Attorney Escalation OFF — append the outbound as Sent and let the
  //     auto-sim cascade progress it through Delivered → Acknowledged.
  //   • Attorney Escalation ON  — hold the outbound in Draft with
  //     `pendingAttorneyReview: true`, then create (or extend) the
  //     case's AttorneyEscalation so the existing AttorneyReviewPanel
  //     surfaces the hold. The auto-sim hook skips held outbounds; the
  //     Release / Approve-with-Conditions handler in handleAttorneyAction
  //     above flips each held outbound back to Sent.
  const handleSendOutbound = useCallback(
    (
      item: OutboundCorrespondenceItem,
      opts: { attorneyEscalation: boolean },
    ) => {
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

        setFormData((prev) => {
          const counterpartyLabel =
            heldItem.counterparty === "IssuingAuthority"
              ? "the Issuing Authority"
              : "the Enforcing Authority";
          // Outbound-driven escalation is always case-wide (the
          // correspondence applies to the whole case, not a specific
          // task). Scope=all is the right default here.
          const scope: SignalScope = { kind: "all" };

          if (!isAttorneyEscalationActive(prev)) {
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
              prev,
              scope,
              escalation,
              auditEvent,
            );
            return {
              ...withEscalation,
              correspondence: nextCorrespondence,
            };
          }
          // Active escalation already exists — append this outbound id
          // to relatedOutboundIds via the helper so the hybrid-storage
          // rules are honoured (per-identifier + case-level mirror).
          const linked = linkHeldOutboundToEscalation(
            prev,
            scope,
            heldItem.id,
          );
          return {
            ...linked,
            correspondence: nextCorrespondence,
          };
        });

        toast.info("Outbound saved as Draft", {
          description:
            "Awaiting attorney review. The escalation banner now shows the hold.",
        });
        return;
      }

      // Normal send path.
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
      // Reply linkage — only inbound RFIs get the `respondedByOutbound`
      // stamp. The outbound's `inReplyToId` can technically point at any
      // inbound (e.g. a PAI when threading a follow-up RFI), but the
      // back-link + RfiReplied audit only make sense for inbound RFIs.
      // Filter the stamp set against the actual inbound kinds so a
      // follow-up RFI (sent in response to an inadequate PAI) doesn't
      // mis-stamp the PAI as "replied to".
      const candidateIds = new Set<string>([
        ...(sentItem.inReplyToId ? [sentItem.inReplyToId] : []),
        ...((sentItem as any).additionalRespondedInboundIds ?? []),
      ]);
      const stampTargets = new Set(
        Array.from(candidateIds).filter((id) => {
          const it = current.find((c) => c.id === id);
          return (
            it !== undefined &&
            isInbound(it) &&
            it.kind === "RequestAdditionalInformation"
          );
        }),
      );
      const next: CorrespondenceItem[] = stampTargets.size
        ? current.map((it) => {
            if (!isInbound(it)) return it;
            if (!stampTargets.has(it.id)) return it;
            return {
              ...it,
              respondedByOutbound: {
                outboundId: sentItem.id,
                status: "sent" as const,
              },
            };
          })
        : current;
      setCorrespondenceForCase(caseId, [...next, sentItem]);

      // EPOC Form 3 — Non-Execution Response halts the case's SLA clock
      // on send. We detect Form 3 by walking the attached form instance
      // back to its template id. Pause is idempotent — if the SLA is
      // already paused (e.g., a re-send of a Form 3), no second audit
      // event lands. Toast surfaces the pause so the RS knows the clock
      // stopped — Form 3 sends are infrequent and the side-effect is
      // material enough to call out.
      const isFormThree = (() => {
        if (!sentItem.formInstanceId) return false;
        const instance = (formData.formInstances ?? []).find(
          (fi) => fi.instanceId === sentItem.formInstanceId,
        );
        return instance?.templateId === "EPOC_FORM_3";
      })();
      // Detect the EPOC Preservation Acknowledgement outbound — fires
      // the PreservationOrderAcknowledged audit event so the active
      // banner swaps to the confirmation state.
      const isPreservationAck = (() => {
        if (!sentItem.formInstanceId) return false;
        const instance = (formData.formInstances ?? []).find(
          (fi) => fi.instanceId === sentItem.formInstanceId,
        );
        return instance?.templateId === "EPOC_PRESERVATION_ACK";
      })();

      if (isFormThree) {
        const form3DocumentId =
          sentItem.documentId ?? `outbound:${sentItem.id}`;
        const form3SentAt =
          sentItem.transmission?.sentAt instanceof Date
            ? sentItem.transmission.sentAt
            : new Date();
        setFormData((prev) =>
          applyForm3Submission(pauseSlaTimerOnFormThreeSubmission(prev), {
            documentId: form3DocumentId,
            sentAt: form3SentAt,
            source: `Form 3 doc ${form3DocumentId}`,
          }),
        );
        toast.success("Form 3 sent — SLA paused, 45-day retention started", {
          description:
            "The case's SLA countdown is halted and the 45-day data-deletion " +
            "window opened. Form3Submitted + SLAStopped events appended to the " +
            "audit thread.",
        });
      } else if (isPreservationAck) {
        const ackDocumentId =
          sentItem.documentId ?? `outbound:${sentItem.id}`;
        const ackSentAt =
          sentItem.transmission?.sentAt instanceof Date
            ? sentItem.transmission.sentAt
            : new Date();
        setFormData((prev) =>
          applyPreservationOrderAcknowledged(prev, {
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

      // Edge Case 2 decision 4 — when this outbound replies to one (or
      // more, via additionalRespondedInboundIds) inbound RFIs, fire a
      // single `RfiReplied` audit event so the AuditThread carries the
      // RFI→PAI link as a first-class event. The note captures the PAI
      // subject + the RFI subject(s) closed by this send. We dedupe by
      // an id that combines the outbound id with the sorted list of
      // inbound ids so re-sends don't double-write.
      const repliedInboundIds = Array.from(stampTargets);
      if (repliedInboundIds.length > 0) {
        const repliedSubjects = repliedInboundIds
          .map((id) => current.find((c) => c.id === id)?.subject)
          .filter((s): s is string => Boolean(s));
        const eventId = `audit-rfi-replied-${sentItem.id}`;
        const note =
          repliedInboundIds.length === 1
            ? `PAI "${sentItem.subject}" sent in reply to RFI "${repliedSubjects[0] ?? "(unknown)"}".`
            : `PAI "${sentItem.subject}" sent — closes ${repliedInboundIds.length} open RFIs: ${repliedSubjects.map((s) => `"${s}"`).join(", ")}.`;
        setFormData((prev) => {
          // Idempotent — bail if we already wrote this exact event.
          if (
            (prev.escalationAuditEvents ?? []).some((e) => e.id === eventId)
          ) {
            return prev;
          }
          return {
            ...prev,
            escalationAuditEvents: [
              ...(prev.escalationAuditEvents ?? []),
              {
                id: eventId,
                kind: "RfiReplied",
                actor: CURRENT_USER,
                performedAt: new Date(),
                note,
              },
            ],
          };
        });
      }
    },
    [formData.caseId, formData.formInstances],
  );

  /**
   * Handler for the SLA Deadline (case priority) tier picker. Replaces the
   * generic `handleInputChange` for this field so the due date stays in sync
   * with the chosen tier.
   *
   * Behaviour:
   *  - Compute the new due date from `tier.duration + max(now, dateReceived)`.
   *  - If the RS previously edited the due date manually
   *    (`dueDateManuallySetBy` is set), prompt before overwriting.
   *  - On accept: set casePriority + dueDate + clear `dueDateManuallySetBy`.
   *  - On decline: change casePriority only; leave dueDate alone.
   */
  const handleSlaTierChange = useCallback(
    (nextTier: string) => {
      const computedDue = computeSlaDueDate(
        nextTier,
        formData.dateReceived ?? formData.createDate ?? null,
      );
      const hasManualOverride = !!formData.dueDateManuallySetBy;
      let acceptRecompute = true;
      if (hasManualOverride) {
        acceptRecompute = window.confirm(
          `The due date was manually set by ${formData.dueDateManuallySetBy}. ` +
            `Reset it to the new SLA-derived deadline (${computedDue.toLocaleString()})?`,
        );
      }
      setFormData((prev) => ({
        ...prev,
        casePriority: nextTier as typeof prev.casePriority,
        ...(acceptRecompute
          ? {
              dueDate: computedDue,
              dueDateManuallySetBy: undefined,
            }
          : {}),
      }));
    },
    [formData.dateReceived, formData.createDate, formData.dueDateManuallySetBy],
  );

  return (
    <div className="h-full flex flex-col relative">
      {/* Data Recovery Dialog */}
      <DataRecoveryDialog
        isOpen={showRecoveryDialog}
        savedDate={autosave.lastSaved}
        onRecover={handleRecoverData}
        onDiscard={handleDiscardSavedData}
      />

      {/* Sticky Case Header with Workflow Progress and Case Info */}
      <StickyCaseHeader
        formData={formData}
        workflowStage={workflowStage}
        responseSpecialists={RESPONSE_SPECIALISTS}
        currentUser={CURRENT_USER}
        onAssigneeChange={(next) => handleInputChange("assigneeName", next)}
        onNavigateToTriage={() => guardedNavigate(onNavigateToTriage)}
        onNavigateToFulfillment={() => guardedNavigate(onNavigateToFulfillment)}
        onNavigateToQueue={() => guardedNavigate(onNavigateToQueue)}
        documentPanelOpen={warrantModalOpen}
        onToggleDocumentPanel={toggleDocumentPanel}
        documentPanelWidth={documentPanelWidth}
        identifierPanelOpen={identifierPanelOpen}
        onToggleIdentifierPanel={() => {
          if (identifierPanelOpen) {
            setIdentifierPanelOpen(false);
          } else {
            setIdentifierPanelOpen(true);
            setIdentifierViewMode("fulfillment");
            setFulfillmentInitialStep(1);
          }
        }}
        isDirty={isFormDirty}
        onSave={handleManualSave}
        isSaving={isManualSaving}
        lastSaved={lastSavedTime}
        caseIdentificationCompletionCount={caseIdentificationCompletionCount}
        isFormValid={isFormValid()}
        onSubmit={handleSubmit}
        sidebarCollapsed={sidebarCollapsed}
        onOpenCancellationWorkflow={() => setShowCancellationWorkflow(true)}
        cancellationAllStepsComplete={cancellationAllStepsComplete}
        onOpenResolveDialog={(mode) => {
          setResolveDialogMode(mode);
          if (mode === "edit") {
            setResolveDefaultReason(formData.resolutionReason);
            setResolveDefaultNotes(formData.resolutionNotes ?? "");
          } else {
            // Resolve mode: no preselect per user decision.
            setResolveDefaultReason(undefined);
            setResolveDefaultNotes("");
          }
          setShowResolveCaseDialog(true);
        }}
        onReopenCase={() => {
          // Push the live resolution into history and reset the case stage
          // back to "In Progress". The RS can re-resolve later via the
          // header button.
          const now = new Date();
          const actor = CURRENT_USER;
          setFormData((prev) => {
            const prevHistory = prev.resolutionHistory ?? [];
            const nextHistory = prev.resolutionReason
              ? [
                  {
                    reason: prev.resolutionReason,
                    notes: prev.resolutionNotes,
                    caseStageBefore: prev.caseStage,
                    resolvedAt: prev.caseResolvedAt ?? now,
                    resolvedBy: prev.caseResolvedBy ?? actor,
                    supersededAt: now,
                    supersededBy: actor,
                    supersededReason: "Reopen" as const,
                  },
                  ...prevHistory,
                ]
              : prevHistory;
            return {
              ...prev,
              caseStage: "In Progress",
              resolutionReason: undefined,
              resolutionNotes: undefined,
              caseResolvedAt: undefined,
              caseResolvedBy: undefined,
              resolutionHistory: nextHistory,
            };
          });
          toast.success("Case re-opened", {
            description: `Case ${formData.caseId} reset to "In Progress". Prior resolution kept in history.`,
          });
        }}
        onOpenEscalateDialog={handleOpenEscalateDialog}
        onToggleSlaPause={handleToggleSlaPause}
        stageCompletion={stageCompletion}
        navState={stageBarNavState}
        onStepClick={onStageBarStepClick}
        onNavigateToCollection={
          stageCompletion?.collection
            ? () => guardedNavigate(onNavigateToCollection)
            : undefined
        }
      />

      {/* Cancellation Workflow Dialog */}
      <CancellationWorkflowDialog
        open={showCancellationWorkflow}
        onOpenChange={setShowCancellationWorkflow}
        identifiers={formData.identifiers}
        caseStage={formData.caseStage}
        deliveryBlocked={cancellationDeliveryBlocked}
        onBlockDelivery={() => {
          setCancellationDeliveryBlocked(true);
          toast.success("Delivery blocked — no pending or new jobs will be delivered.");
        }}
        onSetIdentifierTaskStatus={(identifierId, status) => {
          handleUpdateTaskStatus(identifierId, status);
        }}
        onSetCaseStage={(stage) => {
          setFormData((prev) => ({ ...prev, caseStage: stage }));
          toast.success(`Case status set to ${stage}.`);
        }}
        workflowPaneVisible={workflowPaneVisible}
        onShowWorkflowPane={onShowWorkflowPane}
        workflowActiveStepLabel={workflowActiveStepLabel}
      />

      {/* Main content area - flex-1 takes remaining space below header */}
      <div className="flex-1 overflow-hidden relative">

      {/* Warrant Attachment Side Panel */}
      {warrantModalOpen && (
        <DocumentViewerPanel
          showFulfillmentSummary={showFulfillmentSummary}
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
          onClose={() => setWarrantModalOpen(false)}
          modalCloseButtonRef={modalCloseButtonRef}
          modalTriggerButtonRef={modalTriggerButtonRef}
        />
      )}


      {/* Docs close tab removed - panel toggle relocated to StickyCaseHeader navigation tabs */}

      {/* Correspondence Hub side panel — mounted INSIDE the same
          relative container as DocumentViewerPanel so it anchors below
          the StickyCaseHeader and shares the case-body positioning
          context. Mutual-exclusion with the document panel is wired in
          the setCorrespondencePanelOpen wrapper above. */}
      {correspondencePanelOpen && (
        <CorrespondencePanel
          open={correspondencePanelOpen}
          onClose={() => setCorrespondencePanelOpen(false)}
          caseId={formData.caseId}
          caseFormData={formData}
          items={formData.correspondence}
          panelWidth={correspondencePanelWidth}
          panelMaxWidth={documentPanelMaxWidth}
          onResize={setCorrespondencePanelWidth}
          onSend={handleSendOutbound}
          externalComposerRequest={externalComposerRequest}
          onComposeWithTemplate={handleComposerPickTemplate}
          onRetractForm3={handleOpenRetractForm3Dialog}
        />
      )}

      {/* Scrollable Form Container - positions scrollbar at left edge of document panel */}
      {/* Hide case form when identifier panel is open */}
      {!identifierPanelOpen && (
      <div
        className="h-full flex flex-col overflow-hidden transition-all duration-300"
        style={{
          marginRight: warrantModalOpen
            ? documentPanelWidth
            : correspondencePanelOpen
              ? correspondencePanelWidth
              : 0,
        }}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-gray-50 [&::-webkit-scrollbar-thumb]:bg-[#8a8886] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-gray-50 [&::-webkit-scrollbar-thumb]:hover:bg-[#605e5c]">
        <form
          id="case-form"
          onSubmit={handleSubmit}
          /* Phase 3: form keeps vertical padding only; horizontal padding +
             max-width is owned by the <PageContainer> below so the body
             centers at 1280px on wide monitors and uses --page-gutter-x
             (32px) horizontally. The sticky header above stays full-bleed
             (NOT inside the container) to keep action chips edge-anchored. */
          className="pb-20 pt-4 transition-all duration-300 min-h-full"
        >
        <PageContainer>
        {/* Phase 2: Correspondence Hub discoverability banner. Mounted
            above the case-summary accordion list so the eEvidence
            communications surface is one click away from any stage. */}
        <div className="mb-4">
          <CorrespondenceBanner
            items={formData.correspondence}
            onMarkInboundRead={handleMarkInboundRead}
            onOpenPanel={() => setCorrespondencePanelOpen(true)}
          />
        </div>

        {/* Page-top alert zone — relocated out of the Case Overview
            accordion (`caseOverviewContent` below) so collapsing the
            accordion can no longer hide time-sensitive escalation
            alerts. Order preserves the existing severity ranking from
            when these lived inside Case Overview: GFR first (EA legal
            veto), then attorney-prompt / RFI / conditions. The two
            review-required summary alerts at the bottom point back to
            the full AttorneyReviewPanel / PeerReviewPanel still mounted
            inside Case Overview. */}
        {(() => {
          const esc = getActiveAttorneyEscalation(formData);
          const isTerminal = esc?.status === "ApprovedForDelivery";
          const showAttorneyAlert =
            !!esc && esc.role === "Attorney" && !isTerminal;
          const showPeerAlert =
            !!esc && esc.role !== "Attorney" && !isTerminal;
          // Reuse the same assigneeLabel logic that drives the Attorney
          // Dashboard's Escalated To column so the page-top alert reads
          // identically across surfaces.
          const summary =
            (showAttorneyAlert || showPeerAlert)
              ? getEscalationSummaryForCase(formData.caseId)
              : undefined;
          return (
            <div className="space-y-3 mb-4">
              <GroundsForRefusalPanel
                formData={formData}
                onRetractForm3={handleOpenRetractForm3Dialog}
                onResumeDelivery={handleResumeDelivery}
              />
              <EnterpriseEscalationBanner
                formData={formData}
                onOpenEscalateDialog={handleOpenEscalateDialog}
              />
              <RfiReplyOverdueBanner
                formData={formData}
                onOpenEscalateDialog={handleOpenEscalateDialog}
              />
              <AwaitingInfoReplyBanner
                formData={formData}
                onOpenEscalateDialog={handleOpenEscalateDialog}
                onSendAnotherRfi={handleBannerSendAnotherRfi}
                onDismiss={handleBannerDismiss}
              />
              <ConditionsBanner
                formData={formData}
                onAcknowledge={handleAcknowledgeConditions}
              />
              {showAttorneyAlert && esc && (
                <ReviewRequiredAlertBanner
                  role="attorney"
                  status={esc.status}
                  assigneeLabel={summary?.assigneeLabel ?? "Any Attorney"}
                  onReview={() =>
                    scrollToCaseOverviewPanel("attorney-review-panel")
                  }
                />
              )}
              {showPeerAlert && esc && (
                <ReviewRequiredAlertBanner
                  role="peer"
                  status={esc.status}
                  assigneeLabel={
                    summary?.assigneeLabel ?? "Any reviewer"
                  }
                  onReview={() =>
                    scrollToCaseOverviewPanel("peer-review-panel")
                  }
                />
              )}
            </div>
          );
        })()}

        {/* Case Summary and Tabbed Navigation */}
        <CaseSummaryAndTabs
          completedSections={completedStepperSections}
          activeStepKey={activeStepKey}
          onActiveStepKeyChange={setActiveStepKey}
          multiExpand={multiStepMode}
          expandedKeys={expandedStepKeys}
          onExpandedKeysChange={setExpandedStepKeys}
          sectionToggleButton={
            <StepperControlsMenu
              allCardsExpanded={sections.allExpanded}
              expandAllCards={sections.expandAll}
              collapseAllCards={sections.collapseAll}
              multiStepMode={multiStepMode}
              onToggleMultiStep={handleToggleMultiStep}
              onExpandAllSteps={handleExpandAllSteps}
              onCollapseToActive={handleCollapseToActive}
            />
          }
          caseOverviewContent={
            <>
        {/* AttorneyReviewPanel + PeerReviewPanel — the full review
            surfaces remain inside Case Overview as the detail UI
            (reason box, action buttons, sub-blocks). The compact
            "Review required" alerts in the page-top zone above link
            back to these panels via DOM id + scrollIntoView. The five
            compact banners that used to live here (GFR /
            EnterpriseEscalation / RfiReplyOverdue / AwaitingInfoReply /
            Conditions) were relocated to the page-top zone above. */}
        <div className="space-y-3 mb-4">
          <AttorneyReviewPanel
            formData={formData}
            onAttorneyAction={handleAttorneyAction}
          />
          <PeerReviewPanel
            formData={formData}
            onPeerAction={handlePeerAction}
          />
        </div>

        {/* Case Details Section - Fluent Design. Outer vertical rhythm
            consumes the Phase 1 spacing token so Phase 2 can retune the
            whole-page gap in one diff. Today the token defaults to 16px
            (Fluent spacingVerticalL) — identical to the previous
            `space-y-4` so there's no visual change. */}
        <div className="space-y-[var(--section-gap)]">
        {/* Row 1 (legacy "Assigned To" card) was removed — assignment is
            now an action chip in the workflow banner (Surface B) and on
            every queue row (Surface A). The `assigneeName` field is
            still required for submission; that validation stays in
            `isFormValid()` and the chip's red focus / unassigned
            placeholder communicates the missing-value state. */}

        {/* Row 2: Status & SLA Deadline - Full Width */}
        <PrimaryCard
          accent="blue"
          accentClass={cn(
            CARD_ACCENTS.blue,
            formData.casePriority === "Emergency" && CARD_ACCENTS.red,
            formData.casePriority === "Urgent" && CARD_ACCENTS.orange,
          )}
        >
          <CollapsibleSection
            sectionId="status-priority"
            isOpen={sections.isOpen("status-priority")}
            onToggle={() => sections.toggle("status-priority")}
            header={
              <>
                <div className="w-8 h-8 bg-[#0078d4] rounded flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-[#323130] text-lg">Status & SLA Deadline</h2>
                  <p className="text-xs text-[#605e5c]">Timeline, status tracking, and SLA monitoring</p>
                </div>
              </>
            }
            collapsedSummary={
              <Badge variant="outline" className="text-xs">
                {getPriorityDisplayName(formData.casePriority || "Routine")} / {formData.caseStage || "Not set"}
              </Badge>
            }
          >

          {/* Case SLA Deadline & Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[#323130] font-semibold flex items-center gap-2 text-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className={cn(
                      "w-4 h-4 cursor-help",
                      formData.casePriority === "Emergency" ? "text-[#d13438]" : 
                      formData.casePriority === "Urgent" ? "text-[#ca5010]" :
                      formData.casePriority === "Expedite" ? "text-[#f59e0b]" :
                      "text-[#0078d4]"
                    )} />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-sm">SLA Guidelines</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#d13438] mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-[#d13438]">Emergency - No Legal Demand:</span> 2-3 hour SLA • Acknowledge within 20 min
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-[#ca5010] mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-[#ca5010]">Emergency - Legal Demand Attached:</span> 3 business days SLA
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#f59e0b] mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-[#f59e0b]">Expedite:</span> 5 business days SLA
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0078d4] mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-[#0078d4]">Routine:</span> 10 business days SLA
                          </div>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              SLA Deadline <span className="text-[#d13438]">*</span>
            </Label>

            {/* SLA Deadline tier picker — drives the case due date.
             *  Picking a tier sets dueDate = max(now, dateReceived) + tier.duration.
             *  If the RS manually overrode dueDate earlier, a confirm prompt
             *  appears before the recompute. */}
            <Select
              value={formData.casePriority || ""}
              onValueChange={handleSlaTierChange}
            >
              <SelectTrigger
                aria-label="Select SLA deadline tier"
                aria-required="true"
                className={cn(
                  "h-8 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white",
                  !formData.casePriority && "text-[#a19f9d]"
                )}
              >
                <SelectValue placeholder="Select SLA deadline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Emergency">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#d13438]" />
                    <span className="font-medium">Emergency — No Legal Demand</span>
                    <span className="text-xs text-[#605e5c] ml-1">3 hr SLA</span>
                  </div>
                </SelectItem>
                <SelectItem value="Urgent">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#ca5010]" />
                    <span className="font-medium">Urgent — Legal Demand Attached</span>
                    <span className="text-xs text-[#605e5c] ml-1">3 hr SLA</span>
                  </div>
                </SelectItem>
                <SelectItem value="Expedite">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#f59e0b]" />
                    <span className="font-medium">Expedite</span>
                    <span className="text-xs text-[#605e5c] ml-1">5 day SLA</span>
                  </div>
                </SelectItem>
                <SelectItem value="Routine">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0078d4]" />
                    <span className="font-medium">Routine</span>
                    <span className="text-xs text-[#605e5c] ml-1">10 day SLA</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Case Status */}
          <div className="space-y-1.5">
              <Label htmlFor="caseStage" className="text-[#323130] font-semibold text-sm">
                Case Status <span className="text-[#d13438]">*</span>
              </Label>
              <Select
                value={formData.caseStage}
                onValueChange={(value) => handleInputChange("caseStage", value)}
              >
                <SelectTrigger 
                  id="caseStage"
                  aria-label="Select case status"
                  aria-required="true"
                  className={cn(
                    "h-8 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white",
                    errors.caseStage && "border-[#d13438]"
                  )}
                >
                  <SelectValue placeholder="Select case status" />
                </SelectTrigger>
                <SelectContent>
                  {(workflowStage === "fulfillment" ? FULFILLMENT_STAGES : CASE_STAGES).map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.caseStage && (
                <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.caseStage}
                </p>
              )}
          </div>
          </div>

          {/* Authorization Desired Status & Request Origin Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Authorization Desired Status */}
          <div className="space-y-1.5">
              <Label className="text-[#323130] font-semibold text-sm">
                Authorization Desired Status
              </Label>
              <div className="h-8 px-3 flex items-center rounded-md border border-[#e1dfdd] bg-[#f3f2f1] text-sm text-[#323130]">
                {formData.authorizationDesiredStatus || "Not provided"}
              </div>
          </div>

          {/* Request Origin */}
          <div className="space-y-1.5">
              <Label htmlFor="requestOriginOverview" className="text-[#323130] font-semibold text-sm">
                Request Origin <span className="text-[#d13438]">*</span>
              </Label>
              <Select
                value={formData.requestOrigin}
                onValueChange={(value) => {
                  handleInputChange("requestOrigin", value);
                  if (value !== "Other") {
                    handleInputChange("requestOriginOther", "");
                  }
                }}
              >
                <SelectTrigger
                  id="requestOriginOverview"
                  aria-label="Select request origin"
                  aria-required="true"
                  className={cn(
                    "h-8 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white",
                    errors.requestOrigin && "border-[#d13438]"
                  )}
                >
                  <SelectValue placeholder="Select request origin" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_ORIGIN_OPTIONS.map((origin) => (
                    <SelectItem key={origin} value={origin}>
                      {origin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.requestOrigin && (
                <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.requestOrigin}
                </p>
              )}
              {/* "Other" description appears inline below the Select when
                  requestOrigin === "Other". Moved here from the Request Type
                  card since Request Origin lives in Case Overview now. */}
              {formData.requestOrigin === "Other" && (
                <div className="space-y-1.5 mt-2">
                  <Label htmlFor="requestOriginOther" className="text-[#323130] font-semibold text-sm">
                    Describe Request Origin <span className="text-[#d13438]">*</span>
                  </Label>
                  <Input
                    id="requestOriginOther"
                    value={formData.requestOriginOther}
                    onChange={(e) => handleInputChange("requestOriginOther", e.target.value)}
                    placeholder="Describe how the request was received"
                    className={cn(
                      "h-8 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white",
                      errors.requestOriginOther && "border-[#d13438]"
                    )}
                    aria-required="true"
                  />
                  {errors.requestOriginOther && (
                    <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.requestOriginOther}
                    </p>
                  )}
                </div>
              )}
          </div>
          </div>

          <Separator className="bg-[#edebe9]" />

          {/* Timeline Section - Compact Layout */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Create Date - inline read-only text */}
              <div className="flex items-center gap-1.5 h-8 pr-3 border-r border-[#e1dfdd]">
                <CalendarIcon className="w-3.5 h-3.5 text-[#605e5c] flex-shrink-0" />
                <span className="text-xs text-[#605e5c]">Created</span>
                <span className="text-xs text-[#323130] font-medium">
                  {formData.createDate ? format(formData.createDate, "MMM d, yyyy") : "Not set"}
                </span>
                {errors.createDate && (
                  <span className="text-[#d13438] text-xs flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3 h-3" />
                    {errors.createDate}
                  </span>
                )}
              </div>

              {/* Due Date — single trigger; quick shortcuts and Reset
                  live inside the calendar popover so the form row stays
                  to one button. Was a 6-button cluster before. */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-[#605e5c]">Due <span className="text-[#d13438]">*</span></span>
                <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      aria-label="Select due date"
                      className={cn(
                        "justify-start text-left h-8 bg-white border-[#c8c6c4] hover:border-[#605e5c] transition-colors px-2.5",
                        !formData.dueDate && "text-[#a19f9d]"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {formData.dueDate ? format(formData.dueDate, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    {/* Quick shortcuts row — most common SLA jumps so the
                        RS doesn't need to navigate the calendar for the
                        usual cases. Each click sets the date AND closes
                        the popover so the user sees the trigger update. */}
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-[#edebe9]">
                      <span className="text-[11px] uppercase tracking-wide font-semibold text-[#605e5c] mr-1">Quick</span>
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => { handleDueDateChange(new Date()); setDueDatePopoverOpen(false); }}
                        className="h-6 px-2 text-xs hover:bg-[#deecf9] transition-colors">
                        Today
                      </Button>
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => { handleDueDateChange(addDays(new Date(), 1)); setDueDatePopoverOpen(false); }}
                        className="h-6 px-2 text-xs hover:bg-[#deecf9] transition-colors">
                        +1d
                      </Button>
                      {/* CELA policy: SLA windows are measured in
                          calendar days, not business days. The shortcut
                          labels match. */}
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => { handleDueDateChange(addDays(new Date(), 5)); setDueDatePopoverOpen(false); }}
                        className="h-6 px-2 text-xs hover:bg-[#deecf9] transition-colors">
                        +5d
                      </Button>
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => { handleDueDateChange(addDays(new Date(), 10)); setDueDatePopoverOpen(false); }}
                        className="h-6 px-2 text-xs hover:bg-[#deecf9] transition-colors">
                        +10d
                      </Button>
                    </div>
                    {/* Outlook-style single-month picker with Day → Month
                        → Year drill-down navigation. Built locally so
                        the rest of the app's Calendar consumers stay on
                        the simple two-chevron caption. */}
                    <OutlookDatePicker
                      selected={formData.dueDate}
                      onSelect={(d) => { handleDueDateChange(d); setDueDatePopoverOpen(false); }}
                      fromYear={new Date().getFullYear() - 1}
                      toYear={new Date().getFullYear() + 5}
                      initialFocus
                    />
                    {/* Reset — only renders when the date is a manual
                        override AND we have an SLA baseline to revert to.
                        Lives at the popover footer so it's discoverable
                        without crowding the case-form row. */}
                    {isDueDateManuallySet && formData.createDate && formData.jurisdiction && (
                      <div className="flex items-center justify-end px-3 py-2 border-t border-[#edebe9] bg-[#faf9f8]">
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => { handleResetDueDate(); setDueDatePopoverOpen(false); }}
                          className="h-7 text-xs text-[#0078d4] hover:text-[#106ebe] hover:bg-[#deecf9] px-2">
                          <Undo2 className="w-3 h-3 mr-1" />
                          Reset to SLA
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Compact SLA / day-difference indicator */}
            {formData.dueDate && formData.createDate && (
              <div className="flex items-center gap-2 flex-wrap pl-0.5">
                <span className={cn(
                  "text-xs font-medium",
                  differenceInDays(formData.dueDate, formData.createDate) < 0
                    ? "text-[#d13438]"
                    : differenceInDays(formData.dueDate, formData.createDate) <= 3
                    ? "text-[#ca5010]"
                    : "text-[#0078d4]"
                )}>
                  {Math.abs(differenceInDays(formData.dueDate, formData.createDate))}{" "}
                  {Math.abs(differenceInDays(formData.dueDate, formData.createDate)) === 1 ? "day" : "days"}
                  {differenceInDays(formData.dueDate, formData.createDate) < 0 ? " overdue" : " remaining"}
                </span>
                {formData.country && (
                  <Badge variant="outline" className="bg-white border-[#e1dfdd] text-[#605e5c] text-xs h-5 px-1.5">
                    {formData.casePriority === "Emergency"
                      ? "2-3hr SLA"
                      : `${calculateSLADays(formData.casePriority, formData.country)}d SLA`}
                  </Badge>
                )}
                <span className="text-xs text-[#a19f9d]">·</span>
                <span className="text-xs text-[#605e5c]">
                  {isDueDateManuallySet
                    ? `Manual${formData.dueDateManuallySetBy ? ` (${formData.dueDateManuallySetBy})` : ""}`
                    : "Auto from SLA"}
                </span>
              </div>
            )}
          </div>

          <Separator className="bg-[#edebe9]" />
          
          {/* Form Fields Grid */}
          <div className="space-y-3">
              {/* Rejection Reason (Conditional) */}
              {formData.caseStage === "Rejected" && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason" className="text-[#323130] font-semibold">
                    Rejection Reason <span className="text-[#d13438]">*</span>
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Explain why this case was rejected..."
                    value={formData.rejectionReason}
                    onChange={(e) => handleInputChange("rejectionReason", e.target.value)}
                    aria-label="Enter rejection reason"
                    aria-required="true"
                    className={cn(
                      "min-h-[100px] border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white resize-y",
                      errors.rejectionReason && "border-[#d13438]"
                    )}
                  />
                  {errors.rejectionReason && (
                    <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.rejectionReason}
                    </p>
                  )}
                  <p className="text-[#605e5c] text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    Provide a detailed explanation for why this case was rejected
                  </p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </PrimaryCard>


          {/* Case Identification Card - Full Width */}
          <PrimaryCard accent="blue">
            <CollapsibleSection
              sectionId="case-identification"
              isOpen={sections.isOpen("case-identification")}
              onToggle={() => sections.toggle("case-identification")}
              header={
                <>
                  <div className="w-8 h-8 bg-[#deecf9] rounded flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-[#0078d4]" />
                  </div>
                  <div>
                    <h3 className="text-[#323130] font-semibold">Case Identification</h3>
                    <p className="text-xs text-[#605e5c]">Reference numbers and timeline</p>
                  </div>
                </>
              }
              collapsedSummary={
                formData.caseNumber ? (
                  <Badge variant="outline" className="text-xs">{formData.caseNumber}</Badge>
                ) : null
              }
            >
              {/* Card Fields Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
                {/* LENS Case Number */}
                <div className="space-y-2">
                  <Label htmlFor="caseNumber" className="text-[#323130] font-semibold">
                    LENS Case Number
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="caseNumber"
                      aria-label="LENS case number"
                      aria-readonly="true"
                      aria-describedby="caseNumber-hint"
                      value={formData.caseNumber}
                      readOnly
                      placeholder="Auto-generated"
                      className="h-8 bg-[#f3f2f1] border-[#c8c6c4] text-[#323130]"
                    />
                    <CopyButton
                      text={formData.caseNumber}
                      label="Copy case number"
                      variant="icon"
                      size="md"
                      className="shrink-0"
                    />
                  </div>
                  <p id="caseNumber-hint" className="text-[#605e5c] text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    Auto-generated for each case
                  </p>
                </div>

                {/* LE Reference Number */}
                <div className="space-y-2">
                  <Label htmlFor="agencyCaseNumber" className="text-[#323130] font-semibold">
                    LE Reference Number
                  </Label>
                  <Input
                    id="agencyCaseNumber"
                    aria-label="LE reference number"
                    aria-describedby="agencyCaseNumber-hint"
                    value={formData.agencyCaseNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, agencyCaseNumber: e.target.value });
                      if (errors.agencyCaseNumber) {
                        setErrors({ ...errors, agencyCaseNumber: "" });
                      }
                    }}
                    placeholder="Enter LE reference number"
                    className="h-8 border-[#c8c6c4] text-[#323130]"
                  />
                  <p id="agencyCaseNumber-hint" className="text-[#605e5c] text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    Law Enforcement Authority's Original Case Reference Number(s)
                  </p>
                </div>

                {/* Related DARS Cases — searchable picker. Searches across LNS,
                    agency, agency contact, tenant, target identifier values,
                    and LE reference numbers. Stores the picked case IDs as a
                    comma-separated string to preserve the FormData contract. */}
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="relatedCaseNumbers" className="text-[#323130] font-semibold">
                    Related DARS Cases
                  </Label>
                  <RelatedDARSCaseSearch
                    id="relatedCaseNumbers"
                    value={formData.relatedCaseNumbers}
                    onChange={(next) => {
                      setFormData({ ...formData, relatedCaseNumbers: next });
                      if (errors.relatedCaseNumbers) {
                        setErrors({ ...errors, relatedCaseNumbers: "" });
                      }
                    }}
                    currentCaseId={formData.caseId}
                    hint="Search by LNS number, agency, agency contact name/email/phone, tenant, target identifier, or LE reference number."
                    error={errors.relatedCaseNumbers}
                  />
                </div>

                {/* eEvidence — structured Related Case(s) summary cards.
                    Hidden entirely on non-eEvidence cases. */}
                {formData.requestType === "eEvidence" && (
                  <div className="space-y-2 lg:col-span-2 mt-2">
                    <Label className="text-[#323130] font-semibold">
                      Related Case(s)
                    </Label>
                    <RelatedCasesBlock items={formData.eevidenceRelatedCases} />
                  </div>
                )}

                {/* Rejection Reason - Conditional Field */}
                {formData.caseStage === "Rejected" && (
                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor="rejectionReason" className="text-[#323130] font-semibold">
                      Rejection Reason <span className="text-[#d13438]">*</span>
                    </Label>
                    <Textarea
                      id="rejectionReason"
                      placeholder="Explain why this case was rejected..."
                      value={formData.rejectionReason}
                      onChange={(e) => handleInputChange("rejectionReason", e.target.value)}
                      aria-label="Enter rejection reason"
                      aria-required="true"
                      className={cn(
                        "min-h-[100px] border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white resize-y",
                        errors.rejectionReason && "border-[#d13438]"
                      )}
                    />
                    {errors.rejectionReason && (
                      <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.rejectionReason}
                      </p>
                    )}
                    <p className="text-[#605e5c] text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                      Provide a detailed explanation for why this case was rejected
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </PrimaryCard>
        </div>

        {/* Audit Thread relocated — the full thread now lives in the
            Operational Case Review section (belowTabsContent). When
            the case has audit events we surface a quick-jump link
            here so the RS doesn't have to scroll. The link calls
            setActiveStepKey("review") which opens that section in
            the AccordionStepper. Self-hides when no events exist. */}
        {(formData.escalationAuditEvents ?? []).length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-[#e1dfdd] bg-[#faf9f8] px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <ListChecks className="w-4 h-4 text-[#5c2d91] flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#323130] truncate">
                Audit thread has{" "}
                <span className="font-semibold">
                  {formData.escalationAuditEvents!.length}
                </span>{" "}
                event
                {formData.escalationAuditEvents!.length === 1 ? "" : "s"}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveStepKey("review")}
              className="gap-1.5 text-[#5c2d91] hover:bg-[#f3f0fa] h-7 px-2 text-xs flex-shrink-0"
              aria-label="Jump to Operational Case Review — Audit Thread"
            >
              View audit thread
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          </div>
        )}
            </>
          }
          legalComplianceContent={
            <>
          {/* Two-Column Layout: Legal Classification (left) + Regulatory & Compliance (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
            {/* Left Column */}
            <div className="space-y-4">
            {/* Legal Classification */}
          <SecondaryCard>
            <CollapsibleSection
              sectionId="legal-classification"
              isOpen={sections.isOpen("legal-classification")}
              onToggle={() => sections.toggle("legal-classification")}
              header={
                <>
                  <div className="w-8 h-8 bg-[#fef6f4] rounded flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#ca5010]" />
                  </div>
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-[#323130] font-semibold">Request Type</h3>
                    <p className="text-xs text-[#605e5c]">Jurisdiction and crimes</p>
                  </div>
                </>
              }
              collapsedSummary={
                formData.requestType ? (
                  <Badge variant="outline" className="text-xs">{formData.requestType}</Badge>
                ) : null
              }
            >
              {/* Card Fields Grid - Single Consolidated Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
            {/* Request Type */}
            <div className="space-y-2">
              <Label className="text-[#323130] font-semibold">
                Request Type <span className="text-[#d13438]">*</span>
              </Label>
              <Popover open={requestTypeOpen} onOpenChange={setRequestTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={requestTypeOpen}
                    aria-label="Select request type"
                    aria-required="true"
                    className={cn(
                      "w-full justify-between h-10 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white",
                      !formData.requestType && "text-[#a19f9d]",
                      errors.requestType && "border-[#d13438]"
                    )}
                  >
                    {formData.requestType || "Select request type"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search request type..." className="h-10" />
                    <CommandEmpty>No request type found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup heading="Law Enforcement Options">
                        {REQUEST_TYPES.map((type) => (
                          <CommandItem
                            key={type}
                            value={type}
                            onSelect={(currentValue) => {
                              const nextDefaultSub = getDefaultSubTypeForRequestType(currentValue);
                              setFormData(prev => ({
                                ...prev,
                                requestType: currentValue,
                                // When the new type has a per-type allow-list, reset to its default
                                // (e.g. eEvidence → "None"). When it doesn't, leave existing value.
                                requestSubType: nextDefaultSub ?? prev.requestSubType,
                              }));
                              setRequestTypeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.requestType === type ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {type}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup heading="Internal Only">
                        {INTERNAL_REQUEST_TYPES.map((type) => (
                          <CommandItem
                            key={type}
                            value={type}
                            onSelect={(currentValue) => {
                              const nextDefaultSub = getDefaultSubTypeForRequestType(currentValue);
                              setFormData(prev => ({
                                ...prev,
                                requestType: currentValue,
                                requestSubType: nextDefaultSub ?? prev.requestSubType,
                              }));
                              setRequestTypeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.requestType === type ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {type}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.requestType && (
                <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.requestType}
                </p>
              )}
            </div>

            {/* Request Sub-Type */}
            <div className="space-y-2">
              <Label className="text-[#323130] font-semibold">
                Request Sub-Type
              </Label>
              <Popover open={requestSubTypeOpen} onOpenChange={setRequestSubTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={requestSubTypeOpen}
                    aria-label="Select request sub-type"
                    className={cn(
                      "w-full justify-between h-10 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white",
                      !formData.requestSubType && "text-[#a19f9d]"
                    )}
                  >
                    {formData.requestSubType || "Select request sub-type"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search request sub-type..." className="h-10" />
                    <CommandEmpty>No request sub-type found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {getSubTypesForRequestType(formData.requestType).map((subType) => (
                          <CommandItem
                            key={subType}
                            value={subType}
                            onSelect={(currentValue) => {
                              setFormData(prev => ({ ...prev, requestSubType: currentValue }));
                              setRequestSubTypeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.requestSubType === subType ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {subType}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* eEvidence-only dates supplied by the Issuing Authority via the
                Decentralised IT System. Rendered immediately after the
                request-type pair so they read as part of the request envelope
                rather than the case-administration dates lower in the form. */}
            {formData.requestType === "eEvidence" && (
              <>
                <div className="space-y-2">
                  <Label className="text-[#323130] font-semibold">
                    Date of Issuance
                  </Label>
                  <Input
                    type="date"
                    value={formData.dateOfIssuance ?? ""}
                    onChange={(e) =>
                      handleInputChange("dateOfIssuance", e.target.value)
                    }
                    className="h-10 border-[#c8c6c4] focus:border-[#8764b8] transition-colors"
                  />
                  <p className="text-xs text-[#605e5c]">
                    Provided by the Issuing Authority.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#323130] font-semibold">
                    Date of Transmission
                  </Label>
                  <Input
                    type="date"
                    value={formData.dateOfTransmission ?? ""}
                    onChange={(e) =>
                      handleInputChange("dateOfTransmission", e.target.value)
                    }
                    className="h-10 border-[#c8c6c4] focus:border-[#8764b8] transition-colors"
                  />
                  <p className="text-xs text-[#605e5c]">
                    Provided by the Issuing Authority.
                  </p>
                </div>
              </>
            )}

            {/* Other Request Type Description - Conditional, full width */}
            {formData.requestType === "Other" && (
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-[#323130] font-semibold">
                  Describe "Other" Request Type <span className="text-[#d13438]">*</span>
                </Label>
                <Input
                  value={formData.otherRequestTypeDescription}
                  onChange={(e) => handleInputChange("otherRequestTypeDescription", e.target.value)}
                  placeholder="Enter description of the request type"
                  className={cn(
                    "h-10 border-[#c8c6c4] focus:border-[#8764b8] transition-colors",
                    errors.otherRequestTypeDescription && "border-[#d13438]"
                  )}
                />
                {errors.otherRequestTypeDescription && (
                  <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.otherRequestTypeDescription}
                  </p>
                )}
              </div>
            )}

            {/* Country */}
            <div className="space-y-2">
              <Label className="text-[#323130] font-semibold">
                {formData.requestType === "eEvidence"
                  ? "Issuing Authority Country"
                  : "Country"}{" "}
                <span className="text-[#d13438]">*</span>
              </Label>
              <Popover open={jurisdictionOpen} onOpenChange={setJurisdictionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={jurisdictionOpen}
                    aria-label={
                      formData.requestType === "eEvidence"
                        ? "Select Issuing Authority country"
                        : "Select country"
                    }
                    aria-required="true"
                    className={cn(
                      "w-full justify-between h-10 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white",
                      !formData.country && "text-[#a19f9d]",
                      errors.country && "border-[#d13438]"
                    )}
                  >
                    {formData.country || "Select country"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search country..." className="h-10" />
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandList>
                      {/* On eEvidence cases, pin EU + EEA groups to the top. */}
                      {(formData.requestType === "eEvidence"
                        ? [
                            ...JURISDICTIONS.filter((g) =>
                              g.label === "European Union" ||
                              g.label === "EEA Countries" ||
                              g.label === "EU Countries" ||
                              g.label.toUpperCase().includes("EU") ||
                              g.label.toUpperCase().includes("EEA"),
                            ),
                            ...JURISDICTIONS.filter((g) =>
                              !(g.label === "European Union" ||
                                g.label === "EEA Countries" ||
                                g.label === "EU Countries" ||
                                g.label.toUpperCase().includes("EU") ||
                                g.label.toUpperCase().includes("EEA")),
                            ),
                          ]
                        : JURISDICTIONS
                      ).map((group) => (
                        <CommandGroup key={group.label} heading={group.label}>
                          {group.countries.map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={(currentValue) => {
                                setFormData((prev) => {
                                  // On eEvidence, dual-write to the IA block
                                  // so the Authorization Details subsection
                                  // stays in sync with the Request Type card.
                                  if (
                                    prev.requestType === "eEvidence" &&
                                    prev.eevidenceIssuingAuthority
                                  ) {
                                    const iaCountry = {
                                      ...prev.eevidenceIssuingAuthority.country,
                                      countryName: currentValue,
                                    };
                                    return {
                                      ...prev,
                                      country: currentValue,
                                      eevidenceIssuingAuthority: {
                                        ...prev.eevidenceIssuingAuthority,
                                        country: iaCountry,
                                      },
                                    };
                                  }
                                  return { ...prev, country: currentValue };
                                });
                                setJurisdictionOpen(false);
                                if (errors.country) {
                                  setErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.country;
                                    return newErrors;
                                  });
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.country === country ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {country}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.country && (
                <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.country}
                </p>
              )}
            </div>

            {/* Jurisdiction */}
            <div className="space-y-2">
              <Label htmlFor="jurisdiction" className="text-[#323130] font-semibold">
                Jurisdiction <span className="text-[#d13438]">*</span>
              </Label>
              <Input
                id="jurisdiction"
                value={formData.jurisdiction}
                onChange={(e) => handleInputChange("jurisdiction", e.target.value)}
                placeholder="e.g., International, National, State and Local"
                className={cn(
                  "h-10 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white",
                  errors.jurisdiction && "border-[#d13438]"
                )}
                aria-required="true"
              />
              {errors.jurisdiction && (
                <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.jurisdiction}
                </p>
              )}
            </div>

            {/* Nature of Crimes */}
            <div className="space-y-2">
              <Label className="text-[#323130] font-semibold">
                Nature of Crimes <span className="text-[#d13438]">*</span>
              </Label>
              <Popover open={natureOfCrimesOpen} onOpenChange={setNatureOfCrimesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={natureOfCrimesOpen}
                    aria-label="Select nature of crimes"
                    aria-required="true"
                    className={cn(
                      "w-full justify-between h-10 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white",
                      formData.natureOfCrimes.length === 0 && "text-[#a19f9d]",
                      errors.natureOfCrimes && "border-[#d13438]"
                    )}
                  >
                    <span className="truncate">
                      {formData.natureOfCrimes.length === 0
                        ? "Select crime types"
                        : formData.natureOfCrimes.length <= 3
                        ? formData.natureOfCrimes.join(", ")
                        : `${formData.natureOfCrimes.slice(0, 3).join(", ")}, +${formData.natureOfCrimes.length - 3} more`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search crimes..." />
                    <CommandEmpty>No crimes found.</CommandEmpty>
                    <CommandList>
                      {(() => {
                        const picked = new Set(formData.natureOfCrimes);
                        const selected = NATURE_OF_CRIMES.filter((o) => picked.has(o.value));
                        const remaining = NATURE_OF_CRIMES.filter((o) => !picked.has(o.value));
                        return [...selected, ...remaining].map((opt) => (
                          <CommandItem
                            key={opt.value}
                            value={`${opt.label} ${opt.value}`}
                            onSelect={() => handleNatureOfCrimesToggle(opt.value)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Checkbox
                                checked={picked.has(opt.value)}
                                onCheckedChange={() => handleNatureOfCrimesToggle(opt.value)}
                              />
                              <span className="flex-1">{opt.label}</span>
                              {opt.source === "eEvidence" && (
                                <Badge
                                  variant="outline"
                                  className="ml-auto text-[10px] px-1.5 py-0 bg-[#f3f0fa] text-[#5c2d91] border-[#8764b8]/40"
                                >
                                  eEvidence
                                </Badge>
                              )}
                            </div>
                          </CommandItem>
                        ));
                      })()}
                    </CommandList>
                    <div className="border-t border-gray-200 p-2 bg-gray-50">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setNatureOfCrimesOpen(false)}
                        className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white"
                      >
                        Done ({formData.natureOfCrimes.length} selected)
                      </Button>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
              {formData.natureOfCrimes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.natureOfCrimes.map((crime) => {
                    const opt = getNatureOfCrimeOption(crime);
                    const label = opt?.label ?? crime;
                    const isEEvidence = opt?.source === "eEvidence";
                    return (
                      <Badge
                        key={crime}
                        variant="outline"
                        className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] hover:bg-[#c7e0f4] transition-colors"
                      >
                        {label}
                        {isEEvidence && (
                          <span className="ml-1.5 inline-flex items-center text-[10px] px-1.5 py-0 rounded bg-[#f3f0fa] text-[#5c2d91] border border-[#8764b8]/40">
                            eEvidence
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleNatureOfCrimesToggle(crime)}
                          aria-label={`Remove ${label}`}
                          className="ml-1.5 hover:text-[#106ebe] transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              {/* eEvidence "Other" — required free-text description */}
              {formData.requestType === "eEvidence" &&
                formData.natureOfCrimes.includes("Other") && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-[#323130] font-semibold">
                      Describe the case classification ("Other"){" "}
                      <span className="text-[#d13438]">*</span>
                    </Label>
                    <Textarea
                      value={formData.eevidenceAuthorisationTypeOfCaseOtherDescription ?? ""}
                      onChange={(e) =>
                        handleInputChange(
                          "eevidenceAuthorisationTypeOfCaseOtherDescription",
                          e.target.value,
                        )
                      }
                      placeholder="Provide a brief rationale for the 'Other' classification…"
                      className={cn(
                        "min-h-[80px] border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white resize-y",
                        errors.eevidenceAuthorisationTypeOfCaseOtherDescription && "border-[#d13438]",
                      )}
                    />
                    {errors.eevidenceAuthorisationTypeOfCaseOtherDescription && (
                      <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.eevidenceAuthorisationTypeOfCaseOtherDescription}
                      </p>
                    )}
                    <p className="text-[#605e5c] text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                      Required when "Other" is selected on an eEvidence case.
                    </p>
                  </div>
                )}
              {errors.natureOfCrimes && (
                <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.natureOfCrimes}
                </p>
              )}
            </div>

            {/* The Enterprise Request card was moved out of the Request
                Type accordion and is now mounted as the first card in
                Step 4 — "Identifier & Data Services" (see
                dataSpecificationContent below). The decision flow is
                IA-provided / read-only, so it sits next to the data
                services it scopes rather than next to crime types. */}

            {/* Request Origin moved to Case Overview card — it (and its
                "Other" description textarea) lives next to Assignee / Status
                up there to avoid duplicating the field on the Request Type
                card. */}

            {/* Additional Case Information - Full Width */}
            <div className="space-y-2 lg:col-span-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor="additionalCaseInformation" className="text-[#323130] font-semibold">
                  Additional Case Information
                </Label>
                <span className="text-[#605e5c] text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" aria-hidden="true" />
                  Additional context provided by the law enforcement contact
                </span>
              </div>
              <div className="w-full min-h-[100px] p-3 border border-[#edebe9] bg-[#f3f2f1] rounded-md text-[#323130] whitespace-pre-wrap">
                {formData.additionalCaseInformation || "No additional information provided"}
              </div>
            </div>
              </div>
            </CollapsibleSection>
          </SecondaryCard>

          {/* Regulatory & Compliance Card */}


            </div>
            {/* Right Column: Regulatory & Compliance */}
            <SecondaryCard className="h-fit">
              <CollapsibleSection
                sectionId="legal-compliance"
                isOpen={sections.isOpen("legal-compliance")}
                onToggle={() => sections.toggle("legal-compliance")}
                header={
                  <>
                    <div className="w-8 h-8 bg-[#f7f5fb] rounded flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-[#8764b8]" />
                    </div>
                    <div>
                      <h3 className="text-[#323130] font-semibold text-sm">Legal Compliance</h3>
                      <p className="text-xs text-[#605e5c]">MLAT, EU DSA, and Shield Law requirements</p>
                    </div>
                  </>
                }
              >
                <div className="space-y-4">
                  {/* MLAT */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="mlat" className="text-[#323130] font-semibold text-sm">
                        MLAT
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="w-3.5 h-3.5 text-[#605e5c] cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Mutual Legal Assistance Treaty</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-3 h-9 bg-[#faf9f8] border border-[#e1dfdd] rounded-md px-3">
                      <Switch
                        id="mlat"
                        checked={formData.mlat}
                        onCheckedChange={(checked) => handleInputChange("mlat", checked)}
                        aria-label="MLAT status"
                      />
                      <span className="text-sm text-[#323130] font-medium">
                        {formData.mlat ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>

                  {/* EU27 DSA - Only show for EU countries */}
                  {EU_COUNTRIES.includes(formData.country) && (
                    <div className="space-y-2 pt-2 border-t border-[#e1dfdd]">
                      <div className="flex items-center gap-2">
                        <Label className="text-[#323130] font-semibold text-sm">
                          EU27 DSA Harms
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="w-3.5 h-3.5 text-[#605e5c] cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>EU Digital Services Act Harms</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Popover open={eu27DsaHarmsOpen} onOpenChange={setEu27DsaHarmsOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={eu27DsaHarmsOpen}
                            aria-label="Select EU27 DSA harms"
                            className={cn(
                              "w-full justify-between h-10 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white",
                              formData.eu27DsaHarms.length === 0 && "text-[#a19f9d]"
                            )}
                          >
                            <span className="truncate">
                              {formData.eu27DsaHarms.length === 0
                                ? "Select DSA harms"
                                : formData.eu27DsaHarms.length <= 3
                                ? formData.eu27DsaHarms.join(", ")
                                : `${formData.eu27DsaHarms.slice(0, 3).join(", ")}, +${formData.eu27DsaHarms.length - 3} more`}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Search DSA harms..." />
                            <CommandEmpty>No DSA harms found.</CommandEmpty>
                            <CommandList>
                              {[...formData.eu27DsaHarms.sort(), ...EU27_DSA_HARMS.filter(h => !formData.eu27DsaHarms.includes(h))].map((harm) => (
                                <CommandItem
                                  key={harm}
                                  value={harm}
                                  onSelect={(e) => {
                                    handleEu27DsaHarmsToggle(harm);
                                    // Don't close - keep dropdown open for multi-select
                                  }}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <Checkbox
                                      checked={formData.eu27DsaHarms.includes(harm)}
                                      onCheckedChange={() => handleEu27DsaHarmsToggle(harm)}
                                    />
                                    <span>{harm}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandList>
                            <div className="border-t border-gray-200 p-2 bg-gray-50">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setEu27DsaHarmsOpen(false)}
                                className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white"
                              >
                                Done ({formData.eu27DsaHarms.length} selected)
                              </Button>
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {formData.eu27DsaHarms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {formData.eu27DsaHarms.map((harm) => (
                            <Badge
                              key={harm}
                              variant="outline"
                              className="bg-[#fff4ce] text-[#8a6d3b] border-[#8a6d3b] hover:bg-[#ffe8a1] transition-colors"
                            >
                              {harm}
                              <button
                                type="button"
                                onClick={() => handleEu27DsaHarmsToggle(harm)}
                                aria-label={`Remove ${harm}`}
                                className="ml-1.5 hover:text-[#6b5530] transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Shield Law - Only show for United States */}
                  {formData.country === "United States" && (
                    <div className="space-y-2 pt-2 border-t border-[#e1dfdd]">
                      <div className="flex items-center gap-2">
                        <Label className="text-[#323130] font-semibold text-sm">
                          Shield Law
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="w-3.5 h-3.5 text-[#605e5c] cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>US Reporter's Shield Law Protection</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="bg-[#f3f2f1] border border-[#c8c6c4] rounded-md p-3">
                        <p className="text-xs text-[#605e5c] mb-3">
                          Applicable for United States requests
                        </p>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="shield-law-toggle" className="text-sm text-[#323130]">
                            LE indicated Shield Law applies
                          </Label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#605e5c]">
                              {formData.shieldLawConfirmation === "Yes" ? "Yes" : "No"}
                            </span>
                            <Switch
                              id="shield-law-toggle"
                              checked={formData.shieldLawConfirmation === "Yes"}
                              onCheckedChange={(checked) => {
                                setFormData({
                                  ...formData,
                                  shieldLawConfirmation: checked ? "Yes" : "No"
                                });
                              }}
                            />
                          </div>
                        </div>
                        {formData.shieldLawConfirmation === "Yes" && (
                          <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t border-[#e1dfdd]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                            <span className="text-[#323130] font-medium">
                              Shield Law applies to this case
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </CollapsibleSection>
            </SecondaryCard>
          </div>
            </>
          }
          notificationWorkflowContent={
            <div id="notification-workflow-anchor" className="scroll-mt-6">
              <NotificationWorkflowTab
                formData={formData}
                setFormData={setFormData}
                sections={sections}
                showAddNDO={showAddNDO}
                setShowAddNDO={setShowAddNDO}
                currentNDO={currentNDO}
                setCurrentNDO={setCurrentNDO}
                handleSaveNewNDO={handleSaveNewNDO}
                handleClearNDOForm={handleClearNDOForm}
                handleEditSavedNDO={handleEditSavedNDO}
                handleDeleteSavedNDO={handleDeleteSavedNDO}
                ndoStatusMap={ndoStatusMap}
                activeSubTab={activeNotificationSubTab}
                setActiveSubTab={setActiveNotificationSubTab}
              />
            </div>
          }
          senderAuthorityDetailsContent={
            <SenderAuthorityTab
              formData={formData}
              setFormData={setFormData}
              sections={sections}
              handleInputChange={handleInputChange}
              handleAgentChange={handleAgentChange}
              handleAddAgent={handleAddAgent}
              handleRemoveAgent={handleRemoveAgent}
              handleSelectAgency={handleSelectAgency}
              handleSelectContact={handleSelectContact}
              agencySearchOpen={agencySearchOpen}
              setAgencySearchOpen={setAgencySearchOpen}
              contactSearchOpen={contactSearchOpen}
              setContactSearchOpen={setContactSearchOpen}
            />
          }
          dataSpecificationContent={
            <>
      {/* Enterprise Request — first card in Step 4. Read-only display
          of what the IA submitted on the eEvidence envelope. Hidden
          entirely on non-eEvidence cases (and internally hides itself
          when neither Q1 nor Q2 came back YES). */}
      {formData.requestType === "eEvidence" && (
        <EnterpriseRequestCard
          value={formData.eevidenceEnterpriseRequest}
          errors={{
            justification: errors.eevidenceEnterpriseRequestJustification,
            relevantInformation:
              errors.eevidenceEnterpriseRequestRelevantInformation,
          }}
        />
      )}

      {/* Manifest-error warning — fires when the IA's envelope flagged
          Enterprise (Q1 or Q2 = Yes) but Check Accounts identified a
          Consumer account. Points the RS at Form 3 (Non-Execution
          Response) with the `manifestErrors` reason. */}
      {formData.requestType === "eEvidence" && (
        <ManifestErrorWarningBanner formData={formData} />
      )}

      {/* Inform-Controller notice — fires when the IA explicitly set
          `processorShallInformController = Yes` and the tenant admin
          contact has been captured via the Enterprise Tenant Profile.
          Points the RS at the tenant admin email so they can send the
          controller notification email. */}
      {formData.requestType === "eEvidence" && (
        <InformControllerNoticeBanner
          formData={formData}
          onManageNotification={() => openNotificationSubTab("controller")}
        />
      )}

      {/* Notify-User notice — symmetric to Inform-Controller, but for
          Consumer accounts on non-eEvidence / non-COPO cases. Surfaces
          after Check Accounts when at least one Consumer identifier is
          detected and the request type permits direct user notification. */}
      {formData.requestType !== "eEvidence" &&
        formData.requestType !== "COPO Order" && (
          <NotifyUserNoticeBanner
            formData={formData}
            onManageNotification={() => openNotificationSubTab("user")}
          />
        )}

      {/* Data Specification Section - Fluent Design */}
      <SecondaryCard id="account-identifiers-section" className="scroll-mt-6">
        <CollapsibleSection
          sectionId="account-identifiers"
          isOpen={sections.isOpen("account-identifiers")}
          onToggle={() => sections.toggle("account-identifiers")}
          header={
            <>
              <div className="w-10 h-10 bg-[#8764b8] rounded flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-[#323130] text-xl">Account Identifiers</h2>
                <p className="text-sm text-[#605e5c] mt-0.5">Specify user identifiers to target for data collection</p>
              </div>
            </>
          }
          headerActions={
            // Check Accounts trigger + status counts + audit timestamp all
            // moved into the IdentifierTable's stats row below. The
            // section header just keeps the identifier count badge as a
            // glanceable indicator.
            <div className="flex items-center gap-3 flex-shrink-0">
              {formData.identifiers.length > 0 && (
                <Badge variant="outline" className="text-xs bg-[#0078d4]/10 text-[#0078d4] border-[#0078d4]/30">
                  {formData.identifiers.length} {formData.identifiers.length === 1 ? 'Identifier' : 'Identifiers'}
                </Badge>
              )}
            </div>
          }
          collapsedSummary={
            formData.identifiers.length > 0 ? (
              <Badge variant="outline" className="text-xs">{formData.identifiers.length} identifier{formData.identifiers.length !== 1 ? 's' : ''}</Badge>
            ) : null
          }
        >

          {/* 2D (UX-Polish): the inline IdentifierTable that used to live
              here duplicated the table inside the IdentifierPanel slide-
              out (which is the actual work surface). Replaced with a
              1-line summary; clicking anywhere opens the panel so the
              user lands on the table that *is* editable. */}
          {(() => {
            const total = formData.identifiers.length;
            const found = identifierSummaryStats.accountsFound;
            const notChecked = identifierSummaryStats.accountsNotChecked;
            const rejected = formData.identifiers.filter(
              (i: any) => i.rejection,
            ).length;
            const invalid = formData.identifiers.filter(
              (i: any) => i.invalidatedAt,
            ).length;
            const openPanel = () => {
              setIdentifierPanelOpen(true);
              setIdentifierViewMode("fulfillment");
              setFulfillmentInitialStep(1);
            };
            if (total === 0) {
              return (
                <div className="rounded-md border border-dashed border-[#c8c6c4] bg-[#faf9f8] px-4 py-6 text-center">
                  <p className="text-sm text-[#605e5c]">
                    No identifiers yet.{" "}
                    <button
                      type="button"
                      onClick={openPanel}
                      className="text-[#0078d4] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1 rounded"
                    >
                      Open the Identifier panel to add one.
                    </button>
                  </p>
                </div>
              );
            }
            // "Plan completed" = at least one identifier has a non-empty
            // `fulfillmentPlan.services` object. The wizard's
            // `handleFinish` writes that shape on every identifier the RS
            // configured, so this flips true the moment Step 3 commits.
            const planIdentifiers = formData.identifiers.filter((id: any) => {
              const services = id.fulfillmentPlan?.services;
              return services && Object.keys(services).length > 0;
            });
            const planCompleted = planIdentifiers.length > 0;
            // Audit line under the row labels — shows when Check Accounts
            // last ran and which user kicked it off. Stamped by
            // useCaseWorkflow.checkAccountsForIdentifiers; absent until
            // the first run completes.
            const checkedAt = formData.accountsCheckedAt;
            const checkedBy = formData.accountsCheckedBy;
            const checkedLine = checkedAt
              ? `Accounts checked ${format(new Date(checkedAt), "MMM d, yyyy 'at' h:mm a")}${checkedBy ? ` by ${checkedBy}` : ""}`
              : null;
            return (
              <div className="space-y-3">
                {/* Summary chip + audit caption retired — both are now
                    rendered as the IdentifierTable's stats row right
                    above the per-identifier rows (the table reads
                    `accountsCheckedAt` / `accountsCheckedBy` directly off
                    formData via props below). The wizard entry that the
                    chip used to provide is now the sticky-header "Open
                    IDs" button. */}

                {/* Fulfillment plan summary — surfaces the per-identifier
                    plan the RS committed in Step 3 of the wizard so the
                    case form reflects what's about to be submitted
                    without forcing the user to re-open the wizard.
                    Only renders once at least one identifier has a
                    persisted `fulfillmentPlan.services` map. */}
                {planCompleted && (
                  <div
                    className="rounded-md border border-[#e1dfdd] bg-[#f9fbff] divide-y divide-[#e1dfdd]"
                    aria-label="Fulfillment plan committed in the wizard"
                  >
                    <div className="px-4 py-2 bg-[#deecf9] border-b border-[#c7e0f4] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#0078d4] uppercase tracking-wide">
                        Fulfillment plan
                      </span>
                      <span className="text-[11px] text-[#605e5c]">
                        {planIdentifiers.length} of {total} identifier
                        {planIdentifiers.length === 1 ? "" : "s"} configured
                      </span>
                    </div>
                    {planIdentifiers.map((identifier: any) => {
                      const fp = identifier.fulfillmentPlan;
                      const services = fp?.services ?? {};
                      const serviceEntries = Object.entries(services).filter(
                        ([, svc]: [string, any]) => svc?.enabled,
                      );
                      // Collection Boundary — every service in the plan
                      // gets the same dataCenterLocation (per-identifier
                      // region), so we can read it off the first entry.
                      const firstSvc = serviceEntries[0]?.[1] as any;
                      const storage = firstSvc?.dataCenterLocation;
                      const boundary =
                        mapStorageLocationToCollectionBoundary(storage);
                      const dr = fp?.dateRange;
                      const drStart = dr?.start;
                      const drEnd = dr?.end;
                      return (
                        <div key={identifier.id} className="px-4 py-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium text-[#323130] truncate">
                                {identifier.value}
                              </span>
                              <span className="text-[11px] text-[#605e5c] whitespace-nowrap">
                                {identifier.type} · Task ID {identifier.taskId || "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {storage && (
                                <span className="text-[11px] text-[#605e5c]">
                                  Storage:{" "}
                                  <span className="text-[#323130] font-medium">
                                    {storage}
                                  </span>
                                </span>
                              )}
                              {boundary && (
                                <span className="text-[11px] inline-flex items-center px-1.5 py-0.5 rounded bg-[#deecf9] text-[#0078d4] border border-[#c7e0f4]">
                                  Collection: {boundary}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Services + category counts. One row per
                              service so a multi-service plan stays
                              readable even when one service has many
                              categories. */}
                          <div className="space-y-0.5">
                            {serviceEntries.length === 0 ? (
                              <p className="text-xs text-[#a19f9d] italic">
                                No services configured
                              </p>
                            ) : (
                              serviceEntries.map(([svcKey, svc]: [string, any]) => {
                                const cats: string[] = Array.isArray(svc?.dataCategories)
                                  ? svc.dataCategories
                                  : [];
                                return (
                                  <div
                                    key={svcKey}
                                    className="flex items-baseline gap-2 text-xs"
                                  >
                                    <span className="font-medium text-[#323130] w-[140px] flex-shrink-0">
                                      {getServiceName(svcKey)}
                                    </span>
                                    <span className="text-[#605e5c] truncate">
                                      {cats.length > 0
                                        ? `${cats.length} categor${cats.length === 1 ? "y" : "ies"}: ${cats.join(" · ")}`
                                        : "No categories"}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                          {drStart && drEnd && (
                            <p className="text-[11px] text-[#605e5c]">
                              Date range:{" "}
                              <span className="text-[#323130] font-medium">
                                {formatDateToMMM(drStart)} – {formatDateToMMM(drEnd)}
                              </span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Identifiers & Services — Step-1-style scan of the
              LE-submitted identifiers, mirrored from the wizard's
              `Step1IdentifierReview`. Wired with the same write
              callbacks the wizard uses so any role can: run Check
              Accounts (per-row results flow back into the table), edit
              a value with a typo, add a supplemental identifier, or
              remove one. Surfaced on the case form at every stage so
              Triage can run Check Accounts inline without opening the
              Fulfillment Wizard. Full service + data-category
              configuration still happens in the Fulfillment Wizard. */}
          {formData.identifiers.length > 0 && (
            <div className="mt-2">
              <div className="mb-3 flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-semibold text-[#323130]">
                    Identifiers submitted by the requesting authority
                  </h3>
                  <p className="text-xs text-[#605e5c] mt-0.5">
                    Confirm scope of the LE-provided list. Running
                    Check Accounts here updates the per-row results in
                    place — no need to open the Fulfillment Wizard. Full
                    service + data-category configuration lives in the
                    Fulfillment Wizard.
                  </p>
                </div>
              </div>
              <IdentifierTable
                identifiers={formData.identifiers}
                requestType={formData.requestType}
                requestSubType={formData.requestSubType}
                /* Check Accounts — kicks off the same handler the
                   wizard's Step 1 uses. When the run completes,
                   `formData.identifiers` gets the new
                   accountExistenceStatus + per-service accountExistence
                   blobs, and this table re-renders the AccountCheckCell
                   on each row with the fresh data. */
                onCheckAllAccounts={handleCheckAccountExistence}
                checkingAccounts={checkingExistence}
                accountCheckCounts={{
                  checked:
                    formData.identifiers.length -
                    identifierSummaryStats.accountsNotChecked,
                  found: identifierSummaryStats.accountsFound,
                  notFound: identifierSummaryStats.accountsNotFound,
                  total: formData.identifiers.length,
                }}
                /* Case-wide audit — drives the inline "Accounts checked
                   … by …" caption next to the status chips in the
                   table's stats row. */
                accountsCheckedAt={formData.accountsCheckedAt}
                accountsCheckedBy={formData.accountsCheckedBy}
                /* Inline edits (value typo fix / type change / delete)
                   write the whole identifiers list back to formData so
                   the change is visible everywhere it's consumed. */
                onUpdateIdentifiers={(updated) =>
                  setFormData((prev) => ({ ...prev, identifiers: updated }))
                }
                /* Supplemental identifier add — routes through the
                   existing add-identifier pipeline so the new row picks
                   up service / data-category defaults consistent with
                   the rest of the form. */
                onAddIdentifier={(data) => {
                  setNewIdentifierValue(data.value);
                  setNewIdentifierType(data.type);
                  setNewIdentifierIsSupplemental(data.isSupplemental);
                  if (data.linkedIdentifierId) {
                    setSupplementalLinkedIdentifierId(data.linkedIdentifierId);
                  }
                  if (data.service) {
                    setSupplementalService(data.service);
                  }
                  if (data.dataCategories) {
                    setSupplementalDataCategory(data.dataCategories);
                  }
                  setTimeout(() => handleAddIdentifier(), 0);
                }}
                announce={announce}
                /* Phase 3 cross-border merge — RS/TS access to the IP
                   History drawer. Same UX as the AttorneyReviewWorkspace
                   row, just without attorney context (no formData /
                   onAttorneyAction wired, so escalated-row styling +
                   inline AttorneyReviewPanel stay off). */
                onOpenLoginLocation={(id) => setIpHistoryIdentifierId(id)}
              />
            </div>
          )}

        </CollapsibleSection>
      </SecondaryCard>

      {/* Enterprise Context (Phase 2 of the attorney-escalation merge) —
          Tier 3 Organization panel + nested Tier 2 Target Identifier
          panel(s). Positioned AFTER the Account Identifiers card because
          its data is populated downstream of Check Accounts, which is
          a nested action button inside that card. Renders only when the
          case has been seeded / written with an enterpriseContext block. */}
      {formData.enterpriseContext && (
        <EnterpriseContextSection case={formData} />
      )}
            </>
          }
          /* 2F (UX-Polish): in-form CorrespondenceSection accordion
             removed — the top banner + unread alert + right-edge
             CorrespondencePanel are sufficient entry points. Drop the
             prop to omit the tab from CaseSummaryAndTabs. */
          belowTabsContent={
            <>
        {/* User Notification - Non Disclosure Orders Section */}
        <SecondaryCard>
          <CollapsibleSection
            sectionId="case-review"
            isOpen={sections.isOpen("case-review")}
            onToggle={() => sections.toggle("case-review")}
            header={
              <>
                <div className="w-10 h-10 bg-[#0078d4] rounded flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-[#323130] text-xl">Operational Case Review Information</h2>
                  <p className="text-sm text-[#605e5c] mt-0.5">Case notes and review information</p>
                </div>
              </>
            }
            collapsedSummary={
              formData.notes.length > 0 ? (
                <Badge variant="outline" className="text-xs">{formData.notes.length} note{formData.notes.length !== 1 ? 's' : ''}</Badge>
              ) : null
            }
          >
          {/* Case Notes Section */}
          <div className="space-y-3 pt-4 border-t border-[#edebe9]">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-[#0078d4]" />
              <h3 className="text-[#323130] font-semibold">Case Notes</h3>
            </div>

            <NotesTimeline
              caseNotes={formData.notes}
              escalationNotes=""
              fulfillmentTasks={formData.fulfillmentTasks}
              newNoteText={newNoteText}
              onNewNoteChange={setNewNoteText}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onEditNote={handleEditNote}
              newNoteAttachments={newNoteAttachments}
              onNewNoteAttachmentsChange={setNewNoteAttachments}
            />
          </div>
          </CollapsibleSection>
        </SecondaryCard>

        {/* Audit Thread — escalation + system events for this case.
            Relocated from Case Overview to Operational Case Review so
            the long-running event log sits with the other historical
            review surfaces (case notes, fulfillment tasks). Self-hides
            when no events exist. A jump-link in Case Overview brings
            the RS here in one click. */}
        <div className="mt-4">
          <AuditThread formData={formData} />
        </div>
            </>
          }
        />
        </PageContainer>
      </form>
      </div>{/* Close scroll area */}

      {/* Bottom Action Bar */}
      <div 
        className="flex-shrink-0 z-[15] bg-white border-t border-[#e1dfdd] shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
      >
        <div className="py-3 bg-[#faf9f8] border-t border-[#edebe9] px-6">
          <div className="flex items-center justify-between gap-4">
            {/* Left Side - Validation Status */}
            <div className="flex-1">
              {isFormValid() ? (
                <div className="flex items-center gap-2 text-[#107c10]">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">Form is complete</span>
                    <span className="text-xs text-[#605e5c]">Ready to submit</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[#ca5010]">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="flex flex-col">
                    {workflowStage === "fulfillment" ? (
                      <>
                        <span className="font-semibold text-sm">Confirm all sections before submitting collection jobs</span>
                        <span className="text-xs text-[#605e5c]">Mark each section as reviewed to enable Submit</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-sm">Complete all required fields</span>
                        <span className="text-xs text-[#605e5c]">Fill out marked fields before submitting</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Action Buttons */}
            <div className="flex gap-3">
              {workflowStage === "triage" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenFulfillmentSummary}
                    aria-label="Review triage information"
                    className="h-10 px-6 border-[#0078d4] text-[#0078d4] hover:bg-[#deecf9] transition-colors"
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Review Triage
                  </Button>
                  <Button
                    type="submit"
                    form="case-form"
                    disabled={!isFormValid()}
                    aria-label={formData.caseStage === "Rejected" ? "Close rejected case and return to queue" : "Complete case triage and advance to fulfillment"}
                    className="h-10 px-6 bg-[#0078d4] hover:bg-[#106ebe] text-white disabled:bg-[#f3f2f1] disabled:text-[#a19f9d] disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {formData.caseStage === "Rejected" ? "Close Case" : "Complete Triage"}
                  </Button>
                </>
              ) : (
                <>
                  {isEditingCollectionScope ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToCollection}
                      aria-label="Cancel editing and return to collection tracker"
                      className="h-10 px-6 border-[#c8c6c4] text-[#605e5c] hover:bg-[#f3f2f1] transition-colors"
                    >
                      <Undo2 className="w-4 h-4 mr-2" />
                      Back to Collection
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReturnToTriage}
                      aria-label="Return case to triage stage"
                      className="h-10 px-6 border-orange-400 text-orange-600 hover:bg-orange-50 transition-colors"
                    >
                      <Undo2 className="w-4 h-4 mr-2" />
                      Return to Triage
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenFulfillmentSummary}
                    aria-label="Generate fulfillment summary"
                    className="h-10 px-6 border-[#0078d4] text-[#0078d4] hover:bg-[#deecf9] transition-colors"
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Generate Summary
                  </Button>
                  <Button
                    type="button"
                    onClick={handleFulfillmentSubmit}
                    disabled={!isFormValid()}
                    aria-label={isEditingCollectionScope ? "Submit additional jobs to collection" : "Submit collection jobs for processing"}
                    className="h-10 px-6 bg-[#0078d4] hover:bg-[#106ebe] text-white disabled:bg-[#f3f2f1] disabled:text-[#a19f9d] disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isEditingCollectionScope ? "Submit Additional Jobs" : "Submit Collection Jobs"}
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowClearFormConfirm(true)}
                aria-label="Clear form — opens confirmation"
                className="h-10 px-6 border-[#c8c6c4] hover:bg-[#f3f2f1] transition-colors"
              >
                Clear Form
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}

      {/* FAB buttons removed - Document and Identifier panel access relocated to StickyCaseHeader navigation tabs */}

      {/* Identifier Management Panel - inside main content area so absolute positioning doesn't cover sticky header */}
      <IdentifierPanel
        isOpen={identifierPanelOpen}
        onClose={() => setIdentifierPanelOpen(false)}
        identifiers={formData.identifiers}
        formData={formData}
        onUpdateIdentifier={(id, updates) => {
          const { _categoryDateUpdates, ...rest } = updates;
          setFormData(prev => ({
            ...prev,
            identifiers: prev.identifiers.map(identifier => {
              if (identifier.id !== id) return identifier;
              let updated = { ...identifier, ...rest };
              // Apply category date ranges from wizard onto actual SubCategory objects
              if (_categoryDateUpdates) {
                const updatedServices = { ...updated.services };
                Object.entries(_categoryDateUpdates).forEach(([serviceId, catUpdates]: [string, any]) => {
                  if (updatedServices[serviceId]) {
                    const updatedGroups = { ...updatedServices[serviceId].categoryGroups };
                    Object.entries(catUpdates).forEach(([groupKey, groupItems]: [string, any]) => {
                      const updatedGroupItems = { ...(updatedGroups[groupKey] || {}) };
                      Object.entries(groupItems || {}).forEach(([itemKey, dateFields]: [string, any]) => {
                        if (updatedGroupItems[itemKey]) {
                          updatedGroupItems[itemKey] = { ...updatedGroupItems[itemKey], ...dateFields };
                        }
                      });
                      updatedGroups[groupKey] = updatedGroupItems;
                    });
                    updatedServices[serviceId] = { ...updatedServices[serviceId], categoryGroups: updatedGroups };
                  }
                });
                updated = { ...updated, services: updatedServices };
              }
              return updated;
            })
          }));
        }}
        identifierDisplayData={identifierDisplayData}
        expandedIdentifiers={expandedIdentifiers}
        toggleIdentifierExpanded={toggleIdentifierExpanded}
        expandAllIdentifiers={expandAllIdentifiers}
        collapseAllIdentifiers={collapseAllIdentifiers}
        identifierViewMode={identifierViewMode}
        setIdentifierViewMode={setIdentifierViewMode}
        handleCheckAccountExistence={handleCheckAccountExistence}
        onCheckAccountsForIdentifiers={checkAccountsForIdentifiers}
        checkingExistence={checkingExistence}
        identifierSummaryStats={identifierSummaryStats}
        handleUpdateTaskStatus={handleUpdateTaskStatus}
        getTaskStatusConfig={getTaskStatusConfig}
        TASK_STATUS_CONFIG={TASK_STATUS_CONFIG}
        formatStorageLocation={formatStorageLocation}
        doesStorageCountryMatch={doesStorageCountryMatch}
        handleAddAliasAsIdentifier={handleAddAliasAsIdentifier}
        handleAddAliasToCategory={handleAddAliasToCategory}
        onAddIdentifier={(identifierData) => {
          setNewIdentifierValue(identifierData.value);
          setNewIdentifierType(identifierData.type);
          setNewIdentifierIsSupplemental(identifierData.isSupplemental);
          setNewIdentifierServices(identifierData.services || []);
          if (identifierData.supplementalLinkedIdentifierId) {
            setSupplementalLinkedIdentifierId(identifierData.supplementalLinkedIdentifierId);
          }
          if (identifierData.supplementalService) {
            setSupplementalService(identifierData.supplementalService);
          }
          if (identifierData.supplementalDataCategory) {
            setSupplementalDataCategory(identifierData.supplementalDataCategory);
          }
          setTimeout(() => handleAddIdentifier(), 0);
        }}
        onToggleDocumentPanel={toggleDocumentPanel}
        documentPanelOpen={warrantModalOpen}
        documentPanelWidth={documentPanelWidth}
        sidebarCollapsed={sidebarCollapsed}
        fulfillmentInitialStep={fulfillmentInitialStep}
        setFulfillmentInitialStep={setFulfillmentInitialStep}
        announce={announce}
        onStepperStateChange={onStepperStateChange}
        requestedStepKey={requestedStepKey}
        isEditingCollectionScope={isEditingCollectionScope}
        onServiceConfigChange={(config: any) => { wizardServiceConfigRef.current = config; }}
        onSubmitAdditionalJobs={isEditingCollectionScope ? handleFulfillmentSubmit : undefined}
        onWizardComplete={(plan: any) => {
          // Submit-gate sync: when the wizard finishes, fill in any
          // top-level formData fields the case-form's `validateForm`
          // checks for. Most importantly `startDate / endDate` — those
          // aren't always set when a case lands in Triage, and they're
          // required by the Submit Collection Jobs gate. We only write
          // when they're currently empty so we don't clobber an RS's
          // explicit Data Specification entry.
          setFormData((prev) => {
            const next: any = { ...prev };
            if (!prev.startDate && plan?.caseWideStartDate) {
              next.startDate = plan.caseWideStartDate;
            }
            if (!prev.endDate && plan?.caseWideEndDate) {
              next.endDate = plan.caseWideEndDate;
            }
            return next;
          });
        }}
        onAcknowledgeAuthorizationStatus={() => {
          // Phase 5c.3: cascade case-level Cancelled/Withdrawn to every
          // identifier's taskStatus and capture audit fields. Per-identifier
          // ETSI audit fields stay intact; case-level wins per plan §5c.6.
          const targetStatus = formData.authorizationDesiredStatus;
          if (targetStatus !== "Cancelled" && targetStatus !== "Withdrawn") return;
          const now = new Date();
          const actor = "Nicole Garcia";
          setFormData((prev) => ({
            ...prev,
            authorizationStatusAcknowledgedAt: now,
            authorizationStatusAcknowledgedBy: actor,
            identifiers: prev.identifiers.map((id) => ({
              ...id,
              taskStatus: targetStatus as any,
            })),
          }));
        }}
        onOpenResolveCaseDialog={() => {
          // Phase 5c.5+: prefill the structured Closure Reason based on
          // the case-level authorization status the RS just acknowledged.
          // Mapped to the new 14-reason canon; legacy CancelledByLE/PartialDelivery
          // keys are still available in the picker if explicitly chosen.
          const auth = formData.authorizationDesiredStatus;
          const defaultReason: ResolutionReason =
            auth === "Cancelled" ? "UserQuashed"
              : auth === "Withdrawn" ? "WithdrawnExternal"
              : "InfoProvided";
          setResolveDialogMode("resolve");
          setResolveDefaultReason(defaultReason);
          setResolveDefaultNotes("");
          setShowResolveCaseDialog(true);
        }}
      />

      </div>{/* Close main content area */}

      {/* Slice D: top-level Form Filler — opens when the RS picks a template
       *  from any Correspondence Hub entry point (Banner / UnreadAlert /
       *  accordion Section). Rendering at the page root keeps the filler
       *  reachable even if the inline Correspondence accordion is collapsed. */}
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

      {/* Back to Collection Confirmation Dialog */}
      <BackToCollectionDialog
        open={showBackToCollectionConfirm}
        onOpenChange={setShowBackToCollectionConfirm}
        onConfirm={() => onNavigateToCollection?.()}
      />

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onOpenChange={setShowUnsavedChangesDialog}
        onCancel={cancelPendingNavigation}
        onDiscard={handleDiscardAndNavigate}
        onSave={handleSaveAndNavigate}
        isSaving={isManualSaving}
      />

      {/* Fulfillment Summary Dialog */}
      <FulfillmentSummaryDialog
        open={showFulfillmentSummary}
        onOpenChange={setShowFulfillmentSummary}
        formData={formData}
        warrantModalOpen={warrantModalOpen}
        isFormValid={isFormValid()}
        isSubmittingFulfillment={isSubmittingFulfillment}
        workflowStage={workflowStage}
        onSubmit={handleFulfillmentSubmit}
        onToggleDocumentPanel={toggleDocumentPanel}
        expandedNotFoundIdentifiers={expandedNotFoundIdentifiers}
        setExpandedNotFoundIdentifiers={setExpandedNotFoundIdentifiers}
      />

      {/* Agent Removal Confirmation Dialog */}
      <AgentRemovalDialog
        agentToRemove={agentToRemove}
        onConfirm={confirmRemoveAgent}
        onCancel={cancelRemoveAgent}
      />

      {/* Clear-form confirmation — destructive action gated per the
          a11y/UX remediation plan's "Verb the Object?" copy template. */}
      <AlertDialog
        open={showClearFormConfirm}
        onOpenChange={setShowClearFormConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all form data?</AlertDialogTitle>
            <AlertDialogDescription>
              Clearing the form will discard every field you've entered on
              case {formData.caseId} — identifiers, NDOs, dates, notes,
              and any in-progress edits. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#d13438] hover:bg-[#a4262c] text-white"
              onClick={() => {
                handleReset();
                setShowClearFormConfirm(false);
              }}
            >
              Clear form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Attorney Escalation dialog — opened from the case-header
          Escalate / Update / Resume button. Self-hides when closed. */}
      <EscalateToAttorneyDialog
        open={escalateDialogOpen}
        onOpenChange={setEscalateDialogOpen}
        caseId={formData.caseId}
        mode={escalateDialogMode}
        current={getActiveAttorneyEscalation(formData)}
        identifiers={formData.identifiers}
        onSubmit={handleEscalateSubmit}
      />

      {/* Retract Form 3 confirmation dialog — opened from the GFR
          Panel's Form3Response+None variant CTA. */}
      <RetractForm3Dialog
        open={showRetractForm3Dialog}
        onOpenChange={setShowRetractForm3Dialog}
        referencedForm3Id={formData.eevidenceGroundsForRefusal?.referencedForm3Id}
        onConfirm={handleConfirmRetractForm3}
      />

      {/* Resolve Case Dialog — shared with CollectionTracker */}
      <ResolveCaseDialog
        open={showResolveCaseDialog}
        onOpenChange={setShowResolveCaseDialog}
        caseId={formData.caseId}
        mode={resolveDialogMode}
        defaultReason={resolveDefaultReason}
        defaultNotes={resolveDefaultNotes}
        onResolve={(reason, notes) => {
          const now = new Date();
          const actor = CURRENT_USER;
          setFormData((prev) => {
            // If this is an Edit, push the prior resolution into history.
            const prevHistory = prev.resolutionHistory ?? [];
            const isEdit =
              resolveDialogMode === "edit" && !!prev.resolutionReason;
            const nextHistory = isEdit
              ? [
                  {
                    reason: prev.resolutionReason!,
                    notes: prev.resolutionNotes,
                    caseStageBefore: prev.caseStage,
                    resolvedAt: prev.caseResolvedAt ?? now,
                    resolvedBy: prev.caseResolvedBy ?? actor,
                    supersededAt: now,
                    supersededBy: actor,
                    supersededReason: "Edit" as const,
                  },
                  ...prevHistory,
                ]
              : prevHistory;
            return {
              ...prev,
              caseStage: RESOLUTION_REASON_TO_STAGE[reason],
              resolutionReason: reason,
              resolutionNotes: notes,
              caseResolvedAt: now,
              caseResolvedBy: actor,
              resolutionHistory: nextHistory,
            };
          });
          setShowResolveCaseDialog(false);
          toast.success(
            resolveDialogMode === "edit"
              ? "Resolution updated"
              : "Case resolved",
            {
              description: `Case ${formData.caseId} marked as "${RESOLUTION_REASON_TO_STAGE[reason]}".`,
            },
          );
        }}
      />

      {/* (CorrespondencePanel is mounted upstream, inside the same
          relative container as the DocumentViewerPanel — see line above
          the case form's scrollable wrapper.) */}

      {/* IP History (cross-border login activity) drawer. Phase 3 of
          the prototype-to-prod merge. Opened from the IdentifierTable
          row's IP History button — accessible to RS / TS users from
          the Triage stage. */}
      <LoginLocationPanel
        open={ipHistoryIdentifierId !== null}
        onClose={() => setIpHistoryIdentifierId(null)}
        caseFormData={formData}
        identifierId={ipHistoryIdentifierId ?? undefined}
      />
    </div>
  );
}
