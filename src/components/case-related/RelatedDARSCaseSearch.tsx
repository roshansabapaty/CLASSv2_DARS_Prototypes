/**
 * RelatedDARSCaseSearch — combobox/chip control for linking the current case
 * to other DARS cases that share an identifier, agency, contact, tenant,
 * LNS number, or LE reference number.
 *
 * Replaces the plain comma-separated "Related DARS Cases" input on the Case
 * Identification card. Search is intentionally broad: the index packs every
 * field a Triage Specialist might recall when relating cases, so typing any
 * fragment (LNS digits, an agent email, the agency short name, a sample
 * target identifier value, a tenant ID stub, or an LE reference number)
 * surfaces the relevant case.
 *
 * State contract: keeps the parent's existing
 * `relatedCaseNumbers: string` shape (comma-separated case IDs) so wiring
 * into FormData stays a one-line replacement.
 */

import * as React from "react";
import { Search, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { MOCK_CASES, type CaseQueueItem } from "../case-queue/case-queue-types";

// ---------------------------------------------------------------------------
// Synthetic per-case search records.
//
// MOCK_CASES carries the queue-level summary but not the agency contact,
// tenant, identifier values, or LE reference numbers a TS would actually
// search by. For the prototype we derive a richer record per case keyed off
// `country` (agency directory) + `caseId` (deterministic LE-ref synthesis).
// In production this index would come from the DARS search service.
// ---------------------------------------------------------------------------

interface AgencyDirectoryEntry {
  agencyName: string;
  agencyShortName: string;
  primaryContact: { name: string; email: string; phone: string };
  tenant?: string;
}

const AGENCY_DIRECTORY: Record<string, AgencyDirectoryEntry> = {
  "United States": {
    agencyName: "FBI — Cyber Division",
    agencyShortName: "FBI",
    primaryContact: {
      name: "SSA Jennifer Walsh",
      email: "j.walsh@ic.fbi.gov",
      phone: "+1 (202) 324-3001",
    },
  },
  "Canada": {
    agencyName: "Royal Canadian Mounted Police — Cybercrime Unit",
    agencyShortName: "RCMP",
    primaryContact: {
      name: "Cpl. Élodie Tremblay",
      email: "e.tremblay@rcmp-grc.gc.ca",
      phone: "+1 (613) 993-7268",
    },
  },
  "United Kingdom": {
    agencyName: "National Crime Agency — Cyber Crime Unit",
    agencyShortName: "NCA",
    primaryContact: {
      name: "DI Oliver Hastings",
      email: "o.hastings@nca.gov.uk",
      phone: "+44 20 7238 8001",
    },
  },
  "Germany": {
    agencyName: "Bundeskriminalamt (BKA) — Cybercrime Division",
    agencyShortName: "BKA",
    primaryContact: {
      name: "KHK Stefan Müller",
      email: "s.mueller@bka.bund.de",
      phone: "+49 611 55-1234",
    },
    tenant: "contoso-de.onmicrosoft.com",
  },
  "Australia": {
    agencyName: "Australian Federal Police — Cybercrime Operations",
    agencyShortName: "AFP",
    primaryContact: {
      name: "Det. Sgt. Liam O'Brien",
      email: "l.obrien@afp.gov.au",
      phone: "+61 2 6131 3001",
    },
  },
  "France": {
    agencyName: "Direction Centrale de la Police Judiciaire — OCLCTIC",
    agencyShortName: "OCLCTIC",
    primaryContact: {
      name: "Cmdt. Sophie Durand",
      email: "s.durand@interieur.gouv.fr",
      phone: "+33 1 40 97 80 01",
    },
    tenant: "fabrikam-fr.onmicrosoft.com",
  },
  "Netherlands": {
    agencyName: "Politie Nederland — Team High Tech Crime",
    agencyShortName: "Politie NL",
    primaryContact: {
      name: "Insp. Anouk de Vries",
      email: "a.devries@politie.nl",
      phone: "+31 88 6624 700",
    },
  },
  "Italy": {
    agencyName: "Polizia Postale e delle Comunicazioni",
    agencyShortName: "Polizia Postale",
    primaryContact: {
      name: "Ispettore Marco Bianchi",
      email: "m.bianchi@poliziadistato.it",
      phone: "+39 06 4686 1234",
    },
  },
  "Spain": {
    agencyName: "Cuerpo Nacional de Policía — Unidad de Investigación Tecnológica",
    agencyShortName: "CNP-UIT",
    primaryContact: {
      name: "Insp. Laura Fernández",
      email: "l.fernandez@policia.es",
      phone: "+34 91 322 4170",
    },
  },
  "Greece": {
    agencyName: "Hellenic Police — Cyber Crime Division",
    agencyShortName: "HP Cyber",
    primaryContact: {
      name: "Lt. Dimitris Papadopoulos",
      email: "d.papadopoulos@astynomia.gr",
      phone: "+30 21 3231 4567",
    },
  },
  "Belgium": {
    agencyName: "Federale Politie — Federal Computer Crime Unit",
    agencyShortName: "FCCU",
    primaryContact: {
      name: "Comm. Marie Janssens",
      email: "m.janssens@police.belgium.eu",
      phone: "+32 2 642 7000",
    },
  },
  "Poland": {
    agencyName: "Policja — Biuro do Walki z Cyberprzestępczością",
    agencyShortName: "Policja BWzC",
    primaryContact: {
      name: "Insp. Krzysztof Nowak",
      email: "k.nowak@policja.gov.pl",
      phone: "+48 22 60 121 12",
    },
  },
};

const IDENTIFIER_SAMPLES_BY_CASE: Record<string, string[]> = {
  // Only the cases we surface with identifiable demo values. Defaults below.
  "LNS-2026-00265": ["greek.subject@outlook.com"],
  "LNS-2026-00255": ["be.subject@hotmail.com"],
  "LNS-2026-00250": ["journalist@onet.pl", "+48 22 555 0142"],
  "LNS-2026-00240": ["senator.it@outlook.com"],
  "LNS-2026-00230": ["target.nl@live.com", "target2.nl@outlook.com"],
  "LNS-2026-00220": ["target.nl@live.com", "target2.nl@outlook.com"],
  "LNS-2026-00210": ["subject.it@outlook.com"],
  "LNS-2026-00200": ["subject.fr@outlook.com"],
  "LNS-2026-00190": ["subject.de@outlook.com"],
  "LNS-2026-00180": ["subject.es@outlook.com"],
  "LNS-2026-00170": ["uk.subject@outlook.com"],
  "LNS-2026-00160": ["subject-uk@outlook.com"],
  "LNS-2026-00150": ["subject.de@outlook.com", "subject2.de@outlook.com"],
  "LNS-2025-00142": ["abducted.minor@gmail.com", "+1 425 555 0142"],
  "LNS-2025-00125": ["fraud.uk@outlook.com"],
  "LNS-2025-00103": ["dealer.au@outlook.com", "+61 2 5550 1003"],
  "LNS-2025-00095": ["stalker.us@hotmail.com"],
  "LNS-2026-984174": ["civil.us@outlook.com"],
  "LNS-2025-00147": ["fraud.fr@outlook.com", "fraud2.fr@outlook.com"],
};

// Synthetic LE reference numbers (a TS sometimes only has this from the LE
// notification email). Deterministic prefix per country + the case suffix.
const LE_REFERENCE_PREFIX: Record<string, string> = {
  "United States": "FBI-CY-",
  "Canada": "RCMP-CC-",
  "United Kingdom": "NCA-CCU-",
  "Germany": "BKA-CC-",
  "Australia": "AFP-CY-",
  "France": "OCLCTIC-",
  "Netherlands": "POL-NL-HTC-",
  "Italy": "PP-CY-",
  "Spain": "CNP-UIT-",
  "Greece": "HP-CY-",
  "Belgium": "FCCU-",
  "Poland": "PL-CYB-",
};

interface SearchRecord {
  caseId: string;
  caseStage: string;
  requestType: string;
  requestSubType?: string;
  country: string;
  agencyName: string;
  agencyShortName: string;
  agencyCaseNumber: string;
  primaryContact: { name: string; email: string; phone: string };
  tenant?: string;
  identifiers: string[];
  /** Concatenated search blob — cmdk filters against the CommandItem value. */
  searchValue: string;
}

function buildSearchRecord(item: CaseQueueItem): SearchRecord {
  const agency = AGENCY_DIRECTORY[item.country] ?? {
    agencyName: `${item.country} Authority`,
    agencyShortName: item.country,
    primaryContact: {
      name: "Primary Contact",
      email: "contact@authority.gov",
      phone: "+1 555 0100",
    },
  };
  const refPrefix = LE_REFERENCE_PREFIX[item.country] ?? "REF-";
  const suffix = item.caseId.replace(/^LNS-/, "");
  const agencyCaseNumber = `${refPrefix}${suffix}`;
  const identifiers = IDENTIFIER_SAMPLES_BY_CASE[item.caseId] ?? [];

  return {
    caseId: item.caseId,
    caseStage: item.caseStage,
    requestType: item.requestType,
    requestSubType: item.requestSubType,
    country: item.country,
    agencyName: agency.agencyName,
    agencyShortName: agency.agencyShortName,
    agencyCaseNumber,
    primaryContact: agency.primaryContact,
    tenant: agency.tenant,
    identifiers,
    searchValue: [
      item.caseId,
      item.requestType,
      item.requestSubType ?? "",
      item.country,
      agency.agencyName,
      agency.agencyShortName,
      agencyCaseNumber,
      agency.primaryContact.name,
      agency.primaryContact.email,
      agency.primaryContact.phone,
      agency.tenant ?? "",
      ...identifiers,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

const SEARCH_INDEX: SearchRecord[] = MOCK_CASES.map(buildSearchRecord);
const SEARCH_INDEX_BY_ID: Record<string, SearchRecord> = SEARCH_INDEX.reduce(
  (acc, rec) => {
    acc[rec.caseId] = rec;
    return acc;
  },
  {} as Record<string, SearchRecord>,
);

// ---------------------------------------------------------------------------
// Public types + component
// ---------------------------------------------------------------------------

export interface RelatedDARSCaseSearchProps {
  /** Comma-separated case IDs (e.g. "LNS-2026-00220,LNS-2025-00125"). */
  value: string;
  /** Fires with the next comma-separated string. */
  onChange: (next: string) => void;
  /** When set, the current case is hidden from the result list. */
  currentCaseId?: string;
  /** Error message — when present, the trigger gets the error ring. */
  error?: string;
  /** Hint text shown beneath the field when there is no error. */
  hint?: string;
  /** id="" for label association. */
  id?: string;
  disabled?: boolean;
}

function parseValue(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function serializeValue(ids: string[]): string {
  return ids.join(", ");
}

export function RelatedDARSCaseSearch({
  value,
  onChange,
  currentCaseId,
  error,
  hint,
  id,
  disabled,
}: RelatedDARSCaseSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedIds = React.useMemo(() => parseValue(value), [value]);

  const handleAdd = (caseId: string) => {
    if (selectedIds.includes(caseId)) {
      return;
    }
    onChange(serializeValue([...selectedIds, caseId]));
    setQuery("");
  };

  const handleRemove = (caseId: string) => {
    onChange(serializeValue(selectedIds.filter((id) => id !== caseId)));
  };

  // Result list excludes the current case + cases already selected.
  const candidates = React.useMemo(
    () =>
      SEARCH_INDEX.filter(
        (rec) =>
          rec.caseId !== currentCaseId && !selectedIds.includes(rec.caseId),
      ),
    [currentCaseId, selectedIds],
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={!!error}
            disabled={disabled}
            className={cn(
              "w-full justify-start h-8 px-3 font-normal text-[#605e5c] border-[#c8c6c4]",
              error && "border-[#d13438] focus-visible:ring-[#d13438]",
            )}
          >
            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <span className="truncate text-xs">
              Search by LNS, agency, identifier, contact, tenant, or LE reference…
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-[420px] p-0 z-[70]"
          align="start"
        >
          <Command shouldFilter>
            <CommandInput
              placeholder="Type a case ID, identifier, agency, contact, tenant…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-[320px]">
              <CommandEmpty>
                No DARS cases match. Try a target identifier value, an LNS
                fragment (e.g. "00220"), an agency short name (e.g. "NCA"),
                or a contact email.
              </CommandEmpty>
              <CommandGroup heading="Matching DARS cases">
                {candidates.map((rec) => (
                  <CommandItem
                    key={rec.caseId}
                    value={rec.searchValue}
                    onSelect={() => handleAdd(rec.caseId)}
                    className="flex flex-col items-start gap-1 py-2 cursor-pointer"
                  >
                    <div className="flex items-baseline gap-2 w-full">
                      <span className="text-sm font-semibold text-[#323130]">
                        {rec.caseId}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase tracking-wide px-1.5 py-0 border-[#c8c6c4] text-[#605e5c]"
                      >
                        {rec.requestType}
                        {rec.requestSubType && rec.requestSubType !== "None"
                          ? ` · ${rec.requestSubType}`
                          : ""}
                      </Badge>
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-[#605e5c]">
                        {rec.caseStage}
                      </span>
                    </div>
                    <div className="text-xs text-[#605e5c] w-full truncate">
                      {rec.agencyShortName} · {rec.country} ·{" "}
                      <span className="text-[#8a8886]">{rec.agencyCaseNumber}</span>
                    </div>
                    {rec.identifiers.length > 0 && (
                      <div className="text-[11px] text-[#8a8886] w-full truncate">
                        {rec.identifiers.slice(0, 2).join(" · ")}
                        {rec.identifiers.length > 2
                          ? ` · +${rec.identifiers.length - 2}`
                          : ""}
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((caseId) => {
            const rec = SEARCH_INDEX_BY_ID[caseId];
            const label = rec
              ? `${caseId} · ${rec.agencyShortName}`
              : caseId;
            return (
              <span
                key={caseId}
                className="inline-flex items-center gap-1 rounded-md border border-[#c8c6c4] bg-[#f3f2f1] px-2 py-0.5 text-xs text-[#323130]"
              >
                <span className="font-medium">{label}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(caseId)}
                    aria-label={`Remove ${caseId}`}
                    className="text-[#605e5c] hover:text-[#d13438] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0078d4] rounded"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {error ? (
        <p className="text-xs text-[#d13438]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[#605e5c]">{hint}</p>
      ) : null}
    </div>
  );
}
