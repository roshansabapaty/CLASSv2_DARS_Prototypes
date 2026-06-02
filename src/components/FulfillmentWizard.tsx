import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { SidebarNavState, SidebarStep } from "../types/sidebarNav";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { MICROSOFT_SERVICES_CONFIG, getServiceDisplayName } from "../config/microsoftServices";
import { CURRENT_USER, REGION_TO_LOCATION } from "../constants/caseConstants";
import {
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronsDown,
  ChevronsUp,
  ClipboardList,
  Settings,
  FileCheck,
  Search,
  X,
  Loader2,
  User,
  Building,
  Globe,
  XCircle,
  Check,
  FileText,
  AlertTriangle,
  AlertCircle,
  Send,
} from "lucide-react";
import { cn } from "./ui/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner@2.0.3";
import { CopyableIdentifier } from "./CopyableIdentifier";
import { IdentifierTable } from "./identifier-table";
import type { AddIdentifierData } from "./identifier-table";
import { LoginLocationPanel } from "./cross-border/LoginLocationPanel";
import { EnterpriseContextSection } from "./attorney-escalation/EnterpriseContextSection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Step2ServicesConfiguration } from "./fulfillment-wizard/Step2ServicesConfiguration";
import { createDefaultIdentifierServices, getItemName } from "../config/lensServicesConfig";
// FluentProvider is now at the App root (src/App.tsx); no local provider needed here.
import {
  snapshotLEBaseline,
  emptyActionTotals,
  addAction,
  type ActionTotals,
  type RowAction,
} from "./fulfillment-wizard/leBaseline";
import { isRejected } from "../utils/identifierRejection";
import { SubmitModeBanner, type SubmitMode } from "./fulfillment-wizard/SubmitModeBanner";
import { PlanReviewTable } from "./fulfillment-wizard/PlanReviewTable";
import {
  AuthorizationStatusBanner,
  isAuthorizationStatusTerminal,
} from "./fulfillment-wizard/AuthorizationStatusBanner";

// Date formatting utility functions
function formatDateToMMM(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}



