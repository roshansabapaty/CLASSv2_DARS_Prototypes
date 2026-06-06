#!/usr/bin/env node
/**
 * update-uat-mock-cases — refresh docs/UAT-MockCases.md against the
 * current state of the mock cases shipped with the prototype.
 *
 * This script is deliberately conservative. The per-case UAT blocks
 * (Capability / Test Steps / Expected Results) are hand-authored and
 * NEVER overwritten. The script only:
 *
 *   1. Rewrites Section 4's case-index table so it reflects the
 *      canonical list of MOCK_CASES + the live FormData builders.
 *   2. Refreshes the "Last updated" line in the header.
 *   3. Refreshes the case-count line in the header (e.g. "27 cases").
 *   4. Emits a drift report identifying:
 *       - NEW cases — present in MOCK_CASES but not in any UAT-DARS-NNN
 *         block (a stub block needs to be authored).
 *       - ORPHAN UATs — a UAT-DARS-NNN block references a case ID that
 *         no longer exists in MOCK_CASES.
 *       - STAGE DRIFT — a UAT block's "Workflow stage:" line doesn't
 *         match the current caseStage / workflow mapping.
 *       - ESCALATION DRIFT — the attorney escalation sub-state (the new
 *         pull-model statuses) has changed since the doc was written.
 *
 * Usage:
 *
 *   node scripts/update-uat-mock-cases.mjs           # write changes
 *   node scripts/update-uat-mock-cases.mjs --check   # report only
 *
 * Implementation note:
 *
 * The mock case data lives in TypeScript modules that import other TS
 * helpers. To run the builders we bundle the case-data registry via
 * esbuild (programmatic API) into a temporary ESM file, then dynamic-
 * import it. Image / CSS / React-component imports inside the
 * dependency chain are stubbed out via the loader + externals lists
 * since they are not needed for FormData synthesis.
 */

import * as esbuild from "esbuild";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const UAT_PATH = join(REPO_ROOT, "docs/UAT-MockCases.md");
const REGISTRY_PATH = join(
  REPO_ROOT,
  "src/utils/caseDataRegistry.ts",
);
const QUEUE_TYPES_PATH = join(
  REPO_ROOT,
  "src/components/case-queue/case-queue-types.ts",
);

const CHECK_ONLY = process.argv.includes("--check");

// ── 1. Bundle + load the data modules ───────────────────────────────────

async function bundleAndLoad() {
  // Bundle output must live inside the project tree so Node's
  // node_modules resolution finds React / lucide-react / etc. when we
  // dynamic-import it. Using OS tmpdir would break that.
  const cacheDir = join(REPO_ROOT, ".cache", "uat-update");
  mkdirSync(cacheDir, { recursive: true });
  const tmpDir = mkdtempSync(join(cacheDir, "run-"));
  const entryPath = join(tmpDir, "entry.ts");
  const outFile = join(tmpDir, "bundled.mjs");

  // Synthetic entry — re-exports just what we need from the real
  // modules. Keeps the bundle minimal and avoids dragging in surfaces
  // the script never uses.
  writeFileSync(
    entryPath,
    [
      `export { MOCK_CASES, getWorkflowStageFromCaseStage } from ${JSON.stringify(QUEUE_TYPES_PATH)};`,
      `export { CASE_DATA_BUILDERS } from ${JSON.stringify(REGISTRY_PATH)};`,
    ].join("\n"),
  );

  try {
    await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      format: "esm",
      target: "node20",
      platform: "neutral",
      mainFields: ["module", "main"],
      conditions: ["import", "node", "default"],
      outfile: outFile,
      loader: {
        ".png": "empty",
        ".jpg": "empty",
        ".jpeg": "empty",
        ".svg": "empty",
        ".css": "empty",
        ".md": "empty",
      },
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@fluentui/react-components",
        "@fluentui/react-icons",
        "lucide-react",
        "@radix-ui/*",
        "cmdk",
        "sonner",
        "sonner@*",
        "figma:asset/*",
        "vaul",
        "@playwright/*",
        "playwright",
      ],
      jsx: "transform",
      logLevel: "silent",
    });
  } catch (err) {
    console.error(
      "esbuild bundle failed — the case-data modules import something the script can't stub.",
    );
    console.error(err);
    rmSync(tmpDir, { recursive: true, force: true });
    process.exit(2);
  }

  let mod;
  try {
    mod = await import(pathToFileURL(outFile).href);
  } finally {
    // Keep the temp dir around for diagnostics if there's a runtime
    // error; otherwise clean up immediately.
    rmSync(tmpDir, { recursive: true, force: true });
  }
  return mod;
}

