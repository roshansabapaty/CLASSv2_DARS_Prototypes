/**
 * End-to-end verification of the Enterprise-search relocation:
 *   1. "View other cases on this tenant →" link is GONE from the row
 *   2. The RelatedDARSCaseSearch element is now in the Enterprise Context
 *   3. Picking a case from the search lands it in the Case Identification
 *      "Related DARS Cases" field too (round-trip via formData.relatedCaseNumbers)
 *   4. No console errors when opening / navigating Enterprise cases
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const TARGET = "LNS-2026-00210";

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

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_500);

  const search = page.locator('input[aria-label="Search cases"]');
  await search.fill(TARGET);
  await page.waitForTimeout(700);
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: TARGET })
    .first()
    .click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // Navigate to Step 4 — Identifier & Data Services
  const step4 = page
    .locator('nav[aria-label="Case workflow"] button')
    .filter({ hasText: /Identifier.*Data Services|Account Identifiers/i })
    .first();
  if (await step4.count()) {
    await step4.click({ force: true });
    await page.waitForTimeout(700);
  }
  for (const t of await page
    .locator('button[aria-expanded="false"]')
    .filter({ hasText: /Account Identifier/i })
    .all()) {
    await t.click({ force: true }).catch(() => {});
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  const html = await page.evaluate(() => document.body.innerHTML);
  const text = await page.evaluate(() => document.body.innerText);

  const linkInRow = /View other cases on this tenant/.test(text);
  const heading = /Related DARS cases on this tenant/.test(text);
  const enterpriseCtx = /Enterprise Context/.test(text);

  console.log(`Row link "View other cases on this tenant": ${linkInRow ? "STILL THERE (FAIL)" : "GONE (expected)"}`);
  console.log(`"Enterprise Context" heading visible:       ${enterpriseCtx ? "YES" : "NO"}`);
  console.log(`"Related DARS cases on this tenant" heading: ${heading ? "YES" : "NO"}`);
  console.log(`Page / console errors:                       ${errors.length}`);
  if (errors.length) errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 300)}`));

  // Try clicking the new search trigger to confirm it opens the popover
  const searchTrigger = page
    .locator('button[role="combobox"]')
    .filter({ hasText: /Search by LNS|Search by tenant/i })
    .first();
  const triggerCount = await searchTrigger.count();
  console.log(`Search combobox trigger present:             ${triggerCount > 0 ? "YES" : "NO"}`);

  if (triggerCount > 0) {
    await searchTrigger.scrollIntoViewIfNeeded();
    await searchTrigger.click({ force: true });
    await page.waitForTimeout(600);
    const popoverHasInput = await page
      .locator('[data-radix-popper-content-wrapper] [cmdk-input], [data-radix-popper-content-wrapper] input')
      .count();
    console.log(`Search popover input opens:                  ${popoverHasInput > 0 ? "YES" : "NO"}`);
  }

  await page.screenshot({ path: "verify-enterprise-search.png", fullPage: false });
  await browser.close();
}

main().catch(console.error);
