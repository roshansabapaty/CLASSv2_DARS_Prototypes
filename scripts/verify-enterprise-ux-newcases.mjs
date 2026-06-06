/**
 * Verifies the Enterprise UX (OrgPanel + UserPanel) now renders in the
 * Attorney workspace for LNS-2026-00240 and LNS-2026-00250 after the
 * enterpriseContext additions.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

const TARGETS = [
  {
    caseId: "LNS-2026-00240",
    orgName: "Parlamento Italiano",
    domain: "parlamento.it",
    adminEmail: "ict.admin@parlamento.it",
  },
  {
    caseId: "LNS-2026-00250",
    orgName: "Dziennik Press",
    domain: "dziennik.example",
    adminEmail: "tenant.admin@dziennik.example",
  },
];

async function probeCase(page, t) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_500);
  await page
    .locator('button[aria-label*="Attorney" i], button[title*="Attorney" i]')
    .first()
    .click({ force: true });
  await page.waitForTimeout(1_500);

  const caseHit = page
    .locator('button, [role="button"], tr, div.cursor-pointer')
    .filter({ hasText: t.caseId })
    .first();
  await caseHit.click({ force: true });
  await page.waitForTimeout(2_500);

  const text = await page.evaluate(() => document.body.innerText);
  return {
    caseId: t.caseId,
    enterpriseContextHeader: /Enterprise Context/.test(text),
    orgHeader: text.includes(t.orgName),
    domain: text.includes(t.domain),
    adminEmail: text.includes(t.adminEmail),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();

  for (const t of TARGETS) {
    const r = await probeCase(page, t);
    console.log(
      `${r.caseId}:  EnterpriseCtx=${r.enterpriseContextHeader ? "Y" : "N"}  Org=${r.orgHeader ? "Y" : "N"}  Domain=${r.domain ? "Y" : "N"}  AdminEmail=${r.adminEmail ? "Y" : "N"}`,
    );
  }
  await browser.close();
}

main().catch(console.error);
