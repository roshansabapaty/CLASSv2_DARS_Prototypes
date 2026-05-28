import React, { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ETSIDesiredStatusChip } from "./fulfillment-wizard/ETSIDesiredStatusChip";
import { Separator } from "./ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { MICROSOFT_SERVICES_CONFIG, getServiceDisplayName } from "../config/microsoftServices";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  User,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Calendar,
  Settings,
  MapPin,
  Globe,
  Search,
  Loader2,
  Shield,
  UserPlus,
  Link2,
} from "lucide-react";
import { cn } from "./ui/utils";
import { CopyableIdentifier } from "./CopyableIdentifier";
import { toast } from "sonner@2.0.3";

interface CompactIdentifierListProps {
  identifiers: any[];
  identifierDisplayData: any;
  identifierSummaryStats: any;
  onOpenPanel: () => void;
  onOpenFulfillmentWizard?: () => void;
  onBulkUpdateDateRange?: (startDate: string, endDate: string) => void;
  onBulkUpdateDataCenterLocation?: (location: string) => void;
  /** Callback to persist storage region changes for a specific identifier+service */
  onUpdateStorageRegion?: (identifierId: string, serviceId: string, region: string) => void;
  /** Callback to persist storage region changes for ALL services of an identifier */
  onApplyAllStorageRegions?: (identifierId: string, region: string) => void;
  /** Trigger re-check of account existence */
  onReCheckAccounts?: () => void;
  /** Whether account existence check is in progress */
  checkingExistence?: boolean;
  /** Announcer for aria-live region */
  announce?: (message: string) => void;
  /** Current case stage for conditional column visibility */
  caseStage?: string;
}

