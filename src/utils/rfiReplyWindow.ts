/**
 * RFI reply-window helper — computes the deadline for replying to an
 * inbound `RequestAdditionalInformation` from the authority.
 *
 * Per Edge Case 1 (see `docs/RFI_PAI_Edge_Cases_For_Review.md`), the
 * window is **per-jurisdiction**. When the authority's RFI carries an
 * explicit `followUp.requiredBy`, we use that; otherwise we fall back
 * to a jurisdiction-specific default sourced from the table below.
 *
 * Day counting is **calendar days** for the prototype — per-jurisdiction
 * business-day handling is a documented follow-up before production.
 *
 * IMPORTANT: the day-count values are placeholders. Legal needs to
 * confirm each jurisdiction's procedural-law window. Each entry below
 * carries a `// TODO(legal)` flag so the placeholders can't slip into
 * a production release un-reviewed.
 */

import { EU_COUNTRIES } from "../constants/caseConstants";

/** Window-source classification. `metadata` means the authority gave
 *  us an explicit deadline; `default` means we used the jurisdiction
 *  table; `unknown` means we couldn't classify and used a generic
 *  fallback. Used by the UI to caveat its copy. */
export type ReplyWindowSource = "metadata" | "default" | "unknown";

export interface ReplyWindow {
  days: number;
  source: ReplyWindowSource;
  /** Which jurisdiction bucket the default came from. Surfaced in
   *  tooltips so the RS can see "EU default (5 days)" vs "US default
   *  (10 days)". */
  bucket?: string;
}

/** Reply-window defaults per jurisdiction bucket. Values are PLACEHOLDERS
 *  pending Legal sign-off; the `// TODO(legal)` tags exist so a grep
 *  surfaces them in the production hardening pass. */
const DEFAULT_WINDOW_DAYS: Record<string, number> = {
  // TODO(legal): Confirm EU window. Reg 2023/1543 Art. 9(6) talks about
  // the IA replying to *our* Form 3 within 5 days of acknowledgement —
  // not the inverse direction. Until Legal confirms, 5 days is the
  // safest parity assumption.
  EU: 5,
  // TODO(legal): Confirm UK window. Crime (Overseas Production Orders)
  // Act 2019 + CrimPR Pt 47 govern UK MLA exchanges; the per-authority
  // window for our reply isn't documented in the prototype.
  UK: 7,
  // TODO(legal): Confirm US window. Federal subpoenas + ECPA don't
  // generally bind the recipient to a reply window for clarification
  // questions; 14 days is the prototype's safe default.
  US: 14,
  // TODO(legal): Confirm CA window.
  CA: 14,
  // TODO(legal): Confirm AU window. International Mutual Assistance
  // requests via the Attorney-General's Department typically allow
  // 10-14 days for clarification responses.
  AU: 14,
  // Generic fallback for jurisdictions we haven't bucketed. The RS
  // tooltip will surface "unknown jurisdiction — generic default" so
  // the RS knows the window isn't authoritatively anchored.
  __fallback: 10,
};

/** Resolve a case's jurisdiction bucket from its country string.
 *  EU countries collapse to the "EU" bucket (Reg 2023/1543 applies
 *  uniformly across EU 27); non-EU countries use their country code
 *  when we've buckets for them, else the generic fallback. */
function bucketForCountry(country: string | undefined): string {
  if (!country) return "__fallback";
  if (EU_COUNTRIES.includes(country)) return "EU";
  // Match against common non-EU bucket names. Country names come from
  // the case-form `country` field which is human-readable (e.g.
  // "United Kingdom", "United States"); we lowercase + match keywords.
  const lower = country.toLowerCase();
  if (lower.includes("united kingdom") || lower === "uk" || lower === "england") {
    return "UK";
  }
  if (lower.includes("united states") || lower === "us" || lower === "usa") {
    return "US";
  }
  if (lower.includes("canada")) return "CA";
  if (lower.includes("australia")) return "AU";
  return "__fallback";
}

/** Display label for a bucket, surfaced in tooltips. */
export function bucketLabel(bucket: string): string {
  switch (bucket) {
    case "EU":
      return "EU (Reg 2023/1543 parity)";
    case "UK":
      return "United Kingdom";
    case "US":
      return "United States";
    case "CA":
      return "Canada";
    case "AU":
      return "Australia";
    case "__fallback":
      return "unknown jurisdiction — generic default";
    default:
      return bucket;
  }
}

/** Resolve the reply window for an inbound RFI. When the inbound
 *  carries an explicit `followUp.requiredBy`, that wins (source =
 *  `metadata`); otherwise we use the jurisdiction default. */
export function resolveReplyWindow(
  inbound:
    | { createdAt: Date | string; followUp?: { requiredBy?: Date } }
    | undefined,
  caseCountry: string | undefined,
): ReplyWindow | undefined {
  if (!inbound) return undefined;
  // Authority-provided deadline overrides everything.
  if (inbound.followUp?.requiredBy) {
    const explicit = new Date(inbound.followUp.requiredBy);
    const createdAt = new Date(inbound.createdAt);
    const ms = explicit.getTime() - createdAt.getTime();
    const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    return { days, source: "metadata" };
  }
  // Per-jurisdiction default.
  const bucket = bucketForCountry(caseCountry);
  const days = DEFAULT_WINDOW_DAYS[bucket] ?? DEFAULT_WINDOW_DAYS.__fallback;
  return {
    days,
    source: bucket === "__fallback" ? "unknown" : "default",
    bucket,
  };
}

/** Returns days-left until the reply window closes. Negative numbers
 *  mean the window has been breached. Calendar-day math (per
 *  prototype decision; see edge-case doc). */
export function daysLeftForInboundRfi(
  inbound:
    | { createdAt: Date | string; followUp?: { requiredBy?: Date } }
    | undefined,
  caseCountry: string | undefined,
): number | undefined {
  if (!inbound) return undefined;
  const window = resolveReplyWindow(inbound, caseCountry);
  if (!window) return undefined;
  const deadlineMs =
    new Date(inbound.createdAt).getTime() +
    window.days * 24 * 60 * 60 * 1000;
  const diffMs = deadlineMs - Date.now();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

/** Convenience: was the reply window breached? */
export function isInboundRfiOverdue(
  inbound:
    | { createdAt: Date | string; followUp?: { requiredBy?: Date } }
    | undefined,
  caseCountry: string | undefined,
): boolean {
  const remaining = daysLeftForInboundRfi(inbound, caseCountry);
  return remaining !== undefined && remaining <= 0;
}

/** Stable id for an `RfiReplyOverdue` audit event tied to a specific
 *  inbound. Lets the breach-detection effect dedupe — once a breach
 *  event exists for inbound X, we don't write another on subsequent
 *  renders. */
export function rfiOverdueAuditId(inboundId: string): string {
  return `audit-rfi-overdue-${inboundId}`;
}
