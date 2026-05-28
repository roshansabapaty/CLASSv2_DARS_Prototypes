// Pure-function helpers for the new attorney-review surfaces (tri-pane,
// disclosure section, reason badges, enterprise context panels). Ported
// from the prototype `enterprise-attorney-escalation-prototype/src/helpers/`
// and adjusted for DARS_eEvidence field conventions:
//   - `FormData.country` / `FormData.agency` / `FormData.dateServed` /
//     `FormData.natureOfCrimes` (vs. the prototype's `agencyCountry`,
//     `agencyName`, `dateOfService`, `natureOfCrime`)
//   - `Date` objects (not ISO strings) where DARS already uses Date
//
// Cross-border / login-event integration is intentionally stubbed here —
// it lands in Phase 3 of the merge. For now, conflict-of-law heat is
// derived from enterpriseContext data only; consumer cases without an
// enterpriseContext stay at LOW heat until Phase 3.

import type {
  AttorneyEscalation,
  ConflictOfLawHeat,
  EnterpriseUserContext,
  FormData,
} from "../types/caseTypes";
import { hasCrossBorderLogins } from "./crossBorderSignal";
import { queryLogins } from "../services/loginQuery";
import { getActiveAttorneyEscalation } from "./caseEscalation";

// ── Enterprise detection ─────────────────────────────────────────────────

/** True when any trigger fires per spec §3 (CLASS account check, eEvidence
 *  IA flag, domain registry, or manual attorney flag). */
export function isEnterpriseCase(c: FormData): boolean {
  if (
    c.identifiers.some((id) => id.checkAccounts?.accountType === "Enterprise")
  ) {
    return true;
  }
  const e = c.eevidenceEnterpriseRequest;
  if (e?.addressedToController === true || e?.addressedToProcessor === true) {
    return true;
  }
  if (c.enterpriseContext?.triggers.includes("domain_registry")) {
    return true;
  }
  if (c.enterpriseContext?.triggers.includes("manual_attorney_flag")) {
    return true;
  }
  return false;
}

/** Human-readable reasons for the EnterpriseEscalationBanner. */
export function getEnterpriseReasons(c: FormData): string[] {
  const reasons: string[] = [];
  const tenantDomain = c.enterpriseContext?.org.tenantPrimaryDomain;
  if (
    c.identifiers.some((id) => id.checkAccounts?.accountType === "Enterprise")
  ) {
    reasons.push(
      `CLASS confirmed Enterprise tenant${tenantDomain ? `: ${tenantDomain}` : ""}.`,
    );
  }
  const e = c.eevidenceEnterpriseRequest;
  if (e?.addressedToController) {
    reasons.push("eEvidence IA flagged: addressed to controller.");
  }
  if (e?.addressedToProcessor) {
    reasons.push("eEvidence IA flagged: addressed to processor.");
  }
  if (c.enterpriseContext?.triggers.includes("domain_registry")) {
    reasons.push("Domain registry flagged tenant as enterprise.");
  }
  if (c.enterpriseContext?.triggers.includes("manual_attorney_flag")) {
    reasons.push("Manually flagged by attorney/specialist.");
  }
  return reasons;
}

/** Manifest-error: IA's Q1/Q2 disagree with CLASS account-check results. */
export function detectManifestError(
  c: FormData,
): "consumer-detected" | "enterprise-detected" | null {
  const e = c.eevidenceEnterpriseRequest;
  if (!e) return null;
  const iaClaimedEnterprise =
    e.addressedToController === true || e.addressedToProcessor === true;
  const anyEnterpriseDetected = c.identifiers.some(
    (id) => id.checkAccounts?.accountType === "Enterprise",
  );
  const anyConsumerDetected = c.identifiers.some(
    (id) => id.checkAccounts?.accountType === "Consumer",
  );
  if (iaClaimedEnterprise && anyConsumerDetected) return "consumer-detected";
  if (!iaClaimedEnterprise && anyEnterpriseDetected) return "enterprise-detected";
  return null;
}

// ── Conflict-of-law heat ─────────────────────────────────────────────────

/** Minimal country-name → ISO-2 mapping for set comparison. */
const COUNTRY_TO_ISO2: Record<string, string> = {
  "United States": "US",
  "United Kingdom": "GB",
  Germany: "DE",
  Spain: "ES",
  France: "FR",
  Brazil: "BR",
  Ireland: "IE",
  Italy: "IT",
  "EU North": "EU",
  "EU West": "EU",
  EU: "EU",
  US: "US",
  UK: "GB",
};

