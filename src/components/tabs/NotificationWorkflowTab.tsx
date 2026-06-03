import React, { useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { PrimaryCard } from "../CardTier";
import { CollapsibleSection } from "../CollapsibleSection";
import { NoteFieldEditor } from "../NoteFieldEditor";
import {
  Send,
  Shield,
  User,
  Building,
  Mail,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Check,
  Edit2,
  Trash2,
  Lock,
  Copy,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../ui/utils";
import type {
  FormData,
  NonDisclosureOrder,
  UserNotificationRecord,
  AccountIdentifier,
} from "../../types/caseTypes";

interface SectionsManager {
  isOpen: (sectionId: string) => boolean;
  toggle: (sectionId: string) => void;
}

export type NotificationSubTab =
  | "non-disclosure"
  | "controller"
  | "user";

export interface NotificationWorkflowTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  sections: SectionsManager;
  // NDO management
  showAddNDO: boolean;
  setShowAddNDO: (show: boolean) => void;
  currentNDO: NonDisclosureOrder;
  setCurrentNDO: React.Dispatch<React.SetStateAction<NonDisclosureOrder>>;
  handleSaveNewNDO: () => void;
  handleClearNDOForm: () => void;
  handleEditSavedNDO: (id: string) => void;
  handleDeleteSavedNDO: (id: string) => void;
  ndoStatusMap: Record<string, string>;
  /** Externally controlled active sub-tab (so Step 4 banners can deep-link
   *  via `setActiveSubTab("controller")` etc.). When undefined, internal
   *  state drives the active tab. */
  activeSubTab?: NotificationSubTab;
  setActiveSubTab?: (next: NotificationSubTab) => void;
}

export function NotificationWorkflowTab({
  formData,
  setFormData,
  sections,
  showAddNDO,
  setShowAddNDO,
  currentNDO,
  setCurrentNDO,
  handleSaveNewNDO,
  handleClearNDOForm,
  handleEditSavedNDO,
  handleDeleteSavedNDO,
  ndoStatusMap,
  activeSubTab: externalActiveSubTab,
  setActiveSubTab: externalSetActiveSubTab,
}: NotificationWorkflowTabProps) {
  // Local fallback for the active sub-tab when the parent doesn't control
  // it (e.g. when the user isn't deep-linking from a Step 4 banner).
  const [internalActiveSubTab, setInternalActiveSubTab] =
    useState<NotificationSubTab>("non-disclosure");
  const activeSubTab = externalActiveSubTab ?? internalActiveSubTab;
  const setActiveSubTab = externalSetActiveSubTab ?? setInternalActiveSubTab;

  // Local UI state - only used within this tab
  const [showUserNotificationDetails, setShowUserNotificationDetails] = useState(false);

  // ── Derived flags for tab visibility ─────────────────────────────────
  const checkedIdentifiers = (formData.identifiers ?? []).filter(
    (id) => id.accountExistenceStatus === "success",
  );
  const enterpriseIdentifiers = checkedIdentifiers.filter(
    (id) => id.checkAccounts?.accountType === "Enterprise",
  );
  const consumerIdentifiers = checkedIdentifiers.filter(
    (id) => id.checkAccounts?.accountType === "Consumer",
  );
  const isUserNotificationGated =
    formData.requestType === "eEvidence" ||
    formData.requestType === "COPO Order";
  // Controller tab visible when at least one Enterprise identifier has
  // been confirmed. User Notification tab visible when the request type
  // isn't eEvidence / COPO and a Consumer identifier has been confirmed.
  const showControllerTab = enterpriseIdentifiers.length > 0;
  const showUserTab =
    !isUserNotificationGated && consumerIdentifiers.length > 0;

  return (
    <>
      {/* Notification Workflow Section */}
      <PrimaryCard accent="blue">
        <CollapsibleSection
          sectionId="notification-workflow"
          isOpen={sections.isOpen("notification-workflow")}
          onToggle={() => sections.toggle("notification-workflow")}
          header={
            <>
              <div className="w-8 h-8 bg-[#0078d4] rounded flex items-center justify-center flex-shrink-0">
                <Send className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-[#323130] font-semibold">Non-Disclosure &amp; Notifications</h3>
                <p className="text-xs text-[#605e5c]">Non-disclosure orders, Controller notification, and User notification</p>
              </div>
            </>
          }
          headerActions={null}
          collapsedSummary={
            formData.notificationAllowed ? (
              <Badge variant="outline" className="text-xs">{formData.notificationAllowed === "Yes" ? "Allowed" : "Not Allowed"}</Badge>
            ) : null
          }
        >

          {/* Summary View - Always visible with interactive controls */}
          <div className="bg-[#faf9f8] border border-[#e1dfdd] rounded-lg p-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Non Disclosure Tracking — was "NDO Attached". The
                  toggle still writes the same `formData.ndoAttached`
                  field underneath; renaming just the label keeps the
                  data shape stable for downstream consumers. */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#edebe9]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-sm font-semibold cursor-pointer truncate" htmlFor="ndoAttachedSwitch">
                      Non Disclosure Tracking
                    </Label>
                    {formData.ndoAttached === "Yes" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10] flex-shrink-0" />
                    )}
                  </div>
                </div>
                <Switch
                  id="ndoAttachedSwitch"
                  checked={formData.ndoAttached === "Yes"}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, ndoAttached: checked ? "Yes" : "No" });
                    // Automatically open the Add NDO form when NDO Attached is enabled
                    if (checked) {
                      setShowAddNDO(true);
                      // Scroll to the NDO form after a brief delay to allow rendering
                      setTimeout(() => {
                        const ndoForm = document.getElementById('ndo-details-form');
                        if (ndoForm) {
                          ndoForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 100);
                    }
                  }}
                  className="ml-2"
                />
              </div>

              {/* Notification Allowed - Interactive Switch */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#edebe9]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-sm font-semibold cursor-pointer truncate" htmlFor="notificationAllowedSwitch">
                      Notification Allowed
                    </Label>
                    {formData.notificationAllowed === "Yes" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10] flex-shrink-0" />
                    )}
                  </div>
                </div>
                <Switch
                  id="notificationAllowedSwitch"
                  checked={formData.notificationAllowed === "Yes"}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, notificationAllowed: checked ? "Yes" : "No" })
                  }
                  className="ml-2"
                />
              </div>

              {/* LE Response Status */}
              <div className="p-3 bg-white rounded-lg border border-[#edebe9]">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-semibold truncate">LE Response</Label>
                  {formData.leResponseReceived && formData.leResponseReceived !== "None" ? (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        formData.leResponseReceived === "Proceed with notification" && "bg-[#dff6dd] text-[#107c10] border-[#107c10]",
                        formData.leResponseReceived === "Non-Disclosure Tracking" && "bg-[#fff4ce] text-[#8a6d3b] border-[#8a6d3b]",
                        formData.leResponseReceived === "Withdrawn" && "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]",
                        formData.leResponseReceived === "None" && "bg-[#fde7e9] text-[#d13438] border-[#d13438]"
                      )}
                    >
                      {formData.leResponseReceived === "Proceed with notification" ? "Proceed" : formData.leResponseReceived}
                    </Badge>
                  ) : (
                    <span className="text-xs text-[#605e5c]">Pending</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Three-tab structure: Non-Disclosure / Controller / User ── */}
          <Tabs
            value={activeSubTab}
            onValueChange={(v) => setActiveSubTab(v as NotificationSubTab)}
            className="mt-3"
          >
            <TabsList className="bg-[#f3f2f1] p-1 gap-1 h-auto">
              <TabsTrigger
                value="non-disclosure"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#323130] text-[#605e5c] gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                Non-Disclosure
                {formData.nonDisclosureOrders.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {formData.nonDisclosureOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="controller"
                disabled={!showControllerTab}
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#323130] text-[#605e5c] gap-2"
              >
                <Building className="w-3.5 h-3.5" />
                Controller Notification
                {enterpriseIdentifiers.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {enterpriseIdentifiers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="user"
                disabled={!showUserTab}
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#323130] text-[#605e5c] gap-2"
              >
                <User className="w-3.5 h-3.5" />
                User Notification
                {isUserNotificationGated && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    N/A
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1 — Non-Disclosure ─────────────────────────────── */}
            <TabsContent value="non-disclosure" className="mt-3 space-y-3">
              {/* Alert Banner - Only show when notification is relevant */}
              {(formData.notificationAllowed === "Yes" || formData.nonDisclosureOrders.some(ndo => ndo.status === "Expired")) && (
              <div className="bg-[#fff4ce] border-l-4 border-[#ca5010] rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-[#ca5010] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#323130]">Action Required</h4>
                    <p className="text-xs text-[#605e5c] mt-0.5">
                      {formData.notificationAllowed === "Yes" && formData.nonDisclosureOrders.some(ndo => ndo.status === "Expired") 
                        ? "Complete notification details and address expired NDO(s)."
                        : formData.notificationAllowed === "Yes"
                        ? "Complete notification details below."
                        : "Address expired NDO notification requirements."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUserNotificationDetails(!showUserNotificationDetails)}
                  className="gap-1.5 text-[#0078d4] hover:bg-[#deecf9] h-7 text-xs flex-shrink-0"
                >
                  {showUserNotificationDetails ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Show
                    </>
                  )}
                </Button>
              </div>
              )}

          {/* NDO Details Form - Shown when NDO is attached */}
          {formData.ndoAttached === "Yes" && (
            <div className="space-y-4">
              {/* Saved NDOs List - Show when there are saved NDOs */}
              {formData.nonDisclosureOrders.length > 0 && (
                <div className="bg-white border border-[#e1dfdd] rounded-lg overflow-hidden">
                  <div className="bg-[#8a6d3b] px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-white" />
                      <h4 className="text-white text-sm font-semibold">Saved NDOs</h4>
                      <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs">
                        {formData.nonDisclosureOrders.length}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowAddNDO(true)}
                      className="bg-white/20 text-white hover:bg-white/30 h-7 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add NDO
                    </Button>
                  </div>
                  <div className="p-3 space-y-2">
                    {formData.nonDisclosureOrders.map((ndo, index) => {
                      // Use memoized status to prevent jittering
                      const displayStatus = ndoStatusMap[ndo.id] || ndo.status;
                      
                      return (
                        <div key={ndo.id} className="flex items-start justify-between p-3 bg-[#faf9f8] border border-[#edebe9] rounded-lg hover:border-[#c8c6c4] transition-colors gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[#605e5c] text-xs">#{index + 1}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  displayStatus === "Active" && "bg-[#dff6dd] text-[#107c10] border-[#107c10]",
                                  displayStatus === "Delay Inform" && "bg-[#fff4e6] text-[#ca5010] border-[#ca5010]",
                                  displayStatus === "Expired" && "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]",
                                  displayStatus === "Pending" && "bg-[#fff4ce] text-[#8a6d3b] border-[#8a6d3b]",
                                  displayStatus === "Revoked" && "bg-[#fde7e9] text-[#d13438] border-[#d13438]"
                                )}
                              >
                                {displayStatus}
                              </Badge>
                              {displayStatus === "Expired" && displayStatus !== ndo.status && (
                                <Badge variant="outline" className="bg-[#fff4ce] text-[#8a6d3b] border-[#8a6d3b] text-xs">
                                  Auto-expired
                                </Badge>
                              )}
                              {ndo.temporaryNDO && <Badge variant="outline" className="text-xs">Temp</Badge>}
                            </div>
                            <p className="text-sm font-semibold text-[#323130] truncate">{ndo.name}</p>
                          {ndo.statusReason && (
                            <p className="text-xs text-[#605e5c] mt-0.5 truncate">{ndo.statusReason}</p>
                          )}
                          {ndo.exclusionReason && (
                            <p className="text-xs text-[#605e5c] mt-0.5 truncate">Exclusion: {ndo.exclusionReason}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#605e5c]">
                            {ndo.startDate && <span>{format(ndo.startDate, "MMM d, yyyy")}</span>}
                            {ndo.expirationDate && <span>→ {format(ndo.expirationDate, "MMM d, yyyy")}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSavedNDO(ndo.id)}
                                  className="text-[#0078d4] hover:text-[#106ebe] hover:bg-[#deecf9] h-7 w-7 p-0"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Edit NDO</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSavedNDO(ndo.id)}
                                  className="text-[#a4262c] hover:text-[#d13438] hover:bg-[#fde7e9] h-7 w-7 p-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Delete NDO</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* Add NDO Button - Show when form is collapsed */}
              {!showAddNDO && formData.nonDisclosureOrders.length === 0 && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    onClick={() => setShowAddNDO(true)}
                    className="bg-[#ca5010] text-white hover:bg-[#a44208] gap-2 h-9"
                  >
                    <Plus className="w-4 h-4" />
                    Add Non-Disclosure Tracking
                  </Button>
                </div>
              )}

              {/* NDO Form - Show when expanded */}
              {showAddNDO && (
                <div id="ndo-details-form" className="bg-white border border-[#e1dfdd] rounded-lg overflow-hidden">
                  <div className="bg-[#ca5010] px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-white" />
                      <h4 className="text-white text-sm font-semibold">
                        {formData.nonDisclosureOrders.length > 0 ? 'Add Another NDO' : 'Non-Disclosure Tracking Details'}
                      </h4>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddNDO(false);
                        handleClearNDOForm();
                      }}
                      className="text-white hover:bg-[#a44208] h-7 w-7 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="p-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
                    {/* Non-Disclosure Type — TaskID picker linked to a target
                        identifier. Replaces the previous free-text input. The
                        dropdown shows "{TaskID} — {target identifier value}"
                        so the RS picks the scoped target rather than typing
                        a label. */}
                    <div className="space-y-1">
                      <Label htmlFor="ndoName" className="text-sm font-semibold">
                        Non-Disclosure Type<span className="text-[#a4262c] ml-1">*</span>
                      </Label>
                      <Select
                        value={currentNDO.linkedTaskId ?? ""}
                        onValueChange={(value) => {
                          const target = formData.identifiers.find(
                            (i) => i.taskId === value,
                          );
                          const label = target
                            ? `${target.taskId} — ${target.value}`
                            : value;
                          setCurrentNDO({
                            ...currentNDO,
                            linkedTaskId: value || undefined,
                            // Mirror the picked label into `name` so legacy
                            // consumers that read `ndo.name` keep working.
                            name: label,
                          });
                        }}
                      >
                        <SelectTrigger
                          id="ndoName"
                          className="h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white"
                        >
                          <SelectValue placeholder="Select a target identifier (TaskID)" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.identifiers.length === 0 && (
                            <div className="px-3 py-2 text-xs text-[#605e5c]">
                              No identifiers on this case yet. Add one in
                              Step 4 first.
                            </div>
                          )}
                          {formData.identifiers.map((id) => (
                            <SelectItem key={id.id} value={id.taskId}>
                              <span className="font-mono">{id.taskId}</span>
                              <span className="text-[#605e5c]"> — {id.value}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="ndoStatus" className="text-sm font-semibold">
                          Status<span className="text-[#a4262c] ml-1">*</span>
                        </Label>
                        {currentNDO.status === "Expired" && currentNDO.expirationDate && new Date(currentNDO.expirationDate) < new Date() && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-[#f3f2f1] text-[#605e5c] border-[#8a8886] text-xs h-4 px-1">
                                  Auto
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Auto-set based on expiration date</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <Select value={currentNDO.status} onValueChange={(value) => setCurrentNDO({ ...currentNDO, status: value })}>
                        <SelectTrigger id="ndoStatus" className="h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Delay Inform">Delay Inform</SelectItem>
                          <SelectItem value="Expired">Expired</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Revoked">Revoked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Reason */}
                    <div className="space-y-1">
                      <Label htmlFor="ndoStatusReason" className="text-sm font-semibold">
                        Status Reason
                      </Label>
                      <Select value={currentNDO.statusReason} onValueChange={(value) => setCurrentNDO({ ...currentNDO, statusReason: value })}>
                        <SelectTrigger id="ndoStatusReason" className="h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Court Ordered">Court Ordered</SelectItem>
                          <SelectItem value="Ongoing Investigation">Ongoing Investigation</SelectItem>
                          <SelectItem value="National Security">National Security</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Exclusion Reason */}
                    <div className="space-y-1">
                      <Label htmlFor="ndoExclusionReason" className="text-sm font-semibold">
                        Exclusion Reason
                      </Label>
                      <Select value={currentNDO.exclusionReason} onValueChange={(value) => setCurrentNDO({ ...currentNDO, exclusionReason: value })}>
                        <SelectTrigger id="ndoExclusionReason" className="h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white">
                          <SelectValue placeholder="Select exclusion reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NDO Tracking">NDO Tracking</SelectItem>
                          <SelectItem value="Statutory">Statutory</SelectItem>
                          <SelectItem value="Exemption">Exemption</SelectItem>
                          <SelectItem value="Exempt case/identifier type">Exempt case/identifier type</SelectItem>
                          <SelectItem value="NSO/UTDO/Facial Validity">NSO/UTDO/Facial Validity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Temporary Tracking */}
                    <div className="space-y-1">
                      <Label htmlFor="ndoTemporary" className="text-sm font-semibold">Temporary Tracking</Label>
                      <div className="flex items-center gap-2 h-9">
                        <Switch
                          id="ndoTemporary"
                          checked={currentNDO.temporaryNDO}
                          onCheckedChange={(checked) =>
                            setCurrentNDO({
                              ...currentNDO,
                              temporaryNDO: checked,
                              // Clear the reminder when toggling off so the
                              // scheduled notification is dropped.
                              reminderDateTime: checked
                                ? currentNDO.reminderDateTime
                                : undefined,
                            })
                          }
                        />
                        <Label htmlFor="ndoTemporary" className="cursor-pointer text-sm text-[#323130]">
                          {currentNDO.temporaryNDO ? "Yes" : "No"}
                        </Label>
                      </div>
                    </div>

                    {/* Reminder Date/Time — only when Temporary is ON.
                        Fires a notification to the case's assignee so they
                        re-check the NDO's status before it expires. */}
                    {currentNDO.temporaryNDO && (
                      <div className="space-y-1">
                        <Label
                          htmlFor="ndoReminderDateTime"
                          className="text-sm font-semibold"
                        >
                          Reminder Date/Time
                        </Label>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="ndoReminderDateTime"
                                variant="outline"
                                className={cn(
                                  "flex-1 h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                                  !currentNDO.reminderDateTime && "text-[#605e5c]",
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {currentNDO.reminderDateTime
                                  ? format(currentNDO.reminderDateTime, "MMM d, yyyy")
                                  : "Pick date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={currentNDO.reminderDateTime}
                                onSelect={(date) => {
                                  if (!date) {
                                    setCurrentNDO({
                                      ...currentNDO,
                                      reminderDateTime: undefined,
                                    });
                                    return;
                                  }
                                  // Preserve the time portion if one was
                                  // already set; otherwise default to 09:00.
                                  const prev = currentNDO.reminderDateTime;
                                  const hours = prev ? prev.getHours() : 9;
                                  const minutes = prev ? prev.getMinutes() : 0;
                                  const next = new Date(date);
                                  next.setHours(hours, minutes, 0, 0);
                                  setCurrentNDO({
                                    ...currentNDO,
                                    reminderDateTime: next,
                                  });
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <Input
                            type="time"
                            aria-label="Reminder time"
                            value={
                              currentNDO.reminderDateTime
                                ? format(currentNDO.reminderDateTime, "HH:mm")
                                : ""
                            }
                            onChange={(e) => {
                              const time = e.target.value;
                              if (!time) return;
                              const [h, m] = time.split(":").map((n) => parseInt(n, 10));
                              const base =
                                currentNDO.reminderDateTime ?? new Date();
                              const next = new Date(base);
                              next.setHours(h, m, 0, 0);
                              setCurrentNDO({
                                ...currentNDO,
                                reminderDateTime: next,
                              });
                            }}
                            className="w-28 h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors"
                          />
                        </div>
                        <p className="text-xs text-[#605e5c]">
                          We'll notify the case assignee at this time so they
                          can re-check the non-disclosure status.
                        </p>
                      </div>
                    )}

                    {/* Start Date */}
                    <div className="space-y-1">
                      <Label htmlFor="ndoStartDate" className="text-sm font-semibold">
                        Start Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="ndoStartDate"
                            variant="outline"
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                              !currentNDO.startDate && "text-[#605e5c]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {currentNDO.startDate ? format(currentNDO.startDate, "MMM d, yyyy") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={currentNDO.startDate}
                            onSelect={(date) => setCurrentNDO({ ...currentNDO, startDate: date })}
                            initialFocus 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Expiration Date */}
                    <div className="space-y-1">
                      <Label htmlFor="ndoExpirationDate" className="text-sm font-semibold">
                        Expiration Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="ndoExpirationDate"
                            variant="outline"
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                              !currentNDO.expirationDate && "text-[#605e5c]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {currentNDO.expirationDate ? format(currentNDO.expirationDate, "MMM d, yyyy") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={currentNDO.expirationDate}
                            onSelect={(date) => setCurrentNDO({ ...currentNDO, expirationDate: date })}
                            initialFocus 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Related Cases */}
                    <div className="space-y-1 lg:col-span-2">
                      <Label htmlFor="ndoRelatedCases" className="text-sm font-semibold">
                        Related Cases
                      </Label>
                      <Input
                        id="ndoRelatedCases"
                        value={currentNDO.relatedCases}
                        onChange={(e) => setCurrentNDO({ ...currentNDO, relatedCases: e.target.value })}
                        placeholder="e.g., CASE-001, CASE-002"
                        className="h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors"
                      />
                    </div>

                    {/* Notes — uses the shared NoteFieldEditor so the NDO
                        notes field has the same rich-text formatting +
                        attachment controls as a Case Note. The note's
                        origin (`subType: "ndo"`) is recorded on the
                        editor's data attribute for downstream filtering
                        when these notes are mirrored to the central
                        timeline. */}
                    <div className="space-y-1 lg:col-span-2">
                      <NoteFieldEditor
                        id="ndoNotes"
                        label="Notes"
                        subType="ndo"
                        value={currentNDO.notes ?? ""}
                        onChange={(value) =>
                          setCurrentNDO({ ...currentNDO, notes: value })
                        }
                        attachments={currentNDO.notesAttachments ?? []}
                        onAttachmentsChange={(attachments) =>
                          setCurrentNDO({ ...currentNDO, notesAttachments: attachments })
                        }
                        placeholder="Add any additional notes…"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#edebe9]">
                    <Button
                      type="button"
                      onClick={handleSaveNewNDO}
                      className="bg-[#0078d4] text-white hover:bg-[#106ebe] h-9"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Save NDO
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearNDOForm}
                      className="h-9"
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

            </TabsContent>

            {/* ── Tab 2 — Controller Notification ───────────────────── */}
            <TabsContent value="controller" className="mt-3 space-y-3">
              {showControllerTab ? (
                <div className="space-y-3">
                  {/* eEvidence read-only IA instructions, when applicable */}
                  {formData.requestType === "eEvidence" && formData.eevidenceEnterpriseRequest && (
                    <div className="bg-[#f3f0fa] border border-[#8764b8]/30 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#5c2d91]" />
                        <h4 className="text-sm font-semibold text-[#323130]">
                          Issuing Authority instructions (read-only)
                        </h4>
                      </div>
                      <ul className="text-xs text-[#605e5c] space-y-0.5 ml-6 list-disc">
                        {formData.eevidenceEnterpriseRequest.processorShallInformController === true && (
                          <li>Microsoft <b>shall inform</b> the controller after disclosure.</li>
                        )}
                        {formData.eevidenceEnterpriseRequest.processorShallNotInformController === true && (
                          <li>Microsoft <b>shall NOT inform</b> the controller after disclosure.</li>
                        )}
                        {formData.eevidenceEnterpriseRequest.permissionToNotifyUser === true && (
                          <li>The IA <b>has permitted</b> notification of the data subject (user).</li>
                        )}
                        {formData.eevidenceEnterpriseRequest.permissionToNotifyUser === false && (
                          <li>The IA has <b>withheld</b> permission to notify the data subject (user).</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Per-Enterprise-identifier tenant admin contact list */}
                  <div className="bg-white border border-[#e1dfdd] rounded-lg overflow-hidden">
                    <div className="bg-[#0078d4] px-4 py-2 flex items-center gap-2">
                      <Building className="w-4 h-4 text-white" />
                      <h4 className="text-white text-sm font-semibold">
                        Enterprise tenant admin contacts
                      </h4>
                      <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs">
                        {enterpriseIdentifiers.length}
                      </Badge>
                    </div>
                    <div className="p-3 space-y-2">
                      {enterpriseIdentifiers.map((id) => {
                        const tenantAdminEmail = id.checkAccounts?.tenantAdminEmail;
                        const tenantAdminName = id.checkAccounts?.tenantAdminName;
                        const tenantAdminPhone = id.checkAccounts?.tenantAdminPhone;
                        const tenantDomain = id.checkAccounts?.tenantPrimaryDomain;
                        return (
                          <div
                            key={id.id}
                            className="rounded border border-[#edebe9] bg-[#faf9f8] p-3 text-sm space-y-1"
                          >
                            <div className="text-xs text-[#605e5c]">
                              Target identifier:{" "}
                              <span className="font-mono text-[#323130]">{id.value}</span>
                              {tenantDomain && (
                                <>
                                  {" · Tenant: "}
                                  <span className="font-mono text-[#323130]">{tenantDomain}</span>
                                </>
                              )}
                            </div>
                            {tenantAdminEmail ? (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                {tenantAdminName && (
                                  <span className="text-[#323130]">{tenantAdminName}</span>
                                )}
                                <a
                                  href={`mailto:${tenantAdminEmail}`}
                                  className="font-mono text-[#0078d4] underline"
                                >
                                  {tenantAdminEmail}
                                </a>
                                {tenantAdminPhone && (
                                  <span className="text-[#605e5c]">{tenantAdminPhone}</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      navigator.clipboard?.writeText(tenantAdminEmail);
                                    } catch {
                                      /* clipboard not available — ignore */
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs text-[#0078d4] hover:bg-[#deecf9] border border-transparent hover:border-[#0078d4]/40 transition-colors"
                                  aria-label={`Copy ${tenantAdminEmail}`}
                                >
                                  <Copy className="w-3 h-3" aria-hidden="true" />
                                  Copy
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-[#605e5c] italic">
                                Tenant admin contact not yet captured. Run
                                Check Accounts in Step 4 to retrieve the
                                Enterprise Tenant Profile.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs text-[#605e5c]">
                    Send the controller notification email to each tenant
                    admin listed above. Use the Correspondence Hub or your
                    standard outbound email tooling.
                  </p>

                  {/* Controller Notification Phase — case-level lifecycle
                      tracking for the notification email + the controller's
                      response. Mirrors the LE / User Phase blocks in the
                      User Notification tab but adapted for the controller. */}
                  <div className="bg-white border border-[#e1dfdd] rounded-lg overflow-hidden">
                    <div className="bg-[#0078d4] px-4 py-2 flex items-center gap-2">
                      <Building className="w-4 h-4 text-white" />
                      <h4 className="text-white text-sm font-semibold">
                        Controller Notification Phase
                      </h4>
                    </div>
                    <div className="p-3">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
                        {/* Date of Controller Notification */}
                        <div className="space-y-1">
                          <Label
                            htmlFor="dateOfControllerNotification"
                            className="text-sm font-semibold flex items-center gap-1.5"
                          >
                            Date of Controller Notification
                            {formData.dateOfControllerNotification && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                            )}
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="dateOfControllerNotification"
                                variant="outline"
                                className={cn(
                                  "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                                  !formData.dateOfControllerNotification &&
                                    "text-[#605e5c]",
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.dateOfControllerNotification
                                  ? format(
                                      formData.dateOfControllerNotification,
                                      "MMM d, yyyy",
                                    )
                                  : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.dateOfControllerNotification}
                                onSelect={(date) =>
                                  setFormData({
                                    ...formData,
                                    dateOfControllerNotification: date,
                                  })
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Controller Response Due Date */}
                        <div className="space-y-1">
                          <Label
                            htmlFor="controllerResponseDueDate"
                            className="text-sm font-semibold flex items-center gap-1.5"
                          >
                            Controller Response Due Date
                            {formData.controllerResponseDueDate && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                            )}
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="controllerResponseDueDate"
                                variant="outline"
                                className={cn(
                                  "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                                  !formData.controllerResponseDueDate &&
                                    "text-[#605e5c]",
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.controllerResponseDueDate
                                  ? format(
                                      formData.controllerResponseDueDate,
                                      "MMM d, yyyy",
                                    )
                                  : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.controllerResponseDueDate}
                                onSelect={(date) =>
                                  setFormData({
                                    ...formData,
                                    controllerResponseDueDate: date,
                                  })
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Controller Response Received */}
                        <div className="space-y-1">
                          <Label
                            htmlFor="controllerResponseReceived"
                            className="text-sm font-semibold flex items-center gap-1.5"
                          >
                            Controller Response Received
                            {formData.controllerResponseReceived &&
                              formData.controllerResponseReceived !== "None" && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                              )}
                          </Label>
                          <Select
                            value={formData.controllerResponseReceived ?? ""}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                controllerResponseReceived: value,
                              })
                            }
                          >
                            <SelectTrigger
                              id="controllerResponseReceived"
                              className="h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white"
                            >
                              <SelectValue placeholder="Select response type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Acknowledged">
                                Acknowledged
                              </SelectItem>
                              <SelectItem value="Objected">Objected</SelectItem>
                              <SelectItem value="Awaiting">Awaiting</SelectItem>
                              <SelectItem value="None">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Date of Controller Response */}
                        <div className="space-y-1">
                          <Label
                            htmlFor="dateOfControllerResponse"
                            className="text-sm font-semibold flex items-center gap-1.5"
                          >
                            Date of Controller Response
                            {formData.dateOfControllerResponse && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                            )}
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="dateOfControllerResponse"
                                variant="outline"
                                className={cn(
                                  "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                                  !formData.dateOfControllerResponse &&
                                    "text-[#605e5c]",
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.dateOfControllerResponse
                                  ? format(
                                      formData.dateOfControllerResponse,
                                      "MMM d, yyyy",
                                    )
                                  : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.dateOfControllerResponse}
                                onSelect={(date) =>
                                  setFormData({
                                    ...formData,
                                    dateOfControllerResponse: date,
                                  })
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Controller Response Notes — rich-text + attachments
                            via the shared NoteFieldEditor. */}
                        <div className="space-y-1 lg:col-span-2">
                          <NoteFieldEditor
                            id="controllerResponseNotes"
                            label="Response Notes"
                            subType="controller-response"
                            value={formData.controllerResponseNotes ?? ""}
                            onChange={(value) =>
                              setFormData({
                                ...formData,
                                controllerResponseNotes: value,
                              })
                            }
                            attachments={formData.controllerResponseNotesAttachments ?? []}
                            onAttachmentsChange={(attachments) =>
                              setFormData({
                                ...formData,
                                controllerResponseNotesAttachments: attachments,
                              })
                            }
                            placeholder="Capture the controller's response, objections, or follow-up requests…"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#faf9f8] border border-[#e1dfdd] rounded-lg p-4 text-sm text-[#605e5c]">
                  No Enterprise identifiers detected yet. Run Check Accounts
                  in Step 4 — when an identifier resolves to an Enterprise
                  tenant, the controller notification contact will surface
                  here.
                </div>
              )}
            </TabsContent>

            {/* ── Tab 3 — User Notification ─────────────────────────── */}
            <TabsContent value="user" className="mt-3 space-y-3">
              {isUserNotificationGated && (
                <div className="rounded-md border border-[#605e5c]/30 bg-[#f3f2f1] p-3 text-sm text-[#605e5c]">
                  User notification is not part of the {formData.requestType}{" "}
                  flow. Manage the recipient via the Controller Notification
                  tab (when applicable) or the Correspondence Hub.
                </div>
              )}
              {!isUserNotificationGated && consumerIdentifiers.length === 0 && (
                <div className="bg-[#faf9f8] border border-[#e1dfdd] rounded-lg p-4 text-sm text-[#605e5c]">
                  No Consumer identifiers detected yet. Run Check Accounts
                  in Step 4 — when an identifier resolves to a Consumer
                  account, the user-notification workflow surfaces here.
                </div>
              )}
              {!isUserNotificationGated && consumerIdentifiers.length > 0 && (
                <UserNotificationCards
                  consumerIdentifiers={consumerIdentifiers}
                  formData={formData}
                  setFormData={setFormData}
                />
              )}
              {/* Legacy single-record block below is retired in favour of
                  <UserNotificationCards>. Wrapped in `false &&` so it
                  never renders but stays in source for reference until
                  the new component is confirmed working. */}
              {false && !isUserNotificationGated && consumerIdentifiers.length > 0 && (
                <div className="space-y-3">
                  {/* Law Enforcement Phase */}
                  <div className="bg-white border border-[#e1dfdd] rounded-lg overflow-hidden">
                <div className="bg-[#0078d4] px-4 py-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-white" />
                  <h4 className="text-white text-sm font-semibold">Law Enforcement Phase</h4>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
                    {/* Date of LE Notification */}
                    <div className="space-y-1">
                      <Label htmlFor="dateOfLeNotification" className="text-sm font-semibold flex items-center gap-1.5">
                        Date of LE Notification
                        {formData.dateOfLeNotification && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                        )}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="dateOfLeNotification"
                            variant="outline"
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                              !formData.dateOfLeNotification && "text-[#605e5c]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.dateOfLeNotification ? (
                              format(formData.dateOfLeNotification, "MMM d, yyyy")
                            ) : (
                              "Select date"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dateOfLeNotification}
                            onSelect={(date) =>
                              setFormData({ ...formData, dateOfLeNotification: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* LE Response Due Date */}
                    <div className="space-y-1">
                      <Label htmlFor="leResponseDueDate" className="text-sm font-semibold flex items-center gap-1.5">
                          LE Response Due Date
                        {formData.leResponseDueDate && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                        )}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="leResponseDueDate"
                            variant="outline"
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                              !formData.leResponseDueDate && "text-[#605e5c]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.leResponseDueDate ? (
                              format(formData.leResponseDueDate, "MMM d, yyyy")
                            ) : (
                              "Select date"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.leResponseDueDate}
                            onSelect={(date) =>
                              setFormData({ ...formData, leResponseDueDate: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* LE Response Received */}
                    <div className="space-y-1">
                      <Label htmlFor="leResponseReceived" className="text-sm font-semibold flex items-center gap-1.5">
                        LE Response Received
                        {formData.leResponseReceived && formData.leResponseReceived !== "None" && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                        )}
                      </Label>
                      <Select
                        value={formData.leResponseReceived}
                        onValueChange={(value) => setFormData({ ...formData, leResponseReceived: value })}
                      >
                        <SelectTrigger id="leResponseReceived" className="h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white">
                          <SelectValue placeholder="Select response type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Proceed with notification">Proceed with notification</SelectItem>
                          <SelectItem value="Non-Disclosure Tracking">Non-Disclosure Tracking</SelectItem>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date of LE Response */}
                    <div className="space-y-1">
                      <Label htmlFor="dateOfLeResponse" className="text-sm font-semibold flex items-center gap-1.5">
                        Date of LE Response
                        {formData.dateOfLeResponse && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                        )}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="dateOfLeResponse"
                            variant="outline"
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                              !formData.dateOfLeResponse && "text-[#605e5c]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.dateOfLeResponse ? (
                              format(formData.dateOfLeResponse, "MMM d, yyyy")
                            ) : (
                              "Select date"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dateOfLeResponse}
                            onSelect={(date) =>
                              setFormData({ ...formData, dateOfLeResponse: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Notification Phase */}
              <div className="bg-white border border-[#e1dfdd] rounded-lg overflow-hidden">
                <div className="bg-[#605e5c] px-4 py-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-white" />
                  <h4 className="text-white text-sm font-semibold">User Notification Phase</h4>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
                    {/* Date of User Notification */}
                    <div className="space-y-1">
                      <Label htmlFor="dateOfUserNotification" className="text-sm font-semibold flex items-center gap-1.5">
                        Date of User Notification
                        {formData.dateOfUserNotification && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                        )}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="dateOfUserNotification"
                            variant="outline"
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                              !formData.dateOfUserNotification && "text-[#605e5c]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.dateOfUserNotification ? (
                              format(formData.dateOfUserNotification, "MMM d, yyyy")
                            ) : (
                              "Select date"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dateOfUserNotification}
                            onSelect={(date) =>
                              setFormData({ ...formData, dateOfUserNotification: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* User Response Due Date */}
                    <div className="space-y-1">
                      <Label htmlFor="userResponseDueDate" className="text-sm font-semibold flex items-center gap-1.5">
                        User Response Due Date
                        {formData.userResponseDueDate && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                        )}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="userResponseDueDate"
                            variant="outline"
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                              !formData.userResponseDueDate && "text-[#605e5c]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.userResponseDueDate ? (
                              format(formData.userResponseDueDate, "MMM d, yyyy")
                            ) : (
                              "Select date"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.userResponseDueDate}
                            onSelect={(date) =>
                              setFormData({ ...formData, userResponseDueDate: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* User Response Received */}
                    <div className="space-y-1">
                      <Label htmlFor="userResponseReceived" className="text-sm font-semibold flex items-center gap-1.5">
                        User Response Received
                        {formData.userResponseReceived && formData.userResponseReceived !== "None" && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                        )}
                      </Label>
                      <Select
                        value={formData.userResponseReceived}
                        onValueChange={(value) => setFormData({ ...formData, userResponseReceived: value })}
                      >
                        <SelectTrigger id="userResponseReceived" className="h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white">
                          <SelectValue placeholder="Select response type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Proceed">Proceed</SelectItem>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Quashed">Quashed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date of User Response */}
                    <div className="space-y-1">
                      <Label htmlFor="dateOfUserResponse" className="text-sm font-semibold flex items-center gap-1.5">
                        Date of User Response
                        {formData.dateOfUserResponse && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                        )}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="dateOfUserResponse"
                            variant="outline"
                            className={cn(
                              "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
                              !formData.dateOfUserResponse && "text-[#605e5c]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.dateOfUserResponse ? (
                              format(formData.dateOfUserResponse, "MMM d, yyyy")
                            ) : (
                              "Select date"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dateOfUserResponse}
                            onSelect={(date) =>
                              setFormData({ ...formData, dateOfUserResponse: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
            </TabsContent>
          </Tabs>
        </CollapsibleSection>
      </PrimaryCard>
    </>
  );
}

// ── Per-identifier User Notification ─────────────────────────────────────
// One card per Consumer identifier so the RS can track each
// notification cadence independently. Records persist on
// `formData.userNotifications[identifierId]`. When the map is empty AND
// there's exactly one Consumer identifier, we seed that identifier's
// record from the legacy case-level fields (`formData.dateOfUserNotification`
// etc.) so demo seed data and pre-existing single-record cases survive
// the migration.

interface UserNotificationCardsProps {
  consumerIdentifiers: AccountIdentifier[];
  formData: FormData;
  setFormData: (data: FormData) => void;
}

function UserNotificationCards({
  consumerIdentifiers,
  formData,
  setFormData,
}: UserNotificationCardsProps) {
  const recordFor = (id: AccountIdentifier): UserNotificationRecord => {
    const existing = formData.userNotifications?.[id.id];
    if (existing) return existing;
    // Legacy single-record migration: when the map is empty and there's
    // exactly one Consumer identifier, surface the case-level fields
    // here so any seeded data shows up.
    if (consumerIdentifiers.length === 1 && !formData.userNotifications) {
      return {
        dateOfLeNotification: formData.dateOfLeNotification,
        leResponseDueDate: formData.leResponseDueDate,
        leResponseReceived: formData.leResponseReceived,
        dateOfLeResponse: formData.dateOfLeResponse,
        dateOfUserNotification: formData.dateOfUserNotification,
        userResponseDueDate: formData.userResponseDueDate,
        userResponseReceived: formData.userResponseReceived,
        dateOfUserResponse: formData.dateOfUserResponse,
      };
    }
    return {};
  };

  const patchRecord = (
    id: AccountIdentifier,
    patch: Partial<UserNotificationRecord>,
  ) => {
    const current = recordFor(id);
    const nextRecord = { ...current, ...patch };
    const nextMap = {
      ...(formData.userNotifications ?? {}),
      [id.id]: nextRecord,
    };
    setFormData({ ...formData, userNotifications: nextMap });
  };

  return (
    <div className="space-y-4">
      {consumerIdentifiers.map((identifier, idx) => {
        const record = recordFor(identifier);
        return (
          <div
            key={identifier.id}
            className="bg-white border border-[#e1dfdd] rounded-lg overflow-hidden"
            aria-label={`User notification for ${identifier.value}`}
          >
            {/* Card header — identifier value + position. Lets the RS
                quickly distinguish multiple cards when multiple Consumer
                accounts are in scope. */}
            <div className="bg-[#f3f2f1] px-4 py-2 border-b border-[#e1dfdd] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-[#0078d4] flex-shrink-0" />
                <span className="text-sm font-semibold text-[#323130] truncate">
                  {identifier.value}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-[#deecf9] text-[#0078d4] border-[#0078d4]"
                >
                  Consumer
                </Badge>
              </div>
              {consumerIdentifiers.length > 1 && (
                <span className="text-[11px] text-[#605e5c] whitespace-nowrap">
                  Notification {idx + 1} of {consumerIdentifiers.length}
                </span>
              )}
            </div>

            <div className="p-3 space-y-3">
              {/* ── LE Phase ────────────────────────────────────────── */}
              <div className="border border-[#e1dfdd] rounded-md overflow-hidden">
                <div className="bg-[#0078d4] px-3 py-1.5 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-white" />
                  <h4 className="text-white text-xs font-semibold">
                    Law Enforcement Phase
                  </h4>
                </div>
                <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
                  <DateField
                    id={`le-notif-${identifier.id}`}
                    label="Date of LE Notification"
                    value={record.dateOfLeNotification}
                    onChange={(d) => patchRecord(identifier, { dateOfLeNotification: d })}
                  />
                  <DateField
                    id={`le-due-${identifier.id}`}
                    label="LE Response Due Date"
                    value={record.leResponseDueDate}
                    onChange={(d) => patchRecord(identifier, { leResponseDueDate: d })}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor={`le-resp-${identifier.id}`}
                      className="text-sm font-semibold flex items-center gap-1.5"
                    >
                      LE Response Received
                      {record.leResponseReceived &&
                        record.leResponseReceived !== "None" && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                        )}
                    </Label>
                    <Select
                      value={record.leResponseReceived ?? ""}
                      onValueChange={(value) =>
                        patchRecord(identifier, { leResponseReceived: value })
                      }
                    >
                      <SelectTrigger
                        id={`le-resp-${identifier.id}`}
                        className="h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white"
                      >
                        <SelectValue placeholder="Select response type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Proceed with notification">
                          Proceed with notification
                        </SelectItem>
                        <SelectItem value="Non-Disclosure Tracking">
                          Non-Disclosure Tracking
                        </SelectItem>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DateField
                    id={`le-resp-date-${identifier.id}`}
                    label="Date of LE Response"
                    value={record.dateOfLeResponse}
                    onChange={(d) => patchRecord(identifier, { dateOfLeResponse: d })}
                  />
                </div>
              </div>

              {/* ── User Phase ──────────────────────────────────────── */}
              <div className="border border-[#e1dfdd] rounded-md overflow-hidden">
                <div className="bg-[#605e5c] px-3 py-1.5 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-white" />
                  <h4 className="text-white text-xs font-semibold">
                    User Notification Phase
                  </h4>
                </div>
                <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
                  <DateField
                    id={`user-notif-${identifier.id}`}
                    label="Date of User Notification"
                    value={record.dateOfUserNotification}
                    onChange={(d) => patchRecord(identifier, { dateOfUserNotification: d })}
                  />
                  <DateField
                    id={`user-due-${identifier.id}`}
                    label="User Response Due Date"
                    value={record.userResponseDueDate}
                    onChange={(d) => patchRecord(identifier, { userResponseDueDate: d })}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor={`user-resp-${identifier.id}`}
                      className="text-sm font-semibold flex items-center gap-1.5"
                    >
                      User Response Received
                      {record.userResponseReceived &&
                        record.userResponseReceived !== "None" && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />
                        )}
                    </Label>
                    <Select
                      value={record.userResponseReceived ?? ""}
                      onValueChange={(value) =>
                        patchRecord(identifier, { userResponseReceived: value })
                      }
                    >
                      <SelectTrigger
                        id={`user-resp-${identifier.id}`}
                        className="h-9 border-[#c8c6c4] hover:border-[#605e5c] transition-colors bg-white"
                      >
                        <SelectValue placeholder="Select response type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Proceed">Proceed</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Quashed">Quashed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DateField
                    id={`user-resp-date-${identifier.id}`}
                    label="Date of User Response"
                    value={record.dateOfUserResponse}
                    onChange={(d) => patchRecord(identifier, { dateOfUserResponse: d })}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface DateFieldProps {
  id: string;
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}

function DateField({ id, label, value, onChange }: DateFieldProps) {
  return (
    <div className="space-y-1">
      <Label
        htmlFor={id}
        className="text-sm font-semibold flex items-center gap-1.5"
      >
        {label}
        {value && <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10]" />}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full h-9 justify-start text-left font-normal border-[#c8c6c4] hover:border-[#605e5c] transition-colors",
              !value && "text-[#605e5c]",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "MMM d, yyyy") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}