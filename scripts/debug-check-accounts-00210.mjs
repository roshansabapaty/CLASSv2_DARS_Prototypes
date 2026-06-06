/**
 * Reproduce the reported bug: Check Accounts on LNS-2026-00210 returns
 * Consumer instead of Enterprise, despite the seed having
 * accountType: "Enterprise" on id1.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();
  const log = (m) => console.log(m);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  // Filter to LNS-2026-00210
  const search = page.locator('input[aria-label="Search cases"]');
  await search.fill("LNS-2026-00210");
  await page.waitForTimeout(700);

  const card = page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-2026-00210/ })
    .first();
  await card.click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // Stay on Triage stage — find the inline IdentifierTable.
  // Navigate to Step 4 (Identifier & Data Services) where the table mounts.
  const step4 = page
    .locator('nav[aria-label="Case workflow"] button')
    .filter({ hasText: /Identifier.*Data Services|Account Identifiers/i })
    .first();
  if (await step4.count()) {
    await step4.click({ force: true });
    await page.waitForTimeout(800);
  }
  // Expand Account Identifiers if collapsed
  const togglers = await page
    .locator('button[aria-expanded="false"]')
    .filter({ hasText: /Account Identifier|Identifier/i })
    .all();
  for (const t of togglers.slice(0, 3)) {
    await t.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }

  // Read initial state
  const beforeRows = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("table tbody tr"));
    return all
      .filter((r) => r.querySelector("td"))
      .map((r) => {
        const tds = r.querySelectorAll("td");
        return {
          num: tds[0]?.textContent?.trim() ?? "",
          value: (tds[2]?.textContent?.trim() ?? "").slice(0, 50),
          accountCell: tds[4]?.textContent?.trim() ?? "",
        };
      });
  });
  log("BEFORE Check Accounts:");
  beforeRows.forEach((r) => log(`  ${r.num} ${r.accountCell.padEnd(20)} ${r.value}`));

  // Click Check All Accounts
  const checkAllBtn = page
    .locator('button:has-text("Check All Accounts")')
    .first();
  await checkAllBtn.waitFor({ state: "visible", timeout: 15_000 });
  await checkAllBtn.scrollIntoViewIfNeeded();
  await checkAllBtn.click({ force: true });
  await page.waitForTimeout(5_000);

  // Read after state
  const afterRows = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("table tbody tr"));
    return all
      .filter((r) => r.querySelector("td"))
      .map((r) => {
        const tds = r.querySelectorAll("td");
        return {
          num: tds[0]?.textContent?.trim() ?? "",
          value: (tds[2]?.textContent?.trim() ?? "").slice(0, 50),
          accountCell: tds[4]?.textContent?.trim() ?? "",
        };
      });
  });
  log("AFTER Check Accounts:");
  afterRows.forEach((r) => log(`  ${r.num} ${r.accountCell.padEnd(20)} ${r.value}`));

  await page.screenshot({ path: "debug-00210.png", fullPage: false });
  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
