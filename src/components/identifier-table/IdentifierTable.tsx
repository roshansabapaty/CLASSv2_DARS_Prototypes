import React, { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Search,
  Plus,
  Loader2,
  ClipboardList,
  X,
  CheckCircle2,
  XCircle,
  ChevronsUpDown,
  Clock,
  Ban,
  AlertOctagon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../ui/utils";
import { IdentifierTableRow } from "./IdentifierTableRow";
import { AddIdentifierDialog, AddIdentifierData } from "./AddIdentifierDialog";

interface IdentifierTableProps {
  identifiers: any[];
  /** If true, hide edit/delete/add actions (display-only mode) */
  readOnly?: boolean;
  /** Callback when identifiers array is updated (edit/delete) */
  onUpdateIdentifiers?: (identifiers: any[]) => void;
  /** Callback when user adds a new identifier via dialog */
  onAddIdentifier?: (data: AddIdentifierData) => void;
  /** Trigger account existence check for all identifiers */
  onCheckAllAccounts?: () => void;
  /** Whether account check is in progress */
  checkingAccounts?: boolean;
  /** Account check progress percentage (0-100) */
  checkProgress?: number;
  /** Account check result counts */
  accountCheckCounts?: {
    checked: number;
    found: number;
    notFound: number;
    total: number;
  };
  /** Announcer for aria-live region */
  announce?: (message: string) => void;
  /** Optional className for the root element */
  className?: string;
  /** Case-level requestType, threaded so rows can surface fields that only
   *  apply to specific request types (e.g. eEvidence-supplied
   *  `issuingAuthorityNotes`). */
  requestType?: string;
  /** Case-level requestSubType, threaded so rows can surface
   *  sub-type-specific rendering — e.g. EPOC-PR cases show the
   *  `desiredPreservationExpiration` date. */
  requestSubType?: string;
  /** Case-wide Check Accounts audit: when the most recent run completed
   *  and which user kicked it off. When set, the stats bar surfaces an
   *  inline "Accounts checked … by …" caption next to the status counts. */
  accountsCheckedAt?: Date;
  accountsCheckedBy?: string;
  /** Phase 2 attorney-escalation merge: forwarding the case `formData`
   *  + an `onAttorneyAction` handler activates the row's attorney
   *  context — escalated identifiers get the red left-border accent
   *  and an inline `AttorneyReviewPanel` on expand, non-escalated rows
   *  dim. Optional; without these the table reads as the wizard /
   *  triage views read today. */
  formData?: import("../../types/caseTypes").FormData;
  onAttorneyAction?: (next: {
    action: import("../../types/caseTypes").AttorneyAction;
    auditEvent: import("../../types/caseTypes").EscalationAuditEvent;
    statusPatch?: Partial<import("../../types/caseTypes").AttorneyEscalation>;
    notifyLead?: boolean;
  }) => void;
  /** Phase 3 cross-border merge — forwarded to each row so the Logins
   *  button in the Actions column can open the cross-border drawer. */
  onOpenLoginLocation?: (identifierId: string) => void;
}

export function IdentifierTable({
  identifiers,
  readOnly = false,
  onUpdateIdentifiers,
  onAddIdentifier,
  onCheckAllAccounts,
  checkingAccounts = false,
  checkProgress = 0,
  accountCheckCounts,
  announce,
  className,
  requestType,
  requestSubType,
  accountsCheckedAt,
  accountsCheckedBy,
  formData,
  onAttorneyAction,
  onOpenLoginLocation,
}: IdentifierTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [allExpanded, setAllExpanded] = useState<boolean | undefined>(undefined);
  const [expandToggleCount, setExpandToggleCount] = useState(0);

  const filteredIdentifiers = identifiers.filter(
    (id) =>
      id.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Supplemental grouping (Phase 4 of the linkedIdentifierId merge) ──
  // Order rows so each supplemental appears immediately after its parent
  // LE identifier with a sub-letter label (1, 1a, 1b, 2, 2a). Parent and
  // child rows are still part of the same flat table — we just sort the
  // mapped list and stamp a `displayLabel`.
  //
  // Edge cases:
  //   * Search filter hides the parent but keeps the supplemental →
  //     supplemental falls back to a flat numeric label.
  //   * Legacy supplemental rows without `linkedIdentifierId` → same.
  //   * Multiple supplementals per parent → ordered by their position in
  //     the source `identifiers` array (typically creation order).
  const displayRows = useMemo<
    Array<{
      identifier: any;
      displayLabel: string;
      parentValue?: string;
    }>
  >(() => {
    const filteredIds = new Set(filteredIdentifiers.map((id) => id.id));
    const supplementalsByParent = new Map<string, any[]>();
    for (const id of filteredIdentifiers) {
      if (id.linkedIdentifierId && filteredIds.has(id.linkedIdentifierId)) {
        const arr = supplementalsByParent.get(id.linkedIdentifierId) ?? [];
        arr.push(id);
        supplementalsByParent.set(id.linkedIdentifierId, arr);
      }
    }
    const childIdSet = new Set<string>();
    for (const children of supplementalsByParent.values()) {
      for (const c of children) childIdSet.add(c.id);
    }

    const rows: Array<{
      identifier: any;
      displayLabel: string;
      parentValue?: string;
    }> = [];
    let parentCounter = 0;
    for (const id of filteredIdentifiers) {
      if (childIdSet.has(id.id)) continue;
      parentCounter++;
      rows.push({ identifier: id, displayLabel: String(parentCounter) });

      const children = supplementalsByParent.get(id.id);
      if (children) {
        children.forEach((child, i) => {
          rows.push({
            identifier: child,
            // 1a, 1b, … 1z, then 1aa is unreachable in practice (a parent
            // with >26 supplementals is far beyond any real demo).
            displayLabel: `${parentCounter}${String.fromCharCode(97 + i)}`,
            parentValue: id.value,
          });
        });
      }
    }
    return rows;
  }, [filteredIdentifiers]);

  const handleUpdate = (id: string, updates: { type: string; value: string }) => {
    if (!onUpdateIdentifiers) return;
    const updated = identifiers.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdateIdentifiers(updated);
  };

  const handleDelete = (id: string) => {
    if (!onUpdateIdentifiers) return;
    onUpdateIdentifiers(identifiers.filter((item) => item.id !== id));
  };

  const handleAddIdentifier = (data: AddIdentifierData) => {
    onAddIdentifier?.(data);
    setShowAddDialog(false);
  };

  // Derived counts
  const leCount = identifiers.filter(
    (id) => !id.createdBy?.includes("Supplemental")
  ).length;
  const supplementalCount = identifiers.filter(
    (id) => id.createdBy?.includes("Supplemental")
  ).length;

  // Account-check status counts. Computed inline from identifier state
  // so the table's stats row stays self-contained — no need to thread
  // five extra props in. All five chips always render per the UR
  // preference for full transparency (zero values still show).
  const statusCounts = (() => {
    let found = 0;
    let notFound = 0;
    let pending = 0;
    let invalid = 0;
    let rejected = 0;
    for (const id of identifiers) {
      if (id.invalidatedAt) invalid++;
      if (id.rejection) rejected++;
      const acs = id.accountExistenceStatus;
      if (acs === "success") {
        const hasAccount = Object.values(id.services || {}).some(
          (svc: any) =>
            svc?.accountExistence?.consumerExists ||
            svc?.accountExistence?.enterpriseExists,
        );
        if (hasAccount) found++;
        else notFound++;
      } else if (acs === "not-found") {
        notFound++;
      } else if (!acs || acs === "not-checked" || acs === "unknown") {
        pending++;
      }
    }
    return { found, notFound, pending, invalid, rejected };
  })();

  // "Accounts checked …" caption rendered inline with the status chips.
  // Suppressed until the first run stamps `accountsCheckedAt`.
  const auditCaption = accountsCheckedAt
    ? `Accounts checked ${format(new Date(accountsCheckedAt), "MMM d, yyyy 'at' h:mm a")}${
        accountsCheckedBy ? ` by ${accountsCheckedBy}` : ""
      }`
    : null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Stats Bar — identifier counts on row 1, account-check status
          counts + audit caption on row 2. The five status chips always
          render (zero values included) per the UR preference. The
          audit caption is suppressed until the first Check Accounts
          run stamps `accountsCheckedAt`. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#323130] font-medium">
            {identifiers.length} identifier
            {identifiers.length !== 1 ? "s" : ""}
          </span>
          {leCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-[#605e5c]">{leCount} LE Provided</span>
            </>
          )}
          {supplementalCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-[#8764b8]">
                {supplementalCount} Supplemental
              </span>
            </>
          )}
          {/* Phase 2 attorney-escalation merge — "N awaiting attorney
              review" caption. Surfaces partial-escalation cases where
              only some identifiers are under attorney review. Suppressed
              when no identifiers carry `taskStatus: "AttorneyReview"`. */}
          {(() => {
            const awaitingCount = identifiers.filter(
              (id) => id.taskStatus === "AttorneyReview",
            ).length;
            if (awaitingCount === 0) return null;
            return (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-[#a4262c] font-medium">
                  {awaitingCount} of {identifiers.length} awaiting attorney
                  review
                </span>
              </>
            );
          })()}
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1 text-[#107c10]">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            {statusCounts.found} Found
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span className="inline-flex items-center gap-1 text-[#d13438]">
            <XCircle className="w-3 h-3" aria-hidden="true" />
            {statusCounts.notFound} Not Found
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span className="inline-flex items-center gap-1 text-[#8a6d3b]">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {statusCounts.pending} Pending
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span className="inline-flex items-center gap-1 text-[#ca5010]">
            <AlertOctagon className="w-3 h-3" aria-hidden="true" />
            {statusCounts.invalid} Invalid
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span className="inline-flex items-center gap-1 text-[#a4262c]">
            <Ban className="w-3 h-3" aria-hidden="true" />
            {statusCounts.rejected} Rejected
          </span>
          {auditCaption && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-[#605e5c]">{auditCaption}</span>
            </>
          )}
        </div>
      </div>

      {/* Search and Actions */}
      <Card className="border-[#e1dfdd] bg-white p-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#605e5c]" />
            <Input
              type="text"
              placeholder="Search identifiers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          {onCheckAllAccounts && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCheckAllAccounts();
              }}
              disabled={checkingAccounts || identifiers.length === 0}
              variant="outline"
              className="gap-2 h-9 text-[#0078d4] border-[#0078d4] hover:bg-[#deecf9]"
            >
              {checkingAccounts ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...{" "}
                  {checkProgress > 0 ? `${checkProgress}%` : ""}
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Check All Accounts
                </>
              )}
            </Button>
          )}
          {!readOnly && onAddIdentifier && (
            <Button
              onClick={() => setShowAddDialog(true)}
              className="gap-2 bg-[#0078d4] hover:bg-[#106ebe] text-white h-9"
            >
              <Plus className="w-4 h-4" />
              Add Identifier
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {checkingAccounts && checkProgress > 0 && (
          <div className="mt-3">
            <div
              className="w-full bg-[#f3f2f1] rounded-full h-1.5"
              role="progressbar"
              aria-valuenow={checkProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Checking accounts: ${checkProgress}% complete`}
            >
              <div
                className="bg-[#0078d4] h-1.5 rounded-full motion-safe:transition-all motion-safe:duration-300"
                style={{ width: `${checkProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Account check results summary */}
        {!checkingAccounts && accountCheckCounts && accountCheckCounts.checked > 0 && (
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-[#605e5c]">Account check results:</span>
            <span className="flex items-center gap-1 text-[#107c10]">
              <CheckCircle2 className="w-3 h-3" />
              {accountCheckCounts.found} found
            </span>
            <span className="flex items-center gap-1 text-[#d13438]">
              <XCircle className="w-3 h-3" />
              {accountCheckCounts.notFound} not found
            </span>
            {accountCheckCounts.checked < accountCheckCounts.total && (
              <span className="text-[#605e5c]">
                ({accountCheckCounts.total - accountCheckCounts.checked}{" "}
                unchecked)
              </span>
            )}
          </div>
        )}

        {searchTerm && (
          <p className="text-xs text-[#605e5c] mt-2">
            Showing {filteredIdentifiers.length} of {identifiers.length}{" "}
            identifiers
          </p>
        )}
      </Card>

      {/* Table */}
      <Card className="border-[#e1dfdd] bg-white">
        <div className="overflow-x-auto">
          <Table aria-label={`Identifiers — ${filteredIdentifiers.length} of ${identifiers.length}`}>
            {/* `sticky top-0 z-10` pins the header when the case page
                scrolls long identifier lists. The non-hover bg ensures
                the header tint stays consistent over scrolled rows. */}
            <TableHeader className="sticky top-0 z-10 bg-[#f3f2f1]">
              <TableRow className="bg-[#f3f2f1] hover:bg-[#f3f2f1]">
                <TableHead className="w-12">
                  <div className="flex items-center gap-1">
                    {filteredIdentifiers.length >= 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAllExpanded(prev => prev === true ? false : true);
                          setExpandToggleCount(c => c + 1);
                        }}
                        className="h-6 w-6 p-0 text-[#605e5c] hover:text-[#323130] hover:bg-[#edebe9]"
                        title={allExpanded ? "Collapse all rows" : "Expand all rows"}
                      >
                        <ChevronsUpDown className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    #
                  </div>
                </TableHead>
                <TableHead className="w-32">Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-32">Task Status</TableHead>
                <TableHead className="w-48">Account Check</TableHead>
                {/* Phase 3 cross-border merge — "Consumer User Location
                    Summary" column. Populated for Consumer-tagged
                    identifiers as part of Check Accounts (30-day window
                    ending today). Empty for Enterprise rows (those use
                    the Org Home Location signal in the tri-pane). */}
                <TableHead className="w-44">
                  Consumer User Location Summary
                </TableHead>
                {!readOnly && (
                  <TableHead className="w-32 text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIdentifiers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={readOnly ? 6 : 7}
                    className="text-center py-12"
                  >
                    <ClipboardList className="w-12 h-12 text-[#a19f9d] mx-auto mb-3" />
                    <p className="text-[#605e5c]">
                      {searchTerm
                        ? "No identifiers match your search"
                        : "No identifiers added yet"}
                    </p>
                    {!readOnly && !searchTerm && onAddIdentifier && (
                      <Button
                        onClick={() => setShowAddDialog(true)}
                        variant="outline"
                        className="mt-4 gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add First Identifier
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map(({ identifier, displayLabel, parentValue }, index) => (
                  <IdentifierTableRow
                    key={identifier.id}
                    identifier={identifier}
                    index={index}
                    displayLabel={displayLabel}
                    parentValue={parentValue}
                    readOnly={readOnly}
                    forceExpanded={allExpanded}
                    forceExpandedKey={expandToggleCount}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    requestType={requestType}
                    requestSubType={requestSubType}
                    formData={formData}
                    onAttorneyAction={onAttorneyAction}
                    onOpenLoginLocation={onOpenLoginLocation}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Identifier Dialog */}
      {!readOnly && onAddIdentifier && (
        <AddIdentifierDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAdd={handleAddIdentifier}
          identifiers={identifiers}
        />
      )}
    </div>
  );
}