// ── 2. Capture per-case metadata ────────────────────────────────────────

function pickStage(caseStage, getWorkflowStageFromCaseStage) {
  const ws = getWorkflowStageFromCaseStage(caseStage);
  switch (caseStage) {
    case "Resolved":
      return "Terminal · Resolved";
    case "No Data Provided":
      return "Terminal · No Data";
    case "Cancelled":
      return "Terminal · Cancelled";
    case "Rejected":
      return "Terminal · Rejected";
    case "Withdrawn":
      return "Collection · Withdrawn";
    case "Waiting on Triage":
      return "Triage";
    case "Triage Complete":
      return "Triage Complete";
    case "In Review":
      return "Review Case";
    case "In Progress":
      return "Collection";
    default:
      return ws.charAt(0).toUpperCase() + ws.slice(1);
  }
}

function summariseCase(queueItem, formDataBuilder, getStage) {
  let formData = null;
  try {
    formData = formDataBuilder ? formDataBuilder() : null;
  } catch (err) {
    // Builder failure is non-fatal — fall back to queue-item-only
    // metadata. The drift report flags the case so the author can dig
    // into the root cause.
    return {
      caseId: queueItem.caseId,
      stage: pickStage(queueItem.caseStage, getStage),
      country: queueItem.country,
      requestType:
        queueItem.requestType +
        (queueItem.requestSubType ? ` · ${queueItem.requestSubType}` : ""),
      casePriority: queueItem.casePriority,
      identifierCount: queueItem.identifierCount,
      escalationStatus: undefined,
      escalationRole: undefined,
      rsAcknowledged: false,
      hasEnterpriseContext: queueItem.hasEnterpriseAccounts === true,
      tenantTierCheck: undefined,
      gfrDecision: undefined,
      builderError: err && err.message ? err.message : String(err),
    };
  }

  const esc = formData?.attorneyEscalation;
  const ec = formData?.enterpriseContext;
  const gfr = formData?.eevidenceGroundsForRefusal;

  return {
    caseId: queueItem.caseId,
    stage: pickStage(queueItem.caseStage, getStage),
    country: queueItem.country,
    requestType:
      queueItem.requestType +
      (queueItem.requestSubType ? ` · ${queueItem.requestSubType}` : ""),
    casePriority: queueItem.casePriority,
    identifierCount: queueItem.identifierCount,
    escalationStatus: esc?.status,
    escalationRole: esc?.role,
    rsAcknowledged: !!esc?.rsAcknowledgedAt,
    hasEnterpriseContext: !!ec,
    tenantTierCheck: ec?.tenantTierCheck
      ? {
          isS500: !!ec.tenantTierCheck.isS500,
          isV100: !!ec.tenantTierCheck.isV100,
          checkedBy: ec.tenantTierCheck.checkedBy,
        }
      : undefined,
    gfrDecision: gfr?.decision?.kind,
    builderError: undefined,
  };
}

// ── 3. Parse the existing UAT doc ───────────────────────────────────────

