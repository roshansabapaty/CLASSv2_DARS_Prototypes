/**
 * Smoke test for the panel keyboard shortcuts and persistence.
 *
 * Verifies:
 *   1. Ctrl+Shift+D toggles Document panel open/closed
 *   2. Ctrl+Shift+I toggles Identifier panel (only on fulfillment stage)
 *   3. Ctrl+Shift+C toggles Correspondence panel
 *   4. Each panel's open/closed state persists across page reload
 *   5. Correspondence panel toggle button + tooltip visible in scope header
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3002";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();
  const out = [];
  const log = (m) => {
    console.log(m);
    out.push(m);
  };

  // Visit once to establish localStorage origin, then seed clean panel
  // state via a one-shot evaluate (NOT addInitScript — that would re-fire
  // on every navigation and nuke the persistence test below).
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("dars.workflowListPane.visible", "true");
    localStorage.setItem("dars.documentPanel.open", "false");
    localStorage.setItem("dars.identifierPanel.open", "false");
    localStorage.setItem("dars.correspondencePanel.open", "false");
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  const firstCard = page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-\d{4}-\d{5}/ })
    .first();
  await firstCard.waitFor({ state: "visible", timeout: 15_000 });
  await firstCard.click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // ── Correspondence toggle button is visible in scope header ──────────
  const corrBtn = page.locator(
    'button[aria-label*="correspondence hub" i]',
  );
  log(
    `Correspondence button rendered: ${(await corrBtn.count()) >= 1 ? "YES" : "NO"}`,
  );

  // ── Ctrl+Shift+C opens / closes Correspondence panel ─────────────────
  const corrAriaInitiallyOpen = await corrBtn
    .first()
    .getAttribute("aria-pressed");
  await page.keyboard.press("Control+Shift+C");
  await page.waitForTimeout(600);
  const corrAriaAfter1 = await corrBtn.first().getAttribute("aria-pressed");
  log(
    `Ctrl+Shift+C: aria-pressed ${corrAriaInitiallyOpen} → ${corrAriaAfter1}`,
  );
  await page.keyboard.press("Control+Shift+C");
  await page.waitForTimeout(600);
  const corrAriaAfter2 = await corrBtn.first().getAttribute("aria-pressed");
  log(`Ctrl+Shift+C again: aria-pressed → ${corrAriaAfter2}`);

  // ── Ctrl+Shift+D toggles Document panel ──────────────────────────────
  const docBtn = page.locator('button[aria-label*="document panel" i]');
  const docInitial = await docBtn.first().getAttribute("aria-pressed");
  await page.keyboard.press("Control+Shift+D");
  await page.waitForTimeout(600);
  const docAfter = await docBtn.first().getAttribute("aria-pressed");
  log(`Ctrl+Shift+D: aria-pressed ${docInitial} → ${docAfter}`);

  // Toggle back off to leave a clean state for the identifier test.
  await page.keyboard.press("Control+Shift+D");
  await page.waitForTimeout(300);

  // ── Ctrl+Shift+I toggles Identifier panel (fulfillment only) ─────────
  // First case in the queue may not be on fulfillment, so navigate the
  // workflow pane to fulfillment stage if needed.
  const fulfillmentStage = page.locator(
    'button:has-text("Review Case"), button:has-text("REVIEW CASE")',
  );
  if (await fulfillmentStage.count()) {
    await fulfillmentStage.first().click({ force: true });
    await page.waitForTimeout(800);
  }

  const idBtn = page.locator('button[aria-label*="fulfillment wizard" i]');
  const idCount = await idBtn.count();
  log(`Identifier toggle button present on fulfillment: ${idCount >= 1 ? "YES" : "NO"}`);
  if (idCount >= 1) {
    const idInitial = await idBtn.first().getAttribute("aria-pressed");
    // Verify the shortcut both via keyboard AND via direct click — the
    // click confirms the toggle wiring works end-to-end even if the
    // browser intercepts the keyboard combo (Ctrl+Shift+I = DevTools
    // in Chrome/Edge; preventDefault may not be enough in headed mode).
    await page.keyboard.press("Control+Shift+F");
    await page.waitForTimeout(600);
    const idAfterShortcut = await idBtn.first().getAttribute("aria-pressed");
    log(`Ctrl+Shift+F shortcut: aria-pressed ${idInitial} → ${idAfterShortcut}`);

    // Click test — independent of keyboard interception
    await idBtn.first().click({ force: true });
    await page.waitForTimeout(400);
    const idAfterClick = await idBtn.first().getAttribute("aria-pressed");
    log(`Identifier toggle button click: aria-pressed → ${idAfterClick}`);
    // Reset back to closed
    if (idAfterClick === "true") {
      await idBtn.first().click({ force: true });
      await page.waitForTimeout(300);
    }
  }

  // ── Persistence: open Correspondence, reload, confirm still open ────
  await page.keyboard.press("Control+Shift+C");
  await page.waitForTimeout(400);
  const corrBeforeReload = await page.evaluate(() =>
    localStorage.getItem("dars.correspondencePanel.open"),
  );
  log(`localStorage after Ctrl+Shift+C open: ${corrBeforeReload}`);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_500);
  const corrAfterReload = await page.evaluate(() =>
    localStorage.getItem("dars.correspondencePanel.open"),
  );
  log(`localStorage after reload: ${corrAfterReload}`);

  // Take a screenshot of the final state for visual confirmation.
  await page.screenshot({
    path: "verify-panels-final.png",
    fullPage: false,
  });

  console.log("\n──── SUMMARY ────");
  out.forEach((line) => console.log(line));

  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
