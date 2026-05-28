/**
 * Cross-border login activity types.
 *
 * Phase 3 of the prototype-to-prod merge — ported from the prototype's
 * `src/types/cross-border.ts`. Single source of truth for the data shape
 * surfaced by the `LoginLocationPanel` drawer and the impossible-travel /
 * VPN / cross-border detection used to fire the Cross-Border reason
 * badge and the conflict-of-law fallback for consumer cases.
 *
 * Wire-up: `services/geolocation.ts` reads `GEO_TABLE` to enrich each
 * `LoginEvent` into an `EnrichedLoginEvent`; `services/loginQuery.ts`
 * aggregates per-country, per-day, and per-jurisdiction summaries.
 */

export interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  isp: string;
  isVpn: boolean;
  isTor: boolean;
}

export type LoginOutcome = "success" | "failure" | "mfa_challenge";

export interface LoginEvent {
  id: string;
  /** Looked up by `AccountIdentifier.value` (email / phone / address
   *  string) — not the identifier's internal id. */
  identifier: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  device: string;
  outcome: LoginOutcome;
}

/** Jurisdictional relationship between a login (or country) and the
 *  issuing authority on a given request. */
export type JurisdictionStatus =
  | "in_jurisdiction"
  | "cross_border"
  | "indeterminate";

/** Lightweight Agency shape used by `services/loginQuery.ts`. The richer
 *  agency model lives in `caseTypes.ts`; this one captures just the bits
 *  the cross-border query cares about (country, type). */
export interface CrossBorderAgency {
  id: string;
  name: string;
  shortName: string;
  countryCode: string;
  country: string;
  type: "Law Enforcement" | "Judicial Authority";
}

export interface EnrichedLoginEvent extends LoginEvent {
  geo: GeoLocation;
  jurisdiction?: JurisdictionStatus;
}

export interface CountrySummary {
  country: string;
  countryCode: string;
  loginCount: number;
  firstSeen: string;
  lastSeen: string;
  cities: string[];
  uniqueIps: string[];
  hasVpn: boolean;
  hasTor: boolean;
  jurisdiction?: JurisdictionStatus;
}

export interface TimelineDay {
  date: string;
  events: EnrichedLoginEvent[];
  countries: string[];
  hasImpossibleTravel: boolean;
}

export interface CrossBorderQueryResult {
  identifier: string;
  rangeStart: string;
  rangeEnd: string;
  issuingAgency?: CrossBorderAgency;
  totalEvents: number;
  events: EnrichedLoginEvent[];
  countrySummaries: CountrySummary[];
  timeline: TimelineDay[];
  impossibleEventIds: string[];
  inJurisdictionCount: number;
  crossBorderCount: number;
  indeterminateCount: number;
}
