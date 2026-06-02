/**
 * Verifies the LNS-2026-00270 seed now includes 2 supplementals under
 * the LE-provided identifier, displaying as 1 / 1a / 1b in the
 * IdentifierTable without the user having to add anything manually.
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

  const targetCard = page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-2026-00270/ })
    .first();
  await targetCard.click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(1_500);

  // Navigate to Review Case → open fulfillment wizard panel
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

  // Walk the rendered rows in the IdentifierTable.
  const rows = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("table tbody tr"));
    return all
      .filter((r) => r.querySelector("td"))
      .map((r) => {
        const tds = r.querySelectorAll("td");
        const numCell = tds[0]?.textContent?.trim() ?? "";
        const text = (r.textContent ?? "").replace(/\s+/g, " ");
        return {
          num: numCell,
          hasArrow: text.includes("↳"),
          hasLinkedTo: text.includes("Linked to LE:"),
          // Pull the value cell text (3rd td) for clarity
          valueCell: tds[2]?.textContent?.trim()?.slice(0, 80) ?? "",
        };
      });
  });

  log(`Rows rendered: ${rows.length}`);
  rows.forEach((r, i) => {
    log(
      `  [${i}] num="${r.num}" arrow=${r.hasArrow ? "Y" : "N"} linked=${
        r.hasLinkedTo ? "Y" : "N"
      } value="${r.valueCell.replace(/\s+/g, " ").slice(0, 60)}"`,
    );
  });

  const parent = rows.find((r) => r.num === "1");
  const sup1 = rows.find((r) => r.num === "1a");
  const sup2 = rows.find((r) => r.num === "1b");

  log(`Parent row (1) present: ${parent ? "YES" : "NO"}`);
  log(
    `Supplemental 1a present + grouped + caption: ${
      sup1 && sup1.hasArrow && sup1.hasLinkedTo ? "YES" : "NO"
    }`,
  );
  log(
    `Supplemental 1b present + grouped + caption: ${
      sup2 && sup2.hasArrow && sup2.hasLinkedTo ? "YES" : "NO"
    }`,
  );

  await page.screenshot({
    path: "verify-seeded-supplementals.png",
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
