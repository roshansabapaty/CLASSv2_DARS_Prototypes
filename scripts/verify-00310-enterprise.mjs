import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_800);

  // Open case from main queue (00310 isn't in attorney dashboard)
  const search = page.locator('input[aria-label="Search cases"]');
  await search.fill("LNS-2026-00310");
  await page.waitForTimeout(700);
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-2026-00310/ })
    .first()
    .click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // Navigate to Step 4 to surface EnterpriseContextSection
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

  const text = await page.evaluate(() => document.body.innerText);
  console.log("LNS-2026-00310 check:");
  console.log(`  Enterprise Context heading: ${/Enterprise Context/.test(text) ? "Y" : "N"}`);
  console.log(`  Kontoso International:       ${text.includes("Kontoso International") ? "Y" : "N"}`);
  console.log(`  kontoso.example domain:      ${text.includes("kontoso.example") ? "Y" : "N"}`);
  console.log(`  Admin email:                 ${text.includes("tenant.admin@kontoso.example") ? "Y" : "N"}`);
  console.log(`  Page errors:                 ${errors.length}`);
  if (errors.length) errors.slice(0, 2).forEach((e) => console.log(`    • ${e.slice(0, 300)}`));

  await browser.close();
}
main().catch(console.error);
