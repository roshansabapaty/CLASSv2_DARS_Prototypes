import { 
  ChevronRight,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CopyableText } from "./CopyButton";
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
import { format } from "date-fns";
import React from "react";

interface NonDisclosureOrder {
  id: string;
  name: string;
  status: string;
  statusReason: string;
  exclusionReason?: string;
  temporaryNDO: boolean;
  startDate: Date | undefined;
  expirationDate: Date | undefined;
  createdBy: string;
  createdOn: Date | undefined;
  relatedCases: string[];
}

interface NDOSummaryViewProps {
  ndos: NonDisclosureOrder[];
  onSelectNDO: (id: string) => void;
  onRemoveNDO: (id: string) => void;
  onEditNDO: (id: string) => void;
}

const NDORow = React.memo((({
  ndo,
  index,
  onSelectNDO,
  onRemoveNDO,
  onEditNDO,
}: {
  ndo: NonDisclosureOrder;
  index: number;
  onSelectNDO: (id: string) => void;
  onRemoveNDO: (id: string) => void;
  onEditNDO: (id: string) => void;
}) => {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-[#dff6dd] text-[#107c10] border-[#107c10]";
      case "Expired":
        return "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]";
      case "Pending":
        return "bg-[#fff4ce] text-[#8a6d3b] border-[#8a6d3b]";
      case "Cancelled":
        return "bg-[#fde7e9] text-[#d13438] border-[#d13438]";
      default:
        return "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]";
    }
  };

  return (
    <TableRow 
      className="cursor-pointer hover:bg-[#f3f2f1] transition-colors"
      onClick={() => onSelectNDO(ndo.id)}
    >
      <TableCell className="text-[#605e5c] h-16 align-top py-3">
        {index + 1}
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <CopyableText text={ndo.name || "-"} copyLabel="Copy NDO name">
          <span className="text-[#323130]">{ndo.name || "-"}</span>
        </CopyableText>
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <Badge 
          variant="outline" 
          className={`${getStatusBadgeClass(ndo.status)} text-xs`}
        >
          {ndo.status || "-"}
        </Badge>
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <span className="text-[#323130] text-sm">{ndo.statusReason || "-"}</span>
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <span className="text-[#323130] text-sm">{ndo.exclusionReason || "-"}</span>
      </TableCell>
      <TableCell className="h-16 align-top py-3 text-center">
        {ndo.temporaryNDO ? (
          <CheckCircle2 className="w-4 h-4 text-[#107c10] inline" />
        ) : (
          <XCircle className="w-4 h-4 text-[#605e5c] inline" />
        )}
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <span className="text-[#323130] text-sm">
          {ndo.startDate ? format(ndo.startDate, "MMM d, yyyy") : "-"}
        </span>
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <span className="text-[#323130] text-sm">
          {ndo.expirationDate ? format(ndo.expirationDate, "MMM d, yyyy") : "-"}
        </span>
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <span className="text-[#323130] text-sm">{ndo.createdBy || "-"}</span>
      </TableCell>
      <TableCell className="h-16 align-top py-3">
        <div className="flex flex-wrap gap-1">
          {ndo.relatedCases.length > 0 ? (
            ndo.relatedCases.slice(0, 2).map((caseNum, idx) => (
              <CopyableText key={idx} text={caseNum} copyLabel="Copy case number" showIcon={false}>
                <Badge 
                  variant="outline" 
                  className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-xs cursor-pointer hover:bg-[#c7e0f4]"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Could open case in new tab or modal
                  }}
                >
                  {caseNum}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Badge>
              </CopyableText>
            ))
          ) : (
            <span className="text-[#605e5c] text-sm">None</span>
          )}
          {ndo.relatedCases.length > 2 && (
            <span className="text-[#605e5c] text-xs">
              +{ndo.relatedCases.length - 2} more
            </span>
          )}
        </div>
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
                    onSelectNDO(ndo.id);
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
                    onEditNDO(ndo.id);
                  }}
                  className="h-8 w-8 p-0 text-[#0078d4] hover:bg-[#deecf9] hover:text-[#0078d4]"
                  aria-label="Edit NDO"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit NDO</p>
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
                    onRemoveNDO(ndo.id);
                  }}
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label="Remove NDO"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove NDO</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    </TableRow>
  );
}));

export const NDOSummaryView = React.memo(function NDOSummaryView({
  ndos,
  onSelectNDO,
  onRemoveNDO,
  onEditNDO,
}: NDOSummaryViewProps) {
  return (
    <div className="border border-[#edebe9] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-[#faf9f8] hover:bg-[#faf9f8]">
              <TableHead className="w-12 text-[#323130]">#</TableHead>
              <TableHead className="text-[#323130] w-40">Name</TableHead>
              <TableHead className="text-[#323130] w-28">Status</TableHead>
              <TableHead className="text-[#323130] w-36">Status Reason</TableHead>
              <TableHead className="text-[#323130] w-36">Exclusion Reason</TableHead>
              <TableHead className="text-[#323130] w-24 text-center">Temporary</TableHead>
              <TableHead className="text-[#323130] w-32">Start Date</TableHead>
              <TableHead className="text-[#323130] w-32">Expiration Date</TableHead>
              <TableHead className="text-[#323130] w-32">Created By</TableHead>
              <TableHead className="text-[#323130] w-40">Related Cases</TableHead>
              <TableHead className="text-[#323130] w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ndos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-[#605e5c]">
                  No non-disclosure orders found
                </TableCell>
              </TableRow>
            ) : (
              ndos.map((ndo, index) => (
                <NDORow
                  key={ndo.id}
                  ndo={ndo}
                  index={index}
                  onSelectNDO={onSelectNDO}
                  onRemoveNDO={onRemoveNDO}
                  onEditNDO={onEditNDO}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});