function parseUatDoc(text) {
  const lines = text.split("\n");

  // Pull the existing case-index table out of Section 4 — every row
  // looks like "| UAT-DARS-NNN | LNS-2026-NNNNN | scenario | stage | persona |".
  const indexRows = []; // { testId, caseId, scenario, stage, persona }
  let inIndex = false;
  let indexStartLine = -1;
  let indexEndLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^## 4\. Case index/.test(line)) {
      inIndex = true;
      continue;
    }
    if (inIndex && /^## 4\.5/.test(line)) {
      inIndex = false;
      indexEndLine = i;
      break;
    }
    if (inIndex && /^\| UAT-DARS-/.test(line)) {
      if (indexStartLine === -1) indexStartLine = i;
      const parts = line
        .split("|")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parts.length === 5) {
        indexRows.push({
          testId: parts[0],
          caseId: parts[1],
          scenario: parts[2],
          stage: parts[3],
          persona: parts[4],
        });
      }
    }
  }

  // Pull every per-case detail block — title looks like:
  //   "### UAT-DARS-NNN · LNS-2026-NNNNN — Scenario line"
  // We capture the test ID, case ID, scenario, and the "Workflow stage:"
  // line if present so we can detect stage drift.
  const detailBlocks = []; // { testId, caseId, scenario, stage, startLine }
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(
      /^### (UAT-DARS-\d+) · (LNS-\d{4}-\d{4,6}) — (.+)$/,
    );
    if (!m) continue;
    const testId = m[1];
    const caseId = m[2];
    const scenario = m[3];
    let stage = "";
    // Look ahead for the "Workflow stage:" line.
    for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
      const sm = lines[j].match(/\*\*Workflow stage\*\*:\s*(.+)$/);
      if (sm) {
        stage = sm[1].trim();
        break;
      }
      // Stop if we hit the next ### header.
      if (/^### /.test(lines[j])) break;
    }
    detailBlocks.push({ testId, caseId, scenario, stage, startLine: i });
  }

  // Header lines we may want to rewrite.
  const lastUpdatedLineIdx = lines.findIndex((l) =>
    /^\*\*Last updated\*\*:/.test(l),
  );
  const scopeLineIdx = lines.findIndex((l) => /^\*\*Scope\*\*:/.test(l));

  return {
    lines,
    indexRows,
    indexStartLine,
    indexEndLine,
    detailBlocks,
    lastUpdatedLineIdx,
    scopeLineIdx,
  };
}

// ── 4. Build the new index table ────────────────────────────────────────

function buildIndexTableMarkdown(cases, existingIndexByCaseId) {
  // Preserve the existing test ID + scenario + persona where we can —
  // the index table's scenario / persona columns are editorial choices
  // the script shouldn't second-guess. Only the stage column gets a
  // refresh (since that's derivable from caseStage).
  let nextTestId = 0;
  // Find the highest existing test ID so newly-discovered cases get
  // unique sequential IDs.
  for (const row of existingIndexByCaseId.values()) {
    const n = parseInt(row.testId.replace("UAT-DARS-", ""), 10);
    if (Number.isFinite(n)) nextTestId = Math.max(nextTestId, n);
  }
  const newlyAssigned = new Map(); // caseId → testId

  const rows = cases.map((c) => {
    const existing = existingIndexByCaseId.get(c.caseId);
    let testId = existing?.testId;
    if (!testId) {
      nextTestId += 1;
      testId = `UAT-DARS-${String(nextTestId).padStart(3, "0")}`;
      newlyAssigned.set(c.caseId, testId);
    }
    const scenario =
      existing?.scenario ??
      `${c.country} — ${c.requestType} (placeholder — please author)`;
    const persona = existing?.persona ?? "TBD";
    return {
      testId,
      caseId: c.caseId,
      scenario,
      stage: c.stage,
      persona,
    };
  });

  // Sort by existing test ID so the diff stays minimal — keep
  // historical ordering rather than re-shuffling by case ID.
  rows.sort((a, b) => {
    const an = parseInt(a.testId.replace("UAT-DARS-", ""), 10);
    const bn = parseInt(b.testId.replace("UAT-DARS-", ""), 10);
    return (Number.isFinite(an) ? an : 1e9) - (Number.isFinite(bn) ? bn : 1e9);
  });

  const header =
    "| Test ID | Case ID | Scenario | Stage | Persona |\n" +
    "|---|---|---|---|---|";
  const body = rows
    .map(
      (r) =>
        `| ${r.testId} | ${r.caseId} | ${r.scenario} | ${r.stage} | ${r.persona} |`,
    )
    .join("\n");
  return {
    markdown: `${header}\n${body}`,
    newlyAssigned,
    rowsByCaseId: new Map(rows.map((r) => [r.caseId, r])),
  };
}

// ── 5. Drift report ─────────────────────────────────────────────────────

