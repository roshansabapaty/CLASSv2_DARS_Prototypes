/**
 * Collection Boundaries — the 10 LENS Content Boundaries that the
 * fulfillment-pipeline Collection step can route a job to.
 *
 * Two related-but-distinct concepts on the Step 3 Plan Review table:
 *
 *   • Storage Location — where the account *currently lives* on Azure
 *     (e.g., "North America - East US 2", "Europe - Germany West Central").
 *     Driven by the per-identifier check-accounts result.
 *
 *   • Collection Boundary — where the Collection step will *run* the
 *     job, picked from the 10 LENS-defined buckets below. Derived from
 *     the Storage Location via `mapStorageLocationToCollectionBoundary`.
 *
 * The map is intentionally coarser than the storage-location list: many
 * Azure regions roll up to a single LENS boundary (e.g., West US and
 * East US 2 both land in "United States"). When a storage location
 * doesn't map cleanly, we return `undefined` and the table renders a
 * placeholder instead of guessing.
 */

import { REGION_TO_LOCATION } from "./caseConstants";

export const COLLECTION_BOUNDARIES = [
  "United States",
  "Europe",
  "United Kingdom",
  "Asia Pacific",
  "Brazil",
  "India",
  "Canada",
  "France",
  "Switzerland",
  "Mexico",
] as const;

export type CollectionBoundary = (typeof COLLECTION_BOUNDARIES)[number];

/**
 * Country → LENS Collection Boundary roll-up. Built from the country
 * names that appear in `REGION_TO_LOCATION` plus the two boundary
 * entries (Switzerland, Mexico) that map 1:1 from their own country.
 *
 * If a storage location's country isn't in this table the helper
 * returns `undefined`, signalling to callers that no LENS boundary
 * covers that region today.
 */
const COUNTRY_TO_BOUNDARY: Record<string, CollectionBoundary> = {
  "United States": "United States",
  Canada: "Canada",
  Mexico: "Mexico",
  // Europe roll-up (most EU/EEA countries fall here unless they have a
  // dedicated LENS boundary).
  Netherlands: "Europe",
  Ireland: "Europe",
  Germany: "Europe",
  // Dedicated European boundaries.
  "United Kingdom": "United Kingdom",
  France: "France",
  Switzerland: "Switzerland",
  // Asia Pacific roll-up — Singapore / Hong Kong / Japan / Australia
  // all sit here. India is its own LENS boundary so it's listed below.
  Singapore: "Asia Pacific",
  "Hong Kong": "Asia Pacific",
  Japan: "Asia Pacific",
  Australia: "Asia Pacific",
  // The UAE doesn't have a dedicated LENS boundary; closest LENS bucket
  // is Asia Pacific (Middle East falls under Asia Pacific in LENS's
  // regional taxonomy today).
  "United Arab Emirates": "Asia Pacific",
  India: "India",
  Brazil: "Brazil",
};

/** Geography-prefix fallback. Used when the storage-location string
 *  doesn't match a canonical key but does carry a known geography (e.g.,
 *  seed data like "Europe - West" or "North America - East US"). Picks
 *  the most common LENS boundary for that geography. */
const GEOGRAPHY_PREFIX_TO_BOUNDARY: Array<[string, CollectionBoundary]> = [
  ["north america - ", "United States"],
  ["europe - ", "Europe"],
  ["asia pacific - ", "Asia Pacific"],
  ["south america - ", "Brazil"],
  ["middle east - ", "Asia Pacific"],
];

/** Short region-name → country lookup, derived from `REGION_TO_LOCATION`
 *  values. Lets the boundary helper resolve seed-data variants that
 *  drop the geography prefix (e.g., bare "Japan East" or "West US 2"). */
const REGION_NAME_TO_COUNTRY: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const entry of Object.values(REGION_TO_LOCATION)) {
    map[entry.region.toLowerCase()] = entry.country;
  }
  // Extra aliases for seed-data variants we've observed that don't have
  // a one-to-one entry in REGION_TO_LOCATION. Each maps a known string
  // to the country it most plausibly represents.
  const aliases: Record<string, string> = {
    "west us 2": "United States",   // Azure paired region of West US
    "east us": "United States",     // Older Azure region, paired with East US 2
    "east us 2": "United States",
    "central us": "United States",
    "west us": "United States",
    "west europe": "Netherlands",
    "north europe": "Ireland",
    "uk south": "United Kingdom",
    "germany west central": "Germany",
    "france central": "France",
    "switzerland north": "Switzerland",
    "canada central": "Canada",
    "mexico central": "Mexico",
    "southeast asia": "Singapore",
    "east asia": "Hong Kong",
    "japan east": "Japan",
    "australia east": "Australia",
    "india south": "India",
    "brazil south": "Brazil",
    "uae north": "United Arab Emirates",
  };
  for (const [k, v] of Object.entries(aliases)) {
    if (!(k in map)) map[k] = v;
  }
  return map;
})();

/**
 * Map a raw Azure storage location string (e.g., "North America -
 * East US 2") to the LENS Collection Boundary that the Collection
 * step would route a job to.
 *
 * Resolution order:
 *   1. Direct match against `REGION_TO_LOCATION` keys (canonical form).
 *   2. Match the tail after " - " (or the whole string if no separator)
 *      against `REGION_NAME_TO_COUNTRY`. Catches seed-data variants
 *      like bare "Japan East" or "North America - East US" where the
 *      tail is a known region name.
 *   3. Match the geography prefix ("Europe - …", "Asia Pacific - …")
 *      and fall back to the most common LENS boundary for that
 *      geography. Catches partial seed strings like "Europe - West".
 *   4. Return `undefined` — caller renders "—".
 */
export function mapStorageLocationToCollectionBoundary(
  storageLocation: string | undefined,
): CollectionBoundary | undefined {
  if (!storageLocation) return undefined;
  const raw = storageLocation.trim();

  // 1. Direct canonical match.
  const direct = REGION_TO_LOCATION[raw];
  if (direct) {
    const boundary = COUNTRY_TO_BOUNDARY[direct.country];
    if (boundary) return boundary;
  }

  // 2. Tail match against region-name aliases.
  const tail = raw.includes(" - ")
    ? raw.split(" - ").slice(1).join(" - ")
    : raw;
  const country = REGION_NAME_TO_COUNTRY[tail.toLowerCase()];
  if (country) {
    const boundary = COUNTRY_TO_BOUNDARY[country];
    if (boundary) return boundary;
  }

  // 3. Geography prefix fallback.
  const lower = raw.toLowerCase();
  for (const [prefix, boundary] of GEOGRAPHY_PREFIX_TO_BOUNDARY) {
    if (lower.startsWith(prefix)) return boundary;
  }

  return undefined;
}
