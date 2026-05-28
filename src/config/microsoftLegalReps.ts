/**
 * Per-region Microsoft legal-representative lookup. Used to autofill the
 * "designated establishment / legal representative" block on outbound forms
 * (e.g. Section H of EPOC Form 3). Keyed by `CaseRegion`.
 *
 * NOTE: The values below are PLACEHOLDERS for the prototype. Before the
 * feature ships, the real entity names, addresses, and contact details
 * should replace them — particularly the EU row, since EU eEvidence
 * regulation requires a specific designated establishment.
 *
 * Owner: lisawu@microsoft.com
 */

import type { CaseRegion } from "../types/caseTypes";

export interface MicrosoftLegalRep {
  designatedEstablishment: string;
  contactName?: string;
  postHeld?: string;
  /** Multi-line address. Newlines preserved in the rendered form. */
  address: string;
  telNo?: string;
  faxNo?: string;
  email: string;
}

export const MICROSOFT_LEGAL_REPS: Record<CaseRegion, MicrosoftLegalRep> = {
  EU: {
    designatedEstablishment: "Microsoft Ireland Operations Limited",
    address:
      "One Microsoft Place\nSouth County Business Park\nLeopardstown\nDublin 18, D18 P521\nIreland",
    email: "eevidence@microsoft.com",
    postHeld: "Designated Establishment",
  },
  EEA: {
    // EEA = EU + Iceland, Liechtenstein, Norway. The eEvidence regulation
    // designates the same MS entity for both surfaces.
    designatedEstablishment: "Microsoft Ireland Operations Limited",
    address:
      "One Microsoft Place\nSouth County Business Park\nLeopardstown\nDublin 18, D18 P521\nIreland",
    email: "eevidence@microsoft.com",
    postHeld: "Designated Establishment",
  },
  US: {
    designatedEstablishment: "Microsoft Corporation",
    address:
      "Law Enforcement and National Security\nOne Microsoft Way\nRedmond, WA 98052\nUnited States",
    email: "lens@microsoft.com",
    postHeld: "Custodian of Records",
  },
  APAC: {
    designatedEstablishment: "Microsoft Asia Pacific (TBD)",
    address: "TBD — confirm regional MS legal entity for APAC requests",
    email: "lens@microsoft.com",
  },
  LATAM: {
    designatedEstablishment: "Microsoft Corporation (TBD)",
    address: "TBD — confirm regional MS legal entity for LATAM requests",
    email: "lens@microsoft.com",
  },
  ROW: {
    designatedEstablishment: "Microsoft Corporation",
    address:
      "Law Enforcement and National Security\nOne Microsoft Way\nRedmond, WA 98052\nUnited States",
    email: "lens@microsoft.com",
  },
};

export function getMicrosoftLegalRep(region: CaseRegion | undefined): MicrosoftLegalRep {
  if (!region) return MICROSOFT_LEGAL_REPS.ROW;
  return MICROSOFT_LEGAL_REPS[region] ?? MICROSOFT_LEGAL_REPS.ROW;
}
