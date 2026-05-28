/**
 * Default Enforcing Authority for all eEvidence cases.
 *
 * Per Regulation (EU) 2023/1543, the Enforcing Authority is the
 * competent authority in the *executing* Member State (where the
 * service provider is established) responsible for receiving EPOC
 * notifications and notifying recipients. From Microsoft Ireland
 * Operations Limited's perspective, this is always the same Irish
 * authority — the EA is therefore NOT transmitted in EPOC Form 1
 * (Annex I). Instead, every eEvidence case is linked to this default
 * object, and the case form surfaces it as a fourth read-only
 * "Approver" card alongside the IA / VA / CA blocks from the envelope.
 *
 * Override the default only when a demo case needs to exercise a
 * non-standard EA (e.g., regression test for a Member State that
 * routes through a different ministry).
 */

import type { EEvidenceEnforcingAuthority } from "../types/caseTypes";

export const DEFAULT_EEVIDENCE_ENFORCING_AUTHORITY: EEvidenceEnforcingAuthority =
  {
    name: "Department of Justice (Ireland)",
    contactName: "John O'Sullivan",
    address: "51 St. Stephen's Green\nDublin 2, D02 HK52\nIreland",
    tel: "+353 1 602 8202",
    fax: "+353 1 661 5461",
    email: "central.authority@justice.ie",
  };

/** Resolve the EA for a case: prefer a case-specific override on the
 *  envelope, otherwise fall back to the Microsoft-side default. */
export function resolveEEvidenceEnforcingAuthority(
  caseLevelEa: EEvidenceEnforcingAuthority | undefined,
): EEvidenceEnforcingAuthority {
  return caseLevelEa ?? DEFAULT_EEVIDENCE_ENFORCING_AUTHORITY;
}
