import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Trash2,
  MapPin,
  Edit2
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CopyableText } from "./CopyButton";
import { ETSIDesiredStatusChip } from "./fulfillment-wizard/ETSIDesiredStatusChip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ServiceWithResults {
  enabled: boolean;
  accountExistence?: {
    consumerExists: boolean;
    consumerAccounts?: string[];
    consumerStorageLocation?: string;
    enterpriseExists: boolean;
    enterpriseAccounts?: string[];
    enterpriseStorageLocation?: string;
  };
}

interface AccountIdentifier {
  id: string;
  value: string;
  type: string;
  taskId: string;
  taskStatus: string;
  etsiDesiredStatus?: import("../types/caseTypes").ETSIDesiredStatus;
  accountExistenceStatus?: "not-checked" | "checking" | "success" | "error";
  accountExistenceError?: string;
  geoLocation?: string;
  createdBy?: string;
  services: {
    outlook: ServiceWithResults;
    teams: ServiceWithResults;
    azure: ServiceWithResults;
    consumerIPHistory: ServiceWithResults;
    msaServicesUtilized: ServiceWithResults;
    enterprise: ServiceWithResults;
  };
}

interface IdentifiersSummaryViewProps {
  identifiers: AccountIdentifier[];
  onSelectIdentifier: (id: string) => void;
  onRemoveIdentifier: (id: string) => void;
  onEditIdentifier: (id: string) => void;
}

import React from "react";

