/**
 * Verify the 8 new persona-aligned filters surface in the +Add filter menu
 * and that picking one of them opens the chip + its value control.
 *
 * Coverage:
 *   - Attorney: Escalation status, Assigned attorney
 *   - RS: Tenant, Unread inbound (IA/EA)
 *   - TS: Issuing Authority, Request Origin
 *   - LENS Lead: Stale escalation, Recommend Rejection
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

const EXPECTED_FILTERS = [
  "Escalation status",
  "Assigned attorney",
  "Tenant",
  "Unread inbound (IA/EA)",
  "Issuing Authority",
  "Request Origin",
  "Stale escalation",
  "Recommend Rejection",
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page
    .waitForLoadState("networkidle", { timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1500);

  // ── Open "+ Add filter" menu ──────────────────────────────────────────
  console.log("=== Filter catalog — Add filter menu coverage ===");
  const addFilterBtn = page
    .locator("button")
    .filter({ hasText: /Add filter/i })
    .first();
  if ((await addFilterBtn.count()) === 0) {
    console.log("  '+ Add filter' button not found.");
    await browser.close();
    process.exit(1);
  }
  await addFilterBtn.click({ force: true });
  await page.waitForTimeout(500);

  // Each filter appears as a clickable menu item in the dropdown. We
  // verify presence by scanning the menu's innerText for each label.
  const menuText = await page.evaluate(() => {
    const menus = Array.from(
      document.querySelectorAll(
        '[role="menu"], [data-radix-popper-content-wrapper]',
      ),
    );
    return menus.map((m) => m.textContent ?? "").join("\n");
  });

  for (const label of EXPECTED_FILTERS) {
    const present = menuText.includes(label);
    console.log(
      `  ${label.padEnd(28, " ")}  ${present ? "YES" : "MISSING"}`,
    );
  }

  // ── Pick "Escalation status" and verify control opens with options ────
  console.log("");
  console.log("=== Pick 'Escalation status' → control opens ===");
  const escMenuItem = page
    .locator('[role="menuitem"], button, div')
    .filter({ hasText: /^Escalation status/ })
    .first();
  if ((await escMenuItem.count()) > 0) {
    await escMenuItem.click({ force: true });
    await page.waitForTimeout(700);
    const popoverText = await page.evaluate(() => {
      const wrappers = Array.from(
        document.querySelectorAll('[data-radix-popper-content-wrapper]'),
      );
      return wrappers
        .map((w) => w.textContent ?? "")
        .filter((t) => /Escalation status/.test(t))
        .join("\n");
    });
    const hasReviewed = /Reviewed \(pickup\)/.test(popoverText);
    const hasRedirect = /Redirect requested/.test(popoverText);
    const hasInfoReq = /Info requested/.test(popoverText);
    console.log(
      `  Option "Reviewed (pickup)" rendered:           ${hasReviewed ? "YES" : "NO"}`,
    );
    console.log(
      `  Option "Redirect requested" rendered:          ${hasRedirect ? "YES" : "NO"}`,
    );
    console.log(
      `  Option "Info requested" rendered:              ${hasInfoReq ? "YES" : "NO"}`,
    );
  } else {
    console.log("  (could not find 'Escalation status' menu item)");
  }

  console.log("");
  console.log(`Page / console errors:                       ${errors.length}`);
  if (errors.length) {
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));
  }

  await page.screenshot({ path: "verify-persona-filters.png", fullPage: false });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
