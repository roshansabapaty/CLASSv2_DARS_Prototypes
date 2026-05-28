import React from "react";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  User,
  Building,
  MapPin,
  Globe,
} from "lucide-react";
import { getAccountInfo } from "./identifier-table-utils";

interface AccountCheckCellProps {
  identifier: any;
}

export function AccountCheckCell({ identifier }: AccountCheckCellProps) {
  const acStatus = identifier.accountExistenceStatus;
  const isChecked =
    acStatus === "success" || acStatus === "error" || acStatus === "not-found";

  const { hasConsumer, hasEnterprise, hasAccount, storageLocations, enabledWithResults } =
    getAccountInfo(identifier);

  if (!isChecked) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 text-[#605e5c] border-[#c8c6c4]"
      >
        <Circle className="w-2.5 h-2.5 mr-1" />
        Not Checked
      </Badge>
    );
  }

  if (acStatus === "error") {
    return (
      <Badge className="text-[10px] px-1.5 py-0 bg-[#fde7e9] text-[#d13438] border-[#d13438]">
        <AlertCircle className="w-2.5 h-2.5 mr-1" />
        Error
      </Badge>
    );
  }

  if (acStatus === "success" && !hasAccount) {
    return (
      <Badge className="text-[10px] px-1.5 py-0 bg-[#fde7e9] text-[#d13438] border-[#d13438]">
        <XCircle className="w-2.5 h-2.5 mr-1" />
        Not Found
      </Badge>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-1 cursor-help">
            <div className="flex items-center gap-1 flex-wrap">
              <Badge className="text-[10px] px-1.5 py-0 bg-[#dff6dd] text-[#107c10] border-[#107c10]">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                Found
              </Badge>
              {hasConsumer && (
                <Badge className="text-[10px] px-1 py-0 bg-[#deecf9] text-[#0078d4] border-[#0078d4]">
                  <User className="w-2.5 h-2.5 mr-0.5" />
                  C
                </Badge>
              )}
              {hasEnterprise && (
                <Badge className="text-[10px] px-1 py-0 bg-[#fff9f5] text-[#ca5010] border-[#ca5010]">
                  <Building className="w-2.5 h-2.5 mr-0.5" />
                  E
                </Badge>
              )}
            </div>
            {storageLocations.size > 0 && (
              <span className="text-[10px] text-[#605e5c] flex items-center gap-0.5 truncate max-w-[180px]">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                {[...storageLocations][0]}
                {storageLocations.size > 1 && ` +${storageLocations.size - 1}`}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[320px]">
          <div className="space-y-1.5 text-xs">
            <p className="font-medium">Account Check Results</p>
            {enabledWithResults > 0 && (
              <p className="text-[#605e5c]">
                {enabledWithResults} service
                {enabledWithResults !== 1 ? "s" : ""} checked
              </p>
            )}
            {hasConsumer && (
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-[#0078d4]" />
                <span>Consumer account found</span>
              </div>
            )}
            {hasEnterprise && (
              <div className="flex items-center gap-1.5">
                <Building className="w-3 h-3 text-[#ca5010]" />
                <span>Enterprise account found</span>
              </div>
            )}
            {storageLocations.size > 0 && (
              <div className="pt-1 border-t border-[#edebe9]">
                <p className="text-[#605e5c] mb-0.5">Storage Locations:</p>
                {[...storageLocations].map((loc, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 text-[#323130]"
                  >
                    <MapPin className="w-2.5 h-2.5 text-[#605e5c]" />
                    {loc}
                  </div>
                ))}
              </div>
            )}
            {identifier.geoLocation && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-[#edebe9]">
                <Globe className="w-3 h-3 text-[#605e5c]" />
                <span>Geo: {identifier.geoLocation}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
