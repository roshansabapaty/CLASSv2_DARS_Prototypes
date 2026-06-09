/**
 * Verify the 30px vertical gaps between sections on both Cases page
 * and Attorney Dashboard.
 */
import { chromium } from "playwright";
import { Verdict } from "./_verify-utils.mjs";
const BASE = process.env.BASE_URL ?? "http://localhost:3001";

const verdict = new Verdict("30px-gaps");

// 30px target, ±4px tolerance covers sub-pixel rounding and the
// 1-2px collapsing-margin slop browsers introduce.
function expectGap(label, actual, target = 30, tol = 4) {
  const ok = Math.abs(actual - target) <= tol;
  if (!ok) verdict.fail(`${label}: ${actual}px (target ${target}±${tol}px)`);
}

async function checkPage(page, label) {
  const info = await page.evaluate(() => {
    // Find the h1 and walk down to get the next sibling's top.
    const h1 = Array.from(document.querySelectorAll("h1")).find(
      (h) => /^(Cases|Attorney Dashboard)\s*$/.test(h.textContent ?? ""),
    );
    if (!h1) return null;
    // The h1 sits inside a flex row; we want the GAP between that row
    // and the quick-filter tablist, then between tablist and the
    // filter-controls row, then between the filter-controls row and
    // the next sibling (could be chip strip or case list).
    const h1Wrapper = h1.parentElement?.parentElement ?? null;
    const tablist = document.querySelector('[role="tablist"]');
    const tablistRow = tablist?.parentElement ?? null;
    // Toolbar row 2: contains the Saved Views / + Add filter / Sort buttons.
    const addFilterBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => /^Add filter$/i.test(b.textContent?.trim() ?? ""),
    );
    const toolbarRow = addFilterBtn?.closest("div.flex.items-center") ?? null;
    // List / grid / table. Cases page uses role="grid" or
    // role="list" (cards mode); Attorney Dashboard's detailed-list
    // view uses role="table", and its cards mode uses a bare <ul>
    // without an explicit role (relying on the implicit list role).
    // Match any of them as a valid downstream sibling of the toolbar
    // for the gap check.
    const list =
      document.querySelector('[role="grid"]') ??
      document.querySelector('[role="table"]') ??
      document.querySelector('[role="list"]') ??
      document.querySelector(".overflow-x-auto") ??
      // Implicit-role <ul> as a final fallback. Skip <ul>s nested
      // inside the toolbar / header so we land on the case list, not
      // a dropdown menu item list.
      Array.from(document.querySelectorAll("ul")).find(
        (ul) =>
          !ul.closest("header") &&
          !ul.closest('[role="tablist"]') &&
          !ul.closest('[data-radix-popper-content-wrapper]'),
      );
    if (!h1Wrapper || !tablistRow || !toolbarRow || !list) {
      return {
        found: false,
        h1: !!h1Wrapper,
        tablist: !!tablistRow,
        toolbar: !!toolbarRow,
        list: !!list,
      };
    }
    const gap = (a, b) =>
      Math.round(b.getBoundingClientRect().top - a.getBoundingClientRect().bottom);
    return {
      found: true,
      gapH1ToTabs: gap(h1Wrapper, tablistRow),
      gapTabsToToolbar: gap(tablistRow, toolbarRow),
      gapToolbarToList: gap(toolbarRow, list),
    };
  });
  console.log(`=== ${label} ===`);
  if (!info?.found) {
    console.log(`  (not all sections found: ${JSON.stringify(info)})`);
    verdict.fail(`${label}: layout sections not found (${JSON.stringify(info)})`);
    return;
  }
  console.log(`  H1 → quick-filter tabs gap:        ${info.gapH1ToTabs}px (target ≈ 30px)`);
  console.log(`  Tabs → toolbar (filter controls):  ${info.gapTabsToToolbar}px (target ≈ 30px)`);
  console.log(`  Toolbar → case list / table:       ${info.gapToolbarToList}px (target ≈ 30px)`);
  expectGap(`${label}: H1→tabs`, info.gapH1ToTabs);
  expectGap(`${label}: tabs→toolbar`, info.gapTabsToToolbar);
  expectGap(`${label}: toolbar→list`, info.gapToolbarToList);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
await page.waitForTimeout(1500);

await checkPage(page, "Cases page");

// Navigate to Attorney Dashboard
console.log("");
await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const attyBtn = buttons.find((b) =>
    /Attorney Dashboard/i.test(b.getAttribute("aria-label") ?? ""),
  );
  if (attyBtn) (attyBtn).click();
});
await page.waitForTimeout(1500);
await checkPage(page, "Attorney Dashboard");

console.log("");
console.log(`Page / console errors: ${errors.length}`);
await page.screenshot({ path: "verify-30px-gaps.png", fullPage: false });
await browser.close();

verdict.assert(errors.length === 0, `${errors.length} page / console errors`);
verdict.finish();
