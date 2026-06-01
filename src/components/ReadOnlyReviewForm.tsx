import { FormData } from "./DataEntryForm";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { StickyCaseHeader } from "./StickyCaseHeader";
import { CopyableIdentifier } from "./CopyableIdentifier";
import { ETSIDesiredStatusChip } from "./fulfillment-wizard/ETSIDesiredStatusChip";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Edit,
  Check,
  Building,
  User,
  Calendar as CalendarIcon,
  FileText,
  Shield,
  Database,
  Copy
} from "lucide-react";
import { cn } from "./ui/utils";
import { format } from "date-fns";
import { toast } from "sonner@2.0.3";
import { getPriorityDisplayName } from "../utils/caseHelpers";
import {
  IssuingAuthorityDetails,
  ValidatingAuthorityDetails,
  EnforcingAuthorityDetails,
} from "./authority-details/AuthorityDetailsBlocks";
import { RelatedCasesBlock } from "./case-related/RelatedCaseSummaryCard";

interface ReadOnlyReviewFormProps {
  formData: FormData;
  onNavigateToFulfillment?: () => void;
  onNavigateToTriage?: () => void;
  onNavigateToQueue?: () => void;
  /** WorkflowListPane hide-entirely visibility — plumbed from App.tsx. */
  workflowPaneVisible?: boolean;
  onShowWorkflowPane?: () => void;
  workflowActiveStepLabel?: string;
}