function buildDriftReport(cases, parsed) {
  const detailById = new Map(parsed.detailBlocks.map((b) => [b.caseId, b]));
  const caseById = new Map(cases.map((c) => [c.caseId, c]));

  const newCases = []; // in MOCK_CASES, no UAT block
  const orphans = []; // UAT block, not in MOCK_CASES
  const stageDrift = []; // UAT block exists but stage doesn't match
  const escalationDrift = []; // UAT block exists but escalation status changed
  const builderErrors = [];

  for (const c of cases) {
    if (!detailById.has(c.caseId)) {
      newCases.push(c);
    } else {
      const block = detailById.get(c.caseId);
      // Stage strings are messy ("Triage · Waiting on Triage" vs
      // "Triage", "Review Case · In Review" vs "Review Case"). Treat
      // a mismatch as drift only when the canonical stage isn't a
      // substring of the existing block stage.
      if (
        block.stage &&
        !block.stage.toLowerCase().includes(c.stage.toLowerCase()) &&
        !c.stage.toLowerCase().includes(block.stage.toLowerCase())
      ) {
        stageDrift.push({
          caseId: c.caseId,
          testId: block.testId,
          existing: block.stage,
          current: c.stage,
        });
      }
    }
    if (c.escalationStatus) {
      // Look for the canonical badge label in the UAT block. If it's
      // not present we count it as drift the author should review.
      const block = detailById.get(c.caseId);
      if (block) {
        const slice = parsed.lines
          .slice(block.startLine, block.startLine + 80)
          .join("\n");
        const status = c.escalationStatus;
        // Map status -> phrase the author likely wrote.
        const expectedPhrase = (() => {
          if (status === "Pending") return "Pending";
          if (status === "InformationRequested") return "Info";
          if (status === "RedirectRequested") return "Redirect";
          if (status === "Reviewed") return "Reviewed";
          if (status === "ApprovedForDelivery") return "Approved";
          if (status === "ApprovedWithConditions") return "Conditions";
          if (status === "Blocked") return "Blocked";
          return null;
        })();
        if (expectedPhrase && !slice.toLowerCase().includes(expectedPhrase.toLowerCase())) {
          escalationDrift.push({
            caseId: c.caseId,
            testId: block.testId,
            status,
          });
        }
      }
    }
    if (c.builderError) {
      builderErrors.push({ caseId: c.caseId, error: c.builderError });
    }
  }

  for (const block of parsed.detailBlocks) {
    if (!caseById.has(block.caseId)) {
      orphans.push(block);
    }
  }

  return { newCases, orphans, stageDrift, escalationDrift, builderErrors };
}

// ── 6. Rewrite the file ─────────────────────────────────────────────────

function rewriteDoc(parsed, indexTableMarkdown, totalCount) {
  const lines = parsed.lines.slice();

  // Replace the case-index table block. Re-discover the range here
  // because we want the rewrite to be idempotent even if the old table
  // had extra blank lines.
  if (parsed.indexStartLine !== -1 && parsed.indexEndLine !== -1) {
    // Find the actual end of the table — the last "| UAT-DARS-..." row.
    let endRow = parsed.indexStartLine;
    for (let i = parsed.indexStartLine; i < parsed.indexEndLine; i++) {
      if (/^\| UAT-DARS-/.test(lines[i])) endRow = i;
    }
    // Find the table header (the row above the first data row that
    // contains "| Test ID | Case ID | Scenario | Stage | Persona |").
    let headerRow = parsed.indexStartLine;
    for (let i = parsed.indexStartLine; i > 0 && i > parsed.indexStartLine - 8; i--) {
      if (/^\| Test ID \|/.test(lines[i])) {
        headerRow = i;
        break;
      }
    }
    // Replace [headerRow .. endRow] inclusive with the new table.
    const tableLines = indexTableMarkdown.split("\n");
    lines.splice(headerRow, endRow - headerRow + 1, ...tableLines);
  }

  // Rewrite the "Last updated" line.
  if (parsed.lastUpdatedLineIdx !== -1) {
    const today = new Date();
    const iso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
    lines[parsed.lastUpdatedLineIdx] = `**Last updated**: ${iso}`;
  }

  // Rewrite the case count inside the Scope line — replace
  // "NN cases" with the canonical count.
  if (parsed.scopeLineIdx !== -1) {
    lines[parsed.scopeLineIdx] = lines[parsed.scopeLineIdx].replace(
      /\d+\s+cases\b/,
      `${totalCount} cases`,
    );
  }

  return lines.join("\n");
}

// ── 7. Pretty-print the drift report ────────────────────────────────────

