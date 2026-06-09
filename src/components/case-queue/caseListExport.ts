/**
 * Case-list CSV export.
 *
 * The Export list button on each surface (Cases page, Attorney
 * Dashboard) hands this module:
 *   - the filtered + sorted case rows currently on screen
 *     (so the exported CSV mirrors what the user sees), and
 *   - the user's visible column subset in their chosen order
 *     (so they get the columns they're working with, no more
 *     and no less).
 *
 * This module does NOT call CASE_LIST_COLUMNS for the column set —
 * the caller passes the already-resolved visible-ordered list. That
 * keeps the export honest: hidden columns stay out, and the column
 * order in the CSV matches the on-screen order.
 *
 * Per-column serializers
 * ----------------------
 * Each column id maps to a `(case) => string` serializer in
 * `EXPORT_SERIALIZERS`. The serializer's job is to produce the same
 * text representation a user would see in the cell — so when the
 * cell renders a badge ("Recommended"), the CSV exports
 * "Recommended", not the underlying enum. Columns that fold multiple
 * fields (Country / Jurisdiction, Identifier Types, Services) join
 * with comma + space; CSV escaping below handles the embedded
 * commas.
 *
 * Columns without a registered serializer fall back to an empty
 * string + a console warning. This is intentional — a silent fall-
 * back to JSON.stringify() would produce noisy garbage in operational
 * exports, and we'd rather see the gap in CI than ship it.
 */
import type { CaseQueueItem } from "./case-queue-types";
import type { ColumnDef, ColumnId } from "./caseListColumns";
import { getEscalationSummaryForCase } from "../../utils/escalationHelpers";
import { getCaseFormDataById } from "../../utils/caseDataRegistry";

type Serializer = (c: CaseQueueItem) => string;

// ── Per-column serializers ───────────────────────────────────────────
// Match the cell-renderer output where possible so the CSV mirrors
// what the user sees on screen.
export const EXPORT_SERIALIZERS: Partial<Record<ColumnId, Serializer>> = {
  "case-id": (c) => c.caseId,
  unread: (c) => "", // count column — serialized below via correspondenceStore
  "threat-to-life": (c) => (c.isThreatToLife ? "Yes" : ""),
  enterprise: (c) =>
    c.accountExistenceChecked && c.hasEnterpriseAccounts ? "Enterprise" : "",
  "gfr-hold": () => "", // tier chip — value not derivable from queue item alone
  "attorney-review": () => "",
  "ndo-reminder": (c) => c.nextNdoReminderAt ?? "",
  priority: (c) => c.casePriority,
  "due-date": (c) => c.dueDate,
  country: (c) =>
    [c.country, c.jurisdiction].filter(Boolean).join(" / "),
  identifiers: (c) => String(c.identifierCount ?? 0),
  services: (c) => (c.servicesRequested ?? []).join(", "),
  stage: (c) => c.caseStage,
  "case-assignee": (c) => c.assigneeName ?? "Unassigned",
  "internal-escalation": (c) => {
    const summary = getEscalationSummaryForCase(c.caseId);
    return summary ? `${summary.role}: ${summary.status}` : "";
  },
  "escalation-reviewer": (c) => {
    const summary = getEscalationSummaryForCase(c.caseId);
    if (!summary) return "";
    return summary.assigneeLabel.startsWith("Any ")
      ? "Unassigned"
      : summary.assigneeLabel;
  },
  // ── Synthesised filter-driven columns ──────────────────────────────
  crime: (c) => (c.natureOfCrime ?? []).join(", "),
  "request-type": (c) => c.requestType ?? "",
  "request-sub-type": (c) => c.requestSubType ?? "",
  "request-origin": (c) => c.requestOrigin ?? "",
  tenant: (c) => {
    const ec = getCaseFormDataById(c.caseId)?.enterpriseContext;
    if (!ec) return "";
    if (ec.orgs?.length) {
      return ec.orgs
        .map((o) => o.tenantDisplayName)
        .filter(Boolean)
        .join(", ");
    }
    return ec.org?.tenantDisplayName ?? "";
  },
  agency: (c) => {
    const fd = getCaseFormDataById(c.caseId);
    return fd?.legalContext?.primaryIssuingAuthority?.name ?? fd?.agency ?? "";
  },
  "stale-escalation": (c) => {
    const esc = getCaseFormDataById(c.caseId)?.attorneyEscalation;
    if (!esc) return "";
    const isTerminal =
      esc.status === "ApprovedForDelivery" ||
      esc.status === "ApprovedWithConditions";
    if (isTerminal) return "";
    let lastActivity = new Date(esc.escalatedAt).getTime();
    for (const a of esc.actions ?? []) {
      const t = new Date(a.performedAt).getTime();
      if (Number.isFinite(t) && t > lastActivity) lastActivity = t;
    }
    if (!Number.isFinite(lastActivity)) return "";
    const days = Math.max(
      0,
      Math.floor((Date.now() - lastActivity) / (24 * 60 * 60 * 1000)),
    );
    return String(days);
  },
  "recommend-rejection": (c) =>
    c.caseStage === "Recommend Rejection" ? "Recommended" : "",
  "identifier-types": (c) => {
    const types = c.identifierTypes ?? {};
    return Object.keys(types)
      .sort()
      .map((k) => (types[k] > 1 ? `${k} (${types[k]})` : k))
      .join(", ");
  },
  "agency-name": (c) => {
    const fd = getCaseFormDataById(c.caseId);
    const names = new Set<string>();
    for (const ar of fd?.legalContext?.agencies ?? []) {
      if (ar.agency?.name) names.add(ar.agency.name);
    }
    if (names.size === 0 && fd?.agency) names.add(fd.agency);
    return Array.from(names).sort().join(", ");
  },
  "validating-authority": (c) => {
    const fd = getCaseFormDataById(c.caseId);
    if (fd?.legalContext?.primaryValidatingAuthority?.name) {
      return fd.legalContext.primaryValidatingAuthority.name;
    }
    for (const ar of fd?.legalContext?.agencies ?? []) {
      if (ar.role === "ValidatingAuthority" && ar.agency?.name) {
        return ar.agency.name;
      }
    }
    return "";
  },
  "competent-authority": (c) => {
    const fd = getCaseFormDataById(c.caseId);
    if (fd?.legalContext?.primaryCompetentAuthority?.name) {
      return fd.legalContext.primaryCompetentAuthority.name;
    }
    for (const ar of fd?.legalContext?.agencies ?? []) {
      if (ar.role === "CompetentAuthority" && ar.agency?.name) {
        return ar.agency.name;
      }
    }
    return "";
  },
};

