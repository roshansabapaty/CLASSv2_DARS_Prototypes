/**
 * Fulfillment-Wizard variant: for cases where the Triage-stage inline
 * IdentifierTable's Check All Accounts isn't reachable, try via the
 * Fulfillment Wizard panel instead.
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

  // Navigate to Review Case → Fulfillment Wizard
  const reviewBtn = page
    .locator('nav[aria-label="Case workflow"] button')
    .filter({ hasText: /Review Case/i })
    .first();
  if (await reviewBtn.count()) {
    await reviewBtn.click({ force: true });
    await page.waitForTimeout(800);
  }
  const wizardToggle = page
    .locator('button[aria-label*="fulfillment wizard" i]')
    .first();
  if (await wizardToggle.count()) {
    await wizardToggle.click({ force: true });
    await page.waitForTimeout(1_500);
  }

  const btn = page
    .locator('button:has-text("Check All Accounts")')
    .first();
  if (!(await btn.count())) {
    return { caseId, error: "Check All Accounts button not found in wizard" };
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
          value: (tds[2]?.textContent?.trim() ?? "").slice(0, 50),
          accountCell: tds[4]?.textContent?.trim() ?? "",
        };
      });
  });

  const enterpriseRows = rows.filter((r) => /FoundE/.test(r.accountCell));
  const consumerRows = rows.filter((r) => /FoundC/.test(r.accountCell));
  const notFoundRows = rows.filter((r) => /Not Found/i.test(r.accountCell));

  return {
    caseId,
    totalRows: rows.length,
    enterpriseRows: enterpriseRows.length,
    consumerRows: consumerRows.length,
    notFoundRows: notFoundRows.length,
    detail: rows.map(
      (r) => `${r.num} ${r.accountCell.replace(/\s+/g, " ").slice(0, 30)}`,
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

  console.log("\n──── FULFILLMENT-WIZARD AUDIT ────");
  for (const r of results) {
    if (r.error) {
      console.log(`${r.caseId}  ERROR: ${r.error}`);
      continue;
    }
    const status =
      r.enterpriseRows >= 1
        ? "✓ Enterprise found"
        : "✗ NO ENTERPRISE ROW";
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
