/**
 * Spot-check: open one of the newly-seeded Enterprise cases and confirm
 * the Enterprise Context Section renders with org name + tenant info.
 *
 * Drives LNS-2026-00210 (Italian manifest-error, ACME IT).
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function checkCase(page, caseId, expectedOrgName, expectedDomain) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_500);

  // Filter / search to surface the case
  const search = page.locator(
    'input[placeholder*="Search by case ID"], input[aria-label="Search cases"]',
  );
  if (await search.count()) {
    await search.first().fill(caseId);
    await page.waitForTimeout(700);
  }

  const card = page
    .locator("div.cursor-pointer")
    .filter({ hasText: caseId })
    .first();
  await card.waitFor({ state: "visible", timeout: 10_000 });
  await card.click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // Navigate to Step 4 — Identifier & Data Services — where the
  // Enterprise Context section is mounted (inside the Step 4 panel).
  const step4 = page
    .locator('nav[aria-label="Case workflow"] button')
    .filter({ hasText: /Identifier.*Data Services|Account Identifiers/i })
    .first();
  if (await step4.count()) {
    await step4.click({ force: true });
    await page.waitForTimeout(800);
  }

  // Section is inside a CollapsibleSection — expand it by clicking its
  // header if collapsed. We detect by aria-expanded.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(700);

  // Try expanding any "Account Identifiers" section header.
  const collapsibleToggles = await page
    .locator('button[aria-expanded="false"]')
    .filter({ hasText: /Account Identifier|Identifier/i })
    .all();
  for (const t of collapsibleToggles.slice(0, 3)) {
    await t.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(700);

  const html = await page.evaluate(() => document.body.innerHTML);
  return {
    case: caseId,
    hasEnterpriseContextHeading: /Enterprise Context/.test(html),
    hasOrgName: html.includes(expectedOrgName),
    hasTenantDomain: html.includes(expectedDomain),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();
  const log = (m) => console.log(m);

  const results = [];
  for (const c of [
    ["LNS-2025-00125", "Globex UK Ltd.", "globex-uk.example"],
    ["LNS-2026-00210", "ACME IT S.r.l.", "acme-it.onmicrosoft.com"],
    ["LNS-2026-00220", "Stichting Leiden Holding B.V.", "stichting-leiden.onmicrosoft.com"],
    ["LNS-2026-00230", "Stichting Leiden Holding B.V.", "stichting-leiden.onmicrosoft.com"],
  ]) {
    try {
      const r = await checkCase(page, c[0], c[1], c[2]);
      results.push(r);
      log(
        `${r.case}: Enterprise Context heading=${r.hasEnterpriseContextHeading ? "Y" : "N"} | OrgName=${r.hasOrgName ? "Y" : "N"} | TenantDomain=${r.hasTenantDomain ? "Y" : "N"}`,
      );
    } catch (err) {
      log(`${c[0]}: FAILED (${err.message})`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
