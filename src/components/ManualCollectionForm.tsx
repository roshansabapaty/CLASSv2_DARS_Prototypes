import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { NoteFieldEditor } from "./NoteFieldEditor";
import { Badge } from "./ui/badge";
import { CopyableIdentifier } from "./CopyableIdentifier";
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
import { Folder, Copy, Save, Wrench, CheckCircle2, AlertCircle, User, Clock, XCircle, Package, Truck, ArrowRight, MinusCircle, Info } from "lucide-react";
import { CopyableText } from "./CopyButton";
import { toast } from "sonner@2.0.3";
import { cn } from "./ui/utils";

interface DataCategory {
  categoryKey: string;
  categoryName: string;
  jobId: string;
  collectionStatus: string;
  publishStatus?: string;
  deliveryStatus?: string;
  publishJobId?: string;
  deliveryJobId?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: Date;
}

interface ManualCollectionFormProps {
  identifierValue: string;
  identifierType: string;
  taskId?: string;
  serviceName: string;
  categories: DataCategory[];
  dataLocation?: string;
  collectionNotes?: string;
  accountDataLocation?: string;
  accountType?: string;
  primaryIdentifier?: string;
  relatedIdentifiers?: string[];
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  onStatusUpdate: (updates: {
    dataLocation: string;
    collectionNotes: string;
    categoryUpdates: Record<string, { collectionStatus: string; lastUpdatedBy: string; lastUpdatedAt: Date }>;
  }) => void;
  // Pipeline selection props
  identifierId?: string;
  serviceKey?: string;
  filterStatus?: string;
  getJobKey?: (categoryKey: string, accountType: string) => string;
}