function toIso(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return COUNTRY_TO_ISO2[s] ?? s.toUpperCase().slice(0, 2);
}

/** Distinct jurisdictions touched across LE / org / user / storage.
 *  Spec §5.2 — mismatch = high. Consumer-case fallback (querying login
 *  events to derive jurisdictions) lands in Phase 3; until then, cases
 *  without an enterpriseContext report LOW. */
export function conflictOfLawHeat(c: FormData): ConflictOfLawHeat {
  const set = new Set<string>();
  const leCountry = toIso(c.country);
  if (leCountry) set.add(leCountry);

  const ec = c.enterpriseContext;
  if (ec) {
    const hq = toIso(ec.org.hqCountry);
    if (hq) set.add(hq);
    const sp = toIso(ec.org.sharePointRegion);
    if (sp) set.add(sp);
    const ds = toIso(ec.org.defaultStorageRegion);
    if (ds) set.add(ds);
    for (const u of ec.users) {
      for (const g of u.geoResolutions30d) set.add(toIso(g) ?? g);
      const mb = toIso(u.mailboxRegion);
      if (mb) set.add(mb);
      const od = toIso(u.oneDriveRegion);
      if (od) set.add(od);
    }
  }
  // Phase 3: consumer-case fallback via login-event query.

  if (set.size <= 1) return "LOW";
  if (set.size === 2) return "MEDIUM";
  return "HIGH";
}

/** Distinct ISO-2 jurisdictions touched across LE / org / user data.
 *  Used by EnterpriseConflictOfLawStrip to render the inline list. */
export function jurisdictionsTouched(c: FormData): string[] {
  const set = new Set<string>();
  const leCountry = toIso(c.country);
  if (leCountry) set.add(leCountry);
  const ec = c.enterpriseContext;
  if (ec) {
    const hq = toIso(ec.org.hqCountry);
    if (hq) set.add(hq);
    for (const u of ec.users) {
      for (const g of u.geoResolutions30d) set.add(toIso(g) ?? g);
    }
  }
  return Array.from(set);
}

// ── Escalation reason badges (Enterprise / Cross-Border / eEvidence / Other) ──

export type EscalationReasonKind =
  | "enterprise"
  | "cross_border"
  | "eevidence"
  | "other";

export interface EscalationReason {
  kind: EscalationReasonKind;
  label: string;
  /** Fluent Badge color token. */
  color: "brand" | "important" | "informative" | "subtle";
  rationale: string;
}

export function getEscalationReasons(c: FormData): EscalationReason[] {
  const reasons: EscalationReason[] = [];

  if (isEnterpriseCase(c)) {
    const tenant = c.enterpriseContext?.org.tenantDisplayName;
    reasons.push({
      kind: "enterprise",
      label: "Enterprise",
      color: "brand",
      rationale: tenant
        ? `Enterprise tenant: ${tenant}.`
        : "Case targets an enterprise tenant.",
    });
  }

  // Cross-Border badge fires when EITHER:
  //   - enterpriseContext-derived conflict-of-law heat is MEDIUM/HIGH
  //     (covers enterprise cases — Phase 2 path), OR
  //   - any identifier has at least one cross-border login event in
  //     the 30 days before service (covers consumer cases where the
  //     conflict-of-law helper would otherwise return LOW because it
  //     only inspects enterprise geo data — Phase 3 path).
  const heat = conflictOfLawHeat(c);
  if (heat !== "LOW") {
    reasons.push({
      kind: "cross_border",
      label: "Cross-Border",
      color: "important",
      rationale: `Conflict-of-law: ${heat} — jurisdictions across LE, user, and storage.`,
    });
  } else if (hasCrossBorderLogins(c)) {
    reasons.push({
      kind: "cross_border",
      label: "Cross-Border",
      color: "important",
      rationale:
        "Identifier has cross-border logins in the 30 days before service.",
    });
  }

  if (c.requestType === "eEvidence") {
    reasons.push({
      kind: "eevidence",
      label: "eEvidence",
      color: "informative",
      rationale: "EU eEvidence (EPOC) request under Reg. 2023/1543.",
    });
  }

  if (reasons.length === 0) {
    // Try to surface the primary attorney-escalation reason as the fallback
    // rationale so "Other" isn't completely opaque.
    const primary = pickPrimaryEscalation(c);
    reasons.push({
      kind: "other",
      label: "Other",
      color: "subtle",
      rationale: primary?.reason ?? "Escalated for general attorney review.",
    });
  }

  return reasons;
}

