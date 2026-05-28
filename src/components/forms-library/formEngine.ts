/**
 * Pure helpers for the Forms & Letters feature. No React imports here —
 * keeps the engine reusable from the filler, preview, and PDF generator.
 */

import type {
  CaseFormInstance,
  EscalationTrigger,
  FormField,
  FormSection,
  FormTemplate,
  VisibilityPredicate,
} from "../../types/formTemplate";
import type { FormData as CaseFormData } from "../../types/caseTypes";
import { getMicrosoftLegalRep } from "../../config/microsoftLegalReps";

// ─── Visibility ─────────────────────────────────────────────────────────

function evaluatePredicate(
  predicate: VisibilityPredicate | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!predicate) return true;
  const v = values[predicate.field];
  if (predicate.equals !== undefined) {
    return v === predicate.equals;
  }
  if (predicate.includesAny && Array.isArray(v)) {
    return predicate.includesAny.some((x) => (v as unknown[]).includes(x));
  }
  return true;
}

export function isFieldVisible(
  field: FormField,
  values: Record<string, unknown>,
): boolean {
  return evaluatePredicate(field.visibleWhen, values);
}

export function isSectionVisible(
  section: FormSection,
  values: Record<string, unknown>,
): boolean {
  return evaluatePredicate(section.visibleWhen, values);
}

// ─── Escalation collection ──────────────────────────────────────────────

/**
 * Walk every multi-checkbox / radio / select selection and return the
 * unique `EscalationTrigger`s for the currently selected option values.
 * De-duplicated by message + level.
 */
