/**
 * Smoke test for the supplemental-identifier fixes:
 *   1. Z-index — dropdowns inside AddIdentifierDialog are visible (not
 *      hidden behind the dialog modal).
 *   2. Persistence — linkedIdentifierId is stored on the new identifier
 *      so the IdentifierTable can group it under the parent.
 *   3. UI — supplemental row appears immediately after its parent with
 *      sub-letter label (1a) + ↳ connector + "Linked to LE:" caption.
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
  await page.evaluate(() => {
    localStorage.setItem("dars.workflowListPane.visible", "true");
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  // Open a case that has at least one LE identifier we can link to —
  // LNS-2026-00270 (the case the user has open in the IDE) is a good
  // pick. Fall back to the first card if it's not visible in the queue.
  const targetCard = page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-2026-00270/ })
    .first();
  const fallbackCard = page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-\d{4}-\d{5}/ })
    .first();
  if (await targetCard.count()) {
    await targetCard.click({ force: true });
    log("Opened LNS-2026-00270");
  } else {
    await fallbackCard.click({ force: true });
    log("LNS-2026-00270 not in queue; opened first available case");
  }
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // Navigate to Review Case → open Identifier panel (Fulfillment Wizard)
  // which has an unambiguous "Add Identifier" button.
  const reviewBtn = page
    .locator("nav[aria-label=\"Case workflow\"] button")
    .filter({ hasText: /Review Case/i })
    .first();
  if (await reviewBtn.count()) {
    await reviewBtn.click({ force: true });
    await page.waitForTimeout(800);
  }

  // Click the fulfillment-wizard toggle (Fingerprint icon) in the scope
  // header to open the identifier panel slide-out.
  const fulfillmentToggle = page
    .locator('button[aria-label*="fulfillment wizard" i]')
    .first();
  if (await fulfillmentToggle.count()) {
    await fulfillmentToggle.click({ force: true });
    await page.waitForTimeout(1500);
  }

  const addBtn = page
    .locator('button:has-text("Add Identifier"), button:has-text("Add First Identifier")')
    .first();
  await addBtn.waitFor({ state: "visible", timeout: 15_000 });
  await addBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await addBtn.click({ force: true });
  await page.waitForTimeout(800);

  // ── Fix 1 check — Type dropdown visible after click ────────────────
  const typeBtn = page
    .locator('button[aria-label="Select identifier type"], button[role="combobox"]:has-text("Email address")')
    .first();
  await typeBtn.waitFor({ state: "visible", timeout: 5_000 });
  await typeBtn.click({ force: true });
  await page.waitForTimeout(400);
  // After clicking the trigger, the Command list (the dropdown panel)
  // should appear and be visible. We probe by checking that a
  // CommandItem is hit-testable (visible above the dialog modal).
  const typeOption = page
    .locator('[cmdk-item], [role="option"]')
    .filter({ hasText: /Phone|Email/i })
    .first();
  const typeOptionVisible = await typeOption.isVisible().catch(() => false);
  log(
    `Fix 1 — Type dropdown visible above dialog: ${typeOptionVisible ? "YES" : "NO"}`,
  );
  // Pick "Email address" and dismiss
  if (typeOptionVisible) {
    const emailItem = page
      .locator('[cmdk-item], [role="option"]')
      .filter({ hasText: /Email address/i })
      .first();
    if (await emailItem.count()) await emailItem.click({ force: true });
    await page.waitForTimeout(300);
  } else {
    // Bail — dropdown is invisible, the rest of the test can't proceed
    await page.screenshot({ path: "verify-supp-failed-dropdown.png" });
    console.log("\n──── SUMMARY (early bail) ────");
    out.forEach((l) => console.log(l));
    await browser.close();
    return;
  }

  // Type a value
  const valueInput = page.locator('input[aria-label="Identifier value"]');
  await valueInput.fill("alt-supp@outlook.com");
  await page.waitForTimeout(300);

  // Toggle Supplemental on
  const supplementalSwitch = page.locator('#addIdSupplemental');
  await supplementalSwitch.click({ force: true });
  await page.waitForTimeout(400);

  // Pick the linked LE identifier (any item — we just need ONE)
  const linkedBtn = page
    .locator('button[role="combobox"]:has-text("Select LE identifier")')
    .first();
  await linkedBtn.click({ force: true });
  await page.waitForTimeout(400);
  const linkedFirstItem = page
    .locator('[cmdk-item], [role="option"]')
    .first();
  const linkedItemVisible = await linkedFirstItem.isVisible().catch(() => false);
  log(
    `Fix 1 — Linked LE Identifier dropdown visible: ${linkedItemVisible ? "YES" : "NO"}`,
  );
  const linkedParentText = await linkedFirstItem.textContent();
  await linkedFirstItem.click({ force: true });
  await page.waitForTimeout(400);

  // Pick service
  const serviceBtn = page
    .locator('button[role="combobox"]:has-text("Select service")')
    .first();
  await serviceBtn.click({ force: true });
  await page.waitForTimeout(400);
  const serviceItem = page
    .locator('[cmdk-item], [role="option"]')
    .first();
  log(
    `Fix 1 — Service dropdown visible: ${(await serviceItem.isVisible().catch(() => false)) ? "YES" : "NO"}`,
  );
  await serviceItem.click({ force: true });
  await page.waitForTimeout(400);

  // Pick at least one data category
  const categoryBtn = page
    .locator('button[role="combobox"]:has-text("Select categories")')
    .first();
  await categoryBtn.click({ force: true });
  await page.waitForTimeout(400);
  const categoryItem = page
    .locator('[cmdk-item], [role="option"]')
    .first();
  log(
    `Fix 1 — Data Categories dropdown visible: ${(await categoryItem.isVisible().catch(() => false)) ? "YES" : "NO"}`,
  );
  await categoryItem.click({ force: true });
  // Close the multi-select popover by pressing Escape
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Submit the dialog
  const submitBtn = page.locator('button:has-text("Add")').last();
  await submitBtn.click({ force: true });
  await page.waitForTimeout(1500);

  // ── Fix 3 check — supplemental row appears under parent with 1a label,
  //    ↳ connector, "Linked to LE:" caption ────────────────────────────
  const tableRowsTexts = await page.evaluate(() => {
    const rows = Array.from(
      document.querySelectorAll('table tbody tr'),
    ).filter((r) => r.querySelector("td"));
    return rows.map((r, i) => {
      // Find the # cell (first td) and the value cell text
      const tds = r.querySelectorAll("td");
      const numCell = tds[0]?.textContent?.trim() ?? "";
      const allText = r.textContent ?? "";
      return {
        idx: i,
        num: numCell,
        hasArrow: allText.includes("↳"),
        hasLinkedTo: allText.includes("Linked to LE:"),
        snippet: allText.slice(0, 180).replace(/\s+/g, " "),
      };
    });
  });

  log(`Table rows after add: ${JSON.stringify(tableRowsTexts.slice(0, 12), null, 2)}`);

  const supRow = tableRowsTexts.find(
    (r) => r.hasArrow && r.hasLinkedTo,
  );
  log(`Fix 3 — Supplemental row rendered with ↳ + "Linked to LE:": ${supRow ? "YES" : "NO"}`);
  if (supRow) {
    log(`Fix 3 — Supplemental row num cell value: "${supRow.num}"`);
    const looksLikeSubLetter = /^\d+[a-z]$/.test(supRow.num);
    log(`Fix 3 — Sub-letter label (e.g. "1a"): ${looksLikeSubLetter ? "YES" : "NO"}`);
  }

  await page.screenshot({
    path: "verify-supplemental.png",
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
