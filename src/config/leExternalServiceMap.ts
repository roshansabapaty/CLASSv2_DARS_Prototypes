/**
 * leExternalServiceMap — translation from LE-supplied external service names
 * (e.g., UK COPO's "Email", "Teams") to internal LENS service keys.
 *
 * Disambiguation: each external name maps to (at most) two internal keys —
 * one for Consumer-typed identifiers, one for Enterprise. Some external
 * names support only ONE account type (SharePoint = Enterprise-only;
 * XBOX/Minecraft = Consumer-only). When the wrong account type is requested,
 * the resolver returns `wrong-account-type` (see resolveExternalServices.ts).
 *
 * Lookup is case-insensitive: see `findExternalMapping` below.
 */

import { LENS_SERVICE_MAP } from "./lensServicesConfig";

export type ExternalAccountType = "Consumer" | "Enterprise";

export interface ExternalServiceMapping {
  Consumer?: string;
  Enterprise?: string;
}

export const LE_EXTERNAL_SERVICE_MAP: Record<string, ExternalServiceMapping> = {
  "Microsoft Account Profile": {
    Consumer: "msaProfile",
    Enterprise: "entraIDProfile",
  },
  Email: {
    Consumer: "exchangeConsumer",
    Enterprise: "exchangeEnterprise",
  },
  Teams: {
    Consumer: "teamsForLife",
    Enterprise: "teamsForBusiness",
  },
  OneDrive: {
    Consumer: "oneDriveConsumer",
    Enterprise: "oneDriveForBusiness",
  },
  SharePoint: {
    Enterprise: "sharePointOnline",
  },
  "XBOX/Minecraft": {
    Consumer: "xbox",
  },
};

/** All external names the system recognizes — for unmapped detection and UI. */
export const KNOWN_EXTERNAL_NAMES: readonly string[] = Object.keys(
  LE_EXTERNAL_SERVICE_MAP
);

/** Case-insensitive + whitespace-trimmed lookup. Returns the canonical entry
 *  (or undefined). Use this rather than direct dict access so LE submissions
 *  with `"email"` / `"EMAIL"` / `" Email "` all match. */
export function findExternalMapping(externalName: string): {
  canonicalName: string;
  mapping: ExternalServiceMapping;
} | undefined {
  if (!externalName) return undefined;
  const normalized = externalName.trim().toLowerCase();
  for (const [name, mapping] of Object.entries(LE_EXTERNAL_SERVICE_MAP)) {
    if (name.toLowerCase() === normalized) {
      return { canonicalName: name, mapping };
    }
  }
  return undefined;
}

/** Dev-time consistency check: every internal key in the map must exist in
 *  the LENS catalog. Run this on import in dev to catch catalog drift loudly. */
export function assertMapConsistency(): void {
  const errors: string[] = [];
  for (const [extName, mapping] of Object.entries(LE_EXTERNAL_SERVICE_MAP)) {
    for (const [accountType, internalKey] of Object.entries(mapping)) {
      if (internalKey && !LENS_SERVICE_MAP[internalKey]) {
        errors.push(
          `${extName} (${accountType}) → "${internalKey}" not in LENS_SERVICE_MAP`
        );
      }
    }
  }
  if (errors.length > 0) {
    // Don't throw in production; do throw in dev so it's noticed.
    const msg = `LE_EXTERNAL_SERVICE_MAP catalog drift:\n  - ${errors.join("\n  - ")}`;
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
      console.error(msg);
    } else {
      console.warn(msg);
    }
  }
}

// Run the consistency check on module load (dev only).
if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
  assertMapConsistency();
}