// Memoized row component to prevent unnecessary re-renders
const IdentifierRow = React.memo(({
  identifier,
  index,
  onSelectIdentifier,
  onRemoveIdentifier,
  onEditIdentifier,
  getServicesCount,
  getServicesList,
  getProvisionedServicesCount,
  hasAnyAccount,
}: {
  identifier: AccountIdentifier;
  index: number;
  onSelectIdentifier: (id: string) => void;
  onRemoveIdentifier: (id: string) => void;
  onEditIdentifier: (id: string) => void;
  getServicesCount: (identifier: AccountIdentifier) => number;
  getServicesList: (identifier: AccountIdentifier) => string;
  getProvisionedServicesCount: (identifier: AccountIdentifier) => number;
  hasAnyAccount: (identifier: AccountIdentifier) => boolean;
}) => {
  const servicesCount = getServicesCount(identifier);
  
  // Use refs to cache last successful values to prevent flickering
  const lastProvisionedCountRef = React.useRef(0);
  const lastAccountExistsRef = React.useRef(false);
  
  // Memoize provisioned count to prevent flickering
  const provisionedCount = React.useMemo(() => {
    const count = getProvisionedServicesCount(identifier);
    // Cache the value when account check is successful
    if (identifier.accountExistenceStatus === "success") {
      lastProvisionedCountRef.current = count;
    }
    return lastProvisionedCountRef.current;
  }, [
    identifier.id,
    identifier.accountExistenceStatus,
    identifier.taskId,
    identifier.taskStatus,
    // Stringify all accountExistence to detect changes
    JSON.stringify(Object.values(identifier.services).map(s => s.accountExistence)),
  ]);

  // Memoize account existence check
  const accountExists = React.useMemo(() => {
    const exists = hasAnyAccount(identifier);
    // Cache the value when account check is successful
    if (identifier.accountExistenceStatus === "success") {
      lastAccountExistsRef.current = exists;
    }
    return lastAccountExistsRef.current;
  }, [
    identifier.id,
    identifier.accountExistenceStatus,
    // Stringify all accountExistence to detect changes
    JSON.stringify(Object.values(identifier.services).map(s => s.accountExistence)),
  ]);

  return (
    <TableRow 
      className="cursor-pointer hover:bg-[#f3f2f1] table-row-optimize"
      onClick={() => onSelectIdentifier(identifier.id)}
    >
      <TableCell className="text-[#605e5c] h-16 align-top py-3">
        {index + 1}
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <div className="flex items-start gap-2">
          <CopyableText text={identifier.value} copyLabel="Copy identifier">
            <span className="text-[#323130] break-all">{identifier.value}</span>
          </CopyableText>
          <ETSIDesiredStatusChip status={identifier.etsiDesiredStatus} size="extra-small" />
        </div>
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <Badge variant="outline" className="bg-white text-[#323130]">
          {identifier.type}
        </Badge>
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <span className="text-sm text-[#323130]">
          {identifier.createdBy || "LE Agency"}
        </span>
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span className="text-[#323130]">{servicesCount}</span>
                <span className="text-[#605e5c] text-sm">
                  {servicesCount === 1 ? "service" : "services"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getServicesList(identifier)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      
      {/* Service Exists Column - Count of provisioned services */}
      <TableCell className="h-16 align-top py-3">
        <div className="min-h-[40px] flex flex-col gap-1">
          {identifier.accountExistenceStatus === "checking" ? (
            <div className="flex items-center gap-1.5 text-[#0078d4] text-sm">
              <Clock className="w-4 h-4 animate-spin" />
              <span>Checking...</span>
            </div>
          ) : identifier.accountExistenceStatus === "error" ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-[#ca5010] text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Error</span>
                  </div>
                </TooltipTrigger>
                {identifier.accountExistenceError && (
                  <TooltipContent>
                    <p>{identifier.accountExistenceError}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ) : identifier.accountExistenceStatus === "success" ? (
            <div className="flex items-center gap-2">
              <span className="text-[#323130]">{provisionedCount}</span>
              <span className="text-[#605e5c] text-sm">
                of {servicesCount}
              </span>
            </div>
          ) : (
            <span className="text-[#605e5c] text-sm">Not checked</span>
          )}
        </div>
      </TableCell>

      {/* Account Existence Column - Simple Yes/No */}
      <TableCell className="h-16 align-top py-3">
        <div className="min-h-[40px] flex flex-col gap-1">
          {identifier.accountExistenceStatus === "checking" ? (
            <span className="text-[#0078d4] text-sm">...</span>
          ) : identifier.accountExistenceStatus === "error" ? (
            <span className="text-[#ca5010] text-sm">-</span>
          ) : identifier.accountExistenceStatus === "success" ? (
            <Badge 
              variant="outline" 
              className={`${
                accountExists
                  ? "bg-[#dff6dd] text-[#107c10] border-[#107c10]"
                  : "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
              } text-xs w-fit !transition-none will-change-auto`}
            >
              {accountExists ? "Yes" : "No"}
            </Badge>
          ) : (
            <span className="text-[#605e5c] text-sm">-</span>
          )}
        </div>
      </TableCell>

      <TableCell className="h-16 align-top py-3">
        {identifier.geoLocation ? (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0078d4]" />
            <span className="text-[#323130]">{identifier.geoLocation}</span>
          </div>
        ) : (
          <span className="text-[#605e5c] text-sm">Not available</span>
        )}
      </TableCell>

      <TableCell className="text-right h-16 align-top py-3">
        <div className="flex items-center justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectIdentifier(identifier.id);
                  }}
                  className="h-8 w-8 p-0 text-[#0078d4] hover:bg-[#deecf9] hover:text-[#0078d4]"
                  aria-label="View details"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View details</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditIdentifier(identifier.id);
                  }}
                  className="h-8 w-8 p-0 text-[#0078d4] hover:bg-[#deecf9] hover:text-[#0078d4]"
                  aria-label="Edit identifier"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit identifier</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveIdentifier(identifier.id);
                  }}
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label="Remove identifier"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove identifier</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if the identifier data has actually changed
  
  // If different identifier, always re-render
  if (prevProps.identifier.id !== nextProps.identifier.id) return false;
  
  // If index changed, re-render
  if (prevProps.index !== nextProps.index) return false;
  
  // Check if account existence status changed
  if (prevProps.identifier.accountExistenceStatus !== nextProps.identifier.accountExistenceStatus) {
    return false;
  }
  
  // Check if the actual service data changed (only if status is success)
  if (prevProps.identifier.accountExistenceStatus === "success" && 
      nextProps.identifier.accountExistenceStatus === "success") {
    // Compare all services accountExistence
    const prevServices = Object.values(prevProps.identifier.services).map(s => s.accountExistence);
    const nextServices = Object.values(nextProps.identifier.services).map(s => s.accountExistence);
    
    if (JSON.stringify(prevServices) !== JSON.stringify(nextServices)) return false;
  }
  
  // Check if ANY services enabled status changed
  const prevEnabled = Object.values(prevProps.identifier.services).map(s => s.enabled);
  const nextEnabled = Object.values(nextProps.identifier.services).map(s => s.enabled);
  if (JSON.stringify(prevEnabled) !== JSON.stringify(nextEnabled)) {
    return false;
  }
  
  // Check basic properties including taskId and taskStatus
  if (prevProps.identifier.value !== nextProps.identifier.value ||
      prevProps.identifier.type !== nextProps.identifier.type ||
      prevProps.identifier.taskId !== nextProps.identifier.taskId ||
      prevProps.identifier.taskStatus !== nextProps.identifier.taskStatus ||
      prevProps.identifier.geoLocation !== nextProps.identifier.geoLocation ||
      prevProps.identifier.createdBy !== nextProps.identifier.createdBy) {
    return false;
  }
  
  // If we got here, props are equal - don't re-render
  return true;
});