function printReport({
  drift,
  totalCount,
  newlyAssigned,
}) {
  const log = (...args) => console.log(...args);
  log("");
  log("=== UAT-MockCases.md update report ===");
  log("");
  log(`Canonical case count (MOCK_CASES):  ${totalCount}`);
  log("");

  if (drift.builderErrors.length > 0) {
    log(`⚠  ${drift.builderErrors.length} case builder(s) threw:`);
    for (const e of drift.builderErrors) {
      log(`   • ${e.caseId} — ${e.error}`);
    }
    log("");
  }

  if (drift.newCases.length === 0) {
    log("✓ No NEW cases — every MOCK_CASES entry has a UAT block.");
  } else {
    log(
      `+ ${drift.newCases.length} NEW case(s) in MOCK_CASES without a UAT block (need authoring):`,
    );
    for (const c of drift.newCases) {
      const tid = newlyAssigned.get(c.caseId) ?? "(unassigned)";
      log(
        `   • ${tid}  ${c.caseId}  ${c.stage}  · ${c.country} · ${c.requestType}`,
      );
    }
  }
  log("");

  if (drift.orphans.length === 0) {
    log("✓ No ORPHAN UAT blocks — every UAT-DARS-NNN points at a live case.");
  } else {
    log(
      `- ${drift.orphans.length} ORPHAN UAT block(s) — case ID no longer in MOCK_CASES:`,
    );
    for (const o of drift.orphans) {
      log(`   • ${o.testId}  ${o.caseId}  "${o.scenario}"`);
    }
  }
  log("");

  if (drift.stageDrift.length === 0) {
    log("✓ No STAGE drift.");
  } else {
    log(`~ ${drift.stageDrift.length} stage mismatch(es):`);
    for (const d of drift.stageDrift) {
      log(
        `   • ${d.testId}  ${d.caseId}  doc="${d.existing}"  current="${d.current}"`,
      );
    }
  }
  log("");

  if (drift.escalationDrift.length === 0) {
    log("✓ No ESCALATION sub-state drift.");
  } else {
    log(
      `~ ${drift.escalationDrift.length} case(s) where the doc may not mention the current escalation sub-state:`,
    );
    for (const d of drift.escalationDrift) {
      log(`   • ${d.testId}  ${d.caseId}  current status: ${d.status}`);
    }
  }
  log("");
}

// ── 8. Main ─────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(UAT_PATH)) {
    console.error(`UAT file not found at ${UAT_PATH}`);
    process.exit(1);
  }
  const mod = await bundleAndLoad();
  const { MOCK_CASES, CASE_DATA_BUILDERS, getWorkflowStageFromCaseStage } = mod;

  if (!Array.isArray(MOCK_CASES)) {
    console.error("Bundled module did not export MOCK_CASES.");
    process.exit(2);
  }

  const cases = MOCK_CASES.map((queueItem) =>
    summariseCase(
      queueItem,
      CASE_DATA_BUILDERS?.[queueItem.caseId],
      getWorkflowStageFromCaseStage,
    ),
  );

  const docText = readFileSync(UAT_PATH, "utf8");
  const parsed = parseUatDoc(docText);

  const existingIndexByCaseId = new Map(
    parsed.indexRows.map((r) => [r.caseId, r]),
  );
  const { markdown: indexTableMd, newlyAssigned } = buildIndexTableMarkdown(
    cases,
    existingIndexByCaseId,
  );

  const drift = buildDriftReport(cases, parsed);

  printReport({
    drift,
    totalCount: cases.length,
    newlyAssigned,
  });

  if (CHECK_ONLY) {
    console.log("(--check) — no file changes written.");
    return;
  }

  const nextDocText = rewriteDoc(parsed, indexTableMd, cases.length);
  if (nextDocText === docText) {
    console.log("No changes needed — file is already up to date.");
    return;
  }
  writeFileSync(UAT_PATH, nextDocText);
  console.log(`✓ Wrote refreshed Section 4 index + header to ${UAT_PATH}`);
  if (drift.newCases.length > 0) {
    console.log(
      `  Reminder: the ${drift.newCases.length} NEW case(s) above need a hand-authored UAT block (### UAT-DARS-NNN · ... headers + Test Steps + Expected Results).`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
