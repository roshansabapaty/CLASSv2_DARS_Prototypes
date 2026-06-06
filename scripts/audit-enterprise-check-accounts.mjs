/**
 * Comprehensive runtime audit: for every Enterprise mock case, open the
 * case, navigate to Step 4 (Identifier & Data Services), run "Check All
 * Accounts" via the inline IdentifierTable on the Triage stage, and
 * verify that at least one row's Account Check column shows Found + E.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

// Cases known to have at least one `accountType: "Enterprise"` seed.
const ENTERPRISE_CASES = [
  "LNS-2025-00125",
  "LNS-2026-00150",
  "LNS-2026-00180",
  "LNS-2026-00200",
  "LNS-2026-00210",
  "LNS-2026-00220",
  "LNS-2026-00230",
  "LNS-2026-00240",
  "LNS-2026-00250",
  "LNS-2026-00300",
  "LNS-2026-00310",
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
  await page.waitForTimeout(1_200);

  // Explicitly navigate to TRIAGE stage so the inline IdentifierTable
  // with Check All Accounts is reachable, even if the case originally
  // opened on Collection or Review Case.
  const triageBtn = page
    .locator('nav[aria-label="Case workflow"] button')
    .filter({ hasText: /^TRIAGE$|^Triage$/i })
    .first();
  if (await triageBtn.count()) {
    await triageBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
  // Navigate to Step 4 (Identifier & Data Services).
  const step4 = page
    .locator('nav[aria-label="Case workflow"] button')
    .filter({ hasText: /Identifier.*Data Services|Account Identifiers/i })
    .first();
  if (await step4.count()) {
    await step4.click({ force: true });
    await page.waitForTimeout(800);
  }
  // Expand Account Identifiers if collapsed
  for (const t of await page
    .locator('button[aria-expanded="false"]')
    .filter({ hasText: /Account Identifier|Identifier/i })
    .all()) {
    await t.click({ force: true }).catch(() => {});
    await page.waitForTimeout(200);
  }

  // Click Check All Accounts
  const btn = page
    .locator('button:has-text("Check All Accounts")')
    .first();
  const found = await btn.count();
  if (!found) {
    return { caseId, error: "Check All Accounts button not found" };
  }
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ force: true });
  await page.waitForTimeout(5_500);

  // Read the row's Account Check column
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

  // The rendered cell text concatenates everything without spaces:
  // "FoundEEurope - ..." for Enterprise, "FoundCNorth ..." for Consumer.
  // Distinguish by which character follows "Found":
  //   "FoundE" → Enterprise row
  //   "FoundC" → Consumer row
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
  for (const caseId of ENTERPRISE_CASES) {
    try {
      const r = await probeCase(page, caseId);
      results.push(r);
    } catch (err) {
      results.push({ caseId, error: err.message });
    }
  }

  console.log("\n──── ENTERPRISE CHECK ACCOUNTS AUDIT ────");
  console.log(
    "Case            E   C  NF  | Status                | Rows".padEnd(80),
  );
  for (const r of results) {
    if (r.error) {
      console.log(`${r.caseId}  ERROR: ${r.error}`);
      continue;
    }
    const status =
      r.enterpriseRows >= 1
        ? "✓ Enterprise found"
        : r.totalRows === 0
          ? "(no rows)"
          : "✗ NO ENTERPRISE ROW";
    console.log(
      `${r.caseId}  E=${r.enterpriseRows}  C=${r.consumerRows}  NF=${r.notFoundRows}  | ${status.padEnd(22)} | ${r.detail.join(" | ").slice(0, 80)}`,
    );
  }

  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