export const IdentifiersSummaryView = React.memo(function IdentifiersSummaryView({
  identifiers,
  onSelectIdentifier,
  onRemoveIdentifier,
  onEditIdentifier,
}: IdentifiersSummaryViewProps) {
  
  const getAccountStatus = (identifier: AccountIdentifier) => {
    if (!identifier.accountExistenceStatus || identifier.accountExistenceStatus === "not-checked") {
      return { icon: Clock, color: "text-gray-500", bg: "bg-gray-50", label: "Not checked" };
    }
    if (identifier.accountExistenceStatus === "checking") {
      return { icon: Clock, color: "text-blue-500", bg: "bg-blue-50", label: "Checking..." };
    }
    if (identifier.accountExistenceStatus === "error") {
      return { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50", label: "Error" };
    }
    
    // Check if any service found an account
    const hasAccount = 
      (identifier.services.outlook.accountExistence?.consumerExists || 
       identifier.services.outlook.accountExistence?.enterpriseExists) ||
      (identifier.services.teams.accountExistence?.consumerExists || 
       identifier.services.teams.accountExistence?.enterpriseExists) ||
      (identifier.services.azure.accountExistence?.consumerExists || 
       identifier.services.azure.accountExistence?.enterpriseExists);
    
    if (hasAccount) {
      return { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Found" };
    }
    
    return { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Not found" };
  };

  const getServicesCount = (identifier: AccountIdentifier) => {
    let count = 0;
    // Count ALL enabled services across all service types
    Object.values(identifier.services).forEach(service => {
      if (service.enabled) count++;
    });
    return count;
  };

  const getServicesList = (identifier: AccountIdentifier) => {
    const services: string[] = [];
    const serviceNames: Record<string, string> = {
      outlook: "Outlook",
      teams: "Teams",
      azure: "Azure",
      consumerIPHistory: "Consumer IP History",
      msaServicesUtilized: "MSA",
      enterprise: "Enterprise",
    };
    
    Object.entries(identifier.services).forEach(([key, service]) => {
      if (service.enabled && serviceNames[key]) {
        services.push(serviceNames[key]);
      }
    });
    return services.join(", ") || "None";
  };

  // Get count of provisioned services
  const getProvisionedServicesCount = (identifier: AccountIdentifier) => {
    let count = 0;
    Object.values(identifier.services).forEach(service => {
      if (service.enabled && (service.accountExistence?.consumerExists || service.accountExistence?.enterpriseExists)) {
        count++;
      }
    });
    return count;
  };

  // Check if identifier has any account (Consumer OR Enterprise)
  const hasAnyAccount = (identifier: AccountIdentifier) => {
    return Object.values(identifier.services).some(service => 
      service.accountExistence?.consumerExists || service.accountExistence?.enterpriseExists
    );
  };

  return (
    <div className="border border-[#edebe9] rounded-lg overflow-hidden">
      <div className="overflow-x-auto table-optimize">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow className="bg-[#faf9f8] hover:bg-[#faf9f8]">
            <TableHead className="w-12 text-[#323130]">#</TableHead>
            <TableHead className="text-[#323130] w-[250px]">Identifier Value</TableHead>
            <TableHead className="text-[#323130] w-32">Type</TableHead>
            <TableHead className="text-[#323130] w-32">Created By</TableHead>
            <TableHead className="text-[#323130] w-28">Services Requested</TableHead>
            <TableHead className="text-[#323130] w-32">Services Provisioned</TableHead>
            <TableHead className="text-[#323130] w-36">Account Existence</TableHead>
            <TableHead className="text-[#323130] w-48">Geo Location</TableHead>
            <TableHead className="text-[#323130] w-32 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {identifiers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-[#605e5c]">
                No identifiers found matching your search
              </TableCell>
            </TableRow>
          ) : (
            identifiers.map((identifier, index) => (
              <IdentifierRow
                key={identifier.id}
                identifier={identifier}
                index={index}
                onSelectIdentifier={onSelectIdentifier}
                onRemoveIdentifier={onRemoveIdentifier}
                onEditIdentifier={onEditIdentifier}
                getServicesCount={getServicesCount}
                getServicesList={getServicesList}
                getProvisionedServicesCount={getProvisionedServicesCount}
                hasAnyAccount={hasAnyAccount}
              />
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
});