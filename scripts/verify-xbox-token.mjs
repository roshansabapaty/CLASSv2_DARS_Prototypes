/**
 * Verifies the LNS-2026-00270 seed now includes:
 *   - id1 (LE email)  + id1a + id1b (existing supplementals)
 *   - id2 (LE-provided XBOX 5x5 token)
 *   - id2a (Supplemental MSA resolved via external gift-card-registry
 *     lookup, linked back to id2)
 *
 * Display labels should be 1 / 1a / 1b / 2 / 2a, with row 2 carrying the
 * XBOX 5X5 Token badge and row 2a indented under it with the Linked to LE
 * caption pointing at the token.
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
  await page.evaluate(() =>
    localStorage.setItem("dars.workflowListPane.visible", "true"),
  );
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-2026-00270/ })
    .first()
    .click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  const reviewBtn = page
    .locator("nav[aria-label=\"Case workflow\"] button")
    .filter({ hasText: /Review Case/i })
    .first();
  if (await reviewBtn.count()) {
    await reviewBtn.click({ force: true });
    await page.waitForTimeout(800);
  }
  const fulfillmentToggle = page
    .locator('button[aria-label*="fulfillment wizard" i]')
    .first();
  if (await fulfillmentToggle.count()) {
    await fulfillmentToggle.click({ force: true });
    await page.waitForTimeout(1500);
  }

  const rows = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("table tbody tr"));
    return all
      .filter((r) => r.querySelector("td"))
      .map((r) => {
        const tds = r.querySelectorAll("td");
        const num = tds[0]?.textContent?.trim() ?? "";
        const typeText = tds[1]?.textContent?.trim() ?? "";
        const valueText = (tds[2]?.textContent?.trim() ?? "").replace(/\s+/g, " ");
        const accountText = tds[4]?.textContent?.trim() ?? "";
        return { num, typeText, valueText, accountText };
      });
  });

  log(`Rows rendered: ${rows.length}`);
  rows.forEach((r) =>
    log(
      `  ${r.num.padEnd(4)} type="${r.typeText.slice(0, 30)}" account="${r.accountText.padEnd(14)}" value="${r.valueText.slice(0, 60)}"`,
    ),
  );

  const tokenRow = rows.find((r) => r.num === "2");
  const tokenSupRow = rows.find((r) => r.num === "2a");

  log(
    `Row 2 (XBOX 5x5 Token) present: ${
      tokenRow && /XBOX 5X5 Token/i.test(tokenRow.typeText) ? "YES" : "NO"
    }`,
  );
  log(
    `Row 2 value matches seeded 5x5 token: ${
      tokenRow && tokenRow.valueText.includes("M2Q4T-PQRJX-7HK9F-WVNB3-RSTYZ")
        ? "YES"
        : "NO"
    }`,
  );
  log(
    `Row 2a (resolved MSA) present + grouped + linked: ${
      tokenSupRow &&
      tokenSupRow.valueText.includes("gamer.redeemer@outlook.com") &&
      /Linked to LE/i.test(tokenSupRow.valueText)
        ? "YES"
        : "NO"
    }`,
  );
  log(
    `Row 2a Account Check shows Consumer (Found + C): ${
      tokenSupRow &&
      /Found/i.test(tokenSupRow.accountText) &&
      /C\b/.test(tokenSupRow.accountText)
        ? "YES"
        : "NO"
    }`,
  );

  await page.screenshot({
    path: "verify-xbox-token.png",
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
