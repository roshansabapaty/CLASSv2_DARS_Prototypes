/**
 * IP → geolocation lookup for the cross-border drill-down feature.
 *
 * Phase 3 of the prototype-to-prod merge — ported from the prototype's
 * `src/services/geolocation.ts`. Production wires this through Lynx /
 * Kusto IP-geo enrichment; the prototype backs it with `GEO_TABLE`.
 */

import { GEO_TABLE } from "../data/mockGeoTable";
import type { GeoLocation } from "../types/crossBorder";

const UNKNOWN_GEO: Omit<GeoLocation, "ip"> = {
  country: "Unknown",
  countryCode: "??",
  region: "—",
  city: "—",
  latitude: 0,
  longitude: 0,
  isp: "Unknown",
  isVpn: false,
  isTor: false,
};

export function lookupIp(ip: string): GeoLocation {
  const hit = GEO_TABLE[ip];
  return { ip, ...(hit ?? UNKNOWN_GEO) };
}
