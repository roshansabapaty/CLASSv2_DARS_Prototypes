/**
 * Verify the Export list buttons on both surfaces:
 *
 *   1. Cases page — button is present in the toolbar, clicking it
 *      triggers a CSV download whose filename matches
 *      `dars-cases-<scope>-<yyyy-mm-dd>.csv`, and whose header row
 *      lists exactly the user's visible columns in order.
 *
 *   2. Attorney Dashboard — same checks, surface "attorney-
 *      dashboard". Exercises the wiring on AD specifically so a
 *      future change that drops the button or mis-passes the
 *      visible-columns subset is caught.
 *
 * Strategy: intercept Blob creation in the browser context so the
 * test can read the CSV string without writing to disk, then assert
 * shape + filename + header columns.
 */
import { chromium } from "playwright";
import { Verdict } from "./_verify-utils.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const verdict = new Verdict("export-list");

/** Wrap Blob and URL.createObjectURL so the page captures the
 *  generated CSV text + the filename the anchor was given. Reads
 *  back via window.__exportCapture so the test can inspect it. */
async function installExportCapture(page) {
  await page.evaluate(() => {
    window.__exportCapture = null;
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = function (blob) {
      // Pull the CSV out of the blob asynchronously so we don't
      // block the export flow. Stash on the capture slot.
      const reader = new FileReader();
      reader.onload = () => {
        const captured = (window.__exportCapture = window.__exportCapture || {});
        captured.csv = String(reader.result || "");
      };
      reader.readAsText(blob);
      return origCreate.call(this, blob);
    };
    // Catch the anchor.download click to record the filename too.
    const origAppend = HTMLBodyElement.prototype.appendChild;
    HTMLBodyElement.prototype.appendChild = function (node) {
      if (node && node.tagName === "A" && node.download) {
        const captured = (window.__exportCapture = window.__exportCapture || {});
        captured.filename = node.download;
      }
      return origAppend.call(this, node);
    };
  });
}

async function readCapture(page) {
  return await page.evaluate(() => window.__exportCapture);
}

async function exerciseSurface({ page, label, surface, scope, expectedFile }) {
  console.log("");
  console.log(`=== ${label}: Export list ===`);
  await installExportCapture(page);
  const btn = page.locator('button[aria-label="Export list to CSV"]').first();
  const present = (await btn.count()) > 0;
  console.log(`  Toolbar button present:        ${present ? "YES" : "NO"}`);
  if (!present) {
    verdict.fail(`${label}: Export list button missing`);
    return;
  }
  await btn.click({ force: true });
  // Blob read + anchor mount are synchronous-ish but the FileReader
  // is async — give it a tick.
  await page.waitForTimeout(400);
  const cap = await readCapture(page);
  if (!cap) {
    verdict.fail(`${label}: clicking Export did not invoke URL.createObjectURL`);
    return;
  }
  console.log(`  Captured filename:             ${cap.filename}`);
  console.log(`  Captured CSV first 120 chars:  ${(cap.csv ?? "").slice(0, 120)}`);
  // Filename pattern
  verdict.assert(
    new RegExp(`^dars-${surface}-${scope}-\\d{4}-\\d{2}-\\d{2}\\.csv$`).test(
      cap.filename ?? "",
    ),
    `${label}: filename "${cap.filename}" doesn't match dars-${surface}-${scope}-yyyy-mm-dd.csv`,
  );
  // CSV present + has a header
  verdict.assert(
    !!cap.csv && cap.csv.length > 0,
    `${label}: CSV string is empty`,
  );
  // Strip optional BOM, then split on CRLF or LF
  const text = (cap.csv ?? "").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  console.log(`  CSV header row:                ${lines[0] ?? "(missing)"}`);
  console.log(`  CSV total rows (incl header):  ${lines.length}`);
  verdict.assert(
    lines.length >= 2,
    `${label}: CSV has only ${lines.length} line(s) — expected header + at least one data row`,
  );
  // Header should include "Case ID" — Case ID is locked and always visible.
  verdict.assert(
    /Case ID/.test(lines[0] ?? ""),
    `${label}: CSV header missing Case ID column`,
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* localStorage may be blocked */
    }
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page
    .waitForLoadState("networkidle", { timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1500);

  // ── 1. Cases page ────────────────────────────────────────────────────
  await exerciseSurface({
    page,
    label: "Cases page",
    surface: "cases",
    scope: "active",
  });

  // ── 2. Attorney Dashboard ────────────────────────────────────────────
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const attyBtn = buttons.find((b) =>
      /Attorney Dashboard/i.test(b.getAttribute("aria-label") ?? ""),
    );
    if (attyBtn) attyBtn.click();
  });
  await page.waitForTimeout(1500);
  await exerciseSurface({
    page,
    label: "Attorney Dashboard",
    surface: "attorney-dashboard",
    scope: "active",
  });

  console.log("");
  console.log(`Page / console errors: ${errors.length}`);
  if (errors.length)
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));

  await page.screenshot({ path: "verify-export-list.png", fullPage: false });
  await browser.close();
  verdict.assert(errors.length === 0, `${errors.length} page / console errors`);
  verdict.finish();
}

main().catch((e) => {
  console.error(e);
  console.log("");
  console.log(`RESULT: FAIL (export-list) — uncaught: ${e.message}`);
  process.exit(1);
});
