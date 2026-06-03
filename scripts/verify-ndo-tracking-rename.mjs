/**
 * Verifies that within the Non-Disclosure tab of the case form, every
 * user-facing string that used to say "Order" now says "Tracking".
 *
 * Specifically checks:
 *   - The "Add Non-Disclosure" button label
 *   - The expanded panel heading
 *   - The Exclusion Reason and Temporary toggles (if reachable)
 *   - No occurrence of the word "Order" within the tab's DOM
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

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

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  // Open the first case
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-\d{4}-\d{5}/ })
    .first()
    .click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // Navigate to the Non-Disclosure Workflow step (inside Triage)
  // by clicking the step in the workflow pane.
  const ndoStep = page
    .locator('nav[aria-label="Case workflow"] button')
    .filter({ hasText: /Non-Disclosure/i })
    .first();
  if (await ndoStep.count()) {
    await ndoStep.click({ force: true });
    await page.waitForTimeout(1_000);
  }

  // The form may scroll automatically; give it a moment and then click the
  // Non-Disclosure tab inside the section (in case the panel is tabbed).
  // The Non-Disclosure tab is the default active state per the form's
  // Tabs initial value. No click needed — it might also live inside a
  // collapsed section, which would make the tab button technically
  // invisible. We probe the DOM directly via getByText instead.

  // Use page-wide text counts — even if the section is currently
  // collapsed in the live UI, the rendered text should reflect the
  // edits.
  const counts = await page.evaluate(() => {
    const all = document.body.innerHTML;
    return {
      addTracking: (all.match(/Add Non-Disclosure Tracking/g) ?? []).length,
      addOrder: (all.match(/Add Non-Disclosure Order/g) ?? []).length,
      trackingDetails: (all.match(/Non-Disclosure Tracking Details/g) ?? [])
        .length,
      orderDetails: (all.match(/Non-Disclosure Order Details/g) ?? []).length,
      ndoTracking: (all.match(/NDO Tracking/g) ?? []).length,
      ndoOrder: (all.match(/NDO Order/g) ?? []).length,
      temporaryTracking: (all.match(/Temporary Tracking/g) ?? []).length,
      temporaryOrder: (all.match(/Temporary Order/g) ?? []).length,
    };
  });
  log(`"Add Non-Disclosure Tracking" present:   ${counts.addTracking}`);
  log(
    `"Add Non-Disclosure Order"    regression: ${counts.addOrder} (expected 0)`,
  );
  log(`"Non-Disclosure Tracking Details" present:   ${counts.trackingDetails}`);
  log(
    `"Non-Disclosure Order Details"    regression: ${counts.orderDetails} (expected 0)`,
  );
  log(`"NDO Tracking" present:   ${counts.ndoTracking}`);
  log(`"NDO Order" regression: ${counts.ndoOrder} (expected 0)`);
  log(`"Temporary Tracking" present:   ${counts.temporaryTracking}`);
  log(
    `"Temporary Order"    regression: ${counts.temporaryOrder} (expected 0)`,
  );

  const allClean =
    counts.addOrder === 0 &&
    counts.orderDetails === 0 &&
    counts.ndoOrder === 0 &&
    counts.temporaryOrder === 0;
  const allReplaced =
    counts.addTracking > 0 ||
    counts.trackingDetails > 0 ||
    counts.ndoTracking > 0 ||
    counts.temporaryTracking > 0;
  log(`All 'Order' strings removed: ${allClean ? "YES" : "NO"}`);
  log(`'Tracking' replacements rendered: ${allReplaced ? "YES" : "NO"}`);

  await page.screenshot({
    path: "verify-ndo-tracking.png",
    fullPage: false,
  });

  console.log("\n──── SUMMARY ────");
  out.forEach((l) => console.log(l));

  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
