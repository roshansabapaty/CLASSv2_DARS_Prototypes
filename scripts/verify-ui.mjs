#!/usr/bin/env node
/**
 * UI-regression aggregator.
 *
 * Runs the curated set of Playwright verify-* scripts in sequence
 * and reports a single pass/fail summary. Each individual verifier
 * is the source of truth — this aggregator only cares about its
 * exit code. A verifier that exits 0 passed; anything else failed.
 *
 * The curated set is intentionally narrow: it covers the
 * style-treatment regressions we've been bitten by (Case ID
 * truncation + hover affordance, column alignment, header
 * typography, 30px section rhythm, Attorney Dashboard parity, the
 * filter-panel padding + scroll cap). Adding a script here means
 * the team commits to keeping it green — keep the list short.
 *
 * Usage:
 *   npm run verify:ui            # all scripts, default BASE_URL
 *   BASE_URL=http://localhost:3002 npm run verify:ui
 *   npm run verify:ui -- --only caseid-truncate,30px-gaps
 *   npm run verify:ui -- --bail  # stop on first failure
 *
 * Exit code: 0 if every curated script passes, 1 otherwise. Wire
 * this into CI to catch column-alignment / truncation / hover /
 * spacing regressions before they ship.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

// Curated regression set. Each entry is: { name, script, why }.
// Keep this list tight — every entry is a contract the team agrees
// to keep green.
const CURATED = [
  {
    name: "cases-header",
    script: "verify-cases-header.mjs",
    why: "Cases page H1 typography + Fluent icon + 60px top padding.",
  },
  {
    name: "list-changes",
    script: "verify-list-changes.mjs",
    why: "Search right-justify, Case ID font size + lock, Edit Columns inline arrows.",
  },
  {
    name: "30px-gaps",
    script: "verify-30px-gaps.mjs",
    why: "30px rhythm: H1 → tabs → toolbar → list on both Cases + Attorney pages.",
  },
  {
    name: "caseid-truncate",
    script: "verify-caseid-truncate.mjs",
    why: "Case ID column truncates + hover tooltip surfaces full ID when preview pane is wide.",
  },
  {
    name: "attorney-dashboard-parity",
    script: "verify-attorney-dashboard-parity.mjs",
    why: "Attorney Dashboard mirrors Cases page header/toolbar treatments.",
  },
  {
    name: "filter-padding-scroll",
    script: "verify-filter-padding-scroll.mjs",
    why: "AdvancedFiltersPanel + AddFilterMenu padding + 10-row scroll cap.",
  },
  {
    name: "customize-view",
    script: "verify-customize-view.mjs",
    why: "Customize view panel mounts with 3 sections + Active/All toggle defaults to Active + dynamic 'All' tab label.",
  },
  {
    name: "attorney-customize",
    script: "verify-attorney-customize.mjs",
    why: "Attorney Dashboard parity: scope toggle + dynamic All label + Customize view panel + FilterColumnSyncDialog all wired on AD.",
  },
  {
    name: "export-list",
    script: "verify-export-list.mjs",
    why: "Export list button on Cases + AD produces a CSV with the user's visible columns and a dated filename matching the surface.",
  },
];

const args = process.argv.slice(2);
const bail = args.includes("--bail");
const onlyArg = args.find((a) => a.startsWith("--only"));
const only = (() => {
  if (!onlyArg) return null;
  const raw = onlyArg.includes("=")
    ? onlyArg.split("=")[1]
    : args[args.indexOf(onlyArg) + 1];
  return raw
    ? new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))
    : null;
})();

function pingDevServer(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function runVerifier(entry) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, entry.script);
    const child = spawn(process.execPath, [scriptPath], {
      cwd: REPO_ROOT,
      env: { ...process.env, BASE_URL },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      // Final RESULT line is informational; the exit code is
      // authoritative. A verifier that crashed or never reached
      // its summary should fail closed.
      const resultLine =
        stdout
          .split("\n")
          .reverse()
          .find((l) => /^RESULT:\s/.test(l.trim())) ?? "";
      resolve({
        entry,
        code: code ?? -1,
        passed: code === 0,
        resultLine: resultLine.trim(),
        stdout,
        stderr,
      });
    });
    child.on("error", (err) => {
      resolve({
        entry,
        code: -1,
        passed: false,
        resultLine: `RESULT: FAIL: spawn error ${err.message}`,
        stdout: "",
        stderr: err.message,
      });
    });
  });
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

async function main() {
  console.log("UI regression aggregator");
  console.log(`  Base URL: ${BASE_URL}`);
  if (only) console.log(`  Filter:   --only ${[...only].join(",")}`);
  if (bail) console.log(`  Mode:     --bail (stop on first failure)`);
  console.log("");

  const reachable = await pingDevServer(BASE_URL);
  if (!reachable) {
    console.log(
      `Dev server at ${BASE_URL} did not respond. Start it with \`npm run dev\` first.`,
    );
    process.exit(2);
  }

  const queue = CURATED.filter((e) => !only || only.has(e.name));
  if (queue.length === 0) {
    console.log("No verifiers matched the --only filter. Nothing to run.");
    process.exit(2);
  }

  const results = [];
  for (const entry of queue) {
    process.stdout.write(`▶ ${pad(entry.name, 28)} `);
    const result = await runVerifier(entry);
    results.push(result);
    if (result.passed) {
      process.stdout.write("PASS\n");
    } else {
      process.stdout.write(`FAIL (exit ${result.code})\n`);
      if (result.resultLine) {
        process.stdout.write(`    ${result.resultLine}\n`);
      }
      // Surface a few lines of stdout/stderr to help triage
      // without dumping the full transcript.
      const tail = (result.stdout + "\n" + result.stderr)
        .trim()
        .split("\n")
        .slice(-12);
      tail.forEach((l) => process.stdout.write(`      ${l}\n`));
      if (bail) break;
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const skipped = queue.length - results.length;

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `Summary: ${passed} passed · ${failed} failed${
      skipped ? ` · ${skipped} skipped (--bail)` : ""
    }`,
  );

  if (failed > 0) {
    console.log("");
    console.log("Failed verifiers:");
    for (const r of results.filter((x) => !x.passed)) {
      console.log(`  ✗ ${r.entry.name} — ${r.entry.why}`);
    }
    process.exit(1);
  }

  console.log("All curated UI verifiers passed.");
  process.exit(0);
}

main().catch((e) => {
  console.error("verify-ui aggregator crashed:", e);
  process.exit(1);
});
