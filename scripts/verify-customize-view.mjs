/**
 * Verify the Customize view canvas + the page-level scope toggle +
 * the dynamic quick-filter "All" label.
 *
 * Three regressions this catches:
 *
 *   1. The unified CustomViewPanel mounts from the toolbar button
 *      with all three sections (Filters / Sort / Columns) plus the
 *      Reset + Save-as-view footer. Loss of any of these means the
 *      panel is broken or props were dropped from the wiring.
 *
 *   2. The page-level Active/All scope toggle renders as a
 *      radiogroup with Active checked by default. Default-Active is
 *      the product invariant — flipping it silently would broaden
 *      every user's queue on next load.
 *
 *   3. The quick-filter "All" tab's label mirrors the active scope.
 *      Reads "All Active" when scope=Active, "All Cases" when
 *      scope=All. Without the dynamic label the word "All" collides
 *      with the page toggle's "All" and means different things in
 *      different places.
 *
 * Also clears localStorage before navigation so persisted scope from
 * a prior session doesn't poison the default-Active check.
 */
import { chromium } from "playwright";
import { Verdict } from "./_verify-utils.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const verdict = new Verdict("customize-view");

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

  // Wipe localStorage so persisted scope from a prior session doesn't
  // poison the default-Active assertion below.
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* localStorage may be blocked */
    }
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page
    .waitForLoadState("networkidle", { timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1500);

  // ── 1. Active/All toggle: present, default = Active ─────────────────
  console.log("=== Active/All scope toggle ===");
  const toggleInfo = await page.evaluate(() => {
    const rg = document.querySelector(
      '[role="radiogroup"][aria-label="Case scope"]',
    );
    if (!rg) return null;
    const buttons = Array.from(rg.querySelectorAll('[role="radio"]'));
    return {
      labels: buttons.map((b) => b.textContent?.trim() ?? ""),
      checkedLabel:
        buttons
          .find((b) => b.getAttribute("aria-checked") === "true")
          ?.textContent?.trim() ?? null,
    };
  });
  if (!toggleInfo) {
    console.log("  Toggle radiogroup not found.");
    verdict.fail("Active/All scope toggle missing from page header");
  } else {
    console.log(`  Buttons:         ${JSON.stringify(toggleInfo.labels)}`);
    console.log(`  Checked by default: ${toggleInfo.checkedLabel}`);
    verdict.assert(
      toggleInfo.labels.includes("Active") && toggleInfo.labels.includes("All"),
      `Toggle buttons missing Active / All — got ${JSON.stringify(toggleInfo.labels)}`,
    );
    verdict.assert(
      toggleInfo.checkedLabel === "Active",
      `Default scope is "${toggleInfo.checkedLabel}", expected "Active"`,
    );
  }

  // ── 2. Dynamic "All" label — scope=Active → "All Active" ────────────
  console.log("");
  console.log("=== Quick-filter 'All' label tracks scope ===");
  const allTabActive = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    // Tab content includes label + count chip; match label substring.
    return tabs.some((t) => /All Active/.test(t.textContent ?? ""));
  });
  console.log(`  scope=Active → tab reads "All Active": ${allTabActive ? "YES" : "NO"}`);
  verdict.assert(
    allTabActive,
    'Quick-filter "All" tab does not read "All Active" when scope=Active',
  );

  // Flip to All scope, then re-check label.
  await page.evaluate(() => {
    const rg = document.querySelector(
      '[role="radiogroup"][aria-label="Case scope"]',
    );
    const allBtn = Array.from(rg?.querySelectorAll('[role="radio"]') ?? []).find(
      (b) => /^All$/.test(b.textContent ?? ""),
    );
    if (allBtn) allBtn.click();
  });
  await page.waitForTimeout(400);
  const allTabAll = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    return tabs.some((t) => /All Cases/.test(t.textContent ?? ""));
  });
  console.log(`  scope=All → tab reads "All Cases":    ${allTabAll ? "YES" : "NO"}`);
  verdict.assert(
    allTabAll,
    'Quick-filter "All" tab does not read "All Cases" when scope=All',
  );

  // Reset scope back to Active so the panel section below renders
  // the default state.
  await page.evaluate(() => {
    const rg = document.querySelector(
      '[role="radiogroup"][aria-label="Case scope"]',
    );
    const activeBtn = Array.from(
      rg?.querySelectorAll('[role="radio"]') ?? [],
    ).find((b) => /^Active$/.test(b.textContent ?? ""));
    if (activeBtn) activeBtn.click();
  });
  await page.waitForTimeout(300);

  // ── 3. Customize view button + panel ────────────────────────────────
  console.log("");
  console.log("=== Customize view panel ===");
  const btn = page.locator('button[aria-label="Customize view"]').first();
  const btnCount = await btn.count();
  console.log(`  Toolbar button present: ${btnCount > 0 ? "YES" : "NO"}`);
  if (btnCount === 0) {
    verdict.fail('"Customize view" toolbar button missing');
  } else {
    await btn.click({ force: true });
    await page.waitForTimeout(600);
    const panelInfo = await page.evaluate(() => {
      const sheet = document.querySelector('[data-slot="sheet-content"]');
      if (!sheet) return null;
      const title =
        sheet
          .querySelector('[data-slot="sheet-title"]')
          ?.textContent?.trim() ?? "";
      // Section toggles render as <button aria-expanded=...>; pull
      // out only the top-level ones (skip the inner sort-row
      // selectors which also use Popover triggers).
      const sectionHeaders = Array.from(
        sheet.querySelectorAll('button[aria-expanded]'),
      )
        .map((b) => b.textContent?.trim() ?? "")
        .filter(
          (t) =>
            /^Filters/.test(t) ||
            /^Sort$/.test(t) ||
            /^Columns \(/.test(t),
        );
      const footerButtons = Array.from(
        sheet.querySelectorAll('[data-slot="sheet-footer"] button'),
      ).map((b) => b.textContent?.trim() ?? "");
      return { title, sectionHeaders, footerButtons };
    });
    if (!panelInfo) {
      console.log("  Sheet did not mount.");
      verdict.fail("CustomViewPanel sheet did not mount after button click");
    } else {
      console.log(`  Title:            "${panelInfo.title}"`);
      console.log(`  Section headers:  ${JSON.stringify(panelInfo.sectionHeaders)}`);
      console.log(`  Footer buttons:   ${JSON.stringify(panelInfo.footerButtons)}`);
      verdict.assert(
        panelInfo.title === "Customize view",
        `Panel title "${panelInfo.title}" ≠ "Customize view"`,
      );
      verdict.assert(
        panelInfo.sectionHeaders.some((h) => /^Filters/.test(h)),
        "Panel missing the Filters section header",
      );
      verdict.assert(
        panelInfo.sectionHeaders.includes("Sort"),
        "Panel missing the Sort section header",
      );
      verdict.assert(
        panelInfo.sectionHeaders.some((h) => /^Columns \(/.test(h)),
        "Panel missing the Columns section header (with visible/total counter)",
      );
      verdict.assert(
        panelInfo.footerButtons.some((b) => /Reset to default/.test(b)),
        "Panel footer missing 'Reset to default' action",
      );
      verdict.assert(
        panelInfo.footerButtons.some((b) => /Save as view/.test(b)),
        "Panel footer missing 'Save as view…' action",
      );
    }
  }

  console.log("");
  console.log(`Page / console errors:                    ${errors.length}`);
  if (errors.length)
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));

  await page.screenshot({
    path: "verify-customize-view.png",
    fullPage: false,
  });
  await browser.close();
  verdict.assert(errors.length === 0, `${errors.length} page / console errors`);
  verdict.finish();
}

main().catch((e) => {
  console.error(e);
  console.log("");
  console.log(`RESULT: FAIL (customize-view) — uncaught: ${e.message}`);
  process.exit(1);
});