// `pickPrimaryEscalation` was the local helper that prefers per-identifier
// escalation over the case-level legacy field. It moved to `caseEscalation.
// getActiveAttorneyEscalation` so all read-side callers share one canonical
// accessor; kept here as a thin pass-through for internal references.
function pickPrimaryEscalation(c: FormData): AttorneyEscalation | undefined {
  return getActiveAttorneyEscalation(c);
}

// ── Auto-suggestion chips (spec §6.3) ────────────────────────────────────

export type AutoSuggestionKind =
  | "flag_policy_review"
  | "flag_exec_review"
  | "check_concession_tracker"
  | "consider_redirect";

export interface AutoSuggestion {
  kind: AutoSuggestionKind;
  label: string;
  rationale: string;
}

export function computeAutoSuggestions(c: FormData): AutoSuggestion[] {
  const ec = c.enterpriseContext;
  if (!ec) return [];
  const out: AutoSuggestion[] = [];

  const seats = ec.org.exchangeSeatCount ?? 0;
  if (seats > 5000 && !ec.execReviewRequired) {
    out.push({
      kind: "flag_exec_review",
      label: "Flag for Exec Review?",
      rationale: `${seats.toLocaleString()} seats exceeds 5,000 threshold.`,
    });
  }
  if ((seats > 50 || ec.org.isS500) && !ec.policyReviewRequired) {
    out.push({
      kind: "flag_policy_review",
      label: "Flag for Policy Review?",
      rationale: ec.org.isS500
        ? "Tenant is S500."
        : `${seats.toLocaleString()} seats exceeds 50 threshold.`,
    });
  }
  if (ec.org.hasDerogation && !ec.derogationCheck) {
    out.push({
      kind: "check_concession_tracker",
      label: "Check Concession Tracker?",
      rationale: "Tenant flagged with derogation; needs verification.",
    });
  }
  if (conflictOfLawHeat(c) === "HIGH" && !ec.redirectedToEnterprise) {
    out.push({
      kind: "consider_redirect",
      label: "Consider Redirect to Enterprise?",
      rationale: "Multiple jurisdictions touched; redirect path available.",
    });
  }
  return out;
}

// ── Target Identifier summary (tri-pane stripe) ──────────────────────────

export interface TargetUserSummary extends EnterpriseUserContext {
  /** True when this summary was derived from a fallback path (e.g. no
   *  enterpriseContext entry exists). Phase 2 only returns false because
   *  the fallback (login-event derived) lands in Phase 3. */
  derivedFromLogins: boolean;
}

/** Returns the Target Identifier stripe data for the tri-pane summary.
 *  Prefers the rich enterpriseContext.users entry; in Phase 2 returns
 *  null when no entry exists. Phase 3 adds the login-event fallback. */
export function getTargetUserSummary(
  c: FormData,
  identifierId?: string,
): TargetUserSummary | null {
  const id =
    (identifierId && c.identifiers.find((i) => i.id === identifierId)) ||
    c.identifiers[0];
  if (!id) return null;

  const fromEc = c.enterpriseContext?.users.find(
    (u) => u.identifierId === id.id,
  );
  if (fromEc) {
    return { ...fromEc, derivedFromLogins: false };
  }

  // Phase 3 fallback: derive the summary from login events. Lets the
  // tri-pane Target Identifier stripe surface "Last logon" + the
  // cross-border activity entry point on consumer cases that have no
  // enterpriseContext entry. 30-day window ending on dateServed (or
  // today when unset).
  const endIso =
    typeof c.dateServed === "string" && c.dateServed
      ? c.dateServed.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const endMs = Date.parse(`${endIso}T00:00:00Z`);
  const startIso = new Date(endMs - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const result = queryLogins({
    identifier: id.value,
    rangeStart: startIso,
    rangeEnd: endIso,
  });
  if (result.totalEvents === 0) return null;

  const latest = result.events[result.events.length - 1];
  const lastLogonLocation = latest
    ? `${latest.geo.city}, ${latest.geo.country}`
    : undefined;
  const distinctCountries = Array.from(
    new Set(result.events.map((e) => e.geo.country).filter(Boolean)),
  );

  return {
    identifierId: id.id,
    identifierValue: id.value,
    lastLogonLocation,
    geoResolutions30d: distinctCountries,
    mailboxRegion: undefined,
    oneDriveRegion: undefined,
    conflictOfLawJurisdictions: distinctCountries,
    derivedFromLogins: true,
  };
}