export function CompactIdentifierList({
  identifiers,
  identifierDisplayData,
  identifierSummaryStats,
  onOpenPanel,
  onOpenFulfillmentWizard,
  onBulkUpdateDateRange,
  onBulkUpdateDataCenterLocation,
  onUpdateStorageRegion,
  onApplyAllStorageRegions,
  onReCheckAccounts,
  checkingExistence = false,
  announce,
  caseStage,
}: CompactIdentifierListProps) {
  const [expandedIdentifiers, setExpandedIdentifiers] = useState<Set<string>>(new Set());
  const prefersReducedMotion = usePrefersReducedMotion();

  // Whether to hide the Content Boundary column (hidden during Triage)
  const isTriageStage = caseStage === "Waiting on Triage";

  // Refs for focus management
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Check if any identifier has fulfillment plan
  const hasFulfillmentPlan = identifiers.some((id) => id.fulfillmentPlan);

  // Check if any identifiers have been verified
  const hasVerifiedIdentifiers = identifiers.some((id) => id.accountExistenceStatus === "success");

  // Group identifiers by existence
  const verifiedCount = identifierSummaryStats.accountsFound;
  const notFoundCount = identifierSummaryStats.accountsNotFound;
  const pendingCount = identifierSummaryStats.accountsNotChecked;

  // Initialize expanded state for identifiers with fulfillment plans
  useEffect(() => {
    if (hasFulfillmentPlan) {
      const allIds = new Set(identifiers.filter(id => id.fulfillmentPlan).map(id => id.id));
      setExpandedIdentifiers(allIds);
    }
  }, [hasFulfillmentPlan, identifiers.length]);

  const toggleIdentifier = useCallback((identifierId: string) => {
    setExpandedIdentifiers((prev) => {
      const newExpanded = new Set(prev);
      const willExpand = !newExpanded.has(identifierId);
      if (willExpand) {
        newExpanded.add(identifierId);
      } else {
        newExpanded.delete(identifierId);
      }

      // Focus management: move focus into the detail panel when expanding
      if (willExpand) {
        requestAnimationFrame(() => {
          const detailEl = detailRefs.current[identifierId];
          if (detailEl) {
            detailEl.focus({ preventScroll: false });
          }
        });
        const identifier = identifiers.find(id => id.id === identifierId);
        if (identifier && announce) {
          announce(`Expanded details for ${identifier.type}: ${identifier.value}`);
        }
      } else {
        if (announce) {
          const identifier = identifiers.find(id => id.id === identifierId);
          if (identifier) {
            announce(`Collapsed details for ${identifier.type}: ${identifier.value}`);
          }
        }
      }

      return newExpanded;
    });
  }, [identifiers, announce]);

  const expandAll = useCallback(() => {
    setExpandedIdentifiers(new Set(identifiers.map(id => id.id)));
    announce?.(`Expanded all ${identifiers.length} identifiers`);
  }, [identifiers, announce]);

  const collapseAll = useCallback(() => {
    setExpandedIdentifiers(new Set());
    announce?.(`Collapsed all identifiers`);
  }, [announce]);

  const allExpanded = identifiers.length > 0 && expandedIdentifiers.size === identifiers.length;

  // Get enabled services for an identifier
  const getEnabledServices = (identifier: any): string[] => {
    if (identifier.fulfillmentPlan?.services) {
      return Object.keys(identifier.fulfillmentPlan.services);
    }
    return Object.keys(identifier.services).filter(
      (key) => identifier.services[key]?.enabled
    );
  };

  // Get data categories for an identifier's service
  const getDataCategories = (identifier: any, serviceId: string): string[] => {
    if (identifier.fulfillmentPlan?.services?.[serviceId]?.dataCategories) {
      return identifier.fulfillmentPlan.services[serviceId].dataCategories;
    }
    return [];
  };

  // Get storage location for a service
  const getStorageLocation = (identifier: any, serviceId: string): string => {
    if (identifier.fulfillmentPlan?.services?.[serviceId]?.dataCenterLocation) {
      return identifier.fulfillmentPlan.services[serviceId].dataCenterLocation;
    }
    const service = identifier.services[serviceId];
    if (service?.accountExistence?.consumerStorageLocation) {
      return service.accountExistence.consumerStorageLocation;
    }
    if (service?.accountExistence?.enterpriseStorageLocation) {
      return service.accountExistence.enterpriseStorageLocation;
    }
    return "";
  };

  // Not found identifiers
  const notFoundIdentifiers = identifiers.filter(
    (id) => id.accountExistenceStatus === "not-found" ||
    (id.accountExistenceStatus === "success" && !identifierDisplayData[id.id]?.exists)
  );

  // Generate service labels from shared config
  const SERVICE_LABELS: Record<string, string> = Object.entries(MICROSOFT_SERVICES_CONFIG).reduce((acc, [key, service]) => {
    acc[key] = key === 'xbox' ? 'XBOX' : service.name;
    return acc;
  }, {} as Record<string, string>);

  const STORAGE_REGIONS = [
    "united-states", "europe", "united-kingdom",
    "asia-pacific", "brazil", "india",
    "canada", "france", "switzerland", "mexico",
  ];

  // Handle apply-all storage region for an identifier
  const handleApplyAllRegion = (identifier: any, region: string) => {
    const services = getEnabledServices(identifier);
    if (onApplyAllStorageRegions) {
      onApplyAllStorageRegions(identifier.id, region);
    } else if (onUpdateStorageRegion) {
      // Fallback: update each service individually
      services.forEach((serviceId) => {
        onUpdateStorageRegion(identifier.id, serviceId, region);
      });
    }
    toast.success(`Applied ${region} to all ${services.length} services`);
    announce?.(`Applied storage region ${region} to all ${services.length} services for ${identifier.value}`);
  };

  // Handle individual service storage region change
  const handleServiceRegionChange = (identifierId: string, serviceId: string, region: string) => {
    if (onUpdateStorageRegion) {
      onUpdateStorageRegion(identifierId, serviceId, region);
    }
    const serviceName = SERVICE_LABELS[serviceId] || getServiceDisplayName(serviceId);
    toast.success(`Set ${serviceName} storage region to ${region}`);
    announce?.(`Set storage region for ${serviceName} to ${region}`);
  };

  // Handle re-check
  const handleReCheck = () => {
    if (onReCheckAccounts) {
      onReCheckAccounts();
      announce?.("Re-checking account existence for all identifiers");
    }
  };

  // ─── Source classification ──────────────────────────────────────────
  const getSourceType = (identifier: any): "le" | "user" | "supplemental" => {
    const cb = identifier.createdBy || "";
    if (cb === "LE Agency") return "le";
    if (cb.startsWith("Supplemental")) return "supplemental";
    return "user";
  };

  const sourceCountLE = identifiers.filter((id) => getSourceType(id) === "le").length;
  const sourceCountUser = identifiers.filter((id) => getSourceType(id) === "user").length;
  const sourceCountSupplemental = identifiers.filter((id) => getSourceType(id) === "supplemental").length;

  // Determine which source types are present (for legend visibility)
  const hasMultipleSources = [sourceCountLE > 0, sourceCountUser > 0, sourceCountSupplemental > 0].filter(Boolean).length > 1;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Compact Inline Stats — mirrors wizard detailed view */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-[#605e5c]">{identifiers.length} identifier{identifiers.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Re-check Accounts button */}
            {onReCheckAccounts && hasVerifiedIdentifiers && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReCheck}
                disabled={checkingExistence}
                className="gap-1.5 h-7 text-xs"
                aria-label="Re-check account existence for all identifiers"
              >
                {checkingExistence ? (
                  <>
                    <Loader2 className={cn("w-3 h-3", !prefersReducedMotion && "animate-spin")} />
                    Checking…
                  </>
                ) : (
                  <>
                    <Search className="w-3 h-3" />
                    Re-check
                  </>
                )}
              </Button>
            )}
            {hasFulfillmentPlan && onOpenFulfillmentWizard && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenFulfillmentWizard}
                className="gap-1.5 h-7 text-xs"
              >
                <Settings className="w-3 h-3" />
                Edit Config
              </Button>
            )}
            {identifiers.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  (allExpanded ? collapseAll : expandAll)();
                }}
                className="gap-1.5 h-7 text-xs"
                aria-label={allExpanded ? "Collapse all identifier rows" : "Expand all identifier rows"}
              >
                {allExpanded ? (
                  <>
                    <ChevronsUp className="w-3 h-3" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronsDown className="w-3 h-3" />
                    Expand
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Table-like header row — mirrors wizard grid */}
        <div
          className={cn(
            "gap-2 px-3 py-1.5 bg-[#faf9f8] border border-[#edebe9] rounded-t text-xs text-[#605e5c] font-medium grid",
            isTriageStage
              ? "grid-cols-[minmax(0,2fr)_80px_100px_72px]"
              : "grid-cols-[minmax(0,2fr)_80px_100px_72px_minmax(0,1.2fr)]"
          )}
          role="row"
        >
          <div role="columnheader" id="col-identifier">Identifier</div>
          <div role="columnheader" id="col-status">Account Status</div>
          <div role="columnheader" id="col-account">Account</div>
          <div role="columnheader" id="col-services" className="text-center">Services</div>
          {!isTriageStage && <div role="columnheader" id="col-region">Content Boundary</div>}
        </div>

        {/* Identifier rows */}
        <div
          ref={tableContainerRef}
          className="border border-[#edebe9] border-t-0 rounded-b divide-y divide-[#edebe9] -mt-3"
          role="table"
          aria-label="Identifier list with account verification status and service configuration"
        >
          {identifiers.map((identifier) => {
            const displayData = identifierDisplayData[identifier.id];
            const isExpanded = expandedIdentifiers.has(identifier.id);
            const services = getEnabledServices(identifier);
            const accountTypes = displayData?.accountTypes || [];
            const hasConsumer = accountTypes.includes("Consumer");
            const hasEnterprise = accountTypes.includes("Enterprise");

            const isVerified = identifier.accountExistenceStatus === "success" && displayData?.exists;
            const isNotFound =
              identifier.accountExistenceStatus === "not-found" ||
              (identifier.accountExistenceStatus === "success" && !displayData?.exists);
            const isPending =
              !identifier.accountExistenceStatus ||
              identifier.accountExistenceStatus === "not-checked" ||
              identifier.accountExistenceStatus === "unknown";

            // Count how many services have a storage location set
            const locationsSet = services.filter(
              (s) => getStorageLocation(identifier, s)
            ).length;

            return (
              <div key={identifier.id} role="rowgroup">
                {/* Primary compact row */}
                <div
                  className={cn(
                    "gap-2 items-center px-3 py-2 hover:bg-[#faf9f8] grid",
                    isTriageStage
                      ? "grid-cols-[minmax(0,2fr)_80px_100px_72px]"
                      : "grid-cols-[minmax(0,2fr)_80px_100px_72px_minmax(0,1.2fr)]",
                    !prefersReducedMotion && "transition-colors",
                    isExpanded && "bg-[#f3f2f1]",
                    // Source-based left border accent
                    getSourceType(identifier) === "le" && "border-l-[3px] border-l-[#0078d4]",
                    getSourceType(identifier) === "user" && "border-l-[3px] border-l-[#8764b8]",
                    getSourceType(identifier) === "supplemental" && "border-l-[3px] border-l-[#ca5010]"
                  )}
                  role="row"
                >
                  {/* Identifier */}
                  <button
                    onClick={() => toggleIdentifier(identifier.id)}
                    className="flex items-center gap-2 text-left min-w-0"
                    aria-expanded={isExpanded}
                    aria-controls={`detail-${identifier.id}`}
                    aria-label={`${identifier.type}: ${identifier.value}, source: ${getSourceType(identifier) === "le" ? "LE Request" : getSourceType(identifier) === "supplemental" ? "Supplemental" : "User Added"}, ${isExpanded ? "collapse" : "expand"} details`}
                    aria-describedby="col-identifier"
                  >
                    <div
                      className={cn(
                        "flex-shrink-0",
                        !prefersReducedMotion && "transition-transform",
                        isExpanded && "rotate-90"
                      )}
                      aria-hidden="true"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-[#605e5c]" />
                    </div>
                    {/* Source origin indicator */}
                    {(() => {
                      const src = getSourceType(identifier);
                      if (src === "le") return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#deecf9] flex items-center justify-center" aria-label="LE Request">
                              <Shield className="w-2.5 h-2.5 text-[#0078d4]" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Created by <span className="font-medium">LE Agency</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                      if (src === "supplemental") return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#fff9f5] flex items-center justify-center border border-[#ca5010]/30" aria-label="Supplemental">
                              <Link2 className="w-2.5 h-2.5 text-[#ca5010]" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Created by <span className="font-medium">{identifier.createdBy || "Supplemental"}</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#8764b8]/10 flex items-center justify-center" aria-label="User Added">
                              <UserPlus className="w-2.5 h-2.5 text-[#8764b8]" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Created by <span className="font-medium">{identifier.createdBy || "analyst"}</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })()}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                      {identifier.type}
                    </Badge>
                    <span className="text-xs text-[#323130] truncate">
                      {identifier.value}
                    </span>
                    <ETSIDesiredStatusChip status={identifier.etsiDesiredStatus} size="extra-small" />
                  </button>

                  {/* Status */}
                  <div role="cell" aria-describedby="col-status">
                    {isVerified ? (
                      <Badge className="text-[10px] px-1.5 py-0 bg-[#dff6dd] text-[#107c10] border-[#107c10]" aria-label="Account found">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                        Found
                      </Badge>
                    ) : isNotFound ? (
                      <Badge className="text-[10px] px-1.5 py-0 bg-[#fde7e9] text-[#d13438] border-[#d13438]" aria-label="Account not found">
                        <XCircle className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                        Not Found
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0" aria-label="Account check pending">
                        Pending
                      </Badge>
                    )}
                  </div>

                  {/* Account Types */}
                  <div className="flex items-center gap-1" role="cell" aria-describedby="col-account">
                    {isVerified && accountTypes.length > 0 ? (
                      <>
                        {hasConsumer && (
                          <Badge className="text-[10px] px-1 py-0 bg-[#deecf9] text-[#0078d4] border-[#0078d4]" aria-label="Consumer account">
                            <User className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                            <span aria-hidden="true">C</span>
                            <span className="sr-only">Consumer</span>
                          </Badge>
                        )}
                        {hasEnterprise && (
                          <Badge className="text-[10px] px-1 py-0 bg-[#fff9f5] text-[#ca5010] border-[#ca5010]" aria-label="Enterprise account">
                            <Building className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                            <span aria-hidden="true">E</span>
                            <span className="sr-only">Enterprise</span>
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-[#a19f9d]" aria-label="No account type">—</span>
                    )}
                  </div>

                  {/* Services count */}
                  <div className="text-center" role="cell" aria-describedby="col-services">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-[#8764b8] text-[#8764b8]"
                      aria-label={`${services.length} service${services.length !== 1 ? "s" : ""}`}
                    >
                      {services.length}
                    </Badge>
                  </div>

                  {/* Storage Region — Apply-all shortcut */}
                  {!isTriageStage && <div onClick={(e) => e.stopPropagation()} role="cell" aria-describedby="col-region">
                    {services.length > 0 && isVerified ? (
                      <div className="flex items-center gap-1.5">
                        <Select
                          value=""
                          onValueChange={(value) => handleApplyAllRegion(identifier, value)}
                        >
                          <SelectTrigger
                            className="h-7 text-xs bg-white border-[#c8c6c4] flex-1 min-w-0"
                            aria-label={`Apply storage location to all ${services.length} services for ${identifier.value}`}
                          >
                            <SelectValue placeholder="Apply all..." />
                          </SelectTrigger>
                          <SelectContent>
                            {STORAGE_REGIONS.map((region) => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {locationsSet > 0 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 flex-shrink-0 whitespace-nowrap"
                                aria-label={`${locationsSet} of ${services.length} storage locations set`}
                              >
                                {locationsSet}/{services.length}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {locationsSet} of {services.length} services have a content boundary set
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#a19f9d]" aria-label="Not applicable">—</span>
                    )}
                  </div>}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    id={`detail-${identifier.id}`}
                    ref={(el) => { detailRefs.current[identifier.id] = el; }}
                    className="px-3 py-2 bg-white border-t border-[#f3f2f1]"
                    tabIndex={-1}
                    role="region"
                    aria-label={`Details for ${identifier.type}: ${identifier.value}`}
                  >
                    {/* Compact account information — Storage Location, Primary ID, Related Identifiers */}
                    {isVerified && (
                      <div className="mb-2 space-y-1.5">
                        {hasConsumer && (
                          <div className="flex items-start gap-2 text-xs bg-[#deecf9]/50 border border-[#b4d6fa] rounded px-2.5 py-1.5">
                            <User className="w-3.5 h-3.5 text-[#0078d4] flex-shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="flex items-center gap-3 flex-wrap min-w-0 text-[#323130]">
                              <span className="font-medium text-[#0078d4] flex-shrink-0">Consumer</span>
                              {displayData?.consumer?.storageLocation && (
                                <span className="text-[#605e5c]">
                                  Location: <span className="text-[#323130] font-medium">{displayData.consumer.storageLocation}</span>
                                </span>
                              )}
                              {displayData?.consumer?.primaryId && (
                                <span className="text-[#605e5c]">
                                  ID: <CopyableIdentifier value={displayData.consumer.primaryId} copyLabel="Copy consumer primary ID" className="text-[#323130]" breakAll />
                                </span>
                              )}
                              {displayData?.consumer?.relatedIdentifiers?.length > 0 && (
                                <span className="text-[#605e5c]">
                                  Related: <CopyableIdentifier value={displayData.consumer.relatedIdentifiers.join(", ")} copyLabel="Copy related identifiers" className="text-[#323130]" />
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {hasEnterprise && (
                          <div className="flex items-start gap-2 text-xs bg-[#fff9f5]/50 border border-[#f7d7b4] rounded px-2.5 py-1.5">
                            <Building className="w-3.5 h-3.5 text-[#ca5010] flex-shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="flex items-center gap-3 flex-wrap min-w-0 text-[#323130]">
                              <span className="font-medium text-[#ca5010] flex-shrink-0">Enterprise</span>
                              {displayData?.enterprise?.storageLocation && (
                                <span className="text-[#605e5c]">
                                  Location: <span className="text-[#323130] font-medium">{displayData.enterprise.storageLocation}</span>
                                </span>
                              )}
                              {displayData?.enterprise?.primaryId && (
                                <span className="text-[#605e5c]">
                                  ID: <CopyableIdentifier value={displayData.enterprise.primaryId} copyLabel="Copy enterprise primary ID" className="text-[#323130]" breakAll />
                                </span>
                              )}
                              {displayData?.enterprise?.organizationId && (
                                <span className="text-[#605e5c]">
                                  Org: <CopyableIdentifier value={displayData.enterprise.organizationId} copyLabel="Copy organization ID" className="text-[#323130]" />
                                </span>
                              )}
                              {displayData?.enterprise?.relatedIdentifiers?.length > 0 && (
                                <span className="text-[#605e5c]">
                                  Related: <CopyableIdentifier value={displayData.enterprise.relatedIdentifiers.join(", ")} copyLabel="Copy related identifiers" className="text-[#323130]" />
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Services table */}
                    {services.length > 0 ? (
                      <Table
                        className="text-xs"
                        aria-label={`Service configuration for ${identifier.value}`}
                      >
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead scope="col" className="h-7 text-[10px] text-[#605e5c] font-medium px-2">Service</TableHead>
                            <TableHead scope="col" className="h-7 text-[10px] text-[#605e5c] font-medium px-2 w-[200px]">Content Boundary</TableHead>
                            <TableHead scope="col" className="h-7 text-[10px] text-[#605e5c] font-medium px-2 w-[140px]">Categories</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {services.map((serviceId) => {
                            const cats = getDataCategories(identifier, serviceId);
                            const storageLocation = getStorageLocation(identifier, serviceId);
                            return (
                              <TableRow key={serviceId} className="hover:bg-[#faf9f8]">
                                <TableCell className="py-1.5 px-2 text-xs text-[#323130]">
                                  <div className="flex items-center gap-1.5">
                                    <Globe className="w-3 h-3 text-[#8764b8] flex-shrink-0" aria-hidden="true" />
                                    {SERVICE_LABELS[serviceId] || getServiceDisplayName(serviceId)}
                                  </div>
                                </TableCell>
                                <TableCell className="py-1.5 px-2">
                                  {onUpdateStorageRegion ? (
                                    <Select
                                      value={storageLocation || ""}
                                      onValueChange={(value) => handleServiceRegionChange(identifier.id, serviceId, value)}
                                    >
                                      <SelectTrigger
                                        className="h-7 text-xs bg-white border-[#c8c6c4]"
                                        aria-label={`Storage location for ${SERVICE_LABELS[serviceId] || getServiceDisplayName(serviceId)}`}
                                      >
                                        <SelectValue placeholder="Select region" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {STORAGE_REGIONS.map((region) => (
                                          <SelectItem key={region} value={region}>
                                            {region}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : storageLocation ? (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-[#f3f2f1] text-[#323130] border-[#d1cfce]">
                                      <MapPin className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                                      {storageLocation}
                                    </Badge>
                                  ) : (
                                    <span className="text-[10px] text-[#a19f9d]">Not set</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-1.5 px-2">
                                  {cats.length > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0 border-[#8764b8] text-[#8764b8] cursor-help"
                                        >
                                          {cats.length} Data Typ{cats.length === 1 ? "e" : "es"}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-[280px]">
                                        <div className="space-y-1">
                                          <p className="text-xs font-medium mb-1">Data Types:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {cats.map((cat: string) => (
                                              <Badge
                                                key={cat}
                                                variant="outline"
                                                className="text-[10px] px-1 py-0 bg-white border-[#8764b8] text-[#8764b8]"
                                              >
                                                {cat}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-[10px] text-[#a19f9d]">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-3 bg-[#faf9f8] rounded text-xs text-[#605e5c]">
                        <p>No services configured.</p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={onOpenPanel}
                          className="h-auto p-0 text-xs text-[#8764b8] mt-1"
                        >
                          Open Fulfillment Wizard to configure
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Not Found Identifiers callout — matches wizard style */}
        {notFoundIdentifiers.length > 0 && (
          <div className="bg-[#fde7e9] border border-[#d13438] rounded p-3" role="alert">
            <p className="text-xs font-semibold text-[#d13438] mb-2 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Not Found ({notFoundIdentifiers.length})
            </p>
            <p className="text-xs text-[#605e5c] mb-2">
              {notFoundIdentifiers.length === 1
                ? "This identifier was not found in Microsoft identity services. No service configuration, data categories, or storage region selection is needed."
                : "These identifiers were not found in Microsoft identity services. No service configuration, data categories, or storage region selection is needed for these identifiers."}
            </p>
            <div className="space-y-1">
              {notFoundIdentifiers.map((identifier) => (
                <div key={identifier.id} className="flex items-center gap-2">
                  <XCircle className="w-3 h-3 text-[#d13438] flex-shrink-0" aria-hidden="true" />
                  <Badge variant="outline" className="text-xs bg-white">
                    {identifier.type}
                  </Badge>
                  <span className="text-xs text-[#323130] break-all">
                    {identifier.value}
                  </span>
                  <span className="text-[10px] text-[#a19f9d] italic ml-auto flex-shrink-0">No action required</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA bar — compact */}
        {identifiers.length > 0 && !hasFulfillmentPlan && (
          <div className="bg-[#f3f2f1] border border-[#edebe9] rounded p-3 flex items-center justify-between gap-3">
            <p className="text-xs text-[#605e5c]">
              Open the Fulfillment Wizard to configure services, run account checks, and set data categories.
            </p>
            <Button
              type="button"
              size="sm"
              className="bg-[#8764b8] hover:bg-[#6b4c9a] text-white h-8 text-xs flex-shrink-0"
              onClick={onOpenPanel}
            >
              Open Fulfillment Wizard
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ─── Custom hook: prefers-reduced-motion ─────────────────────────────
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}