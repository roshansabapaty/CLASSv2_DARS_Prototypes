/**
 * Verify the filter UX padding + scroll changes:
 *   - AddFilterMenu popover: items + group headers use 30px left
 *     padding (px-[30px]); list region scrolls when > ~10 rows.
 *   - AdvancedFiltersPanel: header / status row / list / footer all
 *     align to a 30px-padded column.
 */
import { chromium } from "playwright";
import { Verdict } from "./_verify-utils.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const verdict = new Verdict("filter-padding-scroll");

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

  // ── 1. Open the +Add filter menu ──────────────────────────────────────
  console.log("=== AddFilterMenu — 30px padding + scroll cap ===");
  const addBtn = page
    .locator("button")
    .filter({ hasText: /Add filter/i })
    .first();
  await addBtn.click({ force: true });
  await page.waitForTimeout(500);

  const popoverInfo = await page.evaluate(() => {
    const wrappers = Array.from(
      document.querySelectorAll('[data-radix-popper-content-wrapper]'),
    );
    const popover = wrappers.find((w) =>
      /Operational badges|Advanced filters/.test(w.textContent ?? ""),
    );
    if (!popover) return null;
    // First filter item — read its computed padding-left.
    const items = Array.from(
      popover.querySelectorAll("button.w-full"),
    ).filter((b) =>
      /Assignee|Crime|Account Type|Date Range|Tenant|Escalation/.test(
        b.textContent ?? "",
      ),
    );
    const sample = items[0];
    const samplePad = sample ? getComputedStyle(sample).paddingLeft : "(none)";
    // The Advanced filters CTA button at the bottom — should also be 30px.
    const advBtn = Array.from(popover.querySelectorAll("button")).find((b) =>
      /Advanced filters/.test(b.textContent ?? ""),
    );
    const advPad = advBtn ? getComputedStyle(advBtn).paddingLeft : "(none)";
    // Group header padding.
    const groupHdr = popover.querySelector(
      ".uppercase.tracking-wide",
    );
    const grpPad = groupHdr
      ? getComputedStyle(groupHdr).paddingLeft
      : "(none)";
    // Scroll region — find the wrapper with max-height styling.
    const scrollRegion = Array.from(popover.querySelectorAll("div")).find(
      (d) => /max-h-\[/.test(d.className) || getComputedStyle(d).overflowY === "auto",
    );
    const scrollMaxH = scrollRegion
      ? getComputedStyle(scrollRegion).maxHeight
      : "(none)";
    const scrollHeight = scrollRegion ? scrollRegion.scrollHeight : 0;
    const clientHeight = scrollRegion ? scrollRegion.clientHeight : 0;
    return {
      itemCount: items.length,
      samplePad,
      advPad,
      grpPad,
      scrollMaxH,
      scrollHeight,
      clientHeight,
      isScrolling: scrollHeight > clientHeight,
    };
  });

  if (!popoverInfo) {
    console.log("  Popover not found.");
    verdict.fail("AddFilterMenu popover not found");
  } else {
    console.log(`  Visible filter items in popover:        ${popoverInfo.itemCount}`);
    console.log(`  Item padding-left (target 30px):        ${popoverInfo.samplePad}`);
    console.log(`  Group header padding-left (target 30px):${popoverInfo.grpPad}`);
    console.log(`  Advanced CTA padding-left (target 30px):${popoverInfo.advPad}`);
    console.log(`  Scroll region max-height:               ${popoverInfo.scrollMaxH}`);
    console.log(
      `  Scroll active (content > viewport):     ${popoverInfo.isScrolling ? "YES" : "NO"}`,
    );
    console.log(
      `    scrollHeight=${popoverInfo.scrollHeight}px, clientHeight=${popoverInfo.clientHeight}px`,
    );
    verdict.assert(
      popoverInfo.samplePad === "30px",
      `AddFilterMenu item padding-left ${popoverInfo.samplePad} ≠ 30px`,
    );
    verdict.assert(
      popoverInfo.grpPad === "30px",
      `AddFilterMenu group header padding-left ${popoverInfo.grpPad} ≠ 30px`,
    );
    verdict.assert(
      popoverInfo.advPad === "30px",
      `AddFilterMenu Advanced CTA padding-left ${popoverInfo.advPad} ≠ 30px`,
    );
    verdict.assert(
      popoverInfo.scrollMaxH !== "none" && popoverInfo.scrollMaxH !== "(none)",
      "AddFilterMenu scroll region has no max-height — 10-row cap missing",
    );
  }

  // Close popover then open Advanced Filters panel via the CTA.
  console.log("");
  console.log("=== AdvancedFiltersPanel — 30px padding column ===");
  const advCta = page
    .locator("button")
    .filter({ hasText: /Advanced filters/ })
    .first();
  if ((await advCta.count()) > 0) {
    await advCta.click({ force: true });
    await page.waitForTimeout(600);
    const panelInfo = await page.evaluate(() => {
      const sheet = document.querySelector('[data-slot="sheet-content"]');
      if (!sheet) return null;
      const header = sheet.querySelector('[data-slot="sheet-header"]');
      const footer = sheet.querySelector('[data-slot="sheet-footer"]');
      const status = Array.from(sheet.querySelectorAll("div")).find((d) =>
        /No filters enabled|filter[s]? enabled/.test(d.textContent ?? ""),
      );
      const listInner = Array.from(sheet.querySelectorAll("div")).find((d) =>
        /space-y-5/.test(d.className),
      );
      return {
        headerPad: header ? getComputedStyle(header).paddingLeft : "(none)",
        footerPad: footer ? getComputedStyle(footer).paddingLeft : "(none)",
        statusPad: status ? getComputedStyle(status).paddingLeft : "(none)",
        listPad: listInner
          ? getComputedStyle(listInner).paddingLeft
          : "(none)",
      };
    });
    if (!panelInfo) {
      console.log("  Sheet not found.");
      verdict.fail("AdvancedFiltersPanel sheet not found");
    } else {
      console.log(`  Header padding-left (target 30px):       ${panelInfo.headerPad}`);
      console.log(`  Status-row padding-left (target 30px):   ${panelInfo.statusPad}`);
      console.log(`  List padding-left (target 30px):         ${panelInfo.listPad}`);
      console.log(`  Footer padding-left (target 30px):       ${panelInfo.footerPad}`);
      verdict.assert(
        panelInfo.headerPad === "30px",
        `Advanced panel header padding-left ${panelInfo.headerPad} ≠ 30px`,
      );
      verdict.assert(
        panelInfo.listPad === "30px",
        `Advanced panel list padding-left ${panelInfo.listPad} ≠ 30px`,
      );
      verdict.assert(
        panelInfo.footerPad === "30px",
        `Advanced panel footer padding-left ${panelInfo.footerPad} ≠ 30px`,
      );
    }
  } else {
    console.log("  'Advanced filters' CTA not found.");
    verdict.fail("'Advanced filters' CTA not found");
  }

  console.log("");
  console.log(`Page / console errors:                    ${errors.length}`);
  if (errors.length) {
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));
  }

  await page.screenshot({ path: "verify-filter-padding-scroll.png", fullPage: false });
  await browser.close();
  verdict.assert(errors.length === 0, `${errors.length} page / console errors`);
  verdict.finish();
}

main().catch((e) => {
  console.error(e);
  console.log("");
  console.log(`RESULT: FAIL (filter-padding-scroll) — uncaught: ${e.message}`);
  process.exit(1);
});