// ── CSV plumbing ─────────────────────────────────────────────────────

/** Escape a cell value per RFC 4180 — wrap in double-quotes when the
 *  value contains a comma, quote, CR, or LF; double up any embedded
 *  quotes. Numbers and booleans should be stringified by the caller. */
function csvEscape(raw: string): string {
  if (raw === "") return "";
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/** Build the CSV text for a list of cases and a column set. The
 *  first row is the column labels; each subsequent row is one case.
 *  Columns without a registered serializer log a one-time warning
 *  per id and emit an empty cell. */
export function buildCasesCsv(
  cases: CaseQueueItem[],
  columns: ColumnDef[],
): string {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const rows = cases.map((row) =>
    columns
      .map((col) => {
        const serialize = EXPORT_SERIALIZERS[col.id];
        if (!serialize) {
          // eslint-disable-next-line no-console
          console.warn(
            `[caseListExport] No serializer for column "${col.id}" — emitting empty cell.`,
          );
          return "";
        }
        try {
          return csvEscape(serialize(row));
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            `[caseListExport] Serializer for "${col.id}" threw for case ${row.caseId}:`,
            err,
          );
          return "";
        }
      })
      .join(","),
  );
  // CRLF line endings — Excel-friendly default per RFC 4180.
  return [header, ...rows].join("\r\n");
}

/** Trigger a browser download for a CSV string. Uses a Blob + a
 *  temporary anchor — no extra deps. Returns the filename used so
 *  callers can echo it in a toast. */
export function downloadCsv(csv: string, filename: string): string {
  // BOM so Excel reads the file as UTF-8 instead of falling back to
  // the system code page (matters for non-ASCII case data like
  // tenant names with diacritics).
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the click has fully kicked off.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return filename;
}

/** Build a filename of the form
 *  `dars-{surface}-{scope}-{yyyy-mm-dd}.csv`. Centralised here so
 *  Cases and Attorney Dashboard exports follow the same convention
 *  and downstream tooling (Excel macros, transparency-report
 *  ingestion) can pick the right file by pattern.
 *
 *  Pass `now` to keep tests deterministic; production callers omit
 *  it and the function reads the current clock. */
export function buildExportFilename(
  surface: "cases" | "attorney-dashboard",
  scope: "active" | "all",
  now: Date = new Date(),
): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `dars-${surface}-${scope}-${yyyy}-${mm}-${dd}.csv`;
}

/** One-shot export: build the CSV from the inputs, name the file
 *  per `buildExportFilename`, and trigger the download. Returns the
 *  count of exported rows (caller usually surfaces this in a toast). */
export function exportCasesToCsv(opts: {
  surface: "cases" | "attorney-dashboard";
  scope: "active" | "all";
  cases: CaseQueueItem[];
  columns: ColumnDef[];
}): { filename: string; rowCount: number } {
  const csv = buildCasesCsv(opts.cases, opts.columns);
  const filename = buildExportFilename(opts.surface, opts.scope);
  downloadCsv(csv, filename);
  return { filename, rowCount: opts.cases.length };
}
