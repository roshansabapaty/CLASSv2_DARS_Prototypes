/**
 * Cross-border detection driven directly by the login query — used to
 * fire the `Cross-Border` escalation reason badge on cases that have no
 * `enterpriseContext` (consumer cases) where the conflict-of-law helper
 * would otherwise return LOW because it only inspects enterprise geo
 * data.
 *
 * Phase 3 of the prototype-to-prod merge — ported from the prototype's
 * `src/helpers/crossBorderSignal.ts`, adapted for DARS_eEvidence's
 * FormData field names (`country`, `dateServed`, `agencyCountryCode`,
 * `requestType`).
 */

import type { FormData } from "../types/caseTypes";
import type { CrossBorderAgency } from "../types/crossBorder";
import { queryLogins } from "../services/loginQuery";

function caseAsAgency(c: FormData): CrossBorderAgency {
  return {
    id: c.caseId,
    name: c.agency ?? "",
    shortName: c.agency ?? "",
    countryCode: c.agencyCountryCode ?? "",
    country: c.country ?? "",
    type:
      c.requestType === "eEvidence" ? "Judicial Authority" : "Law Enforcement",
  };
}

/** Default 30-day query window ending on the case's `dateServed`.
 *  Falls back to "today" when `dateServed` is empty. Returns a
 *  YYYY-MM-DD pair compatible with `queryLogins`. */
function defaultRange(c: FormData): { rangeStart: string; rangeEnd: string } {
  const endIso =
    typeof c.dateServed === "string" && c.dateServed
      ? c.dateServed.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const endMs = Date.parse(`${endIso}T00:00:00Z`);
  const startMs = endMs - 30 * 24 * 60 * 60 * 1000;
  return {
    rangeStart: new Date(startMs).toISOString().slice(0, 10),
    rangeEnd: endIso,
  };
}

/** Returns true if any identifier on the case has at least one
 *  cross-border login in the 30 days before service. Indeterminate
 *  (VPN / Tor / unknown IP) logins do NOT count — they're surfaced
 *  separately in the panel. */
export function hasCrossBorderLogins(c: FormData): boolean {
  if (!c.agencyCountryCode) return false;
  const { rangeStart, rangeEnd } = defaultRange(c);
  const agency = caseAsAgency(c);
  for (const id of c.identifiers ?? []) {
    const result = queryLogins({
      identifier: id.value,
      rangeStart,
      rangeEnd,
      issuingAgency: agency,
    });
    if (result.crossBorderCount > 0) return true;
  }
  return false;
}

/** Returns true if any identifier on the case has at least one
 *  impossible-travel pair detected in the 30 days before service. */
export function hasImpossibleTravelLogins(c: FormData): boolean {
  if (!c.agencyCountryCode) return false;
  const { rangeStart, rangeEnd } = defaultRange(c);
  for (const id of c.identifiers ?? []) {
    const result = queryLogins({
      identifier: id.value,
      rangeStart,
      rangeEnd,
    });
    if (result.impossibleEventIds.length > 0) return true;
  }
  return false;
}
