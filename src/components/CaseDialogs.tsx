/**
 * Confirmation dialogs used by DataEntryForm.
 * Extracted to reduce DataEntryForm.tsx file size.
 */
import React from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { PrimaryCard } from "./CardTier";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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
import {
  AlertCircle,
  AlertTriangle,
  Building,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  Save,
  Send,
  Trash2,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { CopyableIdentifier } from "./CopyableIdentifier";
import type { FormData } from "../types/caseTypes";
import { MICROSOFT_SERVICES_CONFIG } from "../config/microsoftServices";
import { LENS_SERVICES, getGroupName, getItemName } from "../config/lensServicesConfig";

// ── Back to Collection Confirmation ────────────────────────────────────────────

interface BackToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function BackToCollectionDialog({ open, onOpenChange, onConfirm }: BackToCollectionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#ca5010]" aria-hidden="true" />
            Discard fulfillment changes?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will discard your unsaved fulfillment plan edits — service
            selections, identifier scope changes, and any in-progress
            additions. Collection state itself is preserved; only the
            in-progress plan changes are lost. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            className="bg-[#d13438] hover:bg-[#a4262c] text-white"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Unsaved Changes Confirmation ───────────────────────────────────────────────

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export function UnsavedChangesDialog({ open, onOpenChange, onCancel, onDiscard, onSave, isSaving }: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#ca5010]" aria-hidden="true" />
            Unsaved Changes
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes that will be lost if you navigate away. Would you like to save before continuing?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="outline"
            className="border-[#d13438] text-[#d13438] hover:bg-[#fde7e9]"
            onClick={onDiscard}
          >
            Discard Changes
          </Button>
          <Button
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Save &amp; Continue
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Agent Removal Confirmation ─────────────────────────────────────────────────

interface AgentRemovalDialogProps {
  agentToRemove: { id: string; name: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AgentRemovalDialog({ agentToRemove, onConfirm, onCancel }: AgentRemovalDialogProps) {
  return (
    <AlertDialog open={agentToRemove !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl text-[#323130] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#c8511b]" />
            Deboard Agent from Case
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#605e5c]">
            This action will remove <span className="font-semibold text-[#323130]">{agentToRemove?.name || 'this agent'}</span> from the case.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-[#fef9f5] border border-[#c8511b]/20 rounded-md p-4">
            <div className="flex gap-3">
              <User className="w-5 h-5 text-[#c8511b] flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-[#323130] font-medium">
                  Agent will be deboarded from this case
                </p>
                <p className="text-sm text-[#605e5c]">
                  The agent's contact information will remain stored in the Contacts service and can be added back to future cases.
                </p>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            className="border-[#8a8886] text-[#323130] hover:bg-[#f3f2f1]"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-[#d13438] hover:bg-[#a92024] text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Deboard Agent
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Fulfillment Summary Dialog ─────────────────────────────────────────────────

interface FulfillmentSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  warrantModalOpen: boolean;
  isFormValid: boolean;
  isSubmittingFulfillment: boolean;
  workflowStage: "triage" | "fulfillment" | "collection";
  onSubmit: () => void;
  onToggleDocumentPanel: () => void;
  expandedNotFoundIdentifiers: Record<string, boolean>;
  setExpandedNotFoundIdentifiers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function FulfillmentSummaryDialog({
  open,
  onOpenChange,
  formData,
  warrantModalOpen,
  isFormValid,
  isSubmittingFulfillment,
  workflowStage,
  onSubmit,
  onToggleDocumentPanel,
  expandedNotFoundIdentifiers,
  setExpandedNotFoundIdentifiers,
}: FulfillmentSummaryDialogProps) {
  // Summary statistics computed from fulfillmentPlan
  let planIdentifiers = 0;
  let planServices = 0;
  let planCategories = 0;
  formData.identifiers.forEach((identifier) => {
    const fp = (identifier as any).fulfillmentPlan;
    if (fp?.services && Object.keys(fp.services).length > 0) {
      planIdentifiers++;
      Object.values(fp.services).forEach((svc: any) => {
        if (svc.enabled) {
          planServices++;
          planCategories += (svc.dataCategories?.length || 0);
        }
      });
    } else {
      const enabledSvcs = Object.values(identifier.services).filter((s: any) => s.enabled);
      if (enabledSvcs.length > 0) planIdentifiers++;
      enabledSvcs.forEach((s: any) => {
        planServices++;
        planCategories += Object.values(s.categoryGroups || {}).reduce((acc: number, group: any) =>
          acc + Object.values(group || {}).filter((c: any) => c.enabled).length, 0);
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[calc(100vh-8rem)] overflow-y-auto !top-[5rem] !translate-y-0 !z-[60] transition-all duration-300 ${
          warrantModalOpen
            ? "sm:max-w-[calc(90vw-500px)] w-[900px] !left-[calc(50%-250px)] !translate-x-[-50%]"
            : "sm:max-w-[90vw] w-[1400px]"
        }`}
        onPointerDownOutside={(e) => {
          if (warrantModalOpen) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (warrantModalOpen) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#323130] flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-[#0078d4]" />
            Fulfillment Summary
          </DialogTitle>
          <DialogDescription className="text-[#605e5c]">
            Review all identifiers, services, date ranges, content boundaries, and data categories with the fulfillment plan applied
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Summary Statistics */}
          <PrimaryCard accent="blue" className="bg-[#f3f9fd]">
            <div className="p-4">
              <h3 className="font-semibold text-[#323130] mb-3">Summary Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#0078d4]">{planIdentifiers}</div>
                  <div className="text-sm text-[#605e5c]">Identifiers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#0078d4]">{planServices}</div>
                  <div className="text-sm text-[#605e5c]">Services</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#0078d4]">{planCategories}</div>
                  <div className="text-sm text-[#605e5c]">Data Types</div>
                </div>
              </div>
            </div>
          </PrimaryCard>

          {/* Case Information */}
          <Card className="border-l-4 border-l-[#0078d4]">
            <div className="p-4">
              <h3 className="font-semibold text-[#323130] mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0078d4]" />
                Case Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-[#605e5c] mb-1">LNS Case Number</p>
                  <p className="text-sm font-medium text-[#323130]">{formData.caseId || formData.caseNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#605e5c] mb-1">Agency Case Number</p>
                  <p className="text-sm font-medium text-[#323130]">{formData.agencyCaseNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#605e5c] mb-1">Agency</p>
                  <div className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-[#605e5c]" />
                    <p className="text-sm font-medium text-[#323130]">{formData.agency || "N/A"}</p>
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
          <Card className="border-l-4 border-l-[#ca5010]">
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
                    onClick={onToggleDocumentPanel}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    View Legal Demand Documents
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Identifiers & Fulfillment Plan Breakdown */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#323130] text-lg">Identifiers & Fulfillment Plan</h3>
            
            {formData.identifiers.length === 0 ? (
              <div className="text-center py-8 bg-[#faf9f8] border border-[#edebe9] rounded-lg">
                <p className="text-[#605e5c]">No identifiers added</p>
              </div>
            ) : (
              formData.identifiers.map((identifier) => {
                const fp = (identifier as any).fulfillmentPlan;
                const hasFulfillmentPlan = fp?.services && Object.keys(fp.services).length > 0;

                const serviceEntries: { serviceKey: string; planService: any; formService: any }[] = [];
                if (hasFulfillmentPlan) {
                  Object.entries(fp.services).forEach(([serviceKey, planSvc]: [string, any]) => {
                    if (planSvc.enabled) {
                      serviceEntries.push({
                        serviceKey,
                        planService: planSvc,
                        formService: identifier.services[serviceKey as keyof typeof identifier.services],
                      });
                    }
                  });
                } else {
                  Object.entries(identifier.services).forEach(([serviceKey, service]) => {
                    if (service.enabled) {
                      serviceEntries.push({
                        serviceKey,
                        planService: null,
                        formService: service,
                      });
                    }
                  });
                }

                if (serviceEntries.length === 0) return null;

                const fpDateRange = fp?.dateRange;
                const fpStartDate = fpDateRange?.start ? new Date(fpDateRange.start) : null;
                const fpEndDate = fpDateRange?.end ? new Date(fpDateRange.end) : null;
                
                // Determine if this identifier's account status is "Not Found"
                const isAccountNotFound = identifier.accountExistenceStatus === "success" && !Object.values(identifier.services).some(
                  (svc: any) => svc.accountExistence?.consumerExists || svc.accountExistence?.enterpriseExists
                );
                const isServicesExpanded = !isAccountNotFound || expandedNotFoundIdentifiers[identifier.id];

                return (
                  <Card key={identifier.id} className="border-[#e1dfdd]">
                    <div className="p-4 space-y-4">
                      {/* Identifier Header */}
                      <div className="flex items-start justify-between pb-3 border-b border-[#edebe9]">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-[#605e5c]" />
                            <CopyableIdentifier value={identifier.value} copyLabel="Copy identifier" className="font-semibold text-[#323130]" />
                            {isAccountNotFound && (
                              <Badge variant="outline" className="bg-[#fff4ce] text-[#797673] border-[#c8c6c4] text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Account Not Found
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-[#605e5c]">{identifier.type}</span>
                            {identifier.taskId && (
                              <Badge variant="outline" className="bg-[#f3f2f1] text-[#323130] border-[#8a8886] text-xs font-mono">
                                Task: {identifier.taskId}
                              </Badge>
                            )}
                          </div>
                          {(fpStartDate || fpEndDate) && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-[#323130]">
                              <CalendarIcon className="w-3.5 h-3.5 text-[#0078d4]" />
                              <span className="text-[#605e5c] font-medium">Fulfillment Date Range:</span>
                              <span>
                                {fpStartDate ? format(fpStartDate, "MMM d, yyyy") : "\u2014"}
                                {" \u2014 "}
                                {fpEndDate ? format(fpEndDate, "MMM d, yyyy") : "\u2014"}
                              </span>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-[#deecf9] text-[#0078d4] border-[#0078d4]">
                          {serviceEntries.length} {serviceEntries.length === 1 ? 'Service' : 'Services'}
                        </Badge>
                      </div>

                      {/* Not Found notice with expand/collapse toggle */}
                      {isAccountNotFound && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2.5 bg-[#fff4ce] border border-[#f7e28b] rounded text-xs text-[#605e5c]">
                            <AlertCircle className="w-3.5 h-3.5 text-[#8a8886] flex-shrink-0" />
                            <span className="flex-1">Check Accounts did not find any accounts for this identifier. No additional account information is available.</span>
                          </div>
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-xs text-[#0078d4] hover:text-[#106ebe] transition-colors cursor-pointer"
                            onClick={() => setExpandedNotFoundIdentifiers(prev => ({
                              ...prev,
                              [identifier.id]: !prev[identifier.id]
                            }))}
                          >
                            {isServicesExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            <span>{isServicesExpanded ? "Hide" : "Show"} LE Requested Services & Categories ({serviceEntries.length} {serviceEntries.length === 1 ? 'Service' : 'Services'})</span>
                          </button>
                        </div>
                      )}

                      {/* Services and Categories */}
                      {isServicesExpanded && (
                      <div className="space-y-3">
                        {serviceEntries.map(({ serviceKey, planService, formService }) => {
                          const lensService = LENS_SERVICES.find((s) => s.key === serviceKey);
                          const legacyConfig = MICROSOFT_SERVICES_CONFIG[serviceKey as keyof typeof MICROSOFT_SERVICES_CONFIG];
                          const serviceName = lensService?.name || legacyConfig?.name || serviceKey;
                          const serviceDescription = legacyConfig?.description || "";

                          const enabledCategories: { catKey: string; cat: any; categoryLabel: string }[] = [];
                          Object.entries(formService?.categoryGroups || {}).forEach(([gKey, group]: [string, any]) => {
                            Object.entries(group || {}).forEach(([iKey, cat]: [string, any]) => {
                              if (cat.enabled) {
                                const categoryLabel = `${getGroupName(gKey)} — ${getItemName(gKey, iKey)}`;
                                enabledCategories.push({ catKey: `${gKey}:${iKey}`, cat, categoryLabel });
                              }
                            });
                          });

                          const planLocation = planService?.dataCenterLocation;
                          const consumerLocation = formService?.accountExistence?.consumerStorageLocation;
                          const enterpriseLocation = formService?.accountExistence?.enterpriseStorageLocation;
                          const resolvedStorageRegion = planLocation || enterpriseLocation || consumerLocation;

                          const effectiveStartDate = fpStartDate || formService?.startDate;
                          const effectiveEndDate = fpEndDate || formService?.endDate;

                          return (
                            <div key={serviceKey} className="bg-[#faf9f8] rounded p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-[#323130]">{serviceName}</div>
                                  <div className="text-xs text-[#605e5c]">{serviceDescription}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {formService?.includeEnterpriseAccount !== false && formService?.backgroundData?.enterpriseAliases && formService.backgroundData.enterpriseAliases.length > 0 && (
                                    <Badge variant="outline" className="bg-[#fef9f5] text-[#ca5010] border-[#ca5010] text-xs">
                                      <Building className="w-3 h-3 mr-1" />
                                      Enterprise
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="bg-white text-[#605e5c] border-[#8a8886] text-xs">
                                    {enabledCategories.length} {enabledCategories.length === 1 ? 'Category' : 'Categories'}
                                  </Badge>
                                </div>
                              </div>

                              {/* Service-level metadata: Date Range & Storage Region */}
                              <div className="flex flex-wrap gap-x-6 gap-y-1 px-1">
                                {(effectiveStartDate || effectiveEndDate) && (
                                  <div className="flex items-center gap-1.5 text-xs text-[#323130]">
                                    <CalendarIcon className="w-3.5 h-3.5 text-[#0078d4]" />
                                    <span className="text-[#605e5c] font-medium">Date Range:</span>
                                    <span>
                                      {effectiveStartDate ? format(effectiveStartDate, "MMM d, yyyy") : "\u2014"}
                                      {" \u2014 "}
                                      {effectiveEndDate ? format(effectiveEndDate, "MMM d, yyyy") : "\u2014"}
                                    </span>
                                  </div>
                                )}
                                {resolvedStorageRegion && (
                                  <div className="flex items-center gap-1.5 text-xs text-[#323130]">
                                    <MapPin className="w-3.5 h-3.5 text-[#0078d4]" />
                                    <span className="text-[#605e5c] font-medium">Content Boundary:</span>
                                    <Badge variant="outline" className="bg-white text-[#323130] border-[#8a8886] text-xs py-0">
                                      {resolvedStorageRegion}
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              {/* Enterprise account details */}
                              {formService?.includeEnterpriseAccount !== false && formService?.backgroundData?.enterpriseAliases && formService.backgroundData.enterpriseAliases.length > 0 && (
                                <div className="p-2 bg-[#fef9f5] border border-[#d4a574] rounded text-xs space-y-1">
                                  <div className="flex items-start gap-2">
                                    <span className="text-[#605e5c] font-medium">Enterprise ID:</span>
                                    <CopyableIdentifier value={identifier.value} variant="mono" copyLabel="Copy enterprise identifier" />
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-[#605e5c] font-medium">ID Type:</span>
                                    <span className="text-[#323130]">{identifier.type}</span>
                                  </div>
                                  {formService.accountExistence?.enterpriseStorageLocation && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-[#605e5c] font-medium">Mailbox Storage Location:</span>
                                      <span className="text-[#323130]">{formService.accountExistence.enterpriseStorageLocation}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Account Status: Not Found */}
                              {identifier.accountExistenceStatus === "success" && formService?.accountExistence && !formService.accountExistence.consumerExists && !formService.accountExistence.enterpriseExists && (
                                <div className="flex items-center gap-2 p-2 bg-[#faf9f8] border border-[#edebe9] rounded text-xs text-[#605e5c]">
                                  <AlertCircle className="w-3.5 h-3.5 text-[#8a8886] flex-shrink-0" />
                                  <span>Account Status: <span className="font-medium text-[#a19f9d]">Not Found</span> — Check Accounts did not find an account for this identifier in {serviceName}.</span>
                                </div>
                              )}

                              {/* Categories with per-category details */}
                              {enabledCategories.length > 0 && (() => {
                                const hasAnyJobId = enabledCategories.some(({ cat }) => !!cat.jobId);
                                const hasAnyDateRange = enabledCategories.some(({ cat }) => !!(cat.startDate || fpStartDate || cat.endDate || fpEndDate));

                                return (
                                  <div className="mt-2 space-y-1.5">
                                    <div className="flex items-center px-2.5 py-1 border-b border-[#c8c6c4]">
                                      <span className="min-w-[120px] text-xs font-semibold text-[#605e5c] uppercase tracking-wide">Data Type</span>
                                      {hasAnyJobId && (
                                        <span className="min-w-[120px] text-xs font-semibold text-[#605e5c] uppercase tracking-wide">Collection Job ID</span>
                                      )}
                                      <span className="flex-1" />
                                      {hasAnyDateRange && (
                                        <span className="min-w-[180px] text-xs font-semibold text-[#605e5c] uppercase tracking-wide text-right">Date Range</span>
                                      )}
                                    </div>
                                    {enabledCategories.map(({ catKey, cat, categoryLabel }) => {
                                      const catStart = cat.startDate || fpStartDate;
                                      const catEnd = cat.endDate || fpEndDate;
                                      const hasDateRange = catStart || catEnd;
                                      const hasJobId = cat.jobId;
                                      return (
                                        <div
                                          key={catKey}
                                          className="flex items-center bg-white rounded px-2.5 py-1.5 border border-[#edebe9]"
                                        >
                                          <div className="min-w-[120px]">
                                            <Badge 
                                              variant="outline" 
                                              className="bg-white text-[#0078d4] border-[#0078d4] text-xs"
                                            >
                                              {categoryLabel}
                                            </Badge>
                                          </div>
                                          {hasAnyJobId && (
                                            <div className="min-w-[120px]">
                                              {hasJobId ? (
                                                <span className="text-xs text-[#605e5c] font-mono">
                                                  {cat.jobId}
                                                </span>
                                              ) : (
                                                <span className="text-xs text-[#c8c6c4]">{"\u2014"}</span>
                                              )}
                                            </div>
                                          )}
                                          <span className="flex-1" />
                                          {hasAnyDateRange && (
                                            <div className="min-w-[180px] text-right">
                                              {hasDateRange ? (
                                                <span className="text-xs text-[#605e5c]">
                                                  <CalendarIcon className="w-3 h-3 inline mr-1 text-[#8a8886]" />
                                                  {catStart ? format(catStart, "MMM d, yyyy") : "\u2014"}
                                                  {" \u2014 "}
                                                  {catEnd ? format(catEnd, "MMM d, yyyy") : "\u2014"}
                                                </span>
                                              ) : (
                                                <span className="text-xs text-[#c8c6c4]">{"\u2014"}</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#edebe9]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmittingFulfillment}
              className="h-10 px-6 border-[#c8c6c4] hover:bg-[#f3f2f1] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!isFormValid || isSubmittingFulfillment}
              className="h-10 px-6 bg-[#0078d4] hover:bg-[#106ebe] text-white disabled:bg-[#f3f2f1] disabled:text-[#a19f9d] disabled:cursor-not-allowed"
            >
              {isSubmittingFulfillment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {workflowStage === "triage" ? "Completing..." : "Submitting..."}
                </>
              ) : workflowStage === "triage" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Triage
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Collection Jobs
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