export function ReadOnlyReviewForm({
  formData,
  onNavigateToFulfillment,
  onNavigateToTriage,
  onNavigateToQueue,
  workflowPaneVisible,
  onShowWorkflowPane,
  workflowActiveStepLabel,
}: ReadOnlyReviewFormProps) {
  // Copy to clipboard function
  const handleCopy = async (value: string) => {
    try {
      // Try the modern clipboard API first
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard", {
        description: value,
        duration: 2000,
      });
    } catch (error) {
      // Fallback to legacy method if clipboard API fails
      try {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        document.execCommand('copy');
        textArea.remove();
        toast.success("Copied to clipboard", {
          description: value,
          duration: 2000,
        });
      } catch (fallbackErr) {
        console.error("Failed to copy:", error, fallbackErr);
        toast.error("Unable to copy to clipboard");
      }
    }
  };

  // Filter identifiers with provisioned accounts
  const provisionedIdentifiers = formData.identifiers.filter(identifier => {
    // Check if any service has existence results showing provisioned accounts
    const hasProvisionedAccounts = 
      identifier.services.outlook.existenceResults?.some(r => r.accountProvisioned) ||
      identifier.services.teams.existenceResults?.some(r => r.accountProvisioned) ||
      identifier.services.azure.existenceResults?.some(r => r.accountProvisioned);
    
    return hasProvisionedAccounts;
  });

  return (
    <>
      {/* Sticky Case Header with Workflow Progress and Case Info */}
      <StickyCaseHeader
        formData={formData}
        workflowStage="fulfillment"
        onNavigateToTriage={onNavigateToTriage}
        onNavigateToFulfillment={onNavigateToFulfillment}
        onNavigateToQueue={onNavigateToQueue}
        workflowPaneVisible={workflowPaneVisible}
        onShowWorkflowPane={onShowWorkflowPane}
        workflowActiveStepLabel={workflowActiveStepLabel}
      />

      <div className="max-w-7xl mx-auto px-8 pt-[120px] py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[#323130] text-2xl mb-2">Case Review Report</h2>
              <p className="text-[#605e5c]">Review all case details and authorization information</p>
            </div>
          </div>
        </div>

      {/* Case Details Section */}
      <Card className="p-6 mb-6 border-[#e1dfdd]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#323130] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0078d4]" />
            Case Details
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToFulfillment}
            className="text-[#0078d4] hover:text-[#106ebe] hover:bg-[#deecf9] h-8"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
        <Separator className="mb-4 bg-[#e1dfdd]" />
        
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Case ID</span>
            <span className="text-[#323130] font-semibold">{formData.caseId}</span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Create Date</span>
            <span className="text-[#323130]">
              {formData.createDate ? format(formData.createDate, "MMMM d, yyyy") : "—"}
            </span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">LENS Case Number</span>
            <span className="text-[#323130]">{formData.caseNumber || "—"}</span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">LE Reference Number</span>
            <span className="text-[#323130]">{formData.agencyCaseNumber || "—"}</span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Request Type</span>
            <span className="text-[#323130]">{formData.requestType || "—"}</span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Request Sub-Type</span>
            <span className="text-[#323130]">{formData.requestSubType || "—"}</span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Request Origin</span>
            <span className="text-[#323130]">
              {formData.requestOrigin || "—"}
              {formData.requestOrigin === "Other" && formData.requestOriginOther && (
                <span className="text-[#605e5c] text-sm block mt-1">({formData.requestOriginOther})</span>
              )}
            </span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Country</span>
            <span className="text-[#323130]">{formData.country || "—"}</span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Jurisdiction</span>
            <span className="text-[#323130]">{formData.jurisdiction || "—"}</span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Assigned To</span>
            <span className="text-[#323130]">{formData.assigneeName || "—"}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[#605e5c] text-sm block mb-2">Agency</span>
            <span className="text-[#323130]">{formData.agency || "—"}</span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Agency Phone Number</span>
            <span className="text-[#323130]">{formData.agencyPhone || "—"}</span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Agency Address</span>
            <span className="text-[#323130]">
              {formData.agencyAddress.number || formData.agencyAddress.city ? (
                <>
                  {formData.agencyAddress.number && <>{formData.agencyAddress.number}</>}
                  {formData.agencyAddress.city && <>, {formData.agencyAddress.city}</>}
                  {formData.agencyAddress.stateProvince && <>, {formData.agencyAddress.stateProvince}</>}
                  {formData.agencyAddress.postalCode && <> {formData.agencyAddress.postalCode}</>}
                </>
              ) : "—"}
            </span>
          </div>
          {formData.investigators && formData.investigators.length > 0 && (
            <div className="col-span-2">
              <span className="text-[#605e5c] text-sm block mb-2">Investigators</span>
              <div className="space-y-2">
                {formData.investigators.map((investigator, index) => (
                  <div key={investigator.id || index} className="flex items-center gap-4 text-sm">
                    <span className="text-[#323130]">{investigator.name || "—"}</span>
                    <span className="text-[#605e5c]">{investigator.email || "—"}</span>
                    {investigator.role && (
                      <Badge variant="outline" className="text-xs bg-[#f3f2f1]">
                        {investigator.role}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {formData.agents && formData.agents.length > 0 && (
            <div className="col-span-2">
              <span className="text-[#605e5c] text-sm block mb-2">Agents</span>
              <div className="space-y-2">
                {formData.agents.map((agent, index) => (
                  <div key={agent.id || index} className="flex items-center gap-4 text-sm">
                    <span className="text-[#323130]">{agent.name || "—"}</span>
                    <span className="text-[#605e5c]">{agent.email || "—"}</span>
                    {agent.role && (
                      <Badge variant="outline" className="text-xs bg-[#f3f2f1]">
                        {agent.role}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {formData.shieldLawConfirmation && (
            <div className="col-span-2">
              <span className="text-[#605e5c] text-sm block mb-1">Shield Law Confirmation</span>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0078d4]" />
                <span className="text-[#323130]">{formData.shieldLawConfirmation}</span>
              </div>
            </div>
          )}
          <div className="col-span-2">
            <span className="text-[#605e5c] text-sm block mb-2">Nature of Crimes</span>
            <div className="flex flex-wrap gap-2">
              {formData.natureOfCrimes.length > 0 ? (
                formData.natureOfCrimes.map((crime) => (
                  <Badge key={crime} variant="outline" className="bg-[#deecf9] border-[#0078d4] text-[#0078d4]">
                    {crime}
                  </Badge>
                ))
              ) : (
                <span className="text-[#605e5c]">—</span>
              )}
            </div>
          </div>
          {formData.eu27DsaHarms && formData.eu27DsaHarms.length > 0 && (
            <div className="col-span-2">
              <span className="text-[#605e5c] text-sm block mb-2">EU27 DSA Harms</span>
              <div className="flex flex-wrap gap-2">
                {formData.eu27DsaHarms.map((harm) => (
                  <Badge key={harm} variant="outline" className="bg-[#fff4ce] border-[#8a6d3b] text-[#8a6d3b]">
                    {harm}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {formData.eu27DsaHarmsSubCategories && formData.eu27DsaHarmsSubCategories.length > 0 && (
            <div className="col-span-2">
              <span className="text-[#605e5c] text-sm block mb-2">EU27 DSA Harms Sub Categories</span>
              <div className="flex flex-wrap gap-2">
                {formData.eu27DsaHarmsSubCategories.map((subCategory) => (
                  <Badge key={subCategory} variant="outline" className="bg-[#fff4ce] border-[#8a6d3b] text-[#8a6d3b]">
                    {subCategory}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Case Priority</span>
            {formData.casePriority && (
              <Badge className={cn(
                "text-xs",
                formData.casePriority === "Emergency" ? "bg-red-50 text-red-700 border-red-200" :
                formData.casePriority === "Urgent" ? "bg-orange-50 text-orange-700 border-orange-200" :
                formData.casePriority === "Priority" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                "bg-slate-50 text-slate-700 border-slate-200"
              )}>
                {getPriorityDisplayName(formData.casePriority)}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Authorization Details Section */}
      {(formData.authorizationStartDate || formData.authorizationExpirationDate || formData.authorizationDesiredStatus) && (
        <Card className="p-6 mb-6 border-[#e1dfdd]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#323130] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#107c10]" />
              Authorization Details
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToFulfillment}
              className="text-[#0078d4] hover:text-[#106ebe] hover:bg-[#deecf9] h-8"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
          <Separator className="mb-4 bg-[#e1dfdd]" />
          
          <div className="grid grid-cols-3 gap-6">
            <div>
              <span className="text-[#605e5c] text-sm block mb-1">Authorization Start Date</span>
              <span className="text-[#323130]">
                {formData.authorizationStartDate ? format(formData.authorizationStartDate, "MMMM d, yyyy") : "—"}
              </span>
            </div>
            <div>
              <span className="text-[#605e5c] text-sm block mb-1">Authorization Expiration Date</span>
              <span className="text-[#323130]">
                {formData.authorizationExpirationDate ? format(formData.authorizationExpirationDate, "MMMM d, yyyy") : "—"}
              </span>
            </div>
            <div>
              <span className="text-[#605e5c] text-sm block mb-1">Authorization Desired Status</span>
              <span className="text-[#323130]">{formData.authorizationDesiredStatus || "—"}</span>
            </div>
          </div>

          {/* Approval Details Subsection */}
          {(formData.approvalType || formData.approvalDescription || formData.approvalReferenceNumber || 
            formData.approverName || formData.approverRole || formData.approvalTimestamp || formData.approvalIsEmergency) && (
            <>
              <Separator className="my-6 bg-[#e1dfdd]" />
              <div>
                <h4 className="text-[#323130] font-semibold mb-4">Approval Details</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {formData.approvalType && (
                    <div key="approval-type">
                      <span className="text-[#605e5c] text-sm block mb-1">Approval Type</span>
                      <span className="text-[#323130]">{formData.approvalType}</span>
                    </div>
                  )}
                  {formData.approvalReferenceNumber && (
                    <div key="approval-ref">
                      <span className="text-[#605e5c] text-sm block mb-1">Approval Reference #</span>
                      <span className="text-[#323130]">{formData.approvalReferenceNumber}</span>
                    </div>
                  )}
                  {formData.approverName && (
                    <div key="approver-name">
                      <span className="text-[#605e5c] text-sm block mb-1">Approver Name</span>
                      <span className="text-[#323130]">{formData.approverName}</span>
                    </div>
                  )}
                  {formData.approverRole && (
                    <div key="approver-role">
                      <span className="text-[#605e5c] text-sm block mb-1">Approver Role</span>
                      <span className="text-[#323130]">{formData.approverRole}</span>
                    </div>
                  )}
                  {formData.approvalTimestamp && (
                    <div key="approval-timestamp">
                      <span className="text-[#605e5c] text-sm block mb-1">Approval Timestamp</span>
                      <span className="text-[#323130]">
                        {format(formData.approvalTimestamp, "MMMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  <div key="emergency-approval">
                    <span className="text-[#605e5c] text-sm block mb-1">Emergency Approval</span>
                    <div className="flex items-center gap-2">
                      {formData.approvalIsEmergency ? (
                        <Badge className="bg-[#d13438] text-white text-xs">Emergency</Badge>
                      ) : (
                        <span className="text-[#323130]">Standard</span>
                      )}
                    </div>
                  </div>
                  {formData.approvalDescription && (
                    <div key="approval-description" className="col-span-2">
                      <span className="text-[#605e5c] text-sm block mb-2">Approval Description</span>
                      <div className="text-[#323130] bg-[#faf9f8] p-3 rounded border border-[#e1dfdd]">
                        {formData.approvalDescription}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* eEvidence — IA / VA / EA blocks mirror */}
          {formData.requestType === "eEvidence" && (
            <>
              <Separator className="my-6 bg-[#e1dfdd]" />
              <IssuingAuthorityDetails ia={formData.eevidenceIssuingAuthority} />
              {formData.eevidenceIssuingAuthority?.approvalRole ===
                "OtherCompetentAuthority" && (
                <ValidatingAuthorityDetails va={formData.eevidenceValidatingAuthority} />
              )}
              <EnforcingAuthorityDetails ea={formData.eevidenceEnforcingAuthority} />
            </>
          )}
        </Card>
      )}

      {/* eEvidence — Enterprise Request decision path + Related Cases mirror */}
      {formData.requestType === "eEvidence" &&
        (formData.eevidenceEnterpriseRequest ||
          (formData.eevidenceRelatedCases && formData.eevidenceRelatedCases.length > 0)) && (
          <Card className="p-6 mb-6 border-[#e1dfdd]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#323130] flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#8764b8]" />
                eEvidence Envelope
              </h3>
            </div>
            <Separator className="mb-4 bg-[#e1dfdd]" />

            {formData.eevidenceEnterpriseRequest && (
              <div className="mb-6">
                <h4 className="text-[#323130] font-semibold mb-3">
                  Enterprise Request (UnderlyingConditions)
                </h4>
                <dl className="grid grid-cols-[minmax(280px,auto)_1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-[#605e5c]">Addressed to the controller</dt>
                  <dd className="text-[#323130]">
                    {formData.eevidenceEnterpriseRequest.addressedToController === undefined
                      ? "—"
                      : formData.eevidenceEnterpriseRequest.addressedToController
                      ? "Yes"
                      : "No"}
                  </dd>
                  <dt className="text-[#605e5c]">Addressed to the processor</dt>
                  <dd className="text-[#323130]">
                    {formData.eevidenceEnterpriseRequest.addressedToProcessor === undefined
                      ? "—"
                      : formData.eevidenceEnterpriseRequest.addressedToProcessor
                      ? "Yes"
                      : "No"}
                  </dd>
                  {formData.eevidenceEnterpriseRequest.addressedToProcessorControllerUnidentified !==
                    undefined && (
                    <>
                      <dt className="text-[#605e5c]">Controller cannot be identified</dt>
                      <dd className="text-[#323130]">
                        {formData.eevidenceEnterpriseRequest
                          .addressedToProcessorControllerUnidentified
                          ? "Yes"
                          : "No"}
                      </dd>
                    </>
                  )}
                  {formData.eevidenceEnterpriseRequest
                    .addressedToProcessorDetrimentalToInvestigation !== undefined && (
                    <>
                      <dt className="text-[#605e5c]">
                        Contacting controller detrimental to investigation
                      </dt>
                      <dd className="text-[#323130]">
                        {formData.eevidenceEnterpriseRequest
                          .addressedToProcessorDetrimentalToInvestigation
                          ? "Yes"
                          : "No"}
                      </dd>
                    </>
                  )}
                  {formData.eevidenceEnterpriseRequest.processorShallInformController !==
                    undefined && (
                    <>
                      <dt className="text-[#605e5c]">Microsoft shall inform controller</dt>
                      <dd className="text-[#323130]">
                        {formData.eevidenceEnterpriseRequest.processorShallInformController
                          ? "Yes"
                          : "No"}
                      </dd>
                    </>
                  )}
                  {formData.eevidenceEnterpriseRequest.processorShallNotInformController !==
                    undefined && (
                    <>
                      <dt className="text-[#605e5c]">Microsoft shall NOT inform controller</dt>
                      <dd className="text-[#323130]">
                        {formData.eevidenceEnterpriseRequest.processorShallNotInformController
                          ? "Yes"
                          : "No"}
                      </dd>
                    </>
                  )}
                  {formData.eevidenceEnterpriseRequest.permissionToNotifyUser !==
                    undefined && (
                    <>
                      <dt className="text-[#605e5c]">Permission to notify the user</dt>
                      <dd className="text-[#323130]">
                        {formData.eevidenceEnterpriseRequest.permissionToNotifyUser
                          ? "Yes"
                          : "No"}
                      </dd>
                    </>
                  )}
                  {formData.eevidenceEnterpriseRequest.justification && (
                    <>
                      <dt className="text-[#605e5c]">Justification</dt>
                      <dd className="text-[#323130] whitespace-pre-wrap">
                        {formData.eevidenceEnterpriseRequest.justification}
                      </dd>
                    </>
                  )}
                  {formData.eevidenceEnterpriseRequest.relevantInformation && (
                    <>
                      <dt className="text-[#605e5c]">Relevant Information</dt>
                      <dd className="text-[#323130] whitespace-pre-wrap">
                        {formData.eevidenceEnterpriseRequest.relevantInformation}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {formData.eevidenceRelatedCases &&
              formData.eevidenceRelatedCases.length > 0 && (
                <>
                  {formData.eevidenceEnterpriseRequest && (
                    <Separator className="my-4 bg-[#e1dfdd]" />
                  )}
                  <h4 className="text-[#323130] font-semibold mb-3">
                    Related Case(s)
                  </h4>
                  <RelatedCasesBlock items={formData.eevidenceRelatedCases} />
                </>
              )}
          </Card>
        )}

      {/* Date Range Section */}
      <Card className="p-6 mb-6 border-[#e1dfdd]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#323130] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#0078d4]" />
            Date Range & Time Zone
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToFulfillment}
            className="text-[#0078d4] hover:text-[#106ebe] hover:bg-[#deecf9] h-8"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
        <Separator className="mb-4 bg-[#e1dfdd]" />
        
        <div className="grid grid-cols-3 gap-6">
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Start Date</span>
            <span className="text-[#323130]">
              {formData.startDate ? format(formData.startDate, "MMMM d, yyyy") : "—"}
            </span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">End Date</span>
            <span className="text-[#323130]">
              {formData.endDate ? format(formData.endDate, "MMMM d, yyyy") : "—"}
            </span>
          </div>
          <div>
            <span className="text-[#605e5c] text-sm block mb-1">Time Zone</span>
            <span className="text-[#323130]">{formData.timeZone || "—"}</span>
          </div>
        </div>
      </Card>

      {/* Data Specification - Identifiers with Provisioned Accounts */}
      <Card className="p-6 mb-6 border-[#e1dfdd]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#323130] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#0078d4]" />
            Data Specification - Provisioned Accounts
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToFulfillment}
            className="text-[#0078d4] hover:text-[#106ebe] hover:bg-[#deecf9] h-8"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
        <Separator className="mb-4 bg-[#e1dfdd]" />

        {provisionedIdentifiers.length === 0 ? (
          <div className="text-center py-8 text-[#605e5c]">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-[#c8c6c4]" />
            <p>No provisioned accounts found</p>
            <p className="text-sm mt-1">Please add identifiers with provisioned accounts in the Fulfillment stage</p>
          </div>
        ) : (
          <div className="space-y-6">
            {provisionedIdentifiers.map((identifier) => (
              <Card key={identifier.id} className="p-5 bg-[#faf9f8] border-[#e1dfdd]">
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <CopyableIdentifier value={identifier.value} copyLabel="Copy identifier" className="text-[#323130] font-semibold" />
                    <Badge variant="outline" className="text-xs bg-white border-[#c8c6c4]">
                      {identifier.type}
                    </Badge>
                    <ETSIDesiredStatusChip status={identifier.etsiDesiredStatus} size="extra-small" />
                  </div>
                </div>

                {/* Outlook Service */}
                {identifier.services.outlook.enabled && 
                 identifier.services.outlook.existenceResults?.some(r => r.accountProvisioned) && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded bg-[#0078d4] flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">O</span>
                      </div>
                      <span className="text-[#323130] font-semibold">Outlook</span>
                    </div>
                    <div className="pl-8 space-y-3">
                      {identifier.services.outlook.existenceResults
                        ?.filter(r => r.accountProvisioned)
                        .map((result) => (
                          <div key={result.categoryId} className="text-sm">
                            <div className="flex items-start gap-3 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-[#107c10] flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-[#323130] font-medium">{result.categoryName}</div>
                                <div className="text-[#605e5c] text-xs mt-0.5">
                                  Account Type: {result.accountType}
                                </div>
                              </div>
                            </div>
                            {result.associatedAccounts.length > 0 && (
                              <div className="ml-7 mt-2 space-y-1.5">
                                <div className="text-[#605e5c] text-xs font-medium mb-2">
                                  Associated Accounts ({result.associatedAccounts.length}):
                                </div>
                                {result.associatedAccounts.map((account, index) => (
                                  <div 
                                    key={index} 
                                    className="flex items-center justify-between gap-2 bg-white border border-[#e1dfdd] rounded px-3 py-2 hover:border-[#c8c6c4] transition-colors"
                                  >
                                    <span className="text-[#323130] text-xs font-mono flex-1 truncate">
                                      {account}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopy(account)}
                                      className="h-6 px-2 hover:bg-[#f3f2f1] text-[#0078d4] hover:text-[#106ebe] flex-shrink-0"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Teams Service */}
                {identifier.services.teams.enabled && 
                 identifier.services.teams.existenceResults?.some(r => r.accountProvisioned) && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded bg-[#6264a7] flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">T</span>
                      </div>
                      <span className="text-[#323130] font-semibold">Teams</span>
                    </div>
                    <div className="pl-8 space-y-3">
                      {identifier.services.teams.existenceResults
                        ?.filter(r => r.accountProvisioned)
                        .map((result) => (
                          <div key={result.categoryId} className="text-sm">
                            <div className="flex items-start gap-3 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-[#107c10] flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-[#323130] font-medium">{result.categoryName}</div>
                                <div className="text-[#605e5c] text-xs mt-0.5">
                                  Account Type: {result.accountType}
                                </div>
                              </div>
                            </div>
                            {result.associatedAccounts.length > 0 && (
                              <div className="ml-7 mt-2 space-y-1.5">
                                <div className="text-[#605e5c] text-xs font-medium mb-2">
                                  Associated Accounts ({result.associatedAccounts.length}):
                                </div>
                                {result.associatedAccounts.map((account, index) => (
                                  <div 
                                    key={index} 
                                    className="flex items-center justify-between gap-2 bg-white border border-[#e1dfdd] rounded px-3 py-2 hover:border-[#c8c6c4] transition-colors"
                                  >
                                    <span className="text-[#323130] text-xs font-mono flex-1 truncate">
                                      {account}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopy(account)}
                                      className="h-6 px-2 hover:bg-[#f3f2f1] text-[#0078d4] hover:text-[#106ebe] flex-shrink-0"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Azure Service */}
                {identifier.services.azure.enabled && 
                 identifier.services.azure.existenceResults?.some(r => r.accountProvisioned) && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded bg-[#008ad7] flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">A</span>
                      </div>
                      <span className="text-[#323130] font-semibold">Azure</span>
                    </div>
                    <div className="pl-8 space-y-3">
                      {identifier.services.azure.existenceResults
                        ?.filter(r => r.accountProvisioned)
                        .map((result) => (
                          <div key={result.categoryId} className="text-sm">
                            <div className="flex items-start gap-3 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-[#107c10] flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-[#323130] font-medium">{result.categoryName}</div>
                                <div className="text-[#605e5c] text-xs mt-0.5">
                                  Account Type: {result.accountType}
                                </div>
                              </div>
                            </div>
                            {result.associatedAccounts.length > 0 && (
                              <div className="ml-7 mt-2 space-y-1.5">
                                <div className="text-[#605e5c] text-xs font-medium mb-2">
                                  Associated Accounts ({result.associatedAccounts.length}):
                                </div>
                                {result.associatedAccounts.map((account, index) => (
                                  <div 
                                    key={index} 
                                    className="flex items-center justify-between gap-2 bg-white border border-[#e1dfdd] rounded px-3 py-2 hover:border-[#c8c6c4] transition-colors"
                                  >
                                    <span className="text-[#323130] text-xs font-mono flex-1 truncate">
                                      {account}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopy(account)}
                                      className="h-6 px-2 hover:bg-[#f3f2f1] text-[#0078d4] hover:text-[#106ebe] flex-shrink-0"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={onNavigateToFulfillment}
          className="h-10 px-6 border-[#c8c6c4] hover:bg-[#f3f2f1]"
        >
          Back to Fulfillment
        </Button>
        <Button
          className="h-10 px-8 bg-[#0078d4] hover:bg-[#106ebe] text-white"
        >
          <Check className="w-4 h-4 mr-2" />
          Submit Case
        </Button>
      </div>
    </div>
    </>
  );
}