export function ManualCollectionForm({
  identifierValue,
  identifierType,
  taskId,
  serviceName,
  categories,
  dataLocation: initialDataLocation = "",
  collectionNotes: initialCollectionNotes = "",
  accountDataLocation,
  accountType,
  primaryIdentifier,
  relatedIdentifiers = [],
  dateRangeStart,
  dateRangeEnd,
  onStatusUpdate,
  identifierId,
  serviceKey,
  filterStatus,
  getJobKey,
}: ManualCollectionFormProps) {
  const [dataLocation, setDataLocation] = useState(initialDataLocation);
  const [collectionNotes, setCollectionNotes] = useState(initialCollectionNotes);
  // Sibling attachments list for the collection notes — kept local for
  // now; the parent's onStatusUpdate interface doesn't persist them
  // yet. Future refactor can extend the interface if attachments need
  // to survive a save.
  const [collectionNotesAttachments, setCollectionNotesAttachments] = useState<
    import("./RichTextEditor").Attachment[]
  >([]);
  const [categoryStatuses, setCategoryStatuses] = useState<Record<string, string>>(
    categories.reduce((acc, cat) => {
      acc[cat.categoryKey] = cat.collectionStatus || "Not Started";
      return acc;
    }, {} as Record<string, string>)
  );
  const [isSaving, setIsSaving] = useState(false);

  const initialCategoryStatuses = categories.reduce((acc, cat) => {
    acc[cat.categoryKey] = cat.collectionStatus || "Not Started";
    return acc;
  }, {} as Record<string, string>);

  const hasChanges =
    dataLocation !== initialDataLocation ||
    collectionNotes !== initialCollectionNotes ||
    JSON.stringify(categoryStatuses) !== JSON.stringify(initialCategoryStatuses);

  const anyCompleted = Object.values(categoryStatuses).some(status => status === "Complete");
  const isLocationRequired = anyCompleted;
  const isValid = !isLocationRequired || dataLocation.trim().length > 0;

  const handleCategoryStatusChange = (categoryKey: string, newStatus: string) => {
    setCategoryStatuses(prev => ({
      ...prev,
      [categoryKey]: newStatus
    }));
  };

  const handleSave = () => {
    if (!isValid) {
      toast.error("Content boundary is required when any collection is complete");
      return;
    }

    setIsSaving(true);
    
    // Build category updates with timestamp and user info
    const categoryUpdates: Record<string, { collectionStatus: string; lastUpdatedBy: string; lastUpdatedAt: Date }> = {};
    const currentUser = "Current User"; // In real app, get from auth context
    const now = new Date();

    Object.entries(categoryStatuses).forEach(([categoryKey, status]) => {
      if (status !== initialCategoryStatuses[categoryKey]) {
        categoryUpdates[categoryKey] = {
          collectionStatus: status,
          lastUpdatedBy: currentUser,
          lastUpdatedAt: now
        };
      }
    });
    
    // Simulate API call
    setTimeout(() => {
      onStatusUpdate({
        dataLocation,
        collectionNotes,
        categoryUpdates,
      });
      
      setIsSaving(false);
      toast.success("Manual collection status updated successfully");
    }, 500);
  };

  const handleCopyLocation = async () => {
    if (dataLocation) {
      try {
        await navigator.clipboard.writeText(dataLocation);
        toast.success("Content boundary copied to clipboard");
      } catch (error) {
        try {
          const textArea = document.createElement("textarea");
          textArea.value = dataLocation;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          document.execCommand('copy');
          textArea.remove();
          toast.success("Content boundary copied to clipboard");
        } catch (fallbackErr) {
          console.error("Failed to copy:", error, fallbackErr);
          toast.error("Unable to copy to clipboard");
        }
      }
    }
  };

  const getCollectionPointPath = () => {
    if (!dataLocation) return "";
    // Format: https://sdrmsagain[region].blob.core.windows.net/cpt/[identifier]
    const identifier = identifierValue.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `https://sdrmsagain${dataLocation}.blob.core.windows.net/cpt/${identifier}`;
  };

  const handleCopySASToken = async () => {
    if (dataLocation) {
      // Generate mock SAS token for demonstration
      const sasToken = `sp=r&st=2026-01-28T10:00:00Z&se=2026-02-04T18:00:00Z&sv=2023-01-03&sr=c&sig=MockSASTokenSignature${Date.now()}`;
      
      try {
        await navigator.clipboard.writeText(sasToken);
        toast.success("SAS Token copied to clipboard");
      } catch (error) {
        try {
          const textArea = document.createElement("textarea");
          textArea.value = sasToken;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          document.execCommand('copy');
          textArea.remove();
          toast.success("SAS Token copied to clipboard");
        } catch (fallbackErr) {
          console.error("Failed to copy:", error, fallbackErr);
          toast.error("Unable to copy to clipboard");
        }
      }
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Complete":
        return "bg-[#dff6dd] text-[#107c10] border-[#107c10]";
      case "In Progress":
        return "bg-[#fff4ce] text-[#8a8100] border-[#8a8100]";
      case "Failed":
        return "bg-[#fde7e9] text-[#d13438] border-[#d13438]";
      case "Blocked":
        return "bg-[#fde7e9] text-[#d13438] border-[#d13438]";
      default:
        return "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Not Started":
        return <Clock className="w-3 h-3 mr-1.5 shrink-0" />;
      case "In Progress":
        return <Wrench className="w-3 h-3 mr-1.5 shrink-0" />;
      case "Complete":
        return <CheckCircle2 className="w-3 h-3 mr-1.5 shrink-0" />;
      case "Failed":
        return <AlertCircle className="w-3 h-3 mr-1.5 shrink-0" />;
      case "Blocked":
        return <XCircle className="w-3 h-3 mr-1.5 shrink-0" />;
      default:
        return null;
    }
  };

  // Pipeline dot color helper (matches automated jobs)
  const getDotColor = (status: string) => {
    switch (status) {
      case "Complete": return "bg-[#107c10]";
      case "Started": return "bg-[#0078d4] animate-pulse";
      case "Failed": return "bg-[#a4262c]";
      case "No Data": return "bg-[#ca5010]";
      default: return "bg-[#c8c6c4]";
    }
  };

  // Build a job key for a category using the parent's getJobKey or fallback
  const buildJobKey = (categoryKey: string) => {
    if (getJobKey) {
      return getJobKey(categoryKey, "consumer");
    }
    // Legacy fallback (dash-separated) — shouldn't be used if parent passes getJobKey
    if (identifierId && serviceKey) {
      return `${identifierId}|${serviceKey}|${categoryKey}|consumer`;
    }
    return undefined;
  };

  return (
    <Card className="border-l-4 border-l-amber-500 shadow-sm">
      {/* Header */}
      <div className="bg-amber-50 px-4 py-3 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-amber-600" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#323130]">{serviceName}</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                  Manual Collection
                </Badge>
              </div>
              <p className="text-xs text-[#605e5c] mt-0.5">
                {identifierValue} ({identifierType}){taskId && <span className="ml-2">· Task ID: <span className="font-mono">{taskId}</span></span>}
              </p>
            </div>
          </div>
          
          {/* Check Accounts Information */}
          {(accountDataLocation || accountType || primaryIdentifier || relatedIdentifiers.length > 0) && (
            <div className="flex flex-col gap-1.5 text-xs">
              {accountDataLocation && (
                <div className="flex items-center gap-2">
                  <span className="text-[#605e5c] font-medium">User Storage Location:</span>
                  <Badge variant="outline" className="bg-white text-[#323130] border-[#d1cfce] text-xs">
                    {accountDataLocation}
                  </Badge>
                </div>
              )}
              {accountType && (
                <div className="flex items-center gap-2">
                  <span className="text-[#605e5c] font-medium">Account Type:</span>
                  <Badge variant="outline" className="bg-white text-[#323130] border-[#d1cfce] text-xs">
                    {accountType}
                  </Badge>
                </div>
              )}
              {primaryIdentifier && (
                <div className="flex items-center gap-2">
                  <span className="text-[#605e5c] font-medium">Primary ID:</span>
                  <CopyableIdentifier value={primaryIdentifier} copyLabel="Copy primary identifier" />
                </div>
              )}
              {relatedIdentifiers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[#605e5c] font-medium">Related IDs:</span>
                  <div className="flex flex-wrap gap-1">
                    {relatedIdentifiers.map((id, idx) => (
                      <CopyableIdentifier key={idx} value={id} variant="badge" copyLabel="Copy related identifier" badgeClassName="bg-white text-[#323130] border-[#d1cfce] text-xs" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-5 space-y-5">
        {/* Step 1: Content Boundary */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-[#0078d4] text-white flex items-center justify-center text-xs font-semibold">
              1
            </div>
            <Label className="text-[#323130] font-semibold">
              Content Boundary {isLocationRequired && <span className="text-[#d13438]">*</span>}
            </Label>
          </div>
          <div className="flex gap-2 ml-8">
            <Select
              value={dataLocation}
              onValueChange={setDataLocation}
            >
              <SelectTrigger
                id="data-location"
                className={cn(
                  "h-9 flex-1",
                  isLocationRequired && !dataLocation && "border-[#d13438]"
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={!dataLocation}
              onClick={handleCopyLocation}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3"
                    disabled={!dataLocation}
                    onClick={handleCopySASToken}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy SAS Token
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Collection Point: {getCollectionPointPath()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-[#605e5c] ml-8">
            Network path or cloud storage URL where {serviceName} data files are stored
          </p>
          {isLocationRequired && !dataLocation && (
            <p className="text-xs text-[#d13438] flex items-center gap-1 ml-8">
              <AlertCircle className="w-3 h-3" />
              Content boundary is required when any collection is complete
            </p>
          )}
        </div>

        {/* Step 2: Data Categories Collection Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#0078d4] text-white flex items-center justify-center text-xs font-semibold">
              2
            </div>
            <div className="flex-1">
              <Label className="text-[#323130] font-semibold">
                Collection Status by Data Category
              </Label>
              {dateRangeStart && dateRangeEnd && (
                <p className="text-xs text-[#605e5c] mt-0.5">
                  Fulfillment Plan Coverage: {new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(dateRangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
          
          <div className="ml-8 space-y-2">
            {categories.map((category) => {
              const currentStatus = categoryStatuses[category.categoryKey];
              const hasStatusChanged = currentStatus !== (category.collectionStatus || "Not Started");
              
              // Build the job key using the parent's key builder for consistent selection
              const jobKey = buildJobKey(category.categoryKey);
              
              // Determine saved pipeline statuses
              const savedColStatus = category.collectionStatus || "Not Started";
              const pubStatus = category.publishStatus || "Not Started";
              const delStatus = category.deliveryStatus || "Not Started";
              
              // Determine pipeline action eligibility based on saved (not local) statuses
              const isCollectionComplete = savedColStatus === "Complete";
              const isPublishable = isCollectionComplete && (pubStatus === "Not Started");
              const isDeliverable = pubStatus === "Complete" && (delStatus === "Not Started");
              const isFullyComplete = delStatus === "Complete" || savedColStatus === "No Data" || savedColStatus === "Failed";
              
              // Has the job entered the publish/delivery pipeline?
              const isInPipeline = isCollectionComplete && pubStatus !== "Not Started";

              // Determine current pipeline phase and status (matches automated tracker)
              const getCurrentStage = () => {
                if (delStatus === "Complete") return { phase: "Delivery", status: "Complete", color: "text-[#107c10]" };
                if (delStatus === "Failed") return { phase: "Delivery", status: "Failed", color: "text-[#a4262c]" };
                if (delStatus === "Blocked") return { phase: "Delivery", status: "Blocked", color: "text-[#d83b01]" };
                if (delStatus === "Started" || delStatus === "In Progress") return { phase: "Delivery", status: "In Progress", color: "text-[#ca5010]" };
                if (pubStatus === "Complete") return { phase: "Package", status: "Complete", color: "text-[#107c10]" };
                if (pubStatus === "Failed") return { phase: "Package", status: "Failed", color: "text-[#a4262c]" };
                if (pubStatus === "Blocked") return { phase: "Package", status: "Blocked", color: "text-[#d83b01]" };
                if (pubStatus === "Started" || pubStatus === "In Progress") return { phase: "Package", status: "In Progress", color: "text-[#8764b8]" };
                if (savedColStatus === "Complete") return { phase: "Collection", status: "Complete", color: "text-[#107c10]" };
                if (savedColStatus === "No Data") return { phase: "Collection", status: "No Data", color: "text-[#ca5010]" };
                if (savedColStatus === "Failed") return { phase: "Collection", status: "Failed", color: "text-[#a4262c]" };
                if (savedColStatus === "Blocked") return { phase: "Collection", status: "Blocked", color: "text-[#d83b01]" };
                if (savedColStatus === "Started" || savedColStatus === "In Progress") return { phase: "Collection", status: "In Progress", color: "text-[#0078d4]" };
                return { phase: "Collection", status: "Not Started", color: "text-[#605e5c]" };
              };
              const currentStage = getCurrentStage();

              const rowHighlight = "border-[#edebe9]";
              
              return (
                <div
                  key={category.categoryKey}
                  className={cn(
                    "flex items-center justify-between p-3 bg-white border rounded hover:border-[#c8c6c4] transition-colors",
                    rowHighlight
                  )}
                >
                  <div className={cn(
                    "flex-1 grid grid-cols-1 gap-4 items-center",
                    isInPipeline
                      ? "md:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_0.8fr]"
                      : "md:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr]"
                  )}>
                    {/* Category Name */}
                    <div>
                      <p className="text-sm font-medium text-[#323130]">
                        {category.categoryName}
                      </p>
                    </div>
                    {/* Job IDs — merged C/P/D when in pipeline, single collection ID otherwise */}
                    <div>
                      {isInPipeline ? (
                        <>
                          <p className="text-xs text-[#605e5c] mb-1">Job IDs</p>
                          <div className="space-y-0.5">
                            {[
                              { label: "C", id: category.jobId },
                              { label: "P", id: category.publishJobId },
                              { label: "D", id: category.deliveryJobId },
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
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-[#605e5c] mb-1">Collection Job ID</p>
                          {category.jobId ? (
                            <CopyableText text={category.jobId} copyLabel="Copy job ID">
                              <p className="text-xs font-mono text-[#323130]">
                                {category.jobId}
                              </p>
                            </CopyableText>
                          ) : (
                            <p className="text-xs font-mono text-[#a19f9d] italic">
                              Not assigned
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {/* Collection Status — read-only badge when in pipeline, dropdown otherwise */}
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Collection Status</p>
                      {isInPipeline ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-xs flex items-center gap-1 w-fit bg-[#dff6dd] text-[#107c10] border-[#107c10] cursor-default"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Complete
                                <Info className="w-3 h-3 ml-0.5 text-[#107c10]/60" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <div className="space-y-1.5 py-0.5">
                                <p className="text-xs font-medium text-[#323130]">Collection Complete</p>
                                <div className="flex items-center gap-1.5 text-xs text-[#605e5c]">
                                  <User className="w-3 h-3 shrink-0" />
                                  <span>Updated by: <span className="font-medium text-[#323130]">{category.lastUpdatedBy || "Unknown"}</span></span>
                                </div>
                                {category.lastUpdatedAt && (
                                  <p className="text-[11px] text-[#605e5c]">
                                    {new Date(category.lastUpdatedAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Select 
                          value={currentStatus} 
                          onValueChange={(value) => handleCategoryStatusChange(category.categoryKey, value)}
                        >
                          <SelectTrigger className={cn(
                            "h-8 text-xs border rounded-md",
                            getStatusBadgeStyle(currentStatus)
                          )}>
                            <span className="flex items-center">
                              <SelectValue />
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not Started">
                              <span className="flex items-center"><Clock className="w-3 h-3 mr-1.5" />Not Started</span>
                            </SelectItem>
                            <SelectItem value="In Progress">
                              <span className="flex items-center"><Wrench className="w-3 h-3 mr-1.5" />In Progress</span>
                            </SelectItem>
                            <SelectItem value="Complete">
                              <span className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1.5" />Complete</span>
                            </SelectItem>
                            <SelectItem value="Failed">
                              <span className="flex items-center"><AlertCircle className="w-3 h-3 mr-1.5" />Failed</span>
                            </SelectItem>
                            <SelectItem value="No Data">
                              <span className="flex items-center"><MinusCircle className="w-3 h-3 mr-1.5" />No Data</span>
                            </SelectItem>
                            <SelectItem value="Blocked">
                              <span className="flex items-center"><XCircle className="w-3 h-3 mr-1.5" />Blocked</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {/* Pipeline C → P → D with integrated phase status */}
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1.5">Pipeline</p>
                      <div className="flex items-center gap-0">
                        <div className="flex flex-col items-center">
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", getDotColor(savedColStatus))} title={`Collection: ${savedColStatus}`}>
                            {savedColStatus === "Complete" ? <CheckCircle2 className="w-3 h-3 text-white" /> : savedColStatus === "Failed" ? <XCircle className="w-3 h-3 text-white" /> : <span className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                          </div>
                          <span className="text-[9px] text-[#605e5c] mt-0.5">C</span>
                        </div>
                        <div className={cn("w-4 h-0.5 mt-[-8px]", savedColStatus === "Complete" ? "bg-[#107c10]" : "bg-[#edebe9]")} />
                        <div className="flex flex-col items-center">
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", getDotColor(pubStatus))} title={`Package: ${pubStatus}`}>
                            {pubStatus === "Complete" ? <CheckCircle2 className="w-3 h-3 text-white" /> : <span className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                          </div>
                          <span className="text-[9px] text-[#605e5c] mt-0.5">P</span>
                        </div>
                        <div className={cn("w-4 h-0.5 mt-[-8px]", pubStatus === "Complete" ? "bg-[#107c10]" : "bg-[#edebe9]")} />
                        <div className="flex flex-col items-center">
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", getDotColor(delStatus))} title={`Delivery: ${delStatus}`}>
                            {delStatus === "Complete" ? <CheckCircle2 className="w-3 h-3 text-white" /> : <span className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                          </div>
                          <span className="text-[9px] text-[#605e5c] mt-0.5">D</span>
                        </div>
                      </div>
                      {/* Integrated phase status text below pipeline dots */}
                      {isInPipeline && (
                        <p className={cn("text-[11px] font-medium mt-1.5", currentStage.color)}>
                          <span className="text-[#605e5c]">{currentStage.phase}:</span> {currentStage.status}
                        </p>
                      )}
                      {/* Non-actionable status badges integrated into pipeline area */}
                      {!isPublishable && !isDeliverable && (
                        <div className="mt-1.5">
                          {isFullyComplete ? (
                            <div className="flex items-center gap-1 text-[11px] text-[#107c10]">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{savedColStatus === "No Data" ? "No Data" : savedColStatus === "Failed" ? "Failed" : "Done"}</span>
                            </div>
                          ) : pubStatus === "Started" ? (
                            <div className="flex items-center gap-1 text-[11px] text-[#8764b8]">
                              <Package className="w-3 h-3" />
                              <span>Preparing</span>
                            </div>
                          ) : delStatus === "Started" ? (
                            <div className="flex items-center gap-1 text-[11px] text-[#ca5010]">
                              <Truck className="w-3 h-3" />
                              <span>Delivering</span>
                            </div>
                          ) : !isCollectionComplete ? (
                            <div className="flex items-center gap-1 text-[11px] text-[#605e5c]">
                              <Clock className="w-3 h-3" />
                              <span>Collecting</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    {/* Last Updated */}
                    <div>
                      <p className="text-xs text-[#605e5c] mb-1">Last Updated</p>
                      {hasStatusChanged ? (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Pending save
                        </span>
                      ) : category.lastUpdatedAt ? (
                        <p className="text-xs text-[#323130]">
                          {new Date(category.lastUpdatedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      ) : (
                        <p className="text-xs text-[#a19f9d]">N/A</p>
                      )}
                    </div>
                    {/* Collection Updated By — only shown when not in pipeline (available via badge tooltip when in pipeline) */}
                    {!isInPipeline && (
                      <div>
                        <p className="text-xs text-[#605e5c] mb-1">Collection Updated By</p>
                        {hasStatusChanged ? (
                          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Pending save
                          </span>
                        ) : category.lastUpdatedBy ? (
                          <div className="flex items-center gap-1 text-xs text-[#323130]">
                            <User className="w-3 h-3 text-[#605e5c]" />
                            <span className="font-medium">{category.lastUpdatedBy}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-[#a19f9d]">N/A</p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Pipeline Action Column — only rendered for actionable states */}
                  {(isPublishable || isDeliverable) && (
                    <div className="flex-shrink-0 ml-3 pl-3 border-l border-[#edebe9] flex items-center gap-2">
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
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Collection Notes — rich-text + attachments via the shared
            NoteFieldEditor so manual-collection notes carry the same
            formatting capabilities as a Case Note. */}
        <div className="space-y-2">
          <NoteFieldEditor
            id="collection-notes"
            label="Collection Notes (Optional)"
            subType="manual-collection"
            value={collectionNotes}
            onChange={setCollectionNotes}
            attachments={collectionNotesAttachments}
            onAttachmentsChange={setCollectionNotesAttachments}
            placeholder="Add notes about the manual collection process, contact information, or any issues encountered…"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#edebe9]">
          <div className="flex items-center gap-2 text-sm">
            {hasChanges ? (
              <div className="flex items-center gap-1.5 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span>Unsaved changes</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[#107c10]">
                <CheckCircle2 className="w-4 h-4" />
                <span>All changes saved</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCategoryStatuses(initialCategoryStatuses);
                setDataLocation(initialDataLocation);
                setCollectionNotes(initialCollectionNotes);
              }}
              disabled={!hasChanges || isSaving}
              className="h-9"
            >
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || !isValid || isSaving}
              className="h-9 bg-[#0078d4] hover:bg-[#106ebe] text-white"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Status Update
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}