/**
 * Verifies the new Account Found + Consumer/Enterprise controls in the
 * AddIdentifierDialog pre-populate the Account Check column on the new
 * supplemental row.
 *
 * Test plan:
 *   1. Open LNS-2026-00270
 *   2. Navigate to Review Case → open the Fulfillment Wizard panel
 *   3. Add a supplemental with Account Found = ON + Account Type = Enterprise
 *   4. Confirm the new row's Account Check cell shows "Found" + "E"
 *   5. Add another supplemental with Account Found = OFF
 *   6. Confirm the new row's Account Check cell shows "Not Found"
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function fillDialog(page, { value, accountFound, accountType }) {
  // Pick Email address type (default selected) — skip
  // Fill the value
  const valueInput = page.locator('input[aria-label="Identifier value"]');
  await valueInput.fill(value);
  await page.waitForTimeout(200);

  // Toggle Supplemental
  await page.locator("#addIdSupplemental").click({ force: true });
  await page.waitForTimeout(400);

  // Toggle Account Found if needed (defaults to ON)
  if (accountFound === false) {
    await page.locator("#supplementalAccountFound").click({ force: true });
    await page.waitForTimeout(200);
  }

  // Pick Account Type (Enterprise / Consumer) — only when accountFound
  if (accountFound !== false && accountType === "Enterprise") {
    await page
      .locator('button[role="radio"]:has-text("Enterprise")')
      .first()
      .click({ force: true });
    await page.waitForTimeout(200);
  }

  // Pick the linked LE identifier (first option)
  await page
    .locator('button[role="combobox"]:has-text("Select LE identifier")')
    .first()
    .click({ force: true });
  await page.waitForTimeout(400);
  await page
    .locator('[cmdk-item], [role="option"]')
    .first()
    .click({ force: true });
  await page.waitForTimeout(400);

  // Pick service
  await page
    .locator('button[role="combobox"]:has-text("Select service")')
    .first()
    .click({ force: true });
  await page.waitForTimeout(400);
  await page
    .locator('[cmdk-item], [role="option"]')
    .first()
    .click({ force: true });
  await page.waitForTimeout(400);

  // Pick at least one data category
  await page
    .locator('button[role="combobox"]:has-text("Select categories")')
    .first()
    .click({ force: true });
  await page.waitForTimeout(400);
  await page
    .locator('[cmdk-item], [role="option"]')
    .first()
    .click({ force: true });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Submit
  await page.locator('button:has-text("Add")').last().click({ force: true });
  await page.waitForTimeout(1500);
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

  // ── Add supplemental #1: Found + Enterprise ───────────────────────
  const addBtn = page
    .locator('button:has-text("Add Identifier"), button:has-text("Add First Identifier")')
    .first();
  await addBtn.waitFor({ state: "visible", timeout: 15_000 });
  await addBtn.scrollIntoViewIfNeeded();
  await addBtn.click({ force: true });
  await page.waitForTimeout(800);

  await fillDialog(page, {
    value: "enterprise-sup@contoso.com",
    accountFound: true,
    accountType: "Enterprise",
  });

  // ── Add supplemental #2: Account Not Found ─────────────────────────
  await page
    .locator('button:has-text("Add Identifier")')
    .first()
    .click({ force: true });
  await page.waitForTimeout(800);

  await fillDialog(page, {
    value: "ghost-account@outlook.com",
    accountFound: false,
  });

  // ── Probe the table rows ──────────────────────────────────────────
  const rows = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("table tbody tr"));
    return all
      .filter((r) => r.querySelector("td"))
      .map((r) => {
        const tds = r.querySelectorAll("td");
        const num = tds[0]?.textContent?.trim() ?? "";
        const value = tds[2]?.textContent?.trim()?.slice(0, 60) ?? "";
        const accountCell = tds[4]?.textContent?.trim() ?? "";
        return { num, value: value.replace(/\s+/g, " "), accountCell };
      });
  });

  log(`Rows: ${rows.length}`);
  rows.forEach((r) =>
    log(`  ${r.num.padEnd(4)} ${r.accountCell.padEnd(20)} ${r.value}`),
  );

  const entRow = rows.find((r) => r.value.includes("enterprise-sup@contoso.com"));
  const ghostRow = rows.find((r) => r.value.includes("ghost-account@outlook.com"));

  log(
    `Enterprise supplemental → Account Check "Found" + "E": ${
      entRow && /Found/i.test(entRow.accountCell) && /E\b/.test(entRow.accountCell)
        ? "YES"
        : "NO"
    }`,
  );
  log(
    `Not-found supplemental → Account Check "Not Found": ${
      ghostRow && /Not Found/i.test(ghostRow.accountCell) ? "YES" : "NO"
    }`,
  );

  await page.screenshot({
    path: "verify-supplemental-account.png",
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
