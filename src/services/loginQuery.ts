/**
 * Cross-border login query — aggregates per-identifier login events
 * into country summaries, day-bucketed timelines, and impossible-travel
 * detection.
 *
 * Phase 3 of the prototype-to-prod merge — ported from the prototype's
 * `src/services/loginQuery.ts`. Production wires this through a Kusto /
 * Lynx-backed login service; the prototype reads from `LOGIN_EVENTS`.
 *
 * Conventions:
 *   - Impossible travel = two consecutive *success* logins where the
 *     great-circle distance / elapsed hours exceeds 900 km/h
 *     (commercial-flight-speed threshold).
 *   - VPN / Tor exit nodes are tagged `indeterminate` jurisdiction —
 *     they may resolve as cross-border *or* in-jurisdiction depending
 *     on the real origin, so the panel surfaces them separately.
 *   - "??" country code is also indeterminate (unknown IP).
 */

import { LOGIN_EVENTS } from "../data/mockLoginEvents";
import { lookupIp } from "./geolocation";
import type {
  CrossBorderAgency,
  CountrySummary,
  CrossBorderQueryResult,
  EnrichedLoginEvent,
  JurisdictionStatus,
  TimelineDay,
} from "../types/crossBorder";

const EARTH_RADIUS_KM = 6371;
const MAX_TRAVEL_SPEED_KMH = 900;

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function isoDay(iso: string): string {
  return iso.slice(0, 10);
}

export interface CrossBorderQueryInput {
  /** AccountIdentifier.value string (email / phone / address). */
  identifier: string;
  /** YYYY-MM-DD inclusive. */
  rangeStart: string;
  /** YYYY-MM-DD inclusive. */
  rangeEnd: string;
  issuingAgency?: CrossBorderAgency;
}

function jurisdictionForEvent(
  ev: EnrichedLoginEvent,
  agencyCountryCode: string,
): JurisdictionStatus {
  if (ev.geo.isVpn || ev.geo.isTor || ev.geo.countryCode === "??") {
    return "indeterminate";
  }
  return ev.geo.countryCode === agencyCountryCode
    ? "in_jurisdiction"
    : "cross_border";
}

function jurisdictionForCountry(
  countryCode: string,
  agencyCountryCode: string,
): JurisdictionStatus {
  if (countryCode === "??") return "indeterminate";
  return countryCode === agencyCountryCode
    ? "in_jurisdiction"
    : "cross_border";
}

export function queryLogins(
  input: CrossBorderQueryInput,
): CrossBorderQueryResult {
  const startMs = Date.parse(`${input.rangeStart}T00:00:00Z`);
  const endMs = Date.parse(`${input.rangeEnd}T23:59:59Z`);
  const agency = input.issuingAgency;

  const enriched: EnrichedLoginEvent[] = LOGIN_EVENTS.filter(
    (e) => e.identifier === input.identifier,
  )
    .filter((e) => {
      const ts = Date.parse(e.timestamp);
      return ts >= startMs && ts <= endMs;
    })
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((e) => {
      const geo = lookupIp(e.ip);
      const ev: EnrichedLoginEvent = { ...e, geo };
      if (agency) {
        ev.jurisdiction = jurisdictionForEvent(ev, agency.countryCode);
      }
      return ev;
    });

  let inJurisdictionCount = 0;
  let crossBorderCount = 0;
  let indeterminateCount = 0;
  if (agency) {
    for (const ev of enriched) {
      if (ev.jurisdiction === "in_jurisdiction") inJurisdictionCount++;
      else if (ev.jurisdiction === "cross_border") crossBorderCount++;
      else if (ev.jurisdiction === "indeterminate") indeterminateCount++;
    }
  }

  const byCountry = new Map<string, CountrySummary>();
  for (const ev of enriched) {
    const key = ev.geo.countryCode;
    const existing = byCountry.get(key);
    if (!existing) {
      byCountry.set(key, {
        country: ev.geo.country,
        countryCode: ev.geo.countryCode,
        loginCount: 1,
        firstSeen: ev.timestamp,
        lastSeen: ev.timestamp,
        cities: [ev.geo.city],
        uniqueIps: [ev.ip],
        hasVpn: ev.geo.isVpn,
        hasTor: ev.geo.isTor,
      });
    } else {
      existing.loginCount++;
      if (ev.timestamp < existing.firstSeen) existing.firstSeen = ev.timestamp;
      if (ev.timestamp > existing.lastSeen) existing.lastSeen = ev.timestamp;
      if (!existing.cities.includes(ev.geo.city))
        existing.cities.push(ev.geo.city);
      if (!existing.uniqueIps.includes(ev.ip))
        existing.uniqueIps.push(ev.ip);
      if (ev.geo.isVpn) existing.hasVpn = true;
      if (ev.geo.isTor) existing.hasTor = true;
    }
  }
  const countrySummaries = Array.from(byCountry.values())
    .map((s) => {
      if (agency) {
        s.jurisdiction = jurisdictionForCountry(
          s.countryCode,
          agency.countryCode,
        );
      }
      return s;
    })
    .sort((a, b) => b.loginCount - a.loginCount);

  const impossiblePairs = new Set<string>();
  const succ = enriched.filter((e) => e.outcome === "success");
  for (let i = 1; i < succ.length; i++) {
    const prev = succ[i - 1];
    const curr = succ[i];
    if (prev.geo.countryCode === curr.geo.countryCode) continue;
    const km = haversineKm(
      prev.geo.latitude,
      prev.geo.longitude,
      curr.geo.latitude,
      curr.geo.longitude,
    );
    const hours =
      (Date.parse(curr.timestamp) - Date.parse(prev.timestamp)) / 3_600_000;
    if (hours <= 0) continue;
    if (km / hours > MAX_TRAVEL_SPEED_KMH) {
      impossiblePairs.add(curr.id);
    }
  }

  const dayMap = new Map<string, TimelineDay>();
  for (const ev of enriched) {
    const day = isoDay(ev.timestamp);
    const existing = dayMap.get(day);
    if (!existing) {
      dayMap.set(day, {
        date: day,
        events: [ev],
        countries: [ev.geo.country],
        hasImpossibleTravel: impossiblePairs.has(ev.id),
      });
    } else {
      existing.events.push(ev);
      if (!existing.countries.includes(ev.geo.country)) {
        existing.countries.push(ev.geo.country);
      }
      if (impossiblePairs.has(ev.id)) existing.hasImpossibleTravel = true;
    }
  }
  const timeline = Array.from(dayMap.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return {
    identifier: input.identifier,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    issuingAgency: agency,
    totalEvents: enriched.length,
    events: enriched,
    countrySummaries,
    timeline,
    impossibleEventIds: Array.from(impossiblePairs),
    inJurisdictionCount,
    crossBorderCount,
    indeterminateCount,
  };
}
