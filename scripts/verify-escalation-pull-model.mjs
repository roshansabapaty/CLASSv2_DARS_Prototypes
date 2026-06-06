/**
 * End-to-end verification of the escalation pull-model surfaces:
 *
 *   1. Queue shows differentiated badge labels for the 5 states:
 *      "<Role> Escalated"  (Pending — existing demo case)
 *      "<Role> Requests More Information"  (existing 180)
 *      "<Role> Requests Redirect"  (seeded on 200)
 *      "<Role> Reviewed"  (seeded on 250)
 *      "<Role> Escalation Complete"  (seeded on 265, unacked)
 *
 *   2. "Needs my action" quick-filter tab visible in CaseQueue
 *
 *   3. Selecting the tab narrows to the cases the attorney has acted on
 *      (200, 250, 265) plus any with unread inbound correspondence.
 *
 *   4. Opening a Complete-unacked case (265) shows the EscalationComplete
 *      banner with an Acknowledge button.
 *
 *   5. Clicking Acknowledge clears the badge from the queue.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

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

  // ── 1. "Needs my action" quick-filter tab present + count ─────────────
  const tabText = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    const hit = all.find((el) => {
      const t = el.textContent?.trim();
      return t && /^Needs my action$/.test(t) && el.children.length === 0;
    });
    return hit ? hit.parentElement?.textContent?.trim() ?? "" : "";
  });
  const hasTab = tabText.includes("Needs my action");
  console.log(`"Needs my action" quick-filter tab present:  ${hasTab ? "YES" : "NO"}`);
  if (hasTab) console.log(`  Tab + count text:                          "${tabText.slice(0, 80)}"`);

  // Click the tab.
  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("button, [role='tab'], [role='button']"));
    const hit = all.find((el) => el.textContent?.trim().startsWith("Needs my action"));
    if (hit) (hit).click();
  });
  await page.waitForTimeout(700);

  const filteredText = await page.evaluate(() => document.body.innerText);
  const has200 = /LNS-2026-00200/.test(filteredText);
  const has250 = /LNS-2026-00250/.test(filteredText);
  const has265 = /LNS-2026-00265/.test(filteredText);
  console.log(`  Filter includes 00200 (RedirectRequested): ${has200 ? "YES" : "NO"}`);
  console.log(`  Filter includes 00250 (Reviewed):          ${has250 ? "YES" : "NO"}`);
  console.log(`  Filter includes 00265 (Complete-unacked):  ${has265 ? "YES" : "NO"}`);

  // Dump the case IDs visible in the filtered queue so I can see what
  // landed there.
  const visibleIds = await page.evaluate(() => {
    const text = document.body.innerText;
    const matches = text.match(/LNS-\d{4}-\d{5}/g) ?? [];
    return Array.from(new Set(matches)).slice(0, 15);
  });
  console.log(`  Case IDs visible in filter:                ${JSON.stringify(visibleIds)}`);

  // ── 2. Look for the 5 differentiated badge labels in the filtered queue ─
  console.log("");
  console.log("=== Queue badge labels (filtered to needs-action slice) ===");
  const checks = [
    {
      label: 'RedirectRequested — "Attorney Requests Redirect"',
      rx: /Attorney Requests Redirect/,
    },
    {
      label: 'Reviewed — "Attorney Reviewed"',
      rx: /Attorney Reviewed/,
    },
    {
      label: 'Complete-unacked — "Attorney Escalation Complete"',
      rx: /Attorney Escalation Complete/,
    },
  ];
  checks.forEach((c) =>
    console.log(
      `${c.label.padEnd(58, " ")} ${c.rx.test(filteredText) ? "YES" : "NO"}`,
    ),
  );

  // Switch to "All" and confirm the older 2 states are also rendering.
  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("button, [role='tab'], [role='button']"));
    const hit = all.find((el) => /^All\b/.test(el.textContent?.trim() ?? ""));
    if (hit) (hit).click();
  });
  await page.waitForTimeout(500);
  const allText = await page.evaluate(() => document.body.innerText);
  console.log("");
  console.log("=== Queue badge labels (All cases) ===");
  console.log(`Pending — "Attorney Escalated":                ${/Attorney Escalated\b/.test(allText) ? "YES" : "NO"}`);
  console.log(`InformationRequested — "Attorney Requests…":   ${/Attorney Requests More Information/.test(allText) ? "YES" : "NO"}`);

  // ── 3. Open LNS-2026-00265 + verify Acknowledge banner ────────────────
  const search = page.locator('input[aria-label="Search cases"]');
  await search.fill("LNS-2026-00265");
  await page.waitForTimeout(700);
  const row = page
    .locator("div.cursor-pointer")
    .filter({ hasText: "LNS-2026-00265" })
    .first();
  if ((await row.count()) === 0) {
    console.log("");
    console.log("Could not find LNS-2026-00265 row — bailing on case-form checks.");
    await page.screenshot({ path: "verify-escalation-pull.png", fullPage: false });
    await browser.close();
    return;
  }
  await row.click({ force: true });
  await page.waitForSelector('nav[aria-label="Case workflow"]', { timeout: 15_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "debug-265-loaded.png", fullPage: false });

  // Page heading sanity-check — confirm we're on LNS-2026-00265.
  const pageTopHeader = await page.evaluate(() => {
    const h = document.querySelector("h1, h2, h3, [role='heading']");
    return h?.textContent?.trim().slice(0, 80) ?? "(none)";
  });
  console.log(`(diag) Page top heading: "${pageTopHeader}"`);
  const headerHas265 = await page.evaluate(() =>
    Array.from(document.querySelectorAll("*")).some((el) =>
      /LNS-2026-00265/.test(el.textContent ?? ""),
    ),
  );
  console.log(`(diag) Page references 00265 anywhere:        ${headerHas265 ? "YES" : "NO"}`);
  // What case is shown in the sticky header at the top?
  const stickyHeader = await page.evaluate(() => {
    const el = document.querySelector('[aria-label*="LNS"], [class*="StickyCaseHeader"], header');
    return el?.textContent?.trim().slice(0, 200) ?? "(none)";
  });
  console.log(`(diag) Sticky header text: "${stickyHeader}"`);
  // Look for the banner copy regardless of conditional logic.
  const bannerSearch = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasBanner: /Attorney escalation complete/i.test(text),
      hasApproved: /Approved for delivery/i.test(text),
      hasFulfillment: /Fulfillment Pipeline/i.test(text),
      hasSearchBar: !!document.querySelector('input[aria-label="Search cases"]'),
      visibleStage: text.includes("Fulfillment Pipeline") ? "fulfillment-or-collection" : text.includes("Case Identification") ? "triage" : "other",
    };
  });
  console.log("(diag) Banner / stage detection:", JSON.stringify(bannerSearch));

  const caseFormText = await page.evaluate(() => document.body.innerText);
  const bannerShows = /Attorney escalation complete/i.test(caseFormText);
  const ackBtnPresent =
    (await page.getByRole("button", { name: /^Acknowledge$/ }).count()) > 0;
  // Diagnostic: look for any text that suggests the banner is somewhere
  // on the page.
  const hasApprovedText = /Approved for delivery/i.test(caseFormText);
  const hasEscalationText = /attorney escalation/i.test(caseFormText);
  console.log(`  (diag) "Approved for delivery" in page text:  ${hasApprovedText ? "YES" : "NO"}`);
  console.log(`  (diag) "attorney escalation" in page text:    ${hasEscalationText ? "YES" : "NO"}`);
  console.log(`  (diag) Page text length:                      ${caseFormText.length}`);
  console.log("");
  console.log("=== Case form (LNS-2026-00265) ===");
  console.log(`EscalationComplete banner shows:             ${bannerShows ? "YES" : "NO"}`);
  console.log(`Acknowledge button present:                  ${ackBtnPresent ? "YES" : "NO"}`);

  if (ackBtnPresent) {
    await page
      .getByRole("button", { name: /^Acknowledge$/ })
      .first()
      .click({ force: true });
    await page.waitForTimeout(700);
    const postAckText = await page.evaluate(() => document.body.innerText);
    const bannerStillShows = /Attorney escalation complete/i.test(postAckText);
    console.log(`Banner cleared after Acknowledge:            ${bannerStillShows ? "NO (FAIL)" : "YES"}`);
  }

  console.log("");
  console.log(`Page / console errors:                       ${errors.length}`);
  if (errors.length) {
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));
  }

  await page.screenshot({ path: "verify-escalation-pull.png", fullPage: false });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
