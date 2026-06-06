import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(`${err.name}: ${err.message}\n${err.stack ?? ""}`));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  // Navigate to Attorney Dashboard
  const attorneyNav = page
    .locator('button[aria-label*="Attorney" i], button[title*="Attorney" i]')
    .first();
  await attorneyNav.click({ force: true });
  await page.waitForTimeout(2_000);

  // Snapshot the dashboard state
  const dashSnap = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tr, button, div.cursor-pointer"));
    const lnsRefs = rows
      .map((r) => (r.textContent ?? "").match(/LNS-\d{4}-\d{5}/g))
      .flat()
      .filter(Boolean);
    return {
      bodyTextSnippet: document.body.innerText.slice(0, 300).replace(/\s+/g, " "),
      uniqueLnsRefs: [...new Set(lnsRefs)],
      buttonCount: document.querySelectorAll("button").length,
    };
  });
  console.log("=== Dashboard state ===");
  console.log("Body snippet:", dashSnap.bodyTextSnippet);
  console.log("LNS refs in dashboard:", dashSnap.uniqueLnsRefs);

  // Pick an Enterprise case I modified in Scope A
  const target = "LNS-2025-00125";
  if (!target) {
    console.log("NO LNS REFS FOUND — dashboard is empty or rendered differently");
    await browser.close();
    return;
  }
  console.log(`\n=== Clicking ${target} ===`);

  // Look for a clickable element (probably the case-id button)
  const caseBtn = page
    .locator('button, [role="button"], div.cursor-pointer')
    .filter({ hasText: target })
    .first();
  if (await caseBtn.count()) {
    await caseBtn.click({ force: true });
  } else {
    console.log("Could not find clickable element for", target);
  }
  await page.waitForTimeout(3_000);

  const afterClick = await page.evaluate(() => ({
    bodyTextSnippet: document.body.innerText.slice(0, 500).replace(/\s+/g, " "),
    bodyLen: document.body.innerText.length,
    pageTitle: document.title,
    hasErrorBoundary: /Something went wrong|Error|stack/i.test(document.body.innerText),
  }));
  console.log("After-click state:");
  console.log("  Body length:", afterClick.bodyLen);
  console.log("  Body snippet:", afterClick.bodyTextSnippet);
  console.log("  Has error boundary:", afterClick.hasErrorBoundary);
  console.log("\nConsole errors:", consoleErrors.length);
  consoleErrors.slice(0, 5).forEach((e) => console.log("  •", e.slice(0, 500)));
  console.log("\nPage errors:", pageErrors.length);
  pageErrors.slice(0, 3).forEach((e) => console.log("  •", e.slice(0, 1500)));

  await page.screenshot({ path: "debug-attorney-after-click.png", fullPage: false });
  await browser.close();
}

main().catch(console.error);
