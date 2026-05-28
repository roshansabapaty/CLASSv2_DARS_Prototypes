import React, { useState } from "react";
import { Resizable } from "re-resizable";
import { Button } from "./ui/button";
import { FulfillmentWizard } from "./FulfillmentWizard";
import {
  X,
  FileText,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "./ui/utils";
import { IDENTIFIER_TYPES, IDENTIFIER_FORMAT_RULES } from "../constants/caseConstants";

interface IdentifierPanelProps {
  isOpen: boolean;
  onClose: () => void;
  identifiers: any[];
  formData: any;
  onUpdateIdentifier: (id: string, updates: any) => void;
  identifierDisplayData: any;
  expandedIdentifiers: any;
  toggleIdentifierExpanded: (id: string) => void;
  expandAllIdentifiers: () => void;
  collapseAllIdentifiers: () => void;
  identifierViewMode: "summary" | "detailed" | "fulfillment";
  setIdentifierViewMode: (mode: "summary" | "detailed" | "fulfillment") => void;
  handleCheckAccountExistence: () => void;
  checkingExistence: boolean;
  identifierSummaryStats: any;
  handleUpdateTaskStatus: (id: string, status: any) => void;
  getTaskStatusConfig: (status: any) => any;
  TASK_STATUS_CONFIG: any;
  formatStorageLocation: (location: string) => string;
  doesStorageCountryMatch: (location: string) => boolean;
  handleAddAliasAsIdentifier: (alias: string, sourceIdentifierId: string) => void;
  handleAddAliasToCategory: (alias: string, identifierId: string, serviceKey: string) => void;
  onAddIdentifier: (identifier: any) => void;
  onToggleDocumentPanel?: () => void;
  documentPanelOpen?: boolean;
  documentPanelWidth?: number;
  sidebarCollapsed?: boolean;
  fulfillmentInitialStep?: 1 | 2 | 3;
  setFulfillmentInitialStep?: (step: 1 | 2 | 3) => void;
  announce?: (message: string) => void;
  /** Callback emitting fulfillment wizard nav state for the sidebar */
  onStepperStateChange?: (state: any) => void;
  /** External request to navigate to a specific step key (from sidebar click) */
  requestedStepKey?: string | null;
  isEditingCollectionScope?: boolean;
  onServiceConfigChange?: (config: any) => void;
  onSubmitAdditionalJobs?: () => void;
  /** Acknowledge a case-level Cancelled / Withdrawn authorization (Phase 5c.3). */
  onAcknowledgeAuthorizationStatus?: () => void;
  /** Run the account-existence check for a specific subset of identifiers
   *  (Phase 5b.4a). When the array is empty, runs against all identifiers. */
  onCheckAccountsForIdentifiers?: (identifierIds: string[]) => void | Promise<void>;
  /** Fires when the user clicks "Complete Wizard" on Step 3. Parent uses
   *  the payload's `caseWideStartDate / caseWideEndDate` to sync top-level
   *  `formData.startDate / endDate` so the case-form submit gate passes
   *  end-to-end Triage → Collection. */
  onWizardComplete?: (fulfillmentData: any) => void;
}

export function IdentifierPanel({
  isOpen,
  onClose,
  identifiers,
  formData,
  onUpdateIdentifier,
  identifierDisplayData,
  expandedIdentifiers,
  toggleIdentifierExpanded,
  expandAllIdentifiers,
  collapseAllIdentifiers,
  identifierViewMode,
  setIdentifierViewMode,
  handleCheckAccountExistence,
  checkingExistence,
  identifierSummaryStats,
  handleUpdateTaskStatus,
  getTaskStatusConfig,
  TASK_STATUS_CONFIG,
  formatStorageLocation,
  doesStorageCountryMatch,
  handleAddAliasAsIdentifier,
  handleAddAliasToCategory,
  onAddIdentifier,
  onToggleDocumentPanel,
  documentPanelOpen,
  documentPanelWidth = 600,
  sidebarCollapsed = false,
  fulfillmentInitialStep: externalFulfillmentInitialStep,
  setFulfillmentInitialStep: externalSetFulfillmentInitialStep,
  announce,
  onStepperStateChange,
  requestedStepKey,
  isEditingCollectionScope = false,
  onServiceConfigChange,
  onSubmitAdditionalJobs,
  onAcknowledgeAuthorizationStatus,
  onCheckAccountsForIdentifiers,
  onWizardComplete,
}: IdentifierPanelProps) {
  const [panelWidth, setPanelWidth] = useState(650);
  const [internalFulfillmentInitialStep, setInternalFulfillmentInitialStep] = useState<1 | 2 | 3>(1);
  
  // Use external state if provided, otherwise use internal state
  const fulfillmentInitialStep = externalFulfillmentInitialStep ?? internalFulfillmentInitialStep;
  const setFulfillmentInitialStep = externalSetFulfillmentInitialStep ?? setInternalFulfillmentInitialStep;

  if (!isOpen) return null;

  return (
    <div 
      className="absolute inset-0 z-40 bg-white transition-all duration-300"
      style={{
        right: documentPanelOpen ? documentPanelWidth : 0,
      }}
    >
      <div className="h-full flex flex-col">
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Always show Fulfillment Wizard */}
          <FulfillmentWizard
            identifiers={identifiers}
            formData={formData}
            onUpdateIdentifier={onUpdateIdentifier}
            onClose={onClose}
            initialStep={fulfillmentInitialStep}
            onAddIdentifier={onAddIdentifier}
            handleCheckAccountExistence={handleCheckAccountExistence}
            checkingExistence={checkingExistence}
            identifierSummaryStats={identifierSummaryStats}
            IDENTIFIER_TYPES={IDENTIFIER_TYPES}
            IDENTIFIER_FORMAT_RULES={IDENTIFIER_FORMAT_RULES}
            announce={announce}
            onToggleDocumentPanel={onToggleDocumentPanel}
            documentPanelOpen={documentPanelOpen}
            onStepperStateChange={onStepperStateChange}
            requestedStepKey={requestedStepKey}
            isEditingCollectionScope={isEditingCollectionScope}
            onServiceConfigChange={onServiceConfigChange}
            onSubmitAdditionalJobs={onSubmitAdditionalJobs}
            onAcknowledgeAuthorizationStatus={onAcknowledgeAuthorizationStatus}
            onCheckAccountsForIdentifiers={onCheckAccountsForIdentifiers}
            onComplete={onWizardComplete}
          />
        </div>
      </div>
    </div>
  );
}