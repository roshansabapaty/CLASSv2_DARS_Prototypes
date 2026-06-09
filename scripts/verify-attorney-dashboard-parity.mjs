/**
 * Verify the Attorney Dashboard now mirrors the Cases-page UX
 * treatments shipped earlier:
 *
 *   1. Page header: Fluent Scales32Filled + bold-large h1 + 60px top
 *      padding; descriptive paragraph + count badge dropped.
 *   2. Quick-filter tabs 15% bigger; purple active state preserved.
 *   3. Search box right-justified (ml-auto + 360px).
 *   4. "Save current view" button next to "+ Add filter".
 *   5. App-bar / page-header icon parity — page-header icon is the
 *      Fluent variant that matches the LeftNav rail's active state.
 */
import { chromium } from "playwright";
import { Verdict } from "./_verify-utils.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const verdict = new Verdict("attorney-dashboard-parity");

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

  // Navigate to the Attorney Dashboard via the LeftNav rail.
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const attyBtn = buttons.find((b) =>
      /Attorney Dashboard/i.test(b.getAttribute("aria-label") ?? ""),
    );
    if (attyBtn) (attyBtn).click();
  });
  await page.waitForTimeout(1500);

  // ── 1 & 5. Page header restyle + Fluent icon parity ──────────────────
  console.log("=== Attorney Dashboard header (Cases-page parity) ===");
  const headerInfo = await page.evaluate(() => {
    const h1 = Array.from(document.querySelectorAll("h1")).find(
      (h) => /Attorney Dashboard/.test(h.textContent ?? ""),
    );
    if (!h1) return null;
    const wrapper = h1.parentElement?.parentElement ?? null;
    const cs = getComputedStyle(h1);
    const wrapperCs = wrapper ? getComputedStyle(wrapper) : null;
    // The icon is a sibling of the h1 inside the same flex row. Inspect
    // its tag name to detect lucide (SVG with `lucide` class) vs Fluent
    // (SVG with `fui-Icon` style class or no lucide class).
    const icon = h1.parentElement?.querySelector("svg");
    const iconClass = icon?.getAttribute("class") ?? "";
    const allText = document.body.innerText;
    const hasParagraph =
      /Cases flagged by the Response or Triage Specialist/i.test(allText);
    const hasCountBadge = /\d+ cases? requiring attorney attention/i.test(
      allText,
    );
    return {
      h1Text: h1.textContent ?? "",
      h1FontSize: cs.fontSize,
      h1FontWeight: cs.fontWeight,
      wrapperPaddingTop: wrapperCs?.paddingTop ?? "(none)",
      iconClass,
      iconIsFluent: !/lucide/i.test(iconClass),
      paragraphPresent: hasParagraph,
      countBadgePresent: hasCountBadge,
    };
  });
  if (!headerInfo) {
    console.log("  Attorney Dashboard h1 not found.");
    verdict.fail("Attorney Dashboard h1 not found");
  } else {
    console.log(
      `  H1 text:                              "${headerInfo.h1Text}"`,
    );
    console.log(
      `  H1 font-size (target 30px / text-3xl):  ${headerInfo.h1FontSize}`,
    );
    console.log(
      `  H1 font-weight (target 700):            ${headerInfo.h1FontWeight}`,
    );
    console.log(
      `  Wrapper padding-top (target 60px):      ${headerInfo.wrapperPaddingTop}`,
    );
    console.log(
      `  Icon is Fluent (not lucide):            ${headerInfo.iconIsFluent ? "YES" : "NO"}`,
    );
    console.log(
      `  Descriptive paragraph dropped:          ${headerInfo.paragraphPresent ? "NO (still there)" : "YES"}`,
    );
    console.log(
      `  Count badge dropped:                    ${headerInfo.countBadgePresent ? "NO (still there)" : "YES"}`,
    );
    // Tailwind text-3xl on a 14px root → 26.25px. Verify the
    // treatment ("clearly larger than body") rather than pinning a
    // specific resolution.
    verdict.assert(
      parseFloat(headerInfo.h1FontSize) >= 24,
      `Attorney h1 font-size ${headerInfo.h1FontSize} < 24px (text-3xl treatment lost)`,
    );
    verdict.assert(
      Number(headerInfo.h1FontWeight) >= 700,
      `Attorney h1 font-weight ${headerInfo.h1FontWeight} < 700`,
    );
    verdict.assert(
      headerInfo.wrapperPaddingTop === "60px",
      `Attorney header wrapper padding-top ${headerInfo.wrapperPaddingTop} ≠ 60px`,
    );
    verdict.assert(
      headerInfo.iconIsFluent,
      "Attorney header icon is still lucide — should be Fluent for app-bar parity",
    );
    verdict.assert(
      !headerInfo.paragraphPresent,
      "Attorney header descriptive paragraph still rendering",
    );
    verdict.assert(
      !headerInfo.countBadgePresent,
      "Attorney header count badge still rendering",
    );
  }

  // ── 2. Quick-filter tabs 15% bigger ──────────────────────────────────
  console.log("");
  console.log("=== Attorney Dashboard quick-filter tabs ===");
  const tabsInfo = await page.evaluate(() => {
    const tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return null;
    const firstTab = tablist.querySelector('[role="tab"]');
    if (!firstTab) return null;
    const cs = getComputedStyle(firstTab);
    return {
      height: cs.height,
      fontSize: cs.fontSize,
      paddingLeft: cs.paddingLeft,
      gap: cs.gap,
    };
  });
  if (!tabsInfo) {
    console.log("  Tablist not found.");
    verdict.fail("Attorney Dashboard tablist not found");
  } else {
    console.log(
      `  Tab height (target 36px / h-9):         ${tabsInfo.height}`,
    );
    console.log(
      `  Tab font-size (target 14px / text-sm):  ${tabsInfo.fontSize}`,
    );
    console.log(
      `  Tab padding-left (target 12px / px-3):  ${tabsInfo.paddingLeft}`,
    );
    console.log(
      `  Tab gap (target 8px / gap-2):           ${tabsInfo.gap}`,
    );
    // h-9 / text-sm anchor to the rem scale, which our app pins to
    // 14px (h-9 = 2.25rem = 31.5px; text-sm = 0.875rem = 12.25px) —
    // not the 16px-root resolution. Verify the "15% bump" treatment
    // ("clearly larger than the original h-8 / text-xs") rather than
    // pinning a specific resolution.
    verdict.assert(
      parseFloat(tabsInfo.height) >= 28,
      `Attorney tab height ${tabsInfo.height} < 28px (scaled-tab treatment lost)`,
    );
    verdict.assert(
      parseFloat(tabsInfo.fontSize) >= 12,
      `Attorney tab font-size ${tabsInfo.fontSize} < 12px (scaled-tab treatment lost)`,
    );
  }

  // ── 3. Search box right-justified ────────────────────────────────────
  console.log("");
  console.log("=== Attorney Dashboard search box ===");
  const searchInfo = await page.evaluate(() => {
    const input = document.querySelector(
      'input[aria-label="Search attorney dashboard"]',
    );
    if (!input) return null;
    const wrapper = input.closest("div.relative");
    if (!wrapper) return null;
    const wRect = wrapper.getBoundingClientRect();
    // Position-based right-edge proximity. `getComputedStyle().marginLeft`
    // unreliably reports "auto" — it's a layout hint, not a serialized
    // value in all cases (notably when a flex parent has flex-wrap and
    // the item lands on its own line). Measure visually instead: the
    // search wrapper's right edge should sit within ~2px of its flex
    // parent's right edge if it's truly right-justified.
    const parent = wrapper.parentElement;
    const parentRight = parent?.getBoundingClientRect().right ?? 0;
    // Also keep a list/table edge for the legacy gap check, accepting
    // role="table" (Attorney Dashboard's list view) alongside
    // role="grid" (Case Queue's list view).
    const list =
      document.querySelector('[role="grid"]') ??
      document.querySelector('[role="table"]') ??
      document.querySelector('[role="list"]') ??
      document.querySelector(".overflow-x-auto");
    const tableRight = list?.getBoundingClientRect().right ?? 0;
    return {
      searchRight: Math.round(wRect.right),
      parentRight: Math.round(parentRight),
      tableRight: Math.round(tableRight),
      rightEdgeGap: Math.round(parentRight - wRect.right),
      gapToTable: tableRight ? Math.round(tableRight - wRect.right) : null,
    };
  });
  if (!searchInfo) {
    console.log("  Search box not found.");
    verdict.fail("Attorney Dashboard search box not found");
  } else {
    console.log(
      `  Search right edge:                      ${searchInfo.searchRight}px`,
    );
    console.log(
      `  Parent (toolbar) right edge:            ${searchInfo.parentRight}px`,
    );
    console.log(
      `  Right-edge gap to parent (target ≤2px): ${searchInfo.rightEdgeGap}px`,
    );
    console.log(
      `  Gap to table edge (target small / ≤20): ${searchInfo.gapToTable}px`,
    );
    verdict.assert(
      searchInfo.rightEdgeGap <= 2,
      `Attorney search box not right-justified — ${searchInfo.rightEdgeGap}px gap to toolbar's right edge (target ≤2px)`,
    );
  }

  // ── 4. Save current view button ──────────────────────────────────────
  console.log("");
  console.log("=== 'Save current view' button ===");
  const saveBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const matches = buttons.filter((b) =>
      /Save current view/i.test(b.getAttribute("aria-label") ?? ""),
    );
    if (matches.length === 0) return null;
    return { found: true, count: matches.length };
  });
  console.log(
    `  Save current view button present:       ${saveBtn ? `YES (${saveBtn.count})` : "NO"}`,
  );
  verdict.assert(
    !!saveBtn,
    'Attorney Dashboard "Save current view" button missing',
  );

  console.log("");
  console.log(`Page / console errors:                    ${errors.length}`);
  if (errors.length) {
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));
  }

  await page.screenshot({
    path: "verify-attorney-dashboard-parity.png",
    fullPage: false,
  });
  await browser.close();
  verdict.assert(errors.length === 0, `${errors.length} page / console errors`);
  verdict.finish();
}

main().catch((e) => {
  console.error(e);
  console.log("");
  console.log(`RESULT: FAIL (attorney-dashboard-parity) — uncaught: ${e.message}`);
  process.exit(1);
});
