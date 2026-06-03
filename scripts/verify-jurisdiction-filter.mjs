/**
 * Verifies the Jurisdiction filter is available in the Add Filter menu,
 * appears as a chip with a multi-select picker, and narrows the queue
 * when a value is selected.
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
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  // ── 1. Open the "+ Add filter" menu and confirm Jurisdiction is present
  const addFilterBtn = page
    .locator('button:has-text("Add filter")')
    .first();
  await addFilterBtn.waitFor({ state: "visible", timeout: 15_000 });
  await addFilterBtn.click({ force: true });
  await page.waitForTimeout(500);

  // The popover renders buttons inside a panel — query everything
  // inside the popover with text content.
  const allMenuItems = await page.evaluate(() => {
    const items = document.querySelectorAll(
      '[data-radix-popper-content-wrapper] button, [data-radix-popper-content-wrapper] [role="menuitem"]',
    );
    return Array.from(items).map((i) => (i.textContent ?? "").trim());
  });
  log(
    `Jurisdiction option appears in Add filter menu: ${
      allMenuItems.some((t) => /Jurisdiction/i.test(t)) ? "YES" : "NO"
    }`,
  );
  log(`(menu items: ${allMenuItems.slice(0, 12).join(" · ")})`);

  // Click the Jurisdiction option — match any button containing the text
  const jurItem = page
    .locator('[data-radix-popper-content-wrapper] button')
    .filter({ hasText: /^Jurisdiction$/ })
    .first();
  await jurItem.click({ force: true });
  await page.waitForTimeout(800);

  // ── 2. Chip should be present, popover should open (defaultOpen)
  const chip = page
    .locator('button[aria-label^="Jurisdiction:"]')
    .first();
  await chip.waitFor({ state: "visible", timeout: 5_000 });
  log(`Jurisdiction chip rendered: YES`);

  // ── 3. The popover should list distinct jurisdiction values
  // First, try to explicitly click the chip to force the popover open
  // (in case defaultOpen didn't fire).
  await chip.click({ force: true });
  await page.waitForTimeout(600);

  const popoverDebug = await page.evaluate(() => {
    const wrappers = document.querySelectorAll(
      '[data-radix-popper-content-wrapper]',
    );
    return Array.from(wrappers).map((w) => ({
      visible: w.offsetHeight > 0,
      labels: Array.from(w.querySelectorAll("label")).length,
      textSnippet: (w.textContent ?? "").slice(0, 120).replace(/\s+/g, " "),
    }));
  });
  log(`Popover wrappers debug: ${JSON.stringify(popoverDebug)}`);

  const popoverItems = await page.evaluate(() => {
    const opts = document.querySelectorAll(
      '[data-radix-popper-content-wrapper] label',
    );
    return Array.from(opts)
      .map((o) => (o.textContent ?? "").trim())
      .filter(Boolean);
  });
  log(`Distinct jurisdictions visible in popover: ${popoverItems.length}`);
  log(`  → ${popoverItems.slice(0, 8).join(" · ")}`);

  // ── 4. Capture queue size before, then pick one jurisdiction
  const sizeBefore = await page.evaluate(
    () => document.querySelectorAll("div.cursor-pointer").length,
  );
  log(`Cards visible BEFORE jurisdiction pick: ${sizeBefore}`);

  if (popoverItems.length > 0) {
    // Click the first checkbox/label
    const firstOpt = page
      .locator('[data-radix-popper-content-wrapper] label')
      .first();
    await firstOpt.click({ force: true });
    await page.waitForTimeout(700);
    // Close popover (click chip again or press Escape)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const sizeAfter = await page.evaluate(
      () => document.querySelectorAll("div.cursor-pointer").length,
    );
    log(`Cards visible AFTER jurisdiction pick: ${sizeAfter}`);
    log(
      `Filter narrowed the queue: ${sizeAfter < sizeBefore ? "YES" : "NO"}`,
    );

    // Confirm chip summary updated
    const chipText = await chip.textContent();
    log(`Chip summary now: "${(chipText ?? "").trim()}"`);
    log(
      `Chip summary no longer "Any": ${!/Any/.test(chipText ?? "") ? "YES" : "NO"}`,
    );
  } else {
    log(`(skipped narrowing check — no options visible in popover)`);
  }

  await page.screenshot({
    path: "verify-jurisdiction.png",
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
