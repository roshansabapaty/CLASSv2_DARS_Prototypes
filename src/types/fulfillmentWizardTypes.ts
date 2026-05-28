/**
 * Fulfillment Wizard Type Definitions
 */

export type WizardStep = 1 | 2 | 3;

export interface FulfillmentWizardProps {
  identifiers: any[];
  formData: any;
  onUpdateIdentifier: (identifier: any) => void;
  onClose: () => void;
  onComplete: (data: any) => void;
  initialStep?: WizardStep;
  onAddIdentifier?: (identifier: any) => void;
  handleCheckAccountExistence?: (identifierIds: string[]) => Promise<void>;
  checkingExistence?: boolean;
  identifierSummaryStats?: {
    total: number;
    checked: number;
    found: number;
    notFound: number;
  };
  IDENTIFIER_TYPES?: string[];
  IDENTIFIER_FORMAT_RULES?: Record<string, any>;
  announce?: (message: string) => void;
  onToggleDocumentPanel?: () => void;
  documentPanelOpen?: boolean;
}

export interface Step1Props {
  identifiers: any[];
  onUpdateIdentifiers: (identifiers: any[]) => void;
  formData?: any;
  announce?: (message: string) => void;
  accountCheckResults: Record<string, any>;
  onUpdateAccountCheckResults: (results: Record<string, any>) => void;
}

export interface Step2Props {
  identifiers: any[];
  serviceConfig: any;
  onUpdateServiceConfig: (config: any) => void;
  announce?: (message: string) => void;
  accountCheckResults: Record<string, any>;
}

export interface Step3Props {
  identifiers: any[];
  serviceConfig: any;
  accountCheckResults: Record<string, any>;
  onUpdateAccountCheckResults: (results: Record<string, any>) => void;
  formDataCountry: string;
  dataCenterLocations: Record<string, Record<string, string>>;
  onUpdateDataCenterLocations: (locations: Record<string, Record<string, string>>) => void;
  announce?: (message: string) => void;
  defaultViewMode?: "summary" | "detailed";
  defaultExpandAll?: boolean;
}

export interface IndividualServiceConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identifier: any;
  serviceConfig: any;
  onUpdateServiceConfig: (config: any) => void;
  announce?: (message: string) => void;
  leRequestsAccepted?: boolean;
  leServicesForIdentifier?: { services: string[]; items: Record<string, Record<string, string[]>> };
}
