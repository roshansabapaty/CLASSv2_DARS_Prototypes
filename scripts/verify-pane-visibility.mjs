/**
 * Smoke test for the WorkflowListPane hide-entirely + breadcrumb anchor flow.
 *
 * Verifies:
 *   1. Default state — pane visible, no breadcrumb pill in banner
 *   2. Click « hide button → pane disappears, banner shows »-button + breadcrumb pill
 *   3. Click » show button → pane reappears, breadcrumb pill disappears
 *   4. Ctrl+Shift+W toggles pane in both directions
 *   5. State persists across page reload (localStorage)
 *   6. Workspace max-width responds to viewport width (CSS token responsive)
 *
 * Captures screenshots at each notable state.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3002";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  const results = [];
  const log = (msg) => {
    console.log(msg);
    results.push(msg);
  };

  // ── 1. Open the app and navigate to a case ────────────────────────────
  // Pre-seed pane visibility = true so the test starts in a known state.
  await page.addInitScript(() => {
    localStorage.setItem("dars.workflowListPane.visible", "true");
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  // Click the first clickable case card. The case-queue card is a
  // div with cursor-pointer class that wraps each case row.
  const firstCard = page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-\d{4}-\d{5}/ })
    .first();

  await firstCard.waitFor({ state: "visible", timeout: 15_000 });
  await firstCard.click({ force: true });

  // Wait for the WorkflowListPane itself to mount as readiness signal —
  // that's the surface under test, so its presence guarantees the rest of
  // the case-form chrome has rendered too.
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // ── 2. Default state — pane visible ───────────────────────────────────
  const paneInitial = await page
    .locator('nav[aria-label="Case workflow"]')
    .count();
  log(`STEP 1  Pane initially visible: ${paneInitial === 1 ? "YES" : "NO"}`);

  const breadcrumbInitial = await page
    .locator('[role="status"][aria-label*="Active step"]')
    .count();
  log(
    `STEP 1  Breadcrumb hidden initially: ${breadcrumbInitial === 0 ? "YES" : "NO"}`,
  );

  await page.screenshot({
    path: "verify-pane-1-default-visible.png",
    fullPage: false,
  });

  // ── 3. Click « hide button in scope header ───────────────────────────
  const hideBtn = page.locator('button[aria-label*="Hide workflow pane"]');
  if (await hideBtn.count()) {
    await hideBtn.first().click({ force: true });
    await page.waitForTimeout(600);
  } else {
    log("STEP 2  Hide button NOT FOUND — bail");
  }

  const paneAfterHide = await page
    .locator('nav[aria-label="Case workflow"]')
    .count();
  log(
    `STEP 2  Pane hidden after click: ${paneAfterHide === 0 ? "YES" : "NO"}`,
  );

  const breadcrumbAfterHide = await page
    .locator('[role="status"][aria-label*="Active step"]')
    .count();
  log(
    `STEP 2  Breadcrumb pill visible after hide: ${breadcrumbAfterHide >= 1 ? "YES" : "NO"}`,
  );

  const showBtn = page.locator('button[aria-label*="Show workflow pane"]');
  log(
    `STEP 2  Show-workflow button visible: ${(await showBtn.count()) >= 1 ? "YES" : "NO"}`,
  );

  await page.screenshot({
    path: "verify-pane-2-hidden-with-breadcrumb.png",
    fullPage: false,
  });

  // ── 4. Click » show button → pane returns ────────────────────────────
  if (await showBtn.count()) {
    await showBtn.first().click({ force: true });
    await page.waitForTimeout(500);
  }
  const paneAfterShow = await page
    .locator('nav[aria-label="Case workflow"]')
    .count();
  log(
    `STEP 3  Pane visible after show-click: ${paneAfterShow === 1 ? "YES" : "NO"}`,
  );

  // ── 5. Ctrl+Shift+W hide ─────────────────────────────────────────────
  await page.keyboard.press("Control+Shift+W");
  await page.waitForTimeout(500);
  const paneAfterShortcutHide = await page
    .locator('nav[aria-label="Case workflow"]')
    .count();
  log(
    `STEP 4  Pane hidden via Ctrl+Shift+W: ${paneAfterShortcutHide === 0 ? "YES" : "NO"}`,
  );

  // ── 6. Ctrl+Shift+W show ─────────────────────────────────────────────
  await page.keyboard.press("Control+Shift+W");
  await page.waitForTimeout(500);
  const paneAfterShortcutShow = await page
    .locator('nav[aria-label="Case workflow"]')
    .count();
  log(
    `STEP 5  Pane visible via Ctrl+Shift+W toggle back: ${paneAfterShortcutShow === 1 ? "YES" : "NO"}`,
  );

  // ── 7. State persists across reload ──────────────────────────────────
  await hideBtn.first().click({ force: true });
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);
  const paneAfterReload = await page
    .locator('nav[aria-label="Case workflow"]')
    .count();
  log(
    `STEP 6  Pane remains hidden after reload: ${paneAfterReload === 0 ? "YES" : "NO"}`,
  );

  // restore visible state for the workspace-width check
  const showBtnAfterReload = page.locator(
    'button[aria-label*="Show workflow pane"]',
  );
  if (await showBtnAfterReload.count()) {
    await showBtnAfterReload.first().click({ force: true });
    await page.waitForTimeout(400);
  }

  // ── 8. Workspace max-width responds to viewport ─────────────────────
  const measure = async (vw) => {
    await page.setViewportSize({ width: vw, height: 900 });
    await page.waitForTimeout(250);
    return await page.evaluate(() => {
      const probe = document.querySelector(
        '[class*="max-w-[var(--page-max-w)]"]',
      );
      if (!probe) return null;
      return { width: probe.getBoundingClientRect().width };
    });
  };

  const at1280 = await measure(1280);
  const at1600 = await measure(1600);
  const at2200 = await measure(2200);
  log(
    `STEP 7  Workspace width at 1280px viewport: ${at1280?.width?.toFixed(0)} px (expected ~1184)`,
  );
  log(
    `STEP 7  Workspace width at 1600px viewport: ${at1600?.width?.toFixed(0)} px (expected ~1504)`,
  );
  log(
    `STEP 7  Workspace width at 2200px viewport: ${at2200?.width?.toFixed(0)} px (expected ~1600 capped)`,
  );

  await page.screenshot({
    path: "verify-pane-3-wide-viewport.png",
    fullPage: false,
  });

  // ── Summary ──────────────────────────────────────────────────────────
  console.log("\n──── SUMMARY ────");
  results.forEach((r) => console.log(r));

  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
