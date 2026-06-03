/**
 * Verifies the two Add New Identifier modal changes:
 *   1. Data Categories is optional — Add button enables once a service
 *      is picked, even with zero categories.
 *   2. Service dropdown filters by Account Type — Consumer shows
 *      LENS_SERVICES tagged Consumer (msaProfile, exchangeConsumer,
 *      teamsForLife, etc.); Enterprise shows the Enterprise-tagged set.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

const CONSUMER_SERVICES = [
  "Microsoft Account Profile - MSA",
  "Exchange Consumer",
  "Teams for Life",
  "OneDrive for Consumer",
];
const ENTERPRISE_SERVICES = [
  "Microsoft Account Profile - EntraID",
  "Exchange Enterprise",
  "Teams for Business",
  "OneDrive for Business",
];

async function openDialog(page) {
  // Navigate to LNS-2026-00270 → Review Case → Fulfillment Wizard panel
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
  await page
    .locator('button:has-text("Add Identifier")')
    .first()
    .scrollIntoViewIfNeeded();
  await page
    .locator('button:has-text("Add Identifier")')
    .first()
    .click({ force: true });
  await page.waitForTimeout(800);
}

async function listServiceDropdownItems(page) {
  // Click the Service dropdown trigger
  const trigger = page
    .locator('button[role="combobox"]:has-text("Select service")')
    .first();
  await trigger.click({ force: true });
  await page.waitForTimeout(500);
  const items = await page.evaluate(() => {
    const opts = document.querySelectorAll('[cmdk-item], [role="option"]');
    return Array.from(opts).map((o) => (o.textContent ?? "").trim());
  });
  // Close the dropdown
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  return items;
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

  await openDialog(page);

  // Fill the basics: type stays default Email address; fill value
  await page
    .locator('input[aria-label="Identifier value"]')
    .fill("optional-cat@outlook.com");
  await page.waitForTimeout(200);

  // Turn on Supplemental
  await page.locator("#addIdSupplemental").click({ force: true });
  await page.waitForTimeout(400);

  // Default account type = Consumer. Pick a linked LE identifier first
  // (the supplemental Service picker is disabled until a parent is set).
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

  // ── Service dropdown should show Consumer services ────────────────
  const consumerItems = await listServiceDropdownItems(page);
  log(`Consumer service items (${consumerItems.length}):`);
  consumerItems.slice(0, 10).forEach((s) => log(`  • ${s.slice(0, 60)}`));

  const consumerHits = CONSUMER_SERVICES.filter((name) =>
    consumerItems.some((it) => it.includes(name)),
  );
  const enterpriseLeak = ENTERPRISE_SERVICES.filter((name) =>
    consumerItems.some((it) => it.includes(name)),
  );
  log(
    `Consumer-tagged services visible: ${consumerHits.length}/${CONSUMER_SERVICES.length}`,
  );
  log(
    `Enterprise services leaked into Consumer view: ${enterpriseLeak.length} (expected 0)`,
  );

  // ── Switch Account Type → Enterprise, verify dropdown updates ─────
  await page
    .locator('button[role="radio"]:has-text("Enterprise")')
    .first()
    .click({ force: true });
  await page.waitForTimeout(300);
  const enterpriseItems = await listServiceDropdownItems(page);
  log(`Enterprise service items (${enterpriseItems.length}):`);
  enterpriseItems.slice(0, 10).forEach((s) => log(`  • ${s.slice(0, 60)}`));

  const entHits = ENTERPRISE_SERVICES.filter((name) =>
    enterpriseItems.some((it) => it.includes(name)),
  );
  const consumerLeak = CONSUMER_SERVICES.filter((name) =>
    enterpriseItems.some((it) => it.includes(name)),
  );
  log(
    `Enterprise-tagged services visible: ${entHits.length}/${ENTERPRISE_SERVICES.length}`,
  );
  log(
    `Consumer services leaked into Enterprise view: ${consumerLeak.length} (expected 0)`,
  );

  // ── Pick a service (no Data Categories!) and confirm Add enables ──
  // Switch back to Consumer for cleanest test.
  await page
    .locator('button[role="radio"]:has-text("Consumer")')
    .first()
    .click({ force: true });
  await page.waitForTimeout(300);
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

  const addBtn = page.locator('button:has-text("Add")').last();
  const addDisabled = await addBtn.isDisabled();
  log(
    `Add button enabled with NO Data Categories: ${
      addDisabled ? "NO (FAIL)" : "YES (expected)"
    }`,
  );

  // Confirm the Data Categories label has no asterisk
  const dcLabelText = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("label"));
    const hit = labels.find((l) =>
      (l.textContent ?? "").trim().startsWith("Data Categories"),
    );
    return hit?.textContent?.trim() ?? "";
  });
  log(
    `Data Categories label text: "${dcLabelText}" — asterisk removed: ${
      !dcLabelText.includes("*") ? "YES" : "NO"
    }`,
  );

  await page.screenshot({
    path: "verify-add-modal.png",
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
