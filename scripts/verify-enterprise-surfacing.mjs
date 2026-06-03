/**
 * End-to-end verification of the Enterprise-surfacing work:
 *   - Scope A: 4 newly-seeded cases render the Enterprise Context Section
 *   - Scope C.1: tenant admin caption renders on Enterprise rows
 *   - Scope C.2: "View other cases on this tenant" link opens drawer
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function probeCase(page, caseId, tenantAdminName, tenantAdminEmail) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_200);

  const search = page.locator(
    'input[placeholder*="Search by case ID"], input[aria-label="Search cases"]',
  );
  await search.first().fill(caseId);
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

  // Navigate to Step 4 (Identifier & Data Services)
  const step4 = page
    .locator('nav[aria-label="Case workflow"] button')
    .filter({ hasText: /Identifier.*Data Services|Account Identifiers/i })
    .first();
  if (await step4.count()) {
    await step4.click({ force: true });
    await page.waitForTimeout(700);
  }

  // Expand Account Identifiers section if collapsed
  const collapsibles = await page
    .locator('button[aria-expanded="false"]')
    .filter({ hasText: /Account Identifier/i })
    .all();
  for (const t of collapsibles.slice(0, 2)) {
    await t.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  const html = await page.evaluate(() => document.body.innerHTML);

  const result = {
    case: caseId,
    enterpriseContextRendered: /Enterprise Context/.test(html),
    tenantAdminNameRendered: html.includes(tenantAdminName),
    tenantAdminEmailRendered: html.includes(tenantAdminEmail),
    priorTenantLinkRendered: /View other cases on this tenant/.test(html),
  };

  // Try clicking the prior tenant link to verify drawer opens
  if (result.priorTenantLinkRendered) {
    const link = page
      .locator('button:has-text("View other cases on this tenant")')
      .first();
    if (await link.count()) {
      await link.click({ force: true });
      await page.waitForTimeout(700);
      const drawerHtml = await page.evaluate(
        () => document.body.innerHTML,
      );
      result.drawerOpenedWithTenantContent =
        /Prior LNS history|No prior LNS cases/.test(drawerHtml);
      // Close it via Escape
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  }

  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();

  const CASES = [
    ["LNS-2025-00125", "Michael Thompson", "tenant.admin@globex-uk.example"],
    ["LNS-2026-00210", "Giulia Conti", "tenant.admin@acme-it.com"],
    ["LNS-2026-00220", "Pieter de Jong", "tenant.admin@stichting-leiden.example"],
    ["LNS-2026-00230", "Pieter de Jong", "tenant.admin@stichting-leiden.example"],
  ];

  const results = [];
  for (const [caseId, adminName, adminEmail] of CASES) {
    try {
      const r = await probeCase(page, caseId, adminName, adminEmail);
      results.push(r);
    } catch (err) {
      console.log(`${caseId}: probe failed (${err.message})`);
    }
  }

  console.log("\n──── RESULTS ────");
  for (const r of results) {
    console.log(
      `${r.case}:  EnterpriseCtx=${r.enterpriseContextRendered ? "Y" : "N"}  AdminName=${r.tenantAdminNameRendered ? "Y" : "N"}  AdminEmail=${r.tenantAdminEmailRendered ? "Y" : "N"}  PriorTenantLink=${r.priorTenantLinkRendered ? "Y" : "N"}  DrawerOpens=${r.drawerOpenedWithTenantContent === undefined ? "—" : r.drawerOpenedWithTenantContent ? "Y" : "N"}`,
    );
  }

  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
