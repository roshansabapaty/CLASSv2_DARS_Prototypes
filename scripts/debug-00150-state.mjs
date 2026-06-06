import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  const search = page.locator('input[aria-label="Search cases"]');
  await search.fill("LNS-2026-00150");
  await page.waitForTimeout(700);

  const card = page
    .locator("div.cursor-pointer")
    .filter({ hasText: /LNS-2026-00150/ })
    .first();
  await card.click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(2_000);

  // Read what stage / step is shown
  const nav = await page.evaluate(() => {
    const ws = document.querySelector('nav[aria-label="Case workflow"]');
    return ws?.textContent?.replace(/\s+/g, " ").slice(0, 400) ?? "";
  });
  console.log("Workflow nav:", nav);

  // Check if any "Check All Accounts" button exists anywhere
  const buttonTexts = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button"))
      .map((b) => (b.textContent ?? "").trim())
      .filter((t) => /check.*account/i.test(t) || /check.*all/i.test(t)),
  );
  console.log("Check-related buttons:", buttonTexts);

  await page.screenshot({ path: "debug-00150.png", fullPage: false });
  await browser.close();
}

main().catch(console.error);
