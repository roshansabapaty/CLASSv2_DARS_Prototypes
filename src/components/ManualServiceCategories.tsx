import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NoteFieldEditor } from "./NoteFieldEditor";
import { CopyableText } from "./CopyButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit3,
  Wrench,
  Package,
  Truck,
  ChevronDown,
  Save,
  Copy,
} from "lucide-react";
import { cn } from "./ui/utils";
import { toast } from "sonner@2.0.3";
import { formatDistanceToNow } from "date-fns";

interface ManualCategory {
  categoryKey: string;
  category: {
    collectionStatus?: string;
    publishStatus?: string;
    deliveryStatus?: string;
    jobId?: string;
    taskId?: string;
    publishJobId?: string;
    deliveryJobId?: string;
    lastUpdatedAt?: string | Date;
    collectionNotes?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    createdOn?: Date | string;
    [key: string]: any;
  };
}

interface ManualServiceCategoriesProps {
  categories: ManualCategory[];
  service: {
    dataLocation?: string;
    collectionNotes?: string;
    [key: string]: any;
  };
  identifierId: string;
  identifierValue: string;
  serviceKey: string;
  formatCategoryName: (key: string) => string;
  onStatusUpdate: (
    identifierId: string,
    serviceKey: string,
    updates: {
      dataLocation: string;
      collectionNotes: string;
      categoryUpdates: Record<string, { collectionStatus: string; lastUpdatedBy: string; lastUpdatedAt: Date }>;
    }
  ) => void;
}

// Helpers

const getCurrentStage = (colStatus: string, pubStatus: string, delStatus: string) => {
  if (delStatus === "Complete") return { phase: "Delivery", status: "Complete", color: "text-[#107c10]" };
  if (delStatus === "Failed") return { phase: "Delivery", status: "Failed", color: "text-[#a4262c]" };
  if (delStatus === "Blocked") return { phase: "Delivery", status: "Blocked", color: "text-[#d83b01]" };
  if (delStatus === "Started" || delStatus === "In Progress") return { phase: "Delivery", status: "In Progress", color: "text-[#ca5010]" };
  if (pubStatus === "Complete") return { phase: "Package", status: "Complete", color: "text-[#107c10]" };
  if (pubStatus === "Failed") return { phase: "Package", status: "Failed", color: "text-[#a4262c]" };
  if (pubStatus === "Blocked") return { phase: "Package", status: "Blocked", color: "text-[#d83b01]" };
  if (pubStatus === "Started" || pubStatus === "In Progress") return { phase: "Package", status: "In Progress", color: "text-[#8764b8]" };
  if (colStatus === "Complete") return { phase: "Collection", status: "Complete", color: "text-[#107c10]" };
  if (colStatus === "No Data") return { phase: "Collection", status: "No Data", color: "text-[#ca5010]" };
  if (colStatus === "Failed") return { phase: "Collection", status: "Failed", color: "text-[#a4262c]" };
  if (colStatus === "Blocked") return { phase: "Collection", status: "Blocked", color: "text-[#d83b01]" };
  if (colStatus === "Started" || colStatus === "In Progress") return { phase: "Collection", status: "In Progress", color: "text-[#0078d4]" };
  return { phase: "Collection", status: "Not Started", color: "text-[#605e5c]" };
};

