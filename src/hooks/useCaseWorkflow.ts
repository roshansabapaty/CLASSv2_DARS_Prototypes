import { useState, useCallback } from "react";
import { toast } from "sonner@2.0.3";
import type { FormData, TaskStatus } from "../types/caseTypes";
import {
  generateCaseId,
  generateCaseNumber,
  generateJobId,
} from "../utils/caseFactories";

interface UseCaseWorkflowOptions {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setExpandedServices: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>>>>;
  setExpandedIdentifiers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsDueDateManuallySet: React.Dispatch<React.SetStateAction<boolean>>;
  workflowStage: "triage" | "fulfillment" | "collection";
  isEditingCollectionScope: boolean;
  availableDocuments: any[];
  markAsSaved: () => void;
  onNavigateToFulfillment?: () => void;
  onNavigateToCollection?: () => void;
  onNavigateToReadySubmit?: () => void;
  onNavigateToQueue?: () => void;
  // Account existence check dependencies
  setCheckingExistence: (v: boolean) => void;
  setDisplayFrozen: (v: boolean) => void;
  setIdentifierViewMode: (v: string) => void;
  expandAllIdentifiers: () => void;
  wizardServiceConfig?: any; // Wizard service config with individualSettings for additional date ranges
  /** Optional getter for `wizardServiceConfig`. When provided, the
   *  fulfillment-submit path calls this at handler-invocation time to
   *  read the LATEST value from the parent's ref — bypassing the stale
   *  closure that the value-typed `wizardServiceConfig` prop suffers
   *  from when the parent hasn't re-rendered between the wizard's last
   *  config change and the user's "Update Collection Plan" click.
   *
   *  Without this getter, any additional-job submission that follows
   *  pure-wizard interactions (no parent renders in between) would
   *  see a stale `wizardServiceConfig` and skip the new
   *  `additionalDateRanges` the RS just configured. */
  getWizardServiceConfig?: () => any;
}

