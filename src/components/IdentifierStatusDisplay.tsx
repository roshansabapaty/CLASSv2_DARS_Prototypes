/**
 * Memoized component for rendering identifier status (services provisioned,
 * account existence, geo location).
 * Extracted from DataEntryForm.tsx to reduce file size and improve maintainability.
 */
import React from "react";
import { Badge } from "./ui/badge";
import { Clock, AlertTriangle, MapPin } from "lucide-react";
import type { AccountIdentifier } from "../types/caseTypes";

interface IdentifierDisplayData {
  enabledServicesCount: number;
  provisionedServicesCount: number;
  hasAnyAccount: boolean;
  hasProvisioned: boolean;
  accountTypes: string[];
}

export const IdentifierStatusDisplay = React.memo(({ 
  identifier,
  displayData 
}: { 
  identifier: AccountIdentifier;
  displayData: IdentifierDisplayData | undefined;
}) => {
  const data = displayData || {
    enabledServicesCount: 0,
    provisionedServicesCount: 0,
    hasAnyAccount: false,
    hasProvisioned: false,
    accountTypes: [],
  };
  
  return (
    <>
      {/* Services Provisioned */}
      <div className="space-y-1">
        <p className="text-xs text-[#605e5c]">Services Provisioned</p>
        {identifier.accountExistenceStatus === "checking" ? (
          <div className="flex items-center gap-1.5 text-[#0078d4]">
            <Clock className="w-4 h-4 animate-spin" />
            <span className="text-xs">Checking...</span>
          </div>
        ) : identifier.accountExistenceStatus === "error" ? (
          <div className="flex items-center gap-1.5 text-[#ca5010]">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">Error</span>
          </div>
        ) : identifier.accountExistenceStatus === "success" ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#323130]">
              {data.provisionedServicesCount}
            </span>
            <span className="text-xs text-[#605e5c]">
              of {data.enabledServicesCount}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[#605e5c]">Not checked</span>
        )}
      </div>

      {/* Account Existence */}
      <div className="space-y-1">
        <p className="text-xs text-[#605e5c]">Account Existence</p>
        {identifier.accountExistenceStatus === "checking" ? (
          <span className="text-xs text-[#0078d4]">...</span>
        ) : identifier.accountExistenceStatus === "error" ? (
          <span className="text-xs text-[#ca5010]">-</span>
        ) : identifier.accountExistenceStatus === "success" ? (
          <Badge 
            variant="outline" 
            className={`${
              data.hasAnyAccount
                ? "bg-[#dff6dd] text-[#107c10] border-[#107c10]"
                : "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
            } text-xs w-fit !transition-none will-change-auto`}
          >
            {data.hasAnyAccount ? "Yes" : "No"}
          </Badge>
        ) : (
          <span className="text-xs text-[#605e5c]">-</span>
        )}
      </div>

      {/* Geo Location */}
      <div className="space-y-1">
        <p className="text-xs text-[#605e5c]">Geo Location</p>
        {identifier.geoLocation ? (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0078d4]" />
            <span className="text-xs text-[#323130]">{identifier.geoLocation}</span>
          </div>
        ) : (
          <span className="text-xs text-[#605e5c]">Not available</span>
        )}
      </div>
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if identifier status or display data actually changed
  return (
    prevProps.identifier.id === nextProps.identifier.id &&
    prevProps.identifier.accountExistenceStatus === nextProps.identifier.accountExistenceStatus &&
    prevProps.identifier.geoLocation === nextProps.identifier.geoLocation &&
    JSON.stringify(prevProps.displayData) === JSON.stringify(nextProps.displayData)
  );
});
