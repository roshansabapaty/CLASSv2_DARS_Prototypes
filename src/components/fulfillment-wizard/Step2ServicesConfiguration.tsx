/**
 * Step 2: Services Configuration Component
 * Configure Microsoft services and data categories for fulfillment
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Settings,
  Edit2,
  AlertCircle,
  XCircle,
  Circle,
  X,
  Check,
} from "lucide-react";
import { cn } from "../ui/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { toast } from "sonner@2.0.3";
import { CopyableIdentifier } from "../CopyableIdentifier";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  LENS_SERVICES,
  LENS_SERVICE_MAP,
  getServiceCategoryGroups,
  type CategoryGroupConfig,
} from "../../config/lensServicesConfig";
import { formatDateToMMM } from "../../utils/fulfillmentWizardHelpers";
import { ServiceDropdownSelector } from "./ServiceDropdownSelector";
import { ServiceCategoryTable } from "./ServiceCategoryTable";
import type { ItemSelectionState } from "../../utils/categoryUtils";
import {
  snapshotLEBaseline,
  computeDiff,
  getBaselineDate,
  type LEBaseline,
} from "./leBaseline";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { AuthorizationStatusBanner } from "./AuthorizationStatusBanner";
import { UnifiedIdentifiersView } from "./UnifiedIdentifiersView";
import { ChangesSummary } from "./ChangesSummary";

export interface Step2Props {
  identifiers: any[];
  serviceConfig: any;
  onUpdateServiceConfig: (config: any) => void;
  /** Mutate the wizard's identifiers list. Used for per-identifier state
   *  flips driven from Step 2 (rejection, ETSI acknowledge, Mark Invalid,
   *  Acknowledge Account-Not-Found, etc.). */
  onUpdateIdentifiers?: (identifiers: any[]) => void;
  announce?: (message: string) => void;
  accountCheckResults: Record<string, any>;
  isEditingCollectionScope?: boolean;
  /** Case-level LE-driven authorization status (Phase 5c.3). When
   *  "Cancelled" or "Withdrawn", the banner at top of Step 2 surfaces the
   *  Acknowledge action. */
  authorizationDesiredStatus?: string;
  authorizationStatusUpdatedAt?: Date;
  authorizationStatusUpdatedBy?: string;
  authorizationStatusAcknowledgedAt?: Date;
  authorizationStatusAcknowledgedBy?: string;
  /** Called when the RS clicks "Acknowledge & withdraw all targets". The
   *  parent should set the audit fields on FormData and cascade the
   *  case-level status onto every identifier's taskStatus. */
  onAcknowledgeAuthorizationStatus?: () => void;
  /** Open the shared Resolve Case dialog. Surfaced as a secondary CTA in
   *  the banner once the RS has acknowledged a Cancelled / Withdrawn
   *  case-level authorization. */
  onOpenResolveCaseDialog?: () => void;
  /** True once the case has been resolved — suppresses the secondary
   *  Resolve CTA so it doesn't reopen after completion. */
  caseResolved?: boolean;
  /** Run the account-existence check for a subset of identifiers (Phase 5b.4a). */
  onCheckAccountsForIdentifiers?: (identifierIds: string[]) => void | Promise<void>;
}

interface SubmittedItemData {
  enabled: boolean;
  collectionStatus?: string;
  startDate?: Date;
  endDate?: Date;
  jobId?: string;
}

interface SubmittedCollectionData {
  services: Record<string, {
    enabled: boolean;
    // groupKey → itemKey → data
    categoryGroups: Record<string, Record<string, SubmittedItemData>>;
  }>;
}

interface IndividualServiceConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identifier: any;
  services: Array<{ id: string; name: string; icon: string }>;
  onSave: (config: any) => void;
  existingConfig?: any;
  announce?: (message: string) => void;
  leRequestsAccepted?: boolean;
  leServicesForIdentifier?: { services: string[]; items: ItemSelectionState };
  isEditingCollectionScope?: boolean;
  submittedCollectionData?: SubmittedCollectionData;
}