export function useCaseWorkflow({
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
  wizardServiceConfig,
  getWizardServiceConfig,
}: UseCaseWorkflowOptions) {
  const [showFulfillmentSummary, setShowFulfillmentSummary] = useState(false);
  const [isSubmittingFulfillment, setIsSubmittingFulfillment] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Triage only requires case status + assigned person
    if (workflowStage === "triage") {
      if (!formData.caseStage) newErrors.caseStage = "Case status is required";
      if (!formData.assigneeName) newErrors.assigneeName = "Assigned to is required";
      if (formData.caseStage === "Rejected" && !formData.rejectionReason.trim()) {
        newErrors.rejectionReason = "Rejection reason is required";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // Full validation for fulfillment and beyond
    if (!formData.caseId) newErrors.caseId = "Case ID is required";
    if (!formData.createDate) newErrors.createDate = "Create date is required";
    if (!formData.assigneeName) newErrors.assigneeName = "Assigned to is required";
    if (!formData.requestType) newErrors.requestType = "Request type is required";
    if (formData.requestType === "Other" && !formData.otherRequestTypeDescription.trim()) newErrors.otherRequestTypeDescription = "Please describe the request type";
    if (!formData.requestOrigin) newErrors.requestOrigin = "Request origin is required";
    if (formData.requestOrigin === "Other" && !formData.requestOriginOther) newErrors.requestOriginOther = "Please describe the request origin";
    if (!formData.caseStage) newErrors.caseStage = "Case status is required";
    if (formData.caseStage === "Rejected" && !formData.rejectionReason.trim()) newErrors.rejectionReason = "Rejection reason is required when case status is Rejected";
    if (!formData.country) newErrors.country = "Country is required";
    if (!formData.jurisdiction) newErrors.jurisdiction = "Jurisdiction is required";
    if (!formData.natureOfCrimes || formData.natureOfCrimes.length === 0) newErrors.natureOfCrimes = "Select at least one nature of crime";
    if (!formData.agents || formData.agents.length === 0) newErrors.agents = "Add at least one agent";
    if (!formData.agency) newErrors.agency = "Agency is required";
    if (!formData.agencyAddress.stateProvince || !formData.agencyAddress.stateProvince.trim()) newErrors.agencyAddressState = "State/Province is required";

    if (formData.identifiers.length === 0) newErrors.identifiers = "Add at least one identifier";

    // Services and date range required for fulfillment
    {
      const hasService = formData.identifiers.some(identifier =>
        Object.values(identifier.services).some(service => service.enabled)
      );
      if (formData.identifiers.length > 0 && !hasService) {
        newErrors.services = "Select at least one Microsoft service for at least one identifier";
      }

      if (!formData.startDate) newErrors.startDate = "Start date is required";
      if (!formData.endDate) newErrors.endDate = "End date is required";

      if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    // Triage only requires case status + assigned person
    if (workflowStage === "triage") {
      return !!(formData.caseStage && formData.assigneeName);
    }

    // Fulfillment (Review Case) requires a completed fulfillment plan
    // with services + date range. Per-section "mark as reviewed" gating
    // was removed — section completion now mirrors the same data-driven
    // signal used on Triage.
    const hasService = formData.identifiers.some(identifier => {
      const fp = (identifier as any).fulfillmentPlan;
      return fp?.services && Object.keys(fp.services).length > 0;
    });
    const hasDateRange = formData.identifiers.some(identifier => {
      const fp = (identifier as any).fulfillmentPlan;
      return fp?.dateRange?.start && fp?.dateRange?.end;
    });
    return hasService && hasDateRange;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix all validation errors before submitting");
      return;
    }

    markAsSaved();
    console.log("Form submitted:", formData);
    
    if (workflowStage === "triage") {
      if (formData.caseStage === "Rejected") {
        if (!formData.rejectionReason.trim()) {
          toast.error("Rejection reason is required");
          return;
        }
        const taskCount = formData.identifiers.length;
        const documentCount = availableDocuments.length;
        toast.success("Case rejected and closed", {
          description: `All ${taskCount} task${taskCount !== 1 ? 's' : ''} and ${documentCount} document${documentCount !== 1 ? 's' : ''} marked as rejected. Reason: ${formData.rejectionReason}`
        });
        if (onNavigateToQueue) {
          setTimeout(() => { onNavigateToQueue(); }, 500);
        }
      } else {
        setFormData(prev => ({
          ...prev,
          caseStage: "Triage Complete",
          assigneeName: ""
        }));
        toast.success("Triage completed successfully!");
        if (onNavigateToFulfillment) {
          setTimeout(() => { onNavigateToFulfillment(); }, 500);
        }
      }
    } else if (workflowStage === "fulfillment") {
      toast.success("Fulfillment completed successfully!");
      if (onNavigateToReadySubmit) {
        setTimeout(() => { onNavigateToReadySubmit(); }, 500);
      }
    }
  };

  const handleFulfillmentSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix all validation errors before submitting");
      setShowFulfillmentSummary(false);
      return;
    }

    markAsSaved();

    // --- Triage stage: Complete Triage and navigate to Fulfillment ---
    if (workflowStage === "triage") {
      setIsSubmittingFulfillment(true);
      await new Promise(resolve => setTimeout(resolve, 800));

      if (formData.caseStage === "Rejected") {
        if (!formData.rejectionReason.trim()) {
          toast.error("Rejection reason is required");
          setIsSubmittingFulfillment(false);
          return;
        }
        const taskCount = formData.identifiers.length;
        const documentCount = availableDocuments.length;
        setShowFulfillmentSummary(false);
        setIsSubmittingFulfillment(false);
        toast.success("Case rejected and closed", {
          description: `All ${taskCount} task${taskCount !== 1 ? 's' : ''} and ${documentCount} document${documentCount !== 1 ? 's' : ''} marked as rejected. Reason: ${formData.rejectionReason}`
        });
        if (onNavigateToQueue) {
          setTimeout(() => { onNavigateToQueue(); }, 500);
        }
        return;
      }

      setFormData(prev => ({
        ...prev,
        caseStage: "Triage Complete",
        assigneeName: ""
      }));

      setShowFulfillmentSummary(false);
      setIsSubmittingFulfillment(false);
      toast.success("Triage completed successfully!");

      if (onNavigateToFulfillment) {
        setTimeout(() => { onNavigateToFulfillment(); }, 500);
      }
      return;
    }

    // --- Fulfillment stage: Submit to collection service ---
    setIsSubmittingFulfillment(true);
    
    toast.loading(
      isEditingCollectionScope 
        ? "Submitting additional jobs to collection service..." 
        : "Submitting fulfillment to data collection service...", 
      { id: "fulfillment-submit" }
    );

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Helper: generate simulated collection status for new jobs
    const simulateNewJobStatus = () => {
      const rand = Math.random();
      let collectionStatus: "Not Started" | "Started" | "Complete" | "No Data" | "Failed";
      if (rand < 0.75) {
        collectionStatus = "Started";
      } else if (rand < 0.90) {
        collectionStatus = "Complete";
      } else {
        collectionStatus = "No Data";
      }

      const now = new Date();
      const timestampRand = Math.random();
      let updateTimestamp: Date;
      if (timestampRand < 0.3) {
        updateTimestamp = new Date(now.getTime() - Math.floor(Math.random() * 30) * 60 * 1000);
      } else if (timestampRand < 0.6) {
        updateTimestamp = new Date(now.getTime() - (Math.floor(Math.random() * 6) + 1) * 60 * 60 * 1000);
      } else if (timestampRand < 0.85) {
        updateTimestamp = new Date(now.getTime() - (Math.floor(Math.random() * 18) + 6) * 60 * 60 * 1000);
      } else {
        updateTimestamp = new Date(now.getTime() - (Math.floor(Math.random() * 3) + 1) * 24 * 60 * 60 * 1000);
      }
      return { collectionStatus, updateTimestamp };
    };

    let newJobCount = 0;

    // BUG FIX — Stale-closure on "Update Collection Plan". Two pieces
    // of state are captured by this handler's closure:
    //
    //   1. `formData.identifiers` — used to iterate identifiers + their
    //      services. By the time this code runs, the wizard's
    //      `handleFinish` has just queued multiple `setFormData` calls
    //      (one per identifier via `onUpdateIdentifier`) which React
    //      hasn't flushed yet. The closure sees the PRE-handleFinish
    //      identifiers, so any new categories/services the RS enabled
    //      in the wizard are invisible → no jobIds assigned → nothing
    //      visible on the Collection page when the identifier expands.
    //
    //   2. `wizardServiceConfig` — the parent stores it in a ref and
    //      updates the ref on every onServiceConfigChange. Ref updates
    //      don't trigger renders, so the value captured here at hook
    //      invocation can be older than the user's last wizard change
    //      (e.g., when ALL their interaction was inside the wizard).
    //      The closure sees stale `additionalDateRanges` → new
    //      additional jobs never get created.
    //
    // Fixes:
    //   - Wrap the identifier loop in `setFormData(prev => ...)` so
    //     `prev.identifiers` reflects the queued handleFinish writes.
    //   - Call the `getWizardServiceConfig()` getter (if provided) to
    //     read the latest ref value at invocation time, bypassing the
    //     stale closure capture.
    const liveWizardServiceConfig =
      getWizardServiceConfig?.() ?? wizardServiceConfig;
    let updatedIdentifiers: any[] = [];
    setFormData((prev) => {
      updatedIdentifiers = prev.identifiers.map((identifier) => {
      const updatedServices: Record<string, any> = {};
      let hasEnabledCategories = false;

      // Get wizard config for this identifier to resolve date ranges
      const wizardConfig = liveWizardServiceConfig?.individualSettings?.[identifier.id];
      const wizardAdditionalDateRanges = wizardConfig?.additionalDateRanges || {};
      const wizardCategoryDateRanges = wizardConfig?.categoryDateRanges || {};
      const wizardServiceDateRanges = wizardConfig?.dateRanges || {};
      const bulkDateRange = liveWizardServiceConfig?.bulkSettings?.dateRange;

      // Helper: resolve date range for a category from wizard config
      // categoryKey is compound "groupKey:itemKey"; wizardCategoryDateRanges keyed by "serviceId:groupKey:itemKey"
      const resolveDateRange = (serviceKey: string, categoryKey: string): { start?: Date; end?: Date } => {
        // 1. Category-specific date range (individual mode) — key: "serviceId:groupKey:itemKey"
        const catRange = wizardCategoryDateRanges[`${serviceKey}:${categoryKey}`];
        if (catRange?.start && catRange?.end) {
          return { start: new Date(catRange.start), end: new Date(catRange.end) };
        }
        // 2. Service-level date range (individual mode)
        const svcRange = wizardServiceDateRanges[serviceKey];
        if (svcRange?.start && svcRange?.end) {
          return { start: new Date(svcRange.start), end: new Date(svcRange.end) };
        }
        // 3. Bulk date range (bulk mode)
        if (bulkDateRange?.start && bulkDateRange?.end) {
          return { start: new Date(bulkDateRange.start), end: new Date(bulkDateRange.end) };
        }
        return { start: undefined, end: undefined };
      };

      // Fallback: resolve dates from the service object if wizard config has nothing
      const resolveDateRangeWithServiceFallback = (serviceKey: string, catDisplayName: string, service: any): { start?: Date; end?: Date } => {
        const wizardDates = resolveDateRange(serviceKey, catDisplayName);
        if (wizardDates.start && wizardDates.end) return wizardDates;
        // Fallback to service-level dates
        if (service.startDate && service.endDate) {
          return { start: new Date(service.startDate), end: new Date(service.endDate) };
        }
        return wizardDates;
      };

      Object.entries(identifier.services).forEach(([serviceKey, service]) => {
        if (service.enabled) {
          // Build updated categoryGroups by iterating nested groupKey → itemKey
          const updatedCategoryGroups: Record<string, Record<string, any>> = {};

          Object.entries(service.categoryGroups || {}).forEach(([groupKey, groupItems]: [string, any]) => {
            updatedCategoryGroups[groupKey] = {};
            Object.entries(groupItems || {}).forEach(([itemKey, category]: [string, any]) => {
              // compound key used for wizard config lookups
              const categoryKey = `${groupKey}:${itemKey}`;

              if (category.enabled) {
                hasEnabledCategories = true;
                const isExistingJob = !!category.jobId;
                const now = new Date();

                if (isExistingJob && isEditingCollectionScope) {
                  // Already-submitted job: collect every NEW date range the
                  // wizard carries for this (service, category, item) and
                  // spawn one additional job per range with fresh IDs.
                  //
                  // Two sources of "new" ranges:
                  //   1. Explicit wizard `additionalDateRanges[rangeKey]`
                  //      — populated when the user clicks "Add date range".
                  //   2. Implicit single new range — when the wizard's
                  //      effective per-category / per-service / bulk
                  //      range differs from the primary job's stored
                  //      startDate/endDate. Catches the case where the
                  //      user EDITS the existing date range field (or
                  //      uses the dialog without explicitly clicking
                  //      "Add date range") — previously silently dropped.
                  //
                  // Either way the new entry is treated as a new job:
                  // fresh `jobId`, fresh `publishJobId` (when status
                  // simulates eligible), fresh `deliveryJobId` (assigned
                  // later when the RS submits to delivery). The primary
                  // job is preserved unchanged so Pipeline retains both.
                  const rangeKey = `${serviceKey}:${categoryKey}`;
                  const explicitRanges: Array<{ start: string; end: string }> =
                    wizardAdditionalDateRanges[rangeKey] || [];
                  const wizardCatRange =
                    wizardCategoryDateRanges[`${serviceKey}:${categoryKey}`];
                  const wizardSvcRange = wizardServiceDateRanges[serviceKey];
                  const wizardEffectiveRange =
                    wizardCatRange ??
                    wizardSvcRange ??
                    (bulkDateRange?.start && bulkDateRange?.end
                      ? { start: bulkDateRange.start, end: bulkDateRange.end }
                      : null);
                  const sameAsExistingPrimary =
                    wizardEffectiveRange &&
                    category.startDate &&
                    category.endDate &&
                    new Date(wizardEffectiveRange.start).getTime() ===
                      new Date(category.startDate).getTime() &&
                    new Date(wizardEffectiveRange.end).getTime() ===
                      new Date(category.endDate).getTime();
                  // Don't double-add if the explicit ranges already cover
                  // the implicit one (handles the rare path where both
                  // sources point at the same new range).
                  const alreadyExplicit = (start: string, end: string) =>
                    explicitRanges.some(
                      (r) => r.start === start && r.end === end,
                    );
                  const implicitRanges: Array<{ start: string; end: string }> =
                    wizardEffectiveRange &&
                    wizardEffectiveRange.start &&
                    wizardEffectiveRange.end &&
                    !sameAsExistingPrimary &&
                    !alreadyExplicit(
                      wizardEffectiveRange.start,
                      wizardEffectiveRange.end,
                    )
                      ? [
                          {
                            start: wizardEffectiveRange.start,
                            end: wizardEffectiveRange.end,
                          },
                        ]
                      : [];
                  const allNewRanges = [...explicitRanges, ...implicitRanges];
                  const newAdditionalJobs = allNewRanges.map((dr) => {
                    const newJobId = generateJobId();
                    const { collectionStatus, updateTimestamp } = simulateNewJobStatus();
                    newJobCount++;
                    return {
                      jobId: newJobId,
                      startDate: dr.start ? new Date(dr.start) : undefined,
                      endDate: dr.end ? new Date(dr.end) : undefined,
                      createdOn: now,
                      collectionStatus,
                      collectionStatusUpdatedAt: updateTimestamp,
                      publishStatus: (collectionStatus === "Complete" || collectionStatus === "No Data") ? "Started" as const : "Not Started" as const,
                      publishStatusUpdatedAt: (collectionStatus === "Complete" || collectionStatus === "No Data") ? updateTimestamp : undefined,
                      publishJobId: (collectionStatus === "Complete" || collectionStatus === "No Data") ? `PUB-${newJobId}` : undefined,
                    };
                  });

                  updatedCategoryGroups[groupKey][itemKey] = {
                    ...category,
                    additionalJobs: [
                      ...(category.additionalJobs || []),
                      ...newAdditionalJobs,
                    ],
                  };
                } else if (!isExistingJob) {
                  // New job: assign jobId, createdOn, and resolve date range from wizard config
                  const jobId = generateJobId();
                  const { collectionStatus, updateTimestamp } = simulateNewJobStatus();
                  newJobCount++;
                  const dateRange = resolveDateRangeWithServiceFallback(serviceKey, categoryKey, service);

                  updatedCategoryGroups[groupKey][itemKey] = {
                    ...category,
                    jobId,
                    createdOn: now,
                    startDate: dateRange.start || category.startDate,
                    endDate: dateRange.end || category.endDate,
                    collectionStatus,
                    collectionStatusUpdatedAt: updateTimestamp,
                    publishStatus: (collectionStatus === "Complete" || collectionStatus === "No Data") ? "Started" : "Not Started",
                    publishStatusUpdatedAt: (collectionStatus === "Complete" || collectionStatus === "No Data") ? updateTimestamp : undefined,
                    publishJobId: (collectionStatus === "Complete" || collectionStatus === "No Data")
                      ? `PUB-${jobId}`
                      : undefined,
                    deliveryJobId: undefined,
                  };
                } else {
                  updatedCategoryGroups[groupKey][itemKey] = category;
                }
              } else {
                updatedCategoryGroups[groupKey][itemKey] = category;
              }
            });
          });

          updatedServices[serviceKey] = {
            ...service,
            categoryGroups: updatedCategoryGroups,
          };
        } else {
          updatedServices[serviceKey] = service;
        }
      });

      const taskStatus = hasEnabledCategories ? "In Progress" : identifier.taskStatus;

      return {
        ...identifier,
        services: updatedServices,
        taskStatus,
      };
    });
      return {
        ...prev,
        identifiers: updatedIdentifiers,
      };
    });

    let totalJobs = 0;
    updatedIdentifiers.forEach(identifier => {
      Object.values(identifier.services).forEach((service: any) => {
        Object.values(service.categoryGroups || {}).forEach((group: any) => {
          Object.values(group || {}).forEach((category: any) => {
            if (category.enabled) {
              totalJobs++;
              if (category.additionalJobs) totalJobs += category.additionalJobs.length;
            }
          });
        });
      });
    });
    
    setShowFulfillmentSummary(false);
    setIsSubmittingFulfillment(false);
    
    toast.success(
      isEditingCollectionScope
        ? `${newJobCount} additional job${newJobCount !== 1 ? 's' : ''} submitted to collection!`
        : `Fulfillment submitted successfully! ${totalJobs} collection job${totalJobs !== 1 ? 's' : ''} initiated.`, 
      { 
        id: "fulfillment-submit",
        duration: 4000 
      }
    );
    
    if (onNavigateToCollection) {
      setTimeout(() => { onNavigateToCollection(); }, 1500);
    }
  };

  const handleCheckAccountExistence = async () => {
    await checkAccountsForIdentifiers();
  };

  /** Scoped variant of `handleCheckAccountExistence` (Phase 5b.4a). When
   *  `identifierIds` is omitted or empty, runs against every identifier
   *  (preserving the original Step 1 behavior). When provided, runs only
   *  against the listed identifiers. */
  const checkAccountsForIdentifiers = async (identifierIds?: string[]) => {
    const { runAccountExistenceCheck, applyAccountExistenceResults } = await import("../utils/accountExistenceCheck");
    const { isEpocPrCase } = await import("../utils/eEvidenceHelpers");
    // Phase 3 cross-border merge — IP History for Consumer identifiers
    // is populated as a side-effect of Check Accounts. The lookup pulls
    // the last 30 days of login activity (today - 30d → today) and
    // writes the most recent event to the cross-surface ipHistoryStore
    // so the IdentifierTable's "Consumer User Location Summary" column
    // and the LoginLocationPanel can render it without a separate
    // service call.
    const { queryLogins } = await import("../services/loginQuery");
    const { setLastLogon } = await import("../state/ipHistoryStore");

    const targetIds = identifierIds && identifierIds.length > 0
      ? new Set(identifierIds)
      : null;
    const targets = targetIds
      ? formData.identifiers.filter((id) => targetIds.has(id.id))
      : formData.identifiers;

    if (targets.length === 0) {
      toast.info("No identifiers to check.");
      return;
    }

    setCheckingExistence(true);

    const { resultsMap, totalResults, successCount, errorCount } = await runAccountExistenceCheck(
      targets,
      formData.caseStage,
      workflowStage,
      // EPOC-PR (preservation) cases skip the Packaging / Delivery
      // status writes — only Collection runs.
      isEpocPrCase(formData),
    );

    setDisplayFrozen(true);

    // Stamp case-level audit fields the Account Identifiers section
    // shows underneath the row labels ("Checked Mmm d at h:mm a by X"
    // + "Re-check" button label). The per-identifier results still
    // land on each `AccountIdentifier.accountExistenceStatus` below.
    const checkedAt = new Date();
    const checkedBy = "Nicole Garcia";

    const updatedIdentifiers = applyAccountExistenceResults(
      formData.identifiers,
      resultsMap,
    );

    // Populate the IP History store for Consumer identifiers — 30-day
    // window ending today. Enterprise identifiers are excluded; their
    // cross-border determination is org-level (Tenant Home Location vs
    // issuing-authority country), surfaced in the OrgPanel instead.
    const today = new Date();
    const rangeEnd = today.toISOString().slice(0, 10);
    const rangeStart = new Date(
      today.getTime() - 30 * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);
    const issuingAgency = {
      id: formData.caseId,
      name: formData.agency ?? "",
      shortName: formData.agency ?? "",
      countryCode: formData.agencyCountryCode ?? "",
      country: formData.country ?? "",
      type:
        formData.requestType === "eEvidence"
          ? ("Judicial Authority" as const)
          : ("Law Enforcement" as const),
    };
    for (const id of updatedIdentifiers) {
      if (id.checkAccounts?.accountType !== "Consumer") continue;
      const r = queryLogins({
        identifier: id.value,
        rangeStart,
        rangeEnd,
        issuingAgency,
      });
      const latest =
        r.events.length > 0 ? r.events[r.events.length - 1] : null;
      setLastLogon(id.id, {
        lastEvent: latest,
        totalEvents: r.totalEvents,
        queriedAt: new Date(),
        rangeStart,
        rangeEnd,
      });
    }

    setFormData((prev) => ({
      ...prev,
      identifiers: updatedIdentifiers,
      accountsCheckedAt: checkedAt,
      accountsCheckedBy: checkedBy,
    }));

    setCheckingExistence(false);

    setTimeout(() => {
      setDisplayFrozen(false);
    }, 150);

    if (errorCount === 0) {
      toast.success(`Account existence check completed for ${successCount} identifier${successCount !== 1 ? 's' : ''} (${totalResults} total data types)`);
    } else if (successCount === 0) {
      toast.error(`Account existence check failed for all ${errorCount} identifier${errorCount !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`Account existence check completed with ${successCount} success and ${errorCount} error${errorCount !== 1 ? 's' : ''}`);
    }

    if (workflowStage !== "triage") {
      setIdentifierViewMode("detailed");
    }
    expandAllIdentifiers();
  };

  const handleReset = () => {
    setFormData({
      caseId: generateCaseId(),
      createDate: undefined,
      assigneeName: "",
      requestType: "",
      requestSubType: "",
      requestOrigin: "",
      requestOriginOther: "",
      otherRequestTypeDescription: "",
      caseStage: "",
      country: "",
      jurisdiction: "",
      natureOfCrimes: [],
      caseNumber: generateCaseNumber(),
      agencyCaseNumber: "",
      relatedCaseNumbers: "",
      agents: [],
      agency: "",
      agencyPhone: "",
      agencyAddress: {
        number: "",
        city: "",
        stateProvince: "",
        postalCode: "",
      },
      dueDate: undefined,
      shieldLawConfirmation: "",
      eu27DsaHarms: [],
      eu27DsaHarmsSubCategories: [],
      authorizationStartDate: undefined,
      authorizationExpirationDate: undefined,
      authorizationDesiredStatus: "",
      identifiers: [],
      ndos: [],
      startDate: undefined,
      endDate: undefined,
      timeZone: "UTC",
      notes: [],
    } as any);
    setErrors({});
    setExpandedServices({});
    setExpandedIdentifiers({});
    setIsDueDateManuallySet(false);
    toast.info("Form cleared");
  };

  return {
    showFulfillmentSummary, setShowFulfillmentSummary,
    isSubmittingFulfillment, setIsSubmittingFulfillment,
    validateForm,
    isFormValid,
    handleSubmit,
    handleFulfillmentSubmit,
    handleCheckAccountExistence,
    checkAccountsForIdentifiers,
    handleReset,
  };
}
