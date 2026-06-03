/**
 * Verifies the CaseQueueSortByMenu drives the card-view order:
 *   1. Default state shows "Sort: Default" label
 *   2. Picking "Priority — most urgent first" reorders cards so an
 *      Emergency-tier case appears above any Routine-tier card visible
 *      in the same view
 *   3. Picking "Default" restores the prior order
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function priorityOrder(page) {
  // Walk visible case cards in document order and pull out their P-tag.
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("div.cursor-pointer"));
    return cards
      .map((c) => {
        // P-badge text is typically "P0" / "P1" / "P2" / "P3"
        const pBadge = Array.from(c.querySelectorAll("span,div,small")).find(
          (el) => /^P\d$/.test((el.textContent ?? "").trim()),
        );
        return (pBadge?.textContent ?? "").trim();
      })
      .filter(Boolean);
  });
}

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

  // ── 1. Sort By trigger should be visible with "Default" label ─────
  const triggerBtn = page
    .locator('button[aria-label^="Sort:"]')
    .first();
  await triggerBtn.waitFor({ state: "visible", timeout: 15_000 });
  const initialLabel = await triggerBtn.getAttribute("aria-label");
  log(`Initial trigger aria-label: "${initialLabel}"`);
  log(
    `Default state visible: ${initialLabel?.includes("Default") ? "YES" : "NO"}`,
  );

  // Capture the priority order BEFORE applying any sort.
  const beforeOrder = await priorityOrder(page);
  log(`Priority order BEFORE sort (first 8): ${beforeOrder.slice(0, 8).join(", ")}`);

  // ── 2. Click trigger → pick "Most urgent first" under Priority ────
  await triggerBtn.click({ force: true });
  await page.waitForTimeout(400);
  const mostUrgent = page
    .locator('[role="menuitem"]:has-text("Most urgent first")')
    .first();
  await mostUrgent.waitFor({ state: "visible", timeout: 5_000 });
  await mostUrgent.click({ force: true });
  await page.waitForTimeout(800);

  const afterLabel = await triggerBtn.getAttribute("aria-label");
  log(`Trigger aria-label after pick: "${afterLabel}"`);
  log(
    `Trigger reflects Priority sort: ${afterLabel?.includes("Priority") && afterLabel?.includes("Most urgent first") ? "YES" : "NO"}`,
  );

  const afterOrder = await priorityOrder(page);
  log(`Priority order AFTER sort (first 8): ${afterOrder.slice(0, 8).join(", ")}`);

  // A simple correctness check: in the new order, the first non-empty
  // P-tag should be P0 or P1 (most urgent first). And the order should
  // be sorted descending overall.
  const pNums = afterOrder.map((s) => parseInt(s.slice(1), 10));
  const sortedDesc = [...pNums].sort((a, b) => a - b);
  const isSorted = JSON.stringify(pNums) === JSON.stringify(sortedDesc);
  log(`Cards sorted by P-tag ascending (P0 → P3): ${isSorted ? "YES" : "NO"}`);

  // ── 3. Click trigger → "Default (due-date tiebreaker)" restores ──
  await triggerBtn.click({ force: true });
  await page.waitForTimeout(400);
  await page
    .locator('[role="menuitem"]:has-text("Default")')
    .first()
    .click({ force: true });
  await page.waitForTimeout(800);

  const restoredLabel = await triggerBtn.getAttribute("aria-label");
  log(`Trigger aria-label after restore: "${restoredLabel}"`);
  log(
    `Default restored: ${restoredLabel?.includes("Default") ? "YES" : "NO"}`,
  );

  const restoredOrder = await priorityOrder(page);
  log(
    `Order matches initial after restore: ${JSON.stringify(restoredOrder) === JSON.stringify(beforeOrder) ? "YES" : "NO"}`,
  );

  await page.screenshot({
    path: "verify-sort-by.png",
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
