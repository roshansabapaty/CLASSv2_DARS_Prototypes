import React, { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Plus,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Check,
  ChevronsUpDown,
  User,
} from "lucide-react";
import { cn } from "../ui/utils";
import { MICROSOFT_SERVICES_CONFIG } from "../../config/microsoftServices";
import { LENS_SERVICES } from "../../config/lensServicesConfig";
import {
  IDENTIFIER_TYPES,
  IDENTIFIER_FORMAT_RULES,
  CURRENT_USER,
} from "../../constants/caseConstants";
import { validateIdentifierFormat } from "../../utils/caseHelpers";
import { DATA_CATEGORY_LABELS } from "./identifier-table-utils";

export interface AddIdentifierData {
  type: string;
  value: string;
  isSupplemental: boolean;
  linkedIdentifierId: string;
  service: string;
  dataCategories: string[];
  /** Supplemental-only: whether the RS knows the account exists. When
   *  true, the new identifier is created with `accountExistenceStatus:
   *  "success"` so the Account Check column shows the configured type
   *  immediately, without the user having to run Check Accounts. When
   *  false, the column shows "not-found" up front. Undefined for
   *  non-supplemental rows (which always start "not-checked"). */
  accountFound?: boolean;
  /** Supplemental-only: account type written onto `checkAccounts.accountType`
   *  when `accountFound === true`. Drives the Consumer/Enterprise badge
   *  in the Account Check column. */
  accountType?: "Consumer" | "Enterprise";
}

interface AddIdentifierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: AddIdentifierData) => void;
  /** Existing identifiers for supplemental linking */
  identifiers: any[];
}