export function collectEscalations(
  template: FormTemplate,
  values: Record<string, unknown>,
): EscalationTrigger[] {
  const triggers: EscalationTrigger[] = [];
  const seen = new Set<string>();
  const sectionVisible = new Map<string, boolean>();
  for (const section of template.sections) {
    sectionVisible.set(section.id, isSectionVisible(section, values));
  }

  for (const field of template.fields) {
    if (!field.options) continue;
    if (sectionVisible.get(field.sectionId) === false) continue;
    if (!isFieldVisible(field, values)) continue;

    const v = values[field.id];
    const selected: string[] = Array.isArray(v) ? (v as string[]) : v ? [v as string] : [];

    for (const optValue of selected) {
      const opt = field.options.find((o) => o.value === optValue);
      if (!opt?.escalation) continue;
      const dedupeKey = `${opt.escalation.level}::${opt.escalation.message}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      triggers.push(opt.escalation);
    }
  }

  // Sort: Legal first, then LegalPolicy, by message alpha.
  triggers.sort((a, b) => {
    if (a.level !== b.level) return a.level === "Legal" ? -1 : 1;
    return a.message.localeCompare(b.message);
  });

  return triggers;
}

// ─── Validation ─────────────────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  missingFieldIds: string[];
  /** Field IDs whose textarea value still contains `[…]` placeholder
   *  tokens. Only populated when the template carries
   *  `flagUnresolvedPlaceholders: true`. Soft warning — does NOT fail
   *  `ok`. The Fill page surfaces these as a banner; signing is allowed
   *  to proceed at the Specialist's discretion. */
  unresolvedPlaceholders?: string[];
}

/** Regex matching un-replaced placeholder tokens of the form `[anything]`.
 *  Restricted to a single line so paragraph-wrapped text doesn't match
 *  spuriously. */
const PLACEHOLDER_RE = /\[[^\]\n]+\]/;

export type ValidationMode = "fill" | "sign";

export function validateInstance(
  template: FormTemplate,
  values: Record<string, unknown>,
  mode: ValidationMode = "fill",
): ValidationResult {
  const missing: string[] = [];

  // Pre-compute section visibility once. Fields inside a hidden section
  // (e.g. EPOC Section E when no third-country conflict is selected) must
  // not be flagged as missing — the renderer doesn't even mount them.
  const sectionVisible = new Map<string, boolean>();
  for (const section of template.sections) {
    sectionVisible.set(section.id, isSectionVisible(section, values));
  }

  for (const field of template.fields) {
    if (sectionVisible.get(field.sectionId) === false) continue;
    if (!isFieldVisible(field, values)) continue;
    if (!field.required && field.validation !== "atLeastOne") continue;
    // Signing-time fields (signer name, signing date) are validated by the
    // SignaturePanel — the Fill page's "Continue to Sign" button must not
    // block on them.
    if (mode === "fill" && field.signingTime) continue;

    const v = values[field.id];

    if (field.validation === "atLeastOne") {
      if (!Array.isArray(v) || v.length === 0) {
        missing.push(field.id);
      }
      continue;
    }

    // Plain `required`
    const isEmpty =
      v === undefined ||
      v === null ||
      v === "" ||
      (Array.isArray(v) && v.length === 0);
    if (isEmpty) missing.push(field.id);
  }

  let unresolvedPlaceholders: string[] | undefined;
  if (template.flagUnresolvedPlaceholders) {
    unresolvedPlaceholders = [];
    for (const field of template.fields) {
      if (field.type !== "textarea") continue;
      if (sectionVisible.get(field.sectionId) === false) continue;
      if (!isFieldVisible(field, values)) continue;
      const v = values[field.id];
      if (typeof v !== "string") continue;
      if (PLACEHOLDER_RE.test(v)) unresolvedPlaceholders.push(field.id);
    }
  }

  return {
    ok: missing.length === 0,
    missingFieldIds: missing,
    unresolvedPlaceholders,
  };
}

// ─── Autofill ───────────────────────────────────────────────────────────

/**
 * Resolve every field's `defaultValueFrom` against a frozen snapshot of
 * the case FormData at instance-create time. Special prefixes:
 *  - `__msLegalRep.<key>` reads from the per-region MS legal-rep lookup.
 *  - `__today` returns today's ISO date string.
 *
 * Missing paths leave the field blank for the user to fill.
 */
export function resolveAutofill(
  template: FormTemplate,
  caseData: CaseFormData,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const region = caseData.legalContext?.country?.region;
  const msRep = getMicrosoftLegalRep(region);
  const today = new Date().toISOString().slice(0, 10);

  for (const field of template.fields) {
    if (!field.defaultValueFrom) continue;
    const path = field.defaultValueFrom;

    let value: unknown;

    if (path === "__today") {
      value = today;
    } else if (path === "__rfiDefaultRecipient") {
      // RFI / PAI Recipient default: prefer the Issuing Authority when
      // the case has one set; otherwise fall back to the Enforcing
      // Authority. Both blocks read from CaseFormData.
      const data = caseData as unknown as Record<string, unknown>;
      const hasIA = !!(data.eevidenceIssuingAuthority as { name?: string } | undefined)?.name;
      const hasEA = !!(data.eevidenceEnforcingAuthority as { name?: string } | undefined)?.name;
      value = hasIA ? "IssuingAuthority" : hasEA ? "EnforcingAuthority" : undefined;
    } else if (path.startsWith("__msLegalRep.")) {
      const key = path.slice("__msLegalRep.".length);
      value = (msRep as unknown as Record<string, unknown>)[key];
    } else {
      value = readDotPath(caseData as unknown as Record<string, unknown>, path);
    }

    if (value !== undefined && value !== null && value !== "") {
      out[field.id] = value;
    }
  }

  // Static-default pass — fields with a `defaultValue` string get the
  // literal value, with `{{dotPath}}` tokens substituted via the same
  // path resolver used above. Skipped when `defaultValueFrom` already
  // wrote a value, so the simpler autofill wins when both are set.
  for (const field of template.fields) {
    if (!field.defaultValue) continue;
    if (out[field.id] !== undefined) continue;
    out[field.id] = substituteTokens(field.defaultValue, caseData, msRep, today);
  }

  // Initialize multi-checkbox fields to [] so the controlled input renders
  // a checked-state from the start.
  for (const field of template.fields) {
    if (field.type === "multi-checkbox" && out[field.id] === undefined) {
      out[field.id] = [];
    }
  }

  return out;
}

/** Replace `{{dotPath}}` tokens in a template string using the same path
 *  resolver as `defaultValueFrom`. Tokens whose paths don't resolve are
 *  left as-is; the Specialist sees the unresolved marker so they know
 *  to fill it in. Special prefixes `__today` and `__msLegalRep.<key>`
 *  match the `defaultValueFrom` semantics. */
function substituteTokens(
  text: string,
  caseData: CaseFormData,
  msRep: ReturnType<typeof getMicrosoftLegalRep>,
  today: string,
): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, rawPath: string) => {
    const path = rawPath.trim();
    let value: unknown;
    if (path === "__today") {
      value = today;
    } else if (path.startsWith("__msLegalRep.")) {
      const key = path.slice("__msLegalRep.".length);
      value = (msRep as unknown as Record<string, unknown>)[key];
    } else {
      value = readDotPath(caseData as unknown as Record<string, unknown>, path);
    }
    if (value === undefined || value === null || value === "") return match;
    return String(value);
  });
}

function readDotPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  // Convert Date → ISO date string for date-typed fields.
  if (cur instanceof Date) return cur.toISOString().slice(0, 10);
  return cur;
}

// ─── Instance factory ───────────────────────────────────────────────────

export function createFormInstance(
  template: FormTemplate,
  caseData: CaseFormData,
): CaseFormInstance {
  const now = new Date();
  return {
    instanceId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `inst-${Math.random().toString(36).slice(2, 10)}`,
    templateId: template.id,
    caseId: caseData.caseId,
    status: "Draft",
    values: resolveAutofill(template, caseData),
    createdAt: now,
    updatedAt: now,
  };
}
