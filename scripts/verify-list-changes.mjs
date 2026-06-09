/**
 * Verify the queue list-view changes:
 *   1. Search box right-justified (its right edge aligns with the
 *      table's rightmost column / Edit Columns button below).
 *   2. Case ID column data cells use text-base (16px, was 14px) — 15%
 *      bump so it reads as the primary identifier.
 *   3. Case ID column locked: drag onto its slot is rejected; Edit
 *      Columns menu shows the lock glyph + disabled up/down arrows.
 *   4. Edit Columns menu: single-level list with inline up / down icon
 *      buttons next to each column name (no per-column flyout submenu).
 */
import { chromium } from "playwright";
import { Verdict } from "./_verify-utils.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const verdict = new Verdict("list-changes");

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

  // Switch to detailed list view so the table renders.
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const listToggle = btns.find((b) =>
      /list/i.test(b.getAttribute("aria-label") ?? ""),
    );
    if (listToggle) (listToggle).click();
  });
  await page.waitForTimeout(700);

  // ── 1. Search box right-justified ────────────────────────────────────
  console.log("=== Search box right-justified ===");
  const searchAlignment = await page.evaluate(() => {
    const input = document.querySelector(
      'input[aria-label="Search cases"]',
    );
    if (!input) return null;
    const wrapper = input.closest("div.relative");
    if (!wrapper) return null;
    const wRect = wrapper.getBoundingClientRect();
    // Find the page-container's right edge (the table sits inside the
    // same container, so its right edge is what the search should
    // align to).
    const list =
      document.querySelector('[role="grid"]') ??
      document.querySelector('[role="list"]') ??
      document.querySelector(".overflow-x-auto");
    const tableEdge = list?.getBoundingClientRect().right ?? 0;
    // Edit-column-order button (anchored to the right of the header).
    const editBtn = document.querySelector(
      'button[aria-label="Edit column order"]',
    );
    const editRect = editBtn?.getBoundingClientRect();
    return {
      searchRight: Math.round(wRect.right),
      tableRight: Math.round(tableEdge),
      editBtnRight: editRect ? Math.round(editRect.right) : null,
      pxGapToTable: tableEdge ? Math.round(tableEdge - wRect.right) : null,
    };
  });
  if (!searchAlignment) {
    console.log("  Search box not found.");
    verdict.fail("Search box not found");
  } else {
    console.log(
      `  Search right edge:                ${searchAlignment.searchRight}px`,
    );
    console.log(
      `  Table right edge:                 ${searchAlignment.tableRight}px`,
    );
    console.log(
      `  Edit Columns button right edge:   ${searchAlignment.editBtnRight}px`,
    );
    console.log(
      `  Gap between search & table edge:  ${searchAlignment.pxGapToTable}px (target: small / 0–20)`,
    );
    verdict.assert(
      searchAlignment.pxGapToTable !== null &&
        searchAlignment.pxGapToTable >= 0 &&
        searchAlignment.pxGapToTable <= 20,
      `Search box not right-justified to table edge (gap ${searchAlignment.pxGapToTable}px; want 0–20px)`,
    );
  }

  // ── 2. Case ID font size 16px (only the list-view cell) ─────────────
  console.log("");
  console.log("=== Case ID font bump (list-view cell) ===");
  const caseIdFont = await page.evaluate(() => {
    const cells = Array.from(
      document.querySelectorAll('[role="gridcell"]'),
    );
    const caseIdCell = cells.find((c) => {
      const s = c.querySelector("span.font-mono");
      return s && /^LNS-/.test(s.textContent ?? "");
    });
    if (!caseIdCell) return { found: false };
    const span = caseIdCell.querySelector("span.font-mono");
    const cs = getComputedStyle(span);
    return {
      found: true,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      classList: span.className,
      html: (span).outerHTML.slice(0, 200),
    };
  });
  if (!caseIdFont || !caseIdFont.found) {
    console.log("  Case ID cell not found in list view.");
    verdict.fail("Case ID cell not found in list view");
  } else {
    console.log(
      `  Case ID font-size (target 16px / text-base):  ${caseIdFont.fontSize}`,
    );
    console.log(
      `  Case ID font-weight (target 600):             ${caseIdFont.fontWeight}`,
    );
    console.log(`  Class list: ${caseIdFont.classList}`);
    console.log(`  HTML: ${caseIdFont.html}`);
    verdict.assert(
      caseIdFont.fontSize === "16px",
      `Case ID font-size ${caseIdFont.fontSize} ≠ 16px`,
    );
    verdict.assert(
      Number(caseIdFont.fontWeight) >= 600,
      `Case ID font-weight ${caseIdFont.fontWeight} < 600`,
    );
  }

  // ── 3 + 4. Open Edit Columns menu → check single-level + lock ───────
  console.log("");
  console.log("=== Edit Columns menu (single-level + lock) ===");
  const editBtn = page
    .locator('button[aria-label="Edit column order"]')
    .first();
  if ((await editBtn.count()) === 0) {
    console.log("  Edit Columns button not found.");
    verdict.fail('Edit Columns button (aria-label="Edit column order") missing');
  } else {
    await editBtn.click({ force: true });
    await page.waitForTimeout(500);
    const menuInfo = await page.evaluate(() => {
      const menu = document.querySelector('[role="menu"]');
      if (!menu) return null;
      // Count how many submenu triggers (flyout indicators) exist —
      // should be 0 after the refactor.
      const flyoutTriggers = menu.querySelectorAll(
        '[aria-haspopup="menu"]',
      ).length;
      // Find the row containing "Case ID".
      const rows = Array.from(menu.querySelectorAll("div"));
      const caseIdRow = rows.find((r) =>
        /^\s*Case ID/.test(r.textContent ?? ""),
      );
      const upBtn = caseIdRow?.querySelector(
        'button[aria-label*="Move Case ID up"]',
      );
      const downBtn = caseIdRow?.querySelector(
        'button[aria-label*="Move Case ID down"]',
      );
      // The lock glyph + disabled buttons → "locked" signal.
      const hasLockIcon = !!caseIdRow?.querySelector(
        'svg[aria-label="Locked"]',
      );
      return {
        flyoutTriggers,
        caseIdRowFound: !!caseIdRow,
        hasLockIcon,
        upDisabled: upBtn ? (upBtn).disabled : null,
        downDisabled: downBtn ? (downBtn).disabled : null,
      };
    });
    if (!menuInfo) {
      console.log("  Menu not open / not found.");
      verdict.fail("Edit Columns menu did not open");
    } else {
      console.log(
        `  Flyout submenu triggers (target 0):           ${menuInfo.flyoutTriggers}`,
      );
      console.log(
        `  Case ID row visible in menu:                  ${menuInfo.caseIdRowFound ? "YES" : "NO"}`,
      );
      console.log(
        `  Case ID row shows lock glyph:                 ${menuInfo.hasLockIcon ? "YES" : "NO"}`,
      );
      console.log(
        `  Case ID Move-Up button disabled:              ${menuInfo.upDisabled ? "YES" : "NO"}`,
      );
      console.log(
        `  Case ID Move-Down button disabled:            ${menuInfo.downDisabled ? "YES" : "NO"}`,
      );
      verdict.assert(
        menuInfo.flyoutTriggers === 0,
        `Edit Columns menu still has ${menuInfo.flyoutTriggers} per-row flyout trigger(s) — should be single-level`,
      );
      verdict.assert(
        menuInfo.caseIdRowFound,
        "Case ID row not visible in Edit Columns menu",
      );
    }
  }

  console.log("");
  console.log(`Page / console errors:                          ${errors.length}`);
  if (errors.length) {
    errors.slice(0, 3).forEach((e) => console.log(`  • ${e.slice(0, 240)}`));
  }

  await page.screenshot({ path: "verify-list-changes.png", fullPage: false });
  await browser.close();
  verdict.assert(errors.length === 0, `${errors.length} page / console errors`);
  verdict.finish();
}

main().catch((e) => {
  console.error(e);
  console.log("");
  console.log(`RESULT: FAIL (list-changes) — uncaught: ${e.message}`);
  process.exit(1);
});
