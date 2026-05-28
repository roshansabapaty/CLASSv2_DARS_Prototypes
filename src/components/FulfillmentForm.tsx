// FulfillmentForm.tsx
// This is a copy of DataEntryForm for the Fulfillment workflow stage
// For now, it uses the same structure and functionality as the Triage stage

import { DataEntryForm as TriageForm, FormData } from "./DataEntryForm";

interface FulfillmentFormProps {
  workflowStage?: "triage" | "fulfillment" | "collection";
  onNavigateToFulfillment?: () => void;
  onNavigateToTriage?: () => void;
  onNavigateToCollection?: () => void;
  onNavigateToReadySubmit?: () => void;
  onNavigateToQueue?: () => void;
  sharedFormData?: FormData | null;
  setSharedFormData?: (data: FormData) => void;
}

export function FulfillmentForm({ 
  workflowStage = "fulfillment", 
  onNavigateToFulfillment, 
  onNavigateToTriage,
  onNavigateToCollection,
  onNavigateToReadySubmit,
  onNavigateToQueue,
  sharedFormData,
  setSharedFormData
}: FulfillmentFormProps = {}) {
  // For now, this is exactly the same as the DataEntryForm (Triage stage)
  // In the future, this will be customized for fulfillment-specific fields and workflows
  return (
    <TriageForm 
      workflowStage={workflowStage} 
      onNavigateToFulfillment={onNavigateToFulfillment} 
      onNavigateToTriage={onNavigateToTriage}
      onNavigateToCollection={onNavigateToCollection}
      onNavigateToReadySubmit={onNavigateToReadySubmit}
      onNavigateToQueue={onNavigateToQueue}
      sharedFormData={sharedFormData}
      setSharedFormData={setSharedFormData}
    />
  );
}