// Helper: generate unique identifier ID (mirrors DataEntryForm)
const generateIdentifierId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ID-${timestamp}-${random}`.toUpperCase();
};

// Helper: generate identifier-level task ID (mirrors DataEntryForm)
const generateIdentifierTaskId = (): string => {
  const taskIdTypes: Array<"LDID" | "LIID" | "LPID"> = ["LDID", "LIID", "LPID"];
  const selectedTaskIdType = taskIdTypes[Math.floor(Math.random() * taskIdTypes.length)];
  const taskIdNumber = Math.floor(Math.random() * 900000) + 100000;
  return `${selectedTaskIdType}-${taskIdNumber}`;
};

// Helper: detect Enterprise identifiers post-CheckAllAccounts. Drives the
// Enterprise Context card visibility under the Step 1 IdentifierTable.
// Covers both the seeded shape (`id.checkAccounts.accountType === "Enterprise"`)
// and the wizard's stamp shape (`services.{key}.accountExistence.enterpriseExists`).
function hasEnterpriseIdentifiers(identifiers: any[]): boolean {
  return identifiers.some((id) => {
    if (id?.checkAccounts?.accountType === "Enterprise") return true;
    const services = id?.services;
    if (!services) return false;
    return Object.values(services).some(
      (svc: any) => svc?.accountExistence?.enterpriseExists === true,
    );
  });
}

// Helper: generate task ID for service/category (mirrors DataEntryForm)
const generateTaskId = (service: string, category: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  return `${service.substring(0, 3).toUpperCase()}-${category.substring(0, 3).toUpperCase()}-${timestamp}-${random}`.toUpperCase();
};

// Helper: create default sub-category
const createDefaultSubCategory = () => ({
  enabled: false,
  taskId: "",
  startDate: undefined,
  endDate: undefined,
  status: "Not started" as const,
  collectionStatusUpdatedAt: undefined,
  publishStatusUpdatedAt: undefined,
  deliveryStatusUpdatedAt: undefined,
});

// Helper: create a new identifier with full services structure (uses new LENS services taxonomy)
const createWizardIdentifier = (requestType?: string) => {
  return {
    id: generateIdentifierId(),
    value: "",
    type: "",
    taskId: generateIdentifierTaskId(),
    taskStatus: "New",
    createdBy: CURRENT_USER,
    accountExistenceStatus: "not-checked" as const,
    // Pass the case's requestType so scoped services (e.g. Production
    // Letters on UK COPO) get auto-enabled on the new identifier.
    services: createDefaultIdentifierServices(requestType),
  };
};

// Data category labels for display
const DATA_CATEGORY_LABELS = ["Basic Subscriber", "Authentication Logs", "Service Telemetry", "Content", "Transactional Logs"];

interface FulfillmentWizardProps {
  identifiers: any[];
  formData: any;
  onUpdateIdentifier: (id: string, updates: any) => void;
  onClose?: () => void;
  onComplete?: (fulfillmentData: any) => void;
  initialStep?: WizardStep;
  onAddIdentifier?: (identifier: any) => void;
  handleCheckAccountExistence?: () => void;
  checkingExistence?: boolean;
  identifierSummaryStats?: any;
  IDENTIFIER_TYPES?: string[];
  IDENTIFIER_FORMAT_RULES?: Record<string, any>;
  announce?: (message: string) => void;
  onToggleDocumentPanel?: () => void;
  documentPanelOpen?: boolean;
  /** Callback emitting wizard nav state for the sidebar */
  onStepperStateChange?: (state: SidebarNavState) => void;
  /** External request to navigate to a specific step key (from sidebar click) */
  requestedStepKey?: string | null;
  isEditingCollectionScope?: boolean;
  onServiceConfigChange?: (config: any) => void;
  onSubmitAdditionalJobs?: () => void;
  /** Acknowledge a case-level LE-driven authorization Cancelled / Withdrawn
   *  status (Phase 5c.3). Sets `formData.authorizationStatusAcknowledgedAt`
   *  and cascades the case-level value onto every identifier's `taskStatus`. */
  onAcknowledgeAuthorizationStatus?: () => void;
  /** Open the shared Resolve Case dialog (Phase 5c.5). Surfaced as a
   *  secondary CTA inside AuthorizationStatusBanner once the RS has
   *  acknowledged a Cancelled / Withdrawn case-level authorization. */
  onOpenResolveCaseDialog?: () => void;
  /** Run the account-existence check for a subset of identifiers (Phase 5b.4a).
   *  Empty array runs against all. Used by per-identifier and bulk Check Accounts. */
  onCheckAccountsForIdentifiers?: (identifierIds: string[]) => void | Promise<void>;
}

type WizardStep = 1 | 2 | 3;

const WIZARD_STEPS = [
  {
    id: 1,
    title: "Identifier Review",
    description: "Review and manage target identifiers",
    icon: ClipboardList,
  },
  {
    id: 2,
    title: "Services Configuration",
    description: "Configure Microsoft services and data categories",
    icon: Settings,
  },
  {
    id: 3,
    title: "Fulfillment Plan Review",
    description: "Review and verify account information",
    icon: FileCheck,
  },
];

/** Derive account check results from identifiers already checked outside the wizard */
function deriveExistingAccountCheckResults(identifiers: any[]): Record<string, any> {
  const existingResults: Record<string, any> = {};
  identifiers.forEach((identifier: any) => {
    if (
      identifier.accountExistenceStatus === "success" ||
      identifier.accountExistenceStatus === "not-found"
    ) {
      const accountTypes: string[] = [];
      let consumer: any = null;
      let enterprise: any = null;

      Object.values(identifier.services).forEach((service: any) => {
        if (service.accountExistence?.consumerExists) {
          if (!accountTypes.includes("Consumer")) accountTypes.push("Consumer");
          if (!consumer) {
            consumer = {
              storageLocation: service.accountExistence.consumerStorageLocation,
              primaryId: service.accountExistence.consumerPrimaryId,
              relatedIdentifiers: service.accountExistence.consumerRelatedIdentifiers || [],
            };
          }
        }
        if (service.accountExistence?.enterpriseExists) {
          if (!accountTypes.includes("Enterprise")) accountTypes.push("Enterprise");
          if (!enterprise) {
            enterprise = {
              storageLocation: service.accountExistence.enterpriseStorageLocation,
              primaryId: service.accountExistence.enterprisePrimaryId,
              relatedIdentifiers: service.accountExistence.enterpriseRelatedIdentifiers || [],
              organizationId: service.accountExistence.enterpriseOrganizationId,
            };
          }
        }
      });

      const exists = accountTypes.length > 0;
      existingResults[identifier.id] = {
        checked: true,
        exists,
        accountTypes,
        consumer,
        enterprise,
      };
    }
  });
  return existingResults;
}

export function FulfillmentWizard({
  identifiers,
  formData,
  onUpdateIdentifier,
  onClose,
  onComplete,
  initialStep = 1,
  onAddIdentifier,
  handleCheckAccountExistence,
  checkingExistence = false,
  identifierSummaryStats,
  IDENTIFIER_TYPES = [],
  IDENTIFIER_FORMAT_RULES = {},
  announce,
  onToggleDocumentPanel,
  documentPanelOpen,
  onStepperStateChange,
  requestedStepKey,
  isEditingCollectionScope = false,
  onServiceConfigChange,
  onSubmitAdditionalJobs,
  onAcknowledgeAuthorizationStatus,
  onOpenResolveCaseDialog,
  onCheckAccountsForIdentifiers,
}: FulfillmentWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep);
  const stepContentRef = useRef<HTMLDivElement>(null);

  // ── Sidebar nav state emission ──
  const FULFILLMENT_STEPS: SidebarStep[] = useMemo(() =>
    WIZARD_STEPS.map((ws) => ({
      key: String(ws.id),
      label: ws.title,
      icon: ws.icon,
      description: ws.description,
      isComplete: currentStep > ws.id,
    })),
    [currentStep]
  );

  useEffect(() => {
    onStepperStateChange?.({
      steps: FULFILLMENT_STEPS,
      activeStepKey: String(currentStep),
    });
  }, [currentStep, FULFILLMENT_STEPS, onStepperStateChange]);

  // Handle sidebar-initiated step navigation
  useEffect(() => {
    if (requestedStepKey) {
      const stepNum = Number(requestedStepKey) as WizardStep;
      if ([1, 2, 3].includes(stepNum)) {
        setCurrentStep(stepNum);
      }
    }
  }, [requestedStepKey]);

  // Focus management: move focus to step content area on step transitions
  useEffect(() => {
    // Small delay to let the new step render
    const timer = setTimeout(() => {
      if (stepContentRef.current) {
        stepContentRef.current.focus({ preventScroll: false });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const [wizardData, setWizardData] = useState({
    identifiers: identifiers,
    serviceConfig: {
      mode: "bulk" as "bulk" | "individual",
      bulkSettings: {
        services: [] as string[],
        dateRange: { start: "", end: "" },
        selectedItems: {} as Record<string, Record<string, string[]>>,
      },
      individualSettings: {} as Record<string, any>,
    },
    accountCheckResults: {} as Record<string, any>,
    dataCenterLocations: {} as Record<string, Record<string, string>>,
  });

  // Storage region is fully derivable from check-accounts results, so
  // we stamp it onto `dataCenterLocations` whenever the inputs change —
  // when check-accounts completes (Step 1 or Step 3), when identifiers
  // are added/removed, or when Step 2's service selection shifts. This
  // keeps the region a captured value rather than a late submit-time
  // computation, and feeds the PlanReviewTable's Storage Region column
  // directly. Per-identifier region (consumer storage preferred, falls
  // back to enterprise) is fanned out to every service the identifier
  // currently has configured.
  //
  // Bug fix: most demo cases ship with `accountExistenceStatus="success"`
  // pre-loaded on the identifier (no in-wizard re-check needed). That
  // data lives on the identifier itself, not in `wizardData.accountCheckResults`,
  // so we merge `deriveExistingAccountCheckResults` first — otherwise
  // the Step 3 Storage Boundary column reads "—" until the user reruns
  // Check Accounts inside the wizard.
  useEffect(() => {
    const existingResults = deriveExistingAccountCheckResults(wizardData.identifiers);
    const merged = { ...existingResults, ...wizardData.accountCheckResults };
    const next: Record<string, Record<string, string>> = {};
    wizardData.identifiers.forEach((identifier: any) => {
      const ac = merged[identifier.id];
      const region: string | undefined =
        ac?.consumer?.storageLocation ??
        ac?.enterprise?.storageLocation ??
        undefined;
      if (!region) return;

      // Resolve the services the identifier currently has — same
      // priority chain handleFinish uses: individualSettings →
      // LE-accepted → bulk template.
      const individual = wizardData.serviceConfig.individualSettings?.[identifier.id];
      const lePerId = wizardData.serviceConfig.leAcceptedPerIdentifier?.[identifier.id];
      const bulk = wizardData.serviceConfig.bulkSettings.services;
      const services: string[] =
        (individual?.services && individual.services.length > 0)
          ? individual.services
          : (lePerId?.services && lePerId.services.length > 0)
            ? lePerId.services
            : (bulk && bulk.length > 0)
              ? bulk
              : [];

      if (services.length === 0) return;
      next[identifier.id] = Object.fromEntries(
        services.map((svc) => [svc, region]),
      );
    });

    // Only commit when the resolved map actually changed — guards
    // against re-render thrash when the effect re-runs on unrelated
    // wizardData mutations.
    if (
      JSON.stringify(next) !==
      JSON.stringify(wizardData.dataCenterLocations)
    ) {
      setWizardData((prev) => ({ ...prev, dataCenterLocations: next }));
    }
  }, [
    wizardData.accountCheckResults,
    wizardData.serviceConfig,
    wizardData.identifiers,
    wizardData.dataCenterLocations,
  ]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return wizardData.identifiers.length > 0;
      case 2: {
        // Step 2 redesign: permissive gate. Per-identifier validation issues
        // (account check not run, LE-incompatible service, full-LE-removal,
        // …) surface as banners inside each accordion's LEReviewPanel. The
        // gate only blocks on the absolute minimum: every non-rejected
        // identifier needs at least one service configured (somewhere — bulk
        // settings OR per-identifier individualSettings). If every identifier
        // is rejected, allow forward progress (Step 3 will show "all rejected").
        const eligibleIds = (wizardData.identifiers as any[]).filter(
          (id) => !isRejected(id)
        );
        if (eligibleIds.length === 0) return true; // all rejected; nothing to submit
        const individualSettings = wizardData.serviceConfig.individualSettings ?? {};
        const hasBulkServices =
          (wizardData.serviceConfig.bulkSettings.services?.length ?? 0) > 0;
        const hasAnyConfigured = eligibleIds.some((id: any) => {
          if (hasBulkServices) return true;
          const services: string[] = individualSettings[id.id]?.services ?? [];
          if (services.length > 0) return true;
          // Also count direct identifier-level service.enabled (legacy mock-data
          // path) so cases pre-loaded with fulfillmentPlan still pass.
          const svcs = (id as any).services ?? {};
          return Object.values(svcs).some((s: any) => s?.enabled);
        });
        return hasAnyConfigured;
      }
      case 3:
        // Per "remove dependency gates for dataCenterLocation" — Step 3
        // no longer blocks on check-accounts having run. Storage region
        // is best-effort: when check-accounts has run, `regionFor()`
        // stamps the resolved region onto each job at submit; when it
        // hasn't, `dataCenterLocation` is left undefined and all
        // downstream consumers (CollectionTracker, AccountDetailsTab,
        // identifier-table-utils) already handle that via optional
        // chaining + fallbacks. The Step 3 banner still surfaces the
        // recommendation as a soft warning — it just doesn't gate.
        return true;
      default:
        return false;
    }
  }, [currentStep, wizardData]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleFinish = () => {
    // Compute the case-wide date window from every identifier's resolved
    // dateRange (per-identifier override → wizard bulk). The case-form
    // submit gate validates against `formData.startDate / endDate`, so
    // we forward this on `onComplete` and let the parent sync top-level
    // fields when those weren't set during Triage.
    let earliestStart: Date | undefined;
    let latestEnd: Date | undefined;
    wizardData.identifiers.forEach((identifier) => {
      const perIdConfig = wizardData.serviceConfig.individualSettings?.[identifier.id];
      const perIdDateRange = perIdConfig?.dateRange;
      const dr =
        (perIdDateRange?.start && perIdDateRange?.end ? perIdDateRange : null)
        ?? wizardData.serviceConfig.bulkSettings.dateRange;
      if (!dr?.start || !dr?.end) return;
      const s = new Date(dr.start);
      const e = new Date(dr.end);
      if (!isNaN(s.getTime()) && (!earliestStart || s < earliestStart)) earliestStart = s;
      if (!isNaN(e.getTime()) && (!latestEnd || e > latestEnd)) latestEnd = e;
    });

    // Apply fulfillment plan to identifiers
    const fulfillmentPlan = {
      mode: wizardData.serviceConfig.mode,
      dateRange: wizardData.serviceConfig.bulkSettings.dateRange,
      services: wizardData.serviceConfig.bulkSettings.services,
      selectedItems: wizardData.serviceConfig.bulkSettings.selectedItems,
      accountCheckResults: wizardData.accountCheckResults,
      completedAt: new Date().toISOString(),
      // Case-wide window. Parent uses these to populate
      // `formData.startDate / endDate` so the submit gate doesn't
      // error on missing top-level dates.
      caseWideStartDate: earliestStart,
      caseWideEndDate: latestEnd,
    };

    // Update each identifier with fulfillment data
    wizardData.identifiers.forEach((identifier) => {
      const accountResult = wizardData.accountCheckResults[identifier.id];
      // Prefer per-identifier dateRange from individualSettings (set by bulk
      // Set date range or Accept All LE); fall back to the wizard's bulk
      // dateRange. Either may be empty if neither path ran.
      const perIdConfig = wizardData.serviceConfig.individualSettings?.[identifier.id];
      const perIdDateRange = perIdConfig?.dateRange;
      const effectiveDateRange =
        (perIdDateRange?.start && perIdDateRange?.end ? perIdDateRange : null)
        ?? wizardData.serviceConfig.bulkSettings.dateRange;
      const updates = {
        fulfillmentPlan: {
          dateRange: effectiveDateRange,
          services: {},
        },
        accountExistenceStatus: accountResult?.exists ? "success" : accountResult?.checked ? "not-found" : "not-checked",
        accountCheckResult: accountResult,
      };

      // Add service configuration. After the Step 2 redesign, the per-identifier
      // workspace writes into `individualSettings` regardless of the wizard's
      // `mode`. So check individualSettings FIRST; fall back to LE-accepted
      // (legacy) → bulk template (legacy). This guarantees the new per-identifier
      // flow's data flows into `identifier.services[*].enabled` so the case
      // form's `validateForm` sees configured services and the Submit
      // Collection Jobs button enables.
      const getItemDisplayNames = (svcItems: Record<string, string[]> | undefined): string[] => {
        if (!svcItems) return [];
        return Object.entries(svcItems).flatMap(([gKey, iKeys]) =>
          (iKeys || []).map((iKey) => getItemName(gKey, iKey))
        );
      };

      const individualConfig = wizardData.serviceConfig.individualSettings?.[identifier.id];
      const lePerIdentifier = wizardData.serviceConfig.leAcceptedPerIdentifier;
      const leDataForId = lePerIdentifier?.[identifier.id];

      // Region / storage location is already populated on
      // `wizardData.dataCenterLocations` by the derivation effect that
      // fires whenever check-accounts results, services, or
      // identifiers change. Just read it here — no late derivation.
      const perServiceRegions = wizardData.dataCenterLocations?.[identifier.id];
      const regionFor = (serviceId: string): string | undefined =>
        perServiceRegions?.[serviceId];

      if (individualConfig && (individualConfig.services?.length ?? 0) > 0) {
        // New per-identifier flow (post-Step 2 redesign): use individualSettings
        // regardless of the wizard's mode. This is the dominant code path now.
        updates.fulfillmentPlan.dateRange =
          (individualConfig.dateRange?.start && individualConfig.dateRange?.end ? individualConfig.dateRange : null)
          ?? individualConfig.dateRanges?.[individualConfig.services?.[0]]
          ?? wizardData.serviceConfig.bulkSettings.dateRange;
        (individualConfig.services || []).forEach((serviceId: string) => {
          updates.fulfillmentPlan.services[serviceId] = {
            enabled: true,
            dataCategories: getItemDisplayNames((individualConfig.selectedItems || {})[serviceId]),
            dataCenterLocation: regionFor(serviceId),
          };
        });
      } else if (leDataForId && leDataForId.services.length > 0) {
        // Legacy LE-accepted path (the Accept LE button was removed in the
        // Step 2 redesign, but `leAcceptedPerIdentifier` may still be set on
        // older mock cases).
        leDataForId.services.forEach((serviceId: string) => {
          updates.fulfillmentPlan.services[serviceId] = {
            enabled: true,
            dataCategories: getItemDisplayNames(leDataForId.items?.[serviceId]),
            dataCenterLocation: regionFor(serviceId),
          };
        });
      } else if ((wizardData.serviceConfig.bulkSettings.services || []).length > 0) {
        // Legacy bulk-template path: same services applied uniformly.
        wizardData.serviceConfig.bulkSettings.services.forEach((serviceId: string) => {
          updates.fulfillmentPlan.services[serviceId] = {
            enabled: true,
            dataCategories: getItemDisplayNames((wizardData.serviceConfig.bulkSettings.selectedItems || {})[serviceId]),
            dataCenterLocation: regionFor(serviceId),
          };
        });
      }

      // Also write date ranges onto the actual service/category objects so
      // CollectionTracker can display them without reading the fulfillment plan.
      // CRITICAL: also flip `identifier.services[svc].enabled = true` for every
      // service that ended up in `fulfillmentPlan.services`. The case form's
      // `validateForm()` reads `identifier.services[svc].enabled` (NOT
      // `fulfillmentPlan.services[svc].enabled`); without this flip the Submit
      // Collection Jobs button stays disabled with the validation error
      // "Select at least one Microsoft service for at least one identifier".
      const serviceUpdates: Record<string, any> = {};
      const updatedServices: Record<string, any> = { ...(identifier.services as any) };
      // Build the per-item enabled map (group → item → true) for each new service.
      // Items selected via individualConfig.selectedItems are flipped enabled.
      const individualCfg = wizardData.serviceConfig.individualSettings?.[identifier.id];
      Object.entries(updates.fulfillmentPlan.services).forEach(([serviceId]: [string, any]) => {
        // 1. Mark the service itself enabled so case-form validateForm passes.
        if (updatedServices[serviceId]) {
          updatedServices[serviceId] = {
            ...updatedServices[serviceId],
            enabled: true,
          };
        }

        // 2. Mark per-item enabled flags using the individualConfig's selectedItems
        //    (the source of truth for what the RS picked) when available.
        const itemPicks = individualCfg?.selectedItems?.[serviceId];
        if (itemPicks && updatedServices[serviceId]?.categoryGroups) {
          const updatedGroups = { ...updatedServices[serviceId].categoryGroups };
          Object.entries(itemPicks).forEach(([groupKey, itemKeys]: [string, any]) => {
            const group = { ...(updatedGroups[groupKey] || {}) };
            (itemKeys as string[]).forEach((itemKey: string) => {
              if (group[itemKey]) {
                group[itemKey] = { ...group[itemKey], enabled: true };
              }
            });
            updatedGroups[groupKey] = group;
          });
          updatedServices[serviceId] = {
            ...updatedServices[serviceId],
            categoryGroups: updatedGroups,
          };
        }

        // 3. Compute the date-range overrides (existing behavior) for the
        //    SubCategory objects so CollectionTracker shows correct dates.
        const allCatDateRanges = individualCfg?.categoryDateRanges || {};
        const svcDateRange = individualCfg?.dateRanges?.[serviceId] || wizardData.serviceConfig.bulkSettings.dateRange || {};
        const catUpdates: Record<string, Record<string, any>> = {};
        Object.entries(updatedServices[serviceId]?.categoryGroups || {}).forEach(([groupKey, group]: [string, any]) => {
          Object.entries(group || {}).forEach(([itemKey, item]: [string, any]) => {
            if (!item.enabled) return;
            const itemDateKey = `${serviceId}:${groupKey}:${itemKey}`;
            const catRange = allCatDateRanges[itemDateKey] || svcDateRange;
            if (catRange?.start || catRange?.end) {
              if (!catUpdates[groupKey]) catUpdates[groupKey] = {};
              catUpdates[groupKey][itemKey] = {
                startDate: catRange.start ? new Date(catRange.start) : undefined,
                endDate: catRange.end ? new Date(catRange.end) : undefined,
              };
            }
          });
        });
        if (Object.keys(catUpdates).length > 0) {
          serviceUpdates[serviceId] = catUpdates;
        }
      });

      onUpdateIdentifier(identifier.id, {
        ...updates,
        // Pass the updated services tree so identifier.services[svc].enabled
        // gets flipped at the top level (case-form validateForm reads this).
        services: updatedServices,
        _categoryDateUpdates: serviceUpdates, // Special key for DataEntryForm to apply
      });
    });

    if (onComplete) {
      onComplete(fulfillmentPlan);
    }

    toast.success("Fulfillment plan applied successfully");
    announce?.("Fulfillment plan applied successfully");
    onClose?.();
  };

  return (
    <div className="h-full flex flex-col bg-[#faf9f8]">
      {/* Progress Header — also carries the 2E case-context micro-header.
          The wizard renders inside a 650px right-edge panel, so a second
          strip would crowd the chrome; instead we put the case ID + a
          dot-separated identifier count next to the wizard title so the
          RS always knows which case they're editing across all three
          steps. The existing X (top-right) is the back-to-case path. */}
      <div className="px-4 py-2 bg-white border-b border-[#e1dfdd]">
        <div className="flex items-center gap-4">
          {/* Title + case context */}
          <div className="flex items-baseline gap-2 whitespace-nowrap shrink-0">
            <h2 className="text-sm font-semibold text-[#323130]">
              Fulfillment Wizard
            </h2>
            {formData?.caseId && (
              <span
                className="text-xs text-[#605e5c]"
                aria-label={`Editing case ${formData.caseId}`}
              >
                <span aria-hidden="true">·</span>{" "}
                <span className="font-medium text-[#323130]">
                  {formData.caseId}
                </span>
              </span>
            )}
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Inline Progress Steps */}
          <div className="flex items-center gap-1 flex-1 min-w-0" role="list" aria-label="Wizard progress">
            {WIZARD_STEPS.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const isUpcoming = currentStep < step.id;
              const stepStatus = isCompleted ? "completed" : isCurrent ? "current" : "upcoming";

              return (
                <React.Fragment key={step.id}>
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    role="listitem"
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold transition-colors",
                        isCompleted && "bg-[#107c10] text-white",
                        isCurrent && "bg-[#0078d4] text-white",
                        isUpcoming && "bg-[#edebe9] text-[#605e5c]"
                      )}
                      aria-hidden="true"
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs whitespace-nowrap",
                        isCurrent && "font-semibold text-[#323130]",
                        isCompleted && "text-[#323130]",
                        isUpcoming && "text-[#8a8886]"
                      )}
                    >
                      {step.title}
                      <span className="sr-only"> — {stepStatus}</span>
                    </span>
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-6 mx-1 transition-colors",
                        isCompleted ? "bg-[#107c10]" : "bg-[#c8c6c4]"
                      )}
                      aria-hidden="true"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right side: badge + docs toggle + close */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {wizardData.identifiers.length} ID{wizardData.identifiers.length !== 1 ? "s" : ""}
            </Badge>
            {onToggleDocumentPanel && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onToggleDocumentPanel}
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1] transition-colors rounded-md",
                      documentPanelOpen && "bg-[#edebe9] text-[#323130]"
                    )}
                    aria-label={documentPanelOpen ? "Close documents panel" : "Open documents panel"}
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{documentPanelOpen ? "Close docs" : "Open docs"}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center w-7 h-7 text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1] transition-colors rounded-md"
                    aria-label="Close wizard and return to case form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Close wizard</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div
        ref={stepContentRef}
        className="flex-1 overflow-y-auto p-6"
        tabIndex={-1}
        role="region"
        aria-label={`Step ${currentStep} of 3`}
      >
        {currentStep === 1 && (
          <Step1IdentifierReview
            identifiers={wizardData.identifiers}
            onUpdateIdentifiers={(updated) =>
              setWizardData({ ...wizardData, identifiers: updated })
            }
            formData={formData}
            announce={announce}
            accountCheckResults={{ ...deriveExistingAccountCheckResults(wizardData.identifiers), ...wizardData.accountCheckResults }}
            onUpdateAccountCheckResults={(results) =>
              setWizardData({ ...wizardData, accountCheckResults: results })
            }
          />
        )}
        {currentStep === 2 && (() => {
          const existingResults = deriveExistingAccountCheckResults(wizardData.identifiers);
          const mergedResults = { ...existingResults, ...wizardData.accountCheckResults };
          return (
            <Step2ServicesConfiguration
              identifiers={wizardData.identifiers}
              serviceConfig={wizardData.serviceConfig}
              onUpdateServiceConfig={(config) => {
                setWizardData((prev) => ({ ...prev, serviceConfig: config }));
                onServiceConfigChange?.(config);
              }}
              onUpdateIdentifiers={(updated) =>
                setWizardData((prev) => ({ ...prev, identifiers: updated }))
              }
              announce={announce}
              accountCheckResults={mergedResults}
              isEditingCollectionScope={isEditingCollectionScope}
              authorizationDesiredStatus={formData?.authorizationDesiredStatus}
              authorizationStatusUpdatedAt={formData?.authorizationStatusUpdatedAt}
              authorizationStatusUpdatedBy={formData?.authorizationStatusUpdatedBy}
              authorizationStatusAcknowledgedAt={formData?.authorizationStatusAcknowledgedAt}
              authorizationStatusAcknowledgedBy={formData?.authorizationStatusAcknowledgedBy}
              onAcknowledgeAuthorizationStatus={onAcknowledgeAuthorizationStatus}
              onOpenResolveCaseDialog={onOpenResolveCaseDialog}
              caseResolved={!!formData?.caseResolvedAt}
              onCheckAccountsForIdentifiers={onCheckAccountsForIdentifiers}
            />
          );
        })()}
        {currentStep === 3 && (() => {
          const existingResults = deriveExistingAccountCheckResults(wizardData.identifiers);
          const mergedResults = { ...existingResults, ...wizardData.accountCheckResults };

          return (
            <Step3SummaryReview
              identifiers={wizardData.identifiers}
              serviceConfig={wizardData.serviceConfig}
              accountCheckResults={mergedResults}
              onUpdateAccountCheckResults={(results) =>
                setWizardData({ ...wizardData, accountCheckResults: results })
              }
              formDataCountry={formData.country}
              formDataRequestType={formData.requestType}
              dataCenterLocations={wizardData.dataCenterLocations}
              onUpdateDataCenterLocations={(locations) =>
                setWizardData({ ...wizardData, dataCenterLocations: locations })
              }
              announce={announce}
              defaultViewMode="detailed"
              defaultExpandAll={true}
              isEditingCollectionScope={isEditingCollectionScope}
              authorizationDesiredStatus={formData?.authorizationDesiredStatus}
              authorizationStatusUpdatedAt={formData?.authorizationStatusUpdatedAt}
              authorizationStatusUpdatedBy={formData?.authorizationStatusUpdatedBy}
              authorizationStatusAcknowledgedAt={formData?.authorizationStatusAcknowledgedAt}
              authorizationStatusAcknowledgedBy={formData?.authorizationStatusAcknowledgedBy}
              onAcknowledgeAuthorizationStatus={onAcknowledgeAuthorizationStatus}
              onOpenResolveCaseDialog={onOpenResolveCaseDialog}
              caseResolved={!!formData?.caseResolvedAt}
            />
          );
        })()}
      </div>

      {/* Footer Navigation */}
      <div className="px-6 py-4 bg-white border-t border-[#e1dfdd] flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {(() => {
            // Phase 5c.5: lock Submit when LE has terminated the
            // authorization. The RS should resolve the case via the banner's
            // "Resolve Case" CTA instead of submitting work that won't run.
            const submitLocked = isAuthorizationStatusTerminal(formData?.authorizationDesiredStatus);
            const submitLockTooltip = submitLocked
              ? "This case is Cancelled or Withdrawn by LE. Resolve the case from the banner instead of submitting."
              : undefined;
            return currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="gap-2 bg-[#0078d4] hover:bg-[#106ebe] text-white"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : isEditingCollectionScope && onSubmitAdditionalJobs ? (
            (() => {
              // If in-flight edit and user hasn't touched individualSettings,
              // treat this as a "Confirm No Changes" confirmation rather than
              // implying new jobs will be created.
              const noChanges = Object.keys(wizardData.serviceConfig.individualSettings || {}).length === 0;
              const label = noChanges ? "Confirm No Changes" : "Update Collection Plan";
              return (
                <Button
                  onClick={() => {
                    handleFinish();
                    onSubmitAdditionalJobs();
                  }}
                  disabled={submitLocked}
                  title={submitLockTooltip}
                  className="gap-2 bg-[#0078d4] hover:bg-[#106ebe] text-white"
                >
                  {noChanges ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {label}
                </Button>
              );
            })()
          ) : (
            <Button
              onClick={handleFinish}
              disabled={submitLocked}
              title={submitLockTooltip}
              className="gap-2 bg-[#107c10] hover:bg-[#0c5c0c] text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Wizard
            </Button>
          );
          })()}
        </div>
      </div>
    </div>
  );
}

// Step 1: Identifier Review Component
interface Step1Props {
  identifiers: any[];
  onUpdateIdentifiers: (identifiers: any[]) => void;
  formData?: any;
  announce?: (message: string) => void;
  accountCheckResults: Record<string, any>;
  onUpdateAccountCheckResults: (results: Record<string, any>) => void;
}

function Step1IdentifierReview({ identifiers, onUpdateIdentifiers, formData, announce, accountCheckResults, onUpdateAccountCheckResults }: Step1Props) {
  const [isCheckingAccounts, setIsCheckingAccounts] = useState(false);
  const [accountCheckProgress, setAccountCheckProgress] = useState(0);
  // Phase 3 cross-border merge — IP History drawer state for the wizard.
  const [ipHistoryIdentifierId, setIpHistoryIdentifierId] = useState<
    string | null
  >(null);

  // handleAdd via AddIdentifierDialog data
  const handleAddFromDialog = (data: import("./identifier-table").AddIdentifierData) => {
    const newIdentifier = createWizardIdentifier(formData?.requestType);
    newIdentifier.value = data.value;
    newIdentifier.type = data.type;
    newIdentifier.createdBy = data.isSupplemental ? `Supplemental ${CURRENT_USER}` : CURRENT_USER;
    if (data.isSupplemental && data.linkedIdentifierId) {
      newIdentifier.linkedIdentifierId = data.linkedIdentifierId;
    }
    // Pre-populate the Account Check column for supplementals so the
    // user doesn't have to re-run Check Accounts just for the new row.
    if (data.isSupplemental) {
      // accountExistenceStatus="success" + no accountType → "Not Found"
      // per AccountCheckCell's `success && !hasAccount` branch.
      newIdentifier.accountExistenceStatus = "success";
      if (data.accountFound) {
        newIdentifier.checkAccounts = {
          ...(newIdentifier.checkAccounts ?? {}),
          accountType: data.accountType ?? "Consumer",
        };
      }
    }

    // Enable selected service with data categories
    if (data.service && (newIdentifier.services as any)[data.service]) {
      (newIdentifier.services as any)[data.service].enabled = true;
      // Map LE-requested category labels to per-service item keys. For Teams
      // services, "Content" maps to both new split items (Audio/Video + Chats)
      // so an LE Content request generates two independent jobs.
      const isTeamsService = data.service === "teamsForBusiness" || data.service === "teamsForLife";
      const categoryKeyMap: Record<string, Array<{ groupKey: string; itemKey: string }>> = {
        "Basic Subscriber": [{ groupKey: "subscriberData", itemKey: "genericAttributes" }],
        "Authentication Logs": [{ groupKey: "authenticationLogs", itemKey: "genericAttributes" }],
        "Service Telemetry": [{ groupKey: "trafficData", itemKey: "genericAttributes" }],
        "Content": isTeamsService
          ? [
              { groupKey: "contentData", itemKey: "genericAttributesAudioVideo" },
              { groupKey: "contentData", itemKey: "genericAttributesChats" },
            ]
          : [{ groupKey: "contentData", itemKey: "genericAttributes" }],
        "Transactional Logs": [{ groupKey: "subscriberData", itemKey: "paymentInformation" }],
      };
      data.dataCategories.forEach((cat) => {
        const mappings = categoryKeyMap[cat];
        if (!mappings) return;
        mappings.forEach((mapping) => {
          const svc = (newIdentifier.services as any)[data.service];
          const item = svc?.categoryGroups?.[mapping.groupKey]?.[mapping.itemKey];
          if (item) {
            item.enabled = true;
            item.taskId = generateTaskId(data.service, `${mapping.groupKey}:${mapping.itemKey}`);
          }
        });
      });
    }

    onUpdateIdentifiers([...identifiers, newIdentifier]);
    const serviceLabel = data.service
      ? MICROSOFT_SERVICES_CONFIG[data.service as keyof typeof MICROSOFT_SERVICES_CONFIG]?.name || data.service
      : "";
    const supplementalMsg = data.isSupplemental && data.linkedIdentifierId
      ? ` (linked to ${identifiers.find(id => id.id === data.linkedIdentifierId)?.value})`
      : "";
    const successMsg = `Identifier added successfully with ${serviceLabel}${supplementalMsg}`;
    toast.success(successMsg);
    announce?.(successMsg);
  };

  // Account check counts
  const step1CheckedCount = Object.keys(accountCheckResults).length;
  const step1FoundCount = Object.values(accountCheckResults).filter((r: any) => r.exists).length;
  const step1NotFoundCount = Object.values(accountCheckResults).filter((r: any) => r.checked && !r.exists).length;

  // Simulate account check for all identifiers
  // Account check — delegates to the authoritative path used by the
  // case-form Triage stage (see useCaseWorkflow.checkAccountsForIdentifiers).
  // Honours seeded `checkAccounts.accountType` so demo cases like
  // LNS-2026-00265 surface their Athens / NYC logins as documented.
  // Replaces a prior Math.random() implementation that overrode seeds
  // and made the Consumer User Location Summary column flaky.
  const handleCheckAllAccounts = async () => {
    setIsCheckingAccounts(true);
    setAccountCheckProgress(0);

    const { runAccountExistenceCheck, applyAccountExistenceResults } =
      await import("../utils/accountExistenceCheck");
    const { isEpocPrCase } = await import("../utils/eEvidenceHelpers");
    const { queryLogins } = await import("../services/loginQuery");
    const { setLastLogon } = await import("../state/ipHistoryStore");

    const { resultsMap, successCount } = await runAccountExistenceCheck(
      identifiers,
      formData?.caseStage ?? "In Progress",
      "fulfillment",
      isEpocPrCase((formData ?? {}) as any),
    );
    setAccountCheckProgress(100);

    const updatedIdentifiers = applyAccountExistenceResults(
      identifiers,
      resultsMap,
    );

    // Mirror outcomes to the wizard-level `accountCheckResults` map so
    // the IdentifierTable's checked / found / not-found counters stay
    // accurate. The map's shape matters only for those counters — the
    // table reads `accountType` from each identifier directly.
    const wizardResults: Record<string, any> = { ...accountCheckResults };
    for (const id of updatedIdentifiers) {
      const accountType = id.checkAccounts?.accountType;
      wizardResults[id.id] = {
        checked: true,
        exists: accountType === "Consumer" || accountType === "Enterprise",
      };
    }
    onUpdateAccountCheckResults(wizardResults);
    onUpdateIdentifiers(updatedIdentifiers);

    // Phase 3 cross-border — populate IP History for Consumer
    // identifiers (30-day window ending today). Mirrors the
    // useCaseWorkflow.checkAccountsForIdentifiers loop so every Check
    // Accounts surface produces the same column data.
    const today = new Date();
    const rangeEnd = today.toISOString().slice(0, 10);
    const rangeStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const issuingAgency = {
      id: formData?.caseId ?? "",
      name: formData?.agency ?? "",
      shortName: formData?.agency ?? "",
      countryCode: formData?.agencyCountryCode ?? "",
      country: formData?.country ?? "",
      type:
        formData?.requestType === "eEvidence"
          ? ("Judicial Authority" as const)
          : ("Law Enforcement" as const),
    };
    for (const id of updatedIdentifiers) {
      if (id.checkAccounts?.accountType !== "Consumer") continue;
      const q = queryLogins({
        identifier: id.value,
        rangeStart,
        rangeEnd,
        issuingAgency,
      });
      const latest =
        q.events.length > 0 ? q.events[q.events.length - 1] : null;
      setLastLogon(id.id, {
        lastEvent: latest,
        totalEvents: q.totalEvents,
        queriedAt: new Date(),
        rangeStart,
        rangeEnd,
      });
    }

    setIsCheckingAccounts(false);

    const msg = `Account check complete: ${successCount} of ${identifiers.length} accounts found`;
    toast.success(msg);
    announce?.(msg);
  };

  return (
    /* Step 1 container — vertical rhythm via Phase 1 spacing token. Default
       16px (Fluent spacingVerticalL) = previous space-y-4. No visual change. */
    <div className="space-y-[var(--section-gap)]">
      {/* Header */}
      <Card className="border-[#e1dfdd] bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-semibold text-[#323130]">
              Identifier Review
            </h3>
            <p className="text-sm text-[#605e5c]">
              Review and manage the target identifiers for this fulfillment request
            </p>
          </div>
        </div>
      </Card>

      {/* Consolidated IdentifierTable */}
      <IdentifierTable
        identifiers={identifiers}
        readOnly={false}
        requestType={formData?.requestType}
        onUpdateIdentifiers={onUpdateIdentifiers}
        onAddIdentifier={handleAddFromDialog}
        onCheckAllAccounts={handleCheckAllAccounts}
        checkingAccounts={isCheckingAccounts}
        checkProgress={accountCheckProgress}
        accountCheckCounts={{
          checked: step1CheckedCount,
          found: step1FoundCount,
          notFound: step1NotFoundCount,
          total: identifiers.length,
        }}
        announce={announce}
        onOpenLoginLocation={(id) => setIpHistoryIdentifierId(id)}
      />

      {/* Enterprise Context — same card reused from the Attorney case
          view. Renders below the IdentifierTable once Check All Accounts
          has flagged at least one identifier as Enterprise AND the case
          has a populated `enterpriseContext` block. Read-only on this
          surface: no `onCtaAction` prop, so the CTA row (Redirect / Flag
          Policy / Exec Review / etc.) is suppressed — those decisions
          belong to the attorney workspace. The "See logins" link still
          routes through the same LoginLocationPanel the IdentifierTable
          uses. */}
      {hasEnterpriseIdentifiers(identifiers) && formData?.enterpriseContext && (
        <EnterpriseContextSection
          case={formData}
          onSeeLogins={(id) => setIpHistoryIdentifierId(id)}
        />
      )}

      <LoginLocationPanel
        open={ipHistoryIdentifierId !== null}
        onClose={() => setIpHistoryIdentifierId(null)}
        caseFormData={formData}
        identifierId={ipHistoryIdentifierId ?? undefined}
      />
    </div>
  );
}

/* Old Step1 inline table and add dialog dead code fully removed — replaced by shared IdentifierTable component */

/* Step2ServicesConfiguration and IndividualServiceConfigDialog extracted to /components/fulfillment-wizard/Step2ServicesConfiguration.tsx */

// Step 3: Fulfillment Plan Review Component
interface Step3Props {
  identifiers: any[];
  serviceConfig: any;
  accountCheckResults: Record<string, any>;
  onUpdateAccountCheckResults: (results: Record<string, any>) => void;
  formDataCountry: string;
  /** Case request type. Drives the UK COPO / eEvidence-only Authorization
   *  Desired Task Status chip in each identifier's accordion header. */
  formDataRequestType?: string;
  dataCenterLocations: Record<string, Record<string, string>>;
  onUpdateDataCenterLocations: (locations: Record<string, Record<string, string>>) => void;
  announce?: (message: string) => void;
  defaultViewMode?: "summary" | "detailed";
  defaultExpandAll?: boolean;
  isEditingCollectionScope?: boolean;
  // ── Phase 5c.5: Cancelled / Withdrawn surfacing on Step 3 ─────────────
  authorizationDesiredStatus?: string;
  authorizationStatusUpdatedAt?: Date;
  authorizationStatusUpdatedBy?: string;
  authorizationStatusAcknowledgedAt?: Date;
  authorizationStatusAcknowledgedBy?: string;
  onAcknowledgeAuthorizationStatus?: () => void;
  onOpenResolveCaseDialog?: () => void;
  caseResolved?: boolean;
}

function Step3SummaryReview({
  identifiers,
  serviceConfig,
  accountCheckResults,
  onUpdateAccountCheckResults,
  formDataCountry,
  formDataRequestType,
  dataCenterLocations,
  onUpdateDataCenterLocations,
  announce,
  defaultViewMode = "summary",
  defaultExpandAll = false,
  isEditingCollectionScope = false,
  authorizationDesiredStatus,
  authorizationStatusUpdatedAt,
  authorizationStatusUpdatedBy,
  authorizationStatusAcknowledgedAt,
  authorizationStatusAcknowledgedBy,
  onAcknowledgeAuthorizationStatus,
  onOpenResolveCaseDialog,
  caseResolved,
}: Step3Props) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  // `viewMode` (summary / detailed) toggle was removed when the
  // Detailed View came out. Summary view is the only view; the
  // `defaultViewMode` prop is now ignored for backward-compat callers.
  const [expandedIdentifiers, setExpandedIdentifiers] = useState<Set<string>>(
    defaultExpandAll ? new Set(identifiers.map(id => id.id)) : new Set()
  );

  // Toggle expanded state for an identifier
  const toggleIdentifier = (identifierId: string) => {
    const newExpanded = new Set(expandedIdentifiers);
    if (newExpanded.has(identifierId)) {
      newExpanded.delete(identifierId);
    } else {
      newExpanded.add(identifierId);
    }
    setExpandedIdentifiers(newExpanded);
  };

  // Expand all identifiers
  const expandAll = () => {
    const allIds = new Set(identifiers.map(id => id.id));
    setExpandedIdentifiers(allIds);
  };

  // Collapse all identifiers
  const collapseAll = () => {
    setExpandedIdentifiers(new Set());
  };

  // Check if all identifiers are expanded
  const allExpanded = identifiers.length > 0 && expandedIdentifiers.size === identifiers.length;

  // `updateDataCenterLocation` (the per-service Content Boundary
  // picker handler) was removed with the Detailed View. The picker is
  // gone; storage region is now auto-derived from check-accounts at
  // submit time via `regionFor()` in the wizard root.

  // Get Microsoft service name from ID
  const getServiceName = (serviceId: string) => {
    return getServiceDisplayName(serviceId);
  };

  // Simulate account check
  const simulateAccountCheck = async () => {
    setIsChecking(true);
    setCheckProgress(0);

    const results: Record<string, any> = {};
    const totalSteps = identifiers.length;
    // Source storage locations from the canonical REGION_TO_LOCATION
    // map so the values written here match the keys the Collection
    // Boundary mapper looks up. Previously this used short ad-hoc
    // strings ("US-West", "EU-West", …) which weren't valid keys, so
    // the Collection Boundary column always read "—" after a re-check.
    const STORAGE_LOCATIONS = Object.keys(REGION_TO_LOCATION);

    for (let i = 0; i < identifiers.length; i++) {
      const identifier = identifiers[i];

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Randomly assign account existence (80% success rate for demo)
      // An account can only be Consumer OR Enterprise, never both
      const exists = Math.random() > 0.2;
      const accountRoll = exists ? Math.random() : -1;
      const hasConsumer = accountRoll >= 0 && accountRoll < 0.55;
      const hasEnterprise = accountRoll >= 0.55;
      // Single canonical storage location per identifier so the
      // Consumer/Enterprise distinction here doesn't accidentally split
      // an account across two regions during the simulated check.
      const pickStorage = () =>
        STORAGE_LOCATIONS[Math.floor(Math.random() * STORAGE_LOCATIONS.length)];

      results[identifier.id] = {
        checked: true,
        exists,
        accountTypes: [
          ...(hasConsumer ? ["Consumer"] : []),
          ...(hasEnterprise ? ["Enterprise"] : []),
        ],
        consumer: hasConsumer ? {
          storageLocation: pickStorage(),
          primaryId: identifier.type === "Email" ? identifier.value : `consumer_${identifier.value.substring(0, 8)}@outlook.com`,
          relatedIdentifiers: ["alias1@outlook.com", "alias2@hotmail.com"],
        } : null,
        enterprise: hasEnterprise ? {
          storageLocation: pickStorage(),
          primaryId: identifier.type === "Email" ? identifier.value : `ent_${identifier.value.substring(0, 8)}@contoso.com`,
          relatedIdentifiers: ["work.alias@company.com"],
          organizationId: "org-" + Math.random().toString(36).substring(7),
        } : null,
      };

      setCheckProgress(Math.round(((i + 1) / totalSteps) * 100));
    }

    onUpdateAccountCheckResults(results);
    setIsChecking(false);

    // After check completes, expand all identifier panels in the
    // Summary view so the freshly-discovered storage location +
    // account type are visible without an extra click.
    expandAll();
  };

  const hasResults = Object.keys(accountCheckResults).length > 0;
  const verifiedCount = Object.values(accountCheckResults).filter((r: any) => r.exists).length;
  const notFoundCount = Object.values(accountCheckResults).filter((r: any) => !r.exists).length;

  // Group identifiers by existence
  const existingIdentifiers = identifiers.filter((id) => accountCheckResults[id.id]?.exists);
  const nonExistentIdentifiers = identifiers.filter((id) => accountCheckResults[id.id] && !accountCheckResults[id.id].exists);

  // ── Reframe additions: provenance + in-flight awareness ─────────────────
  const leBaseline = React.useMemo(() => snapshotLEBaseline(identifiers), [identifiers]);

  // Derive per-identifier state from serviceConfig — mirror of Step 2's logic.
  const perIdentifierServices: Record<string, string[]> = React.useMemo(() => {
    const out: Record<string, string[]> = {};
    identifiers.forEach((id: any) => {
      const indiv = serviceConfig?.individualSettings?.[id.id];
      if (indiv && indiv.services) out[id.id] = indiv.services;
      else out[id.id] = leBaseline[id.id]?.services || [];
    });
    return out;
  }, [identifiers, serviceConfig?.individualSettings, leBaseline]);

  const perIdentifierItems: Record<string, Record<string, Record<string, string[]> | string[]>> = React.useMemo(() => {
    const out: Record<string, any> = {};
    identifiers.forEach((id: any) => {
      const indiv = serviceConfig?.individualSettings?.[id.id];
      if (indiv && indiv.selectedItems) out[id.id] = indiv.selectedItems;
      else out[id.id] = leBaseline[id.id]?.items || {};
    });
    return out;
  }, [identifiers, serviceConfig?.individualSettings, leBaseline]);

  const identifierDateRanges: Record<string, { start: string; end: string }> = React.useMemo(() => {
    const out: Record<string, { start: string; end: string }> = {};
    identifiers.forEach((id: any) => {
      const indiv = serviceConfig?.individualSettings?.[id.id];
      out[id.id] = indiv?.dateRange || serviceConfig?.bulkSettings?.dateRange || { start: "", end: "" };
    });
    return out;
  }, [identifiers, serviceConfig?.individualSettings, serviceConfig?.bulkSettings?.dateRange]);

  const categoryDateRanges: Record<string, { start: string; end: string }> = React.useMemo(() => {
    const out: Record<string, { start: string; end: string }> = {};
    identifiers.forEach((id: any) => {
      const indiv = serviceConfig?.individualSettings?.[id.id];
      const ranges = indiv?.categoryDateRanges || {};
      Object.entries(ranges).forEach(([innerKey, v]) => {
        out[`${id.id}:${innerKey}`] = v as { start: string; end: string };
      });
    });
    return out;
  }, [identifiers, serviceConfig?.individualSettings]);

  // Detect in-flight collection jobs
  const hasInFlightJobs = React.useMemo(() => {
    for (const id of identifiers) {
      const svcs = id.services || {};
      for (const svc of Object.values<any>(svcs)) {
        const groups = svc?.categoryGroups || {};
        for (const group of Object.values<any>(groups)) {
          for (const item of Object.values<any>(group)) {
            if (item?.jobId && item?.collectionStatus && !["Complete", "Failed", "Cancelled"].includes(item.collectionStatus)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }, [identifiers]);

  // Aggregate row actions to power the banner + submit button copy. PlanReviewTable
  // pumps one action per row via onRowAction; we collect into a ref-like state.
  const actionTotalsRef = React.useRef<ActionTotals>(emptyActionTotals());
  const [actionTotals, setActionTotals] = React.useState<ActionTotals>(emptyActionTotals());
  // Reset + rebuild totals on every render of the table (build phase)
  actionTotalsRef.current = emptyActionTotals();
  const handleRowAction = (a: RowAction) => {
    actionTotalsRef.current = addAction(actionTotalsRef.current, a);
  };
  // After rows rendered, commit totals via effect.
  React.useEffect(() => {
    const next = actionTotalsRef.current;
    setActionTotals((prev) =>
      prev.creates === next.creates && prev.updates === next.updates &&
      prev.cancels === next.cancels && prev.noChange === next.noChange
        ? prev : next,
    );
  });

  const submitMode: SubmitMode = !isEditingCollectionScope || !hasInFlightJobs
    ? "fresh"
    : actionTotals.total === 0
    ? "in-flight-no-changes"
    : "in-flight-changes";

  return (
    /* Step 3 container — vertical rhythm via Phase 1 spacing token. Default
       16px (Fluent spacingVerticalL) = previous space-y-4. No visual change. */
    <div className="space-y-[var(--section-gap)]">
      {/* Phase 5c.5: surface LE Cancelled / Withdrawn here too — RS may have
       *  jumped past Step 2, and Submit on this step would otherwise still
       *  fire. Same banner component as Step 2 so behavior is identical. */}
      {onAcknowledgeAuthorizationStatus && isAuthorizationStatusTerminal(authorizationDesiredStatus) && (
        <AuthorizationStatusBanner
          status={authorizationDesiredStatus}
          updatedAt={authorizationStatusUpdatedAt}
          updatedBy={authorizationStatusUpdatedBy}
          acknowledgedAt={authorizationStatusAcknowledgedAt}
          acknowledgedBy={authorizationStatusAcknowledgedBy}
          onAcknowledge={onAcknowledgeAuthorizationStatus}
          onResolve={onOpenResolveCaseDialog}
          caseResolved={caseResolved}
        />
      )}

      {/* Submit-mode banner (fresh vs in-flight) */}
      <SubmitModeBanner
        mode={submitMode}
        identifierCount={identifiers.length}
        createCount={actionTotals.creates}
        actionTotals={actionTotals}
      />

      {/* Soft warning when the RS reaches Step 3 without check-accounts
          results. Submission is no longer blocked — the gate was lifted
          per the "remove dataCenterLocation dependency gates" pass —
          but the recommendation still surfaces because check-accounts
          is what tells the collection service which data center owns
          each job. Without it, jobs go out with `dataCenterLocation =
          undefined` and the collection service has to route by other
          signals. */}
      {!hasResults && !isChecking && (
        <Card className="border-[#f9a825] bg-[#fff4ce] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#8a6d3b] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h4 className="font-semibold text-[#323130] mb-1">
                Account check recommended before submission
              </h4>
              <p className="text-sm text-[#605e5c] mb-3">
                Running the account-existence check verifies each
                identifier and discovers its storage region. The region
                is used to route each job to the correct data center.
                You can submit without it — jobs will be sent without a
                storage location and the collection service will route
                by other signals.
              </p>
              <Button
                onClick={simulateAccountCheck}
                className="gap-2 bg-[#0078d4] hover:bg-[#106ebe] text-white h-9"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                Check {identifiers.length} account{identifiers.length === 1 ? "" : "s"} now
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Header Card — moved ABOVE the per-identifier table. The Check
          Accounts / Re-check action is the user's primary lever before
          they review the plan, so it sits at the top of the step
          alongside the section title + intro copy. */}
      <Card className="border-[#e1dfdd] bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#323130] mb-1">
              Fulfillment Plan Review
            </h3>
            <p className="text-sm text-[#605e5c]">
              Review the per-identifier change plan below and submit when ready.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={simulateAccountCheck}
              disabled={isChecking}
              variant={hasResults ? "outline" : "default"}
              className={cn(
                "gap-2 h-9 px-4",
                !hasResults && "bg-[#0078d4] hover:bg-[#106ebe] text-white",
              )}
            >
              {isChecking ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking... {checkProgress}%
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  {hasResults ? "Re-check accounts" : "Check accounts"}
                </span>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Per-identifier review table with provenance + action-on-submit.
          `accountCheckResults` powers the new per-row Account column
          and the storage-region badge in each accordion header. */}
      <PlanReviewTable
        identifiers={identifiers}
        perIdentifierItems={perIdentifierItems as any}
        perIdentifierServices={perIdentifierServices}
        identifierDateRanges={identifierDateRanges}
        categoryDateRanges={categoryDateRanges}
        leBaseline={leBaseline}
        showJobColumn={hasInFlightJobs}
        accountCheckResults={accountCheckResults}
        dataCenterLocations={dataCenterLocations}
        requestType={formDataRequestType}
        onRowAction={handleRowAction}
      />

      {/* Edit Collection Scope Banner */}
      {isEditingCollectionScope && (() => {
        // Count existing vs new jobs across all identifiers
        let existingJobCount = 0;
        let newJobCount = 0;
        identifiers.forEach((id: any) => {
          Object.values(id.services || {}).forEach((svc: any) => {
            Object.values(svc.categoryGroups || {}).forEach((group: any) => {
              Object.values(group || {}).forEach((cat: any) => {
                if (cat.enabled) {
                  if (cat.jobId) existingJobCount++;
                  else newJobCount++;
                }
              });
            });
          });
        });
        // Count additional date range jobs from wizard config
        const individualSettings = serviceConfig?.individualSettings || {};
        let additionalDateRangeJobs = 0;
        Object.values(individualSettings).forEach((config: any) => {
          if (config?.additionalDateRanges) {
            Object.values(config.additionalDateRanges).forEach((ranges: any) => {
              if (Array.isArray(ranges)) additionalDateRangeJobs += ranges.filter((r: any) => r.start && r.end).length;
            });
          }
        });
        newJobCount += additionalDateRangeJobs;

        return (
          <Card className="border-[#f9a825] bg-[#fff4ce] p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#8a6d3b] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-[#323130] mb-1">Editing Existing Collection Scope</h4>
                <p className="text-sm text-[#605e5c] mb-2">
                  You are adding jobs to an existing collection. Review the changes below before submitting.
                </p>
                <div className="flex gap-4">
                  <Badge variant="outline" className="text-xs bg-[#dff6dd] text-[#107c10] border-[#107c10]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {existingJobCount} existing {existingJobCount === 1 ? 'job' : 'jobs'} in collection
                  </Badge>
                  {newJobCount > 0 && (
                    <Badge variant="outline" className="text-xs bg-[#deecf9] text-[#0078d4] border-[#0078d4]">
                      + {newJobCount} new {newJobCount === 1 ? 'job' : 'jobs'} to add
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Request Summary */}
      <Card className="border-[#e1dfdd] bg-white p-4">
        <h4 className="font-semibold text-[#323130] mb-3">
          {isEditingCollectionScope ? "Updated Fulfillment Scope" : "Request Summary"}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-[#605e5c]">Identifiers</p>
            <p className="text-sm font-medium text-[#323130]">
              {identifiers.length} identifier{identifiers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-[#605e5c]">Configuration Mode</p>
            <p className="text-sm font-medium text-[#323130]">
              {serviceConfig.mode === "bulk" ? "Bulk Template" : "Per-Identifier"}
            </p>
          </div>
          {serviceConfig.mode === "bulk" && (() => {
            const lePerIdentifier = serviceConfig.leAcceptedPerIdentifier;
            const hasLePerIdentifier = lePerIdentifier && Object.values(lePerIdentifier).some(
              (d: any) => d.services?.length > 0
            );

            let summaryServiceCount = serviceConfig.bulkSettings.services.length;
            let summaryServiceLabel = `${summaryServiceCount} service${summaryServiceCount !== 1 ? "s" : ""}`;
            if (hasLePerIdentifier) {
              const allLeServices = new Set<string>();
              Object.values(lePerIdentifier).forEach((d: any) => {
                (d.services || []).forEach((s: string) => allLeServices.add(s));
              });
              summaryServiceCount = allLeServices.size;
              const perIdCounts = Object.values(lePerIdentifier).map((d: any) => (d.services || []).length);
              const allSame = perIdCounts.every((c: number) => c === perIdCounts[0]);
              summaryServiceLabel = allSame
                ? `${summaryServiceCount} service${summaryServiceCount !== 1 ? "s" : ""} (uniform)`
                : `${summaryServiceCount} service${summaryServiceCount !== 1 ? "s" : ""} (varies by identifier)`;
            }

            return (
              <div className="contents">
                <div className="space-y-2">
                  <p className="text-xs text-[#605e5c]">Services Selected</p>
                  <p className="text-sm font-medium text-[#323130]">
                    {summaryServiceLabel}
                  </p>
                  {hasLePerIdentifier && (
                    <p className="text-[10px] text-[#107c10]">LE-requested services accepted</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-[#605e5c]">Date Range</p>
                  <p className="text-sm font-medium text-[#323130]">
                    {serviceConfig.bulkSettings.dateRange.start || "Not set"} -{" "}
                    {serviceConfig.bulkSettings.dateRange.end || "Not set"}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* Account Verification — the per-identifier breakdown of
          check-accounts results. Always rendered now that the view
          toggle is gone and Detailed View was removed. */}
      <Card className="border-[#e1dfdd] bg-white p-4">
        <div className="mb-4">
          <h4 className="font-semibold text-[#323130]">Account Verification</h4>
        </div>

        {isChecking && (
          <div className="mb-4">
            <div
              className="w-full bg-[#f3f2f1] rounded-full h-2"
              role="progressbar"
              aria-valuenow={checkProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Checking accounts: ${checkProgress}% complete`}
            >
              <div
                className="bg-[#0078d4] h-2 rounded-full motion-safe:transition-all motion-safe:duration-300"
                style={{ width: `${checkProgress}%` }}
              />
            </div>
          </div>
        )}

        {!hasResults && !isChecking && (
          <div className="text-center py-8 bg-[#f3f2f1] rounded" role="status">
            <Globe className="w-12 h-12 text-[#a19f9d] mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-[#605e5c] mb-3">
              Account verification not performed yet
            </p>
            <p className="text-xs text-[#605e5c]">
              Click "Check All Accounts" to verify account existence and geo-location
            </p>
          </div>
        )}

        {hasResults && !isChecking && (() => {
          // Shared status map for all identifiers in summary view
          const summaryStatusMap: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
            'New': { label: 'New', color: '#0078d4', bgColor: '#deecf9', borderColor: '#0078d4' },
            'InProgress': { label: 'In Progress', color: '#8a6d3b', bgColor: '#fff4ce', borderColor: '#8a6d3b' },
            'Rejected': { label: 'Rejected', color: '#a4262c', bgColor: '#fde7e9', borderColor: '#a4262c' },
            'Cancelled': { label: 'Cancelled', color: '#605e5c', bgColor: '#f3f2f1', borderColor: '#8a8886' },
            'DisclosureNotAvailable': { label: 'Disclosure Not Available', color: '#605e5c', bgColor: '#f3f2f1', borderColor: '#8a8886' },
            'Disclosed': { label: 'Disclosed', color: '#107c10', bgColor: '#dff6dd', borderColor: '#107c10' },
          };

          return (
          <div className="space-y-4">
            {/* Compact Statistics Row */}
            <div className="flex items-center gap-4" role="group" aria-label="Account verification results">
              <div className="flex items-center gap-1.5" aria-label={`${verifiedCount} accounts found`}>
                <CheckCircle2 className="w-4 h-4 text-[#107c10]" />
                <span className="text-sm font-medium text-[#107c10]">{verifiedCount}</span>
                <span className="text-xs text-[#605e5c]">Found</span>
              </div>
              <div className="flex items-center gap-1.5" aria-label={`${notFoundCount} accounts not found`}>
                <XCircle className="w-4 h-4 text-[#d13438]" />
                <span className="text-sm font-medium text-[#d13438]">{notFoundCount}</span>
                <span className="text-xs text-[#605e5c]">Not Found</span>
              </div>
              <div className="flex items-center gap-1.5" aria-label={`${identifiers.length} total accounts`}>
                <span className="text-sm font-medium text-[#605e5c]">{identifiers.length}</span>
                <span className="text-xs text-[#605e5c]">Total</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  onClick={expandAll}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[#0078d4] px-2"
                >
                  Expand All
                </Button>
                <Button
                  onClick={collapseAll}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[#605e5c] px-2"
                >
                  Collapse All
                </Button>
                <Button
                  onClick={simulateAccountCheck}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-7 text-xs"
                >
                  <Search className="w-3 h-3" />
                  Re-check
                </Button>
              </div>
            </div>

            <Separator />

            {/* Compact Table */}
            <div className="border border-[#e1dfdd] rounded overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[24px_1fr_120px_100px_80px_100px_100px] gap-2 px-3 py-2 bg-[#f3f2f1] border-b border-[#e1dfdd] text-xs font-medium text-[#605e5c]">
                <div></div>
                <div>Identifier</div>
                <div>Task ID</div>
                <div>Account</div>
                <div>Services</div>
                <div>Status</div>
                <div>Created By</div>
              </div>

              {/* All Identifiers - unified list */}
              {identifiers.map((identifier) => {
                const result = accountCheckResults[identifier.id];
                const isFound = result?.exists;
                const isExpanded = expandedIdentifiers.has(identifier.id);
                const taskStatusConfig = summaryStatusMap[identifier.taskStatus] || summaryStatusMap['New'];

                // Resolve services & data categories
                let resolvedServices: string[] = [];
                let resolvedItems: Record<string, Record<string, string[]>> = {};
                if (isFound) {
                  if (serviceConfig.mode === "bulk") {
                    // Check if we have per-identifier LE data (LE accepted flow)
                    const leDataForId = serviceConfig.leAcceptedPerIdentifier?.[identifier.id];
                    if (leDataForId && leDataForId.services?.length > 0) {
                      resolvedServices = leDataForId.services;
                      resolvedItems = leDataForId.items || {};
                    } else {
                      resolvedServices = serviceConfig.bulkSettings.services;
                      resolvedItems = serviceConfig.bulkSettings.selectedItems || {};
                    }
                  } else if (serviceConfig.individualSettings?.[identifier.id]) {
                    const indivConfig = serviceConfig.individualSettings[identifier.id];
                    resolvedServices = indivConfig.services || [];
                    resolvedItems = indivConfig.selectedItems || {};
                  }
                }

                const totalCategories = resolvedServices.reduce(
                  (sum, sId) => sum + Object.values(resolvedItems[sId] || {}).reduce((s, arr) => s + arr.length, 0), 0
                );

                return (
                  <div key={identifier.id} className={cn("border-b border-[#e1dfdd] last:border-b-0", !isFound && "bg-[#fef6f6]")}>
                    {/* Compact Row */}
                    <div
                      className={cn(
                        "grid grid-cols-[24px_1fr_120px_100px_80px_100px_100px] gap-2 px-3 py-2 items-center cursor-pointer hover:bg-[#f3f2f1] transition-colors",
                        isExpanded && "bg-[#f9f9f9]"
                      )}
                      onClick={() => toggleIdentifier(identifier.id)}
                      role="button"
                      aria-expanded={isExpanded}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleIdentifier(identifier.id); } }}
                    >
                      <div className="flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[#605e5c]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-[#605e5c]" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        {isFound ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10] flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-[#d13438] flex-shrink-0" />
                        )}
                        <Badge variant="outline" className="text-[10px] flex-shrink-0 py-0 px-1.5">
                          {identifier.type}
                        </Badge>
                        <span className="text-xs font-medium text-[#323130] truncate">
                          {identifier.value}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-[#605e5c] truncate">
                        {identifier.taskId || '—'}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {isFound && result?.accountTypes?.includes("Consumer") && (
                          <Badge className="text-[10px] py-0 px-1 bg-[#deecf9] text-[#0078d4] border-[#0078d4]">C</Badge>
                        )}
                        {isFound && result?.accountTypes?.includes("Enterprise") && (
                          <Badge className="text-[10px] py-0 px-1 bg-[#fff9f5] text-[#ca5010] border-[#ca5010]">E</Badge>
                        )}
                        {!isFound && (
                          <span className="text-[10px] text-[#d13438]">Not Found</span>
                        )}
                      </div>
                      <div className="text-xs text-[#605e5c]">
                        {isFound ? (
                          <span>{resolvedServices.length} svc</span>
                        ) : (
                          <span className="text-[#a19f9d]">—</span>
                        )}
                      </div>
                      <div>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5"
                          style={{
                            color: taskStatusConfig.color,
                            backgroundColor: taskStatusConfig.bgColor,
                            borderColor: taskStatusConfig.borderColor,
                          }}
                        >
                          {taskStatusConfig.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-[#605e5c] truncate">
                        {identifier.createdBy || '—'}
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 ml-6 border-t border-[#edebe9]">
                        {isFound ? (
                          <div className="space-y-3">
                            {/* Account Details - inline */}
                            <div className="flex gap-6 flex-wrap text-xs">
                              {result.consumer && (
                                <div>
                                  <span className="font-medium text-[#0078d4]">Consumer</span>
                                  <span className="text-[#605e5c] ml-2">Storage: <span className="text-[#323130] font-medium">{result.consumer.storageLocation}</span></span>
                                  <span className="text-[#605e5c] ml-2">ID: <span className="text-[#323130] font-medium break-all">{result.consumer.primaryId}</span></span>
                                </div>
                              )}
                              {result.enterprise && (
                                <div>
                                  <span className="font-medium text-[#ca5010]">Enterprise</span>
                                  <span className="text-[#605e5c] ml-2">Storage: <span className="text-[#323130] font-medium">{result.enterprise.storageLocation}</span></span>
                                  <span className="text-[#605e5c] ml-2">ID: <span className="text-[#323130] font-medium break-all">{result.enterprise.primaryId}</span></span>
                                </div>
                              )}
                            </div>

                            {/* Services & Categories - compact grid */}
                            {resolvedServices.length > 0 ? (
                              <div>
                                <p className="text-xs font-medium text-[#323130] mb-1.5">
                                  Services & Data Categories ({resolvedServices.length} service{resolvedServices.length !== 1 ? "s" : ""}, {totalCategories} categor{totalCategories !== 1 ? "ies" : "y"})
                                </p>
                                <div className="grid grid-cols-1 gap-1">
                                  {resolvedServices.map((serviceId) => {
                                    const categories = Object.values(
                                      resolvedItems[serviceId] || {}
                                    ).flat();
                                    return (
                                      <div key={serviceId} className="flex items-baseline gap-2 text-xs py-0.5">
                                        <span className="font-medium text-[#323130] flex-shrink-0 w-[120px]">{getServiceName(serviceId)}</span>
                                        {categories.length > 0 ? (
                                          <span className="text-[#605e5c]">{categories.join(" · ")}</span>
                                        ) : (
                                          <span className="text-[#a19f9d] italic">No Data Types selected</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-[#a19f9d] italic">No services configured</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-[#605e5c]">
                            Account not found — services and data categories not applicable.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}
      </Card>

    </div>
  );
}
