/**
 * For Enterprise cases in AttorneyReview state, the inline Check All
 * Accounts button is hidden. Try via the IdentifierPanel slide-out
 * (Step1IdentifierReview) which exposes its own Check All Accounts.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

const CASES = [
  "LNS-2026-00150",
  "LNS-2026-00180",
  "LNS-2026-00200",
  "LNS-2026-00300",
];

async function probeCase(page, caseId) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_200);

  const search = page.locator('input[aria-label="Search cases"]');
  await search.fill(caseId);
  await page.waitForTimeout(700);

  const card = page
    .locator("div.cursor-pointer")
    .filter({ hasText: caseId })
    .first();
  await card.click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // Click the Identifier panel / fulfillment-wizard slide-out toggle in
  // the case-header action row (purple Fingerprint icon).
  const idPanelToggle = page
    .locator('button[aria-label*="fulfillment wizard" i]')
    .first();
  if (await idPanelToggle.count()) {
    await idPanelToggle.click({ force: true });
    await page.waitForTimeout(1_500);
  } else {
    // Fall back to keyboard shortcut
    await page.keyboard.press("Control+Shift+F");
    await page.waitForTimeout(1_000);
  }

  const btn = page
    .locator('button:has-text("Check All Accounts")')
    .first();
  if (!(await btn.count())) {
    return { caseId, error: "Check All Accounts button not found" };
  }
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ force: true });
  await page.waitForTimeout(5_500);

  const rows = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("table tbody tr"));
    return all
      .filter((r) => r.querySelector("td"))
      .map((r) => {
        const tds = r.querySelectorAll("td");
        return {
          num: tds[0]?.textContent?.trim() ?? "",
          accountCell: tds[4]?.textContent?.trim() ?? "",
        };
      });
  });

  const enterpriseRows = rows.filter((r) => /FoundE/.test(r.accountCell));
  const consumerRows = rows.filter((r) => /FoundC/.test(r.accountCell));
  return {
    caseId,
    totalRows: rows.length,
    enterpriseRows: enterpriseRows.length,
    consumerRows: consumerRows.length,
    detail: rows.map(
      (r) => `${r.num} ${r.accountCell.replace(/\s+/g, " ").slice(0, 25)}`,
    ),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();

  const results = [];
  for (const caseId of CASES) {
    try {
      results.push(await probeCase(page, caseId));
    } catch (err) {
      results.push({ caseId, error: err.message });
    }
  }

  console.log("\n──── IDENTIFIER-PANEL AUDIT ────");
  for (const r of results) {
    if (r.error) {
      console.log(`${r.caseId}  ERROR: ${r.error}`);
      continue;
    }
    const status = r.enterpriseRows >= 1 ? "✓ Enterprise found" : "✗ NO ENTERPRISE";
    console.log(
      `${r.caseId}  E=${r.enterpriseRows}  C=${r.consumerRows}  | ${status} | ${r.detail.join(" | ")}`,
    );
  }

  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