export function AddIdentifierDialog({
  open,
  onOpenChange,
  onAdd,
  identifiers,
}: AddIdentifierDialogProps) {
  const [identifierType, setIdentifierType] = useState("Email address");
  const [identifierValue, setIdentifierValue] = useState("");
  const [isSupplemental, setIsSupplemental] = useState(false);
  const [linkedIdentifierId, setLinkedIdentifierId] = useState("");
  const [service, setService] = useState("");
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  // Supplemental-only: pre-populate the Account Check column on the new
  // row. Default Account Found = true (most supplementals are discovered
  // because they exist) and account type = "Consumer".
  const [supplementalAccountFound, setSupplementalAccountFound] = useState(true);
  const [supplementalAccountType, setSupplementalAccountType] = useState<
    "Consumer" | "Enterprise"
  >("Consumer");

  // Combobox open states
  const [typeOpen, setTypeOpen] = useState(false);
  const [linkedIdOpen, setLinkedIdOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [dataCategoryOpen, setDataCategoryOpen] = useState(false);

  const validation = useMemo(
    () => validateIdentifierFormat(identifierValue, identifierType),
    [identifierValue, identifierType]
  );

  const sortedIdentifierTypes = useMemo(
    () => [...IDENTIFIER_TYPES].sort((a, b) => a.localeCompare(b)),
    []
  );

  const resetForm = () => {
    setIdentifierType("Email address");
    setIdentifierValue("");
    setIsSupplemental(false);
    setLinkedIdentifierId("");
    setService("");
    setDataCategories([]);
    setSupplementalAccountFound(true);
    setSupplementalAccountType("Consumer");
  };

  const handleAdd = () => {
    onAdd({
      type: identifierType,
      value: identifierValue,
      isSupplemental,
      linkedIdentifierId,
      service,
      dataCategories,
      // Supplemental-only fields — undefined on LE-provided rows so the
      // downstream handler can distinguish "pre-populate the Account
      // Check column" from "leave it not-checked".
      accountFound: isSupplemental ? supplementalAccountFound : undefined,
      accountType: isSupplemental && supplementalAccountFound
        ? supplementalAccountType
        : undefined,
    });
    resetForm();
  };

  const canAdd =
    identifierValue &&
    identifierType &&
    validation.valid &&
    service &&
    // Data Categories is OPTIONAL — full service + category configuration
    // happens in the Fulfillment Wizard's Step 2. Requiring it here forced
    // the user to make decisions they may not have yet and blocked the
    // common "I just need this identifier in scope" flow.
    (!isSupplemental || linkedIdentifierId);

  // Get available services for supplemental (from linked identifier)
  const linkedIdentifier = identifiers.find(
    (id) => id.id === linkedIdentifierId
  );
  const linkedEnabledServices = linkedIdentifier
    ? Object.entries(linkedIdentifier.services || {})
        .filter(([_, svc]: [string, any]) => svc.enabled)
        .map(([key]) => key)
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-[560px] max-h-[calc(100vh-8rem)] overflow-y-auto !top-[5rem] !translate-y-0 !z-[60]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add New Identifier
            <Badge
              variant="outline"
              className="text-xs bg-[#8764b8]/10 text-[#8764b8] border-[#8764b8]/30"
            >
              Fast Entry
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Add a new target identifier to the fulfillment request. Press Enter
            in the value field to quickly add.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Row 1: Type + Value */}
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
            {/* Type */}
            <div className="space-y-1">
              <Label className="text-xs text-[#605e5c] font-semibold">
                Type
              </Label>
              <Popover open={typeOpen} onOpenChange={setTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={typeOpen}
                    aria-label="Select identifier type"
                    className={cn(
                      "w-full h-10 justify-between border-[#c8c6c4] hover:border-[#8764b8] transition-colors bg-white font-normal",
                      !identifierType && "text-[#a19f9d]"
                    )}
                  >
                    {identifierType || "Select type"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 z-[70]" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search identifier types..."
                      className="h-9"
                    />
                    <CommandEmpty>No identifier type found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {sortedIdentifierTypes.map((type) => (
                          <CommandItem
                            key={type}
                            value={type}
                            onSelect={(val) => {
                              setIdentifierType(val);
                              setTypeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                identifierType === type
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {type}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Value */}
            <div className="space-y-1">
              <Label className="text-xs text-[#605e5c] font-semibold">
                Identifier Value
              </Label>
              <Input
                value={identifierValue}
                onChange={(e) => setIdentifierValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAdd) {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder={
                  IDENTIFIER_FORMAT_RULES[identifierType]?.example ||
                  "user@example.com"
                }
                className={cn(
                  "h-10 transition-colors",
                  !validation.valid && identifierValue && identifierType
                    ? "border-[#d13438] hover:border-[#a4262c] focus:border-[#d13438] bg-[#fef6f6]"
                    : "border-[#c8c6c4] hover:border-[#605e5c] focus:border-[#8764b8]"
                )}
                aria-label="Identifier value"
              />
              {!validation.valid &&
                identifierValue &&
                identifierType && (
                  <div className="flex items-start gap-1.5 p-2 bg-[#fef6f6] border border-[#d13438]/30 rounded">
                    <AlertTriangle className="w-3 h-3 text-[#d13438] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#a4262c]">
                        {validation.message}
                      </p>
                      {validation.example && (
                        <p className="text-[10px] text-[#605e5c] mt-0.5">
                          Example:{" "}
                          <span className="font-mono text-[#323130]">
                            {validation.example}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              {validation.valid &&
                identifierValue &&
                identifierType && (
                  <p className="text-xs text-[#107c10] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Valid format — Press Enter to add
                  </p>
                )}
            </div>
          </div>

          {/* Classification Toggle */}
          <div className="space-y-1">
            <Label className="text-xs text-[#605e5c] font-semibold">
              Classification
            </Label>
            <div className="flex items-center gap-2 h-10">
              <Switch
                id="addIdSupplemental"
                checked={isSupplemental}
                onCheckedChange={(checked) => {
                  setIsSupplemental(checked);
                  if (!checked) setLinkedIdentifierId("");
                  setService("");
                  setDataCategories([]);
                }}
                className="data-[state=checked]:bg-[#8764b8]"
              />
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="addIdSupplemental"
                      className="text-sm text-[#605e5c] cursor-pointer border-b border-dashed border-[#a19f9d]"
                    >
                      Supplemental
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs">
                    Supplemental identifiers are discovered during case review
                    and not part of the original LE request
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Non-Supplemental Fields */}
          {!isSupplemental && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#f3f2f1] rounded-md border border-[#edebe9]">
              <div className="sm:col-span-2">
                <p className="text-xs text-[#605e5c] font-medium mb-2">
                  <AlertCircle className="w-3 h-3 inline-block mr-1" />
                  Specify a Microsoft Service. Data Categories are optional
                  — full configuration lives in the Fulfillment Wizard.
                </p>
              </div>
              <ServicePicker
                value={service}
                onChange={(val) => {
                  setService(val);
                  setDataCategories([]);
                }}
                open={serviceOpen}
                onOpenChange={setServiceOpen}
                allServices
              />
              <DataCategoryPicker
                values={dataCategories}
                onChange={setDataCategories}
                disabled={!service}
                open={dataCategoryOpen}
                onOpenChange={setDataCategoryOpen}
              />
            </div>
          )}

          {/* Supplemental Fields */}
          {isSupplemental && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#f3f2f1] rounded-md border border-[#edebe9]">
              <div className="sm:col-span-3">
                <p className="text-xs text-[#605e5c] font-medium mb-2">
                  <AlertCircle className="w-3 h-3 inline-block mr-1" />
                  Link to an LE-provided identifier and pick a service.
                  Data Categories are optional — full configuration lives
                  in the Fulfillment Wizard.
                </p>
              </div>

              {/* Account Check pre-population — supplementals are typically
                  discovered during review (the RS already knows the account
                  exists and what type it is). Pre-stamp the Account Check
                  column so the user doesn't have to re-run Check Accounts
                  just for the new row. */}
              <div className="sm:col-span-3 flex flex-wrap items-end gap-4 pb-2 border-b border-[#edebe9]">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#323130] font-semibold">
                    Account Found
                  </Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      id="supplementalAccountFound"
                      checked={supplementalAccountFound}
                      onCheckedChange={setSupplementalAccountFound}
                      className="data-[state=checked]:bg-[#107c10]"
                    />
                    <Label
                      htmlFor="supplementalAccountFound"
                      className="text-sm text-[#605e5c] cursor-pointer"
                    >
                      {supplementalAccountFound
                        ? "Account exists"
                        : "Account not found"}
                    </Label>
                  </div>
                </div>

                {supplementalAccountFound && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#323130] font-semibold">
                      Account Type
                    </Label>
                    <div
                      role="radiogroup"
                      aria-label="Account type"
                      className="inline-flex h-9 rounded-md border border-[#c8c6c4] bg-white overflow-hidden"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={supplementalAccountType === "Consumer"}
                        onClick={() => setSupplementalAccountType("Consumer")}
                        className={cn(
                          "px-3 text-xs transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8764b8] focus-visible:ring-offset-1",
                          supplementalAccountType === "Consumer"
                            ? "bg-[#0078d4] text-white"
                            : "text-[#323130] hover:bg-[#f3f2f1]",
                        )}
                      >
                        Consumer
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={supplementalAccountType === "Enterprise"}
                        onClick={() => setSupplementalAccountType("Enterprise")}
                        className={cn(
                          "px-3 text-xs border-l border-[#c8c6c4] transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8764b8] focus-visible:ring-offset-1",
                          supplementalAccountType === "Enterprise"
                            ? "bg-[#8764b8] text-white"
                            : "text-[#323130] hover:bg-[#f3f2f1]",
                        )}
                      >
                        Enterprise
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Linked LE Identifier */}
              <div className="space-y-1.5">
                <Label className="text-xs text-[#323130] font-semibold">
                  Linked to LE Identifier *
                </Label>
                <Popover open={linkedIdOpen} onOpenChange={setLinkedIdOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full h-9 justify-between text-xs border-[#c8c6c4] hover:border-[#8764b8] bg-white",
                        !linkedIdentifierId && "text-[#a19f9d]"
                      )}
                    >
                      {linkedIdentifierId ? (
                        <span className="truncate">
                          {identifiers.find(
                            (id) => id.id === linkedIdentifierId
                          )?.value || "Unknown"}
                        </span>
                      ) : (
                        "Select LE identifier..."
                      )}
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0 z-[70]" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search identifiers..."
                        className="h-8 text-xs"
                      />
                      <CommandEmpty className="text-xs py-6">
                        No LE identifier found.
                      </CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {identifiers
                            .filter(
                              (id) =>
                                !id.createdBy?.includes("Supplemental")
                            )
                            .map((id) => (
                              <CommandItem
                                key={id.id}
                                value={id.value}
                                onSelect={() => {
                                  setLinkedIdentifierId(id.id);
                                  setLinkedIdOpen(false);
                                  setService("");
                                  setDataCategories([]);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    linkedIdentifierId === id.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium">
                                    {id.value}
                                  </span>
                                  <span className="text-[10px] text-[#605e5c]">
                                    {id.type}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <ServicePicker
                value={service}
                onChange={(val) => {
                  setService(val);
                  setDataCategories([]);
                }}
                open={serviceOpen}
                onOpenChange={setServiceOpen}
                // When Account Found is on, filter the dropdown to services
                // tagged with the chosen account type (Consumer or
                // Enterprise) — matches the "Add Service" pattern in the
                // Fulfillment Wizard, where each picker row is scoped to
                // the identifier's account type.
                filterByAccountType={
                  supplementalAccountFound
                    ? supplementalAccountType
                    : undefined
                }
                // Fall-back paths used when accountType isn't applicable
                // (Account Found = off, or the legacy enabledServiceKeys
                // flow). Account-type filtering takes precedence when set.
                allServices={linkedEnabledServices.length === 0}
                enabledServiceKeys={linkedEnabledServices}
                disabled={!linkedIdentifierId}
              />
              <DataCategoryPicker
                values={dataCategories}
                onChange={setDataCategories}
                disabled={!service}
                open={dataCategoryOpen}
                onOpenChange={setDataCategoryOpen}
              />
            </div>
          )}

          {/* Created by */}
          <div className="flex items-center gap-1.5 text-xs text-[#605e5c]">
            <User className="w-3 h-3" />
            <span>
              Created by:{" "}
              <span className="text-[#323130] font-medium">
                {isSupplemental
                  ? `Supplemental ${CURRENT_USER}`
                  : CURRENT_USER}
              </span>
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!canAdd}
            className="bg-[#8764b8] hover:bg-[#6b4c9a] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function ServicePicker({
  value,
  onChange,
  open,
  onOpenChange,
  allServices,
  enabledServiceKeys,
  disabled,
  filterByAccountType,
}: {
  value: string;
  onChange: (val: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allServices?: boolean;
  enabledServiceKeys?: string[];
  disabled?: boolean;
  /** When set, filter the dropdown to services in LENS_SERVICES whose
   *  `accountType` matches. Takes precedence over the legacy
   *  `allServices` / `enabledServiceKeys` paths. Mirrors the Fulfillment
   *  Wizard's per-identifier service routing. */
  filterByAccountType?: "Consumer" | "Enterprise";
}) {
  // Account-type filtering uses LENS_SERVICES (22 tagged services) so
  // the dropdown shows exactly what the Fulfillment Wizard would route
  // for an identifier of that type — no enabledServiceKeys intermediary,
  // no MICROSOFT_SERVICES_CONFIG (which is a smaller, untagged catalog).
  const serviceEntries: Array<[string, { name: string; description?: string; icon?: string }]> =
    filterByAccountType
      ? LENS_SERVICES.filter((s) => s.accountType === filterByAccountType).map(
          (s) => [s.key, { name: s.name, description: filterByAccountType, icon: s.icon }],
        )
      : allServices
        ? Object.entries(MICROSOFT_SERVICES_CONFIG)
        : (enabledServiceKeys || []).map((key) => [
            key,
            MICROSOFT_SERVICES_CONFIG[key as keyof typeof MICROSOFT_SERVICES_CONFIG],
          ]).filter(([_, v]) => v) as Array<[string, any]>;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-[#323130] font-semibold">
        {allServices ? "Microsoft Service *" : "Associated Service *"}
      </Label>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn(
              "w-full h-9 justify-between text-xs border-[#c8c6c4] hover:border-[#8764b8] bg-white",
              !value && "text-[#a19f9d]"
            )}
          >
            {value
              ? // Resolve the display name from whichever catalog the value
                // came from — LENS_SERVICES for account-type-filtered picks,
                // MICROSOFT_SERVICES_CONFIG for the legacy paths.
                MICROSOFT_SERVICES_CONFIG[
                  value as keyof typeof MICROSOFT_SERVICES_CONFIG
                ]?.name ||
                LENS_SERVICES.find((s) => s.key === value)?.name ||
                value
              : "Select service..."}
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0 z-[70]" align="start">
          <Command>
            <CommandInput
              placeholder="Search services..."
              className="h-8 text-xs"
            />
            <CommandEmpty className="text-xs py-6">
              No service found.
            </CommandEmpty>
            <CommandList>
              <CommandGroup>
                {(serviceEntries.length > 0 ? serviceEntries : Object.entries(MICROSOFT_SERVICES_CONFIG)).map(
                  ([serviceKey, serviceConfig]: [string, any]) => (
                    <CommandItem
                      key={serviceKey}
                      value={serviceConfig.name}
                      onSelect={() => {
                        onChange(serviceKey);
                        onOpenChange(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === serviceKey ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">
                          {serviceConfig.name}
                        </span>
                        <span className="text-[10px] text-[#605e5c]">
                          {serviceConfig.description}
                        </span>
                      </div>
                    </CommandItem>
                  )
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function DataCategoryPicker({
  values,
  onChange,
  disabled,
  open,
  onOpenChange,
}: {
  values: string[];
  onChange: (vals: string[]) => void;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-[#323130] font-semibold">
        Data Categories
      </Label>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn(
              "w-full h-auto min-h-[36px] justify-between text-xs border-[#c8c6c4] hover:border-[#8764b8] bg-white",
              values.length === 0 && "text-[#a19f9d]"
            )}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {values.length > 0 ? (
                values.map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {cat}
                  </Badge>
                ))
              ) : (
                <span>Select categories...</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0 z-[70]" align="start">
          <Command>
            <CommandInput
              placeholder="Search categories..."
              className="h-8 text-xs"
            />
            <CommandEmpty className="text-xs py-6">
              No category found.
            </CommandEmpty>
            <CommandList>
              <CommandGroup>
                {DATA_CATEGORY_LABELS.map((category) => (
                  <CommandItem
                    key={category}
                    value={category}
                    onSelect={() => {
                      onChange(
                        values.includes(category)
                          ? values.filter((c) => c !== category)
                          : [...values, category]
                      );
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox
                        checked={values.includes(category)}
                        className="h-4 w-4"
                      />
                      <span className="text-xs flex-1">{category}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