export function ManualServiceCategories({
  categories,
  service,
  identifierId,
  identifierValue,
  serviceKey,
  formatCategoryName,
  onStatusUpdate,
}: ManualServiceCategoriesProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [formStatuses, setFormStatuses] = useState<Record<string, string>>({});
  const [formLocations, setFormLocations] = useState<Record<string, string>>({});
  const [formNotes, setFormNotes] = useState<Record<string, string>>({});
  // Sibling per-entry attachments for the manual-service collection
  // notes — keyed by the same `entryKey` so each row's notes carry
  // their own attachments through the rich-text editor.
  const [formNotesAttachments, setFormNotesAttachments] = useState<
    Record<string, import("./RichTextEditor").Attachment[]>
  >({});
  const [savingEntries, setSavingEntries] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Auto-expand all pending manual entries on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const autoExpand = new Set<string>();
    const initStatuses: Record<string, string> = {};
    const initLocations: Record<string, string> = {};
    const initNotes: Record<string, string> = {};
    categories.forEach(({ categoryKey, category }) => {
      const status = category.collectionStatus || "Not Started";
      if (status === "Not Started" || status === "Started") {
        const entryKey = `${identifierId}|${serviceKey}|${categoryKey}`;
        autoExpand.add(entryKey);
        initStatuses[entryKey] = status;
        initLocations[entryKey] = service.dataLocation || "";
        initNotes[entryKey] = service.collectionNotes || "";
      }
    });
    if (autoExpand.size > 0) {
      setExpandedEntries(autoExpand);
      setFormStatuses(initStatuses);
      setFormLocations(initLocations);
      setFormNotes(initNotes);
    }
  }, []);

  // Compute which entries are expandable (editable manual entries not in a terminal/pipeline state)
  const expandableEntryKeys = categories
    .filter(({ category }) => {
      const col = category.collectionStatus || "Not Started";
      const pub = category.publishStatus || "Not Started";
      const del = category.deliveryStatus || "Not Started";
      const isFullyComplete = del === "Complete" || col === "No Data" || col === "Failed";
      const isInPipeline = pub === "Started" || del === "Started";
      return !isFullyComplete && !isInPipeline;
    })
    .map(({ categoryKey }) => `${identifierId}|${serviceKey}|${categoryKey}`);

  const allExpanded = expandableEntryKeys.length > 0 && expandableEntryKeys.every(k => expandedEntries.has(k));
  const someExpanded = expandableEntryKeys.some(k => expandedEntries.has(k));

  const handleToggleAll = () => {
    if (allExpanded) {
      // Collapse all
      setExpandedEntries(prev => {
        const next = new Set(prev);
        expandableEntryKeys.forEach(k => next.delete(k));
        return next;
      });
    } else {
      // Expand all & init form values
      setExpandedEntries(prev => {
        const next = new Set(prev);
        expandableEntryKeys.forEach(k => next.add(k));
        return next;
      });
      categories.forEach(({ categoryKey, category }) => {
        const entryKey = `${identifierId}|${serviceKey}|${categoryKey}`;
        if (!expandableEntryKeys.includes(entryKey)) return;
        if (!formStatuses[entryKey]) {
          setFormStatuses(p => ({ ...p, [entryKey]: category.collectionStatus || "Not Started" }));
        }
        if (formLocations[entryKey] === undefined) {
          setFormLocations(p => ({ ...p, [entryKey]: service.dataLocation || "" }));
        }
        if (formNotes[entryKey] === undefined) {
          setFormNotes(p => ({ ...p, [entryKey]: service.collectionNotes || "" }));
        }
      });
    }
  };

  const toggleEntry = (entryKey: string, category: any) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryKey)) {
        next.delete(entryKey);
      } else {
        next.add(entryKey);
        if (!formStatuses[entryKey]) {
          setFormStatuses(p => ({ ...p, [entryKey]: category.collectionStatus || "Not Started" }));
        }
        if (formLocations[entryKey] === undefined) {
          setFormLocations(p => ({ ...p, [entryKey]: service.dataLocation || "" }));
        }
        if (formNotes[entryKey] === undefined) {
          setFormNotes(p => ({ ...p, [entryKey]: service.collectionNotes || "" }));
        }
      }
      return next;
    });
  };

  const handleSave = (entryKey: string, categoryKey: string) => {
    const status = formStatuses[entryKey] || "Not Started";
    const location = formLocations[entryKey] || "";
    const notes = formNotes[entryKey] || "";

    if (status === "Complete" && !location.trim()) {
      toast.error("Content boundary is required when marking as Complete");
      return;
    }

    setSavingEntries(prev => new Set(prev).add(entryKey));

    setTimeout(() => {
      onStatusUpdate(identifierId, serviceKey, {
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

      setSavingEntries(prev => {
        const next = new Set(prev);
        next.delete(entryKey);
        return next;
      });
      setExpandedEntries(prev => {
        const next = new Set(prev);
        next.delete(entryKey);
        return next;
      });
      // Clear cached form values
      setFormStatuses(prev => { const next = { ...prev }; delete next[entryKey]; return next; });
      setFormLocations(prev => { const next = { ...prev }; delete next[entryKey]; return next; });
      setFormNotes(prev => { const next = { ...prev }; delete next[entryKey]; return next; });

      toast.success(`Manual collection status updated to "${status}"`);
    }, 400);
  };

  return (
    <>
      {expandableEntryKeys.length > 1 && (
        <div className="flex justify-end mb-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            onClick={handleToggleAll}
          >
            <ChevronDown className={cn("w-3.5 h-3.5 mr-1 transition-transform", allExpanded ? "rotate-180" : "")} />
            {allExpanded ? "Collapse All" : "Expand All"}
          </Button>
        </div>
      )}
      {/* Table column headers — flex-wrapped with a 140 px Action
          column at the tail so the inner 7-column grid lines up
          pixel-for-pixel with each row's inner grid. Same fix pattern
          as CollectionTracker's automated / by-identifier tables. */}
      <div className="flex items-center px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-t text-xs font-semibold text-amber-800 uppercase tracking-wide">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_1fr_0.7fr_0.8fr_1.2fr_0.8fr] gap-4">
          <span>Data Type</span>
          <span>Account Type</span>
          <span>Date Range</span>
          <span>Created</span>
          <span>Job IDs</span>
          <span>Phase Status</span>
          <span>Updated</span>
        </div>
        <span className="w-[140px] flex-shrink-0 ml-3 pl-3 border-l border-amber-300">
          Action
        </span>
      </div>
      {categories.map(({ categoryKey, category }) => {
        const colStatus = category.collectionStatus || "Not Started";
        const pubStatus = category.publishStatus || "Not Started";
        const delStatus = category.deliveryStatus || "Not Started";

        const isPublishable = colStatus === "Complete" && pubStatus === "Not Started";
        const isDeliverable = pubStatus === "Complete" && delStatus === "Not Started";
        const isFullyComplete = delStatus === "Complete" || colStatus === "No Data" || colStatus === "Failed";
        const currentStage = getCurrentStage(colStatus, pubStatus, delStatus);

        const entryKey = `${identifierId}|${serviceKey}|${categoryKey}`;
        const isExpanded = expandedEntries.has(entryKey);
        const isSaving = savingEntries.has(entryKey);

        return (
          <div key={categoryKey} className="space-y-0">
            {/* Compact row */}
            <div
              className={cn(
                "flex items-center justify-between p-3 bg-white border transition-colors",
                isExpanded ? "rounded-t border-amber-400 bg-amber-50/30" : "rounded hover:border-[#c8c6c4]",
                isFullyComplete ? "border-[#edebe9] bg-[#fcfcfc]" : !isExpanded ? "border-[#edebe9]" : ""
              )}
            >
              <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_1fr_0.7fr_0.8fr_1.2fr_0.8fr] gap-4 items-start">
                {/* Data Category */}
                <div>
                  <p className="text-sm font-medium text-[#323130]">
                    {formatCategoryName(categoryKey)}
                  </p>
                </div>
                {/* Account Type — Manual */}
                <div>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                    <Wrench className="w-3 h-3 mr-1" />
                    Manual
                  </Badge>
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
                    {[
                      { label: "C", id: category.jobId || category.taskId || null },
                      { label: "P", id: category.publishJobId || null },
                      { label: "D", id: category.deliveryJobId || null },
                    ].map((p) => (
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
                    ))}
                  </div>
                </div>
                {/* Phase Status */}
                <div>
                  <span className={cn("text-sm font-medium", currentStage.color)}>
                    <span className="text-[#605e5c]">{currentStage.phase}:</span> {currentStage.status}
                  </span>
                </div>
                {/* Last Updated */}
                <div>
                  <p className="text-xs text-[#323130]">
                    {category.lastUpdatedAt
                      ? formatDistanceToNow(new Date(category.lastUpdatedAt as string), { addSuffix: true })
                      : "N/A"}
                  </p>
                </div>
              </div>
              {/* Action column */}
              <div className="w-[140px] flex-shrink-0 ml-3 pl-3 border-l border-[#edebe9] flex items-center gap-2 justify-end">
                {isPublishable ? (
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
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs",
                      isExpanded
                        ? "border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100"
                        : "border-amber-400 text-amber-700 hover:bg-amber-50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEntry(entryKey, category);
                    }}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 mr-1" />
                        Close
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Inline manual data entry form */}
            {isExpanded && (
              <div className="border border-t-0 border-amber-400 rounded-b bg-gradient-to-b from-amber-50/50 to-white p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    Manual Data Entry — {formatCategoryName(categoryKey)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Collection Status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#605e5c]">Collection Status</Label>
                    <Select
                      value={formStatuses[entryKey] || colStatus}
                      onValueChange={(val) => setFormStatuses(prev => ({ ...prev, [entryKey]: val }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Started">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#c8c6c4]" /> Not Started
                          </span>
                        </SelectItem>
                        <SelectItem value="Started">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#0078d4]" /> In Progress
                          </span>
                        </SelectItem>
                        <SelectItem value="Complete">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#107c10]" /> Complete
                          </span>
                        </SelectItem>
                        <SelectItem value="No Data">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#ca5010]" /> No Data
                          </span>
                        </SelectItem>
                        <SelectItem value="Failed">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#a4262c]" /> Failed
                          </span>
                        </SelectItem>
                        <SelectItem value="Blocked">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#d83b01]" /> Blocked
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Content Boundary */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#605e5c]">
                      Content Boundary
                      {(formStatuses[entryKey] || colStatus) === "Complete" && (
                        <span className="text-[#a4262c] ml-0.5">*</span>
                      )}
                    </Label>
                    <Select
                      value={formLocations[entryKey] ?? (service.dataLocation || "")}
                      onValueChange={(value) => setFormLocations(prev => ({ ...prev, [entryKey]: value }))}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-9 text-sm",
                          (formStatuses[entryKey] || colStatus) === "Complete" &&
                            !(formLocations[entryKey] ?? service.dataLocation) &&
                            "border-[#d13438]"
                        )}
                      >
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="united-states">United States</SelectItem>
                        <SelectItem value="europe">Europe</SelectItem>
                        <SelectItem value="united-kingdom">United Kingdom</SelectItem>
                        <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                        <SelectItem value="brazil">Brazil</SelectItem>
                        <SelectItem value="india">India</SelectItem>
                        <SelectItem value="canada">Canada</SelectItem>
                        <SelectItem value="france">France</SelectItem>
                        <SelectItem value="switzerland">Switzerland</SelectItem>
                        <SelectItem value="mexico">Mexico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes — shared NoteFieldEditor so manual-service
                      collection notes carry the same formatting +
                      attachment controls as a Case Note. */}
                  <div className="space-y-1.5">
                    <NoteFieldEditor
                      id={`manual-service-notes-${entryKey}`}
                      label="Collection Notes"
                      subType="manual-service"
                      value={formNotes[entryKey] ?? (service.collectionNotes || "")}
                      onChange={(value) =>
                        setFormNotes((prev) => ({ ...prev, [entryKey]: value }))
                      }
                      attachments={formNotesAttachments[entryKey] ?? []}
                      onAttachmentsChange={(attachments) =>
                        setFormNotesAttachments((prev) => ({
                          ...prev,
                          [entryKey]: attachments,
                        }))
                      }
                      placeholder="Optional notes about this collection"
                    />
                  </div>
                </div>

                {/* Validation hint */}
                {(formStatuses[entryKey] || colStatus) === "Complete" &&
                  !(formLocations[entryKey] ?? (service.dataLocation || "")).trim() && (
                  <p className="text-xs text-[#a4262c] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Content boundary is required when marking as Complete
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                  <p className="text-xs text-[#605e5c]">
                    {(formStatuses[entryKey] || colStatus) !== colStatus
                      ? <span className="text-amber-700 font-medium">Status will change: {colStatus} → {formStatuses[entryKey]}</span>
                      : "Update the status and save to progress this category through the pipeline"}
                  </p>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={!(formLocations[entryKey] ?? service.dataLocation)}
                            onClick={async () => {
                              const location = formLocations[entryKey] ?? service.dataLocation;
                              if (location) {
                                const sasToken = `sp=r&st=2026-01-28T10:00:00Z&se=2026-02-04T18:00:00Z&sv=2023-01-03&sr=c&sig=MockSASTokenSignature${Date.now()}`;
                                try {
                                  await navigator.clipboard.writeText(sasToken);
                                  toast.success("SAS Token copied to clipboard");
                                } catch {
                                  toast.error("Failed to copy SAS token");
                                }
                              }
                            }}
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            Copy SAS Token
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Collection Point: https://sdrmsagain{formLocations[entryKey] ?? service.dataLocation ?? ''}.blob.core.windows.net/cpt/{identifierValue?.toLowerCase().replace(/[^a-z0-9]/g, '-') ?? ''}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-[#605e5c]"
                      onClick={() => {
                        setExpandedEntries(prev => {
                          const next = new Set(prev);
                          next.delete(entryKey);
                          return next;
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={isSaving}
                      onClick={() => handleSave(entryKey, categoryKey)}
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 mr-1" />
                          Save & Update
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}