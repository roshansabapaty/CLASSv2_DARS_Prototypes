/**
 * Memoized component for rendering account existence badges per identifier.
 * Extracted from DataEntryForm.tsx to reduce file size and improve maintainability.
 */
import React from "react";
import { Badge } from "./ui/badge";
import { MapPin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import type { AccountIdentifier, ServiceAccountExistence } from "../types/caseTypes";

export const AccountExistenceBadges = React.memo(({ 
  identifier 
}: { 
  identifier: AccountIdentifier 
}) => {
  if (identifier.accountExistenceStatus !== "success") {
    return null;
  }

  const badges: React.ReactNode[] = [];
  
  // Helper to add service badges
  const addServiceBadges = (serviceName: string, accountExistence?: ServiceAccountExistence) => {
    if (!accountExistence) return;
    
    if (accountExistence.consumerExists || accountExistence.enterpriseExists) {
      badges.push(
        <Badge 
          key={`${identifier.id}-${serviceName}-service`}
          variant="outline" 
          className="bg-[#dff6dd] text-[#107c10] border-[#107c10] text-xs"
        >
          {serviceName}
        </Badge>
      );
      
      if (accountExistence.consumerExists) {
        badges.push(
          <Badge 
            key={`${identifier.id}-${serviceName}-consumer`}
            variant="outline" 
            className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-xs"
          >
            Consumer
          </Badge>
        );
      }
      
      if (accountExistence.enterpriseExists) {
        badges.push(
          <Badge 
            key={`${identifier.id}-${serviceName}-enterprise`}
            variant="outline" 
            className="bg-[#fff9f5] text-[#ca5010] border-[#ca5010] text-xs"
          >
            Enterprise
          </Badge>
        );
      }
    }
  };
  
  // Add badges for each service
  addServiceBadges("Outlook", identifier.services.outlook.accountExistence);
  addServiceBadges("Teams", identifier.services.teams.accountExistence);
  addServiceBadges("Azure", identifier.services.azure.accountExistence);
  addServiceBadges("Consumer IP History", identifier.services.consumerIPHistory.accountExistence);
  addServiceBadges("MSA", identifier.services.msaServicesUtilized.accountExistence);
  addServiceBadges("Enterprise", identifier.services.enterprise.accountExistence);
  addServiceBadges("OneDrive SP", identifier.services.oneDriveSharePoint.accountExistence);
  addServiceBadges("OneDrive Consumer", identifier.services.oneDriveConsumer.accountExistence);
  addServiceBadges("Skype", identifier.services.skype.accountExistence);
  
  // Add storage location badges
  const locations = new Set<string>();
  [
    identifier.services.outlook, 
    identifier.services.teams, 
    identifier.services.azure,
    identifier.services.consumerIPHistory,
    identifier.services.msaServicesUtilized,
    identifier.services.enterprise,
    identifier.services.oneDriveSharePoint,
    identifier.services.oneDriveConsumer,
    identifier.services.skype
  ].forEach(service => {
    if (service.accountExistence?.consumerStorageLocation) {
      locations.add(service.accountExistence.consumerStorageLocation);
    }
    if (service.accountExistence?.enterpriseStorageLocation) {
      locations.add(service.accountExistence.enterpriseStorageLocation);
    }
  });
  
  Array.from(locations).forEach((location, idx) => {
    badges.push(
      <TooltipProvider key={`${identifier.id}-location-${idx}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Badge 
                variant="outline" 
                className="bg-[#f3f2f1] text-[#323130] border-[#8a8886] text-xs flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                {location.split(" - ")[0]}
              </Badge>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{location}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  });
  
  return <>{badges}</>;
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if account existence data actually changed
  const prevId = prevProps.identifier;
  const nextId = nextProps.identifier;
  
  // Check if status changed
  if (prevId.accountExistenceStatus !== nextId.accountExistenceStatus) {
    return false;
  }
  
  // If not success, don't compare further
  if (nextId.accountExistenceStatus !== "success") {
    return true;
  }
  
  // Compare account existence data for all services
  return JSON.stringify(prevId.services) === JSON.stringify(nextId.services);
});
