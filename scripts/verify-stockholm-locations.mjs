/**
 * Verifies LNS-2026-00270's Consumer User Location Summary column AND
 * the Consumer User Locations drilldown panel populate with Stockholm
 * data after Check Accounts runs.
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

  // Navigate to Review Case + open the IdentifierPanel slide-out
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

  // Click "Check All Accounts" so the IP-history loop runs.
  const checkAllBtn = page
    .locator('button:has-text("Check All Accounts")')
    .first();
  await checkAllBtn.waitFor({ state: "visible", timeout: 15_000 });
  await checkAllBtn.scrollIntoViewIfNeeded();
  await checkAllBtn.click({ force: true });
  // Wait for the simulated network delay + state propagation
  await page.waitForTimeout(5_000);

  // Snapshot each row's Consumer User Location Summary cell (column 5).
  const rows = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("table tbody tr"));
    return all
      .filter((r) => r.querySelector("td"))
      .map((r) => {
        const tds = r.querySelectorAll("td");
        return {
          num: tds[0]?.textContent?.trim() ?? "",
          value: (tds[2]?.textContent?.trim() ?? "")
            .slice(0, 60)
            .replace(/\s+/g, " "),
          locationCell: (tds[5]?.textContent?.trim() ?? "").replace(/\s+/g, " "),
        };
      });
  });

  log(`Rows after Check Accounts:`);
  rows.forEach((r) =>
    log(`  ${r.num.padEnd(4)} loc="${r.locationCell.padEnd(40)}" value="${r.value}"`),
  );

  const targetRow = rows.find((r) =>
    r.value.includes("phisher.target@hotmail.com"),
  );
  const gamerRow = rows.find((r) =>
    r.value.includes("gamer.redeemer@outlook.com"),
  );

  log(
    `LE target row shows Sweden: ${targetRow && /Sweden|Stockholm/.test(targetRow.locationCell) ? "YES" : "NO"}`,
  );
  log(
    `Resolved MSA row shows Sweden: ${gamerRow && /Sweden|Stockholm/.test(gamerRow.locationCell) ? "YES" : "NO"}`,
  );

  // Click the "Consumer User Locations" button on the LE target row.
  // Look for the button rendered with aria-label "View Consumer User Locations".
  const drilldownBtn = page
    .locator('button[aria-label*="Consumer User Location" i]')
    .first();
  if (await drilldownBtn.count()) {
    await drilldownBtn.click({ force: true });
    await page.waitForTimeout(1_500);

    // The drawer should mount with Country summary card showing Sweden.
    const drawerText = await page.evaluate(() => {
      const drawer = document.querySelector(
        '[role="dialog"], [data-radix-collection-item]',
      );
      return drawer?.textContent ?? document.body.textContent ?? "";
    });

    const hasSweden = /Sweden/.test(drawerText);
    const hasStockholm = /Stockholm/.test(drawerText);
    log(`Drilldown panel shows Sweden: ${hasSweden ? "YES" : "NO"}`);
    log(`Drilldown panel shows Stockholm: ${hasStockholm ? "YES" : "NO"}`);
  } else {
    log(`Consumer User Locations drilldown button: NOT FOUND`);
  }

  await page.screenshot({
    path: "verify-stockholm.png",
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