function IndividualServiceConfigDialog({
  open,
  onOpenChange,
  identifier,
  services,
  onSave,
  existingConfig,
  announce,
  leRequestsAccepted = false,
  leServicesForIdentifier,
  isEditingCollectionScope = false,
  submittedCollectionData,
}: IndividualServiceConfigDialogProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceDateRanges, setServiceDateRanges] = useState<Record<string, { start: string; end: string }>>({});
  // selectedItems: serviceId → groupKey → itemKey[]
  const [selectedItems, setSelectedItems] = useState<ItemSelectionState>({});
  // categoryDateRanges: "serviceId:groupKey:itemKey" → { start, end }
  const [categoryDateRanges, setCategoryDateRanges] = useState<Record<string, { start: string; end: string }>>({});
  const [serviceDaysBack, setServiceDaysBack] = useState<Record<string, number | string>>({});
  // Additional date ranges for duplicate jobs (keyed by serviceId:groupKey:itemKey)
  const [additionalDateRanges, setAdditionalDateRanges] = useState<Record<string, Array<{ start: string; end: string }>>>({});

  // Strict accountType filter for the per-identifier-config dialog. Services with no
  // accountType always appear; if account check hasn't run (undefined or "N/A"),
  // don't restrict.
  const detectedAT = identifier?.checkAccounts?.accountType;
  const filteredServices = services.filter((s) => {
    const at = LENS_SERVICE_MAP[s.id]?.accountType;
    if (!at) return true;
    if (!detectedAT || detectedAT === "N/A") return true;
    return at === detectedAT;
  });

  // availableGroups: per-service groups via getServiceCategoryGroups so per-service
  // overrides (e.g. msaProfile defaultSelected/locked Generic Attributes) are respected.
  const availableGroups: Record<string, CategoryGroupConfig[]> =
    Object.fromEntries(filteredServices.map((s) => [s.id, getServiceCategoryGroups(s.id)]));

  const formatDate = (d: any) => {
    if (!d) return "";
    const date = d instanceof Date ? d : new Date(d);
    return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
  };

  // Load existing configuration when dialog opens
  React.useEffect(() => {
    if (open && existingConfig) {
      setSelectedServices(existingConfig.services || []);
      setServiceDateRanges(existingConfig.dateRanges || {});
      setSelectedItems(existingConfig.selectedItems || {});
      setCategoryDateRanges(existingConfig.categoryDateRanges || {});
      setAdditionalDateRanges(existingConfig.additionalDateRanges || {});
      // Recalculate daysBack from existing date ranges
      const daysBack: Record<string, number | string> = {};
      Object.entries(existingConfig.dateRanges || {}).forEach(([sId, range]: [string, any]) => {
        if (range.start && range.end) {
          const start = new Date(range.start);
          const end = new Date(range.end);
          const diff = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          daysBack[sId] = diff;
        }
      });
      setServiceDaysBack(daysBack);
    } else if (open && !existingConfig && isEditingCollectionScope && submittedCollectionData) {
      // Pre-select submitted services that have active jobs
      const svcIds = Object.entries(submittedCollectionData.services)
        .filter(([_, svc]) =>
          svc.enabled &&
          Object.values(svc.categoryGroups).some((group) =>
            Object.values(group).some((item: any) => item.jobId)
          )
        )
        .map(([id]) => id);
      setSelectedServices(svcIds);

      // Pre-select submitted items and load their date ranges
      const items: ItemSelectionState = {};
      const catDateRanges: Record<string, { start: string; end: string }> = {};
      const svcDateRanges: Record<string, { start: string; end: string }> = {};

      svcIds.forEach((svcId) => {
        const svc = submittedCollectionData.services[svcId];
        const svcItems: Record<string, string[]> = {};
        Object.entries(svc.categoryGroups).forEach(([groupKey, groupData]) => {
          const enabledItemKeys: string[] = [];
          Object.entries(groupData).forEach(([itemKey, item]: [string, any]) => {
            if (item.enabled && item.jobId) {
              enabledItemKeys.push(itemKey);
              if (item.startDate || item.endDate) {
                const rangeKey = `${svcId}:${groupKey}:${itemKey}`;
                catDateRanges[rangeKey] = {
                  start: formatDate(item.startDate),
                  end: formatDate(item.endDate),
                };
              }
            }
          });
          if (enabledItemKeys.length > 0) {
            svcItems[groupKey] = enabledItemKeys;
          }
        });
        if (Object.keys(svcItems).length > 0) {
          items[svcId] = svcItems;
        }
        svcDateRanges[svcId] = { start: "", end: "" };
      });

      setSelectedItems(items);
      setCategoryDateRanges(catDateRanges);
      setServiceDateRanges(svcDateRanges);
      setServiceDaysBack({});
      setAdditionalDateRanges({});
    } else if (open && !existingConfig) {
      if (leRequestsAccepted && leServicesForIdentifier) {
        setSelectedServices(leServicesForIdentifier.services);
        const initRanges: Record<string, { start: string; end: string }> = {};
        leServicesForIdentifier.services.forEach((s) => { initRanges[s] = { start: "", end: "" }; });
        setServiceDateRanges(initRanges);
        setSelectedItems({ ...leServicesForIdentifier.items });
        setCategoryDateRanges({});
        setServiceDaysBack({});
      } else {
        setSelectedServices([]);
        setServiceDateRanges({});
        setSelectedItems({});
        setCategoryDateRanges({});
        setServiceDaysBack({});
      }
      setAdditionalDateRanges({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingConfig, leRequestsAccepted, isEditingCollectionScope, submittedCollectionData]);

  if (!identifier) return null;

  // Helper: check if a service was previously submitted to collection
  const isServiceSubmitted = (serviceId: string): boolean => {
    if (!isEditingCollectionScope || !submittedCollectionData) return false;
    const svc = submittedCollectionData.services[serviceId];
    return !!(
      svc?.enabled &&
      Object.values(svc.categoryGroups).some((group) =>
        Object.values(group).some((item: any) => item.jobId)
      )
    );
  };

  // Helper: check if a specific item was previously submitted
  const isCategorySubmitted = (serviceId: string, groupKey: string, itemKey: string): boolean => {
    if (!isEditingCollectionScope || !submittedCollectionData) return false;
    const svc = submittedCollectionData.services[serviceId];
    if (!svc) return false;
    const item = svc.categoryGroups[groupKey]?.[itemKey];
    return !!(item?.enabled && item?.jobId);
  };

  // Helper: get collection status for a submitted item
  const getCategoryCollectionStatus = (serviceId: string, groupKey: string, itemKey: string): string | undefined => {
    if (!submittedCollectionData) return undefined;
    return submittedCollectionData.services[serviceId]?.categoryGroups[groupKey]?.[itemKey]?.collectionStatus;
  };

  const handleDateChange = (serviceId: string, field: "start" | "end", value: string) => {
    setServiceDateRanges({
      ...serviceDateRanges,
      [serviceId]: {
        ...serviceDateRanges[serviceId],
        [field]: value,
      },
    });
  };

  const handleItemDateChange = (
    serviceId: string,
    groupKey: string,
    itemKey: string,
    field: "start" | "end",
    value: string
  ) => {
    const key = `${serviceId}:${groupKey}:${itemKey}`;
    setCategoryDateRanges((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || serviceDateRanges[serviceId] || { start: "", end: "" }),
        [field]: value,
      },
    }));
  };

  const getCategoryDateRange = (serviceId: string, groupKey: string, itemKey: string) => {
    const key = `${serviceId}:${groupKey}:${itemKey}`;
    return categoryDateRanges[key] || serviceDateRanges[serviceId] || { start: "", end: "" };
  };

  const handleSave = () => {
    const config = {
      services: selectedServices,
      dateRanges: serviceDateRanges,
      selectedItems: selectedItems,
      categoryDateRanges: categoryDateRanges,
      additionalDateRanges: Object.keys(additionalDateRanges).length > 0 ? additionalDateRanges : undefined,
    };

    onSave(config);
    onOpenChange(false);

    const totalItems = Object.values(selectedItems).reduce(
      (sum, groups) =>
        sum + Object.values(groups).reduce((s, keys) => s + keys.length, 0),
      0
    );
    toast.success(`Configuration saved for ${identifier.value}`, {
      description: `${selectedServices.length} service${selectedServices.length !== 1 ? "s" : ""} configured with ${totalItems} total data ${totalItems !== 1 ? "categories" : "category"}`,
    });
    announce?.(
      `Configuration saved for ${identifier.value}. ${selectedServices.length} service${selectedServices.length !== 1 ? "s" : ""} configured with ${totalItems} total data ${totalItems !== 1 ? "categories" : "category"}`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[calc(100vh-8rem)] overflow-y-auto !top-[5rem] !translate-y-0 !z-[60]">
        <DialogHeader>
          <DialogTitle>Configure Services for Identifier</DialogTitle>
          <DialogDescription>
            Select Microsoft services and data categories for{" "}
            <span className="font-medium text-[#323130]">{identifier?.value}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* LE Accepted Banner */}
          {leRequestsAccepted && leServicesForIdentifier && leServicesForIdentifier.services.length > 0 && (
            <div className="bg-[#dff6dd] border border-[#107c10]/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#107c10]" />
                <span className="text-xs font-medium text-[#107c10]">
                  LE-accepted services pre-selected ({leServicesForIdentifier.services.length} services)
                </span>
              </div>
              <p className="text-xs text-[#605e5c] ml-6">
                You can modify these selections, change date ranges, or add additional services below. Setting a date range is required.
              </p>
            </div>
          )}

          {/* Edit Collection Scope Banner */}
          {isEditingCollectionScope && (
            <div className="bg-[#fff4ce] border border-[#f9a825] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-[#8a6d3b]" />
                <span className="text-xs font-semibold text-[#323130]">Editing Collection Scope</span>
              </div>
              <p className="text-xs text-[#605e5c] ml-6">
                Previously submitted services and categories are locked and shown with their collection status. You can add new services or categories below.
              </p>
            </div>
          )}

          {/* Identifier Info */}
          <Card className="border-[#e1dfdd] bg-[#faf9f8] p-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {identifier?.type}
              </Badge>
              <span className="text-sm font-medium text-[#323130] break-all">
                {identifier?.value}
              </span>
            </div>
          </Card>

          {/* Services — Accordion + Table Hybrid */}
          <ServiceDropdownSelector
            label="Microsoft Services"
            services={filteredServices}
            availableGroups={availableGroups}
            selectedServices={selectedServices}
            selectedItems={selectedItems}
            showCard={false}
            identifierId={identifier?.id}
            identifierLabel={identifier?.value}
            identifierAccountType={identifier?.checkAccounts?.accountType}
            onSelectionChange={(newServices, newItems) => {
              // Prevent deselection of submitted services
              const safeServices = [...newServices];
              selectedServices.forEach((svcId) => {
                if (isServiceSubmitted(svcId) && !safeServices.includes(svcId)) {
                  safeServices.push(svcId);
                }
              });
              setSelectedServices(safeServices);
              // Prevent deselection of submitted items
              const safeItems = { ...newItems };
              Object.entries(selectedItems).forEach(([svcId, groups]) => {
                Object.entries(groups).forEach(([groupKey, itemKeys]) => {
                  itemKeys.forEach((itemKey) => {
                    if (isCategorySubmitted(svcId, groupKey, itemKey)) {
                      if (!safeItems[svcId]) safeItems[svcId] = {};
                      if (!safeItems[svcId][groupKey]) safeItems[svcId][groupKey] = [];
                      if (!safeItems[svcId][groupKey].includes(itemKey)) {
                        safeItems[svcId][groupKey] = [...safeItems[svcId][groupKey], itemKey];
                      }
                    }
                  });
                });
              });
              // Seed defaultSelected+locked items for newly-added services. The
              // tighter `defaultSelected && locked` filter (vs. just `defaultSelected`)
              // prevents the seeder from force-re-adding an item the user explicitly
              // unchecked in the Configure step. Non-locked defaults are pre-checked
              // via the Configure picker's seed; if the user unchecks them and
              // commits, the seeder respects that choice.
              safeServices.forEach((svcId) => {
                if (selectedServices.includes(svcId)) return; // already added previously
                const groups = getServiceCategoryGroups(svcId);
                groups.forEach((group) => {
                  const defaults = group.items
                    .filter((i) => i.defaultSelected && i.locked)
                    .map((i) => i.key);
                  if (defaults.length === 0) return;
                  if (!safeItems[svcId]) safeItems[svcId] = {};
                  const existing = safeItems[svcId][group.key] || [];
                  const merged = [...existing];
                  defaults.forEach((k) => { if (!merged.includes(k)) merged.push(k); });
                  safeItems[svcId][group.key] = merged;
                });
              });
              setSelectedItems(safeItems);
              // Init date ranges for newly added services
              safeServices.forEach((svcId) => {
                if (!serviceDateRanges[svcId]) {
                  setServiceDateRanges((prev) => ({ ...prev, [svcId]: { start: "", end: "" } }));
                }
              });
            }}
            renderBody={(serviceId) => {
              const svcSubmittedData = submittedCollectionData?.services[serviceId];
              // Strip serviceId prefix for the table (expects "groupKey:itemKey" keys)
              const tableCatDateRanges = Object.fromEntries(
                Object.entries(categoryDateRanges)
                  .filter(([k]) => k.startsWith(`${serviceId}:`))
                  .map(([k, v]) => [k.slice(serviceId.length + 1), v])
              );
              const svcGroups = getServiceCategoryGroups(serviceId);
              return (
                <ServiceCategoryTable
                  serviceId={serviceId}
                  groups={svcGroups}
                  selectedItems={selectedItems[serviceId] || {}}
                  categoryDateRanges={tableCatDateRanges}
                  additionalDateRanges={additionalDateRanges}
                  submittedData={svcSubmittedData?.categoryGroups}
                  isEditingCollectionScope={isEditingCollectionScope}
                  onToggleItem={(groupKey, itemKey) => {
                    if (isCategorySubmitted(serviceId, groupKey, itemKey)) return;
                    // Prevent un-toggling of locked items (e.g. genericAttributes on msaProfile)
                    const group = svcGroups.find((g) => g.key === groupKey);
                    const item = group?.items.find((i) => i.key === itemKey);
                    if (item?.locked) {
                      const currently = (selectedItems[serviceId]?.[groupKey] || []).includes(itemKey);
                      if (currently) return; // cannot uncheck
                    }
                    setSelectedItems((prev) => {
                      const svcItems = prev[serviceId] || {};
                      const groupItems = svcItems[groupKey] || [];
                      const idx = groupItems.indexOf(itemKey);
                      const newGroupItems =
                        idx >= 0
                          ? groupItems.filter((k) => k !== itemKey)
                          : [...groupItems, itemKey];
                      return {
                        ...prev,
                        [serviceId]: { ...svcItems, [groupKey]: newGroupItems },
                      };
                    });
                  }}
                  showDaysBackShortcut={true}
                  onApplyServiceDateRange={(start, end) => {
                    // Apply date range to all non-submitted selected items for this service
                    const newRanges = { ...categoryDateRanges };
                    Object.entries(selectedItems[serviceId] || {}).forEach(([groupKey, itemKeys]) => {
                      itemKeys.forEach((itemKey) => {
                        if (!isCategorySubmitted(serviceId, groupKey, itemKey)) {
                          newRanges[`${serviceId}:${groupKey}:${itemKey}`] = { start, end };
                        }
                      });
                    });
                    setCategoryDateRanges(newRanges);
                    // Also apply to additional jobs on submitted items
                    setAdditionalDateRanges((prev) => {
                      const next = { ...prev };
                      Object.keys(next).forEach((rangeKey) => {
                        if (rangeKey.startsWith(`${serviceId}:`)) {
                          next[rangeKey] = next[rangeKey].map(() => ({ start, end }));
                        }
                      });
                      return next;
                    });
                  }}
                  onSelectAll={() => {
                    const allItems: Record<string, string[]> = {};
                    svcGroups.forEach((group) => {
                      allItems[group.key] = group.items.map((item) => item.key);
                    });
                    setSelectedItems((prev) => ({ ...prev, [serviceId]: allItems }));
                  }}
                  onDeselectAll={() => {
                    // Keep submitted items + locked defaults, deselect only non-submitted
                    const currentGroups = selectedItems[serviceId] || {};
                    const keptGroups: Record<string, string[]> = {};
                    Object.entries(currentGroups).forEach(([groupKey, itemKeys]) => {
                      const group = svcGroups.find((g) => g.key === groupKey);
                      const kept = itemKeys.filter((itemKey) => {
                        if (isCategorySubmitted(serviceId, groupKey, itemKey)) return true;
                        const item = group?.items.find((i) => i.key === itemKey);
                        return !!item?.locked;
                      });
                      if (kept.length > 0) keptGroups[groupKey] = kept;
                    });
                    setSelectedItems((prev) => ({ ...prev, [serviceId]: keptGroups }));
                  }}
                  onDateChange={(groupKey, itemKey, field, value) =>
                    handleItemDateChange(serviceId, groupKey, itemKey, field, value)
                  }
                  onAddDateRange={(groupKey, itemKey) => {
                    const rangeKey = `${serviceId}:${groupKey}:${itemKey}`;
                    setAdditionalDateRanges((prev) => ({
                      ...prev,
                      [rangeKey]: [...(prev[rangeKey] || []), { start: "", end: "" }],
                    }));
                  }}
                  onRemoveDateRange={(groupKey, itemKey, idx) => {
                    const rangeKey = `${serviceId}:${groupKey}:${itemKey}`;
                    setAdditionalDateRanges((prev) => {
                      const updated = [...(prev[rangeKey] || [])];
                      updated.splice(idx, 1);
                      return { ...prev, [rangeKey]: updated };
                    });
                  }}
                  onUpdateAdditionalDateRange={(groupKey, itemKey, idx, field, value) => {
                    const rangeKey = `${serviceId}:${groupKey}:${itemKey}`;
                    setAdditionalDateRanges((prev) => {
                      const updated = [...(prev[rangeKey] || [])];
                      updated[idx] = { ...updated[idx], [field]: value };
                      return { ...prev, [rangeKey]: updated };
                    });
                  }}
                />
              );
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Icons live on each LensService entry in LENS_SERVICES; no separate map needed.

export function Step2ServicesConfiguration({
  identifiers,
  serviceConfig,
  onUpdateServiceConfig,
  onUpdateIdentifiers,
  announce,
  accountCheckResults,
  isEditingCollectionScope = false,
  authorizationDesiredStatus,
  authorizationStatusUpdatedAt,
  authorizationStatusUpdatedBy,
  authorizationStatusAcknowledgedAt,
  authorizationStatusAcknowledgedBy,
  onAcknowledgeAuthorizationStatus,
  onOpenResolveCaseDialog,
  caseResolved,
  onCheckAccountsForIdentifiers,
}: Step2Props) {
  const [configMode, setConfigMode] = useState<"bulk" | "individual">(
    isEditingCollectionScope ? "individual" : serviceConfig.mode
  );
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIdentifierForConfig, setSelectedIdentifierForConfig] = useState<any>(null);
  const [leReviewExpanded, setLeReviewExpanded] = useState<Set<string>>(new Set());
  const [leRequestsAccepted, setLeRequestsAccepted] = useState(false);

  // ── Reframe state ─────────────────────────────────────────────────────────
  // LE baseline snapshot — lazy-initialized from the first identifiers prop so
  // dependent useMemo derivations see non-empty data on first render.
  const [leBaseline, setLeBaseline] = useState<LEBaseline>(() =>
    identifiers && identifiers.length > 0 ? snapshotLEBaseline(identifiers) : {},
  );
  // identifierId → Set of "svcKey:groupKey:itemKey" keys removed from LE baseline
  const [removedItems, setRemovedItems] = useState<Record<string, Set<string>>>({});
  // "identifierId:svcKey:groupKey:itemKey" → reason text
  const [removalReasons, setRemovalReasons] = useState<Record<string, string>>({});
  // identifierId keys of items added via bulk action ("idId:svc:group:item")
  const [bulkTouched, setBulkTouched] = useState<Set<string>>(new Set());
  // identifierIds currently checked in the bulk action scope picker
  const [selectedIdentifierIds, setSelectedIdentifierIds] = useState<Set<string>>(new Set());

  // If identifiers prop arrives asynchronously, snapshot once it appears.
  useEffect(() => {
    if (!identifiers || identifiers.length === 0) return;
    if (Object.keys(leBaseline).length > 0) return;
    setLeBaseline(snapshotLEBaseline(identifiers));
  }, [identifiers, leBaseline]);

  // Sync forced individual mode to parent when editing collection scope
  useEffect(() => {
    if (isEditingCollectionScope && serviceConfig.mode !== "individual") {
      onUpdateServiceConfig({ ...serviceConfig, mode: "individual" });
    }
  }, [isEditingCollectionScope]);

  const toggleLeReviewRow = (id: string) => {
    const next = new Set(leReviewExpanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setLeReviewExpanded(next);
  };
  const expandAllLeReview = () => setLeReviewExpanded(new Set(identifiers.map((id: any) => id.id)));
  const collapseAllLeReview = () => setLeReviewExpanded(new Set());

  // Build Microsoft Services list from LENS_SERVICES config
  const MICROSOFT_SERVICES = LENS_SERVICES.map((svc) => ({
    id: svc.key,
    name: svc.name,
    icon: svc.icon || "📦",
  }));

  // Per-service groups via getServiceCategoryGroups (e.g. msaProfile has Subscriber Data with locked Generic Attributes)
  const AVAILABLE_GROUPS: Record<string, CategoryGroupConfig[]> =
    Object.fromEntries(LENS_SERVICES.map((svc) => [svc.key, getServiceCategoryGroups(svc.key)]));

  // Check if any identifiers have LE-requested services
  const hasLERequestedServices = identifiers.some((id) =>
    Object.values(id.services || {}).some(
      (service: any) =>
        service.enabled &&
        Object.values(service.categoryGroups || {}).some((group: any) =>
          Object.values(group).some((item: any) => item.enabled)
        )
    )
  );

  // Helper: extract LE-requested services/items for a specific identifier
  const getLEServicesForIdentifier = (
    identifier: any
  ): { services: string[]; items: ItemSelectionState } => {
    const services: string[] = [];
    const items: ItemSelectionState = {};
    Object.entries(identifier.services || {}).forEach(([serviceId, service]: [string, any]) => {
      if (service.enabled) {
        const svcItems: Record<string, string[]> = {};
        Object.entries(service.categoryGroups || {}).forEach(([groupKey, groupData]: [string, any]) => {
          const enabledItemKeys: string[] = [];
          Object.entries(groupData || {}).forEach(([itemKey, itemData]: [string, any]) => {
            if (itemData.enabled) {
              enabledItemKeys.push(itemKey);
            }
          });
          if (enabledItemKeys.length > 0) {
            svcItems[groupKey] = enabledItemKeys;
          }
        });
        if (Object.keys(svcItems).length > 0) {
          services.push(serviceId);
          items[serviceId] = svcItems;
        }
      }
    });
    return { services, items };
  };

  const handleModeChange = (mode: "bulk" | "individual") => {
    setConfigMode(mode);
    onUpdateServiceConfig({ ...serviceConfig, mode });
  };

  const handleBulkDateChange = (field: "start" | "end", value: string) => {
    onUpdateServiceConfig({
      ...serviceConfig,
      bulkSettings: {
        ...serviceConfig.bulkSettings,
        dateRange: {
          ...serviceConfig.bulkSettings.dateRange,
          [field]: value,
        },
      },
    });
  };

  const handleDaysBackChange = (endDate: string, daysBack: number) => {
    if (!endDate || !daysBack || daysBack < 1) {
      onUpdateServiceConfig({
        ...serviceConfig,
        bulkSettings: {
          ...serviceConfig.bulkSettings,
          dateRange: {
            start: "",
            end: endDate || "",
          },
          daysBack: daysBack || 0,
        },
      });
      return;
    }

    // Calculate start date by going back X days from end date
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - daysBack);

    const startFormatted = start.toISOString().split("T")[0];

    onUpdateServiceConfig({
      ...serviceConfig,
      bulkSettings: {
        ...serviceConfig.bulkSettings,
        dateRange: {
          start: startFormatted,
          end: endDate,
        },
        daysBack: daysBack,
      },
    });
  };

  // ── Reframe: derived per-identifier state + handlers ─────────────────────
  // Canonical store = serviceConfig.individualSettings[id]. Pre-populate from LE
  // baseline if empty so the unified view always renders the LE-requested tree.
  const perIdentifierServices: Record<string, string[]> = useMemo(() => {
    const out: Record<string, string[]> = {};
    identifiers.forEach((id: any) => {
      const indiv = serviceConfig.individualSettings?.[id.id];
      if (indiv && indiv.services) {
        out[id.id] = indiv.services;
      } else {
        out[id.id] = leBaseline[id.id]?.services || [];
      }
    });
    return out;
  }, [identifiers, serviceConfig.individualSettings, leBaseline]);

  const perIdentifierItems: Record<string, ItemSelectionState> = useMemo(() => {
    const out: Record<string, ItemSelectionState> = {};
    identifiers.forEach((id: any) => {
      const indiv = serviceConfig.individualSettings?.[id.id];
      if (indiv && indiv.selectedItems) {
        out[id.id] = indiv.selectedItems;
      } else {
        out[id.id] = leBaseline[id.id]?.items || {};
      }
    });
    return out;
  }, [identifiers, serviceConfig.individualSettings, leBaseline]);

  const identifierDateRanges: Record<string, { start: string; end: string }> = useMemo(() => {
    const out: Record<string, { start: string; end: string }> = {};
    identifiers.forEach((id: any) => {
      const indiv = serviceConfig.individualSettings?.[id.id];
      out[id.id] = indiv?.dateRange || serviceConfig.bulkSettings?.dateRange || { start: "", end: "" };
    });
    return out;
  }, [identifiers, serviceConfig.individualSettings, serviceConfig.bulkSettings?.dateRange]);

  const categoryDateRanges: Record<string, { start: string; end: string }> = useMemo(() => {
    const out: Record<string, { start: string; end: string }> = {};
    identifiers.forEach((id: any) => {
      const indiv = serviceConfig.individualSettings?.[id.id];
      const ranges = indiv?.categoryDateRanges || {};
      Object.entries(ranges).forEach(([innerKey, v]) => {
        out[`${id.id}:${innerKey}`] = v as { start: string; end: string };
      });
    });
    return out;
  }, [identifiers, serviceConfig.individualSettings]);

  // Per-identifier slices of additionalDateRanges (Phase 9).
  // Keyed by identifierId → { "svcKey:groupKey:itemKey" → [{start,end}, ...] }.
  const additionalDateRangesByIdentifier: Record<string, Record<string, Array<{ start: string; end: string }>>> = useMemo(() => {
    const out: Record<string, Record<string, Array<{ start: string; end: string }>>> = {};
    identifiers.forEach((id: any) => {
      const indiv = serviceConfig.individualSettings?.[id.id];
      out[id.id] = indiv?.additionalDateRanges || {};
    });
    return out;
  }, [identifiers, serviceConfig.individualSettings]);

  const writeIndividual = (
    identifierId: string,
    patch: Partial<{ services: string[]; selectedItems: ItemSelectionState; dateRange: { start: string; end: string }; categoryDateRanges: Record<string, { start: string; end: string }>; additionalDateRanges: Record<string, Array<{ start: string; end: string }>> }>,
  ) => {
    const prev = serviceConfig.individualSettings?.[identifierId] || {
      services: perIdentifierServices[identifierId] || [],
      selectedItems: perIdentifierItems[identifierId] || {},
      dateRange: identifierDateRanges[identifierId] || { start: "", end: "" },
      categoryDateRanges: {},
    };
    onUpdateServiceConfig({
      ...serviceConfig,
      mode: "individual",
      individualSettings: {
        ...(serviceConfig.individualSettings || {}),
        [identifierId]: { ...prev, ...patch },
      },
    });
  };

  // Phase 9: Handlers for managing inline "+ Add Additional Date Range"
  // entries on already-submitted rows in the per-identifier accordion view.
  const handleAddInlineDateRange = (
    identifierId: string,
    svcKey: string,
    groupKey: string,
    itemKey: string,
  ) => {
    const rangeKey = `${svcKey}:${groupKey}:${itemKey}`;
    const prev = serviceConfig.individualSettings?.[identifierId]?.additionalDateRanges || {};
    const existing = prev[rangeKey] || [];
    writeIndividual(identifierId, {
      additionalDateRanges: { ...prev, [rangeKey]: [...existing, { start: "", end: "" }] },
    });
  };

  const handleUpdateInlineAdditionalDateRange = (
    identifierId: string,
    svcKey: string,
    groupKey: string,
    itemKey: string,
    idx: number,
    field: "start" | "end",
    value: string,
  ) => {
    const rangeKey = `${svcKey}:${groupKey}:${itemKey}`;
    const prev = serviceConfig.individualSettings?.[identifierId]?.additionalDateRanges || {};
    const existing = [...(prev[rangeKey] || [])];
    existing[idx] = { ...(existing[idx] || { start: "", end: "" }), [field]: value };
    writeIndividual(identifierId, {
      additionalDateRanges: { ...prev, [rangeKey]: existing },
    });
  };

  const handleRemoveInlineDateRange = (
    identifierId: string,
    svcKey: string,
    groupKey: string,
    itemKey: string,
    idx: number,
  ) => {
    const rangeKey = `${svcKey}:${groupKey}:${itemKey}`;
    const prev = serviceConfig.individualSettings?.[identifierId]?.additionalDateRanges || {};
    const existing = [...(prev[rangeKey] || [])];
    existing.splice(idx, 1);
    writeIndividual(identifierId, {
      additionalDateRanges: { ...prev, [rangeKey]: existing },
    });
  };

  const handleToggleIdentifierSelect = (id: string, checked: boolean) => {
    setSelectedIdentifierIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedIdentifierIds(checked ? new Set(identifiers.map((id: any) => id.id)) : new Set());
  };

  const handleUpdateIdentifier = (identifierId: string, services: string[], items: ItemSelectionState) => {
    writeIndividual(identifierId, { services, selectedItems: items });
  };

  const handleUpdateIdentifierDateRange = (identifierId: string, start: string, end: string) => {
    writeIndividual(identifierId, { dateRange: { start, end } });
  };

  const handleUpdateCategoryDate = (
    identifierId: string,
    svcKey: string,
    groupKey: string,
    itemKey: string,
    field: "start" | "end",
    value: string,
  ) => {
    const innerKey = `${svcKey}:${groupKey}:${itemKey}`;
    const prev = serviceConfig.individualSettings?.[identifierId]?.categoryDateRanges || {};
    const existing = prev[innerKey] || { start: "", end: "" };
    writeIndividual(identifierId, {
      categoryDateRanges: { ...prev, [innerKey]: { ...existing, [field]: value } },
    });
  };

  const handleBulkAddServices = ({ items }: { scope: "all" | "selected"; items: Array<{ serviceKey: string; targetIds: string[]; selectedItems?: Record<string, string[]> }> }) => {
    if (items.length === 0) return;
    const updated: Record<string, any> = { ...(serviceConfig.individualSettings || {}) };
    const newBulkKeys = new Set(bulkTouched);
    let totalAdditions = 0;

    items.forEach(({ serviceKey, targetIds, selectedItems }) => {
      // Use the user's per-service picks from the Configure dialog when provided;
      // otherwise fall back to the service's defaultSelected items.
      const groups = getServiceCategoryGroups(serviceKey);
      const defaults: Record<string, string[]> = {};
      if (selectedItems && Object.keys(selectedItems).length > 0) {
        Object.entries(selectedItems).forEach(([g, keys]) => {
          if (keys.length) defaults[g] = [...keys];
        });
      } else {
        groups.forEach((g) => {
          const keys = g.items.filter((i) => i.defaultSelected).map((i) => i.key);
          if (keys.length) defaults[g.key] = keys;
        });
      }

      targetIds.forEach((id) => {
        const prev = updated[id] || {
          services: perIdentifierServices[id] || [],
          selectedItems: perIdentifierItems[id] || {},
          dateRange: identifierDateRanges[id] || { start: "", end: "" },
          categoryDateRanges: {},
        };
        if (prev.services.includes(serviceKey)) return; // already has it
        const nextServices = [...prev.services, serviceKey];
        const nextItems: ItemSelectionState = { ...prev.selectedItems };
        if (Object.keys(defaults).length) {
          nextItems[serviceKey] = Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, [...v]]));
          Object.entries(defaults).forEach(([g, keys]) => {
            keys.forEach((k) => newBulkKeys.add(`${id}:${serviceKey}:${g}:${k}`));
          });
        } else {
          nextItems[serviceKey] = nextItems[serviceKey] || {};
        }
        updated[id] = { ...prev, services: nextServices, selectedItems: nextItems };
        totalAdditions++;
      });
    });

    setBulkTouched(newBulkKeys);
    onUpdateServiceConfig({ ...serviceConfig, mode: "individual", individualSettings: updated });
    if (items.length === 1) {
      toast.success(`Added ${LENS_SERVICE_MAP[items[0].serviceKey]?.name || items[0].serviceKey} to ${totalAdditions} identifier${totalAdditions !== 1 ? "s" : ""}`);
    } else {
      toast.success(`Added ${items.length} services across ${totalAdditions} identifier additions (smart-routed by account type)`);
    }
  };

  const handleBulkSetDateRange = ({ targetIds, start, end }: { scope: "all" | "selected"; start: string; end: string; targetIds: string[] }) => {
    const updated: Record<string, any> = { ...(serviceConfig.individualSettings || {}) };
    targetIds.forEach((id) => {
      const prev = updated[id] || {
        services: perIdentifierServices[id] || [],
        selectedItems: perIdentifierItems[id] || {},
        dateRange: identifierDateRanges[id] || { start: "", end: "" },
        categoryDateRanges: {},
      };
      updated[id] = { ...prev, dateRange: { start, end } };
    });
    // Also write to bulkSettings.dateRange so the wizard's Step 2 canProceed gate
    // and handleFinish fallback both see the date.
    onUpdateServiceConfig({
      ...serviceConfig,
      mode: "individual",
      bulkSettings: { ...serviceConfig.bulkSettings, dateRange: { start, end } },
      individualSettings: updated,
    });
    toast.success(`Date range applied to ${targetIds.length} identifier${targetIds.length !== 1 ? "s" : ""}`);
  };

  const handleResetToLE = ({ targetIds }: { targetIds: string[] }) => {
    const updated: Record<string, any> = { ...(serviceConfig.individualSettings || {}) };
    targetIds.forEach((id) => {
      const base = leBaseline[id];
      if (!base) return;
      updated[id] = {
        services: [...base.services],
        selectedItems: JSON.parse(JSON.stringify(base.items)),
        dateRange: updated[id]?.dateRange || { start: "", end: "" },
        categoryDateRanges: {},
      };
    });
    setRemovedItems((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => { delete next[id]; });
      return next;
    });
    setBulkTouched((prev) => {
      const next = new Set<string>();
      prev.forEach((k) => {
        const idId = k.split(":")[0];
        if (!targetIds.includes(idId)) next.add(k);
      });
      return next;
    });
    onUpdateServiceConfig({ ...serviceConfig, mode: "individual", individualSettings: updated });
    toast.info(`Reset ${targetIds.length} identifier${targetIds.length !== 1 ? "s" : ""} to LE baseline`);
  };

  // Flatten LE baseline dates into "idId:svc:group:item" → { start, end } so
  // computeDiff can compare per-row against the user's current category dates.
  const baselineDatesFlat: Record<string, { start: string; end: string }> = useMemo(() => {
    const out: Record<string, { start: string; end: string }> = {};
    Object.entries(leBaseline).forEach(([idId, base]) => {
      Object.entries(base.categoryDates || {}).forEach(([innerKey, range]) => {
        out[`${idId}:${innerKey}`] = range;
      });
    });
    return out;
  }, [leBaseline]);

  // ── Diff stats for ChangesSummary ────────────────────────────────────────
  const diffStats = useMemo(() => {
    const currentForDiff: Record<string, ItemSelectionState> = {};
    identifiers.forEach((id: any) => { currentForDiff[id.id] = perIdentifierItems[id.id] || {}; });
    return computeDiff(
      leBaseline,
      currentForDiff,
      removedItems,
      removalReasons,
      categoryDateRanges,
      baselineDatesFlat,
    );
  }, [identifiers, perIdentifierItems, removedItems, removalReasons, categoryDateRanges, leBaseline, baselineDatesFlat]);

  const leTotals = useMemo(() => {
    let services = 0;
    let categories = 0;
    Object.values(leBaseline).forEach((b) => {
      services += b.services.length;
      Object.values(b.items).forEach((groups) => {
        Object.values(groups).forEach((arr) => { categories += arr.length; });
      });
    });
    return { services, categories };
  }, [leBaseline]);

  const currentTotals = useMemo(() => {
    let services = 0;
    let categories = 0;
    Object.values(perIdentifierItems).forEach((items) => {
      services += Object.keys(items).length;
      Object.values(items).forEach((groups) => {
        Object.values(groups).forEach((arr) => { categories += arr.length; });
      });
    });
    return { services, categories };
  }, [perIdentifierItems]);

  const identifierLabels: Record<string, string> = useMemo(() => {
    const out: Record<string, string> = {};
    identifiers.forEach((id: any) => { out[id.id] = id.value || id.id; });
    return out;
  }, [identifiers]);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-[#e1dfdd] bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#323130] mb-1">
              Services Configuration
            </h3>
            <p className="text-sm text-[#605e5c]">
              Configure Microsoft services and data categories for{" "}
              {identifiers.length} identifier{identifiers.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </Card>

      {/* Mandatory-review sub-header — replaces the previous "LE Requested
          Services Review" panel. The RS now reviews each identifier directly
          via the per-identifier split-pane below; the "Accept All LE Requests"
          shortcut has been removed because LE only ever supplies external
          service / category names that always require RS translation. */}
      <div className="p-3 bg-[#f0f9ff] border border-[#0078d4]/20 rounded-md text-sm text-[#323130] flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#0078d4] mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-sm mb-1">Review each identifier and translate the LE request into internal services</p>
          <p className="text-xs text-[#605e5c]">
            For every identifier below, confirm what LE submitted (left panel) and configure the
            internal services and data categories to fulfill (right panel). Use <b>Reject this
            identifier</b> when the legal demand cannot be processed.
          </p>
        </div>
      </div>
      {/* Legacy LE Review + Accept LE button panel intentionally deleted — see
          plan: Phase 5 of step2-redesign graduation. The full-LE-removal /
          rejection / per-identifier validation surfaces now live inside each
          IdentifierAccordion's split-pane via UnifiedIdentifiersView. */}
      {false && (
        <Card className="border-[#e1dfdd] bg-white">
        <div className="p-4 bg-[#f3f2f1] border-b border-[#e1dfdd]">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#0078d4] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[#323130] mb-1">
                    Review LE Requested Services & Data Categories
                  </h4>
                  <p className="text-xs text-[#605e5c]">
                    Review the services and data categories requested by the law enforcement agency against the attached legal demand.
                    If there are differences, use the configuration options below to modify what should be collected.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={expandAllLeReview}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-[#0078d4] px-2"
                  >
                    Expand All
                  </Button>
                  <Button
                    onClick={collapseAllLeReview}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-[#605e5c] px-2"
                  >
                    Collapse All
                  </Button>
                </div>
              </div>
              {/* Account check summary */}
              {Object.keys(accountCheckResults).length > 0 && (
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="text-[#605e5c]">Account check:</span>
                  <span className="flex items-center gap-1 text-[#107c10]">
                    <CheckCircle2 className="w-3 h-3" />
                    {Object.values(accountCheckResults).filter((r: any) => r.exists).length} found
                  </span>
                  <span className="flex items-center gap-1 text-[#d13438]">
                    <XCircle className="w-3 h-3" />
                    {Object.values(accountCheckResults).filter((r: any) => r.checked && !r.exists).length} not found
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact Table */}
        <div className="border-b border-[#e1dfdd]">
          {/* Table Header */}
          <div className="grid grid-cols-[24px_1fr_120px_100px_80px_100px_100px] gap-2 px-3 py-2 bg-[#faf9f8] border-b border-[#e1dfdd] text-xs font-medium text-[#605e5c]">
            <div></div>
            <div>Identifier</div>
            <div>Task ID</div>
            <div>Account</div>
            <div>Services</div>
            <div>Status</div>
            <div>Created By</div>
          </div>

          {/* Identifier Rows */}
          {identifiers.map((identifier) => {
            const isExpanded = leReviewExpanded.has(identifier.id);

            const leStatusMap: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
              "New": { label: "New", color: "#0078d4", bgColor: "#deecf9", borderColor: "#0078d4" },
              "InProgress": { label: "In Progress", color: "#8a6d3b", bgColor: "#fff4ce", borderColor: "#8a6d3b" },
              "Rejected": { label: "Rejected", color: "#a4262c", bgColor: "#fde7e9", borderColor: "#a4262c" },
              "Cancelled": { label: "Cancelled", color: "#605e5c", bgColor: "#f3f2f1", borderColor: "#8a8886" },
              "DisclosureNotAvailable": { label: "Disclosure Not Available", color: "#605e5c", bgColor: "#f3f2f1", borderColor: "#8a8886" },
              "Disclosed": { label: "Disclosed", color: "#107c10", bgColor: "#dff6dd", borderColor: "#107c10" },
            };
            const statusConfig = leStatusMap[identifier.taskStatus] || leStatusMap["New"];

            const acResult = accountCheckResults[identifier.id];
            const acChecked = !!acResult?.checked;
            const acFound = !!acResult?.exists;

            // Build enabled services list from new categoryGroups structure
            const enabledServices = Object.entries(identifier.services || {})
              .filter(([_, service]: [string, any]) => service.enabled)
              .map(([serviceKey, service]: [string, any]) => {
                const enabledCategories: Array<{ name: string; jobId: string }> = [];
                const svcGroups = getServiceCategoryGroups(serviceKey);
                Object.entries(service.categoryGroups || {}).forEach(([groupKey, groupData]: [string, any]) => {
                  const groupConfig = svcGroups.find((g) => g.key === groupKey);
                  const groupName = groupConfig?.name || groupKey;
                  Object.entries(groupData || {}).forEach(([itemKey, item]: [string, any]) => {
                    if (item.enabled) {
                      const itemName =
                        groupConfig?.items.find((i) => i.key === itemKey)?.name || itemKey;
                      enabledCategories.push({
                        name: `${groupName} — ${itemName}`,
                        jobId: item.taskId || "N/A",
                      });
                    }
                  });
                });
                const svcConfig = LENS_SERVICES.find((s) => s.key === serviceKey);
                return {
                  name:
                    svcConfig?.name ||
                    serviceKey
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str: string) => str.toUpperCase())
                      .trim(),
                  categories: enabledCategories,
                  hasCategories: enabledCategories.length > 0,
                };
              })
              .filter((service) => service.hasCategories);

            const totalCategories = enabledServices.reduce((sum, s) => sum + s.categories.length, 0);

            return (
              <div key={identifier.id} className="border-b border-[#e1dfdd] last:border-b-0">
                {/* Compact Row */}
                <div
                  className={cn(
                    "grid grid-cols-[24px_1fr_120px_100px_80px_100px_100px] gap-2 px-3 py-2 items-center cursor-pointer hover:bg-[#f3f2f1] transition-colors",
                    isExpanded && "bg-[#f9f9f9]"
                  )}
                  onClick={() => toggleLeReviewRow(identifier.id)}
                  role="button"
                  aria-expanded={isExpanded}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleLeReviewRow(identifier.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-center">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#605e5c]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#605e5c]" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px] flex-shrink-0 py-0 px-1.5">
                      {identifier.type}
                    </Badge>
                    <span className="text-xs font-medium text-[#323130] truncate">
                      {identifier.value}
                    </span>
                    {identifier.createdBy?.includes("Supplemental") && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 bg-[#8764b8]/10 text-[#8764b8] border-[#8764b8]/30 flex-shrink-0">
                        Supp
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs font-mono text-[#605e5c] truncate">
                    {identifier.taskId || "—"}
                  </div>
                  <div className="flex items-center gap-1">
                    {!acChecked ? (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 text-[#605e5c] border-[#c8c6c4]">
                        <Circle className="w-2.5 h-2.5 mr-0.5" />
                        N/A
                      </Badge>
                    ) : acFound ? (
                      <div className="flex items-center gap-1">
                        <Badge className="text-[10px] py-0 px-1 bg-[#dff6dd] text-[#107c10] border-[#107c10]">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                          Found
                        </Badge>
                        {acResult.accountTypes?.includes("Consumer") && (
                          <Badge className="text-[10px] py-0 px-1 bg-[#deecf9] text-[#0078d4] border-[#0078d4]">C</Badge>
                        )}
                        {acResult.accountTypes?.includes("Enterprise") && (
                          <Badge className="text-[10px] py-0 px-1 bg-[#fff9f5] text-[#ca5010] border-[#ca5010]">E</Badge>
                        )}
                      </div>
                    ) : (
                      <Badge className="text-[10px] py-0 px-1 bg-[#fde7e9] text-[#d13438] border-[#d13438]">
                        <XCircle className="w-2.5 h-2.5 mr-0.5" />
                        Not Found
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-[#605e5c]">
                    {enabledServices.length > 0 ? (
                      <span>{enabledServices.length} svc</span>
                    ) : (
                      <span className="text-[#a19f9d]">—</span>
                    )}
                  </div>
                  <div>
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1.5"
                      style={{
                        color: statusConfig.color,
                        backgroundColor: statusConfig.bgColor,
                        borderColor: statusConfig.borderColor,
                      }}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className="text-xs text-[#605e5c] truncate">
                    {identifier.createdBy || "—"}
                  </div>
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 ml-6 border-t border-[#edebe9]">
                    <div className="space-y-3">
                      {/* Account Check Details */}
                      {acChecked && acFound && (
                        <div>
                          <p className="text-xs font-medium text-[#323130] mb-1.5">Account Details</p>
                          <div className="flex gap-6 flex-wrap text-xs">
                            {acResult.consumer && (
                              <div>
                                <span className="font-medium text-[#0078d4]">Consumer</span>
                                <span className="text-[#605e5c] ml-2">
                                  Storage: <span className="text-[#323130] font-medium">{acResult.consumer.storageLocation}</span>
                                </span>
                                <span className="text-[#605e5c] ml-2">
                                  ID: <span className="text-[#323130] font-medium break-all">{acResult.consumer.primaryId}</span>
                                </span>
                              </div>
                            )}
                            {acResult.enterprise && (
                              <div>
                                <span className="font-medium text-[#ca5010]">Enterprise</span>
                                <span className="text-[#605e5c] ml-2">
                                  Storage: <span className="text-[#323130] font-medium">{acResult.enterprise.storageLocation}</span>
                                </span>
                                <span className="text-[#605e5c] ml-2">
                                  ID: <span className="text-[#323130] font-medium break-all">{acResult.enterprise.primaryId}</span>
                                </span>
                                {acResult.enterprise.organizationId && (
                                  <span className="text-[#605e5c] ml-2">
                                    Org: <span className="text-[#323130] font-medium">{acResult.enterprise.organizationId}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {acChecked && !acFound && (
                        <div className="flex items-center gap-2 text-xs text-[#d13438]">
                          <XCircle className="w-3 h-3" />
                          <span>Account not found — verification failed for this identifier</span>
                        </div>
                      )}

                      {/* LE Requested Services & Categories */}
                      <div>
                        {enabledServices.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs text-[#605e5c]">
                            <AlertCircle className="w-3 h-3" />
                            <span>No services requested by LE for this identifier</span>
                          </div>
                        ) : (
                          <div className="border border-[#edebe9] rounded overflow-hidden">
                            {/* Column Headers */}
                            <div className="grid grid-cols-[150px_1fr] gap-0 bg-[#faf9f8] border-b border-[#edebe9]">
                              <div className="px-2.5 py-1.5 text-[10px] font-medium text-[#605e5c] uppercase tracking-wide">Service</div>
                              <div className="px-2.5 py-1.5 text-[10px] font-medium text-[#605e5c] uppercase tracking-wide border-l border-[#edebe9]">Data Types</div>
                            </div>
                            {/* Service Rows */}
                            {enabledServices.map((service, serviceIdx) => (
                              <div
                                key={serviceIdx}
                                className={cn(
                                  "grid grid-cols-[150px_1fr] gap-0",
                                  serviceIdx < enabledServices.length - 1 && "border-b border-[#edebe9]"
                                )}
                              >
                                <div className="px-2.5 py-1.5 flex items-start border-r border-[#edebe9]">
                                  <span className="text-xs font-medium text-[#323130]">{service.name}</span>
                                </div>
                                <div>
                                  {service.categories.map((category, catIdx) => (
                                    <div
                                      key={catIdx}
                                      className={cn(
                                        "px-2.5 py-1 flex items-center gap-1.5 text-xs",
                                        catIdx < service.categories.length - 1 && "border-b border-[#f3f2f1]"
                                      )}
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-[#107c10] flex-shrink-0" />
                                      <span className="text-[#323130]">{category.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Accept LE Requests Action Box */}
        {hasLERequestedServices && (
          <div className="p-4 border-t border-[#e1dfdd]">
            <div className={cn(
              "rounded-lg p-4 border",
              leRequestsAccepted
                ? "bg-[#dff6dd] border-[#107c10]/30"
                : "bg-[#f0f9ff] border-[#0078d4]/30"
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className={cn("w-4 h-4", leRequestsAccepted ? "text-[#107c10]" : "text-[#0078d4]")} />
                    <h4 className="font-semibold text-[#323130] text-sm">
                      {leRequestsAccepted ? "LE-Requested Services Accepted" : "LE-Requested Services Detected"}
                    </h4>
                  </div>
                  <p className="text-xs text-[#605e5c] mb-3">
                    {leRequestsAccepted
                      ? "All LE-requested services and data categories have been accepted as the starting fulfillment plan. Choose a configuration mode below to set the data collection period, or customize per identifier."
                      : "Law enforcement has already specified services and data categories for these identifiers. Accept to use them as a starting point, or skip to manually configure services below."}
                  </p>
                  {leRequestsAccepted && (
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-[#107c10]" />
                      <span className="text-[#107c10] font-medium">
                        All LE-requested services and data categories accepted
                      </span>
                    </div>
                  )}
                </div>
                {!leRequestsAccepted ? (
                  <Button
                    onClick={() => {
                      const lePerIdentifier: Record<string, { services: string[]; items: ItemSelectionState }> = {};
                      const unionServices = new Set<string>();
                      const unionItems: ItemSelectionState = {};
                      const newIndividualSettings: Record<string, any> = {
                        ...(serviceConfig.individualSettings || {}),
                      };
                      let envelopeStart = "";
                      let envelopeEnd = "";
                      identifiers.forEach((identifier) => {
                        const leData = getLEServicesForIdentifier(identifier);
                        lePerIdentifier[identifier.id] = leData;
                        leData.services.forEach((s) => unionServices.add(s));
                        Object.entries(leData.items).forEach(([svcId, groups]) => {
                          if (!unionItems[svcId]) unionItems[svcId] = {};
                          Object.entries(groups).forEach(([groupKey, itemKeys]) => {
                            if (!unionItems[svcId][groupKey]) unionItems[svcId][groupKey] = [];
                            itemKeys.forEach((k) => {
                              if (!unionItems[svcId][groupKey].includes(k)) {
                                unionItems[svcId][groupKey].push(k);
                              }
                            });
                          });
                        });

                        // Derive per-identifier date range from the LE baseline's categoryDates
                        // (min start, max end across every LE-provided item on this identifier).
                        const baseline = leBaseline[identifier.id];
                        const categoryDateRanges: Record<string, { start: string; end: string }> = {};
                        let idStart = "";
                        let idEnd = "";
                        Object.entries(baseline?.categoryDates || {}).forEach(([key, range]) => {
                          categoryDateRanges[key] = { start: range.start, end: range.end };
                          if (!idStart || range.start < idStart) idStart = range.start;
                          if (!idEnd || range.end > idEnd) idEnd = range.end;
                        });
                        if (idStart && (!envelopeStart || idStart < envelopeStart)) envelopeStart = idStart;
                        if (idEnd && (!envelopeEnd || idEnd > envelopeEnd)) envelopeEnd = idEnd;

                        newIndividualSettings[identifier.id] = {
                          ...(newIndividualSettings[identifier.id] || {}),
                          services: leData.services,
                          selectedItems: leData.items,
                          dateRange: { start: idStart, end: idEnd },
                          categoryDateRanges,
                        };
                      });
                      onUpdateServiceConfig({
                        ...serviceConfig,
                        leAcceptedPerIdentifier: lePerIdentifier,
                        bulkSettings: {
                          ...serviceConfig.bulkSettings,
                          services: Array.from(unionServices),
                          selectedItems: unionItems,
                          dateRange: {
                            start: envelopeStart,
                            end: envelopeEnd,
                          },
                        },
                        individualSettings: newIndividualSettings,
                      });
                      setLeRequestsAccepted(true);
                      toast.success("LE-requested services and data categories have been accepted");
                      announce?.("LE-requested services and data categories have been accepted as the fulfillment plan");
                    }}
                    className="bg-[#0078d4] hover:bg-[#106ebe] text-white h-9 px-4 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept All LE Requests
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLeRequestsAccepted(false);
                      onUpdateServiceConfig({
                        ...serviceConfig,
                        leAcceptedPerIdentifier: undefined,
                        bulkSettings: {
                          ...serviceConfig.bulkSettings,
                          services: [],
                          selectedItems: {},
                        },
                        individualSettings: {},
                      });
                      toast("LE request acceptance undone");
                      announce?.("LE request acceptance has been undone");
                    }}
                    className="h-9 px-4 flex-shrink-0 text-xs text-[#605e5c] border-[#c8c6c4]"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Undo Acceptance
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        </Card>
      )}

      {/* ── LE-driven case-level cancellation banner (Phase 5c.3) ─────────── */}
      {onAcknowledgeAuthorizationStatus && (
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

      {/* ── Reframed Services Configuration ─────────────────────────────── */}
      <BulkActionsToolbar
        identifiers={identifiers}
        selectedIdentifierIds={selectedIdentifierIds}
        onToggleSelectAll={handleToggleSelectAll}
        perIdentifierItems={perIdentifierItems}
        leBaseline={leBaseline}
        onBulkAddServices={handleBulkAddServices}
        onBulkSetDateRange={handleBulkSetDateRange}
        onResetToLEBaseline={handleResetToLE}
        onCheckAccounts={
          onCheckAccountsForIdentifiers
            ? ({ targetIds }) => onCheckAccountsForIdentifiers(targetIds)
            : undefined
        }
      />

      <UnifiedIdentifiersView
        identifiers={identifiers}
        selectedIdentifierIds={selectedIdentifierIds}
        onToggleIdentifierSelect={handleToggleIdentifierSelect}
        perIdentifierItems={perIdentifierItems}
        perIdentifierServices={perIdentifierServices}
        onUpdateIdentifier={handleUpdateIdentifier}
        identifierDateRanges={identifierDateRanges}
        onUpdateDateRange={handleUpdateIdentifierDateRange}
        categoryDateRanges={categoryDateRanges}
        onUpdateCategoryDate={handleUpdateCategoryDate}
        leBaseline={leBaseline}
        bulkTouched={bulkTouched}
        isEditingCollectionScope={isEditingCollectionScope}
        additionalDateRangesByIdentifier={additionalDateRangesByIdentifier}
        onAddInlineDateRange={handleAddInlineDateRange}
        onUpdateInlineAdditionalDateRange={handleUpdateInlineAdditionalDateRange}
        onRemoveInlineDateRange={handleRemoveInlineDateRange}
        onRunCheckRequested={(identifierId) => {
          onCheckAccountsForIdentifiers?.([identifierId]);
        }}
        onAcknowledgeETSI={(identifierId) => {
          if (!onUpdateIdentifiers) return;
          const next = identifiers.map((id: any) => {
            if (id.id !== identifierId) return id;
            const target = id.etsiDesiredStatus;
            if (target !== "Cancelled" && target !== "Withdrawn") return id;
            return { ...id, taskStatus: target };
          });
          onUpdateIdentifiers(next);
        }}
        onAcknowledgeNotFound={(identifierId) => {
          if (!onUpdateIdentifiers) return;
          const next = identifiers.map((id: any) => {
            if (id.id !== identifierId) return id;
            const isNA =
              id.accountExistenceStatus === "success" &&
              id.checkAccounts?.accountType === "N/A";
            if (!isNA) return id;
            return { ...id, taskStatus: "Not Found" };
          });
          onUpdateIdentifiers(next);
        }}
        onMarkInvalid={(identifierId, reason) => {
          if (!onUpdateIdentifiers) return;
          const next = identifiers.map((id: any) => {
            if (id.id !== identifierId) return id;
            return {
              ...id,
              taskStatus: "Invalid",
              invalidReason: reason,
              invalidatedAt: new Date(),
              invalidatedBy: "Nicole Garcia",
            };
          });
          onUpdateIdentifiers(next);
        }}
        onRestoreInvalid={(identifierId) => {
          if (!onUpdateIdentifiers) return;
          const next = identifiers.map((id: any) => {
            if (id.id !== identifierId) return id;
            const {
              invalidReason: _r,
              invalidatedAt: _a,
              invalidatedBy: _b,
              ...rest
            } = id;
            return {
              ...rest,
              taskStatus: rest.taskStatus === "Invalid" ? "InProgress" : rest.taskStatus,
            };
          });
          onUpdateIdentifiers(next);
        }}
        onCommitSubstitution={(identifierId, externalName, internalKey, reason) => {
          // Phase 5b.4: append to identifier.externalSubstitutions audit AND
          // add the chosen internal service to the RS workspace selection.
          if (onUpdateIdentifiers) {
            const next = identifiers.map((id: any) => {
              if (id.id !== identifierId) return id;
              const subs = Array.isArray(id.externalSubstitutions)
                ? [...id.externalSubstitutions]
                : [];
              subs.push({
                externalName,
                substitutedInternalKey: internalKey,
                reason: reason ?? "",
                substitutedAt: new Date(),
                substitutedBy: "Nicole Garcia",
              });
              return { ...id, externalSubstitutions: subs };
            });
            onUpdateIdentifiers(next);
          }
          // Add the substituted service to the identifier's selected services.
          const currentServices = perIdentifierServices[identifierId] || [];
          const currentItems = perIdentifierItems[identifierId] || {};
          if (!currentServices.includes(internalKey)) {
            const seededItems: ItemSelectionState = { ...currentItems };
            // Seed the catalog's defaultSelected/locked items so the row has
            // sensible defaults the user can edit further.
            getServiceCategoryGroups(internalKey).forEach((group) => {
              const defaults = group.items
                .filter((i) => i.defaultSelected || i.locked)
                .map((i) => i.key);
              if (defaults.length === 0) return;
              if (!seededItems[internalKey]) seededItems[internalKey] = {};
              const existing = seededItems[internalKey][group.key] || [];
              seededItems[internalKey][group.key] = [
                ...existing,
                ...defaults.filter((k) => !existing.includes(k)),
              ];
            });
            handleUpdateIdentifier(
              identifierId,
              [...currentServices, internalKey],
              seededItems,
            );
          }
          announce?.(`Substituted "${externalName}" with internal service.`);
        }}
        onResetItemToLE={(idId, svcKey, groupKey, itemKey) => {
          // Prefer writing the LE baseline date back explicitly so the row
          // reverts regardless of what the identifier-level date is. If LE
          // didn't provide a date for this item, fall back to clearing the
          // category-level override so the row re-inherits whatever dates are
          // in play at the identifier level.
          const innerKey = `${svcKey}:${groupKey}:${itemKey}`;
          const prev = serviceConfig.individualSettings?.[idId]?.categoryDateRanges || {};
          const baseDate = getBaselineDate(leBaseline[idId], svcKey, groupKey, itemKey);
          if (baseDate && baseDate.start && baseDate.end) {
            writeIndividual(idId, {
              categoryDateRanges: { ...prev, [innerKey]: baseDate },
            });
          } else {
            const { [innerKey]: _omit, ...rest } = prev;
            writeIndividual(idId, { categoryDateRanges: rest });
          }
        }}
      />

      <ChangesSummary
        stats={diffStats}
        leTotals={leTotals}
        currentTotals={currentTotals}
        identifierLabels={identifierLabels}
      />

      {/* ── Legacy Mode Selection (hidden; retained to reduce risk during reframe) */}
      {false && (
      <>
      <Card className="border-[#e1dfdd] bg-white p-4">
        <label className="text-sm font-medium text-[#323130] mb-3 block">
          Configuration Mode
          {leRequestsAccepted && (
            <span className="ml-2 text-xs font-normal text-[#107c10]">
              (LE services accepted — choose how to set the data collection period)
            </span>
          )}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleModeChange("bulk")}
            className={cn(
              "p-4 rounded border-2 transition-all text-left",
              configMode === "bulk"
                ? "border-[#0078d4] bg-[#deecf9]"
                : "border-[#e1dfdd] bg-white hover:border-[#c8c6c4]"
            )}
          >
            <div className="flex items-start gap-3">
              <Settings
                className={cn(
                  "w-5 h-5 mt-0.5",
                  configMode === "bulk" ? "text-[#0078d4]" : "text-[#605e5c]"
                )}
              />
              <div className="flex-1">
                <p
                  className={cn(
                    "font-semibold mb-1",
                    configMode === "bulk" ? "text-[#0078d4]" : "text-[#323130]"
                  )}
                >
                  {leRequestsAccepted ? "Bulk Date Range" : "Bulk Template Configuration"}
                </p>
                <p className="text-xs text-[#605e5c]">
                  {leRequestsAccepted
                    ? "Apply the same data collection start and end dates to all accepted LE services across all identifiers"
                    : "Select services, data categories, and date range to apply to all identifiers"}
                </p>
              </div>
              {configMode === "bulk" && (
                <CheckCircle2 className="w-5 h-5 text-[#0078d4] flex-shrink-0" />
              )}
            </div>
          </button>

          <button
            onClick={() => handleModeChange("individual")}
            className={cn(
              "p-4 rounded border-2 transition-all text-left",
              configMode === "individual"
                ? "border-[#0078d4] bg-[#deecf9]"
                : "border-[#e1dfdd] bg-white hover:border-[#c8c6c4]"
            )}
          >
            <div className="flex items-start gap-3">
              <Edit2
                className={cn(
                  "w-5 h-5 mt-0.5",
                  configMode === "individual" ? "text-[#0078d4]" : "text-[#605e5c]"
                )}
              />
              <div className="flex-1">
                <p
                  className={cn(
                    "font-semibold mb-1",
                    configMode === "individual" ? "text-[#0078d4]" : "text-[#323130]"
                  )}
                >
                  Per-Identifier Advanced
                </p>
                <p className="text-xs text-[#605e5c]">
                  {leRequestsAccepted
                    ? "Configure each identifier individually — LE-accepted services are pre-selected but can be modified, and additional services can be added"
                    : "Configure services individually for each identifier from scratch"}
                </p>
              </div>
              {configMode === "individual" && (
                <CheckCircle2 className="w-5 h-5 text-[#0078d4] flex-shrink-0" />
              )}
            </div>
          </button>
        </div>
      </Card>

      {/* Bulk Configuration */}
      {configMode === "bulk" && (
        <div className="space-y-4">
          {/* LE Accepted Services Summary (when in bulk date range mode) */}
          {leRequestsAccepted && serviceConfig.leAcceptedPerIdentifier && (
            <Card className="border-[#107c10]/30 bg-[#dff6dd]/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-[#107c10]" />
                <label className="text-sm font-medium text-[#323130]">
                  LE-Accepted Services (Per-Identifier)
                </label>
                <Badge className="text-xs bg-[#107c10] text-white hover:bg-[#0e6b0e]">
                  {identifiers.length} identifiers
                </Badge>
              </div>
              <p className="text-xs text-[#605e5c] mb-3">
                Each identifier retains only its own LE-requested services and data categories.
                Set the date range below — it will be applied to all identifiers.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(serviceConfig.bulkSettings.services || []).map((serviceId: string) => {
                  const service = MICROSOFT_SERVICES.find((s) => s.id === serviceId);
                  const idCount = Object.values(serviceConfig.leAcceptedPerIdentifier).filter(
                    (d: any) => d.services?.includes(serviceId)
                  ).length;
                  return (
                    <Badge key={serviceId} variant="outline" className="text-xs bg-white border-[#107c10]/30 text-[#323130]">
                      {service?.icon} {service?.name}
                      <span className="ml-1 text-[#605e5c]">({idCount}/{identifiers.length} identifiers)</span>
                    </Badge>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Date Range */}
          <Card className="border-[#e1dfdd] bg-white p-4">
            <label className="text-sm font-medium text-[#323130] mb-1 block">
              Data Collection Period <span className="text-[#d13438]">*</span>
            </label>
            <p className="text-xs text-[#605e5c] mb-2">
              {leRequestsAccepted
                ? "Set the data collection date range. This will be applied to all accepted LE services across all identifiers."
                : "Set the date range for data collection."}
            </p>

            <div className="space-y-3">
              {/* Step 1: End Date Selection */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#323130]">
                  1. Select End Date <span className="text-[#d13438]">*</span>
                </label>
                <Input
                  type="date"
                  value={serviceConfig.bulkSettings.dateRange.end}
                  onChange={(e) => {
                    handleBulkDateChange("end", e.target.value);
                    if (serviceConfig.bulkSettings.daysBack > 0) {
                      handleDaysBackChange(e.target.value, serviceConfig.bulkSettings.daysBack);
                    }
                  }}
                  className="h-8"
                  max={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-[#605e5c]">The last date of data you want to collect</p>
              </div>

              {/* Step 2: Days Back Selection */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#323130]">
                  2. How many days back? <span className="text-[#d13438]">*</span>
                </label>
                <Input
                  type="text"
                  value={serviceConfig.bulkSettings.daysBack === "All" ? "All" : serviceConfig.bulkSettings.daysBack || ""}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === "") {
                      onUpdateServiceConfig({
                        ...serviceConfig,
                        bulkSettings: {
                          ...serviceConfig.bulkSettings,
                          daysBack: 0,
                          dateRange: {
                            start: "",
                            end: serviceConfig.bulkSettings.dateRange.end || "",
                          },
                        },
                      });
                      return;
                    }
                    if (inputValue.toLowerCase() === "all") {
                      if (serviceConfig.bulkSettings.dateRange.end) {
                        const endDate = new Date(serviceConfig.bulkSettings.dateRange.end);
                        const startDate = new Date("1990-01-01");
                        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        handleDaysBackChange(serviceConfig.bulkSettings.dateRange.end, diffDays);
                      } else {
                        onUpdateServiceConfig({
                          ...serviceConfig,
                          bulkSettings: { ...serviceConfig.bulkSettings, daysBack: "All" },
                        });
                      }
                      return;
                    }
                    const days = parseInt(inputValue);
                    if (!isNaN(days) && days > 0) {
                      if (serviceConfig.bulkSettings.dateRange.end) {
                        handleDaysBackChange(serviceConfig.bulkSettings.dateRange.end, days);
                      } else {
                        onUpdateServiceConfig({
                          ...serviceConfig,
                          bulkSettings: { ...serviceConfig.bulkSettings, daysBack: days },
                        });
                      }
                    } else {
                      onUpdateServiceConfig({
                        ...serviceConfig,
                        bulkSettings: { ...serviceConfig.bulkSettings, daysBack: inputValue },
                      });
                    }
                  }}
                  placeholder="e.g., 30, 60, 90, or 'All'"
                  className="h-8"
                  disabled={!serviceConfig.bulkSettings.dateRange.end}
                />
                <p className="text-xs text-[#605e5c]">
                  Number of days to go back from the end date (or type "All" for Jan 1, 1990)
                </p>
              </div>

              {/* Step 3: Calculated Date Range Display */}
              {serviceConfig.bulkSettings.dateRange.start && serviceConfig.bulkSettings.dateRange.end && (
                <div className="bg-[#deecf9] border border-[#0078d4] rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0078d4] flex-shrink-0" />
                    <p className="text-xs font-medium text-[#0078d4]">Date Range Configured</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 ml-[22px]">
                    <div>
                      <p className="text-xs text-[#605e5c]">Start Date</p>
                      <p className="text-sm font-semibold text-[#323130]">
                        {formatDateToMMM(serviceConfig.bulkSettings.dateRange.start)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c]">End Date</p>
                      <p className="text-sm font-semibold text-[#323130]">
                        {formatDateToMMM(serviceConfig.bulkSettings.dateRange.end)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c]">Duration</p>
                      <p className="text-sm font-semibold text-[#323130]">
                        {serviceConfig.bulkSettings.daysBack || 0} days
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Services Selection — only editable when NOT LE-accepted */}
          {!leRequestsAccepted && (
            <ServiceDropdownSelector
              label="Microsoft Services"
              services={MICROSOFT_SERVICES}
              availableGroups={AVAILABLE_GROUPS}
              selectedServices={serviceConfig.bulkSettings.services || []}
              selectedItems={serviceConfig.bulkSettings.selectedItems || {}}
              onSelectionChange={(services, items) => {
                const prevServices: string[] = serviceConfig.bulkSettings.services || [];
                const seededItems = { ...items };
                services.forEach((svcId) => {
                  if (prevServices.includes(svcId)) return;
                  getServiceCategoryGroups(svcId).forEach((group) => {
                    // Only force-include locked defaults so user unchecks of
                    // non-locked defaults stick (post-Catalog-Change-1 nearly
                    // every genericAttributes is defaultSelected without locked).
                    const defaults = group.items
                      .filter((i) => i.defaultSelected && i.locked)
                      .map((i) => i.key);
                    if (defaults.length === 0) return;
                    if (!seededItems[svcId]) seededItems[svcId] = {};
                    const existing = seededItems[svcId][group.key] || [];
                    const merged = [...existing];
                    defaults.forEach((k) => { if (!merged.includes(k)) merged.push(k); });
                    seededItems[svcId][group.key] = merged;
                  });
                });
                onUpdateServiceConfig({
                  ...serviceConfig,
                  bulkSettings: {
                    ...serviceConfig.bulkSettings,
                    services,
                    selectedItems: seededItems,
                  },
                });
              }}
              renderBody={(serviceId) => {
                const svcGroups = getServiceCategoryGroups(serviceId);
                return (
                <ServiceCategoryTable
                  serviceId={serviceId}
                  groups={svcGroups}
                  selectedItems={(serviceConfig.bulkSettings.selectedItems || {})[serviceId] || {}}
                  categoryDateRanges={{}}
                  additionalDateRanges={{}}
                  isEditingCollectionScope={false}
                  bulkDateRange={serviceConfig.bulkSettings.dateRange}
                  onToggleItem={(groupKey, itemKey) => {
                    const svcItems = (serviceConfig.bulkSettings.selectedItems || {})[serviceId] || {};
                    const groupItems = svcItems[groupKey] || [];
                    const group = svcGroups.find((g) => g.key === groupKey);
                    const item = group?.items.find((i) => i.key === itemKey);
                    // Prevent un-toggling of locked items
                    if (item?.locked && groupItems.includes(itemKey)) return;
                    const idx = groupItems.indexOf(itemKey);
                    const newGroupItems =
                      idx >= 0
                        ? groupItems.filter((k: string) => k !== itemKey)
                        : [...groupItems, itemKey];
                    onUpdateServiceConfig({
                      ...serviceConfig,
                      bulkSettings: {
                        ...serviceConfig.bulkSettings,
                        selectedItems: {
                          ...(serviceConfig.bulkSettings.selectedItems || {}),
                          [serviceId]: { ...svcItems, [groupKey]: newGroupItems },
                        },
                      },
                    });
                  }}
                  onDateChange={() => {}}
                  onAddDateRange={() => {}}
                  onRemoveDateRange={() => {}}
                  onUpdateAdditionalDateRange={() => {}}
                  onSelectAll={() => {
                    const allItems: Record<string, string[]> = {};
                    svcGroups.forEach((group) => {
                      allItems[group.key] = group.items.map((item) => item.key);
                    });
                    onUpdateServiceConfig({
                      ...serviceConfig,
                      bulkSettings: {
                        ...serviceConfig.bulkSettings,
                        selectedItems: {
                          ...(serviceConfig.bulkSettings.selectedItems || {}),
                          [serviceId]: allItems,
                        },
                      },
                    });
                  }}
                  onDeselectAll={() => {
                    onUpdateServiceConfig({
                      ...serviceConfig,
                      bulkSettings: {
                        ...serviceConfig.bulkSettings,
                        selectedItems: {
                          ...(serviceConfig.bulkSettings.selectedItems || {}),
                          [serviceId]: {},
                        },
                      },
                    });
                  }}
                />
                );
              }}
            />
          )}

          {/* Identifiers List — Per-Identifier LE Breakdown (when LE accepted) */}
          {leRequestsAccepted && serviceConfig.leAcceptedPerIdentifier && (
            <Card className="border-[#e1dfdd] bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-[#323130]">
                  Per-Identifier LE Service Assignments ({identifiers.length})
                </label>
                <Badge className="text-xs bg-[#107c10] text-white hover:bg-[#0e6b0e]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  LE Requests Preserved
                </Badge>
              </div>
              <p className="text-xs text-[#605e5c] mb-2">
                Each identifier retains only the services and data categories that LE originally requested for it. The date range above will be applied to all.
              </p>
              <div className="bg-[#fff4ce] border border-[#f7d26e] rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#8a6914] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#8a6914]">
                    Unlike a bulk template, these assignments are <span className="font-semibold">not uniform</span> — each identifier gets exactly what LE requested. To customize, switch to "Per-Identifier Advanced" mode.
                  </p>
                </div>
              </div>

              {/* Date Range Display */}
              {serviceConfig.bulkSettings.dateRange?.start && serviceConfig.bulkSettings.dateRange?.end && (
                <div className="bg-[#deecf9] border border-[#0078d4] rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0078d4] flex-shrink-0" />
                    <p className="text-xs font-medium text-[#0078d4]">Collection Period (applied to all)</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 ml-6">
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Start Date</p>
                      <p className="text-sm font-semibold text-[#323130]">
                        {formatDateToMMM(serviceConfig.bulkSettings.dateRange.start)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">End Date</p>
                      <p className="text-sm font-semibold text-[#323130]">
                        {formatDateToMMM(serviceConfig.bulkSettings.dateRange.end)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Duration</p>
                      <p className="text-sm font-semibold text-[#323130]">
                        {serviceConfig.bulkSettings.daysBack || 0} days
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {identifiers.map((identifier, index) => {
                  const leData = serviceConfig.leAcceptedPerIdentifier[identifier.id];
                  const idServices: string[] = leData?.services || [];
                  const idItems: ItemSelectionState = leData?.items || {};

                  return (
                    <div
                      key={identifier.id}
                      className="border border-[#e1dfdd] rounded p-3 bg-[#f3f2f1]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs bg-white">#{index + 1}</Badge>
                          <Badge variant="outline" className="text-xs bg-white">{identifier.type}</Badge>
                          <Badge className="text-xs bg-[#107c10] text-white hover:bg-[#0e6b0e]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {idServices.length} LE service{idServices.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="mb-2">
                          <CopyableIdentifier value={identifier.value} copyLabel="Copy identifier" className="text-sm text-[#323130]" breakAll />
                        </div>
                        {identifier.taskId && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-xs text-[#605e5c]">Task ID:</span>
                            <span className="text-xs font-mono text-[#323130]">{identifier.taskId}</span>
                          </div>
                        )}

                        {idServices.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-[#605e5c] font-medium">LE Services:</span>
                              {idServices.map((serviceId: string) => {
                                const service = MICROSOFT_SERVICES.find((s) => s.id === serviceId);
                                const itemCount = Object.values(idItems[serviceId] || {}).reduce(
                                  (s: number, keys: any) => s + keys.length,
                                  0
                                );
                                return (
                                  <TooltipProvider key={serviceId}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs bg-white border-[#107c10]/30">
                                          {service?.icon} {service?.name}
                                          {itemCount > 0 && (
                                            <span className="ml-1 text-[#107c10]">({itemCount})</span>
                                          )}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="space-y-1">
                                          <p className="font-medium text-xs">{service?.name}</p>
                                          {itemCount > 0 && (
                                            <>
                                              <p className="text-xs text-[#605e5c]">
                                                {itemCount} data {itemCount === 1 ? "category" : "categories"}:
                                              </p>
                                              {Object.entries(idItems[serviceId] || {}).flatMap(([groupKey, itemKeys]) => {
                                                const groupConfig = getServiceCategoryGroups(serviceId).find((g) => g.key === groupKey);
                                                return (itemKeys as string[]).map((itemKey) => {
                                                  const itemName =
                                                    groupConfig?.items.find((i) => i.key === itemKey)?.name || itemKey;
                                                  return (
                                                    <p key={`${groupKey}:${itemKey}`} className="text-xs text-[#605e5c] ml-2">
                                                      • {itemName}
                                                    </p>
                                                  );
                                                });
                                              })}
                                            </>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[#a19f9d] italic mt-1">No LE-requested services for this identifier</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Identifiers List with Bulk Configuration Applied (when NOT LE accepted) */}
          {!leRequestsAccepted && (serviceConfig.bulkSettings.services || []).length > 0 && (
            <Card className="border-[#e1dfdd] bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-[#323130]">
                  Identifiers ({identifiers.length})
                </label>
                <Badge className="text-xs bg-[#107c10] text-white hover:bg-[#0e6b0e]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Bulk Template Applied
                </Badge>
              </div>
              <p className="text-xs text-[#605e5c] mb-4">
                The selected services and data categories will be applied to all identifiers below
              </p>

              {serviceConfig.bulkSettings.dateRange?.start && serviceConfig.bulkSettings.dateRange?.end && (
                <div className="bg-[#deecf9] border border-[#0078d4] rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0078d4] flex-shrink-0" />
                    <p className="text-xs font-medium text-[#0078d4]">Collection Period</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 ml-6">
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Start Date</p>
                      <p className="text-sm font-semibold text-[#323130]">
                        {formatDateToMMM(serviceConfig.bulkSettings.dateRange.start)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">End Date</p>
                      <p className="text-sm font-semibold text-[#323130]">
                        {formatDateToMMM(serviceConfig.bulkSettings.dateRange.end)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Duration</p>
                      <p className="text-sm font-semibold text-[#323130]">
                        {serviceConfig.bulkSettings.daysBack || 0} days
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {identifiers.map((identifier, index) => {
                  const bulkItems: ItemSelectionState = serviceConfig.bulkSettings.selectedItems || {};
                  const totalItems = Object.values(bulkItems).reduce(
                    (sum: number, groups: any) =>
                      sum + Object.values(groups).reduce((s: number, keys: any) => s + keys.length, 0),
                    0
                  );

                  return (
                    <div key={identifier.id} className="border border-[#e1dfdd] rounded p-3 bg-[#f3f2f1]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs bg-white">#{index + 1}</Badge>
                          <Badge variant="outline" className="text-xs bg-white">{identifier.type}</Badge>
                          <Badge className="text-xs bg-[#107c10] text-white hover:bg-[#0e6b0e]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Configured
                          </Badge>
                        </div>
                        <div className="mb-2">
                          <CopyableIdentifier value={identifier.value} copyLabel="Copy identifier" className="text-sm text-[#323130]" breakAll />
                        </div>

                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[#605e5c] font-medium">Services:</span>
                            {(serviceConfig.bulkSettings.services || []).map((serviceId: string) => {
                              const service = MICROSOFT_SERVICES.find((s) => s.id === serviceId);
                              const svcItems = bulkItems[serviceId] || {};
                              const itemCount = Object.values(svcItems).reduce(
                                (s: number, keys: any) => s + keys.length, 0
                              );
                              return (
                                <TooltipProvider key={serviceId}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-xs bg-white">
                                        {service?.icon} {service?.name}
                                        {itemCount > 0 && (
                                          <span className="ml-1 text-[#0078d4]">({itemCount})</span>
                                        )}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        <p className="font-medium text-xs">{service?.name}</p>
                                        {itemCount > 0 && (
                                          <p className="text-xs text-[#605e5c]">
                                            {itemCount} data {itemCount === 1 ? "category" : "categories"} selected
                                          </p>
                                        )}
                                        {serviceConfig.bulkSettings.dateRange?.start && (
                                          <p className="text-xs text-[#605e5c]">
                                            {serviceConfig.bulkSettings.dateRange.start} to {serviceConfig.bulkSettings.dateRange.end || "present"}
                                          </p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Individual Configuration */}
      {configMode === "individual" && (
        <Card className="border-[#e1dfdd] bg-white p-4">
          {leRequestsAccepted && (
            <div className="bg-[#dff6dd] border border-[#107c10]/30 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#107c10]" />
                <span className="text-xs font-medium text-[#107c10]">
                  LE-accepted services will be pre-selected when you configure each identifier
                </span>
              </div>
              <p className="text-xs text-[#605e5c] ml-6">
                Click "Configure" on each identifier to review, modify, or add to the pre-selected services. Setting a date range is required for each.
              </p>
            </div>
          )}
          <p className="text-sm text-[#605e5c] mb-4">
            {leRequestsAccepted
              ? "Configure services for each identifier individually. LE-accepted services are pre-loaded — you can modify selections and set date ranges."
              : "Configure services for each identifier individually from scratch."}
          </p>

          <div className="space-y-3">
            {identifiers.map((identifier, index) => {
              const individualConfig = serviceConfig.individualSettings?.[identifier.id];
              const hasConfiguration = individualConfig && individualConfig.services?.length > 0;
              const identifierLEServices = getLEServicesForIdentifier(identifier);
              const hasLEServices = identifierLEServices.services.length > 0;

              return (
                <div key={identifier.id} className="border border-[#e1dfdd] rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                        <Badge variant="outline" className="text-xs">{identifier.type}</Badge>
                        {leRequestsAccepted && hasLEServices && !hasConfiguration && (
                          <Badge variant="outline" className="text-xs bg-[#dff6dd] text-[#107c10] border-[#107c10]/30">
                            <ClipboardList className="w-3 h-3 mr-1" />
                            {identifierLEServices.services.length} LE services ready
                          </Badge>
                        )}
                        {hasConfiguration && (
                          <Badge className="text-xs bg-[#107c10] text-white hover:bg-[#0e6b0e]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Configured
                          </Badge>
                        )}
                      </div>
                      <div className="mb-2">
                        <CopyableIdentifier value={identifier.value} copyLabel="Copy identifier" className="text-sm text-[#323130]" breakAll />
                      </div>

                      {/* Display configured services */}
                      {hasConfiguration && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[#605e5c] font-medium">Services:</span>
                            {individualConfig.services.map((serviceId: string) => {
                              const service = MICROSOFT_SERVICES.find((s) => s.id === serviceId);
                              const svcItems = individualConfig.selectedItems?.[serviceId] || {};
                              const itemCount = Object.values(svcItems).reduce(
                                (s: number, keys: any) => s + keys.length,
                                0
                              );
                              return (
                                <TooltipProvider key={serviceId}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-xs">
                                        {service?.icon} {service?.name}
                                        {itemCount > 0 && (
                                          <span className="ml-1 text-[#0078d4]">({itemCount})</span>
                                        )}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        <p className="font-medium text-xs">{service?.name}</p>
                                        {itemCount > 0 && (
                                          <p className="text-xs text-[#605e5c]">
                                            {itemCount} data {itemCount === 1 ? "category" : "categories"} selected
                                          </p>
                                        )}
                                        {individualConfig.dateRanges?.[serviceId]?.start && (
                                          <p className="text-xs text-[#605e5c]">
                                            {individualConfig.dateRanges[serviceId].start} to{" "}
                                            {individualConfig.dateRanges[serviceId].end || "present"}
                                          </p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 h-7 text-xs"
                      onClick={() => {
                        setSelectedIdentifierForConfig(identifier);
                        setConfigDialogOpen(true);
                      }}
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      {hasConfiguration ? "Edit" : "Configure"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      </>
      )}

      {/* Individual Configuration Dialog */}
      <IndividualServiceConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        identifier={selectedIdentifierForConfig}
        services={MICROSOFT_SERVICES}
        existingConfig={
          selectedIdentifierForConfig
            ? serviceConfig.individualSettings?.[selectedIdentifierForConfig.id]
            : undefined
        }
        announce={announce}
        leRequestsAccepted={leRequestsAccepted}
        leServicesForIdentifier={
          selectedIdentifierForConfig
            ? getLEServicesForIdentifier(selectedIdentifierForConfig)
            : undefined
        }
        isEditingCollectionScope={isEditingCollectionScope}
        submittedCollectionData={
          isEditingCollectionScope && selectedIdentifierForConfig
            ? {
                services: Object.fromEntries(
                  Object.entries(selectedIdentifierForConfig.services || {}).map(
                    ([key, svc]: [string, any]) => [
                      key,
                      {
                        enabled: svc.enabled,
                        categoryGroups: Object.fromEntries(
                          Object.entries(svc.categoryGroups || {}).map(
                            ([groupKey, groupData]: [string, any]) => [
                              groupKey,
                              Object.fromEntries(
                                Object.entries(groupData || {}).map(
                                  ([itemKey, item]: [string, any]) => [
                                    itemKey,
                                    {
                                      enabled: item.enabled,
                                      collectionStatus: item.collectionStatus,
                                      startDate: item.startDate,
                                      endDate: item.endDate,
                                      jobId: item.jobId,
                                    },
                                  ]
                                )
                              ),
                            ]
                          )
                        ),
                      },
                    ]
                  )
                ),
              }
            : undefined
        }
        onSave={(config) => {
          onUpdateServiceConfig({
            ...serviceConfig,
            individualSettings: {
              ...serviceConfig.individualSettings,
              [selectedIdentifierForConfig.id]: config,
            },
          });
        }}
      />
    </div>
  );
}
