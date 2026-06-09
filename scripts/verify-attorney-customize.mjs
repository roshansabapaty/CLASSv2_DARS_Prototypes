/**
 * Verify the Attorney Dashboard now has full parity with the Cases
 * page on the view-controls surface shipped in Phase 2:
 *
 *   1. Active/All scope toggle in the page header, default Active.
 *   2. Dynamic "All" quick-filter label — reads "All Active" when
 *      scope=Active, "All Cases" when scope=All.
 *   3. Customize view toolbar button mounts the unified panel with
 *      Filters / Sort / Columns sections + Reset + Save-as-view
 *      footer.
 *   4. Add-filter flow on AD pops the FilterColumnSyncDialog when
 *      the picked filter's linked column is hidden (proves the
 *      sync wiring is hooked on this surface, not just Cases).
 *
 * Clears localStorage before navigating so prior-session state
 * doesn't poison the default-Active assertion.
 */
import { chromium } from "playwright";
import { Verdict } from "./_verify-utils.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const verdict = new Verdict("attorney-customize");

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

  // Navigate to the Attorney Dashboard via the LeftNav rail.
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const attyBtn = buttons.find((b) =>
      /Attorney Dashboard/i.test(b.getAttribute("aria-label") ?? ""),
    );
    if (attyBtn) attyBtn.click();
  });
  await page.waitForTimeout(1500);

  // ── 1. Scope toggle present + default Active ────────────────────────
  console.log("=== AD Active/All scope toggle ===");
  const toggle = await page.evaluate(() => {
    const rg = document.querySelector(
      '[role="radiogroup"][aria-label="Case scope"]',
    );
    if (!rg) return null;
    const buttons = Array.from(rg.querySelectorAll('[role="radio"]'));
    return {
      labels: buttons.map((b) => b.textContent?.trim() ?? ""),
      checked:
        buttons
          .find((b) => b.getAttribute("aria-checked") === "true")
          ?.textContent?.trim() ?? null,
    };
  });
  if (!toggle) {
    console.log("  Toggle missing.");
    verdict.fail("Attorney Dashboard scope toggle missing");
  } else {
    console.log(`  Buttons:            ${JSON.stringify(toggle.labels)}`);
    console.log(`  Default checked:    ${toggle.checked}`);
    verdict.assert(
      toggle.labels.includes("Active") && toggle.labels.includes("All"),
      `AD toggle buttons missing Active / All — got ${JSON.stringify(toggle.labels)}`,
    );
    verdict.assert(
      toggle.checked === "Active",
      `AD default scope is "${toggle.checked}", expected "Active"`,
    );
  }

  // ── 2. Dynamic "All" label tracks scope ─────────────────────────────
  console.log("");
  console.log("=== AD quick-filter 'All' label tracks scope ===");
  const allActive = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"]')).some((t) =>
      /All Active/.test(t.textContent ?? ""),
    );
  });
  console.log(`  scope=Active → "All Active": ${allActive ? "YES" : "NO"}`);
  verdict.assert(
    allActive,
    'AD quick-filter "All" tab does not read "All Active" when scope=Active',
  );

  await page.evaluate(() => {
    const rg = document.querySelector(
      '[role="radiogroup"][aria-label="Case scope"]',
    );
    const allBtn = Array.from(
      rg?.querySelectorAll('[role="radio"]') ?? [],
    ).find((b) => /^All$/.test(b.textContent ?? ""));
    if (allBtn) allBtn.click();
  });
  await page.waitForTimeout(400);
  const allCases = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"]')).some((t) =>
      /All Cases/.test(t.textContent ?? ""),
    );
  });
  console.log(`  scope=All → "All Cases":      ${allCases ? "YES" : "NO"}`);
  verdict.assert(
    allCases,
    'AD quick-filter "All" tab does not read "All Cases" when scope=All',
  );
  // Reset to Active for the next stage.
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
  console.log("=== AD Customize view panel ===");
  const btn = page.locator('button[aria-label="Customize view"]').first();
  const btnCount = await btn.count();
  console.log(`  Toolbar button: ${btnCount > 0 ? "YES" : "NO"}`);
  if (btnCount === 0) {
    verdict.fail('AD "Customize view" toolbar button missing');
  } else {
    await btn.click({ force: true });
    await page.waitForTimeout(500);
    const panel = await page.evaluate(() => {
      const sheet = document.querySelector('[data-slot="sheet-content"]');
      if (!sheet) return null;
      const title =
        sheet
          .querySelector('[data-slot="sheet-title"]')
          ?.textContent?.trim() ?? "";
      const sections = Array.from(
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
      return { title, sections, footerButtons };
    });
    if (!panel) {
      console.log("  Sheet did not mount.");
      verdict.fail("AD CustomViewPanel did not mount");
    } else {
      console.log(`  Title:            "${panel.title}"`);
      console.log(`  Sections:         ${JSON.stringify(panel.sections)}`);
      console.log(`  Footer:           ${JSON.stringify(panel.footerButtons)}`);
      verdict.assert(
        panel.title === "Customize view",
        `AD panel title "${panel.title}" ≠ "Customize view"`,
      );
      verdict.assert(
        panel.sections.some((h) => /^Filters/.test(h)),
        "AD panel missing Filters section",
      );
      verdict.assert(
        panel.sections.includes("Sort"),
        "AD panel missing Sort section",
      );
      verdict.assert(
        panel.sections.some((h) => /^Columns \(/.test(h)),
        "AD panel missing Columns section",
      );
      verdict.assert(
        panel.footerButtons.some((b) => /Reset to default/.test(b)),
        "AD panel footer missing 'Reset to default'",
      );
      verdict.assert(
        panel.footerButtons.some((b) => /Save as view/.test(b)),
        "AD panel footer missing 'Save as view…'",
      );
    }
    // Close panel before the dialog test. Escape is the most
    // reliable dismiss — clicking a sheet-close locator sometimes
    // matches a stale node and leaves the overlay covering the
    // toolbar below.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // ── 4. FilterColumnSyncDialog fires on AD too ───────────────────────
  console.log("");
  console.log("=== AD FilterColumnSyncDialog fires on Add filter ===");
  await page
    .locator("button")
    .filter({ hasText: /Add filter/i })
    .first()
    .click({ force: true });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const crime = buttons.find((b) =>
      /Crime \/ Nature/.test(b.textContent ?? ""),
    );
    if (crime) crime.click();
  });
  await page.waitForTimeout(700);
  const dialog = await page.evaluate(() => {
    const d = document.querySelector('[role="alertdialog"]');
    if (!d) return null;
    return {
      open: true,
      buttons: Array.from(d.querySelectorAll("button")).map((b) =>
        b.textContent?.trim() ?? "",
      ),
    };
  });
  if (!dialog) {
    console.log("  Dialog did not open.");
    verdict.fail("AD FilterColumnSyncDialog did not open on Crime filter add");
  } else {
    console.log(`  Buttons: ${JSON.stringify(dialog.buttons)}`);
    verdict.assert(
      dialog.buttons.some((b) => /Show column/.test(b)),
      'AD sync dialog missing "Show column" confirm button',
    );
    verdict.assert(
      dialog.buttons.some((b) => /Keep hidden/.test(b)),
      'AD sync dialog missing "Keep hidden" cancel button',
    );
  }

  console.log("");
  console.log(`Page / console errors: ${errors.length}`);
  if (errors.length)
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));

  await page.screenshot({
    path: "verify-attorney-customize.png",
    fullPage: false,
  });
  await browser.close();
  verdict.assert(errors.length === 0, `${errors.length} page / console errors`);
  verdict.finish();
}

main().catch((e) => {
  console.error(e);
  console.log("");
  console.log(`RESULT: FAIL (attorney-customize) — uncaught: ${e.message}`);
  process.exit(1);
});
