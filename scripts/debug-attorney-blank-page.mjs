/**
 * Reproduce the blank-page error in Attorney Dashboard when opening
 * Enterprise mock cases. Capture browser console errors + the page DOM
 * state after navigation so we can identify the root cause.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

const CASES_TO_TRY = [
  "LNS-2025-00125",
  "LNS-2026-00150",
  "LNS-2026-00180",
  "LNS-2026-00200",
  "LNS-2026-00210",
  "LNS-2026-00220",
  "LNS-2026-00230",
  "LNS-2026-00240",
  "LNS-2026-00250",
  "LNS-2026-00300",
  "LNS-2026-00310",
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(`${err.name}: ${err.message}\n${err.stack ?? ""}`));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  // Navigate to Attorney Dashboard via the LeftNavRail (Scale icon)
  const attorneyNav = page
    .locator('button[aria-label*="Attorney" i]')
    .first();
  if (await attorneyNav.count()) {
    await attorneyNav.click({ force: true });
    await page.waitForTimeout(1_500);
  } else {
    // Fallback: click the Scale icon directly
    await page.locator('button[title*="Attorney" i]').first().click({ force: true });
    await page.waitForTimeout(1_500);
  }

  console.log(`Attorney Dashboard loaded. Body length: ${(await page.evaluate(() => document.body.innerText.length))}`);

  // Try each case in turn
  for (const caseId of CASES_TO_TRY) {
    consoleErrors.length = 0;
    pageErrors.length = 0;

    // Reset to the dashboard
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
    const navBtn = page
      .locator('button[aria-label*="Attorney" i], button[title*="Attorney" i]')
      .first();
    await navBtn.click({ force: true });
    await page.waitForTimeout(1_500);

    // Find a clickable element with the case id text — prefer buttons / rows
    const caseHit = page
      .locator('button, [role="button"], tr, div.cursor-pointer')
      .filter({ hasText: caseId })
      .first();
    if (!(await caseHit.count())) {
      console.log(`${caseId}: not found in dashboard`);
      continue;
    }
    await caseHit.click({ force: true });
    await page.waitForTimeout(2_500);

    // Check the page state
    const state = await page.evaluate(() => ({
      bodyLen: document.body.innerText.length,
      hasAttorneyReview: /Attorney Review/.test(document.body.innerText),
      hasBackLink: /Back to Attorney Dashboard/.test(document.body.innerText),
    }));
    const blank = state.bodyLen < 500;
    const opened = state.hasAttorneyReview && state.hasBackLink;

    console.log(
      `${caseId}: bodyLen=${state.bodyLen} | opened=${opened ? "YES" : "NO"} | blank=${blank ? "YES" : "NO"} | consoleErrors=${consoleErrors.length} | pageErrors=${pageErrors.length}`,
    );
    if (pageErrors.length > 0) {
      console.log(`  ★ PAGE ERROR:`);
      pageErrors.slice(0, 2).forEach((e) => console.log(`    ${e.slice(0, 1500)}`));
    }
    if (consoleErrors.length > 0 && consoleErrors.some((e) => !/__suppress|favicon/i.test(e))) {
      console.log(`  ★ CONSOLE ERRORS:`);
      consoleErrors
        .filter((e) => !/__suppress|favicon/i.test(e))
        .slice(0, 5)
        .forEach((e) => console.log(`    ${e.slice(0, 600)}`));
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
